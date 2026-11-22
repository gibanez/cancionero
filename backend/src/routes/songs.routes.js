const express = require('express');
const db = require('../db/database');

const router = express.Router();

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function withCategory(id) {
  return db.prepare(`
    SELECT s.*, c.name AS category_name
    FROM songs s
    JOIN categories c ON c.id = s.category_id
    WHERE s.id = ?
  `).get(id);
}

router.get('/', (req, res) => {
  const conditions = [];
  const params = [];

  if (req.query.categoryId) {
    conditions.push('s.category_id = ?');
    params.push(Number(req.query.categoryId));
  }

  const query = clean(req.query.q);
  if (query) {
    conditions.push('(s.title LIKE ? OR s.author LIKE ?)');
    const like = `%${query}%`;
    params.push(like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT s.id, s.category_id, s.title, s.author, c.name AS category_name
    FROM songs s
    JOIN categories c ON c.id = s.category_id
    ${where}
    ORDER BY s.id ASC
  `).all(...params);

  res.json(rows);
});

router.get('/:id', (req, res) => {
  const song = withCategory(req.params.id);
  if (!song) {
    return res.status(404).json({ error: 'Canción no encontrada' });
  }
  return res.json(song);
});

router.post('/', (req, res) => {
  const { category_id, title, author, lyrics } = req.body || {};
  const cleanTitle = clean(title);
  const cleanAuthor = clean(author);
  const cleanLyrics = typeof lyrics === 'string' ? lyrics.trim() : '';

  if (!category_id || !cleanTitle || !cleanAuthor || !cleanLyrics) {
    return res.status(400).json({
      error: 'Categoría, título, autor y letra son obligatorios'
    });
  }
  if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id)) {
    return res.status(400).json({ error: 'La categoría no existe' });
  }

  const result = db.prepare(`
    INSERT INTO songs (category_id, title, author, lyrics) VALUES (?, ?, ?, ?)
  `).run(category_id, cleanTitle, cleanAuthor, cleanLyrics);

  return res.status(201).json(withCategory(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = withCategory(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Canción no encontrada' });
  }

  const { category_id, title, author, lyrics } = req.body || {};
  const nextCategoryId = category_id === undefined ? existing.category_id : category_id;
  const nextTitle = title === undefined ? existing.title : clean(title);
  const nextAuthor = author === undefined ? existing.author : clean(author);
  const nextLyrics = lyrics === undefined ? existing.lyrics :
    (typeof lyrics === 'string' ? lyrics.trim() : '');

  if (!nextCategoryId || !nextTitle || !nextAuthor || !nextLyrics) {
    return res.status(400).json({
      error: 'Categoría, título, autor y letra son obligatorios'
    });
  }
  if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(nextCategoryId)) {
    return res.status(400).json({ error: 'La categoría no existe' });
  }

  db.prepare(`
    UPDATE songs
    SET category_id = ?, title = ?, author = ?, lyrics = ?
    WHERE id = ?
  `).run(nextCategoryId, nextTitle, nextAuthor, nextLyrics, req.params.id);

  return res.json(withCategory(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Canción no encontrada' });
  }
  return res.status(204).end();
});

module.exports = router;
