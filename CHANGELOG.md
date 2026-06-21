# Sipiary — Changelog

A running log of fixes and new features. Newest at the top. Times are TST (UTC+8).

> How these dates were determined: the app code isn't in git history yet, so
> exact per-feature commit times don't exist. Dates below come from the **Fly.io
> deploy log** (when each batch went live) cross-checked against source-file
> edit times. They're accurate to the day; the foundation work (v1–v8) predates
> detailed tracking, so it's given as a range. Full deploy log is at the bottom.

---

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
