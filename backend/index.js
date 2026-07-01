// ═══════════════════════════════════════════════════════════════════════════
//  SIPIARY API — composition root
//
//  This file only wires things together. The actual logic lives in:
//
//    db.js                      database schema + migrations
//    lib/auth.js                JWT, requireAuth/optionalAuth, rate limiters
//    lib/upload.js              multer image uploads (type + size validated)
//    lib/ws.js                  real-time notification push registry (WebSocket)
//    lib/badges.js              badge definitions
//    lib/helpers.js             publicUser whitelist + shared feed SQL
//    lib/disposable-emails.js   throwaway email blocklist
//    routes/auth.routes.js      register / login / refresh / password changes
//    routes/users.routes.js     profiles, follows, badges, taste data
//    routes/wines.routes.js     feed, search, trending, bottle/winery, CRUD
//    routes/social.routes.js    likes, reposts, comments
//    routes/notifications.routes.js
//    routes/cellar.routes.js
//    routes/ai.routes.js        pairings, label detection, autocomplete
//
//  See README.md in this folder for how to add an endpoint safely.
// ═══════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');

const { optionalAuth } = require('./lib/auth');
const { UPLOADS_DIR } = require('./lib/paths');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind a reverse proxy (nginx / Vite dev proxy) the client IP arrives in
// X-Forwarded-For — needed for rate limiting to count the right address.
app.set('trust proxy', 1);

// ─── Compression ──────────────────────────────────────────────────────────────
// gzip every text response (HTML, JS, CSS, JSON). Fly's edge does NOT compress
// for us, so without this the ~480KB JS bundle and feed JSON ship uncompressed.
// Skips already-compressed images (they set their own Content-Encoding/type).
app.use(compression());

// ─── Security headers ────────────────────────────────────────────────────────
// helmet sets X-Content-Type-Options: nosniff (stops uploaded files being
// sniffed into scripts), X-Frame-Options (clickjacking), and more.
app.use(helmet({
  contentSecurityPolicy: false,        // SPA serves its own assets via Vite/nginx
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image loads
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production set ALLOWED_ORIGIN=https://yourdomain.com (comma-separated for
// several). Unset = same-origin deployments and local dev via the Vite proxy.
const allowed = process.env.ALLOWED_ORIGIN?.split(',').map(s => s.trim());
app.use(cors(allowed ? { origin: allowed } : {}));

app.use(express.json({ limit: '1mb' }));

// Decode the JWT on every request when present — routes use req.user for
// identity. Mutating routes additionally enforce requireAuth themselves.
app.use(optionalAuth);

// Ensure upload dirs exist, then serve them (images only — see lib/upload.js).
// UPLOADS_DIR lives under DATA_DIR so it can sit on a persistent host volume.
['avatars', 'wines'].forEach(sub =>
  fs.mkdirSync(path.join(UPLOADS_DIR, sub), { recursive: true })
);
// Upload filenames are random and never reused, so the bytes at a given URL
// never change — cache them hard. Saves re-downloading every photo on each
// navigation (was max-age=0), a big mobile-data and speed win.
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1y', immutable: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(require('./routes/auth.routes'));
app.use(require('./routes/users.routes'));
app.use(require('./routes/wines.routes'));
app.use(require('./routes/social.routes'));
app.use(require('./routes/notifications.routes'));
app.use(require('./routes/cellar.routes'));
app.use(require('./routes/ai.routes'));
app.use(require('./routes/admin.routes'));
app.use(require('./routes/feedback.routes'));

// ─── Serve the built frontend (production) ─────────────────────────────────────
// In dev the Vite server hosts the SPA and proxies /api here, so this block is
// skipped. In production we run `npm run build` in ../frontend and serve the
// static bundle from this same process — one origin, no CORS, SQLite + uploads
// sit right next to it. Any non-API GET falls through to index.html so the
// client-side router (incl. /share/wine/:id) works on hard refresh.
const distDir = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  // Vite fingerprints asset filenames (…-AbC123.js), so their bytes never change
  // → cache them for a year, immutable. index.html must NOT be cached or clients
  // would keep loading an old bundle after a deploy.
  app.use(express.static(distDir, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));
  // SPA fallback as a path-less middleware — Express 5 dropped the bare '*'
  // route pattern, so we match here instead. Only GETs for non-API, non-upload
  // paths fall through to index.html.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Central error handler — uploads with bad file types, JSON parse errors etc.
// land here instead of leaking stack traces to the client.
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 400).json({ error: err.message || 'Request failed' });
});

const server = http.createServer(app);

// WebSocket server for real-time notifications (/ws/notifications?token=...)
const wss = new WebSocketServer({ noServer: true });
const { handleWsUpgrade } = require('./routes/notifications.routes');
server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/ws/notifications') {
    wss.handleUpgrade(req, socket, head, (ws) => handleWsUpgrade(ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => console.log(`🍷 Sipiary API running at http://localhost:${PORT}`));
