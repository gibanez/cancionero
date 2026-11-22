const express = require('express');
const db = require('../db/database');

const router = express.Router();

class ImportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImportError';
  }
}

function text(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function key(value) {
  return text(value).toLocaleLowerCase('es');
}

function songKey(categoryId, title, author) {
  return `${categoryId}::${key(title)}::${key(author)}`;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = content.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.some((cell) => text(cell) !== ''));
}

function csvCell(value) {
  return `"${text(value).replace(/"/g, '""')}"`;
}

function toCsv(rows, headers) {
  const lines = [headers.map((header) => csvCell(header.label)).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvCell(row[header.key])).join(','));
  });
  return `${lines.join('\r\n')}\r\n`;
}

function buildExport(userId) {
  const categories = db.prepare('SELECT id, name, sort_order FROM categories ORDER BY id').all();
  const songs = db.prepare('SELECT id, category_id, title, author, lyrics FROM songs ORDER BY id').all();
  const playlists = db.prepare(
    'SELECT id, name, is_public FROM playlists WHERE user_id = ? ORDER BY id'
  ).all(userId);
  const references = db.prepare(`
    SELECT ps.playlist_id, ps.song_id, s.title, s.author
    FROM playlist_songs ps
    JOIN songs s ON s.id = ps.song_id
    WHERE ps.playlist_id IN (SELECT id FROM playlists WHERE user_id = ?)
    ORDER BY ps.playlist_id, ps.position, ps.rowid
  `).all(userId);

  playlists.forEach((playlist) => {
    playlist.songs = references
      .filter((reference) => reference.playlist_id === playlist.id)
      .map((reference) => ({
        id: reference.song_id,
        title: reference.title,
        author: reference.author
      }));
  });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    songs,
    playlists
  };
}

function buildCsv(data) {
  const categoryNames = new Map(data.categories.map((category) => [category.id, category.name]));
  const rows = data.songs.map((song) => ({
    categoria: categoryNames.get(song.category_id) || '',
    titulo: song.title,
    autor: song.author,
    letra: song.lyrics,
    listas: data.playlists
      .filter((playlist) => playlist.songs.some((reference) => Number(reference.id) === song.id))
      .map((playlist) => playlist.name)
      .join(' | ')
  }));
  return toCsv(rows, [
    { key: 'categoria', label: 'categoria' },
    { key: 'titulo', label: 'titulo' },
    { key: 'autor', label: 'autor' },
    { key: 'letra', label: 'letra' },
    { key: 'listas', label: 'listas' }
  ]);
}

function parseCsvPayload(content) {
  const rows = parseCsv(content);
  if (rows.length < 2) {
    throw new ImportError('El CSV está vacío o no tiene filas de datos');
  }
  const headers = rows[0].map(key);
  const find = (...names) => headers.findIndex((header) => names.includes(header));
  const categoryIndex = find('categoria', 'category', 'category_name');
  const titleIndex = find('titulo', 'title');
  const authorIndex = find('autor', 'author');
  const lyricsIndex = find('letra', 'lyrics', 'lyric');
  const listsIndex = find('listas', 'playlists');

  if (titleIndex < 0) {
    throw new ImportError('El CSV necesita una columna "titulo" (o "title")');
  }

  const get = (row, index) => (index < 0 ? '' : text(row[index]));
  const records = [];
  rows.slice(1).forEach((row, offset) => {
    const title = get(row, titleIndex);
    if (!title) return;
    records.push({
      id: `csv-${offset + 1}`,
      category_name: get(row, categoryIndex),
      title,
      author: get(row, authorIndex),
      lyrics: get(row, lyricsIndex),
      listas: get(row, listsIndex).split(/[|;]/).map(text).filter(Boolean)
    });
  });

  if (records.length === 0) {
    throw new ImportError('No se encontraron canciones válidas en el CSV');
  }

  const playlistsByName = new Map();
  records.forEach((record) => {
    record.listas.forEach((name) => {
      const identifier = key(name);
      if (!identifier) return;
      if (!playlistsByName.has(identifier)) {
        playlistsByName.set(identifier, { name, songs: [] });
      }
      playlistsByName.get(identifier).songs.push(record.id);
    });
  });

  return {
    categories: [],
    songs: records.map(({ id, category_name, title, author, lyrics }) => ({
      id,
      category_name,
      title,
      author,
      lyrics
    })),
    playlists: Array.from(playlistsByName.values())
  };
}

function parseJsonPayload(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new ImportError('El JSON no es válido');
  }
  if (Array.isArray(parsed)) parsed = { songs: parsed };
  if (!parsed || typeof parsed !== 'object') {
    throw new ImportError('El JSON debe ser un objeto con canciones');
  }
  const hasData = ['categories', 'songs', 'playlists'].some(
    (field) => Array.isArray(parsed[field])
  );
  if (!hasData) {
    throw new ImportError('El JSON no contiene categorías, canciones ni listas');
  }
  return parsed;
}

function applyImport(data, userId) {
  const counts = { categories: 0, songs: 0, playlists: 0, playlistSongs: 0, skipped: 0 };
  const categoryByName = new Map();
  const categoryIds = new Set();
  db.prepare('SELECT id, name FROM categories').all().forEach((category) => {
    categoryByName.set(key(category.name), category.id);
    categoryIds.add(category.id);
  });

  const insertCategory = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
  function ensureCategory(name, sortOrder = 0) {
    const identifier = key(name);
    if (!identifier) return null;
    if (categoryByName.has(identifier)) return categoryByName.get(identifier);
    const result = insertCategory.run(name, Number(sortOrder) || 0);
    const id = Number(result.lastInsertRowid);
    categoryByName.set(identifier, id);
    categoryIds.add(id);
    counts.categories += 1;
    return id;
  }

  const categoryBySourceId = new Map();
  const categoriesIn = Array.isArray(data.categories) ? data.categories : [];
  categoriesIn.forEach((category) => {
    if (!category || typeof category !== 'object') return;
    const name = text(category.name);
    if (!name) return;
    const id = ensureCategory(name, category.sort_order);
    if (id && category.id !== undefined && category.id !== null) {
      categoryBySourceId.set(String(category.id), id);
    }
  });

  const songByKey = new Map();
  const songByTitle = new Map();
  db.prepare('SELECT id, category_id, title, author FROM songs').all().forEach((song) => {
    songByKey.set(songKey(song.category_id, song.title, song.author), song.id);
    songByTitle.set(`${key(song.title)}::${key(song.author)}`, song.id);
  });

  const insertSong = db.prepare(
    'INSERT INTO songs (category_id, title, author, lyrics) VALUES (?, ?, ?, ?)'
  );
  const songBySourceId = new Map();
  const songsIn = Array.isArray(data.songs) ? data.songs : [];

  songsIn.forEach((song) => {
    if (!song || typeof song !== 'object') return;
    const title = text(song.title);
    if (!title) return;
    const author = text(song.author);

    let categoryId = null;
    if (song.category_id !== undefined && song.category_id !== null) {
      const source = String(song.category_id);
      if (categoryBySourceId.has(source)) {
        categoryId = categoryBySourceId.get(source);
      } else if (/^\d+$/.test(source) && categoryIds.has(Number(source))) {
        categoryId = Number(source);
      }
    }
    if (!categoryId && song.category_name) {
      categoryId = ensureCategory(text(song.category_name));
    }
    if (!categoryId) categoryId = ensureCategory('Importadas');

    const identifier = songKey(categoryId, title, author);
    if (songByKey.has(identifier)) {
      if (song.id !== undefined && song.id !== null) {
        songBySourceId.set(String(song.id), songByKey.get(identifier));
      }
      counts.skipped += 1;
      return;
    }

    const result = insertSong.run(categoryId, title, author, text(song.lyrics));
    const id = Number(result.lastInsertRowid);
    songByKey.set(identifier, id);
    songByTitle.set(`${key(title)}::${key(author)}`, id);
    if (song.id !== undefined && song.id !== null) {
      songBySourceId.set(String(song.id), id);
    }
    counts.songs += 1;
  });

  const playlistByName = new Map();
  db.prepare('SELECT id, name FROM playlists WHERE user_id = ?').all(userId).forEach((playlist) => {
    playlistByName.set(key(playlist.name), playlist.id);
  });

  const insertPlaylist = db.prepare('INSERT INTO playlists (user_id, name) VALUES (?, ?)');
  const findSong = db.prepare('SELECT id FROM songs WHERE id = ?');
  const insertPlaylistSong = db.prepare(`
    INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)
  `);
  const nextPosition = db.prepare(
    'SELECT COALESCE(MAX(position), 0) AS next FROM playlist_songs WHERE playlist_id = ?'
  );
  const playlistsIn = Array.isArray(data.playlists) ? data.playlists : [];

  playlistsIn.forEach((playlist) => {
    if (!playlist || typeof playlist !== 'object') return;
    const name = text(playlist.name);
    if (!name) return;
    const identifier = key(name);
    let playlistId = playlistByName.get(identifier);
    if (!playlistId) {
      const result = insertPlaylist.run(userId, name);
      playlistId = Number(result.lastInsertRowid);
      playlistByName.set(identifier, playlistId);
      counts.playlists += 1;
    }

    let position = nextPosition.get(playlistId).next;
    const references = Array.isArray(playlist.songs) ? playlist.songs : [];
    references.forEach((reference) => {
      const raw = reference && typeof reference === 'object'
        ? (reference.id !== undefined ? reference.id : reference.songId)
        : reference;
      const source = String(raw === undefined || raw === null ? '' : raw);
      let songId = songBySourceId.get(source);
      if (!songId && /^\d+$/.test(source) && findSong.get(Number(source))) {
        songId = Number(source);
      }
      if (!songId && reference && typeof reference === 'object') {
        const byTitle = songByTitle.get(
          `${key(reference.title)}::${key(reference.author)}`
        );
        if (byTitle) songId = byTitle;
      }
      if (!songId) return;
      const result = insertPlaylistSong.run(playlistId, songId, position);
      if (result.changes) {
        counts.playlistSongs += 1;
        position += 1;
      }
    });
  });

  return {
    ok: true,
    categorias: counts.categories,
    canciones: counts.songs,
    listas: counts.playlists,
    cancionesEnListas: counts.playlistSongs,
    omitidas: counts.skipped
  };
}

router.get('/export', (req, res) => {
  const format = String(req.query.format || 'json').toLowerCase();
  if (format !== 'json' && format !== 'csv') {
    return res.status(400).json({ error: 'Formato no soportado (usá json o csv)' });
  }

  const data = buildExport(req.user.id);
  if (format === 'csv') {
    return res.json({
      filename: 'cancionero.csv',
      contentType: 'text/csv;charset=utf-8',
      content: buildCsv(data)
    });
  }
  return res.json({
    filename: 'cancionero.json',
    contentType: 'application/json;charset=utf-8',
    content: JSON.stringify(data, null, 2)
  });
});

router.post('/import', (req, res) => {
  const body = req.body || {};
  const format = String(body.format || 'json').toLowerCase();
  const content = typeof body.content === 'string' ? body.content : '';

  if (!content.trim()) {
    return res.status(400).json({ error: 'No se recibió contenido para importar' });
  }
  if (format !== 'json' && format !== 'csv') {
    return res.status(400).json({ error: 'Formato no soportado (usá json o csv)' });
  }

  try {
    const payload = format === 'csv' ? parseCsvPayload(content) : parseJsonPayload(content);
    const result = db.transaction(() => applyImport(payload, req.user.id))();
    const mensaje = `Importación finalizada: ${result.categorias} categorías, ` +
      `${result.canciones} canciones, ${result.listas} listas y ` +
      `${result.cancionesEnListas} canciones agregadas a listas.`;
    return res.json({ ...result, mensaje });
  } catch (err) {
    if (err instanceof ImportError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

module.exports = router;
