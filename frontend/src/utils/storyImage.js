// Story image renderer — draws a 1080×1920 (9:16) share image for a wine
// review, sized for Instagram/WhatsApp/Snapchat stories. Pure canvas (no
// html2canvas): crisper text, no CORS/layout quirks, and it runs in one pass.
//
// The story is the growth loop: the user posts the image to their story and
// pastes the review's public link as a link sticker (ShareModal copies it to
// the clipboard for them) — viewers tap through to the review on Sipiary.

const W = 1080;
const H = 1920;

const TYPE_COLOR = {
  Red: '#c0392b', White: '#c9a227', 'Rosé': '#e91e8c',
  Sparkling: '#42a5f5', Champagne: '#d4af37', Dessert: '#e67e22',
  Fortified: '#9b59b6', Spirit: '#8d6e63',
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

// ctx.roundRect isn't everywhere yet — draw the path by hand.
function roundedPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Greedy word-wrap; returns the lines actually drawn (≤ maxLines, last line
// ellipsised if the text was longer).
function wrapText(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const tryLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(tryLine).width <= maxWidth || !line) {
      line = tryLine;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if ((lines.length === maxLines && line && !lines.includes(line)) ) {
    // text overflowed — ellipsise the last kept line
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function drawStars(ctx, x, y, rating, size) {
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let cx = x;
  for (let n = 1; n <= 5; n++) {
    ctx.fillStyle = n <= rating ? '#e67e22' : 'rgba(255,255,255,0.16)';
    ctx.fillText('★', cx, y);
    cx += size * 1.18;
  }
  return cx - x;   // width drawn
}

/**
 * Render the story image. Returns the finished canvas.
 * @param {object} wine   — the wine row (name, winery, vintage, rating, notes,
 *                          image_path, type, username)
 * @param {string} qrDataUrl — pre-rendered QR code data URL (or null to skip)
 */
export async function renderStoryImage(wine, qrDataUrl) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const typeColor = TYPE_COLOR[wine.type] || '#c0392b';

  let photo = null;
  if (wine.image_path) {
    try { photo = await loadImage(wine.image_path); } catch { photo = null; }
  }

  // ── Background ─────────────────────────────────────────────────────────────
  if (photo) {
    // Blurred cover of the photo, darkened, so the story inherits the bottle's
    // own palette instead of a flat brand color.
    const cover = Math.max(W / photo.width, H / photo.height);
    const bw = photo.width * cover, bh = photo.height * cover;
    ctx.filter = 'blur(36px) brightness(0.34) saturate(1.35)';
    ctx.drawImage(photo, (W - bw) / 2 - 20, (H - bh) / 2 - 20, bw + 40, bh + 40);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a0a0e');
    g.addColorStop(0.6, '#0e0608');
    g.addColorStop(1, `${typeColor}30`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Vignette so text stays readable top and bottom.
  const vg = ctx.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(10,4,6,0.62)');
  vg.addColorStop(0.28, 'rgba(10,4,6,0.10)');
  vg.addColorStop(0.62, 'rgba(10,4,6,0.28)');
  vg.addColorStop(1, 'rgba(10,4,6,0.88)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Type-colored top strip — same accent the review cards carry.
  ctx.fillStyle = typeColor;
  ctx.fillRect(0, 0, W, 10);

  // ── Wordmark ───────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e07060';
  ctx.font = '800 44px system-ui, sans-serif';
  const brand = 'S I P I A R Y';
  ctx.fillText(brand, W / 2, 128);

  // ── Photo frame ────────────────────────────────────────────────────────────
  let cursorY;   // where the text block starts
  if (photo) {
    const boxW = 880, boxH = 950, boxX = (W - boxW) / 2, boxY = 200;
    const fit = Math.min(boxW / photo.width, boxH / photo.height);
    const pw = photo.width * fit, ph = photo.height * fit;
    const px = (W - pw) / 2, py = boxY + (boxH - ph) / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 18;
    roundedPath(ctx, px, py, pw, ph, 30);
    ctx.fillStyle = '#0e0608';
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedPath(ctx, px, py, pw, ph, 30);
    ctx.clip();
    ctx.drawImage(photo, px, py, pw, ph);
    ctx.restore();

    cursorY = py + ph + 96;
  } else {
    // No photo → typographic layout; start lower so the block sits in the
    // vertical middle instead of leaving a hole above the footer.
    cursorY = 780;
  }

  // ── Wine name ──────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  const nameSize = (wine.name || '').length > 22 ? 68 : 84;
  ctx.font = `800 ${nameSize}px Georgia, 'Times New Roman', serif`;
  const nameLines = wrapText(ctx, wine.name || 'A wine', 920, 2);
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, cursorY);
    cursorY += nameSize * 1.12;
  }
  cursorY += 8;

  // ── Winery · vintage ───────────────────────────────────────────────────────
  const wineryVintage = [wine.winery, wine.vintage].filter(Boolean).join(' · ');
  if (wineryVintage) {
    ctx.fillStyle = '#c9a887';
    ctx.font = 'italic 42px Georgia, serif';
    ctx.fillText(wineryVintage, W / 2, cursorY);
    cursorY += 76;
  } else {
    cursorY += 12;
  }

  // ── Stars (centered) ───────────────────────────────────────────────────────
  if (wine.rating) {
    const starSize = 60;
    const starsW = starSize * 1.18 * 5 - starSize * 0.18;
    drawStars(ctx, (W - starsW) / 2, cursorY, wine.rating, starSize);
    cursorY += 96;
  }

  // ── Note excerpt ───────────────────────────────────────────────────────────
  const rawNotes = wine.notes && !wine.notes.startsWith('{') ? wine.notes.trim() : null;
  if (rawNotes) {
    ctx.fillStyle = '#e6d2c8';
    ctx.font = 'italic 40px Georgia, serif';
    const noteLines = wrapText(ctx, `“${rawNotes}”`, 860, 3);
    for (const line of noteLines) {
      ctx.fillText(line, W / 2, cursorY);
      cursorY += 58;
    }
  }

  // ── Footer: handle + link + QR ─────────────────────────────────────────────
  const footY = H - 118;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 42px system-ui, sans-serif';
  const handle = wine.username ? `@${wine.username}` : '';
  ctx.fillText(handle, 84, footY);
  ctx.fillStyle = '#c9a887';
  ctx.font = '500 34px system-ui, sans-serif';
  ctx.fillText('tasting on sipiary.app', 84, footY + 52);

  if (qrDataUrl) {
    try {
      const qr = await loadImage(qrDataUrl);
      const qs = 168;
      const qx = W - 84 - qs, qy = H - 100 - qs;
      roundedPath(ctx, qx - 10, qy - 10, qs + 20, qs + 20, 20);
      ctx.fillStyle = '#f5ece6';
      ctx.fill();
      ctx.drawImage(qr, qx, qy, qs, qs);
    } catch { /* QR is a nice-to-have — never fail the render over it */ }
  }

  return canvas;
}
