// ─── Data locations ──────────────────────────────────────────────────────────
// SQLite + uploaded images are the app's only on-disk state. They default to
// the backend folder — correct for local dev and for a VPS where the whole app
// sits on a real disk. On hosts that mount a persistent volume elsewhere
// (e.g. Fly.io's /data), set DATA_DIR=/data so user data survives redeploys.
const path = require('path');

const DATA_DIR    = process.env.DATA_DIR || path.join(__dirname, '..');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

module.exports = { DATA_DIR, UPLOADS_DIR };
