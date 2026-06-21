import { useState, useRef, useEffect } from 'react';

// Liquid colors per wine type — the glass pours what you're rating
const LIQUID = {
  Red:       ['#722f37', '#4a1218'],
  White:     ['#f5d76e', '#d4af37'],
  'Rosé':    ['#f4a0b5', '#e91e8c'],
  Sparkling: ['#f7e7ce', '#e8c87a'],
  Champagne: ['#f7e7ce', '#d4af37'],
  Dessert:   ['#e8a33d', '#b87333'],
  Fortified: ['#6b3fa0', '#3d2266'],
  Spirit:    ['#e0a458', '#8d5524'],
};

// Hold-to-pour rating. Press and hold the glass: wine pours in and the score
// climbs 1.0 → 5.0. Release to lock it. Tap once to re-pour from empty.
export default function PourRating({ value, onChange, wineType = 'Red' }) {
  const [pouring, setPouring] = useState(false);
  const [level,   setLevel]   = useState(value || 0); // 0..5
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const rafRef   = useRef();
  const startRef = useRef();
  const inputRef = useRef();

  const [c1, c2] = LIQUID[wineType] || LIQUID.Red;

  // While held: level rises over ~2.8s, easing slower near the top so
  // landing on a precise score feels controllable
  useEffect(() => {
    if (!pouring) return;
    const startLevel = 0;
    startRef.current = performance.now();
    const tick = (t) => {
      const elapsed = (t - startRef.current) / 1000;
      const p = Math.min(elapsed / 2.8, 1);
      const eased = 1 - Math.pow(1 - p, 1.6);
      const next = Math.min(startLevel + eased * 5, 5);
      setLevel(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pouring]);

  const startPour = (e) => {
    e.preventDefault();
    if (editing) return;
    setLevel(0);
    setPouring(true);
  };
  const stopPour = () => {
    if (!pouring) return;
    setPouring(false);
    const final = Math.max(1, Math.round(level * 10) / 10); // min 1.0, 1 decimal
    setLevel(final);
    onChange(final);
  };

  // Click the number → type an exact score (1.0–5.0)
  const beginEdit = (e) => {
    e.stopPropagation();
    setDraft(level > 0 ? level.toFixed(1) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };
  const commitEdit = () => {
    setEditing(false);
    const parsed = parseFloat(draft.replace(',', '.'));
    if (Number.isNaN(parsed)) return; // keep previous score on garbage input
    const clamped = Math.min(Math.max(Math.round(parsed * 10) / 10, 1), 5);
    setLevel(clamped);
    onChange(clamped);
  };

  const shown = Math.max(level, 0);
  // Liquid geometry inside the bowl (SVG units): bowl spans y=14..58
  const bowlTop = 16, bowlBottom = 56;
  const liquidTop = bowlBottom - (shown / 5) * (bowlBottom - bowlTop);

  return (
    <div className="pour-rating">
      <div
        className={`pour-glass-wrap${pouring ? ' pouring' : ''}`}
        onPointerDown={startPour}
        onPointerUp={stopPour}
        onPointerLeave={stopPour}
        role="slider"
        aria-label="Hold to pour your rating"
        aria-valuemin={1} aria-valuemax={5} aria-valuenow={shown.toFixed(1)}
      >
        <svg viewBox="0 0 60 90" width="72" height="108">
          <defs>
            <linearGradient id="pour-liquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </linearGradient>
            {/* Bowl interior — liquid is clipped to this shape */}
            <clipPath id="pour-bowl">
              <path d="M14 14 C14 40 20 52 30 52 C40 52 46 40 46 14 Z" />
            </clipPath>
          </defs>

          {/* Liquid */}
          <g clipPath="url(#pour-bowl)">
            <rect x="10" y={liquidTop} width="40" height={bowlBottom - liquidTop + 4} fill="url(#pour-liquid)">
            </rect>
            {/* Surface shimmer */}
            {shown > 0 && (
              <ellipse cx="30" cy={liquidTop} rx="14" ry="1.6" fill="#ffffff33" />
            )}
          </g>

          {/* Pour stream while held */}
          {pouring && level < 4.97 && (
            <rect className="pour-stream" x="28.6" y="0" width="2.8" height={Math.max(liquidTop - 2, 0)} rx="1.4" fill={c1} opacity="0.85" />
          )}

          {/* Glass outline */}
          <path d="M13 12 C13 41 19 53 30 53 C41 53 47 41 47 12 Z"
                fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="53" x2="30" y2="76" stroke="var(--text-muted)" strokeWidth="2" />
          <line x1="18" y1="78" x2="42" y2="78" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="pour-readout">
        {editing ? (
          <input
            ref={inputRef}
            className="pour-score-input"
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter')  commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder="1.0–5.0"
            maxLength={4}
          />
        ) : (
          <button type="button" className="pour-score-btn" onClick={beginEdit} title="Click to type an exact score">
            <span className="pour-score" style={{ color: shown > 0 ? c1 : 'var(--text-dim)' }}>
              {shown > 0 ? shown.toFixed(1) : '—'}
            </span>
            <span className="pour-edit-icon">✏️</span>
          </button>
        )}
        <span className="pour-hint">
          {editing ? 'type a score, Enter to set' : pouring ? 'release to set' : shown > 0 ? 'hold to re-pour · click number to type' : 'hold the glass to pour'}
        </span>
      </div>
    </div>
  );
}
