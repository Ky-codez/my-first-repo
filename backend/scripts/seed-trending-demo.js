// ─── Demo seeder for the "What's Hot" leaderboard ────────────────────────────
// Seeds a handful of popular bottles, each logged by several public demo users
// THIS WEEK, so /trending (and the in-app What's Hot view) shows real
// "logged N× this week" counts instead of falling back to all-time.
//
//   node scripts/seed-trending-demo.js         # seed
//   node scripts/seed-trending-demo.js --clean # remove everything this seeded
//
// Every row it creates is tagged with SEED_NOTE, so --clean can remove them
// cleanly. Safe to run against a dev/demo database; do NOT run in production —
// the real leaderboard should reflect real logs.

const db = require('../db');

const SEED_NOTE = '[seed:whats-hot]';

// Public demo accounts to spread the logs across (distinct users = "tasters").
const DEMO_USER_IDS = db
  .prepare('SELECT id FROM users WHERE is_private = 0 ORDER BY id LIMIT 4')
  .all()
  .map((r) => r.id);

// Bottles to make "hot". Each rating in the array is one user's log this week.
// Leans into the natural / biodynamic niche (the leaf badge shows on the board).
const BOTTLES = [
  { name: 'Charlouise',     winery: 'Vincent Pinard', type: 'Red',       bio: 1, org: 1,
    ratings: [5, 4.5, 5, 4], note: 'Silky Pinot, wild strawberry and crushed stone. A crowd-pleaser.' },
  { name: 'Pomerol',        winery: 'Chateau Le Gay',  type: 'Red',       bio: 1, org: 0,
    ratings: [5, 4.5, 5],    note: 'Plush Merlot — black plum, cocoa, violets. Special-occasion bottle.' },
  { name: 'Cremant Brut',   winery: 'Domaine Rieflé',  type: 'Sparkling', bio: 1, org: 1,
    ratings: [4.5, 4, 5],    note: 'Fine bead, green apple and brioche. Punches way above its price.' },
  { name: 'Sancerre Blanc', winery: 'Mellot',          type: 'White',     bio: 0, org: 0,
    ratings: [4, 4.5, 4],    note: 'Zippy Sauvignon — citrus, flint, chalky finish. Summer in a glass.' },
  { name: 'Barossa Shiraz', winery: 'Penfolds',        type: 'Red',       bio: 0, org: 0,
    ratings: [4, 4.5],       note: 'Bold and jammy — blackberry, pepper, a lick of vanilla oak.' },
  { name: 'Napa Cab',       winery: 'Caymus',          type: 'Red',       bio: 0, org: 0,
    ratings: [4.5, 4],       note: 'Ripe cassis and mocha, velvety tannins. Classic Napa.' },
];

function clean() {
  const res = db.prepare('DELETE FROM wines WHERE notes LIKE ?').run(SEED_NOTE + '%');
  console.log(`🧹 Removed ${res.changes} seeded log(s).`);
}

function seed() {
  if (DEMO_USER_IDS.length === 0) {
    console.error('No public users found to attribute logs to. Aborting.');
    process.exit(1);
  }
  clean(); // idempotent — clear any previous seed first

  const ins = db.prepare(`
    INSERT INTO wines (user_id, name, winery, type, is_biodynamic, is_organic,
                       rating, notes, created_at, slug, is_private)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), ?, 0)
  `);

  let count = 0;
  const tx = db.transaction(() => {
    for (const b of BOTTLES) {
      b.ratings.forEach((rating, i) => {
        const uid = DEMO_USER_IDS[i % DEMO_USER_IDS.length];
        const daysAgo = -(i % 6); // spread across the last few days, still "this week"
        const slug =
          b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
          '-seed-' + Math.random().toString(36).slice(2, 8);
        ins.run(uid, b.name, b.winery, b.type, b.bio, b.org, rating,
                `${SEED_NOTE} ${b.note}`, `${daysAgo} days`, slug);
        count++;
      });
    }
  });
  tx();
  console.log(`🔥 Seeded ${count} logs across ${BOTTLES.length} bottles this week.`);
  console.log('   Open /trending (or Vibes → What\'s Hot) to see the leaderboard.');
}

if (process.argv.includes('--clean')) clean();
else seed();
