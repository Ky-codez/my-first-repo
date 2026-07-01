/**
 * WineShareCard — photo section drawn on a real <canvas> so html2canvas
 * captures it pixel-perfectly with no seams, stretching or object-fit issues.
 */
import { useEffect, useRef, useState } from 'react';
import { regionFlag, cleanLocation } from '../utils/regionFlags.js';
import { wineShareUrl } from '../utils/site.js';
import { Plant, Leaf } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';

const API = '';

const TYPE_COLOR = {
  Red: '#c0392b', White: '#c9a227', 'Rosé': '#e91e8c',
  Sparkling: '#42a5f5', Champagne: '#d4af37', Dessert: '#e67e22',
  Fortified: '#9b59b6', Spirit: '#8d6e63',
};

// Canvas is 2x the display size for crispness.
const CANVAS_W = 840;
const CANVAS_H = 960;

function PhotoCanvas({ src, username }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!src || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = CANVAS_W;
    const H = CANVAS_H;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, W, H);

      // Blurred cover background
      const coverScale = Math.max(W / img.width, H / img.height);
      const bw = img.width  * coverScale;
      const bh = img.height * coverScale;
      const bx = (W - bw) / 2;
      const by = (H - bh) / 2;

      const off  = document.createElement('canvas');
      off.width  = W;
      off.height = H;
      const octx = off.getContext('2d');
      octx.filter = 'blur(22px) brightness(0.38) saturate(1.4)';
      octx.drawImage(img, bx - 14, by - 14, bw + 28, bh + 28);
      ctx.drawImage(off, 0, 0);

      // Main image: contain — preserves natural proportions
      const containScale = Math.min(W / img.width, H / img.height);
      const mw = img.width  * containScale;
      const mh = img.height * containScale;
      const mx = (W - mw) / 2;
      const my = (H - mh) / 2;
      ctx.drawImage(img, mx, my, mw, mh);

      // Bottom gradient fade
      const grad = ctx.createLinearGradient(0, H - 100, 0, H);
      grad.addColorStop(0, 'rgba(14,6,8,0)');
      grad.addColorStop(1, 'rgba(14,6,8,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - 100, W, 100);

      // Watermarks
      const pad = 28;
      ctx.textBaseline  = 'bottom';
      ctx.shadowColor   = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur    = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle     = 'rgba(255,255,255,0.55)';

      // Bottom-left: reviewer · app name
      ctx.textAlign = 'left';
      ctx.font = '500 24px system-ui, sans-serif';
      const x = W * 0.07 + 12;
      const maxW = W - x - pad;
      if (username) {
        const combined = `reviewed by @${username}  ·  sipiary.app`;
        if (ctx.measureText(combined).width <= maxW) {
          ctx.fillText(combined, x, H - pad);
        } else {
          ctx.fillText(`reviewed by @${username}`, x, H - pad - 32);
          ctx.font = '700 24px system-ui, sans-serif';
          ctx.fillText('sipiary.app', x, H - pad);
        }
      } else {
        ctx.font = '700 24px system-ui, sans-serif';
        ctx.fillText('sipiary.app', x, H - pad);
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur  = 0;
    };
    img.src = src;
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
    />
  );
}

function Stars({ value }) {
  return (
    <span>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= value ? '#e67e22' : '#3d2010', fontSize: 18 }}>&#9733;</span>
      ))}
    </span>
  );
}

export default function WineShareCard({ wine, forwardRef }) {
  const rf         = wine.location ? regionFlag(wine.location) : null;
  const displayLoc = wine.location ? (rf ? cleanLocation(wine.location) : wine.location) : null;
  const typeColor  = TYPE_COLOR[wine.type] || '#c0392b';
  const imageUrl   = wine.image_path ? `${API}${wine.image_path}` : null;
  const grapes     = wine.grapes
    ? wine.grapes.split(/[,/]/).map(g => g.trim()).filter(Boolean).slice(0, 4)
    : [];

  const wineryVintage = [wine.winery, wine.vintage].filter(Boolean).join(' · ');
  const rawNotes = wine.notes && !wine.notes.startsWith('{') ? wine.notes : null;
  const truncatedNotes = rawNotes
    ? rawNotes.slice(0, 140) + (rawNotes.length > 140 ? '…' : '')
    : null;

  // QR → the wine's public page (carries the author's handle for tap-through)
  const [qr, setQr] = useState(null);
  useEffect(() => {
    if (!wine.id) return;
    const url = wineShareUrl(wine);
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, { margin: 1, width: 180, color: { dark: '#0e0608', light: '#f5ece6' } }))
      .then(setQr)
      .catch(() => {});
  }, [wine.id, wine.username, wine.slug]);

  return (
    <div
      ref={forwardRef}
      style={{
        width: '100%',
        background: `linear-gradient(165deg, #0e0608 0%, #0e0608 56%, ${typeColor}22 100%)`,
        borderRadius: 16,
        overflow: 'hidden',
        borderTop: `4px solid ${typeColor}`,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: '#f5ece6',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
      }}
    >
      {/* Photo — drawn on canvas */}
      <div style={{ position: 'relative' }}>
        {imageUrl
          ? <PhotoCanvas src={imageUrl} username={wine.username} />
          : (
            <div style={{
              height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${typeColor}18`,
            }}>
              <WineTypeIcon type={wine.type} size={72} />
            </div>
          )
        }
      </div>

      {/* Info */}
      <div style={{ padding: '18px 22px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            background: `${typeColor}33`, border: `1.5px solid ${typeColor}99`,
            borderRadius: 30, padding: '4px 12px',
            color: typeColor, fontSize: 12,
            fontFamily: 'system-ui, sans-serif', fontWeight: 700, letterSpacing: 0.5,
          }}>
            <WineTypeIcon type={wine.type} size={13} color={typeColor} /> {wine.type}
          </div>
        </div>

        <div style={{ fontSize: wine.name?.length > 24 ? 26 : 32, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.3, color: '#fff' }}>
          {wine.name}
        </div>

        {wineryVintage && (
          <div style={{ fontSize: 14, color: '#b8946e', fontStyle: 'italic', fontFamily: 'system-ui, sans-serif' }}>
            {wineryVintage}
          </div>
        )}

        <Stars value={wine.rating || 0} />

        <div style={{ height: 1, background: `linear-gradient(to right, ${typeColor}55, transparent)` }} />

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'system-ui, sans-serif' }}>
          {displayLoc && (
            <div>
              <div style={{ fontSize: 10, color: '#6a5a5a', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>Region</div>
              <div style={{ fontSize: 14, color: '#ddd', display: 'flex', alignItems: 'center', gap: 6 }}>
                {displayLoc}
                {rf && (
                  <img
                    src={`https://flagcdn.com/w40/${rf.iso.replace(/^gb-.+/, 'gb')}.png`}
                    alt={rf.country}
                    crossOrigin="anonymous"
                    style={{ width: 20, height: 14, borderRadius: 2, objectFit: 'cover', display: 'inline-block', verticalAlign: 'middle' }}
                  />
                )}
              </div>
            </div>
          )}
          {grapes.length > 0 ? (
            <div>
              <div style={{ fontSize: 10, color: '#6a5a5a', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>Grapes</div>
              <div style={{ fontSize: 14, color: '#ddd' }}>{grapes.join(', ')}</div>
            </div>
          ) : null}
        </div>

        {(!!wine.is_biodynamic || !!wine.is_organic) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: 'system-ui, sans-serif' }}>
            {!!wine.is_biodynamic && (
              <span style={{ background: '#1a3d1a55', border: '1px solid #4caf5066', color: '#81c784', borderRadius: 30, padding: '3px 12px', fontSize: 12 }}>
                <Plant size={12} weight="fill" style={{ verticalAlign: '-0.12em' }} /> Biodynamic
              </span>
            )}
            {!!wine.is_organic && (
              <span style={{ background: '#1a2f4a55', border: '1px solid #42a5f566', color: '#7ec8f7', borderRadius: 30, padding: '3px 12px', fontSize: 12 }}>
                <Leaf size={12} weight="fill" style={{ verticalAlign: '-0.12em' }} /> Organic
              </span>
            )}
          </div>
        )}

        {truncatedNotes && (
          <div style={{
            fontSize: 15, color: '#d8c8c0', fontStyle: 'italic', lineHeight: 1.5,
            fontFamily: 'system-ui, sans-serif',
            borderLeft: `3px solid ${typeColor}`, paddingLeft: 14, margin: '2px 0',
          }}>
            &ldquo;{truncatedNotes}&rdquo;
          </div>
        )}

        <div style={{ paddingTop: 12, marginTop: 2, borderTop: '1px solid #2a1418', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 12 }}>
          {qr && (
            <img src={qr} alt="" crossOrigin="anonymous"
                 style={{ width: 62, height: 62, borderRadius: 8, flexShrink: 0, background: '#f5ece6', padding: 3 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, color: '#e07060', fontWeight: 800, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 5 }}><WineTypeIcon type="Red" size={15} /> SIPIARY</div>
            <div style={{ fontSize: 12, color: '#9a7a7a', marginTop: 2, lineHeight: 1.4 }}>
              Scan to taste it — track your wines, your way
            </div>
            <div style={{ fontSize: 12, color: '#e8c8a0', fontWeight: 700, marginTop: 1 }}>sipiary.app</div>
          </div>
        </div>
      </div>
    </div>
  );
}
