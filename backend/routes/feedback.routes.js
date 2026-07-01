// ─── Feedback / bug reports ──────────────────────────────────────────────────
// Logged-in users submit feedback; the owner reads it in the Founder Dashboard.
// No email dependency — it just lands in the DB and the admin view.

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ky_codez';
const TYPES = new Set(['bug', 'idea', 'other']);

// Submit feedback (any logged-in user)
router.post('/api/feedback', requireAuth, (req, res) => {
  const { type, message } = req.body;
  const msg = (message || '').trim();
  if (!msg) return res.status(400).json({ error: 'Message required' });
  if (msg.length > 2000) return res.status(400).json({ error: 'Message too long (2000 chars max)' });
  const kind = TYPES.has(type) ? type : 'other';
  db.prepare('INSERT INTO feedback (user_id, type, message) VALUES (?, ?, ?)')
    .run(req.user.id, kind, msg);
  res.json({ ok: true });
});

// Read feedback (owner only) — newest first, with the submitter's username
router.get('/api/admin/feedback', requireAuth, (req, res) => {
  if (req.user.username !== ADMIN_USERNAME) return res.status(403).json({ error: 'Admins only' });
  const rows = db.prepare(`
    SELECT f.id, f.type, f.message, f.is_read, f.flagged, f.status, f.created_at, u.username
    FROM feedback f LEFT JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
    LIMIT 200
  `).all();
  const unread = db.prepare("SELECT COUNT(*) c FROM feedback WHERE is_read = 0 AND status != 'done'").get().c;
  res.json({ feedback: rows, unread });
});

// Update one feedback entry's triage state (owner only).
// Body may include: is_read (0/1), flagged (0/1), status ('new' | 'done').
router.patch('/api/admin/feedback/:id', requireAuth, (req, res) => {
  if (req.user.username !== ADMIN_USERNAME) return res.status(403).json({ error: 'Admins only' });
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM feedback WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const { is_read, flagged, status } = req.body;
  if (is_read !== undefined) db.prepare('UPDATE feedback SET is_read = ? WHERE id = ?').run(is_read ? 1 : 0, id);
  if (flagged !== undefined) db.prepare('UPDATE feedback SET flagged = ? WHERE id = ?').run(flagged ? 1 : 0, id);
  if (status !== undefined && ['new', 'done'].includes(status)) {
    db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, id);
  }
  res.json({ ok: true });
});

// Mark all feedback read (owner only)
router.post('/api/admin/feedback/read', requireAuth, (req, res) => {
  if (req.user.username !== ADMIN_USERNAME) return res.status(403).json({ error: 'Admins only' });
  db.prepare('UPDATE feedback SET is_read = 1 WHERE is_read = 0').run();
  res.json({ ok: true });
});

module.exports = router;
