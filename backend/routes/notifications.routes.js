// ─── Notification routes ─────────────────────────────────────────────────────
// List, unread count, mark-read, delete, and the real-time WebSocket stream.
// All reads/writes are scoped to the token user — you can only ever see
// and modify YOUR notifications.

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../lib/auth');
const { wsAdd, wsRemove } = require('../lib/ws');

const router = express.Router();

router.get('/api/notifications', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, u.username AS actor_username, u.avatar_path AS actor_avatar, u.is_ambassador AS actor_is_ambassador
    FROM notifications n
    JOIN users u ON n.actor_id = u.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);
  res.json(rows);
});

router.get('/api/notifications/unread', requireAuth, (req, res) => {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
  res.json({ count: c });
});

router.post('/api/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

router.delete('/api/notifications/:id', requireAuth, (req, res) => {
  const notif = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(req.params.id);
  if (!notif) return res.status(404).json({ error: 'not found' });
  if (notif.user_id !== req.user.id) return res.status(403).json({ error: 'not yours' });
  db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// WebSocket upgrade handler — called from index.js when path is /ws/notifications.
// Token rides the query string (WS handshake can't set custom headers from the browser).
function handleWsUpgrade(ws, req) {
  const url    = new URL(req.url, 'http://localhost');
  const token  = url.searchParams.get('token');
  if (!token) return ws.close(1008, 'Unauthorized');

  let userId;
  try {
    userId = jwt.verify(token, JWT_SECRET).id;
  } catch {
    return ws.close(1008, 'Unauthorized');
  }

  // Send current unread count immediately on connect
  const { c } = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);
  ws.send(JSON.stringify({ event: 'unread', data: { count: c } }));

  // Keep-alive ping every 25s (Fly.io closes idle WS after 60s)
  const ping = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.ping();
  }, 25000);

  wsAdd(userId, ws);
  ws.on('close', () => { clearInterval(ping); wsRemove(userId, ws); });
  ws.on('error', () => { clearInterval(ping); wsRemove(userId, ws); });
}

module.exports = router;
module.exports.handleWsUpgrade = handleWsUpgrade;
