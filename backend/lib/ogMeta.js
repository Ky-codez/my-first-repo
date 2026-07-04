// ─── Open Graph injection for public share links ─────────────────────────────
// The SPA fallback serves the same index.html for every route, so pasted links
// (WhatsApp, iMessage, Instagram DMs, story link stickers, forums) previewed as
// a bare domain. For the PUBLIC wine and profile URLs we inject og:/twitter:
// meta so the link unfurls with the wine's photo, name and rating.
//
// Only public data is ever exposed here: wine lookups require is_private = 0,
// mirroring routes/wines.routes.js's public share endpoints. Crawlers carry no
// auth, so there is no viewer context to consider.

const fs = require('fs');
const path = require('path');
const db = require('../db');

// Escape for HTML attribute context — wine names/notes are user input.
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// index.html is read once per process (a deploy restarts the process).
let indexCache = null;
const readIndex = (distDir) => {
  if (!indexCache) indexCache = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  return indexCache;
};

const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

const WINE_META_COLS = `
  w.name, w.winery, w.vintage, w.rating, w.notes, w.image_path, u.username
`;

// Resolve a request path to OG fields, or null for non-public/no-match paths.
function metaForPath(reqPath) {
  let m;

  // /@username/wine/:id (legacy) and /share/wine/:id
  m = reqPath.match(/^\/@[^/]+\/wine\/(\d+)$/) || reqPath.match(/^\/share\/wine\/(\d+)$/);
  if (m) {
    const w = db.prepare(`
      SELECT ${WINE_META_COLS} FROM wines w JOIN users u ON w.user_id = u.id
      WHERE w.id = ? AND w.is_private = 0
    `).get(m[1]);
    return w ? wineMeta(w) : null;
  }

  // /@username/<slug> — the pretty share link
  m = reqPath.match(/^\/@([^/]+)\/([^/]+)$/);
  if (m) {
    const w = db.prepare(`
      SELECT ${WINE_META_COLS} FROM wines w JOIN users u ON w.user_id = u.id
      WHERE u.username = ? COLLATE NOCASE AND w.slug = ? AND w.is_private = 0
    `).get(dec(m[1]), dec(m[2]));
    return w ? wineMeta(w) : null;
  }

  // /@username — public profile
  m = reqPath.match(/^\/@([^/]+)$/);
  if (m) {
    const u = db.prepare(`
      SELECT id, username, bio, avatar_path FROM users
      WHERE username = ? COLLATE NOCASE AND is_private = 0
    `).get(dec(m[1]));
    if (!u) return null;
    const count = db.prepare('SELECT COUNT(*) AS c FROM wines WHERE user_id = ? AND is_private = 0').get(u.id).c;
    return {
      title: `@${u.username} on Sipiary`,
      description: u.bio || `${count} wine${count === 1 ? '' : 's'} tasted — follow @${u.username}'s wine journey on Sipiary.`,
      image: u.avatar_path || null,
      card: u.avatar_path ? 'summary' : 'summary',
    };
  }

  return null;
}

function wineMeta(w) {
  const title = [w.name, w.winery, w.vintage].filter(Boolean).join(' · ');
  const stars = w.rating ? `${'★'.repeat(Math.round(w.rating))} ${Number(w.rating).toFixed(1)}` : null;
  const notes = w.notes && !w.notes.startsWith('{') ? w.notes.slice(0, 160) : null;
  return {
    title: `${title} — Sipiary`,
    description: [stars, notes || `Tasted by @${w.username} on Sipiary.`].filter(Boolean).join(' — '),
    image: w.image_path || null,
    card: w.image_path ? 'summary_large_image' : 'summary',
  };
}

// Serve index.html for an SPA route; inject OG meta when the path is a public
// share link. Falls back to the untouched file on any miss.
function sendIndexWithOg(req, res, distDir) {
  res.setHeader('Cache-Control', 'no-cache');
  let meta = null;
  try { meta = metaForPath(req.path); } catch { meta = null; }
  if (!meta) return res.sendFile(path.join(distDir, 'index.html'));

  const origin = `${req.protocol}://${req.get('host')}`;
  const tags = [
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Sipiary">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${esc(origin + req.path)}">`,
    meta.image ? `<meta property="og:image" content="${esc(origin + meta.image)}">` : null,
    `<meta name="twitter:card" content="${meta.card}">`,
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    meta.image ? `<meta name="twitter:image" content="${esc(origin + meta.image)}">` : null,
  ].filter(Boolean).join('\n    ');

  let html = readIndex(distDir);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`);
  // Crawlers take the FIRST og: tag they see — strip the static defaults from
  // index.html so the injected, wine-specific ones win.
  html = html.replace(/^\s*<meta (?:property="og:|name="twitter:)[^>]*>\s*\r?\n/gm, '');
  html = html.replace('</head>', `    ${tags}\n  </head>`);
  res.type('html').send(html);
}

module.exports = { sendIndexWithOg };
