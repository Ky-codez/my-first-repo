import { useState, useEffect, useRef } from 'react';

const API = '';

// A collectible holo trading card. Tilts in 3D toward the pointer and the
// rainbow sheen tracks the touch point — locked badges stay greyed flat.
// On phones with a gyroscope, earned cards also tilt with the device itself.
function HoloCard({ badge }) {
  const ref = useRef();
  const [glow, setGlow] = useState(null); // { rx, ry, mx, my } while hovered

  // Device-tilt mode (progressive enhancement — silently absent on desktop
  // and on iOS until the user grants motion permission elsewhere)
  useEffect(() => {
    if (!badge.earned || typeof DeviceOrientationEvent === 'undefined') return;
    let raf = null;
    const onTilt = (e) => {
      if (e.beta == null || e.gamma == null || raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        // beta: front-back tilt (-180..180), gamma: left-right (-90..90)
        const rx = Math.max(-14, Math.min(14, (e.beta - 40) * -0.45));
        const ry = Math.max(-14, Math.min(14, e.gamma * 0.45));
        setGlow({
          rx, ry,
          mx: 50 + ry * 3.2,
          my: 50 - rx * 3.2,
        });
      });
    };
    window.addEventListener('deviceorientation', onTilt);
    return () => { window.removeEventListener('deviceorientation', onTilt); if (raf) cancelAnimationFrame(raf); };
  }, [badge.earned]);

  const onMove = (e) => {
    if (!badge.earned) return;
    const r  = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   // 0..1
    const py = (e.clientY - r.top)  / r.height;
    setGlow({
      rx: (0.5 - py) * 18,        // tilt up/down
      ry: (px - 0.5) * 18,        // tilt left/right
      mx: px * 100, my: py * 100, // sheen position
    });
  };

  const style = glow
    ? {
        transform: `perspective(600px) rotateX(${glow.rx}deg) rotateY(${glow.ry}deg) scale(1.04)`,
        '--holo-x': `${glow.mx}%`,
        '--holo-y': `${glow.my}%`,
      }
    : undefined;

  return (
    <div
      ref={ref}
      className={`holo-card rarity-${badge.rarity}${badge.earned ? ' earned' : ' locked'}${glow ? ' tilting' : ''}`}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={() => setGlow(null)}
    >
      <div className="holo-sheen" />
      <span className="holo-rarity">{badge.rarity}</span>
      <span className="holo-emoji">{badge.earned ? badge.emoji : '🔒'}</span>
      <span className="holo-name">{badge.name}</span>
      <span className="holo-desc">{badge.desc}</span>
      {!badge.earned && badge.progress && (
        <div className="holo-progress">
          <div className="holo-progress-bar">
            <div className="holo-progress-fill" style={{ width: `${(badge.progress.now / badge.progress.goal) * 100}%` }} />
          </div>
          <span className="holo-progress-label">{badge.progress.now}/{badge.progress.goal}</span>
        </div>
      )}
    </div>
  );
}

export default function BadgeWall({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/users/${userId}/badges`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ badges: [], streak: 0, earnedCount: 0, totalCount: 0 }));
  }, [userId]);

  if (!data) return <p className="empty-state">Polishing your trophies…</p>;

  const earned = data.badges.filter(b => b.earned);
  const locked = data.badges.filter(b => !b.earned);

  return (
    <div className="badge-wall">
      <div className="bw-header">
        <span className="bw-count">{data.earnedCount}<span className="bw-count-total">/{data.totalCount}</span> collected</span>
        {data.streak > 0 && (
          <span className="bw-streak" title="Weeks in a row with at least one log">
            🔥 {data.streak}-week streak
          </span>
        )}
      </div>

      {earned.length > 0 && (
        <div className="bw-grid">
          {earned.map(b => <HoloCard key={b.id} badge={b} />)}
        </div>
      )}

      {locked.length > 0 && (
        <>
          <p className="bw-section-label">Still to collect</p>
          <div className="bw-grid">
            {locked.map(b => <HoloCard key={b.id} badge={b} />)}
          </div>
        </>
      )}
    </div>
  );
}
