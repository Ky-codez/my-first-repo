// ─── Badge definitions ───────────────────────────────────────────────────────
// Badges are computed live from the wine journal — no badge table needed.
// To add a badge: add an entry below. `test(stats)` decides earned;
// optional `progress(stats)` returns [current, goal] for the progress bar.
// rarity drives the holo card art: 'common' | 'rare' | 'epic' | 'legendary'.

const BADGE_DEFS = [
  { id: 'first_pour',   emoji: '🍷', name: 'First Pour',      rarity: 'common',
    desc: 'Logged your first wine',
    test: s => s.total >= 1 },
  { id: 'first_rose',   emoji: '🌸', name: 'First Rosé',      rarity: 'common',
    desc: 'Logged your first rosé',
    test: s => s.types.has('Rosé') },
  { id: 'first_bubbles',emoji: '✨', name: 'First Bubbles',   rarity: 'common',
    desc: 'Logged your first sparkling',
    test: s => s.types.has('Sparkling') },
  { id: 'first_champagne', emoji: '🍾', name: 'First Champagne', rarity: 'rare',
    desc: 'Logged your first Champagne',
    test: s => s.types.has('Champagne') },
  { id: 'first_sticky', emoji: '🍯', name: 'Sweet Tooth',     rarity: 'rare',
    desc: 'Logged a dessert wine',
    test: s => s.types.has('Dessert') },
  { id: 'style_explorer', emoji: '🎨', name: 'Style Explorer', rarity: 'epic',
    desc: 'Logged 4+ different wine styles',
    test: s => s.types.size >= 4,
    progress: s => [s.types.size, 4] },
  { id: 'globetrotter3', emoji: '🗺️', name: 'Wanderer',       rarity: 'rare',
    desc: 'Wines from 3 different regions',
    test: s => s.regions.size >= 3,
    progress: s => [s.regions.size, 3] },
  { id: 'globetrotter5', emoji: '🌍', name: 'Globetrotter',   rarity: 'epic',
    desc: 'Wines from 5 different regions',
    test: s => s.regions.size >= 5,
    progress: s => [s.regions.size, 5] },
  { id: 'grape5',       emoji: '🍇', name: 'Grape Collector', rarity: 'rare',
    desc: '5 different grape varieties',
    test: s => s.grapes.size >= 5,
    progress: s => [s.grapes.size, 5] },
  { id: 'grape10',      emoji: '👑', name: 'Ampelographer',   rarity: 'legendary',
    desc: '10 different grape varieties',
    test: s => s.grapes.size >= 10,
    progress: s => [s.grapes.size, 10] },
  { id: 'critic',       emoji: '📝', name: 'The Critic',      rarity: 'rare',
    desc: '5 wines with tasting notes',
    test: s => s.withNotes >= 5,
    progress: s => [s.withNotes, 5] },
  { id: 'shutterbug',   emoji: '📸', name: 'Shutterbug',      rarity: 'common',
    desc: '3 wines with photos',
    test: s => s.withPhotos >= 3,
    progress: s => [s.withPhotos, 3] },
  { id: 'green_soul',   emoji: '🌱', name: 'Green Soul',      rarity: 'rare',
    desc: '3 organic or biodynamic wines',
    test: s => s.green >= 3,
    progress: s => [s.green, 3] },
  { id: 'time_capsule', emoji: '🕰️', name: 'Time Capsule',    rarity: 'epic',
    desc: 'Logged a wine 10+ years old',
    test: s => s.oldestAge >= 10 },
  { id: 'full_moon',    emoji: '🌕', name: 'Moonchild',       rarity: 'legendary',
    desc: 'Opened a bottle on a full moon',
    test: s => s.fullMoon },
  { id: 'partner_in_wine', emoji: '🤝', name: 'Partner in Wine!', rarity: 'epic',
    desc: 'Referred a friend who joined',
    test: s => (s.referrals || 0) >= 1,
    progress: s => [s.referrals || 0, 1] },
];

// Same synodic-month approximation the frontend lunar calendar uses
function isFullMoon(date) {
  const synodic = 29.53058867;
  const known   = new Date('2000-01-06T18:14:00Z'); // known new moon
  const days    = (date - known) / 86400000;
  const phase   = ((days % synodic) + synodic) % synodic / synodic; // 0..1
  return Math.abs(phase - 0.5) < 0.034; // ~±1 day window
}

// Build the stats object the badge tests run against, live from the journal.
function computeStats(db, uid) {
  const wines = db.prepare(
    'SELECT type, location, grapes, notes, image_path, vintage, opened_at, created_at, is_biodynamic, is_organic FROM wines WHERE user_id = ?'
  ).all(uid);
  const thisYear = new Date().getFullYear();
  return {
    total:      wines.length,
    types:      new Set(wines.map(w => w.type).filter(Boolean)),
    regions:    new Set(wines.map(w => (w.location || '').trim().toLowerCase()).filter(Boolean)),
    grapes:     new Set(wines.flatMap(w => (w.grapes || '').split(',').map(g => g.trim().toLowerCase()).filter(Boolean))),
    withNotes:  wines.filter(w => w.notes && w.notes.trim()).length,
    withPhotos: wines.filter(w => w.image_path).length,
    green:      wines.filter(w => w.is_biodynamic || w.is_organic).length,
    oldestAge:  Math.max(0, ...wines.map(w => Number(w.vintage) ? thisYear - Number(w.vintage) : 0)),
    fullMoon:   wines.some(w => {
      const d = w.opened_at || w.created_at;
      return d && isFullMoon(new Date(d.slice(0, 10) + 'T12:00:00Z'));
    }),
    referrals:  db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by = ?').get(uid).n,
  };
}

// Full badge list (earned flag + progress) for a user.
function computeBadges(stats) {
  return BADGE_DEFS.map(b => {
    const earned = b.test(stats);
    const prog   = !earned && b.progress ? b.progress(stats) : null;
    return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, rarity: b.rarity,
             earned, progress: prog ? { now: Math.min(prog[0], prog[1]), goal: prog[1] } : null };
  });
}

// The set of earned badge ids — for before/after diffing on a new log.
function earnedBadgeIds(db, uid) {
  const stats = computeStats(db, uid);
  return new Set(BADGE_DEFS.filter(b => b.test(stats)).map(b => b.id));
}

// Given the earned-id set from before a log, return the full badge objects
// that became newly earned after it. Powers the log-success celebration.
function newlyEarned(db, uid, beforeIds) {
  const after = earnedBadgeIds(db, uid);
  return BADGE_DEFS
    .filter(b => after.has(b.id) && !beforeIds.has(b.id))
    .map(({ id, emoji, name, desc, rarity }) => ({ id, emoji, name, desc, rarity }));
}

module.exports = { BADGE_DEFS, isFullMoon, computeStats, computeBadges, earnedBadgeIds, newlyEarned };
