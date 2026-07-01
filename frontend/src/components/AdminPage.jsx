/**
 * Founder dashboard at /admin — owner-only. Three side pages:
 *   Overview  — app stats (users, wines, growth)
 *   Feedback  — bug reports / ideas, with swipe-to-triage
 *   Changelog — the detailed record of everything shipped
 * Gated server-side by ADMIN_USERNAME; renders a friendly message otherwise.
 */
import { useEffect, useRef, useState } from 'react';
import { Flag, ChartBar } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';

const API = '';

const FB_LABEL = { bug: 'Bug', idea: 'Idea', other: 'Other' };

// Detailed, dated record of shipped work (newest first). Add an entry per release.
const CHANGELOG = [
  { date: '2026-06-22', items: [
    'Tag users you tasted with (public users, or private users who approved you).',
    'Feedback / bug-report system → this dashboard, with swipe-to-triage.',
    "What's New page (public timeline) + this detailed changelog.",
  ] },
  { date: '2026-06-21', items: [
    'Private accounts + Instagram-style follow requests (approve/decline).',
    'Centralized wine-visibility privacy into one helper; closed a winery-page leak.',
    'Emoji audit: chrome → line icons, flatter buttons.',
    'Mobile performance: WebP photo optimization, 1-year image caching, lazy-load.',
    'iOS input-zoom fix; Today’s Moon card; non-AI taste profile; persona onboarding.',
  ] },
  { date: '2026-06-20', items: [
    'Forgot-password reset flow; real-time notifications via WebSocket.',
    'Barcode scan to auto-fill; “Find this bottle” affiliate button; self-like fix.',
  ] },
  { date: '2026-06-15 – 06-17', items: [
    'Foundation: logging (mood/quick/full), Vibe Deck, recommendations, social graph,',
    'bottle & winery pages, share cards, recap, Lunar Calendar, badges, PWA, security, legal.',
  ] },
];

function Stat({ label, value, sub }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

// One swipeable feedback row. Swipe RIGHT → reveal Unread / Flag.
// Swipe LEFT → reveal Done. (Pointer events: works with touch and mouse.)
function FeedbackRow({ f, onUpdate }) {
  const [dx, setDx]   = useState(0);
  const cur = useRef(0);      // live offset (avoids stale state in pointerup)
  const base = useRef(0);
  const start = useRef(null);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const setOffset = (v) => { cur.current = v; setDx(v); };

  const down = (e) => { start.current = e.clientX; try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {} };
  const move = (e) => {
    if (start.current == null) return;
    setOffset(clamp(base.current + (e.clientX - start.current), -120, 180));
  };
  const up = () => {
    if (start.current == null) return;
    start.current = null;
    const snap = cur.current > 90 ? 168 : cur.current < -60 ? -100 : 0;
    base.current = snap; setOffset(snap);
  };
  const reset = () => { base.current = 0; setOffset(0); };
  const act = async (patch) => { await onUpdate(f.id, patch); reset(); };

  return (
    <div className="fb-swipe">
      <div className="fb-actions fb-actions-left">
        <button className="fb-act fb-unread" onClick={() => act({ is_read: 0 })}>Unread</button>
        <button className="fb-act fb-flag" onClick={() => act({ flagged: f.flagged ? 0 : 1 })}>
          {f.flagged ? 'Unflag' : 'Flag'}
        </button>
      </div>
      <div className="fb-actions fb-actions-right">
        <button className="fb-act fb-done" onClick={() => act({ status: f.status === 'done' ? 'new' : 'done' })}>
          {f.status === 'done' ? 'Reopen' : 'Done'}
        </button>
      </div>
      <div
        className={`fb-card${f.is_read ? '' : ' unread'}${f.status === 'done' ? ' done' : ''}${f.flagged ? ' flagged' : ''}`}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      >
        <div className="fb-head">
          <span className="fb-type">
            {f.flagged ? <span className="fb-pin"><Flag size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> </span> : null}
            {FB_LABEL[f.type] || f.type}
            {f.status === 'done' && <span className="fb-done-tag"> · done</span>}
          </span>
          <span className="fb-meta">@{f.username || 'deleted'} · {f.created_at} UTC</span>
        </div>
        <p className="fb-msg">{f.message}</p>
      </div>
    </div>
  );
}

export default function AdminPage({ onBack }) {
  const [page, setPage]   = useState('overview');   // overview | feedback | changelog
  const [data, setData]   = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [ambUser, setAmbUser] = useState('');
  const [ambMsg, setAmbMsg] = useState('');

  const setAmbassador = async (grant) => {
    const username = ambUser.trim().replace(/^@/, '');
    if (!username) return;
    setAmbMsg('Saving…');
    try {
      const r = await fetch(`${API}/api/admin/ambassador`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, is_ambassador: grant }),
      });
      const d = await r.json();
      setAmbMsg(r.ok ? `@${d.username} is ${grant ? 'now an Ambassador' : 'no longer an Ambassador'}.` : (d.error || 'Failed'));
      if (r.ok) setAmbUser('');
    } catch { setAmbMsg('Network error'); }
  };

  useEffect(() => {
    fetch(`${API}/api/admin/stats`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || 'Error')))
      .then(setData)
      .catch(e => setError(typeof e === 'string' ? e : 'Could not load stats'));
    fetch(`${API}/api/admin/feedback`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFeedback(d); })
      .catch(() => {});
  }, []);

  const updateFeedback = async (id, patch) => {
    setFeedback(fb => ({
      ...fb,
      feedback: fb.feedback.map(f => f.id === id ? { ...f, ...patch } : f),
    }));
    try {
      await fetch(`${API}/api/admin/feedback/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
    } catch { /* optimistic; ignore */ }
  };

  const maxType = data?.winesByType?.reduce((m, t) => Math.max(m, t.c), 0) || 1;
  const unread = feedback?.unread || 0;

  return (
    <div className="admin-page">
      <div className="admin-box">
        <button className="legal-back" onClick={onBack}>← Back to Sipiary</button>
        <h1 className="admin-title"><ChartBar size={22} weight="fill" style={{ verticalAlign: '-0.18em' }} /> Founder Dashboard</h1>

        {error && (
          <p className="admin-error">
            {error === 'Admins only'
              ? "This page is for the app owner only. Log in with the admin account to view it."
              : error}
          </p>
        )}

        {!error && (
          <div className="admin-nav">
            <button className={`admin-nav-btn${page === 'overview' ? ' active' : ''}`} onClick={() => setPage('overview')}>Overview</button>
            <button className={`admin-nav-btn${page === 'feedback' ? ' active' : ''}`} onClick={() => setPage('feedback')}>
              Feedback{unread > 0 && <span className="admin-nav-badge">{unread}</span>}
            </button>
            <button className={`admin-nav-btn${page === 'changelog' ? ' active' : ''}`} onClick={() => setPage('changelog')}>Changelog</button>
          </div>
        )}

        {/* ── Overview ── */}
        {!error && page === 'overview' && (
          !data ? <p className="admin-loading">Crunching the numbers…</p> : (
          <>
            <div className="admin-grid">
              <Stat label="Total users"  value={data.totalUsers} sub={`+${data.newUsers7d} this week`} />
              <Stat label="Total wines"  value={data.totalWines} sub={`+${data.newWines7d} this week`} />
              <Stat label="Activation"   value={`${data.activationPct}%`} sub={`${data.usersWithWines} logged a wine`} />
              <Stat label="Avg rating"   value={`${data.avgRating}★`} />
              <Stat label="Likes"        value={data.totalLikes} />
              <Stat label="Comments"     value={data.totalComments} />
            </div>

            <div className="admin-section">
              <h2 className="admin-section-title">Ambassadors</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
                Grant the gold-star badge to a user by username.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="admin-amb-input"
                  placeholder="username"
                  value={ambUser}
                  onChange={e => setAmbUser(e.target.value)}
                  style={{ flex: 1, minWidth: 140, padding: '0.5rem 0.7rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                />
                <button className="admin-nav-btn" onClick={() => setAmbassador(true)}>Grant</button>
                <button className="admin-nav-btn" onClick={() => setAmbassador(false)}>Revoke</button>
              </div>
              {ambMsg && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>{ambMsg}</p>}
            </div>

            {data.winesByType?.length > 0 && (
              <div className="admin-section">
                <h2 className="admin-section-title">Wines by type</h2>
                {data.winesByType.map(t => (
                  <div key={t.type} className="admin-bar-row">
                    <span className="admin-bar-label"><WineTypeIcon type={t.type} size={14} /> {t.type}</span>
                    <div className="admin-bar-track">
                      <div className="admin-bar-fill" style={{ width: `${(t.c / maxType) * 100}%` }} />
                    </div>
                    <span className="admin-bar-count">{t.c}</span>
                  </div>
                ))}
              </div>
            )}

            {data.topReviewers?.length > 0 && (
              <div className="admin-section">
                <h2 className="admin-section-title">Top reviewers</h2>
                <ol className="admin-leaderboard">
                  {data.topReviewers.map(r => (
                    <li key={r.username}>
                      <span className="admin-lb-name">@{r.username}</span>
                      <span className="admin-lb-count">{r.c} wine{r.c === 1 ? '' : 's'}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {data.latestSignup && <p className="admin-footnote">Latest signup: {data.latestSignup} UTC</p>}
          </>
        ))}

        {/* ── Feedback ── */}
        {!error && page === 'feedback' && (
          <div className="admin-section">
            <p className="admin-fb-hint">Swipe an entry → for Unread / Flag, or ← to mark Done.</p>
            {!feedback ? <p className="admin-loading">Loading…</p>
              : feedback.feedback.length === 0 ? <p className="admin-footnote">No feedback yet.</p>
              : (
                <div className="admin-feedback-list">
                  {feedback.feedback.map(f => (
                    <FeedbackRow key={f.id} f={f} onUpdate={updateFeedback} />
                  ))}
                </div>
              )}
          </div>
        )}

        {/* ── Changelog (detailed) ── */}
        {!error && page === 'changelog' && (
          <div className="admin-section">
            <div className="wn-table">
              {CHANGELOG.map((r, i) => (
                <div key={i} className="wn-row">
                  <div className="wn-when">{r.date}</div>
                  <ul className="wn-what">
                    {r.items.map((it, j) => <li key={j}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
