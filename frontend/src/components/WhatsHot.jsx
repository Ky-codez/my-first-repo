import { useState, useEffect } from 'react';
import { Fire, Medal, Heart, Users, Plant, Star, ArrowLeft, Wine } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';
import LoginToEngageModal from './LoginToEngageModal';

const API = '';

// Gold / silver / bronze for the top three; muted number for the rest.
const RANK_COLOR = { 1: '#e0a020', 2: '#b8bcc4', 3: '#c17a3f' };

// "logged 200 times this week" — the community-favourite headline.
function logLabel(count, window) {
  const when = window === 'week' ? 'this week' : 'all-time';
  if (count === 1) return `Logged once ${when}`;
  return `Logged ${count}× ${when}`;
}

function HotRow({ bottle, window, onOpen }) {
  const { rank, name, winery, type, log_count, taster_count, avg_rating,
          like_count, image_path, is_biodynamic, is_organic } = bottle;
  const medalColor = RANK_COLOR[rank];
  const natural = !!(is_biodynamic || is_organic);

  return (
    <button className={`hot-row${rank <= 3 ? ' hot-row-top' : ''}`} onClick={() => onOpen(bottle)}>
      <span className="hot-rank" style={medalColor ? { color: medalColor } : undefined}>
        {medalColor ? <Medal size={22} weight="fill" color={medalColor} /> : <span className="hot-rank-num">{rank}</span>}
      </span>

      <div className="hot-thumb">
        {image_path
          ? <img src={`${API}${image_path}`} alt="" loading="lazy" decoding="async" />
          : <div className="hot-thumb-ph"><WineTypeIcon type={type} size={26} /></div>}
      </div>

      <div className="hot-info">
        <span className="hot-name">
          {name}
          {natural && <Plant size={13} weight="fill" color="#5bb463" style={{ marginLeft: 5, verticalAlign: '-0.1em' }} />}
        </span>
        {winery && <span className="hot-winery">{winery}</span>}
        <span className="hot-logline"><Fire size={12} weight="fill" style={{ verticalAlign: '-0.1em' }} /> {logLabel(log_count, window)}</span>
      </div>

      <div className="hot-stats">
        {avg_rating > 0 && (
          <span className="hot-stat"><Star size={12} weight="fill" color="#f0883e" /> {Number(avg_rating).toFixed(1)}</span>
        )}
        <span className="hot-stat"><Users size={12} weight="fill" /> {taster_count}</span>
        {like_count > 0 && <span className="hot-stat"><Heart size={12} weight="fill" color="#c0392b" /> {like_count}</span>}
      </div>
    </button>
  );
}

export default function WhatsHot({ currentUser, onWineClick, onLogin, onBack }) {
  const [data, setData] = useState(null);      // { window, bottles }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`${API}/api/wines/hot`)
      .then(r => { if (!r.ok) throw new Error('Could not load trending wines'); return r.json(); })
      .then(d => { if (live) { setData(d); setLoading(false); } })
      .catch(e => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, []);

  const openBottle = (bottle) => {
    // Logged-in visitors drill into the bottle page; logged-out visitors are
    // nudged to sign up (they can't open the in-app bottle view).
    if (currentUser && onWineClick) onWineClick({ name: bottle.name, winery: bottle.winery });
    else setShowLoginModal(true);
  };

  const window = data?.window || 'week';

  return (
    <div className="hot-page">
      <div className="hot-topbar">
        {onBack && (
          <button className="back-btn" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        )}
      </div>

      <div className="hot-header">
        <div className="hot-header-icon"><Fire size={30} weight="fill" color="#e0651d" /></div>
        <h1 className="hot-title">What's Hot</h1>
        <p className="hot-sub">
          {window === 'week'
            ? 'The wines the community is logging most this week.'
            : "The community's most-logged wines of all time."}
        </p>
      </div>

      {loading && <div className="hot-loading">Loading trending wines…</div>}
      {error && <div className="hot-empty">{error}</div>}

      {!loading && !error && data && (
        data.bottles.length === 0 ? (
          <div className="hot-empty"><Wine size={32} weight="light" /><p>No wines logged yet — be the first.</p></div>
        ) : (
          <div className="hot-list">
            {data.bottles.map(b => (
              <HotRow key={`${b.name}__${b.winery}`} bottle={b} window={window} onOpen={openBottle} />
            ))}
          </div>
        )
      )}

      {/* Sign-up nudge for logged-out visitors — the whole point of the public page */}
      {!currentUser && !loading && (
        <div className="hot-cta">
          <p className="hot-cta-title">Want to join in?</p>
          <p className="hot-cta-sub">Create a free account to log the wines you drink, rate your palate, and see where you land on the board.</p>
          <button className="hot-cta-btn" onClick={() => setShowLoginModal(true)}>Create your free account</button>
        </div>
      )}

      {showLoginModal && (
        <LoginToEngageModal
          onClose={() => setShowLoginModal(false)}
          onLogin={() => { setShowLoginModal(false); onLogin?.(); }}
        />
      )}
    </div>
  );
}
