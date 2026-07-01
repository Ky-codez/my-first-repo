const Database = require('better-sqlite3');
const path = require('path');
const { DATA_DIR } = require('./lib/paths');

const db = new Database(path.join(DATA_DIR, 'sipiary.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    avatar_path TEXT,
    bio TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    winery TEXT,
    type TEXT DEFAULT 'Red',
    vintage INTEGER,
    location TEXT,
    grapes TEXT,
    is_biodynamic INTEGER DEFAULT 0,
    is_organic INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 3,
    notes TEXT,
    image_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS likes (
    wine_id INTEGER NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (wine_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wine_id INTEGER NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrate: add notifications table
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    wine_id    INTEGER REFERENCES wines(id) ON DELETE CASCADE,
    wine_name  TEXT,
    message    TEXT,
    is_read    INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrate: add cellar table
db.exec(`
  CREATE TABLE IF NOT EXISTS cellar (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    winery     TEXT,
    vintage    INTEGER,
    type       TEXT,
    list       TEXT DEFAULT 'wishlist',
    notes      TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrate: add follows table
db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (follower_id, following_id)
  );
`);

// Migrate: add focal/crop columns if they don't exist yet
[['focal_x', 17], ['focal_y', 0], ['focal_w', 65], ['focal_h', 87]].forEach(([col, def]) => {
  try { db.exec(`ALTER TABLE wines ADD COLUMN ${col} REAL DEFAULT ${def}`); } catch {}
});

// Migrate: add opened_at (the day the bottle was opened / tasted)
try { db.exec(`ALTER TABLE wines ADD COLUMN opened_at TEXT`); } catch {}

// Migrate: add reposts table
db.exec(`
  CREATE TABLE IF NOT EXISTS reposts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wine_id    INTEGER NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (user_id, wine_id)
  );
`);

// Migrate: add bio column to users
try { db.exec(`ALTER TABLE users ADD COLUMN bio TEXT`); } catch {}

// Migrate: add password_hash column to users
try { db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`); } catch {}

// Migrate: add email column to users
try { db.exec(`ALTER TABLE users ADD COLUMN email TEXT`); } catch {}

// Migrate: add per-account brute-force lockout columns
try { db.exec(`ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN locked_until TEXT`); } catch {}

// Migrate: referral — which user invited this account (their user id)
try { db.exec(`ALTER TABLE users ADD COLUMN referred_by INTEGER`); } catch {}

// Migrate: token_version — bumping it invalidates every existing JWT for the
// user. Each issued token embeds the version it was signed with; auth rejects
// any token whose version is stale. Powers "log out of all devices".
try { db.exec(`ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0`); } catch {}

// Migrate: record Terms/age consent at signup — an auditable, per-account record
// (the age gate's localStorage is anonymous and not legally meaningful).
try { db.exec(`ALTER TABLE users ADD COLUMN tos_accepted_at TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN tos_version TEXT`); } catch {}

// Migrate: add winery follows table.
// Wineries are not accounts — they are names aggregated from posts —
// so a "follow" simply pairs a user with a winery name.
db.exec(`
  CREATE TABLE IF NOT EXISTS winery_follows (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    winery     TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, winery)
  );
`);

// Migrate: add taste tags table.
// Stores what a user said they like during onboarding — wine types and
// grapes, each saved as a simple "tag". The Explore feed uses these to
// rank matching posts higher (boost, never filter).
db.exec(`
  CREATE TABLE IF NOT EXISTS taste_tags (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_type   TEXT NOT NULL,
    tag_value  TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, tag_type, tag_value)
  );
`);

// Migrate: add created_at to likes (for activity feed)
try { db.exec(`ALTER TABLE likes ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`); } catch {}

// Migrate: add is_private flag to wines
try { db.exec(`ALTER TABLE wines ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0`); } catch {}

// Migrate: add is_private flag to users (private account — profile page is
// owner-only and the user's wines are hidden from the main feed for others).
try { db.exec(`ALTER TABLE users ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0`); } catch {}

// Migrate: ambassador flag — verified-style badge (gold star) shown next to the
// username everywhere. Admin-set only (no self-serve); see admin ambassador route.
try { db.exec(`ALTER TABLE users ADD COLUMN is_ambassador INTEGER NOT NULL DEFAULT 0`); } catch {}

// Migrate: wine tags — people the logger tasted the wine WITH (Instagram-style
// tagging). One row per (wine, tagged user).
db.exec(`
  CREATE TABLE IF NOT EXISTS wine_tags (
    wine_id INTEGER NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (wine_id, user_id)
  );
`);

// Migrate: user feedback / bug reports. Surfaced in the Founder Dashboard.
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type       TEXT NOT NULL DEFAULT 'other',
    message    TEXT NOT NULL,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrate: feedback triage columns — flagged + completion status.
try { db.exec(`ALTER TABLE feedback ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE feedback ADD COLUMN status TEXT NOT NULL DEFAULT 'new'`); } catch {}

// Migrate: follow requests. Following a PRIVATE account creates a pending
// request here instead of an immediate follows row; once the target accepts,
// the request becomes a real follow (and is deleted from this table).
db.exec(`
  CREATE TABLE IF NOT EXISTS follow_requests (
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (requester_id, target_id)
  );
`);

// Migrate: swipes table for the Vibe Deck (Tinder-style discovery).
// direction: 'right' = want to try, 'left' = pass. One row per user+wine.
db.exec(`
  CREATE TABLE IF NOT EXISTS swipes (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wine_id    INTEGER NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    direction  TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, wine_id)
  );
`);

// Migrate: password reset tokens. We store only a SHA-256 HASH of the token,
// never the token itself — so a DB leak can't be used to hijack resets. Each
// token is single-use (used_at) and short-lived (expires_at).
db.exec(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TEXT NOT NULL,
    used_at     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash)`);

// Migrate: pretty share-link slugs — /@username/<slug> instead of /wine/:id.
// Unique per author (enforced in app code, indexed here for fast lookup).
try { db.exec(`ALTER TABLE wines ADD COLUMN slug TEXT`); } catch {}
db.exec(`CREATE INDEX IF NOT EXISTS idx_wines_user_slug ON wines(user_id, slug)`);
// Backfill any wine that predates the slug column.
{
  const { slugifyBase, uniqueSlug } = require('./lib/slug');
  const missing = db.prepare(
    `SELECT id, user_id, name, vintage FROM wines WHERE slug IS NULL OR slug = ''`
  ).all();
  const setSlug = db.prepare(`UPDATE wines SET slug = ? WHERE id = ?`);
  const backfill = db.transaction((rows) => {
    for (const w of rows) {
      setSlug.run(uniqueSlug(db, w.user_id, slugifyBase(w.name, w.vintage), w.id), w.id);
    }
  });
  backfill(missing);
}

// ── Performance indexes ──────────────────────────────────────────────────────
// The feed/profile/notification queries fan out across these tables (COUNT
// joins, privacy sub-selects, "who do I follow"). Without indexes SQLite does
// full table scans per row; these turn the hot paths into index lookups.
// All IF NOT EXISTS, so they're safe to (re)run on every boot.
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_likes_wine        ON likes(wine_id);
  CREATE INDEX IF NOT EXISTS idx_likes_wine_user   ON likes(wine_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_comments_wine     ON comments(wine_id);
  CREATE INDEX IF NOT EXISTS idx_reposts_wine      ON reposts(wine_id);
  CREATE INDEX IF NOT EXISTS idx_reposts_user      ON reposts(user_id);
  CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
  CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  CREATE INDEX IF NOT EXISTS idx_notifs_user       ON notifications(user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_notifs_actor      ON notifications(actor_id);
  CREATE INDEX IF NOT EXISTS idx_wines_user        ON wines(user_id);
  CREATE INDEX IF NOT EXISTS idx_wine_tags_wine    ON wine_tags(wine_id);
  CREATE INDEX IF NOT EXISTS idx_cellar_user       ON cellar(user_id);
  CREATE INDEX IF NOT EXISTS idx_winery_follows_user ON winery_follows(user_id);
  CREATE INDEX IF NOT EXISTS idx_swipes_user       ON swipes(user_id);
  CREATE INDEX IF NOT EXISTS idx_follow_req_target ON follow_requests(target_id);
`);

// SQLite runtime pragmas: WAL lets reads run concurrently with writes; the rest
// trade a little durability headroom for noticeably snappier queries.
try {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -16000'); // ~16 MB page cache
} catch {}

module.exports = db;
