#!/bin/sh
# Container entrypoint. Runs the app under Litestream when backups are
# configured, and falls back to running the app directly otherwise — so a
# missing tool or unset credential can NEVER stop the site from booting.
set -e

if [ -z "$R2_BUCKET" ] || ! command -v litestream >/dev/null 2>&1; then
  echo "[litestream] Backups OFF (no R2_BUCKET or binary) — starting app directly."
  exec node index.js
fi

# Fresh or replaced volume? Pull the latest backup down BEFORE the app opens
# the DB. A no-op on the very first run (no replica exists yet).
if [ ! -f /data/sipiary.db ]; then
  echo "[litestream] No local DB — restoring from R2 if a backup exists…"
  litestream restore -if-replica-exists /data/sipiary.db || true
fi

echo "[litestream] Backups ON — replicating /data/sipiary.db → R2 continuously."
exec litestream replicate -exec "node index.js"
