// ─── Auth routes ─────────────────────────────────────────────────────────────
// Register, login, token refresh, and the password-protected account changes
// (username / email / password). Everything that touches a password lives here.

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth, authLimiter, registerLimiter } = require('../lib/auth');
const { isDisposableEmail } = require('../lib/disposable-emails');
const { publicUser } = require('../lib/helpers');
const { sendPasswordResetEmail } = require('../lib/email');

// Where reset links point. Set APP_URL=https://sipiary.fly.dev in production;
// falls back to the request's own origin so dev / preview work without config.
const resetBaseUrl = (req) =>
  process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

const router = express.Router();

const PASSWORD_RULES = [
  [p => p.length >= 8,            'Password must be at least 8 characters'],
  [p => /[a-zA-Z]/.test(p),       'Password must contain at least 1 letter'],
  [p => /[0-9]/.test(p),          'Password must contain at least 1 number'],
  [p => /[^a-zA-Z0-9]/.test(p),   'Password must contain at least 1 special character'],
];
const passwordError = (p) => PASSWORD_RULES.find(([ok]) => !ok(p))?.[1] || null;

// Register
// Current Terms/Privacy version users consent to at signup. Bump when the
// policy materially changes so older acceptances are distinguishable.
const TOS_VERSION = '2026-06-16';

router.post('/api/auth/register', authLimiter, registerLimiter, async (req, res) => {
  const { username, password, email, ref, tos_agreed, website } = req.body;
  // Honeypot: a hidden field humans never fill. Bots auto-fill it → drop them.
  if (website) return res.status(400).json({ error: 'Registration failed. Please try again.' });
  if (!username || !password || !email) return res.status(400).json({ error: 'Username, email and password required' });
  // Consent is required and enforced here, not just in the UI.
  if (tos_agreed !== true) return res.status(400).json({ error: 'You must confirm you are of legal drinking age and agree to the Terms & Privacy Policy.' });
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) return res.status(400).json({ error: 'Username can only contain letters, numbers and underscores' });
  if (username.trim().length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });

  const pwErr = passwordError(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (isDisposableEmail(email)) return res.status(400).json({ error: 'Disposable email addresses are not allowed. Please use a real email.' });

  const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
  if (existingUser) return res.status(409).json({ error: 'That username is already taken. Please choose a different one.' });
  const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existingEmail) return res.status(409).json({ error: 'An account with that email already exists. Try logging in instead.' });

  // Resolve referral: `ref` may be a referrer's username or numeric id.
  let referredBy = null;
  if (ref != null && String(ref).trim()) {
    const refStr = String(ref).trim();
    const referrer = /^\d+$/.test(refStr)
      ? db.prepare('SELECT id FROM users WHERE id = ?').get(Number(refStr))
      : db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(refStr);
    if (referrer) referredBy = referrer.id;
  }

  const hash = await bcrypt.hash(password, 10);
  const r = db.prepare(
    `INSERT INTO users (username, password_hash, email, referred_by, tos_accepted_at, tos_version)
     VALUES (?, ?, ?, ?, datetime('now'), ?)`
  ).run(username.trim(), hash, email.trim().toLowerCase(), referredBy, TOS_VERSION);
  const user = db.prepare('SELECT id, username, avatar_path, bio FROM users WHERE id = ?').get(r.lastInsertRowid);
  res.json({ token: signToken(user, false), user });
});

// Login (with per-account lockout: 5 failed attempts → 15 min)
router.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password, rememberMe } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username or email and password required' });
  const input = username.trim();
  const user = input.includes('@')
    ? db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(input)
    : db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(input);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(429).json({ error: 'Too many failed attempts — please try again later' });
  }

  // Allow legacy accounts without a password to set one on first login
  if (!user.password_hash) {
    const hash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?').run(hash, user.id);
    const safeUser = publicUser(user);
    return res.json({ token: signToken(safeUser, rememberMe), user: safeUser });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = (user.failed_attempts || 0) + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, user.id);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
  const safeUser = publicUser(user);
  res.json({ token: signToken(safeUser, rememberMe), user: safeUser });
});

// Token refresh — swap a still-valid token for a fresh one
router.post('/api/auth/refresh', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, avatar_path, bio FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ token: signToken(user, true), user });
});

// Change username — requires current password, issues a fresh token
router.post('/api/users/:id/change-username', requireAuth, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { newUsername, password } = req.body;
  if (!newUsername || !password) return res.status(400).json({ error: 'New username and current password required' });

  const trimmed = newUsername.trim();
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return res.status(400).json({ error: 'Username can only contain letters, numbers and underscores' });
  if (trimmed.length < 3)  return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (trimmed.length > 32) return res.status(400).json({ error: 'Username must be 32 characters or fewer' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (trimmed === user.username) return res.status(400).json({ error: 'New username is the same as your current one' });
  if (!user.password_hash) return res.status(400).json({ error: 'No password set on this account' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(trimmed, user.id);
  if (taken) return res.status(409).json({ error: 'Username already taken' });

  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(trimmed, user.id);
  const updatedUser = db.prepare('SELECT id, username, avatar_path, bio FROM users WHERE id = ?').get(user.id);
  res.json({ token: signToken(updatedUser, true), user: updatedUser });
});

// Change email — requires current password
router.post('/api/users/:id/change-email', requireAuth, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { newEmail, password } = req.body;
  if (!newEmail || !password) return res.status(400).json({ error: 'New email and current password required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return res.status(400).json({ error: 'Invalid email address' });
  if (isDisposableEmail(newEmail)) return res.status(400).json({ error: 'Disposable email addresses are not allowed' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.password_hash) return res.status(400).json({ error: 'No password set on this account' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail.trim().toLowerCase(), user.id);
  if (taken) return res.status(409).json({ error: 'Email already in use by another account' });

  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail.trim().toLowerCase(), user.id);
  res.json({ success: true });
});

// Change password — requires current password
router.post('/api/users/:id/change-password', requireAuth, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) return res.status(403).json({ error: 'Forbidden' });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });

  const pwErr = passwordError(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.password_hash) return res.status(400).json({ error: 'No password set on this account' });

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  if (currentPassword === newPassword) return res.status(400).json({ error: 'New password must be different from current password' });

  const hash = await bcrypt.hash(newPassword, 10);
  // Bump token_version so every OTHER device is logged out — the standard
  // "in case someone learned my password" safety step. Then hand this device a
  // fresh token (signed with the new version) so the user stays logged in here.
  db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1, failed_attempts = 0, locked_until = NULL WHERE id = ?').run(hash, user.id);
  const token = signToken(publicUser(user), false);
  res.json({ success: true, token });
});

// Log out of all devices — bump token_version so every JWT ever issued to this
// user (including the one making this request) is immediately rejected by auth.
router.post('/api/auth/logout-all', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

// Real-time availability checks (used by registration form)
router.get('/api/auth/check-username', authLimiter, (req, res) => {
  const { username } = req.query;
  if (!username || username.trim().length < 1) return res.json({ available: false });
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
  res.json({ available: !existing });
});

router.get('/api/auth/check-email', authLimiter, (req, res) => {
  const { email } = req.query;
  if (!email) return res.json({ available: false });
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  res.json({ available: !existing });
});

// Forgot password — generate a single-use, 1-hour token, email a reset link.
// Always returns success regardless of whether the email exists, so an attacker
// can't use this endpoint to discover which emails have accounts.
router.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (user) {
    // Invalidate any earlier outstanding tokens for this user, then mint one.
    db.prepare('UPDATE password_resets SET used_at = datetime(\'now\') WHERE user_id = ? AND used_at IS NULL').run(user.id);

    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
      .run(user.id, hashToken(token), expiresAt);

    const resetUrl = `${resetBaseUrl(req)}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      console.error('Failed to send reset email:', err.message);
      // Still return success — never reveal send failures to the client.
    }
  }

  res.json({ success: true });
});

// Validate a reset token without consuming it (lets the frontend show the form
// or an "expired link" message before the user types a new password).
router.get('/api/auth/reset-password/validate', (req, res) => {
  const { token } = req.query;
  if (!token) return res.json({ valid: false });
  const row = db.prepare(
    'SELECT id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime(\'now\')'
  ).get(hashToken(String(token)));
  res.json({ valid: !!row });
});

// Reset password — consume the token and set the new password.
router.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

  const pwErr = passwordError(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const row = db.prepare(
    'SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime(\'now\')'
  ).get(hashToken(String(token)));
  if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });

  const hash = await bcrypt.hash(newPassword, 10);
  // Set the password, mark the token used, and bump token_version so every
  // existing session (including any an attacker may hold) is logged out.
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1, failed_attempts = 0, locked_until = NULL WHERE id = ?')
      .run(hash, row.user_id);
    db.prepare('UPDATE password_resets SET used_at = datetime(\'now\') WHERE id = ?').run(row.id);
  });
  tx();

  res.json({ success: true });
});

module.exports = router;
