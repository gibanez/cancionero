const express = require('express');
const db = require('../db/database');

const router = express.Router();

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

router.post('/', (req, res) => {
  const name = clean((req.body || {}).name);
  if (!name) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
  }
  if (db.prepare('SELECT id FROM categories WHERE UPPER(name) = UPPER(?)').get(name)) {
    return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
  }

  const nextOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories'
  ).get().next;

  const result = db.prepare(
    'INSERT INTO categories (name, sort_order) VALUES (?, ?)'
  ).run(name, nextOrder);

  return res.status(201).json({
    id: result.lastInsertRowid,
    name,
    sort_order: nextOrder,
    songCount: 0
  });
});

router.delete('/:id', (req, res) => {
  const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Categoría no encontrada' });
  }

  // Las canciones se borran en cascada (FK ON DELETE CASCADE).
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  return res.status(204).end();
});

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.sort_order, COUNT(s.id) AS songCount
    FROM categories c
    LEFT JOIN songs s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `).all();

  res.json(rows);
});

module.exports = router;
