/**
 * "Your Month in Wine" — a Spotify-Wrapped-style recap.
 * On-screen view + one-tap shareable image (html2canvas), reusing the same
 * share pattern as the wine cards. Pure data from /api/users/:id/recap.
 */
import { useEffect, useRef, useState } from 'react';
import { shareUrl } from '../utils/site.js';

const API = '';
const canNativeShare = () => !!navigator.share && !!navigator.canShare;

const PERIODS = [
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year'  },
  { key: 'all',   label: 'All time' },
];
const PERIOD_TITLE = { month: 'My Month in Wine', year: 'My Year in Wine', all: 'My Wine Journey' };

const TYPE_EMOJI = {
  Red: '🍷', White: '🥂', 'Rosé': '🌸', Sparkling: '✨',
  Champagne: '🍾', Dessert: '🍯', Fortified: '🏺', Spirit: '🥃',
};

function Stat({ emoji, label, value, sub }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #2a1418' }}>
      <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#9a7a7a', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
        <div style={{ fontSize: 16, color: '#f5ece6', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}{sub ? <span style={{ color: '#9a7a7a', fontWeight: 400 }}> {sub}</span> : null}
        </div>
      </div>
    </div>
  );
}

export default function RecapCard({ userId, username, onClose }) {
  const [period, setPeriod] = useState('month');
  const [data,   setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const cardRef = useRef();

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/users/${userId}/recap?period=${period}`)
      .then(r => { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [userId, period]);

  const handleShare = async () => {
    setStatus('rendering');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#0e0608', logging: false,
      });
      const filename = `${username || 'my'}_${period}_in_wine_sipiary.png`;
      if (canNativeShare()) {
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My wine recap — Sipiary', text: `${PERIOD_TITLE[period]} 🍷 ${shareUrl('')}` });
          setStatus('done'); setTimeout(() => setStatus(''), 2500); return;
        }
      }
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatus('done'); setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      if (err?.name === 'AbortError') { setStatus(''); return; }
      setStatus(''); alert('Could not export image. Try again.');
    }
  };

  const empty = data && data.total === 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal recap-modal">
        <div className="modal-header">
          <h2>🍷 Wine Recap</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="recap-period-toggle">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`recap-period-btn${period === p.key ? ' active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >{p.label}</button>
          ))}
        </div>

        {/* The captured card */}
        <div className="recap-card-wrap">
          <div ref={cardRef} style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #3d0f1a 0%, #0e0608 70%)',
            borderRadius: 16, padding: '26px 22px 20px', fontFamily: "'Georgia', serif", color: '#f5ece6',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: '#b8946e' }}>
                {username ? `@${username}` : 'Sipiary'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{PERIOD_TITLE[period]}</div>
            </div>

            {loading && <p style={{ textAlign: 'center', color: '#9a7a7a', padding: '2rem 0' }}>Pouring your recap…</p>}

            {!loading && !data && (
              <p style={{ textAlign: 'center', color: '#b8946e', padding: '1.5rem 0', fontFamily: 'system-ui, sans-serif' }}>
                Couldn't load your recap right now. Please try again.
              </p>
            )}

            {!loading && empty && (
              <p style={{ textAlign: 'center', color: '#b8946e', padding: '1.5rem 0', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
                🍇 No wines logged this {period === 'all' ? 'period' : period} yet.<br />Log a bottle to start your recap!
              </p>
            )}

            {!loading && !empty && data && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: '#e07060' }}>{data.total}</div>
                  <div style={{ fontSize: 13, color: '#9a7a7a', fontFamily: 'system-ui, sans-serif', letterSpacing: 0.5 }}>
                    bottle{data.total === 1 ? '' : 's'} logged
                  </div>
                </div>

                <div style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {data.topType && (
                    <Stat emoji={TYPE_EMOJI[data.topType.name] || '🍷'} label="Top style"
                          value={data.topType.name} sub={`· ${data.topType.count}×`} />
                  )}
                  {data.topGrape && <Stat emoji="🍇" label="Favourite grape" value={data.topGrape.name} sub={`· ${data.topGrape.count}×`} />}
                  {data.topRegion && <Stat emoji="📍" label="Top region" value={data.topRegion.name} />}
                  {data.avgRating != null && <Stat emoji="⭐" label="Average rating" value={`${data.avgRating} / 5`} />}
                  {data.uniqueGrapes > 0 && <Stat emoji="🗺️" label="Variety explored" value={`${data.uniqueGrapes} grape${data.uniqueGrapes === 1 ? '' : 's'} · ${data.uniqueRegions} region${data.uniqueRegions === 1 ? '' : 's'}`} />}
                  {data.greenPct > 0 && <Stat emoji="🌱" label="Organic / biodynamic" value={`${data.greenPct}%`} />}
                </div>

                {data.highestRated && (
                  <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 12, fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ fontSize: 11, color: '#9a7a7a', textTransform: 'uppercase', letterSpacing: 1 }}>⭐ Top pour</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f5ece6', marginTop: 2 }}>
                      {data.highestRated.name} <span style={{ color: '#e67e22' }}>{data.highestRated.rating}★</span>
                    </div>
                    {data.highestRated.winery && <div style={{ fontSize: 12, color: '#b8946e', fontStyle: 'italic' }}>{data.highestRated.winery}</div>}
                  </div>
                )}

                <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'system-ui, sans-serif', borderTop: '1px solid #1e1010', paddingTop: 10 }}>
                  <span style={{ fontSize: 13, color: '#c0392b', fontWeight: 700, letterSpacing: 2 }}>🍷 SIPIARY</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e8c8a0', background: 'rgba(192,57,43,0.18)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 20, padding: '3px 12px' }}>sipiary.app</span>
                </div>
              </>
            )}
          </div>
        </div>

        {!empty && (
          <div className="recap-actions">
            <button className="btn-primary" onClick={handleShare} disabled={status === 'rendering'}>
              {status === 'rendering' ? '⏳ Rendering…' : status === 'done' ? '✅ Shared!' : (canNativeShare() ? '📲 Share recap' : '📥 Download recap')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
