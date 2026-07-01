# Sipiary — Changelog

A running log of fixes and new features. Newest at the top. Times are TST (UTC+8).

> How these dates were determined: the app code isn't in git history yet, so
> exact per-feature commit times don't exist. Dates below come from the **Fly.io
> deploy log** (when each batch went live) cross-checked against source-file
> edit times. They're accurate to the day; the foundation work (v1–v8) predates
> detailed tracking, so it's given as a range. Full deploy log is at the bottom.

---

## 2026-06-25 — Natural-wine filter

- **"Natural only" filter** on the feed — a one-tap chip that narrows Explore /
  Following to organic & biodynamic wines (uses the flags already captured at
  log time). Leans into the biodynamic niche. Works with infinite scroll.
- **Vibe Deck too** — a green "Natural" chip in the swipe deck filters the cards
  to organic/biodynamic wines, and stacks with the vibe filters.

## 2026-06-25 — CSS audit

- Audited the stylesheet for dead rules across all mobile screens (static
  reference scan + runtime coverage). Result: **1,029 of 1,043 classes are in
  use** — the CSS isn't bloated. Removed the 14 genuinely-dead classes (leftover
  from an old filter/facet panel). No bulk purge: the low runtime "coverage"
  number just reflects how much UI (modals, login, error states, other tabs)
  isn't on screen at once, not removable weight.

## 2026-06-25 — Performance pass III (rendering)

- **Off-screen cards skip rendering** — wine cards use `content-visibility`, so
  the browser only lays out and paints the cards actually on screen. Long feeds
  scroll noticeably smoother and use less memory.
- **Preconnect to the flag CDN** — country flags on wine cards start loading
  sooner (the connection is warmed in the page head).
- Confirmed the feed photo frame already reserves its space (4:5 aspect), so
  images don't cause layout shift as they load.

## 2026-06-25 — Performance pass II

- **gzip compression** on every text response (HTML, JS, CSS, API JSON). Fly's
  edge doesn't compress for us, so this roughly **3.5×** shrinks the JS bundle on
  the wire (~480KB → ~140KB) and slims every feed payload. Verified live.
- **Aggressive asset caching** — fingerprinted JS/CSS now cache for a year
  (immutable); index.html stays no-cache so deploys are picked up instantly.
  Repeat visits load almost entirely from cache.
- **Infinite-scroll feed** — the feed now loads 20 wines at a time and fetches
  more as you scroll, instead of pulling every wine in one request. (Your own
  journal and the Wine Passport still load in full.)
- **Snappier navigation** — the common views are prefetched while the app is
  idle, so the first tap into Profile / Discover / a wine page is instant.
- **Smoother long feeds** — wine cards are memoized, so interacting with one
  card no longer re-renders the whole list.

## 2026-06-24 — Performance pass

- **Database indexes** — added 15 indexes covering the hot paths (feed like/
  comment/repost counts, the follow graph, notifications, tags, cellar). Queries
  that were scanning whole tables per row are now index lookups; the feed and
  profile load much faster as data grows.
- **SQLite tuning** — enabled WAL journal mode (concurrent reads during writes)
  plus a larger page cache. (WAL is also what off-site Litestream backups need.)
- **Smaller initial download** — nearly every screen is now code-split, so the
  first load (login → feed) ships ~26% less JavaScript; other views fetch on
  first open and are cached after.

## 2026-06-24 — Notifications polish + speed & feel

- **Notifications:** tapping a person's **name** now opens their profile (not just
  the avatar). The always-visible trash icon is gone — **swipe a notification
  left** to reveal a Delete button instead.
- **Faster first load:** the Founder Dashboard, Wine Passport and the 3D Bottle
  lab are now code-split — they download only when opened, shrinking the initial
  app bundle.
- **Smoother feel:** removed the grey tap-flash on mobile, added subtle press
  feedback on buttons/cards, smooth scrolling, and a gentle fade as each screen
  loads (respects "reduce motion").

## 2026-06-24 — Wine Passport: region drill-down + tap-through

- **Drill into regions** — tapping a country now lists the wine regions you've
  logged there (e.g. United States → Napa Valley); tapping a region zooms the
  globe to it and shows just those wines. A breadcrumb hops back to the country.
- **Tiny wine card** — tapping a wine in the list pops a small preview card
  (photo, name, winery, rating); tap it to open the full review, or dismiss it.

## 2026-06-23 — Ambassador badge

- **Sipiary Ambassador** badge — a gold star in a wine-red seal shown next to a
  user's name on wine cards, profiles, comments, notifications and the
  "people you may know" cards. Distinct from a normal verified tick, on-brand.
- Admin-only (no self-serve): grant/revoke by username from the Founder
  Dashboard → Overview → Ambassadors, or `POST /api/admin/ambassador`.
- New `is_ambassador` flag on users; surfaced through every query that returns a
  username.

## 2026-06-23 — App-wide line icons (emoji sweep)

- Replaced emojis across the whole UI with consistent **Phosphor line icons**
  (the same set the bottom nav already used) for a more polished, professional
  look. Touched ~30 components: wine cards, the log form (types + mood faces),
  feed, discover/vibe deck, profile, notifications, menu, trending, taste match,
  winery & cellar pages, recap & share cards, onboarding, login/age-gate, etc.
- Added a shared `wineIcons.jsx` helper (one `WineTypeIcon` + `MoodIcon` source
  of truth) so wine-type and mood icons stay consistent everywhere.
- Intentionally **kept** the meaningful content emoji: the Lunar Calendar
  (moon phases & biodynamic day-types), the tasting-note aroma wheel, country
  flags, and earned-badge artwork.

## 2026-06-23 — Wine Passport: colourful map + tap-to-zoom

- The globe now **fills in the countries you've tasted from** in vivid colours
  (instead of a plain earth with a few dots); untasted countries stay muted.
- **Tap a country** → its whole shape highlights gold, the globe **zooms in**,
  and a card shows your wines from there (count, avg rating, tap a wine to open).
- Fixed mobile sizing so the page fits the screen (responsive globe height).
- Removed emojis from the Passport — now uses a line-art globe icon, in line
  with the move to consistent line icons app-wide (Lunar Calendar keeps its
  moon icons).

## 2026-06-22 — Wine Passport (3D globe)

- **Wine Passport** under your profile: a spinnable 3D globe (three.js) with
  continents, glowing pins on every country/region you've logged, tap-to-focus
  with a detail card, and stats (countries / regions / wines / % explored).
  three.js + map data are code-split so the main app stays light.
- Also shipped the 3D bottle prototype (Path B) at the hidden `/bottle-lab`.

## 2026-06-22 — Refinements

- Tagging now restricted to public users or private users who approved you
  (new `/api/users/taggable` endpoint + server-side enforcement).
- What's New redesigned as a two-column timeline (date | features); the detailed
  changelog now lives as a side page in the Founder Dashboard.
- Founder Dashboard split into Overview / Feedback / Changelog side pages;
  feedback supports swipe-to-triage (→ Unread/Flag, ← Done) with flag + status.

## 2026-06-22 — Community, feedback & what's-new

- **Tag who you tasted with** — search and tag other users when logging a wine
  (Instagram-style). Tagged friends appear on the wine card and get notified.
- **Send Feedback** — a bug/idea form in the menu; submissions land in the
  Founder Dashboard (no email needed).
- **What's New** — a friendly changelog page in the menu listing recent features.

## 2026-06-21 — Backend consolidation

- Removed dead code: `lib/sse.js` (superseded by `lib/ws.js` when notifications
  moved to WebSocket).
- Centralized the wine-visibility/privacy rule (was duplicated in 7 queries)
  into a single `visibleWines()` helper in `lib/helpers.js` — one source of
  truth for who can see which wines.
- Closed a privacy gap found during the review: the winery page's aggregate
  stats no longer expose a private account's wine names/counts to non-followers
  (new `visibleWinesNoJoin()` helper).
- Readability: collapsed the repeated `uid` / `viewerId` boilerplate into a
  documented `viewerIds(req)` helper, and expanded the wines.routes.js header so
  the privacy model (trusted vs. spoofable ids; one visibility helper) is clear
  to any developer opening the file.

## 2026-06-21 — Emoji audit (cleaner, more professional UI)

- Settings menu icons (Dashboard, Add to Home Screen, Change Username/Email/
  Password, Sign Out) and the Private-account toggle are now clean **line
  icons** instead of emoji.
- Removed decorative emoji from action-button labels (Share, Download, Copy
  Link, Upload Photo, Scan Label, Barcode, Auto-detect, Date Opened, Share to
  Stories, Your Wine Recap, Invite friends, Find this bottle, profile-photo
  banner) for a flatter, text-forward look.
- Kept the content/brand emoji that carry meaning: wine types, mood faces,
  moon phases & biodynamic day-types, tasting-note descriptors, badges.

## 2026-06-21 — Follow requests for private accounts

- **Instagram-style follow approval** — following a private account now sends a
  request ("Requested") instead of an instant follow. The owner sees incoming
  requests on their profile and can **Accept** or **Decline**. Once accepted,
  the follower can view the profile and all wine reviews; non-followers stay
  locked out everywhere (feed, search, trending, discovery, bottle & winery).
- New `follow_request` / `follow_accept` notifications.
- Replaced the lock **emoji** with a clean line-art lock icon (profile + menu).

## 2026-06-21 — Private accounts & positioning (deploy v18)

- **Private account** — a toggle in the menu (Settings → Private account). When
  on, your profile shows a "🔒 This account is private" shell to others and your
  wines are hidden from the main feed, following feed, search, trending,
  discover, bottle and winery pages. You always see your own; public share links
  you create still work.
- Added `POSITIONING.md` (competitive positioning) to the repo.

## 2026-06-21 — Mobile performance & polish (deploys v16–v17)

- **iOS input-zoom fix** (v17, 02:27) — text fields use 16px on phones so tapping
  search / the log form / comments no longer zooms the page in.
- **Photo optimization on upload** (v16, 01:54) — wine photos resized (≤1280px)
  and converted to WebP automatically (~2 MB → ~50 KB). Avatars → ≤256px (~8 KB).
- **Image caching** (v16) — uploaded images cache for 1 year instead of
  re-downloading on every navigation.
- **Lazy loading + async decode + fade-in** (v16) — off-screen images defer;
  photos fade in instead of popping.
- Added a one-time backfill script for shrinking pre-existing images
  (`backend/scripts/optimize-existing-images.js`).

## 2026-06-20 — Differentiation & refinement (deploys v13–v15)

- **Today's Moon card** on the feed (biodynamic day-type + moon phase), taps
  through to the Lunar Calendar.
- **Taste Match % on "People you may know"** cards (v15, 23:40).
- **Beginner onboarding persona picker** — sets the default logging mode.
- **Non-AI taste profile** — every user gets a data-driven palate summary.
- **Self-like fix** — can no longer like your own wine via the API.
- Fixed the notification list silently failing (missing auth header).

## 2026-06-20 — Accounts, real-time, discovery (deploys v9–v12)

- **Forgot-password / reset flow** (v12, ~17:49) — secure single-use 1-hour
  token; resets log you out of all devices. (Email code in place; needs an SMTP
  provider to actually send.)
- **Real-time notifications via WebSocket** (v11) — upgraded from SSE; auto-
  reconnects.
- **Barcode scan** when logging (v10) — auto-fills name/winery via Open Food Facts.
- **"Find this bottle"** affiliate button on wine pages (v9, ~17:03).

## 2026-06-15 to 06-17 — Foundation (deploys v1–v8)

> Initial launch and core feature set. These shipped across the first eight
> deploys; exact per-feature dates within this window aren't recorded.

- **Logging:** one-tap mood log, quick + full (WSET-style) tasting modes, pour
  rating, structured SAT notes, photo framing, label scanner (needs API key).
- **Social & discovery:** feed (Explore/Following), likes, comments, reposts,
  follow graph, Vibe Deck swipe discovery, recommendations, "what to drink
  tonight," trending, follow suggestions, Taste Match, bottle & winery pages,
  shareable cards + QR, "Your Month in Wine" recap.
- **Niche:** Biodynamic Lunar Calendar (real moon phases + day types).
- **Engagement:** badges + unlock celebration, weekly streak.
- **Platform & safety:** installable PWA, security hardening, rate limiting +
  disposable-email blocking, documented backend modules, regression test pass,
  Terms / Privacy / age gate.

---

## Pending / needs your action

- **Email sending** — add SMTP provider secrets (e.g. Resend) on Fly.
- **AI features / label scanner** — add `ANTHROPIC_API_KEY`.
- **Off-site backups (Litestream → Cloudflare R2)** — code ready; needs an R2
  bucket + credentials. *(Blocked on Cloudflare access.)*
- **Shrink existing photos** — run the backfill script *after* backups are on.
- **Wine-Searcher affiliate** — sign up to earn from the "Find this bottle" button.
- **Push to a new GitHub account** — code is only on this PC + Fly so far.

---

## Deploy history (source: `fly releases`)

| Version | When (TST) | Batch |
|---|---|---|
| v17 | 2026-06-21 02:27 | iOS input-zoom fix |
| v16 | 2026-06-21 01:54 | Mobile image optimization, caching, lazy-load |
| v15 | 2026-06-20 23:40 | Taste Match % on cards, moon phase on card |
| v13–v14 | 2026-06-20 18:12–18:19 | Self-like fix, Today's Moon, persona onboarding, taste profile |
| v12 | 2026-06-20 17:49 | Forgot-password / reset flow |
| v10–v11 | 2026-06-20 17:31–17:39 | WebSocket notifications, barcode scan |
| v9  | 2026-06-20 17:03 | "Find this bottle" button, label-scanner model update |
| v2–v8 | 2026-06-16 to 06-17 | Foundation iterations |
| v1  | 2026-06-15 18:38 | Initial deploy |
