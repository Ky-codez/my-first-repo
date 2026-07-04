import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import WineCard from './WineCard.jsx';
import SkeletonCard from './SkeletonCard.jsx';
import MainMenu from './MainMenu.jsx';
import TonightCard from './TonightCard.jsx';
import { getMoonInfo, TYPE_INFO, PHASE_INFO } from '../utils/moonCalendar.js';
import { useLang } from '../i18n.jsx';
import { Fire, Users, Dna, Plant } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';
import AmbassadorBadge from './AmbassadorBadge.jsx';

const API = '';

export default function Feed({ currentUser, onAddWine, onRelog, onUserClick, onLunarClick, onCellarClick, onWineClick, onWineryClick, theme, onThemeChange, onHome, onLogout, onProfileClick, onSearchClick }) {
  const { t } = useLang();
  const todayMoon  = getMoonInfo(new Date());
  const todayType  = TYPE_INFO[todayMoon.type];
  const todayPhase = PHASE_INFO[todayMoon.phase];
  const [wines,    setWines]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [feedMode, setFeedMode] = useState('explore'); // 'explore' | 'following'
  const [green, setGreen] = useState(false);           // filter to organic / biodynamic only

  const switchMode = (mode) => {
    if (mode !== feedMode) setFeedMode(mode);
  };

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [streak, setStreak] = useState(0);  // consecutive weeks with ≥1 log
  // Pick a stable inject position (3–5) each time the wine list changes
  const pymkInsertAt = useMemo(() => 3 + Math.floor(Math.random() * 3), [wines.length]);

  useEffect(() => {
    if (!currentUser) return;
    setSuggestionsLoaded(false);
    fetch(`${API}/api/users/suggestions?currentUserId=${currentUser.id}`)
      .then(r => r.json())
      .then(data => { setSuggestions(Array.isArray(data) ? data : []); setSuggestionsLoaded(true); })
      .catch(() => setSuggestionsLoaded(true));
    // Logging streak (weeks in a row) — surfaced as a chip to drive retention.
    fetch(`${API}/api/users/${currentUser.id}/badges`)
      .then(r => r.json())
      .then(d => setStreak(d.streak || 0))
      .catch(() => {});
  }, [currentUser]);

  // ── Infinite scroll ──────────────────────────────────────────────────────
  const PAGE = 20;
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef  = useRef(0);     // how many rows we've already pulled
  const loadingRef = useRef(false); // guards against overlapping requests
  const sentinelRef = useRef(null);

  // Load one page. append=false resets to the top (mode switch / refresh).
  const loadPage = useCallback((append) => {
    if (loadingRef.current) return;
    if (append && !hasMore) return;
    loadingRef.current = true;
    append ? setLoadingMore(true) : setLoading(true);
    const off = append ? offsetRef.current : 0;
    const params = new URLSearchParams({ currentUserId: currentUser?.id || 0, limit: PAGE, offset: off });
    if (feedMode === 'following') params.append('feed', 'following');
    if (green) params.append('green', '1');
    fetch(`${API}/api/wines?${params}`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setWines(prev => (append ? [...prev, ...arr] : arr));
        offsetRef.current = off + arr.length;
        setHasMore(arr.length === PAGE);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setLoadingMore(false); loadingRef.current = false; });
  }, [feedMode, currentUser, hasMore, green]);

  // Refresh from the top — used after follow/delete and on mode/user change.
  const reload = useCallback(() => { offsetRef.current = 0; setHasMore(true); loadPage(false); }, [loadPage]);

  const handleFollow = async (userId) => {
    await fetch(`${API}/api/users/${userId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower_id: currentUser.id }),
    });
    setSuggestions(s => s.filter(u => u.id !== userId));
    reload();
  };

  useEffect(() => { offsetRef.current = 0; setHasMore(true); loadPage(false); /* eslint-disable-next-line */ }, [feedMode, currentUser, green]);

  // Auto-load the next page when the sentinel scrolls into view. Depends on
  // `loading` so it (re)attaches once the sentinel mounts after the first page.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadPage(true);
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadPage, loading]);

  const handleDelete = async (id) => {
    await fetch(`${API}/api/wines/${id}`, { method: 'DELETE' });
    setWines(w => w.filter(x => x.id !== id));
  };

  return (
    <div className="feed-page">
      {/* Top nav — logo + search + hamburger menu */}
      <header className="feed-header">
        <button className="feed-logo" onClick={onHome}><WineTypeIcon type="Red" size={20} /> Sipiary</button>
      </header>

      {/* Profile completion banner — only for users with no avatar */}
      {!currentUser?.avatar_path && (
        <div className="profile-prompt-banner">
          <span>Add a profile photo to personalise your Sipiary</span>
          <button className="profile-prompt-btn" onClick={onProfileClick}>Set up →</button>
        </div>
      )}

      {/* Today's Moon — the biodynamic signal, surfaced into the daily loop.
          Tap to open the full lunar calendar. */}
      <button
        className="moon-today-card"
        onClick={onLunarClick}
        style={{ borderColor: todayType.color + '66', background: todayType.bg }}
      >
        <span className="mtc-emoji">{todayType.emoji}</span>
        <span className="mtc-body">
          <span className="mtc-title" style={{ color: todayType.color }}>
            Today is a {todayType.label}
          </span>
          <span className="mtc-sub">{todayType.desc}</span>
        </span>
        <span className="mtc-phase">
          <span className="mtc-phase-emoji">{todayPhase.emoji}</span>
          <span className="mtc-phase-name" style={{ color: todayPhase.color }}>
            {todayPhase.name} {todayMoon.ascending ? '↑' : '↓'}
          </span>
        </span>
      </button>

      {/* Logging streak — celebrates consistency, nudges users back */}
      {streak > 0 && (
        <button className="streak-chip" onClick={onAddWine}>
          <Fire size={16} weight="fill" style={{ verticalAlign: '-0.18em' }} /> <strong>{streak}-week streak</strong>
          <span>{streak === 1 ? 'Logged this week — nice!' : 'Log a wine this week to keep it going'}</span>
        </button>
      )}

      {/* Tonight from your cellar — gentle reminder of a bottle the user
          owns. One tap pre-fills the log form; dismiss snoozes it. */}
      <TonightCard currentUser={currentUser} onLog={onRelog} />

      {/* Feed mode toggle */}
      <div className="feed-mode-toggle">
        <button className={`feed-mode-btn${feedMode === 'explore' ? ' active' : ''}`} onClick={() => switchMode('explore')}>
          {t('feed.explore')}
        </button>
        <button className={`feed-mode-btn${feedMode === 'following' ? ' active' : ''}`} onClick={() => switchMode('following')}>
          {t('feed.following')}
        </button>
      </div>

      {/* Natural-wine filter — organic / biodynamic only. Serves the niche. */}
      <div className="feed-filter-row">
        <button
          className={`feed-filter-chip${green ? ' active' : ''}`}
          onClick={() => setGreen(g => !g)}
          aria-pressed={green}
        >
          <Plant size={14} weight="fill" style={{ verticalAlign: '-0.12em' }} /> Natural only
        </button>
      </div>

      {/* Feed — keyed by mode so switching plays the gentle fade-in */}
      <div className="feed-list" key={feedMode}>
        {loading && <SkeletonCard count={3} />}
        {!loading && wines.length === 0 && (
          <div className="empty-feed">
            {feedMode === 'following'
              ? <>
                  <p><Users size={16} weight="fill" style={{ verticalAlign: '-0.18em' }} /> Your Following feed is empty</p>
                  <p style={{fontSize:'0.85rem',color:'var(--text-muted)',marginTop:'0.5rem'}}>
                    {suggestions.length > 0 ? 'Follow someone to fill it up:' : 'Find people via search and follow them!'}
                  </p>
                  {suggestions.length > 0 && (
                    <div className="follow-suggestions">
                      {suggestions.map(u => (
                        <div key={u.id} className="fs-card">
                          <button className="fs-user" onClick={() => onUserClick(u.id)}>
                            {u.avatar_path
                              ? <img className="fs-avatar" src={`${API}${u.avatar_path}`} alt="" loading="lazy" decoding="async" />
                              : <span className="fs-avatar fs-avatar-fallback">{u.username.slice(0, 2).toUpperCase()}</span>
                            }
                            <span className="fs-info">
                              <span className="fs-name">@{u.username}{u.is_ambassador ? <AmbassadorBadge size={13} /> : null}</span>
                              {u.match != null && <span className="fs-match"><Dna size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> {u.match}% taste match</span>}
                              {u.reason && <span className="fs-reason">{u.reason}</span>}
                              <span className="fs-meta">{u.post_count} {u.post_count === 1 ? 'post' : 'posts'} · {u.follower_count} {u.follower_count === 1 ? 'follower' : 'followers'}</span>
                            </span>
                          </button>
                          <button className="fs-follow-btn" onClick={() => handleFollow(u.id)}>Follow</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              : <><p><WineTypeIcon type="Red" size={16} /> No wines found.</p><button className="btn-primary" onClick={onAddWine}>Log your first wine</button></>
            }
          </div>
        )}
        {wines.map((w, i) => (
          <div key={w.id}>
            <WineCard wine={w} currentUser={currentUser} onDelete={handleDelete} onRelog={onRelog} onUserClick={onUserClick} onWineClick={onWineClick} onWineryClick={onWineryClick} />
            {feedMode === 'explore' && i === pymkInsertAt - 1 && suggestionsLoaded && suggestions.length > 0 && (
              <div className="pymk-section">
                <div className="pymk-header">
                  <span className="pymk-title">{t('feed.pymk')}</span>
                </div>
                <div className="pymk-scroll">
                  {suggestions.map(u => (
                    <div key={u.id} className="pymk-card">
                      <button className="pymk-user" onClick={() => onUserClick(u.id)}>
                        {u.avatar_path
                          ? <img className="pymk-avatar" src={`${API}${u.avatar_path}`} alt="" loading="lazy" decoding="async" />
                          : <span className="pymk-avatar pymk-avatar-fallback">{u.username.slice(0, 2).toUpperCase()}</span>
                        }
                        <span className="pymk-name">@{u.username}{u.is_ambassador ? <AmbassadorBadge size={13} /> : null}</span>
                        {u.match != null && <span className="pymk-match"><Dna size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> {u.match}% match</span>}
                        {u.reason && <span className="pymk-reason">{u.reason}</span>}
                        <span className="pymk-meta">{u.post_count} {u.post_count === 1 ? 'post' : 'posts'}</span>
                      </button>
                      <button className="pymk-follow-btn" onClick={() => handleFollow(u.id)}>Follow</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {/* Infinite-scroll sentinel + spinner */}
        {!loading && wines.length > 0 && (
          <div ref={sentinelRef} className="feed-sentinel">
            {loadingMore && <SkeletonCard count={1} />}
            {!hasMore && <p className="feed-end">You're all caught up.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
