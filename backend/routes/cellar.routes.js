// ─── Cellar routes ───────────────────────────────────────────────────────────
// Wishlist + cellar lists. Fully private: every route requires a token and
// only ever touches the token user's own rows.

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

router.get('/api/cellar', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM cellar WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(items);
});

router.post('/api/cellar', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { name, winery, vintage, type, list, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  // Same name+winery already saved? Just move it to the requested list.
  const existing = db.prepare("SELECT * FROM cellar WHERE user_id = ? AND name = ? AND COALESCE(winery,'') = COALESCE(?,'')")
    .get(userId, name, winery || '');
  if (existing) {
    db.prepare('UPDATE cellar SET list = ? WHERE id = ?').run(list || 'wishlist', existing.id);
    return res.json({ ...existing, list: list || 'wishlist' });
  }
  const r = db.prepare('INSERT INTO cellar (user_id, name, winery, vintage, type, list, notes) VALUES (?,?,?,?,?,?,?)')
    .run(userId, name, winery || null, vintage ? parseInt(vintage) : null, type || null, list || 'wishlist', notes || null);
  res.status(201).json(db.prepare('SELECT * FROM cellar WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/api/cellar/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM cellar WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (item.user_id !== req.user.id) return res.status(403).json({ error: 'not yours' });
  const { list, notes } = req.body;
  db.prepare('UPDATE cellar SET list = ?, notes = ? WHERE id = ?').run(list, notes || null, req.params.id);
  res.json(db.prepare('SELECT * FROM cellar WHERE id = ?').get(req.params.id));
});

router.delete('/api/cellar/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM cellar WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (item.user_id !== req.user.id) return res.status(403).json({ error: 'not yours' });
  db.prepare('DELETE FROM cellar WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Is this wine in my cellar? (by name + winery)
router.get('/api/cellar/check', requireAuth, (req, res) => {
  const { name, winery } = req.query;
  const item = db.prepare("SELECT * FROM cellar WHERE user_id = ? AND name = ? AND COALESCE(winery,'') = COALESCE(?,'')")
    .get(req.user.id, name, winery || '');
  res.json(item || null);
});

module.exports = router;
