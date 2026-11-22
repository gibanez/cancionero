const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db/database');

const router = express.Router();
const publicRouter = express.Router();

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function findOwned(id, userId) {
  return db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(id, userId);
}

function withCount(id) {
  return db.prepare(`
    SELECT p.*, COUNT(ps.song_id) AS songCount
    FROM playlists p
    LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(id);
}

function listOwned(userId) {
  return db.prepare(`
    SELECT p.*, COUNT(ps.song_id) AS songCount
    FROM playlists p
    LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.id ASC
  `).all(userId);
}

router.get('/', (req, res) => {
  res.json(listOwned(req.user.id));
});

router.post('/', (req, res) => {
  const name = clean((req.body || {}).name);
  if (!name) {
    return res.status(400).json({ error: 'El nombre de la lista es obligatorio' });
  }
  const result = db.prepare(
    'INSERT INTO playlists (user_id, name) VALUES (?, ?)'
  ).run(req.user.id, name);
  return res.status(201).json(withCount(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const playlist = findOwned(req.params.id, req.user.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  const body = req.body || {};
  const name = body.name === undefined ? playlist.name : clean(body.name);
  if (!name) {
    return res.status(400).json({ error: 'El nombre de la lista es obligatorio' });
  }

  let isPublic = playlist.is_public;
  if (body.is_public !== undefined) {
    isPublic = body.is_public === true || body.is_public === 1 || body.is_public === '1' ? 1 : 0;
  }

  db.prepare('UPDATE playlists SET name = ?, is_public = ? WHERE id = ?')
    .run(name, isPublic, req.params.id);

  return res.json(withCount(req.params.id));
});

router.delete('/:id', (req, res) => {
  const playlist = findOwned(req.params.id, req.user.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  return res.status(204).end();
});

router.get('/:id/songs', (req, res) => {
  if (!findOwned(req.params.id, req.user.id)) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }
  const songs = db.prepare(`
    SELECT s.id, s.category_id, s.title, s.author, s.lyrics
    FROM playlist_songs ps
    JOIN songs s ON s.id = ps.song_id
    WHERE ps.playlist_id = ?
    ORDER BY ps.position ASC, ps.rowid ASC
  `).all(req.params.id);
  return res.json(songs);
});

router.post('/:id/songs', (req, res) => {
  if (!findOwned(req.params.id, req.user.id)) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  const body = req.body || {};
  const songIds = Array.isArray(body.songIds) ? body.songIds :
    (body.songId !== undefined ? [body.songId] : []);
  if (songIds.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos una canción (songId)' });
  }

  const findSong = db.prepare('SELECT id FROM songs WHERE id = ?');
  const invalid = songIds.some((id) => !findSong.get(id));
  if (invalid) {
    return res.status(400).json({ error: 'Una de las canciones no existe' });
  }

  const nextPosition = db.prepare(
    'SELECT COALESCE(MAX(position), 0) + 1 AS next FROM playlist_songs WHERE playlist_id = ?'
  ).get(req.params.id).next;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)
  `);
  db.transaction(() => {
    songIds.forEach((songId, index) => {
      insert.run(req.params.id, songId, nextPosition + index);
    });
  })();

  return res.json(withCount(req.params.id));
});

router.post('/:id/share', (req, res) => {
  const playlist = findOwned(req.params.id, req.user.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  const token = playlist.public_token || randomUUID();
  db.prepare('UPDATE playlists SET public_token = ?, is_public = 1 WHERE id = ?')
    .run(token, req.params.id);

  return res.json({ token, publicUrl: `/p/${token}` });
});

publicRouter.get('/:token', (req, res) => {
  const playlist = db.prepare(`
    SELECT id, name FROM playlists
    WHERE public_token = ? AND is_public = 1
  `).get(req.params.token);

  if (!playlist) {
    return res.status(404).json({ error: 'Lista pública no encontrada' });
  }

  const songs = db.prepare(`
    SELECT s.id, s.title, s.author, s.lyrics
    FROM playlist_songs ps
    JOIN songs s ON s.id = ps.song_id
    WHERE ps.playlist_id = ?
    ORDER BY ps.position ASC, ps.rowid ASC
  `).all(playlist.id);

  return res.json({ name: playlist.name, songs });
});

module.exports = { router, publicRouter };
