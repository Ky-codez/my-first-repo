# Sipiary Backend

Express + SQLite (better-sqlite3) API for the Sipiary wine journal & social app.

## Run it

```bash
npm install
node index.js          # API on http://localhost:3000
node smoke-test.js     # 38 security + functional checks (API must be running)
```

Required `.env` (in this folder):

```
JWT_SECRET=<long random string — the server refuses to boot without it>
ANTHROPIC_API_KEY=<optional — enables label detection, pairings, taste profiles>
ALLOWED_ORIGIN=<optional — production CORS, e.g. https://sipiary.app>
PORT=<optional — defaults to 3000>
```

## Folder map

| File | What lives there |
|---|---|
| `index.js` | Composition root only — middleware + route mounting. ~90 lines. |
| `db.js` | Schema + migrations. Add new tables/columns at the BOTTOM as `try { ALTER TABLE … } catch {}` so existing databases upgrade in place. |
| `lib/auth.js` | JWT signing, `requireAuth` / `optionalAuth` middleware, rate limiters. |
| `lib/upload.js` | Image uploads. Type + size validated — only real images accepted. |
| `lib/sse.js` | Real-time notification push (`ssePush(userId, event, data)`). |
| `lib/badges.js` | Badge definitions. Add a badge = add an entry. |
| `lib/helpers.js` | `publicUser()` whitelist + shared wine-card SQL. |
| `lib/disposable-emails.js` | Throwaway email domains blocked at registration. |
| `routes/auth.routes.js` | Register, login, refresh, password-protected account changes. |
| `routes/users.routes.js` | Profiles, follow graph, suggestions, badges, taste data. |
| `routes/wines.routes.js` | Feed, search, trending, bottle/winery pages, Vibe Deck, wine CRUD. |
| `routes/social.routes.js` | Likes, reposts, comments. |
| `routes/notifications.routes.js` | Notification list + SSE stream. |
| `routes/cellar.routes.js` | Wishlist / cellar (fully private per user). |
| `routes/ai.routes.js` | Anthropic-powered features + autocomplete. |
| `smoke-test.js` | Run after any change. Red = don't ship. |
| `index.legacy.js.bak` | The old single-file backend, kept for reference. Safe to delete. |

## How to add an endpoint

1. Pick the route file that matches the domain (or create one and mount it in `index.js`).
2. Reads that anyone may see: plain handler. Reads that include private data: scope by `req.user?.id`.
3. **Anything that writes: add `requireAuth` and act as `req.user.id`.** Never read the acting user from the request body — that's how account takeover bugs happen.
4. SQL: always use `?` placeholders for values. The only inlined values allowed are numbers passed through `Number(x) || 0` (see `lib/helpers.js`).
5. Returning a user row? Pass it through `publicUser()` — raw rows contain password hashes.
6. Add a line to `smoke-test.js` and run it.

## Security model (read before editing)

- **Identity = JWT only.** The frontend attaches `Authorization: Bearer <token>` to every `/api` call automatically (see `frontend/src/main.jsx`). The server decodes it on every request (`optionalAuth`); protected routes hard-require it (`requireAuth`).
- **Ownership checks** on every mutation: wines, comments, cellar items and notifications can only be changed by their owner (403 otherwise).
- **Private wines** (`is_private = 1`) are filtered out of every public surface — feed, search, trending, winery, bottle and share pages. Visibility is decided by the *verified token*, never by a query parameter.
- **Passwords**: bcrypt-hashed, never returned by any endpoint. 5 failed logins → 15-minute account lockout. IP rate limits on login (10/15 min) and registration (3/hour).
- **Uploads**: images only (jpeg/png/webp/gif/heic), 5–10 MB caps. Prevents stored-XSS via uploaded HTML/SVG.
- **Headers**: helmet (nosniff, frame protection). CORS locked to `ALLOWED_ORIGIN` in production.

## Production deployment checklist

- [ ] Strong unique `JWT_SECRET` (32+ random chars, not the dev one)
- [ ] `ALLOWED_ORIGIN=https://yourdomain.com`
- [ ] Serve over HTTPS only (terminate TLS at nginx/Caddy/host platform)
- [ ] `node smoke-test.js` is green
- [ ] Back up `sipiary.db` (it's the whole database, one file)
