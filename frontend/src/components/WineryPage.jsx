import { useState, useEffect } from 'react';
import WineCard from './WineCard.jsx';
import SkeletonCard from './SkeletonCard.jsx';
import Avatar from './Avatar.jsx';
import { regionFlag, cleanLocation } from '../utils/regionFlags.js';

const API = '';

const TYPE_COLORS = {
  Red: '#e74c3c', White: '#f1c40f', 'Rosé': '#e91e8c',
  Sparkling: '#3498db', Champagne: '#d4af37', Dessert: '#e67e22',
  Fortified: '#9b59b6', Spirit: '#8d6e63',
};

const SORT_OPTIONS = [
  { key: 'newest',  label: 'Newest' },
  { key: 'rating',  label: 'Top Rated' },
  { key: 'popular', label: 'Most Liked' },
];

function Stars({ value }) {
  return (
    <span className="stars-display">
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= Math.round(value) ? '#e67e22' : '#3d1f1f' }}>★</span>
      ))}
    </span>
  );
}

export default function WineryPage({ wineryName, currentUser, onBack, onUserClick, onWineClick, onWineryClick }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [sort,      setSort]      = useState('newest');
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const toggleFollow = async () => {
    // optimistic flip; revert if the request fails
    const prev = { following, followerCount };
    setFollowing(f => !f);
    setFollowerCount(c => c + (following ? -1 : 1));
    try {
      const res = await fetch(`${API}/api/winery/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, name: wineryName }),
      });
      const d = await res.json();
      setFollowing(d.following);
      setFollowerCount(d.followerCount);
    } catch {
      setFollowing(prev.following);
      setFollowerCount(prev.followerCount);
    }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ name: wineryName, currentUserId: currentUser?.id || 0 });
    fetch(`${API}/api/winery?${params}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setFollowing(!!d.isFollowing);
        setFollowerCount(d.wineryFollowerCount || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [wineryName, currentUser]);

  const handleDelete = async (id) => {
    await fetch(`${API}/api/wines/${id}`, { method: 'DELETE' });
    setData(d => ({ ...d, reviews: d.reviews.filter(r => r.id !== id) }));
  };

  const sortedReviews = (data?.reviews || []).slice().sort((a, b) => {
    if (sort === 'rating')  return b.rating - a.rating;
    if (sort === 'popular') return (b.like_count + b.comment_count) - (a.like_count + a.comment_count);
    return new Date(b.created_at) - new Date(a.created_at); // newest
  });

  const rf = data?.region ? regionFlag(data.region) : null;

  return (
    <div className="winery-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      {loading && (
        <div aria-hidden="true">
          <div className="winery-hero">
            <div className="sk sk-line" style={{ width: '50%', height: 24, margin: '0.8rem auto', borderRadius: 8 }} />
            <div className="sk sk-line" style={{ width: '28%', height: 13, margin: '0 auto 1rem' }} />
          </div>
          <div className="profile-wines">
            <SkeletonCard count={2} />
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Hero */}
          <div className="winery-hero">
            <div className="winery-hero-icon">🏭</div>
            <h1 className="winery-hero-name">{data.name}</h1>

            {/* Follow winery — get notified of new reviews */}
            <button
              className={`winery-follow-btn${following ? ' following' : ''}`}
              onClick={toggleFollow}
            >
              {following ? '✓ Following' : '+ Follow'}
            </button>
            {followerCount > 0 && (
              <span className="winery-follower-count">
                {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
              </span>
            )}

            {/* Region + vintage range */}
            <div className="winery-hero-meta">
              {data.region && (
                <span className="winery-meta-chip">
                  📍 {rf ? cleanLocation(data.region) : data.region}
                  {rf && <span className={`fi fi-${rf.iso}`} style={{ marginLeft: 4 }} />}
                </span>
              )}
              {data.vintages?.min_v && (
                <span className="winery-meta-chip">
                  📅 {data.vintages.min_v === data.vintages.max_v
                    ? data.vintages.min_v
                    : `${data.vintages.min_v} – ${data.vintages.max_v}`}
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="winery-stats-row">
              <div className="winery-stat">
                <span className="winery-stat-val">{data.stats.review_count}</span>
                <span className="winery-stat-label">Reviews</span>
              </div>
              <div className="winery-stat-divider" />
              <div className="winery-stat">
                <span className="winery-stat-val">{data.stats.wine_count}</span>
                <span className="winery-stat-label">Wines</span>
              </div>
              <div className="winery-stat-divider" />
              <div className="winery-stat">
                <span className="winery-stat-val">{data.stats.reviewer_count}</span>
                <span className="winery-stat-label">Reviewers</span>
              </div>
              <div className="winery-stat-divider" />
              <div className="winery-stat">
                <span className="winery-stat-val">{data.stats.avg_rating ?? '—'}</span>
                <span className="winery-stat-label">Avg ★</span>
              </div>
            </div>

            {data.stats.avg_rating && <Stars value={data.stats.avg_rating} />}

            {/* Type pills */}
            {data.types.length > 0 && (
              <div className="winery-type-row">
                {data.types.map(t => (
                  <span key={t.type} className="winery-type-pill"
                    style={{
                      background: (TYPE_COLORS[t.type] || '#aaa') + '22',
                      color: TYPE_COLORS[t.type] || '#aaa',
                      border: `1px solid ${(TYPE_COLORS[t.type] || '#aaa')}44`,
                    }}>
                    {t.type} <span className="winery-type-count">{t.cnt}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Grape varieties */}
            {data.grapes.length > 0 && (
              <div className="winery-grapes-row">
                {data.grapes.map(g => (
                  <span key={g.grapes} className="winery-grape-pill">🍇 {g.grapes}</span>
                ))}
              </div>
            )}
          </div>

          {/* Top rated highlight */}
          {data.topWine && (
            <div className="winery-section">
              <h2 className="winery-section-title">⭐ Best Reviewed</h2>
              <WineCard
                wine={data.topWine}
                currentUser={currentUser}
                onDelete={handleDelete}
                onUserClick={onUserClick}
                onWineClick={onWineClick}
                onWineryClick={onWineryClick}
              />
            </div>
          )}

          {/* Distinct wines */}
          {data.wines.length > 0 && (
            <div className="winery-section">
              <h2 className="winery-section-title">Wines</h2>
              <div className="winery-wines-list">
                {data.wines.map(w => (
                  <button
                    key={w.name}
                    className="winery-wine-chip"
                    onClick={() => onWineClick?.({ name: w.name, winery: wineryName })}
                  >
                    <span className="winery-wine-dot" style={{ background: TYPE_COLORS[w.type] || '#aaa' }} />
                    <span className="winery-wine-name">{w.name}</span>
                    <span className="winery-wine-meta">{w.avg_rating}★ · {w.review_count} review{w.review_count !== 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reviewers */}
          {data.reviewers.length > 0 && (
            <div className="winery-section">
              <h2 className="winery-section-title">Reviewed by</h2>
              <div className="winery-reviewers-row">
                {data.reviewers.map(u => (
                  <button key={u.id} className="winery-reviewer-chip" onClick={() => onUserClick?.(u.id)}>
                    <Avatar user={u} size={28} />
                    <span>@{u.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reviews with sort */}
          <div className="winery-section">
            <div className="winery-reviews-header">
              <h2 className="winery-section-title" style={{ margin: 0 }}>Community Reviews</h2>
              <div className="winery-sort-row">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.key}
                    className={`winery-sort-btn${sort === o.key ? ' active' : ''}`}
                    onClick={() => setSort(o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="winepage-reviews" style={{ marginTop: '0.75rem' }}>
              {sortedReviews.length === 0 && <p className="loading-hint">No reviews yet.</p>}
              {sortedReviews.map(w => (
                <WineCard
                  key={w.id}
                  wine={w}
                  currentUser={currentUser}
                  onDelete={handleDelete}
                  onUserClick={onUserClick}
                  onWineClick={onWineClick}
                  onWineryClick={onWineryClick}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
