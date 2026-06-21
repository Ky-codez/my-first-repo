# Deploying Sipiary

Sipiary runs as a **single Node service**: the Express backend serves the built
React frontend *and* the `/api` routes from one origin. SQLite (the database
lives in `backend/sipiary.db`) and uploaded images sit on the local disk
next to it — so any host you pick must give the process a **persistent disk**
and stay **always-on**. (This rules out Vercel/Netlify serverless, which wipe
the filesystem between requests.)

---

## 1. Build it

```bash
cd frontend
npm install
npm run build        # outputs frontend/dist
cd ../backend
npm install
```

Once `frontend/dist` exists, the backend auto-detects it and serves it.

## 2. Run it as one service

```bash
cd backend
PORT=3000 node index.js
```

Open http://localhost:3000 — you'll get the full app from a single port, no
Vite, no proxy. This is exactly how production runs.

---

## 3. Quick public test (free, ~2 min) — for sending invite links

Use a tunnel to expose your local `:3000` to the internet. No deploy, no
account hassle, no cost. Great for testing with a handful of friends.

**Cloudflare Tunnel** (recommended — no signup for a quick tunnel):

```bash
# install once:  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://localhost:3000
```

It prints a public `https://<random>.trycloudflare.com` URL. Anyone can open it.

Because share/referral links follow `window.location.origin`, invite links
generated *through the tunnel* automatically point back at the tunnel URL — so
the **Invite friends** button and share cards Just Work for testers. When you
close the terminal, the tunnel (and the public URL) dies.

> ngrok works the same way: `ngrok http 3000`.

---

## 4. Permanent hosting (~$0–6/mo)

When you're ready for an always-on site, pick a host with a persistent volume:

| Host | Cost | Notes |
|------|------|-------|
| Fly.io | ~free–$5/mo | Persistent volume, native Node — best fit |
| Render | ~$7/mo | Simple; persistent disk is the paid part |
| Hetzner / DigitalOcean VPS | €4–6/mo | A real Linux box; most control |

### Fly.io sketch

```bash
fly launch            # detects Node; creates fly.toml
fly volumes create data --size 1      # 1 GB persistent disk
# mount it at /data and point the DB + uploads there, then:
fly secrets set JWT_SECRET=<random> ANTHROPIC_API_KEY=<key> VITE_SITE_URL=https://sipiary.app
fly deploy
```

> Mount the volume and move `sipiary.db` + `uploads/` onto it, or a redeploy
> wipes user data. This is the one critical step for an SQLite app.

---

## 5. Production environment variables

| Var | Purpose |
|-----|---------|
| `PORT` | Port to listen on (host usually sets this) |
| `JWT_SECRET` | **Required** — strong random string for signing login tokens |
| `ANTHROPIC_API_KEY` | For the label scanner + AI taste features |
| `ALLOWED_ORIGIN` | Only if frontend is served from a *different* origin (not needed for the single-service setup) |
| `VITE_SITE_URL` | Set at **build time** to your real domain (e.g. `https://sipiary.app`) once you own it, to force all share links onto it |

---

## Going live on sipiary.app

1. Buy `sipiary.app` (and grab `sipiary.com` to redirect) at a registrar —
   Cloudflare Registrar sells at wholesale.
2. Point its DNS at your host (Fly/Render/VPS give you the target).
3. Rebuild the frontend with `VITE_SITE_URL=https://sipiary.app` so every share
   card and invite link wears the real domain.
