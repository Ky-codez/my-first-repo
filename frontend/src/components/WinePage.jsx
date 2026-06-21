import { useState, useEffect } from 'react';
import WineCard from './WineCard.jsx';
import SkeletonCard from './SkeletonCard.jsx';

const API = '';

function Stars({ value, size = '1.1rem' }) {
  return (
    <span className="stars-display" style={{ fontSize: size }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= Math.round(value) ? '#e67e22' : '#3d1f1f' }}>★</span>
      ))}
    </span>
  );
}

export default function WinePage({ wineName, winery, currentUser, onBack, onRelog, onUserClick, onWineClick }) {
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [vintageFilter,  setVintageFilter]  = useState(null); // null = all

  useEffect(() => {
    setLoading(true);
    setVintageFilter(null);
    const params = new URLSearchParams({ name: wineName, currentUserId: currentUser?.id || 0 });
    if (winery) params.append('winery', winery);
    fetch(`${API}/api/wines/bottle?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [wineName, winery]);

  const handleDelete = (id) => {
    setData(d => ({ ...d, wines: d.wines.filter(w => w.id !== id) }));
    fetch(`${API}/api/wines/${id}`, { method: 'DELETE' });
  };

  if (loading) return (
    <div className="wine-page" aria-hidden="true">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="bottle-header">
        <div className="sk sk-line" style={{ width: '55%', height: 26, margin: '0.3rem auto 0.9rem', borderRadius: 8 }} />
        <div className="sk sk-line" style={{ width: '32%', height: 14, margin: '0 auto 1.3rem' }} />
        <div className="psk-stats">
          {[0,1,2].map(i => <div key={i} className="sk psk-stat" style={{ width: 60, height: 42 }} />)}
        </div>
      </div>
      <div className="profile-wines">
        <SkeletonCard count={2} />
      </div>
    </div>
  );
  if (!data || !Array.isArray(data.wines)) return <div className="loading-full">Not found.</div>;

  const { wines, avgRating = 0, reviewCount = 0, vintageBreakdown = [], histogram = [] } = data;

  const visibleWines = vintageFilter
    ? wines.filter(w => w.vintage === vintageFilter)
    : wines;

  // Collect unique vintages and types
  const vintages = [...new Set(wines.map(w => w.vintage).filter(Boolean))].sort();
  const types    = [...new Set(wines.map(w => w.type).filter(Boolean))];

  const WINE_TYPE_COLORS = {
    Red: '#e74c3c', White: '#f1c40f', 'Rosé': '#e91e8c',
    Sparkling: '#3498db', Champagne: '#d4af37', Dessert: '#e67e22',
    Fortified: '#9b59b6', Spirit: '#8d6e63',
  };

  return (
    <div className="wine-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      {/* Bottle header */}
      <div className="bottle-header">
        <div className="bottle-meta">
          {types.map(t => (
            <span key={t} className="wc-type-badge"
              style={{ background: (WINE_TYPE_COLORS[t] || '#aaa') + '22', color: WINE_TYPE_COLORS[t] || '#aaa', border: `1px solid ${(WINE_TYPE_COLORS[t] || '#aaa')}44` }}>
              {t}
            </span>
          ))}
          {vintages.length > 0 && (
            <span className="bottle-vintages">{vintages.join(', ')}</span>
          )}
        </div>

        <h1 className="bottle-name">🍷 {wineName}</h1>
        {winery && <p className="bottle-winery">{winery}</p>}

        <div className="bottle-stats">
          <div className="bottle-stat">
            <Stars value={avgRating} size="1.3rem" />
            <span className="bottle-stat-val">{avgRating.toFixed(1)}</span>
            <span className="bottle-stat-label">avg rating</span>
          </div>
          <div className="bottle-stat-divider" />
          <div className="bottle-stat">
            <span className="bottle-stat-num">{reviewCount}</span>
            <span className="bottle-stat-label">{reviewCount === 1 ? 'review' : 'reviews'}</span>
          </div>
          <div className="bottle-stat-divider" />
          <div className="bottle-stat">
            <span className="bottle-stat-num">{[...new Set(wines.map(w => w.user_id))].length}</span>
            <span className="bottle-stat-label">{[...new Set(wines.map(w => w.user_id))].length === 1 ? 'taster' : 'tasters'}</span>
          </div>
        </div>

        {/* Reviewer avatars */}
        <div className="bottle-reviewers">
          {[...new Map(wines.map(w => [w.user_id, w])).values()].map(w => (
            <button key={w.user_id} className="bottle-reviewer-chip" onClick={() => onUserClick?.(w.user_id)}>
              <span className="bottle-reviewer-initial">{w.username[0].toUpperCase()}</span>
              @{w.username}
            </button>
          ))}
        </div>

        {/* Affiliate: find & buy this bottle */}
        <a
          className="find-bottle-btn"
          href={`https://www.wine-searcher.com/find/${encodeURIComponent([wineName, winery].filter(Boolean).join(' '))}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          🛒 Find this bottle
        </a>
      </div>

      {/* Rating histogram */}
      {histogram.length > 0 && histogram.some(h => h.count > 0) && (
        <div className="rating-histogram">
          <div className="rh-header">
            <span className="rh-title">Community ratings</span>
            {histogram.some(h => h.circleCount > 0) && (
              <span className="rh-legend">
                <span className="rh-legend-dot rh-dot-circle" />your circle
                <span className="rh-legend-dot rh-dot-all" style={{marginLeft:'0.75rem'}} />everyone
              </span>
            )}
          </div>
          {histogram.map(({ star, count, circleCount }) => {
            const maxCount = Math.max(...histogram.map(h => h.count), 1);
            const allPct    = (count / maxCount) * 100;
            const circlePct = (circleCount / maxCount) * 100;
            return (
              <div key={star} className="rh-row">
                <span className="rh-star">{star}★</span>
                <div className="rh-bar-track">
                  <div className="rh-bar-all"    style={{ width: `${allPct}%` }} />
                  {circleCount > 0 && <div className="rh-bar-circle" style={{ width: `${circlePct}%` }} />}
                </div>
                <span className="rh-count">{count}</span>
                {circleCount > 0 && (
                  <span className="rh-circle-count" title={`${circleCount} from your circle`}>
                    👥{circleCount}
                  </span>
                )}
              </div>
            );
          })}
          {histogram.every(h => h.circleCount === 0) && currentUser && (
            <p className="rh-cta">Be the first in your circle to rate this</p>
          )}
        </div>
      )}

      {/* Vintage breakdown */}
      {vintageBreakdown.length > 1 && (
        <div className="vintage-breakdown">
          <h3 className="vintage-breakdown-title">Ratings by Vintage</h3>
          <div className="vintage-rows">
            {vintageBreakdown.map(v => (
              <button
                key={v.vintage ?? 'unknown'}
                className={`vintage-row${vintageFilter === v.vintage ? ' active' : ''}`}
                onClick={() => setVintageFilter(vintageFilter === v.vintage ? null : v.vintage)}
              >
                <span className="vintage-year">{v.vintage ?? 'N/V'}</span>
                <div className="vintage-bar-wrap">
                  <div className="vintage-bar" style={{ width: `${(v.avgRating / 5) * 100}%` }} />
                </div>
                <Stars value={v.avgRating} size="0.85rem" />
                <span className="vintage-avg">{v.avgRating.toFixed(1)}</span>
                <span className="vintage-count">{v.reviewCount} {v.reviewCount === 1 ? 'review' : 'reviews'}</span>
              </button>
            ))}
          </div>
          {vintageFilter && (
            <button className="vintage-clear" onClick={() => setVintageFilter(null)}>
              ✕ Clear filter — showing {vintageFilter} only
            </button>
          )}
        </div>
      )}

      {/* All reviews */}
      <h3 className="profile-section-title" style={{ marginTop: '1.5rem' }}>
        {vintageFilter ? `${vintageFilter} Reviews` : 'All Reviews'}
        <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>
          ({visibleWines.length})
        </span>
      </h3>
      <div className="profile-wines">
        {visibleWines.map(w => (
          <WineCard key={w.id} wine={w} currentUser={currentUser} onDelete={handleDelete} onRelog={onRelog} onUserClick={onUserClick} onWineClick={onWineClick} />
        ))}
      </div>
    </div>
  );
}
