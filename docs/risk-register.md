# Sipiary — Risk Register (Day 1: systemic bug-hunt & invariant audit)

_Authored by a full read of `backend/` (all `routes/*.js`, `lib/*.js`, `db.js`). Every
CONFIRMED item was traced to the exact line and mechanism. PLAUSIBLE items are suspected
but not fully proven. Frontend was out of scope for this pass._

**The load-bearing invariant this system is supposed to hold:**

> A wine is **readable or actionable** by a viewer only when `visibleWines(viewerId)` /
> `visibleWinesNoJoin(viewerId)` passes — i.e. the wine is public **and** its author's
> account is public, OR the viewer owns it, OR the viewer is an approved follower.
> (`backend/lib/helpers.js:74`.)

The feed, search, `/bottle`, and `/winery` routes enforce this correctly. **The finding of
this pass is that a whole class of endpoints does not** — social actions, comment reads,
the activity feed, and the pairings endpoint all reach wines by raw id with no visibility
check. Wine ids are sequential and enumerable, so this is exploitable today with a `for`
loop.

---

## Severity legend
- **S1** — exploitable today, leaks private user content or spends real money. Fix before any growth push.
- **S2** — real exposure or the wall that breaks first at scale; fix in the next cycle.
- **S3** — latent/data-integrity; fix opportunistically or before the feature that trips it.

---

## S1 — Privacy-leak class: reads/writes that skip `visibleWines`

**One root cause, five call sites.** None of these gate on wine visibility; all take a raw
`wine_id` from the URL.

| # | Endpoint | File:line | Failure scenario |
|---|----------|-----------|------------------|
| 1 | `GET /api/wines/:id/comments` | `social.routes.js:67` | No auth, no gate. `GET /api/wines/5/comments` returns comments on a **private** wine to anyone, and confirms the wine exists. |
| 2 | `POST /api/wines/:id/like` \| `/repost` \| `/comments` | `social.routes.js:12,43,77` | Any logged-in user can like/repost/**comment on** a private wine or a wine from a private account they don't follow, by posting the id directly. Comment writes attacker-visible content onto a private wine and fires a notification to its owner. |
| 3 | `GET /api/users/:id/activity` | `users.routes.js:349` | Returns full wine rows (`w.*`: notes, photo, everything) for wines a user liked/reposted, with **no** `visibleWines`. A wine that was public when liked and later flipped private (or whose author went private) is now exposed to anyone viewing the liker's activity. |
| 4 | `GET /api/wines/:id/pairings` | `ai.routes.js:16` | No auth, no gate — fetches `SELECT *` of any wine incl. private (also an S1 cost issue, see below). |

- **Invariant violated:** the visibility rule above.
- **Blast radius:** every wine that is private now, or was interacted with while public and later made private, or whose author's account went private. Enumerable via sequential ids.
- **Why it happened:** the invariant is enforced query-by-query, by hand, in the *list* routes. There is no single choke point, so any endpoint that reaches a wine by id is one forgotten `AND ${visibleWines(...)}` away from a leak. The pattern *guarantees* recurrence.
- **Cheapest class-level fix (closes all 5, not one):** add one helper to `lib/helpers.js`:

  ```js
  // Throws/returns null unless the wine is visible to viewerId (verified id, 0 = logged out).
  function wineVisibleTo(wineId, viewerId) {
    return db.prepare(`
      SELECT w.id FROM wines w JOIN users u ON u.id = w.user_id
      WHERE w.id = ? AND ${visibleWines(viewerId)}
    `).get(wineId, ...);  // viewerId already inlined by visibleWines
  }
  ```

  Then call it at the top of each of the 5 handlers, using **`req.user?.id` (verified)**, never
  the query param. ~6 call sites, one helper, no schema change, fully reversible. For
  `/comments` read and `/pairings`, also decide the product rule: private-wine comments/pairings
  should 404 to non-viewers.

- **Regression guard (Day 2):** this class is invisible to code review because each route
  looks locally fine. The durable fix is a **contract test** that, for every wine-scoped
  endpoint, asserts a stranger gets 404/403 on a private wine. Without that test the class
  will regrow the next time an endpoint is added.

---

## S1 — Cost/abuse class: AI endpoints have no rate limit; one has no auth

- **`GET /api/wines/:id/pairings`** (`ai.routes.js:16`) has **no `requireAuth`** and calls the
  Anthropic API. Anyone, unauthenticated, can loop over ids and bill you per call.
- **`POST /api/translate`** (`ai.routes.js:86`) and **`POST /api/detect`** (`ai.routes.js:112`)
  require auth but have **no rate limiter** — one logged-in account can spend unbounded credits.
- The only rate limiters in the codebase (`authLimiter`, `registerLimiter`, `auth.js:68/78`)
  are wired **only** to the auth routes. Every other route, including all AI spend, is unthrottled.
- **Invariant violated:** external-cost endpoints must be authenticated and bounded.
- **Failure scenario:** `while true; do curl .../api/wines/$i/pairings; done` → your Anthropic bill.
  (Live today only if `ANTHROPIC_API_KEY` is set in prod; the endpoints no-op without it — so this
  is armed the moment you enable AI features.)
- **Cheapest fix:** add `requireAuth` to `/pairings`; add one shared `aiLimiter`
  (e.g. 20/hour/user, keyed on `req.user.id`) applied to all three AI routes. Small, reversible.

---

## S2 — Aggregate private-data leak: unauth endpoints computed over private wines

`getPalate(uid)` (`lib/tasteMatch.js:9`) and several routes aggregate over **all** of a user's
wines **including private ones**, and most require **no auth**:

- `GET /api/users/:id/taste-match` (`users.routes.js:266`)
- `GET /api/users/:id/recap` (`:215`)
- `GET /api/users/:id/badges` (`:189`)
- `GET /api/users/:id/taste-profile` (`:470`)
- palate-match `%` attached to follow suggestions (`:130`)

- **Invariant violated:** a **private** account is meant to be opaque to strangers. These let
  anyone derive a private user's palate, monthly recap, badge set, and taste-match — computed
  partly from wines that account has explicitly marked private.
- **Blast radius:** aggregate, not row-level (you get "top grape: Nebbiolo", not the wine), so
  lower severity than S1 — but it still punctures the private-account guarantee.
- **Cheapest fix:** give `getPalate` and the recap/badge queries an `includePrivate` flag,
  defaulting to **false**, set true only when `req.user?.id` owns the profile or is an approved
  follower. One flag threaded through ~5 queries.

---

## S2 — Architectural wall: synchronous SQLite on the event loop

This is **what breaks first at 100×**, and it's structural, not a bug.

- `better-sqlite3` is **synchronous** — every `db.prepare(...).get/all/run` blocks the Node
  event loop until it returns.
- `optionalAuth` runs on **every** request globally (`index.js:68`) and `verifyToken` does a
  `SELECT token_version` DB read per authed request (`auth.js:38`). So **every** API call pays at
  least one synchronous SQLite round-trip on the main thread before its handler even starts.
- The feed/card queries do **per-row correlated subqueries** (`helpers.js:26` — like_count,
  comment_count, repost_count, tagged_users, each a subquery per wine). One heavy feed request
  holds the single thread and **blocks every other concurrent request** on the machine.
- Everything runs on **one Fly machine, one SQLite file** (`db.js:5`).

- **Failure scenario:** a few hundred concurrent users during a launch spike → one slow feed
  query serializes the whole process → p99 latency cliff → timeouts cascade. You will not see
  this in dev with one user; it appears exactly when growth arrives.
- **This is a Day-2 blueprint item, not a one-line fix.** Directions to design there:
  cache the `token_version` lookup with a short TTL (kills the per-request auth read);
  put a query-time budget / slow-query log in front of `db`; move heavy aggregates
  (recap, taste-profile, suggestions) off the synchronous hot path or precompute them;
  use Litestream's replica for read-heavy endpoints; consider `better-sqlite3` worker
  offload for the few expensive queries. Keep SQLite — just stop doing unbounded synchronous
  work on the request thread.

---

## S3 — Data integrity: `wines.user_id` has no `ON DELETE CASCADE`

- `db.js:20` — `wines.user_id INTEGER NOT NULL REFERENCES users(id)` with **no cascade**, while
  `likes`, `comments`, `reposts`, `notifications`, `wine_tags`, `cellar`, `swipes` **do** cascade.
- **Failure scenario (already hit in practice):** deleting a user throws
  `FOREIGN KEY constraint failed` while their wines exist. There is no user-delete endpoint today,
  so no live bug — but **account deletion / GDPR erasure / admin cleanup is blocked**, and the
  inconsistency is a trap for whoever writes that endpoint (they'll assume cascade like every
  other table).
- **Fix (needs a migration — call-out per the brief):** SQLite can't `ALTER` a FK; closing this
  requires the 12-step table rebuild (`CREATE new`, copy, drop, rename) inside a transaction with
  `foreign_keys=OFF` for the swap. **Not reversible without care.** Cheaper interim: whenever the
  user-delete path is built, delete-wines-first inside a `db.transaction()`. Recommend doing the
  proper rebuild as part of the Day-2 migration-discipline work, not ad hoc.

---

## PLAUSIBLE — flag, not yet proven load-bearing

- **Rate limiters are in-memory** (`express-rate-limit` default MemoryStore). Correct on one
  machine; silently becomes **per-machine** (N× looser, and brute-force protection weakens) the
  moment you scale horizontally. Revisit in the scaling blueprint.
- **`token_version` read per request** (`auth.js:38`) is a deliberate correctness/latency
  trade (instant "log out everywhere"). It's a fixed synchronous-DB tax on every authed request;
  cache it if the auth read shows up in the slow path.

---

## CONFIRMED-safe (audited, not a risk) — recorded so the next audit can skip them

- **SQL injection: not a live risk.** Every value inlined into a query string is `Number(...)`
  -coerced first (`helpers.js` uid/viewerId, `users.routes.js:361` activity, `:113` suggestions
  excludeIds via `Number.isFinite`), and the one dynamic **column** name is whitelisted
  (`ai.routes.js:60`). All user *values* use bound `?` params. **Fragility:** this safety is by
  convention, not enforced — one future edit that interpolates a string param reopens it. A lint
  rule banning template literals inside `db.prepare` (except the vetted helpers) would make it
  permanent.
- **Secret-column leakage: safe.** `publicUser()` (`helpers.js:12`) whitelists fields; the two
  `SELECT * FROM users` reads (`users.routes.js:38,163`) always pass through it before serialising.
- **Admin endpoints: safe.** `/api/admin/*` gate on `req.user.username === ADMIN_USERNAME` and
  return aggregates only.
- **Ownership on mutations: consistently checked.** wine edit/delete/privacy, comment edit/delete,
  bio/avatar/privacy, taste-tags, follow-requests all verify `req.user.id` owns the target.

---

## Deferred (out of scope for this pass — do not fix here)

- Date-suffixed model id `claude-haiku-4-5-20251001` in `ai.routes.js` should be `claude-haiku-4-5`.
- No automated test suite (`backend` `test` script is a stub) — this is the Day-2 headline.
- `GROUP BY w.id` left in feed/card queries after the subquery refactor — now no-ops; harmless, tidy later.
- `/api/suggestions` autocomplete surfaces winery/region/grape strings from private wines (public facts; low concern).

---

## Recommended fix order (impact × cheapness)

1. **S1 privacy-leak class** — the `wineVisibleTo` helper + 5 call sites. Highest impact, ~1 hour, no migration.
2. **S1 AI cost** — auth on `/pairings` + one `aiLimiter`. ~30 min, arms-length before enabling AI.
3. **S2 aggregate leak** — `includePrivate` flag through the palate/recap/badge queries.
4. **S2 sync-SQLite wall** — design in the Day-2 backend blueprint (no rushed fix).
5. **S3 cascade gap** — fold the FK rebuild into the Day-2 migration work.

**Do not ship items 1–2 as a rushed patch without the regression test from Day 2** — the class
regrows silently otherwise. That dependency is why the plan sequences bug-hunt (today) → test
harness + migrations (Day 2) before the Events flagship (Day 3).
```
