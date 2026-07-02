// ─── Shared query + response helpers ─────────────────────────────────────────
//
// publicUser(row)  — strips secret columns before a user row leaves the API.
//                    NEVER res.json() a raw users row: it contains
//                    password_hash, email and lockout columns.
//
// wineCardSelect / wineCardJoins — the SQL used everywhere a "wine card" is
//                    returned (feed, search, trending, winery, bottle pages).
//                    Keeps engagement counts consistent across the app.
//                    `uid` is coerced to a number so it is safe to inline.

const publicUser = (row) => {
  if (!row) return null;
  const { id, username, avatar_path, bio, created_at, is_ambassador } = row;
  return { id, username, avatar_path, bio, created_at, is_ambassador: is_ambassador ? 1 : 0 };
};

// Correlated subquery: the people tagged in a wine ("tasted with"), as a single
// "id:username,id:username" string the client parses. Add to any card SELECT.
const TAGGED_SQL = `(SELECT GROUP_CONCAT(tu.id || ':' || tu.username, ',') `
  + `FROM wine_tags wt JOIN users tu ON tu.id = wt.user_id WHERE wt.wine_id = w.id) AS tagged_users`;

// Engagement counts as correlated subqueries. The previous version LEFT
// JOINed likes × comments × reposts and used COUNT(DISTINCT …) + GROUP BY to
// collapse the row explosion — O(likes × comments) intermediate rows per
// wine. Each subquery here is a single indexed lookup per wine instead
// (idx_likes_wine / idx_comments_wine / idx_reposts_wine), and the counts are
// provably identical: likes has PK (wine_id, user_id) and reposts has
// UNIQUE (user_id, wine_id), so COUNT(*) == COUNT(DISTINCT user_id).
// Callers' `GROUP BY w.id` is now a no-op (w.id is unique after the single
// users join) and is kept only so this change stays a drop-in.
const wineCardSelect = (uid) => {
  uid = Number(uid) || 0;
  return `
    SELECT w.*, u.username, u.avatar_path, u.is_ambassador,
           (SELECT COUNT(*) FROM likes l     WHERE l.wine_id  = w.id) AS like_count,
           (SELECT COUNT(*) FROM comments c  WHERE c.wine_id  = w.id) AS comment_count,
           EXISTS(SELECT 1  FROM likes l2    WHERE l2.wine_id = w.id AND l2.user_id  = ${uid}) AS user_liked,
           (SELECT COUNT(*) FROM reposts rp  WHERE rp.wine_id = w.id) AS repost_count,
           EXISTS(SELECT 1  FROM reposts rp2 WHERE rp2.wine_id = w.id AND rp2.user_id = ${uid}) AS user_reposted,
           ${TAGGED_SQL},
           NULL AS reposted_by
  `;
};

// Counts live in wineCardSelect subqueries now, so the only join left is the
// author. (uid is unused but kept so call sites don't churn.)
const wineCardJoins = () => `
    FROM wines w
    JOIN users u ON w.user_id = u.id
  `;

// The id used for engagement flags (user_liked / user_reposted).
// Prefers the verified token; falls back to the query param for
// logged-out compatibility. NEVER use this for privacy decisions —
// use req.user?.id directly for those.
const flagUid = (req) => req.user?.id ?? (parseInt(req.query.currentUserId) || 0);

// Resolve the two viewer ids a wine query needs. They are DELIBERATELY
// different — do not mix them up:
//   • uid      → engagement flags only (user_liked / user_reposted). May come
//                from a query param when logged out, so it is NOT trustworthy
//                and must never gate access.
//   • viewerId → the VERIFIED token user id (0 when logged out). Use this for
//                EVERY privacy decision (visibleWines / visibleWinesNoJoin).
// Usage:  const { uid, viewerId } = viewerIds(req);
const viewerIds = (req) => ({ uid: flagUid(req), viewerId: req.user?.id || 0 });

// ─── Wine visibility (the single source of truth for privacy) ────────────────
// A WHERE fragment for any query that joins `wines w` and `users u`. A wine is
// visible to the viewer when:
//   • the wine is public AND its author's account is public, OR
//   • the viewer owns the wine, OR
//   • the viewer follows the (private) author — i.e. an approved follower.
// `viewerId` is coerced to a number so it is safe to inline. Pass the VERIFIED
// token id (req.user?.id), never a spoofable query param.
const visibleWines = (viewerId) => {
  viewerId = Number(viewerId) || 0;
  return `(w.is_private = 0 OR w.user_id = ${viewerId}) `
    + `AND (u.is_private = 0 OR w.user_id = ${viewerId} `
    + `OR w.user_id IN (SELECT following_id FROM follows WHERE follower_id = ${viewerId}))`;
};

// Same visibility rule for queries on `wines` ALONE (no users join) — e.g. the
// winery page's aggregate stats. Author privacy is checked with a subquery
// instead of the `u` alias. Keeps private accounts out of winery stats/lists.
const visibleWinesNoJoin = (viewerId) => {
  viewerId = Number(viewerId) || 0;
  return `(is_private = 0 OR user_id = ${viewerId}) `
    + `AND (user_id = ${viewerId} `
    + `OR user_id NOT IN (SELECT id FROM users WHERE is_private = 1) `
    + `OR user_id IN (SELECT following_id FROM follows WHERE follower_id = ${viewerId}))`;
};

module.exports = { publicUser, wineCardSelect, wineCardJoins, flagUid, viewerIds, visibleWines, visibleWinesNoJoin, TAGGED_SQL };
