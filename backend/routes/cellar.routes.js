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

// Tonight from your cellar — ONE gentle pick from bottles the user owns
// (list = 'cellar'; wishlist bottles aren't in their inventory). Deterministic
// per day so the suggestion is stable within a day but rotates daily, plus a
// human "reason" line. Returns null when the cellar is empty — the client
// shows nothing.
router.get('/api/cellar/tonight', requireAuth, (req, res) => {
  const bottles = db.prepare(
    "SELECT * FROM cellar WHERE user_id = ? AND list = 'cellar' ORDER BY created_at ASC, id ASC"
  ).all(req.user.id);
  if (!bottles.length) return res.json(null);

  const day  = Math.floor(Date.now() / 86400000);
  const pick = bottles[day % bottles.length];

  // created_at is SQLite datetime('now') — 'YYYY-MM-DD HH:MM:SS' in UTC.
  const addedMs  = new Date(pick.created_at.replace(' ', 'T') + 'Z').getTime();
  const days     = Math.max(0, Math.floor((Date.now() - addedMs) / 86400000));
  const sameType = pick.type ? bottles.filter(b => b.type === pick.type).length : 0;

  let reason;
  if (bottles.length === 1)               reason = 'The only bottle in your cellar — no pressure';
  else if (days >= 60)                    reason = `Resting in your cellar for ${Math.round(days / 30)} months`;
  else if (days >= 14)                    reason = `Resting in your cellar for ${Math.floor(days / 7)} weeks`;
  else if (pick.type && sameType === 1)   reason = `Your only ${pick.type.toLowerCase()} in the cellar`;
  else                                    reason = `One of ${bottles.length} bottles waiting in your cellar`;

  res.json({ ...pick, reason, bottle_count: bottles.length });
});

// Is this wine in my cellar? (by name + winery)
router.get('/api/cellar/check', requireAuth, (req, res) => {
  const { name, winery } = req.query;
  const item = db.prepare("SELECT * FROM cellar WHERE user_id = ? AND name = ? AND COALESCE(winery,'') = COALESCE(?,'')")
    .get(req.user.id, name, winery || '');
  res.json(item || null);
});

module.exports = router;
