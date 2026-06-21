// ─── Palate compatibility ────────────────────────────────────────────────────
// Shared by the Taste Match route (full breakdown) and the follow-suggestion
// route (just the score). Score = weighted Jaccard overlap of grapes / types /
// regions plus rating-style similarity, 0–100.

const db = require('../db');

// Build a user's palate snapshot from their logged wines.
function getPalate(uid) {
  const wines = db.prepare('SELECT type, location, grapes, rating FROM wines WHERE user_id = ?').all(uid);
  return {
    count:   wines.length,
    types:   new Set(wines.map(w => w.type).filter(Boolean)),
    regions: new Set(wines.map(w => (w.location || '').trim().toLowerCase()).filter(Boolean)),
    grapes:  new Set(wines.flatMap(w => (w.grapes || '').split(',').map(g => g.trim().toLowerCase()).filter(Boolean))),
    avgRating: wines.length ? wines.reduce((s, w) => s + (w.rating || 0), 0) / wines.length : 0,
  };
}

// Jaccard ratio + the shared members (the breakdown route needs both).
function jaccard(x, y) {
  if (x.size === 0 && y.size === 0) return null;
  const shared = [...x].filter(v => y.has(v));
  return { ratio: shared.length / new Set([...x, ...y]).size, shared };
}

// Weighted blended score (0–100), or null if either palate is empty.
// Grapes weigh most — they say the most about a palate.
function matchScore(pa, pb) {
  if (!pa.count || !pb.count) return null;
  const types   = jaccard(pa.types,   pb.types);
  const grapes  = jaccard(pa.grapes,  pb.grapes);
  const regions = jaccard(pa.regions, pb.regions);
  const ratingSim = 1 - Math.min(Math.abs(pa.avgRating - pb.avgRating) / 4, 1);
  const parts = [
    types   && { w: 0.30, v: types.ratio },
    grapes  && { w: 0.40, v: grapes.ratio },
    regions && { w: 0.15, v: regions.ratio },
    { w: 0.15, v: ratingSim },
  ].filter(Boolean);
  const totalW = parts.reduce((s, p) => s + p.w, 0);
  return Math.round((parts.reduce((s, p) => s + p.w * p.v, 0) / totalW) * 100);
}

module.exports = { getPalate, jaccard, matchScore };
