// ─── API smoke + security test ───────────────────────────────────────────────
// Run with the API up:  node smoke-test.js
// Signs a real token locally (same JWT_SECRET) so authed paths are testable.

require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('./db');

const BASE = 'http://localhost:3000';
// Sign test tokens with each user's current token_version (tv), so the tokens
// stay valid even after a "log out of all devices" bump in another test run.
const tvOf = (id) => db.prepare('SELECT token_version FROM users WHERE id = ?').get(id)?.token_version ?? 0;
const t1 = jwt.sign({ id: 1, username: 'ky_codez', tv: tvOf(1) }, process.env.JWT_SECRET, { expiresIn: '1h' });
const t2 = jwt.sign({ id: 2, username: 'testuser', tv: tvOf(2) }, process.env.JWT_SECRET, { expiresIn: '1h' });

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else      { fail++; console.log(`  FAIL  ${name} ${extra}`); }
};

const req = async (method, path, { token, body, raw } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !raw) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: raw ? body : body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
};

(async () => {
  console.log('— SECURITY —');

  // 1. User profile must not leak secrets
  let r = await req('GET', '/api/users/1');
  ok('profile leaks no password_hash', r.data && !('password_hash' in r.data));
  ok('profile leaks no email',         r.data && !('email' in r.data));
  ok('profile leaks no lockout cols',  r.data && !('failed_attempts' in r.data));

  // 2-7. Mutations without a token are rejected
  ok('DELETE wine w/o token → 401',  (await req('DELETE', '/api/wines/9')).status === 401);
  ok('PATCH wine w/o token → 401',   (await req('PATCH', '/api/wines/9')).status === 401);
  ok('bio w/o token → 401',          (await req('POST', '/api/users/1/bio', { body: { bio: 'hacked' } })).status === 401);
  ok('like w/o token → 401',         (await req('POST', '/api/wines/10/like')).status === 401);
  ok('follow w/o token → 401',       (await req('POST', '/api/users/2/follow')).status === 401);
  ok('comment w/o token → 401',      (await req('POST', '/api/wines/10/comments', { body: { text: 'x' } })).status === 401);
  ok('notifications w/o token → 401',(await req('GET', '/api/notifications')).status === 401);
  ok('cellar w/o token → 401',       (await req('GET', '/api/cellar')).status === 401);
  ok('swipe w/o token → 401',        (await req('POST', '/api/wines/10/swipe', { body: { direction: 'left' } })).status === 401);
  ok('create wine w/o token → 401',  (await req('POST', '/api/wines', { body: { name: 'hack' } })).status === 401);

  // 8. Ownership: user 1 cannot edit/delete user 2's wine (id 10)
  ok('DELETE other user wine → 403', (await req('DELETE', '/api/wines/10', { token: t1 })).status === 403);
  r = await req('PATCH', '/api/wines/10/privacy', { token: t1 });
  ok('toggle privacy on others → 403', r.status === 403);

  // 9. Private wine invisibility — force a known state first
  const db = require('./db');
  const before = db.prepare('SELECT is_private FROM wines WHERE id = 9').get().is_private;
  db.prepare('UPDATE wines SET is_private = 1 WHERE id = 9').run();      // force private (owner = 1)
  r = await req('GET', '/api/public/wines/9');
  ok('private wine hidden from share page', r.status === 404);
  r = await req('GET', '/api/wines');
  ok('private wine hidden from public feed', Array.isArray(r.data) && !r.data.some(w => w.id === 9));
  r = await req('GET', '/api/wines', { token: t2 });
  ok('private wine hidden from other users', Array.isArray(r.data) && !r.data.some(w => w.id === 9));
  r = await req('GET', '/api/wines', { token: t1 });
  ok('private wine visible to owner', Array.isArray(r.data) && r.data.some(w => w.id === 9));
  r = await req('GET', '/api/search?q=Single', { token: t2 });
  ok('private wine hidden from search', !r.data.posts.some(w => w.id === 9));
  db.prepare('UPDATE wines SET is_private = ? WHERE id = 9').run(before); // restore original state

  // 10. Acting-as-self enforcement: token identity wins over body user_id
  r = await req('POST', '/api/wines/10/like', { token: t1, body: { user_id: 999 } });
  ok('like acts as token user', r.status === 200);
  await req('POST', '/api/wines/10/like', { token: t1 }); // toggle back

  // 11. Login still works + wrong password rejected
  r = await req('POST', '/api/auth/login', { body: { username: 'ky_codez', password: 'wrong-pass-1!' } });
  ok('wrong password → 401', r.status === 401);

  console.log('— FUNCTIONAL —');
  ok('feed',        (await req('GET', '/api/wines')).status === 200);
  ok('trending',    (await req('GET', '/api/wines/trending')).status === 200);
  r = await req('GET', '/api/search?q=quartz');
  ok('search buckets', r.status === 200 && 'users' in r.data && 'posts' in r.data);
  ok('bottle page', (await req('GET', '/api/wines/bottle?name=' + encodeURIComponent('Single Ferment'))).status === 200);
  ok('winery page', (await req('GET', '/api/winery?name=' + encodeURIComponent('Quartz Reef'))).status === 200);
  ok('badges',      (await req('GET', '/api/users/1/badges')).status === 200);
  ok('taste match', (await req('GET', '/api/users/1/taste-match?withId=2')).status === 200);
  ok('discover',    (await req('GET', '/api/wines/discover', { token: t1 })).status === 200);
  ok('suggestions', (await req('GET', '/api/users/suggestions?currentUserId=1')).status === 200);
  ok('followers',   (await req('GET', '/api/users/1/followers')).status === 200);
  ok('activity',    (await req('GET', '/api/users/1/activity')).status === 200);
  ok('comments',    (await req('GET', '/api/wines/10/comments')).status === 200);
  ok('cellar (authed)', (await req('GET', '/api/cellar', { token: t1 })).status === 200);
  ok('notifications (authed)', (await req('GET', '/api/notifications', { token: t1 })).status === 200);
  ok('public share (public wine)', (await req('GET', '/api/public/wines/10')).status === 200);
  ok('autocomplete', (await req('GET', '/api/suggestions?field=winery&q=qu')).status === 200);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
