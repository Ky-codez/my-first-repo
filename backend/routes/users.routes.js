// ─── User routes ─────────────────────────────────────────────────────────────
// Profiles, follow graph, suggestions, badges, taste data and activity.
//
// SECURITY NOTES:
//   - GET /api/users/:id returns ONLY public fields (see publicUser) —
//     email and password_hash must never leave the API.
//   - All profile mutations (bio, avatar, follow) require a token and act
//     as the token's user, never a user id from the request body.

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../lib/auth');
const { publicUser } = require('../lib/helpers');
const { computeStats, computeBadges } = require('../lib/badges');
const { wsPush } = require('../lib/ws');
const { getPalate, jaccard, matchScore } = require('../lib/tasteMatch');

const router = express.Router();

// Who to follow — collaborative filtering ("3 Sancerre lovers follow them").
// NOTE: must stay ABOVE '/api/users/:id' or "suggestions" is read as an id.
router.get('/api/users/suggestions', (req, res) => {
  const uid = parseInt(req.query.currentUserId) || 0;

  const results = [];
  const seen = new Set();
  if (uid) seen.add(uid);

  const addWithReason = (rows, reason) => {
    for (const r of rows) {
      if (!seen.has(r.id)) { seen.add(r.id); results.push({ ...r, reason }); }
      if (results.length >= 5) break;
    }
  };

  if (uid) {
    const interests = [
      db.prepare(`SELECT location AS val, 'location' AS kind FROM wines WHERE user_id=? AND location!='' GROUP BY location ORDER BY COUNT(*) DESC LIMIT 1`).get(uid),
      db.prepare(`SELECT grapes   AS val, 'grapes'   AS kind FROM wines WHERE user_id=? AND grapes!=''   GROUP BY grapes   ORDER BY COUNT(*) DESC LIMIT 1`).get(uid),
      db.prepare(`SELECT type     AS val, 'type'     AS kind FROM wines WHERE user_id=? AND type!=''     GROUP BY type     ORDER BY COUNT(*) DESC LIMIT 1`).get(uid),
    ].filter(Boolean);

    for (const { val, kind } of interests) {
      if (results.length >= 5) break;
      const shortVal = kind === 'grapes' ? val.split(',')[0].trim() : val;

      const likeMe = db.prepare(`
        SELECT DISTINCT user_id FROM wines
        WHERE user_id != ? AND ${kind === 'location' ? 'location=?' : kind === 'grapes' ? 'grapes LIKE ?' : 'type=?'}
      `).all(uid, kind === 'grapes' ? `%${shortVal}%` : val).map(r => r.user_id);

      if (!likeMe.length) continue;

      const placeholders = likeMe.map(() => '?').join(',');
      const rows = db.prepare(`
        SELECT u.id, u.username, u.avatar_path,
               (SELECT COUNT(*) FROM wines   WHERE user_id=u.id) AS post_count,
               (SELECT COUNT(*) FROM follows WHERE following_id=u.id) AS follower_count,
               COUNT(*) AS signal
        FROM follows f JOIN users u ON u.id = f.following_id
        WHERE f.follower_id IN (${placeholders})
          AND f.following_id != ?
          AND f.following_id NOT IN (SELECT following_id FROM follows WHERE follower_id=?)
        GROUP BY f.following_id
        ORDER BY signal DESC
        LIMIT 5
      `).all(...likeMe, uid, uid);

      for (const r of rows) {
        if (seen.has(r.id)) continue;
        const n = r.signal;
        const label = kind === 'location' ? shortVal
                    : kind === 'grapes'   ? `${shortVal} lovers`
                    : `${shortVal} drinkers`;
        const reason = `${n} ${kind === 'location' ? shortVal + ' lover' + (n !== 1 ? 's' : '') : label} follow${n === 1 ? 's' : ''} them`;
        seen.add(r.id);
        results.push({ id: r.id, username: r.username, avatar_path: r.avatar_path, post_count: r.post_count, follower_count: r.follower_count, reason });
        if (results.length >= 5) break;
      }
    }
  }

  // Fallback: most active users not yet followed
  if (results.length < 5) {
    const excludeIds = [...seen].map(Number).filter(Number.isFinite).join(',') || '0';
    const rows = db.prepare(`
      SELECT u.id, u.username, u.avatar_path,
             (SELECT COUNT(*) FROM wines   WHERE user_id=u.id) AS post_count,
             (SELECT COUNT(*) FROM follows WHERE following_id=u.id) AS follower_count
      FROM users u
      WHERE u.id NOT IN (${excludeIds})
        AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id=?)
      ORDER BY post_count DESC, follower_count DESC
      LIMIT ?
    `).all(uid || 0, 5 - results.length);
    addWithReason(rows, null);
  }

  // Attach a palate-match % so the "People you may know" cards can show it —
  // surfaces the Taste Match feature where people actually discover each other.
  // Only when the current user has logged wines (otherwise there's no signal).
  if (uid) {
    const me = getPalate(uid);
    if (me.count) {
      for (const r of results) {
        const score = matchScore(me, getPalate(r.id));
        if (score !== null) r.match = score;
      }
    }
  }

  res.json(results);
});

// Public profile — counts + follow state. Secret columns stripped.
router.get('/api/users/:id', (req, res) => {
  const { currentUserId } = req.query;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  const wineCount     = db.prepare('SELECT COUNT(*) as c FROM wines WHERE user_id = ?').get(req.params.id).c;
  const likesReceived = db.prepare('SELECT COUNT(*) as c FROM likes l JOIN wines w ON l.wine_id = w.id WHERE w.user_id = ?').get(req.params.id).c;
  const followerCount  = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(req.params.id).c;
  const followingCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?').get(req.params.id).c;
  const isFollowing = currentUserId
    ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, req.params.id)
    : false;
  res.json({ ...publicUser(user), wineCount, likesReceived, followerCount, followingCount, isFollowing });
});

// Badges + weekly streak — computed live from the journal
router.get('/api/users/:id/badges', (req, res) => {
  const uid = Number(req.params.id);
  const wines = db.prepare(
    'SELECT opened_at, created_at FROM wines WHERE user_id = ?'
  ).all(uid);

  const badges = computeBadges(computeStats(db, uid));

  // Weekly logging streak: consecutive ISO weeks (incl. this week) with ≥1 log
  const weekKey = (d) => {
    const t = new Date(d); t.setHours(0,0,0,0);
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    const week1 = new Date(t.getFullYear(), 0, 4);
    return t.getFullYear() * 100 + 1 +
      Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  };
  const weeks = new Set(wines.map(w => weekKey(new Date((w.opened_at || w.created_at).slice(0, 10)))));
  let streak = 0;
  const cursor = new Date();
  while (weeks.has(weekKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 7); }

  res.json({ badges, streak, earnedCount: badges.filter(b => b.earned).length, totalCount: badges.length });
});

// "Your Month in Wine" — Spotify-Wrapped-style recap for a period.
// Pure aggregation over the user's own journal — no AI involved.
router.get('/api/users/:id/recap', (req, res) => {
  const uid = Number(req.params.id);
  const period = ['month', 'year', 'all'].includes(req.query.period) ? req.query.period : 'month';

  const wines = db.prepare(
    'SELECT name, winery, type, location, grapes, rating, opened_at, created_at, is_biodynamic, is_organic FROM wines WHERE user_id = ?'
  ).all(uid);

  // Filter to the period using the opened date (falls back to logged date)
  const cutoff = new Date();
  if (period === 'month')      cutoff.setMonth(cutoff.getMonth() - 1);
  else if (period === 'year')  cutoff.setFullYear(cutoff.getFullYear() - 1);
  else                         cutoff.setTime(0);

  const inPeriod = wines.filter(w => {
    const raw = (w.opened_at || w.created_at || '').slice(0, 10);
    const d = new Date(raw + 'T12:00:00Z');
    return raw && !isNaN(d) && d >= cutoff;
  });

  // Most frequent value in a list, with its count
  const topOf = (arr) => {
    const m = {};
    arr.forEach(v => { if (v) m[v] = (m[v] || 0) + 1; });
    let best = null, n = 0;
    for (const [k, c] of Object.entries(m)) if (c > n) { best = k; n = c; }
    return best ? { name: best, count: n } : null;
  };

  const grapes  = inPeriod.flatMap(w => (w.grapes || '').split(/[,/]/).map(g => g.trim()).filter(Boolean));
  const regions = inPeriod.map(w => (w.location || '').trim()).filter(Boolean);
  const types   = inPeriod.map(w => w.type).filter(Boolean);
  const ratings = inPeriod.map(w => Number(w.rating)).filter(r => r > 0);
  const green   = inPeriod.filter(w => w.is_biodynamic || w.is_organic).length;
  const best    = inPeriod.filter(w => Number(w.rating) > 0).sort((a, b) => b.rating - a.rating)[0] || null;

  res.json({
    period,
    total:         inPeriod.length,
    topGrape:      topOf(grapes),
    topRegion:     topOf(regions),
    topType:       topOf(types),
    uniqueGrapes:  new Set(grapes.map(g => g.toLowerCase())).size,
    uniqueRegions: new Set(regions.map(r => r.toLowerCase())).size,
    avgRating:     ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10 : null,
    greenPct:      inPeriod.length ? Math.round(green / inPeriod.length * 100) : 0,
    highestRated:  best ? { name: best.name, winery: best.winery, rating: best.rating, type: best.type } : null,
  });
});

// Taste Match — palate compatibility between two users
router.get('/api/users/:id/taste-match', (req, res) => {
  const a = Number(req.params.id);
  const b = Number(req.query.withId);
  if (!b || a === b) return res.status(400).json({ error: 'invalid' });

  const pa = getPalate(a), pb = getPalate(b);
  if (pa.count === 0 || pb.count === 0) {
    return res.json({ score: null, reason: 'Both tasters need at least one logged wine.' });
  }

  // Per-component overlap drives the breakdown; matchScore() does the blend.
  const types   = jaccard(pa.types,   pb.types);
  const grapes  = jaccard(pa.grapes,  pb.grapes);
  const regions = jaccard(pa.regions, pb.regions);
  const ratingSim = 1 - Math.min(Math.abs(pa.avgRating - pb.avgRating) / 4, 1);
  const score = matchScore(pa, pb);

  const cap = (s) => s.replace(/\b\w/g, c => c.toUpperCase());
  res.json({
    score,
    sharedTypes:   types   ? types.shared : [],
    sharedGrapes:  grapes  ? grapes.shared.map(cap)  : [],
    sharedRegions: regions ? regions.shared.map(cap) : [],
    ratingStyle: ratingSim > 0.85 ? 'You score wines almost identically'
               : ratingSim > 0.6  ? 'Similar rating style'
               : 'One of you is the tough critic',
  });
});

// Save taste tags (onboarding picks) — own account only
router.post('/api/users/:id/taste-tags', requireAuth, (req, res) => {
  if (parseInt(req.params.id) !== req.user.id) return res.status(403).json({ error: 'not yours' });
  const { types = [], grapes = [] } = req.body;

  db.prepare('DELETE FROM taste_tags WHERE user_id = ?').run(req.user.id);
  const insert = db.prepare('INSERT OR IGNORE INTO taste_tags (user_id, tag_type, tag_value) VALUES (?, ?, ?)');
  for (const t of types)  insert.run(req.user.id, 'type',  t);
  for (const g of grapes) insert.run(req.user.id, 'grape', g);

  res.json({ ok: true, saved: types.length + grapes.length });
});

router.get('/api/users/:id/taste-tags', (req, res) => {
  const rows = db.prepare('SELECT tag_type, tag_value FROM taste_tags WHERE user_id = ?').all(req.params.id);
  res.json({
    types:  rows.filter(r => r.tag_type === 'type').map(r => r.tag_value),
    grapes: rows.filter(r => r.tag_type === 'grape').map(r => r.tag_value),
  });
});

// Follow lists
router.get('/api/users/:id/following', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.avatar_path
    FROM follows f JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
  `).all(req.params.id);
  res.json(rows);
});

router.get('/api/users/:id/followers', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.avatar_path
    FROM follows f JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
  `).all(req.params.id);
  res.json(rows);
});

router.get('/api/users/:id/winery-follows', (req, res) => {
  const rows = db.prepare(`
    SELECT wf.winery AS name,
           (SELECT COUNT(*) FROM wines w WHERE LOWER(w.winery) = LOWER(wf.winery)) AS post_count
    FROM winery_follows wf
    WHERE wf.user_id = ?
    ORDER BY wf.created_at DESC
  `).all(req.params.id);
  res.json(rows);
});

// Activity feed: likes + reposts made by a user, newest first
router.get('/api/users/:id/activity', (req, res) => {
  const uid = Number(req.params.id);
  const currentUserId = Number(req.query.currentUserId) || 0;

  const baseSelect = `
    SELECT w.id, w.name, w.winery, w.vintage, w.type, w.rating, w.notes,
           w.image_path, w.location, w.grapes, w.is_biodynamic, w.is_organic,
           w.opened_at, w.created_at, w.updated_at, w.user_id,
           u.username, u.avatar_path,
           COUNT(DISTINCT l.user_id)  AS like_count,
           COUNT(DISTINCT c.id)       AS comment_count,
           COUNT(DISTINCT rp.id)      AS repost_count,
           MAX(CASE WHEN l2.user_id  = ${currentUserId} THEN 1 ELSE 0 END) AS user_liked,
           MAX(CASE WHEN rp2.user_id = ${currentUserId} THEN 1 ELSE 0 END) AS user_reposted
    FROM wines w
    JOIN users u ON u.id = w.user_id
    LEFT JOIN likes l    ON l.wine_id  = w.id
    LEFT JOIN likes l2   ON l2.wine_id = w.id AND l2.user_id = ${currentUserId}
    LEFT JOIN comments c ON c.wine_id  = w.id
    LEFT JOIN reposts rp  ON rp.wine_id  = w.id
    LEFT JOIN reposts rp2 ON rp2.wine_id = w.id AND rp2.user_id = ${currentUserId}
  `;

  const liked = db.prepare(`
    ${baseSelect}
    JOIN likes la ON la.wine_id = w.id AND la.user_id = ?
    GROUP BY w.id
    ORDER BY la.created_at DESC
    LIMIT 50
  `).all(uid).map(w => ({ ...w, activity_type: 'liked', activity_at: null }));

  const reposted = db.prepare(`
    ${baseSelect}
    JOIN reposts ra ON ra.wine_id = w.id AND ra.user_id = ?
    GROUP BY w.id
    ORDER BY ra.created_at DESC
    LIMIT 50
  `).all(uid).map(w => ({ ...w, activity_type: 'reposted', activity_at: null }));

  const merged = [...liked, ...reposted].sort((a, b) => b.created_at > a.created_at ? 1 : -1).slice(0, 50);
  res.json(merged);
});

// Follow / unfollow toggle — actor is always the token user
router.post('/api/users/:id/follow', requireAuth, (req, res) => {
  const followerId  = req.user.id;
  const followingId = parseInt(req.params.id);
  if (!followingId || followerId === followingId) return res.status(400).json({ error: 'invalid' });
  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(followerId, followingId);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(followerId, followingId);
    db.prepare("DELETE FROM notifications WHERE user_id=? AND actor_id=? AND type='follow'").run(followingId, followerId);
  } else {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(followerId, followingId);
    db.prepare('INSERT INTO notifications (user_id, actor_id, type) VALUES (?,?,?)').run(followingId, followerId, 'follow');
    wsPush(followingId, 'notification', { type: 'follow' });
  }
  const followerCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(followingId).c;
  res.json({ following: !existing, followerCount });
});

// AI taste profile (1–2 sentence palate summary)
router.get('/api/users/:id/taste-profile', async (req, res) => {
  const wines = db.prepare('SELECT type, location, grapes, rating, notes FROM wines WHERE user_id = ?').all(req.params.id);
  if (wines.length < 2) return res.json({ profile: null, reason: 'Log at least 2 wines to generate a taste profile.' });

  const typeCounts = {}, grapeCounts = {}, regionCounts = {};
  let totalRating = 0, ratedCount = 0;

  wines.forEach(w => {
    if (w.type)   typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
    if (w.grapes) w.grapes.split(/[,/]/).map(g => g.trim()).filter(Boolean)
      .forEach(g => { grapeCounts[g] = (grapeCounts[g] || 0) + 1; });
    if (w.location) regionCounts[w.location] = (regionCounts[w.location] || 0) + 1;
    if (w.rating)   { totalRating += w.rating; ratedCount++; }
  });

  const top = (obj, n) => Object.entries(obj).sort((a,b) => b[1]-a[1]).slice(0,n).map(([k]) => k);
  const avgRating = ratedCount ? (totalRating / ratedCount).toFixed(1) : null;

  // Natural-language list: ["a","b","c"] → "a, b and c"
  const listPhrase = (arr) =>
    arr.length <= 1 ? (arr[0] || '') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;

  // Data-driven profile — works with no AI. Every user gets a real profile;
  // the AI version (when a key is configured) is a richer enhancement.
  const buildDataProfile = () => {
    const topTypes  = top(typeCounts, 2);
    const topGrapes = top(grapeCounts, 3);
    const topRegs   = top(regionCounts, 2);
    let s = topTypes.length
      ? `You lean toward ${listPhrase(topTypes)}`
      : 'Your palate is still taking shape';
    if (topGrapes.length) s += `, with a soft spot for ${listPhrase(topGrapes)}`;
    if (topRegs.length)   s += `. ${listPhrase(topRegs)} show${topRegs.length === 1 ? 's' : ''} up most in your glass`;
    if (avgRating) {
      const style = avgRating >= 4.3 ? "you're a generous rater"
                  : avgRating <= 3   ? "you're a tough critic"
                  : 'you rate with a balanced hand';
      s += `. And ${style} (avg ${avgRating}/5)`;
    }
    return s.replace(/\.\s*$/, '') + '.';
  };
  const dataProfile = buildDataProfile();

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ profile: dataProfile, source: 'data' });
  }

  const summary = [
    `Total wines logged: ${wines.length}`,
    `Wine types: ${Object.entries(typeCounts).map(([k,v]) => `${k} (${v})`).join(', ')}`,
    top(grapeCounts, 5).length  ? `Top grapes: ${top(grapeCounts, 5).join(', ')}` : null,
    top(regionCounts, 5).length ? `Top regions: ${top(regionCounts, 5).join(', ')}` : null,
    avgRating ? `Average rating given: ${avgRating}/5` : null,
  ].filter(Boolean).join('\n');

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `Based on this wine drinker's log, write a single punchy 1–2 sentence taste profile in second person (e.g. "You lean toward..."). Be specific and vivid. No preamble.\n\n${summary}`,
      }],
    });
    res.json({ profile: response.content[0].text.trim() });
  } catch (err) {
    console.error('Taste profile error:', err.message);
    res.status(500).json({ profile: null, reason: err.message });
  }
});

// Update own bio
router.patch('/api/users/:id', requireAuth, (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { bio } = req.body;
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio ?? null, req.user.id);
  res.json(db.prepare('SELECT id, username, avatar_path, bio FROM users WHERE id = ?').get(req.user.id));
});

// Upload own avatar
const { avatarUpload } = require('../lib/upload');
const { optimizeImage } = require('../lib/optimizeImage');
router.post('/api/users/:id/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  if (!req.file) return res.status(400).json({ error: 'no file' });
  // Avatars display at ≤120px — shrink hard so they're a few KB, not MBs.
  await optimizeImage(req.file.path, { maxDim: 256, quality: 82 });
  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').run(avatarPath, req.user.id);
  res.json({ avatar_path: avatarPath });
});

// Update own bio (legacy path kept for the app's older fetches)
router.post('/api/users/:id/bio', requireAuth, (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { bio } = req.body;
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio || null, req.user.id);
  res.json({ bio: bio || null });
});

module.exports = router;
