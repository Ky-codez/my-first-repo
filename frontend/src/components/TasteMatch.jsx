import { useState, useEffect, useRef } from 'react';

const API = '';

// Animated compatibility ring — counts up to the score on reveal
function ScoreRing({ score }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / 1100, 1);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="tm-ring-wrap">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <defs>
          <linearGradient id="tm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c0392b" />
            <stop offset="100%" stopColor="#8e44ad" />
          </linearGradient>
        </defs>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--bg-surface)" strokeWidth="9" />
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke="url(#tm-grad)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      <div className="tm-ring-label">
        <span className="tm-score">{shown}%</span>
        <span className="tm-score-sub">match</span>
      </div>
    </div>
  );
}

export default function TasteMatch({ currentUser, otherUser }) {
  const [state, setState] = useState('idle'); // idle | loading | done
  const [match, setMatch] = useState(null);

  const run = () => {
    setState('loading');
    fetch(`${API}/api/users/${currentUser.id}/taste-match?withId=${otherUser.id}`)
      .then(r => r.json())
      .then(d => { setMatch(d); setState('done'); })
      .catch(() => setState('idle'));
  };

  const verdict = (s) =>
    s >= 85 ? 'Practically wine soulmates 💜' :
    s >= 65 ? 'You should split a bottle 🍷'  :
    s >= 40 ? 'Different lanes, same road 🛣️' :
              'Opposites — trade recommendations! 🔄';

  if (state === 'idle') {
    return (
      <button className="tm-trigger" onClick={run}>
        🧬 Taste Match with @{otherUser.username}
      </button>
    );
  }
  if (state === 'loading') {
    return <div className="tm-card tm-loading">Comparing palates… 🍇</div>;
  }
  if (match.score === null) {
    return <div className="tm-card tm-loading">{match.reason}</div>;
  }

  return (
    <div className="tm-card">
      <ScoreRing score={match.score} />
      <p className="tm-verdict">{verdict(match.score)}</p>
      <div className="tm-breakdown">
        {match.sharedTypes.length   > 0 && (
          <div className="tm-row">
            <span className="tm-row-label">Styles you both love</span>
            <div className="tm-chips">{match.sharedTypes.map(t => <span key={t} className="tm-chip">🍷 {t}</span>)}</div>
          </div>
        )}
        {match.sharedGrapes.length  > 0 && (
          <div className="tm-row">
            <span className="tm-row-label">Grapes in common</span>
            <div className="tm-chips">{match.sharedGrapes.map(g => <span key={g} className="tm-chip">🍇 {g}</span>)}</div>
          </div>
        )}
        {match.sharedRegions.length > 0 && (
          <div className="tm-row">
            <span className="tm-row-label">Regions in common</span>
            <div className="tm-chips">{match.sharedRegions.map(r => <span key={r} className="tm-chip">📍 {r}</span>)}</div>
          </div>
        )}
        <p className="tm-rating-style">⭐ {match.ratingStyle}</p>
      </div>
    </div>
  );
}
