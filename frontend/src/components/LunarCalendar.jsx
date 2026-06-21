import { useState } from 'react';
import { getMoonInfo, TYPE_INFO, PHASE_INFO, ASCENDING_INFO } from '../utils/moonCalendar.js';

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Use noon to avoid DST / sign-boundary ambiguity
function noon(year, month, day) { return new Date(year, month, day, 12, 0, 0); }

function buildMonth(year, month) {
  const first = new Date(year, month, 1).getDay();
  const last  = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= last; d++) cells.push(noon(year, month, d));
  return cells;
}

function isSameDay(a, b) {
  return a && b &&
    a.getDate()     === b.getDate()     &&
    a.getMonth()    === b.getMonth()    &&
    a.getFullYear() === b.getFullYear();
}

function IlluminationBar({ pct }) {
  return (
    <div className="illum-bar">
      <div className="illum-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
      <span className="illum-label">{Math.round(pct * 100)}% illuminated</span>
    </div>
  );
}

function DayDetailCard({ date, label }) {
  const info       = getMoonInfo(date);
  const typeInfo   = TYPE_INFO[info.type];
  const phaseInfo  = PHASE_INFO[info.phase];
  const ascInfo    = ASCENDING_INFO[info.ascending ? 'ascending' : 'descending'];

  return (
    <div className="day-detail-card">
      <p className="ddc-date">{label ?? date.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>

      <div className="ddc-row">
        {/* Day type */}
        <div className="ddc-pill" style={{ background: typeInfo.bg, borderColor: typeInfo.color }}>
          <span className="ddc-pill-emoji">{typeInfo.emoji}</span>
          <div>
            <p className="ddc-pill-name" style={{ color: typeInfo.color }}>{typeInfo.label}</p>
            <p className="ddc-pill-sub">Moon in {info.sign}</p>
          </div>
        </div>

        {/* Phase */}
        <div className="ddc-pill" style={{ background: '#0d0404', borderColor: phaseInfo.color + '66' }}>
          <span className="ddc-pill-emoji">{phaseInfo.emoji}</span>
          <div>
            <p className="ddc-pill-name" style={{ color: phaseInfo.color }}>{phaseInfo.name}</p>
            <p className="ddc-pill-sub">{Math.round(info.illumination * 100)}% lit</p>
          </div>
        </div>

        {/* Ascending / descending */}
        <div className="ddc-pill" style={{ background: '#0d0404', borderColor: ascInfo.color + '55' }}>
          <span className="ddc-pill-emoji" style={{ fontSize:'1.4rem' }}>{ascInfo.emoji}</span>
          <div>
            <p className="ddc-pill-name" style={{ color: ascInfo.color }}>{ascInfo.label}</p>
            <p className="ddc-pill-sub">{info.ascending ? 'Wine opens up' : 'Wine more closed'}</p>
          </div>
        </div>
      </div>

      <IlluminationBar pct={info.illumination} />

      <p className="ddc-advice">
        <strong>Tasting advice:</strong>{' '}
        {typeInfo.desc} {phaseInfo.desc} {ascInfo.desc}
      </p>
    </div>
  );
}

export default function LunarCalendar({ onBack }) {
  const now      = new Date();
  const today    = noon(now.getFullYear(), now.getMonth(), now.getDate()); // noon = consistent
  const [view,     setView]     = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const cells    = buildMonth(view.getFullYear(), view.getMonth());
  const monthLbl = view.toLocaleDateString('en-GB', { month:'long', year:'numeric' });
  const prev     = () => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const next     = () => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1));

  return (
    <div className="lunar-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="lunar-hero">
        <h1>🌙 Lunar Calendar</h1>
        <p>Biodynamic wine tasting guide — moon phases, ascending &amp; descending cycles</p>
      </div>

      {/* Today detail */}
      <DayDetailCard
        date={today}
        label={`Today · ${today.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}`}
      />

      {/* Selected day (if different) */}
      {!isSameDay(selected, today) && (
        <DayDetailCard date={selected} />
      )}

      {/* Phase legend */}
      <div className="lunar-section-title">Moon Phases</div>
      <div className="phase-legend">
        {Object.entries(PHASE_INFO).map(([key, p]) => (
          <div key={key} className="phase-legend-item">
            <span className="phase-legend-emoji">{p.emoji}</span>
            <span className="phase-legend-name" style={{ color: p.color }}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Ascending / descending legend */}
      <div className="asc-legend">
        {Object.entries(ASCENDING_INFO).map(([key, a]) => (
          <div key={key} className="asc-legend-item" style={{ borderColor: a.color + '55', background: '#0d0404' }}>
            <span style={{ color: a.color, fontSize:'1.3rem', fontWeight:700 }}>{a.emoji}</span>
            <div>
              <p className="asc-legend-name" style={{ color: a.color }}>{a.label}</p>
              <p className="asc-legend-desc">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Day type legend */}
      <div className="lunar-section-title">Day Types</div>
      <div className="lunar-legend">
        {Object.entries(TYPE_INFO).map(([key, t]) => (
          <div key={key} className="lunar-legend-item" style={{ background: t.bg, borderColor: t.color }}>
            <span>{t.emoji}</span>
            <span style={{ color: t.color }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Month navigation */}
      <div className="lunar-month-nav">
        <button className="lmn-btn" onClick={prev}>‹</button>
        <span className="lmn-title">{monthLbl}</span>
        <button className="lmn-btn" onClick={next}>›</button>
      </div>

      {/* Calendar grid */}
      <div className="lunar-grid">
        {WEEKDAYS.map(d => <div key={d} className="lunar-wd">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const info      = getMoonInfo(day);
          const typeInfo  = TYPE_INFO[info.type];
          const phaseInfo = PHASE_INFO[info.phase];
          const isT       = isSameDay(day, today);
          const isSel     = isSameDay(day, selected);

          return (
            <div
              key={day.toISOString()}
              className={`lunar-day${isT ? ' is-today' : ''}${isSel ? ' is-selected' : ''}`}
              style={{
                background:  typeInfo.bg,
                borderColor: isSel ? typeInfo.color : isT ? typeInfo.color + '99' : 'transparent',
                boxShadow:   isSel ? `0 0 0 2px ${typeInfo.color}` : 'none',
              }}
              onClick={() => setSelected(day)}
            >
              <span className="ld-num"  style={{ color: (isT || isSel) ? typeInfo.color : '#c8b89a' }}>
                {day.getDate()}
              </span>
              <span className="ld-phase">{phaseInfo.emoji}</span>
              <span className="ld-type">{typeInfo.emoji}</span>
              <span className="ld-asc"  style={{ color: info.ascending ? '#3498db' : '#9b59b6' }}>
                {info.ascending ? '↑' : '↓'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom description cards — highlighted card matches selected day's type */}
      <div className="lunar-section-title" style={{ marginTop:'1.5rem' }}>What does each day mean for wine?</div>
      <div className="lunar-desc-grid">
        {Object.entries(TYPE_INFO).map(([key, t]) => {
          const isActive = key === getMoonInfo(selected).type;
          return (
            <div
              key={key}
              className={`lunar-desc-card${isActive ? ' ldc-active' : ''}`}
              style={{
                borderColor: isActive ? t.color : t.color + '33',
                background:  isActive ? t.bg    : '#0d0404',
                boxShadow:   isActive ? `0 0 16px ${t.color}44` : 'none',
                transform:   isActive ? 'scale(1.02)' : 'scale(1)',
                transition:  'all 0.25s ease',
              }}
            >
              {isActive && (
                <span className="ldc-active-badge" style={{ background: t.color }}>
                  {selected && isSameDay(selected, today) ? 'Today' : selected.toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                </span>
              )}
              <p className="ldc-title" style={{ color: t.color }}>{t.emoji} {t.label}</p>
              <p className="ldc-body">{t.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
