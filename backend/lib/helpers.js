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
  const { id, username, avatar_path, bio, created_at } = row;
  return { id, username, avatar_path, bio, created_at };
};

const wineCardSelect = (uid) => {
  uid = Number(uid) || 0;
  return `
    SELECT w.*, u.username, u.avatar_path,
           COUNT(DISTINCT l.user_id)  AS like_count,
           COUNT(DISTINCT c.id)       AS comment_count,
           MAX(CASE WHEN l2.user_id = ${uid} THEN 1 ELSE 0 END) AS user_liked,
           COUNT(DISTINCT rp.user_id) AS repost_count,
           MAX(CASE WHEN rp2.user_id = ${uid} THEN 1 ELSE 0 END) AS user_reposted,
           NULL AS reposted_by
  `;
};

const wineCardJoins = (uid) => {
  uid = Number(uid) || 0;
  return `
    FROM wines w
    JOIN users u ON w.user_id = u.id
    LEFT JOIN likes l  ON l.wine_id  = w.id
    LEFT JOIN likes l2 ON l2.wine_id = w.id AND l2.user_id = ${uid}
    LEFT JOIN comments c  ON c.wine_id  = w.id
    LEFT JOIN reposts rp  ON rp.wine_id  = w.id
    LEFT JOIN reposts rp2 ON rp2.wine_id = w.id AND rp2.user_id = ${uid}
  `;
};

// The id used for engagement flags (user_liked / user_reposted).
// Prefers the verified token; falls back to the query param for
// logged-out compatibility. NEVER use this for privacy decisions —
// use req.user?.id directly for those.
const flagUid = (req) => req.user?.id ?? (parseInt(req.query.currentUserId) || 0);

module.exports = { publicUser, wineCardSelect, wineCardJoins, flagUid };
