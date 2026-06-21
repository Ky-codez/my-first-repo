/**
 * Founder dashboard at /admin — owner-only app stats (users, wines, growth).
 * Gated server-side by ADMIN_USERNAME; this page just renders what it returns,
 * and shows a friendly message if you're not the admin / not logged in.
 */
import { useEffect, useState } from 'react';

const API = '';

const TYPE_EMOJI = {
  Red: '🍷', White: '🥂', 'Rosé': '🌸', Sparkling: '✨',
  Champagne: '🍾', Dessert: '🍯', Fortified: '🏺', Spirit: '🥃',
};

function Stat({ label, value, sub }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminPage({ onBack }) {
  const [data, setData]   = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/admin/stats`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error || 'Error')))
      .then(setData)
      .catch(e => setError(typeof e === 'string' ? e : 'Could not load stats'));
  }, []);

  const maxType = data?.winesByType?.reduce((m, t) => Math.max(m, t.c), 0) || 1;

  return (
    <div className="admin-page">
      <div className="admin-box">
        <button className="legal-back" onClick={onBack}>← Back to Sipiary</button>
        <h1 className="admin-title">📊 Founder Dashboard</h1>

        {error && (
          <p className="admin-error">
            {error === 'Admins only'
              ? "This page is for the app owner only. Log in with the admin account to view it."
              : error}
          </p>
        )}

        {!error && !data && <p className="admin-loading">Crunching the numbers…</p>}

        {data && (
          <>
            <div className="admin-grid">
              <Stat label="Total users"  value={data.totalUsers} sub={`+${data.newUsers7d} this week`} />
              <Stat label="Total wines"  value={data.totalWines} sub={`+${data.newWines7d} this week`} />
              <Stat label="Activation"   value={`${data.activationPct}%`} sub={`${data.usersWithWines} logged a wine`} />
              <Stat label="Avg rating"   value={`${data.avgRating}★`} />
              <Stat label="Likes"        value={data.totalLikes} />
              <Stat label="Comments"     value={data.totalComments} />
            </div>

            {data.winesByType?.length > 0 && (
              <div className="admin-section">
                <h2 className="admin-section-title">Wines by type</h2>
                {data.winesByType.map(t => (
                  <div key={t.type} className="admin-bar-row">
                    <span className="admin-bar-label">{TYPE_EMOJI[t.type] || '🍷'} {t.type}</span>
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

            {data.latestSignup && (
              <p className="admin-footnote">Latest signup: {data.latestSignup} UTC</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
