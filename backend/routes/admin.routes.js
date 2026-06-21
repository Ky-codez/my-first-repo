// ─── Admin / founder stats ───────────────────────────────────────────────────
// A private dashboard endpoint for the app owner. Returns AGGREGATE numbers
// only — never personal data (no emails, no password hashes). Usernames shown
// in "top reviewers" are already public on wine cards.
//
// Access: the authenticated user's username must match ADMIN_USERNAME
// (set as a Fly secret in production; defaults to the owner's handle).

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ky_codez';

router.get('/api/admin/stats', requireAuth, (req, res) => {
  if (req.user.username !== ADMIN_USERNAME) {
    return res.status(403).json({ error: 'Admins only' });
  }

  const one = (sql) => db.prepare(sql).get().c;
  const totalUsers    = one('SELECT COUNT(*) c FROM users');
  const totalWines    = one('SELECT COUNT(*) c FROM wines');
  const newUsers7d    = one("SELECT COUNT(*) c FROM users WHERE created_at >= datetime('now','-7 days')");
  const newWines7d    = one("SELECT COUNT(*) c FROM wines WHERE created_at >= datetime('now','-7 days')");
  const usersWithWines = one('SELECT COUNT(DISTINCT user_id) c FROM wines');
  const totalLikes    = one('SELECT COUNT(*) c FROM likes');
  const totalComments = one('SELECT COUNT(*) c FROM comments');

  const avgRating   = db.prepare('SELECT ROUND(AVG(rating),2) a FROM wines').get().a;
  const winesByType = db.prepare('SELECT type, COUNT(*) c FROM wines GROUP BY type ORDER BY c DESC').all();
  const topReviewers = db.prepare(`
    SELECT u.username, COUNT(w.id) c
    FROM users u JOIN wines w ON w.user_id = u.id
    GROUP BY u.id ORDER BY c DESC LIMIT 5
  `).all();
  const latestSignup = db.prepare('SELECT MAX(created_at) m FROM users').get().m;

  res.json({
    totalUsers, totalWines, newUsers7d, newWines7d,
    usersWithWines,
    activationPct: totalUsers ? Math.round((usersWithWines / totalUsers) * 100) : 0,
    totalLikes, totalComments,
    avgRating: avgRating ?? 0,
    winesByType, topReviewers, latestSignup,
  });
});

module.exports = router;
