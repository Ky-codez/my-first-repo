// ─── Social routes ───────────────────────────────────────────────────────────
// Likes, reposts and comments. Every action is performed AS the token user.

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../lib/auth');
const { wsPush } = require('../lib/ws');

const router = express.Router();

// Like / unlike toggle
router.post('/api/wines/:id/like', requireAuth, (req, res) => {
  const userId = req.user.id;
  const wineId = req.params.id;
  const wine = db.prepare('SELECT user_id, name FROM wines WHERE id = ?').get(wineId);
  if (!wine) return res.status(404).json({ error: 'wine not found' });

  // You can't like your own wine. The UI already hides the button; this is the
  // server-side guard so a direct API call can't inflate the count.
  if (wine.user_id === userId) {
    const { c } = db.prepare('SELECT COUNT(*) as c FROM likes WHERE wine_id = ?').get(wineId);
    return res.status(400).json({ error: "You can't like your own wine", liked: false, likeCount: c });
  }

  const existing = db.prepare('SELECT 1 FROM likes WHERE wine_id = ? AND user_id = ?').get(wineId, userId);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE wine_id = ? AND user_id = ?').run(wineId, userId);
    db.prepare("DELETE FROM notifications WHERE user_id=? AND actor_id=? AND type='like' AND wine_id=?")
      .run(wine.user_id, userId, wineId);
  } else {
    db.prepare('INSERT OR IGNORE INTO likes (wine_id, user_id) VALUES (?, ?)').run(wineId, userId);
    if (wine.user_id !== userId) {
      db.prepare('INSERT INTO notifications (user_id, actor_id, type, wine_id, wine_name) VALUES (?,?,?,?,?)')
        .run(wine.user_id, userId, 'like', wineId, wine.name);
      wsPush(wine.user_id, 'notification', { type: 'like', wineName: wine.name });
    }
  }
  const { c: likeCount } = db.prepare('SELECT COUNT(*) as c FROM likes WHERE wine_id = ?').get(wineId);
  res.json({ liked: !existing, likeCount });
});

// Repost / un-repost toggle
router.post('/api/wines/:id/repost', requireAuth, (req, res) => {
  const userId = req.user.id;
  const wineId = req.params.id;
  const wine = db.prepare('SELECT user_id, name FROM wines WHERE id = ?').get(wineId);
  if (!wine) return res.status(404).json({ error: 'wine not found' });

  const existing = db.prepare('SELECT 1 FROM reposts WHERE wine_id = ? AND user_id = ?').get(wineId, userId);
  if (existing) {
    db.prepare('DELETE FROM reposts WHERE wine_id = ? AND user_id = ?').run(wineId, userId);
    db.prepare("DELETE FROM notifications WHERE user_id=? AND actor_id=? AND type='repost' AND wine_id=?")
      .run(wine.user_id, userId, wineId);
  } else {
    db.prepare('INSERT OR IGNORE INTO reposts (wine_id, user_id) VALUES (?, ?)').run(wineId, userId);
    if (wine.user_id !== userId) {
      db.prepare('INSERT INTO notifications (user_id, actor_id, type, wine_id, wine_name) VALUES (?,?,?,?,?)')
        .run(wine.user_id, userId, 'repost', wineId, wine.name);
      wsPush(wine.user_id, 'notification', { type: 'repost', wineName: wine.name });
    }
  }
  const { c: repostCount } = db.prepare('SELECT COUNT(*) as c FROM reposts WHERE wine_id = ?').get(wineId);
  res.json({ reposted: !existing, repostCount });
});

// Read comments (public)
router.get('/api/wines/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar_path, u.is_ambassador
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.wine_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

// Post a comment
router.post('/api/wines/:id/comments', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text required' });
  const r = db.prepare('INSERT INTO comments (wine_id, user_id, text) VALUES (?, ?, ?)').run(req.params.id, userId, text.trim());
  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar_path, u.is_ambassador
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(r.lastInsertRowid);
  const wine = db.prepare('SELECT user_id, name FROM wines WHERE id = ?').get(req.params.id);
  if (wine && wine.user_id !== userId) {
    db.prepare('INSERT INTO notifications (user_id, actor_id, type, wine_id, wine_name, message) VALUES (?,?,?,?,?,?)')
      .run(wine.user_id, userId, 'comment', req.params.id, wine.name, text.trim().slice(0, 100));
    wsPush(wine.user_id, 'notification', { type: 'comment', wineName: wine.name });
  }
  res.status(201).json(comment);
});

// Delete a comment — own comment only
router.delete('/api/comments/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own comments' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Edit a comment — own comment only
router.patch('/api/comments/:id', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own comments' });
  db.prepare("UPDATE comments SET text = ?, updated_at = datetime('now') WHERE id = ?").run(text.trim(), req.params.id);
  res.json({ ...comment, text: text.trim() });
});

module.exports = router;
