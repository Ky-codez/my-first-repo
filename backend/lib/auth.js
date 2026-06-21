// ─── Authentication helpers ──────────────────────────────────────────────────
// Everything related to identity: JWT signing/verification, the middleware
// that protects routes, and the rate limiters that slow down brute force.
//
// HOW TO USE IN A ROUTE FILE:
//   const { requireAuth, optionalAuth } = require('../lib/auth');
//   router.post('/api/thing', requireAuth, (req, res) => { ... req.user.id ... });
//
// SECURITY RULES (do not break these when editing):
//   1. The acting user is ALWAYS req.user.id (from the verified token).
//      Never trust a user_id sent in the request body or query string.
//   2. Mutating routes (POST/PATCH/DELETE) must use requireAuth.
//   3. Read routes that reveal private data must check req.user themselves.

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET missing from .env');

// Sign a token — rememberMe = 30 days, default = 7 days. The token embeds the
// user's current token_version (tv); bumping that version in the DB instantly
// invalidates every token that carried the old value.
const signToken = (user, rememberMe = false) => {
  const row = db.prepare('SELECT token_version FROM users WHERE id = ?').get(user.id);
  return jwt.sign(
    { id: user.id, username: user.username, tv: row?.token_version ?? 0 },
    JWT_SECRET,
    { expiresIn: rememberMe ? '30d' : '7d' },
  );
};

// Verify a token's signature/expiry AND that it hasn't been revoked by a
// token_version bump (e.g. "log out of all devices"). Throws on any failure.
const verifyToken = (token) => {
  const payload = jwt.verify(token, JWT_SECRET);                  // bad sig / expired
  const row = db.prepare('SELECT token_version FROM users WHERE id = ?').get(payload.id);
  if (!row) throw new Error('account no longer exists');          // user deleted
  if ((payload.tv ?? 0) !== (row.token_version ?? 0)) throw new Error('token revoked');
  return payload;
};

// Hard gate: request fails with 401 unless a valid token is presented.
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = verifyToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Session expired — please log in again' });
  }
};

// Soft gate: sets req.user when a valid token is present, otherwise leaves it
// undefined and lets the request through. Used by public reads that show
// extra/private data to logged-in users (e.g. your own private wines).
const optionalAuth = (req, _res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try { req.user = verifyToken(auth.slice(7)); } catch {}
  }
  next();
};

// Auth endpoints: max 10 failed attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please try again in 15 minutes' },
  skipSuccessfulRequests: true,
});

// Register: max 3 new accounts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP — please try again later' },
  skipFailedRequests: true,
});

module.exports = { JWT_SECRET, signToken, verifyToken, requireAuth, optionalAuth, authLimiter, registerLimiter };
