import { useState, useEffect, useRef } from 'react';
import WineShareCard from './WineShareCard.jsx';
import { Sparkle, Trophy, Dna, Moon, FloppyDisk } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';

const API = '';

export default function PublicSharePage({ target, onJoin }) {
  const [wine,    setWine]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [dlStatus, setDlStatus] = useState('');
  const cardRef = useRef();

  // target is either { username, slug } (pretty link) or { id } (legacy link).
  const endpoint = target?.id
    ? `${API}/api/public/wines/${target.id}`
    : `${API}/api/public/wines/by/${encodeURIComponent(target.username)}/${encodeURIComponent(target.slug)}`;

  useEffect(() => {
    fetch(endpoint)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d => { setWine(d); setLoading(false); })
      .catch(() => { setWine(null); setLoading(false); });
  }, [endpoint]);

  const download = async () => {
    setDlStatus('rendering');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, allowTaint: true, scale: 2,
        backgroundColor: '#0e0608', logging: false,
      });
      const link = document.createElement('a');
      link.download = `${(wine.name || 'wine').replace(/\s+/g, '_')}_sipiary.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDlStatus('done');
    } catch { setDlStatus(''); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0608', color: '#aaa' }}>
      Loading…
    </div>
  );
  if (!wine) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0608', color: '#aaa' }}>
      Wine not found.
    </div>
  );

  return (
    <div className="public-share-page">
      <div className="psp-header">
        <span className="psp-logo"><WineTypeIcon type="Red" size={20} /> Sipiary</span>
        <button className="btn-primary psp-join-btn" onClick={onJoin}>Join free →</button>
      </div>
      <div className="psp-body">
        <p className="psp-byline">@{wine.username} logged this wine</p>
        <div className="psp-card-wrap">
          <WineShareCard wine={wine} forwardRef={cardRef} />
        </div>
        <div className="psp-actions">
          <button className="btn-primary" onClick={download} disabled={dlStatus === 'rendering'}>
            {dlStatus === 'rendering' ? 'Rendering…' : dlStatus === 'done' ? '✓ Downloaded!' : <><FloppyDisk size={15} weight="fill" style={{ verticalAlign: '-0.15em' }} /> Save Image</>}
          </button>
          <button className="btn-secondary" onClick={onJoin}>
            Join Sipiary to log your own wines
          </button>
        </div>

        {/* Why join — feature teasers for visitors */}
        <div className="psp-features">
          <p className="psp-features-title">Wine, but make it fun</p>
          <div className="psp-feature-grid">
            <div className="psp-feature">
              <span className="psp-feature-emoji"><Sparkle size={28} weight="fill" color="#b06fd6" /></span>
              <span className="psp-feature-name">Vibe Deck</span>
              <span className="psp-feature-desc">Swipe wines by mood — cozy night, date night, golden hour</span>
            </div>
            <div className="psp-feature">
              <span className="psp-feature-emoji"><Trophy size={28} weight="fill" color="#e0a020" /></span>
              <span className="psp-feature-name">Holo Badges</span>
              <span className="psp-feature-desc">Collect holographic cards for exploring styles & regions</span>
            </div>
            <div className="psp-feature">
              <span className="psp-feature-emoji"><Dna size={28} weight="fill" color="#4f86d6" /></span>
              <span className="psp-feature-name">Taste Match</span>
              <span className="psp-feature-desc">See how wine-compatible you are with friends</span>
            </div>
            <div className="psp-feature">
              <span className="psp-feature-emoji"><Moon size={28} weight="fill" color="#9a6fd6" /></span>
              <span className="psp-feature-name">Lunar Calendar</span>
              <span className="psp-feature-desc">Open bottles on the best biodynamic days</span>
            </div>
          </div>
          <button className="btn-primary psp-cta" onClick={onJoin}>Start your wine journal — free →</button>
        </div>
      </div>
    </div>
  );
}
