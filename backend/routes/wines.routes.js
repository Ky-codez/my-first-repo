// ─── Wine routes ─────────────────────────────────────────────────────────────
// The journal itself: feed, search, trending, winery & bottle pages, the
// Vibe Deck, and wine CRUD.
//
// SECURITY NOTES (read before touching any query):
//   - Who can see a wine is decided in ONE place: visibleWines(viewerId) in
//     lib/helpers.js (visibleWinesNoJoin for queries without a users join).
//     Every list/feed query drops it into its WHERE — don't hand-roll the
//     privacy condition inline; reuse the helper so the rule stays consistent.
//   - viewerId for privacy ALWAYS comes from the verified token (req.user?.id),
//     never from a query param a client could spoof. Get both ids from
//     viewerIds(req): `uid` is for engagement flags only, `viewerId` for access.
//   - Create/edit/delete require a token; edit/delete also check ownership.
//
// ROUTE ORDER: literal paths (/discover, /trending, /bottle) are registered
// before parameterised ones — keep it that way.

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../lib/auth');
const { wineCardSelect, wineCardJoins, viewerIds, visibleWines, visibleWinesNoJoin, TAGGED_SQL } = require('../lib/helpers');
const { slugifyBase, uniqueSlug } = require('../lib/slug');
const { earnedBadgeIds, newlyEarned } = require('../lib/badges');
const { wineUpload } = require('../lib/upload');
const { optimizeImage } = require('../lib/optimizeImage');
const { wsPush } = require('../lib/ws');

const router = express.Router();

// Set the "tasted with" tags for a wine and notify newly-tagged users.
// `taggedRaw` is a comma-separated list of user ids from the form. The author
// can't tag themselves; ids are validated and capped. Replaces the existing set.
function setWineTags(wineId, ownerId, taggedRaw, wineName) {
  if (taggedRaw === undefined || taggedRaw === null) return;   // field omitted → leave tags as-is
  const ids = [...new Set(String(taggedRaw)
    .split(',').map(s => parseInt(s.trim(), 10)).filter(n => n && n !== ownerId))].slice(0, 20);
  // Only allow tagging public users, or private users who approved the tagger
  // (the tagger follows them). Silently drop anyone else.
  const valid = ids.filter(id => db.prepare(`
    SELECT 1 FROM users
    WHERE id = ? AND (is_private = 0 OR id IN (SELECT following_id FROM follows WHERE follower_id = ?))
  `).get(id, ownerId));
  const before = new Set(db.prepare('SELECT user_id FROM wine_tags WHERE wine_id = ?').all(wineId).map(r => r.user_id));
  db.prepare('DELETE FROM wine_tags WHERE wine_id = ?').run(wineId);
  const ins = db.prepare('INSERT OR IGNORE INTO wine_tags (wine_id, user_id) VALUES (?, ?)');
  for (const id of valid) {
    ins.run(wineId, id);
    if (!before.has(id)) {   // only notify the newly-added
      db.prepare("INSERT INTO notifications (user_id, actor_id, type, wine_id, wine_name) VALUES (?,?,'tag',?,?)")
        .run(id, ownerId, wineId, wineName);
      wsPush(id, 'notification', { type: 'tag' });
    }
  }
}

// Public share — no login needed, but private wines stay private.
// Two resolvers: the pretty /@username/<slug> form and the legacy /:id form.
const PUBLIC_WINE_COLS = `
  w.id, w.name, w.winery, w.vintage, w.type, w.rating, w.notes,
  w.image_path, w.location, w.grapes, w.is_biodynamic, w.is_organic,
  w.opened_at, w.created_at, w.slug, u.username, u.avatar_path
`;

// Pretty form: /@username/<slug>. Registered before the :id route so "by" is
// never mistaken for an id (segment counts differ, but keep it explicit).
router.get('/api/public/wines/by/:username/:slug', (req, res) => {
  const wine = db.prepare(`
    SELECT ${PUBLIC_WINE_COLS}
    FROM wines w JOIN users u ON w.user_id = u.id
    WHERE u.username = ? COLLATE NOCASE AND w.slug = ? AND w.is_private = 0
  `).get(req.params.username, req.params.slug);
  if (!wine) return res.status(404).json({ error: 'not found' });
  res.json(wine);
});

// Legacy form: /share/wine/:id and older /@username/wine/:id links.
router.get('/api/public/wines/:id', (req, res) => {
  const wine = db.prepare(`
    SELECT ${PUBLIC_WINE_COLS}
    FROM wines w JOIN users u ON w.user_id = u.id
    WHERE w.id = ? AND w.is_private = 0
  `).get(req.params.id);
  if (!wine) return res.status(404).json({ error: 'not found' });
  res.json(wine);
});

// ─── Vibe Deck (swipe discovery) ─────────────────────────────────────────────
// Each "vibe" quietly maps to wine styles — no jargon shown to the user.
const VIBE_FILTERS = {
  cozy:     { types: ['Red', 'Fortified', 'Spirit'] },
  party:    { types: ['Sparkling', 'Champagne'] },
  date:     { types: ['Rosé', 'Sparkling', 'Champagne'] },
  sunset:   { types: ['Rosé', 'White'] },
  fancy:    { minRating: 4.5 },
  surprise: { random: true },
};

router.get('/api/wines/discover', (req, res) => {
  const uid  = req.user?.id || Number(req.query.userId) || 0;
  const vibe = VIBE_FILTERS[req.query.vibe] || null;

  let where = `
    w.is_private = 0
    AND u.is_private = 0
    AND w.user_id != ?
    AND w.id NOT IN (SELECT wine_id FROM swipes WHERE user_id = ?)
  `;
  const params = [uid, uid];

  if (vibe?.types)     { where += ` AND w.type IN (${vibe.types.map(() => '?').join(',')})`; params.push(...vibe.types); }
  if (vibe?.minRating) { where += ` AND w.rating >= ?`; params.push(vibe.minRating); }
  if (req.query.green === '1') where += ` AND (w.is_biodynamic = 1 OR w.is_organic = 1)`;

  // Photo cards swipe better — float them to the top of the deck
  const order = vibe?.random ? 'RANDOM()' : '(w.image_path IS NULL), w.created_at DESC';
  const wines = db.prepare(`
    SELECT w.id, w.name, w.winery, w.vintage, w.type, w.rating, w.notes,
           w.image_path, w.location, w.grapes, u.username,
           (SELECT COUNT(*) FROM likes l WHERE l.wine_id = w.id) AS like_count
    FROM wines w JOIN users u ON u.id = w.user_id
    WHERE ${where}
    ORDER BY ${order}
    LIMIT 20
  `).all(...params);
  res.json(wines);
});

// Recommendations — community wines matched to the user's palate, plus a
// single "tonight" hero pick. Pure scoring over taste tags + own-log history;
// no AI. Falls back to popular/new wines when there's no taste signal yet.
router.get('/api/wines/recommended', (req, res) => {
  const uid = req.user?.id || Number(req.query.userId) || 0;

  const grapeSet = new Set(), typeSet = new Set(), regionSet = new Set();
  // Explicit taste tags
  db.prepare('SELECT tag_type, tag_value FROM taste_tags WHERE user_id = ?').all(uid).forEach(t => {
    if (t.tag_type === 'grape') grapeSet.add(t.tag_value.toLowerCase());
    if (t.tag_type === 'type')  typeSet.add(t.tag_value.toLowerCase());
  });
  // Inferred from the user's own logs
  db.prepare('SELECT type, grapes, location FROM wines WHERE user_id = ?').all(uid).forEach(w => {
    if (w.type) typeSet.add(w.type.toLowerCase());
    (w.grapes || '').split(/[,/]/).forEach(g => { const t = g.trim().toLowerCase(); if (t) grapeSet.add(t); });
    if (w.location) regionSet.add(w.location.trim().toLowerCase());
  });
  const hasTaste = grapeSet.size || typeSet.size || regionSet.size;

  const candidates = db.prepare(`
    SELECT w.id, w.name, w.winery, w.vintage, w.type, w.rating, w.notes,
           w.image_path, w.location, w.grapes, u.username,
           (SELECT COUNT(*) FROM likes l WHERE l.wine_id = w.id) AS like_count
    FROM wines w JOIN users u ON u.id = w.user_id
    WHERE w.is_private = 0 AND u.is_private = 0 AND w.user_id != ?
      AND w.id NOT IN (SELECT wine_id FROM swipes WHERE user_id = ?)
    ORDER BY w.created_at DESC
    LIMIT 200
  `).all(uid, uid);

  const scored = candidates.map(w => {
    let score = 0, reason = null;
    (w.grapes || '').split(/[,/]/).map(g => g.trim()).filter(Boolean).forEach(g => {
      if (grapeSet.has(g.toLowerCase())) { score += 3; reason = reason || `you like ${g}`; }
    });
    if (w.type && typeSet.has(w.type.toLowerCase())) { score += 2; reason = reason || `your ${w.type} taste`; }
    if (w.location && regionSet.has(w.location.trim().toLowerCase())) { score += 2; reason = reason || `from ${w.location.trim()}`; }
    score += (Number(w.rating) || 0) * 0.5 + (w.like_count || 0) * 0.3;
    return { ...w, _score: score, reason };
  });

  scored.sort((a, b) => b._score - a._score);
  const wines = scored.slice(0, 10).map(({ _score, ...w }) => w);
  res.json({ tonight: wines[0] || null, wines, personalized: !!hasTaste });
});

// Record a swipe. Right swipe = save to wishlist + train taste tags.
router.post('/api/wines/:id/swipe', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { direction } = req.body;
  const wineId = Number(req.params.id);
  if (!['left', 'right'].includes(direction)) return res.status(400).json({ error: 'invalid' });

  const wine = db.prepare('SELECT name, winery, vintage, type, grapes FROM wines WHERE id = ?').get(wineId);
  if (!wine) return res.status(404).json({ error: 'wine not found' });

  db.prepare('INSERT OR REPLACE INTO swipes (user_id, wine_id, direction) VALUES (?, ?, ?)')
    .run(userId, wineId, direction);

  let savedToWishlist = false;
  if (direction === 'right') {
    const existing = db.prepare(
      "SELECT 1 FROM cellar WHERE user_id = ? AND name = ? AND IFNULL(winery,'') = IFNULL(?,'')"
    ).get(userId, wine.name, wine.winery);
    if (!existing) {
      db.prepare(
        'INSERT INTO cellar (user_id, name, winery, vintage, type, list) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(userId, wine.name, wine.winery, wine.vintage, wine.type, 'wishlist');
      savedToWishlist = true;
    }
    if (wine.type) {
      db.prepare(`INSERT OR IGNORE INTO taste_tags (user_id, tag_type, tag_value) VALUES (?, 'type', ?)`)
        .run(userId, wine.type);
    }
    (wine.grapes || '').split(',').map(g => g.trim()).filter(Boolean).forEach(g => {
      db.prepare(`INSERT OR IGNORE INTO taste_tags (user_id, tag_type, tag_value) VALUES (?, 'grape', ?)`)
        .run(userId, g);
    });
  }
  res.json({ ok: true, savedToWishlist });
});

// Trending — most liked + commented wines this week, fallback to all-time
router.get('/api/wines/trending', (req, res) => {
  const { uid, viewerId } = viewerIds(req);

  const base = `
    ${wineCardSelect(uid).replace('NULL AS reposted_by', `COUNT(DISTINCT l.user_id) + COUNT(DISTINCT c.id) AS score, NULL AS reposted_by`)}
    ${wineCardJoins(uid)}
  `;
  const privacy = visibleWines(viewerId);

  let trendWindow = 'this week';
  let wines = db.prepare(`${base}
    WHERE w.created_at >= datetime('now', '-7 days') AND ${privacy}
    GROUP BY w.id
    HAVING score > 0
    ORDER BY score DESC, w.created_at DESC
    LIMIT 20
  `).all();

  if (wines.length < 5) {
    trendWindow = 'all time';
    wines = db.prepare(`${base}
      WHERE ${privacy}
      GROUP BY w.id
      ORDER BY score DESC, w.created_at DESC
      LIMIT 20
    `).all();
  }

  res.json(wines.map(w => ({ ...w, trend_window: trendWindow })));
});

// Bottle page — all reviews of the same wine (matched by name + winery)
router.get('/api/wines/bottle', (req, res) => {
  const { name, winery } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });
  const { uid, viewerId } = viewerIds(req);

  const wines = db.prepare(`
    ${wineCardSelect(uid)}
    ${wineCardJoins(uid)}
    WHERE w.name = ? AND (? IS NULL OR ? = '' OR w.winery = ?)
      AND ${visibleWines(viewerId)}
    GROUP BY w.id
    ORDER BY w.created_at DESC
  `).all(name, winery || '', winery || '', winery || '');

  const avgRating = wines.length
    ? Math.round((wines.reduce((s, w) => s + (w.rating || 0), 0) / wines.length) * 10) / 10
    : 0;

  const vintageMap = {};
  wines.forEach(w => {
    const v = w.vintage || '__none__';
    if (!vintageMap[v]) vintageMap[v] = { vintage: w.vintage || null, total: 0, count: 0 };
    vintageMap[v].total += w.rating || 0;
    vintageMap[v].count++;
  });
  const vintageBreakdown = Object.values(vintageMap)
    .map(v => ({ vintage: v.vintage, avgRating: Math.round((v.total / v.count) * 10) / 10, reviewCount: v.count }))
    .sort((a, b) => (b.vintage || 0) - (a.vintage || 0));

  const ratedWines = wines.filter(w => w.rating);
  const circleUserIds = uid
    ? new Set(db.prepare('SELECT following_id FROM follows WHERE follower_id = ?').all(uid).map(r => r.following_id))
    : new Set();

  const histogram = [5, 4, 3, 2, 1].map(star => {
    const all    = ratedWines.filter(w => Math.round(w.rating) === star);
    const circle = all.filter(w => circleUserIds.has(w.user_id));
    return { star, count: all.length, circleCount: circle.length };
  });

  res.json({ wines, avgRating, reviewCount: wines.length, vintageBreakdown, histogram });
});

// Main feed — explore (taste-boosted), following, or one user's journal
router.get('/api/wines', (req, res) => {
  const { search, type, userId, feed, vintage, region, winery, grapes } = req.query;
  const { uid, viewerId } = viewerIds(req);

  // Pagination for the scrolling feed. A user's own journal (userId=…) is NOT
  // paginated — the Profile and Wine Passport need the whole set at once.
  const limit  = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const paginate = !userId;

  function facetClauses() {
    const clauses = [], vals = [];
    if (search)  { clauses.push('(w.name LIKE ? OR w.winery LIKE ? OR w.grapes LIKE ? OR w.location LIKE ? OR CAST(w.vintage AS TEXT) LIKE ? OR w.notes LIKE ? OR u.username LIKE ?)'); vals.push(...Array(7).fill(`%${search}%`)); }
    if (req.query.green === '1') clauses.push('(w.is_biodynamic = 1 OR w.is_organic = 1)');
    if (type && type !== 'All') { clauses.push('w.type = ?'); vals.push(type); }
    if (vintage) { clauses.push('CAST(w.vintage AS TEXT) LIKE ?'); vals.push(`%${vintage}%`); }
    if (region)  { clauses.push('w.location LIKE ?'); vals.push(`%${region}%`); }
    if (winery)  { clauses.push('w.winery LIKE ?'); vals.push(`%${winery}%`); }
    if (grapes)  { clauses.push('w.grapes LIKE ?'); vals.push(`%${grapes}%`); }
    return { clause: clauses.length ? ' AND ' + clauses.join(' AND ') : '', vals };
  }

  // Following feed: UNION original posts + reposts from followed users
  if (feed === 'following' && uid) {
    const { clause: searchClause, vals: searchParams } = facetClauses();

    const baseSelect = `
      SELECT w.*, u.username, u.avatar_path, u.is_ambassador,
             COUNT(DISTINCT l.user_id)  AS like_count,
             COUNT(DISTINCT c.id)       AS comment_count,
             MAX(CASE WHEN l2.user_id = ${uid} THEN 1 ELSE 0 END) AS user_liked,
             COUNT(DISTINCT rp.user_id) AS repost_count,
             MAX(CASE WHEN rp2.user_id = ${uid} THEN 1 ELSE 0 END) AS user_reposted,
             ${TAGGED_SQL}
    `;
    const baseJoins = wineCardJoins(uid);

    const part1 = `
      ${baseSelect}, NULL AS reposted_by, w.created_at AS feed_date
      ${baseJoins}
      WHERE (w.user_id = ${uid} OR w.user_id IN (SELECT following_id FROM follows WHERE follower_id = ${uid}))
        AND ${visibleWines(viewerId)}
      ${searchClause}
      GROUP BY w.id
    `;

    const part2 = `
      ${baseSelect}, ru.username AS reposted_by, rpost.created_at AS feed_date
      ${baseJoins}
      JOIN reposts rpost ON rpost.wine_id = w.id
      JOIN users ru      ON rpost.user_id = ru.id
      WHERE (rpost.user_id = ${uid} OR rpost.user_id IN (SELECT following_id FROM follows WHERE follower_id = ${uid}))
        AND w.user_id != ${uid}
        AND w.user_id NOT IN (SELECT following_id FROM follows WHERE follower_id = ${uid})
        AND ${visibleWines(viewerId)}
      ${searchClause}
      GROUP BY rpost.id
    `;

    const sql = `SELECT * FROM (${part1} UNION ALL ${part2}) ORDER BY feed_date DESC LIMIT ? OFFSET ?`;
    return res.json(db.prepare(sql).all(...searchParams, ...searchParams, limit, offset));
  }

  const { clause: facetClause, vals: facetParams } = facetClauses();
  // taste_boost: posts matching the viewer's taste tags float up in Explore
  let sql = `
    SELECT w.*, u.username, u.avatar_path, u.is_ambassador,
           COUNT(DISTINCT l.user_id)  AS like_count,
           COUNT(DISTINCT c.id)       AS comment_count,
           MAX(CASE WHEN l2.user_id = ${uid} THEN 1 ELSE 0 END) AS user_liked,
           COUNT(DISTINCT rp.user_id) AS repost_count,
           MAX(CASE WHEN rp2.user_id = ${uid} THEN 1 ELSE 0 END) AS user_reposted,
           ${TAGGED_SQL},
           NULL AS reposted_by,
           (
             (SELECT COUNT(*) FROM taste_tags tt
               WHERE tt.user_id = ${uid} AND tt.tag_type = 'type' AND tt.tag_value = w.type)
           + (SELECT COUNT(*) FROM taste_tags tt
               WHERE tt.user_id = ${uid} AND tt.tag_type = 'grape'
                 AND w.grapes LIKE '%' || tt.tag_value || '%')
           ) AS taste_boost
    ${wineCardJoins(uid)}
    WHERE ${visibleWines(viewerId)}${facetClause}
  `;
  const params = [...facetParams];
  if (userId) { sql += ' AND w.user_id = ?'; params.push(userId); }
  sql += userId
    ? ' GROUP BY w.id ORDER BY w.created_at DESC'
    : ' GROUP BY w.id ORDER BY taste_boost DESC, w.created_at DESC';
  if (paginate) { sql += ' LIMIT ? OFFSET ?'; params.push(limit, offset); }

  res.json(db.prepare(sql).all(...params));
});

// Universal search — users / wineries / grapes / regions / posts in one call
router.get('/api/search', (req, res) => {
  const q   = (req.query.q || '').trim();
  const { uid, viewerId } = viewerIds(req);

  if (!q) return res.json({ users: [], wineries: [], grapes: [], regions: [], posts: [] });
  const like = `%${q}%`;

  const users = db.prepare(`
    SELECT id, username, avatar_path FROM users
    WHERE username LIKE ? ORDER BY username LIMIT 5
  `).all(like);

  const wineries = db.prepare(`
    SELECT winery AS name, COUNT(*) AS post_count FROM wines
    WHERE winery LIKE ? AND winery != '' AND is_private = 0
    GROUP BY winery ORDER BY post_count DESC LIMIT 5
  `).all(like);

  const grapeRows = db.prepare(`SELECT grapes FROM wines WHERE grapes LIKE ? AND is_private = 0`).all(like);
  const grapeSet = new Set();
  for (const row of grapeRows) {
    for (const grape of row.grapes.split(',')) {
      const name = grape.trim();
      if (name && name.toLowerCase().includes(q.toLowerCase())) grapeSet.add(name);
    }
  }
  const grapes = [...grapeSet].slice(0, 5);

  const regions = db.prepare(`
    SELECT location AS name, COUNT(*) AS post_count FROM wines
    WHERE location LIKE ? AND location != '' AND is_private = 0
    GROUP BY location ORDER BY post_count DESC LIMIT 5
  `).all(like);

  const posts = db.prepare(`
    ${wineCardSelect(uid)}
    ${wineCardJoins(uid)}
    WHERE (w.name LIKE ? OR w.winery LIKE ? OR w.grapes LIKE ? OR w.location LIKE ?
           OR CAST(w.vintage AS TEXT) LIKE ? OR w.notes LIKE ? OR u.username LIKE ?)
      AND ${visibleWines(viewerId)}
    GROUP BY w.id
    ORDER BY w.created_at DESC
    LIMIT 20
  `).all(...Array(7).fill(like));

  res.json({ users, wineries, grapes, regions, posts });
});

// Winery page — aggregated stats + all reviews for a winery
router.get('/api/winery', (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });
  const { uid, viewerId } = viewerIds(req);
  const privacy = `AND ${visibleWinesNoJoin(viewerId)}`;
  const privacyW = `AND ${visibleWines(viewerId)}`;

  const stats = db.prepare(`
    SELECT COUNT(*) AS review_count, ROUND(AVG(rating), 1) AS avg_rating,
           COUNT(DISTINCT user_id) AS reviewer_count, COUNT(DISTINCT name) AS wine_count
    FROM wines WHERE LOWER(winery) = LOWER(?) ${privacy}
  `).get(name);

  const types = db.prepare(`
    SELECT type, COUNT(*) AS cnt FROM wines
    WHERE LOWER(winery) = LOWER(?) ${privacy}
    GROUP BY type ORDER BY cnt DESC
  `).all(name);

  const wines = db.prepare(`
    SELECT name, type, COUNT(*) AS review_count, ROUND(AVG(rating),1) AS avg_rating
    FROM wines WHERE LOWER(winery) = LOWER(?) ${privacy}
    GROUP BY LOWER(name) ORDER BY review_count DESC, name ASC
  `).all(name);

  const reviewers = db.prepare(`
    SELECT DISTINCT u.id, u.username, u.avatar_path
    FROM wines w JOIN users u ON w.user_id = u.id
    WHERE LOWER(w.winery) = LOWER(?) ${privacyW}
    LIMIT 20
  `).all(name);

  const vintages = db.prepare(`
    SELECT MIN(vintage) AS min_v, MAX(vintage) AS max_v
    FROM wines WHERE LOWER(winery) = LOWER(?) AND vintage IS NOT NULL ${privacy}
  `).get(name);

  const regionRow = db.prepare(`
    SELECT location, COUNT(*) AS cnt FROM wines
    WHERE LOWER(winery) = LOWER(?) AND location IS NOT NULL AND location != '' ${privacy}
    GROUP BY location ORDER BY cnt DESC LIMIT 1
  `).get(name);

  const grapes = db.prepare(`
    SELECT grapes, COUNT(*) AS cnt FROM wines
    WHERE LOWER(winery) = LOWER(?) AND grapes IS NOT NULL AND grapes != '' ${privacy}
    GROUP BY LOWER(grapes) ORDER BY cnt DESC LIMIT 10
  `).all(name);

  const topWine = db.prepare(`
    ${wineCardSelect(uid)}
    ${wineCardJoins(uid)}
    WHERE LOWER(w.winery) = LOWER(?) ${privacyW}
    GROUP BY w.id
    ORDER BY w.rating DESC, like_count DESC
    LIMIT 1
  `).get(name);

  const reviews = db.prepare(`
    ${wineCardSelect(uid)}
    ${wineCardJoins(uid)}
    WHERE LOWER(w.winery) = LOWER(?) ${privacyW}
    GROUP BY w.id
    ORDER BY w.created_at DESC
  `).all(name);

  const isFollowing = uid
    ? !!db.prepare('SELECT 1 FROM winery_follows WHERE user_id = ? AND LOWER(winery) = LOWER(?)').get(uid, name)
    : false;
  const wineryFollowerCount = db.prepare('SELECT COUNT(*) AS c FROM winery_follows WHERE LOWER(winery) = LOWER(?)').get(name).c;

  res.json({ name, stats, types, wines, reviewers, vintages, region: regionRow?.location || null, grapes, topWine: topWine || null, reviews, isFollowing, wineryFollowerCount });
});

// Follow / unfollow a winery — actor is the token user
router.post('/api/winery/follow', requireAuth, (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const existing = db.prepare('SELECT 1 FROM winery_follows WHERE user_id = ? AND LOWER(winery) = LOWER(?)').get(userId, name);
  if (existing) {
    db.prepare('DELETE FROM winery_follows WHERE user_id = ? AND LOWER(winery) = LOWER(?)').run(userId, name);
  } else {
    db.prepare('INSERT OR IGNORE INTO winery_follows (user_id, winery) VALUES (?, ?)').run(userId, name);
  }
  const followerCount = db.prepare('SELECT COUNT(*) AS c FROM winery_follows WHERE LOWER(winery) = LOWER(?)').get(name).c;
  res.json({ following: !existing, followerCount });
});

// Log a wine — always as the token user
router.post('/api/wines', requireAuth, wineUpload.single('image'), async (req, res) => {
  const userId = req.user.id;
  const { name, winery, type, vintage, location, grapes, is_biodynamic, is_organic, rating, notes, focal_x, focal_y, focal_w, focal_h, opened_at, is_private } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const privateFlag = (is_private === '1' || is_private === 'true') ? 1 : 0;
  if (req.file) await optimizeImage(req.file.path);   // shrink phone photos for mobile
  const imagePath  = req.file ? `/uploads/wines/${req.file.filename}` : null;
  const openedDate = opened_at || new Date().toISOString().slice(0, 10);
  const vintageVal = vintage === 'NV' ? 'NV' : (parseInt(vintage) || null);
  // Snapshot earned badges so we can tell which ones THIS log unlocks.
  const badgesBefore = earnedBadgeIds(db, userId);
  // Pretty share-link slug, unique per author. Frozen at creation.
  const slug = uniqueSlug(db, userId, slugifyBase(name, vintageVal));
  const r = db.prepare(`
    INSERT INTO wines (user_id, name, winery, type, vintage, location, grapes, is_biodynamic, is_organic, rating, notes, image_path, focal_x, focal_y, focal_w, focal_h, opened_at, slug, is_private)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, name, winery || null, type || 'Red',
    vintageVal,
    location || null, grapes || null,
    is_biodynamic === 'true' ? 1 : 0,
    is_organic    === 'true' ? 1 : 0,
    rating ? Math.min(Math.max(parseFloat(rating) || 3, 1), 5) : 3,
    notes || null, imagePath,
    focal_x != null ? parseFloat(focal_x) : 17,
    focal_y != null ? parseFloat(focal_y) : 0,
    focal_w != null ? parseFloat(focal_w) : 65,
    focal_h != null ? parseFloat(focal_h) : 87,
    openedDate, slug, privateFlag
  );
  // "Tasted with" tags (+ notify those users)
  setWineTags(r.lastInsertRowid, userId, req.body.tagged, name);
  const wine = db.prepare(`
    SELECT w.*, u.username, u.avatar_path, u.is_ambassador, 0 AS like_count, 0 AS comment_count, 0 AS user_liked,
           ${TAGGED_SQL}
    FROM wines w JOIN users u ON w.user_id = u.id WHERE w.id = ?
  `).get(r.lastInsertRowid);

  // Badges this log just unlocked — the client celebrates them on success.
  wine.newBadges = newlyEarned(db, userId, badgesBefore);

  // Notify winery followers (skipping the author)
  if (winery) {
    const followers = db.prepare(
      'SELECT user_id FROM winery_follows WHERE LOWER(winery) = LOWER(?) AND user_id != ?'
    ).all(winery, userId);
    for (const f of followers) {
      db.prepare(`
        INSERT INTO notifications (user_id, actor_id, type, wine_id, wine_name, message)
        VALUES (?, ?, 'winery_review', ?, ?, ?)
      `).run(f.user_id, userId, r.lastInsertRowid, name, winery);
      wsPush(f.user_id, 'notification', { type: 'winery_review' });
    }
  }

  res.status(201).json(wine);
});

// Toggle privacy on a wine — owner only
router.patch('/api/wines/:id/privacy', requireAuth, (req, res) => {
  const wine = db.prepare('SELECT id, user_id, is_private FROM wines WHERE id = ?').get(req.params.id);
  if (!wine) return res.status(404).json({ error: 'not found' });
  if (req.user.id !== wine.user_id) return res.status(403).json({ error: 'forbidden' });
  const next = wine.is_private ? 0 : 1;
  db.prepare('UPDATE wines SET is_private = ? WHERE id = ?').run(next, wine.id);
  res.json({ is_private: next });
});

// Edit a wine — owner only
router.patch('/api/wines/:id', requireAuth, wineUpload.single('image'), async (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM wines WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (existing.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own wines' });

  const { name, winery, type, vintage, location, grapes, is_biodynamic, is_organic, rating, notes, focal_x, focal_y, focal_w, focal_h, opened_at } = req.body;
  if (req.file) await optimizeImage(req.file.path);   // shrink phone photos for mobile
  const imagePath = req.file ? `/uploads/wines/${req.file.filename}` : existing.image_path;

  db.prepare(`
    UPDATE wines SET
      name=?, winery=?, type=?, vintage=?, location=?, grapes=?,
      is_biodynamic=?, is_organic=?, rating=?, notes=?, image_path=?,
      focal_x=?, focal_y=?, focal_w=?, focal_h=?, opened_at=?,
      updated_at=datetime('now')
    WHERE id=?
  `).run(
    name || existing.name,
    winery  || null,
    type    || existing.type,
    vintage === 'NV' ? 'NV' : (parseInt(vintage) || existing.vintage),
    location || null, grapes || null,
    is_biodynamic === 'true' ? 1 : 0,
    is_organic    === 'true' ? 1 : 0,
    rating ? Math.min(Math.max(parseFloat(rating) || existing.rating, 1), 5) : existing.rating,
    notes  || null, imagePath,
    focal_x != null ? parseFloat(focal_x) : existing.focal_x,
    focal_y != null ? parseFloat(focal_y) : existing.focal_y,
    focal_w != null ? parseFloat(focal_w) : existing.focal_w,
    focal_h != null ? parseFloat(focal_h) : existing.focal_h,
    opened_at || existing.opened_at || new Date().toISOString().slice(0, 10),
    id
  );
  // Update "tasted with" tags (only if the field was sent)
  setWineTags(Number(id), req.user.id, req.body.tagged, name || existing.name);

  const wine = db.prepare(`
    SELECT w.*, u.username, u.avatar_path, u.is_ambassador,
      COUNT(DISTINCT l.user_id) AS like_count,
      COUNT(DISTINCT c.id)      AS comment_count,
      0 AS user_liked,
      ${TAGGED_SQL}
    FROM wines w
    JOIN users u ON w.user_id = u.id
    LEFT JOIN likes l    ON l.wine_id = w.id
    LEFT JOIN comments c ON c.wine_id = w.id
    WHERE w.id = ?
    GROUP BY w.id
  `).get(id);
  res.json(wine);
});

// Delete a wine — owner only
router.delete('/api/wines/:id', requireAuth, (req, res) => {
  const wine = db.prepare('SELECT user_id FROM wines WHERE id = ?').get(req.params.id);
  if (!wine) return res.status(404).json({ error: 'not found' });
  if (wine.user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own wines' });
  db.prepare('DELETE FROM wines WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
