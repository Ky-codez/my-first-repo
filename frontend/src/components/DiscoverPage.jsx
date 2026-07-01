import { useState, useEffect, useRef } from 'react';
import WineCard from './WineCard.jsx';
import SkeletonCard from './SkeletonCard.jsx';
import TrendingCoverflow from './TrendingCoverflow.jsx';
import { Wine, Couch, Confetti, Heart, SunHorizon, Diamond, DiceFive, MagnifyingGlass, MapPin, Sparkle, Star, Plant } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';

const API = '';
const RECENT_KEY = 'sipiary_recent_searches';
const EMPTY = { users: [], wineries: [], grapes: [], regions: [], posts: [] };

const VIBES = [
  { key: null,       Icon: Wine,       label: 'All vibes'      },
  { key: 'cozy',     Icon: Couch,      label: 'Cozy night'     },
  { key: 'party',    Icon: Confetti,   label: 'Pre-game'       },
  { key: 'date',     Icon: Heart,      label: 'Date night'     },
  { key: 'sunset',   Icon: SunHorizon, label: 'Golden hour'    },
  { key: 'fancy',    Icon: Diamond,    label: 'Treat yourself' },
  { key: 'surprise', Icon: DiceFive,   label: 'Surprise me'    },
];

const BURST_ICONS = [Wine, Sparkle, Heart, Star, Diamond, Confetti];

function EmojiBurst({ burstId }) {
  const pieces = Array.from({ length: 8 }, (_, i) => ({
    Icon: BURST_ICONS[Math.floor(Math.random() * BURST_ICONS.length)],
    angle: (i / 8) * 360 + Math.random() * 30,
    dist:  90 + Math.random() * 70,
    delay: Math.random() * 0.1,
  }));
  return (
    <div className="vd-burst" key={burstId}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="vd-burst-piece"
          style={{ '--angle': `${p.angle}deg`, '--dist': `${p.dist}px`, animationDelay: `${p.delay}s` }}
        >
          <p.Icon size={20} weight="fill" color="#b06fd6" />
        </span>
      ))}
    </div>
  );
}

export default function DiscoverPage({ currentUser, onUserClick, onWineClick, onWineryClick }) {
  // ── Search state ──
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [recent,  setRecent]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
  });
  const inputRef = useRef(null);

  // ── Trending ──
  const [trending, setTrending] = useState([]);
  useEffect(() => {
    fetch(`${API}/api/wines/trending?currentUserId=${currentUser?.id || 0}`)
      .then(r => r.json())
      .then(d => setTrending(Array.isArray(d) ? d.slice(0, 3) : []))
      .catch(() => {});
  }, [currentUser]);

  // ── Recommendations ("For you" / tonight's pick) ──
  const [recs, setRecs] = useState(null);
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`${API}/api/wines/recommended?userId=${currentUser.id}`)
      .then(r => r.json())
      .then(d => setRecs(d && Array.isArray(d.wines) ? d : null))
      .catch(() => {});
  }, [currentUser]);

  // ── Vibe state ──
  const [vibe,    setVibe]    = useState(null);
  const [green,   setGreen]   = useState(false);   // natural-wine (organic/biodynamic) filter
  const [cards,   setCards]   = useState(null);
  const [topIdx,  setTopIdx]  = useState(0);
  const [drag,    setDrag]    = useState(null);
  const [leaving, setLeaving] = useState(null);
  const [burstId, setBurstId] = useState(0);
  const [toast,   setToast]   = useState('');
  const dragStart  = useRef(null);
  const dragPos    = useRef(null);
  const toastTimer = useRef(null);
  const chipsRef   = useRef(null);
  const chipDrag   = useRef(null);

  // ── Search: debounced ──
  useEffect(() => {
    if (!query.trim()) { setResults(EMPTY); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q: query.trim(), currentUserId: currentUser?.id || 0 });
      fetch(`${API}/api/search?${params}`)
        .then(r => r.json())
        .then(data => {
          setResults(data);
          setLoading(false);
          const isEmpty = data.users.length === 0 && data.wineries.length === 0 &&
            data.grapes.length === 0 && data.regions.length === 0 && data.posts.length === 0;
          if (isEmpty && query.trim().length >= 2) saveRecent(query.trim());
        })
        .catch(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, currentUser]);

  const readStored = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } };
  const saveRecent = (term) => {
    const next = [term, ...readStored().filter(r => r !== term)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setRecent(next);
  };
  const removeRecent = (term) => {
    const next = readStored().filter(r => r !== term);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setRecent(next);
  };
  const clearRecent = () => { setRecent([]); localStorage.removeItem(RECENT_KEY); };

  const handleDeletePost = async (id) => {
    await fetch(`${API}/api/wines/${id}`, { method: 'DELETE' });
    setResults(r => ({ ...r, posts: r.posts.filter(p => p.id !== id) }));
  };

  // ── Vibe deck ──
  const loadDeck = (v) => {
    setCards(null); setTopIdx(0);
    const params = new URLSearchParams({ userId: currentUser?.id || 0 });
    if (v) params.append('vibe', v);
    if (green) params.append('green', '1');
    fetch(`${API}/api/wines/discover?${params}`)
      .then(r => r.json())
      .then(d => setCards(Array.isArray(d) ? d : []))
      .catch(() => setCards([]));
  };

  useEffect(() => { loadDeck(vibe); /* eslint-disable-next-line */ }, [vibe, green]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  };

  const swipe = (direction) => {
    if (leaving || !cards || topIdx >= cards.length) return;
    const wine = cards[topIdx];
    setLeaving(direction);
    fetch(`${API}/api/wines/${wine.id}/swipe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, direction }),
    })
      .then(r => r.json())
      .then(d => {
        if (direction === 'right') {
          setBurstId(b => b + 1);
          showToast(d.savedToWishlist ? 'Added to your wishlist!' : 'Noted — you have taste');
        }
      })
      .catch(() => {});
    setTimeout(() => { setLeaving(null); setDrag(null); setTopIdx(i => i + 1); }, 280);
  };

  const onPointerDown = (e) => {
    if (leaving) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const onPointerMove = (e) => {
    if (!dragStart.current || leaving) return;
    const next = { dx: e.clientX - dragStart.current.x, dy: e.clientY - dragStart.current.y };
    dragPos.current = next;
    setDrag(next);
  };
  const onPointerUp = () => {
    if (!dragStart.current) return;
    dragStart.current = null;
    const dx = dragPos.current?.dx || 0;
    dragPos.current = null;
    if (dx > 90)       swipe('right');
    else if (dx < -90) swipe('left');
    else               setDrag(null);
  };

  const chipsDown = (e) => {
    const el = chipsRef.current;
    chipDrag.current = { startX: e.clientX, startScroll: el.scrollLeft };
    try { el.setPointerCapture(e.pointerId); } catch {}
  };
  const chipsMove = (e) => {
    const d = chipDrag.current;
    if (!d) return;
    chipsRef.current.scrollLeft = d.startScroll - (e.clientX - d.startX);
  };
  const chipsUp = () => { chipDrag.current = null; };

  const remaining    = cards ? cards.slice(topIdx, topIdx + 3) : [];
  const deckEmpty    = cards !== null && topIdx >= cards.length;
  const dx           = drag?.dx || 0;
  const likeOpacity  = Math.min(Math.max(dx / 90, 0), 1);
  const passOpacity  = Math.min(Math.max(-dx / 90, 0), 1);
  const hasQuery     = query.trim().length > 0;
  const noResults    = hasQuery && !loading &&
    results.users.length === 0 && results.wineries.length === 0 &&
    results.grapes.length === 0 && results.regions.length === 0 && results.posts.length === 0;

  return (
    <div className="discover-page">
      {/* Search bar — always visible */}
      <div className="discover-search-bar">
        <span className="discover-search-icon"><MagnifyingGlass size={18} /></span>
        <input
          ref={inputRef}
          className="discover-search-input"
          placeholder="Search wines, wineries, grapes, people…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          maxLength={100}
        />
        {query && <button className="discover-search-clear" onClick={() => setQuery('')}>×</button>}
      </div>

      {/* ── VIBE MODE (no query) ── */}
      {!hasQuery && (
        <>
          {/* Recommended for you — taste-matched picks + tonight's hero */}
          {recs && recs.wines.length > 0 && (
            <div className="discover-recs">
              {recs.tonight && (
                <button className="rec-tonight" onClick={() => onWineClick?.({ name: recs.tonight.name, winery: recs.tonight.winery })}>
                  <span className="rec-tonight-eyebrow"><WineTypeIcon type="Red" size={14} /> Tonight, try</span>
                  <span className="rec-tonight-name">{recs.tonight.name}</span>
                  <span className="rec-tonight-meta">
                    {[recs.tonight.winery, recs.tonight.type].filter(Boolean).join(' · ')}
                    {recs.tonight.reason ? ` — ${recs.tonight.reason}` : ''}
                  </span>
                </button>
              )}
              {recs.wines.length > 1 && (
                <>
                  <div className="trending-header">
                    <span className="trending-title">{recs.personalized ? 'Recommended for you' : 'Popular picks'}</span>
                    <span className="trending-sub">{recs.personalized ? 'Matched to your taste' : 'Try something new'}</span>
                  </div>
                  <div className="rec-row">
                    {recs.wines.slice(1).map(w => (
                      <button key={w.id} className="rec-chip" onClick={() => onWineClick?.({ name: w.name, winery: w.winery })}>
                        <span className="rec-chip-name"><WineTypeIcon type={w.type} size={15} /> {w.name}</span>
                        {w.reason && <span className="rec-chip-reason">{w.reason}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Trending this week */}
          {trending.length > 0 && (
            <div className="discover-trending">
              <div className="trending-header">
                <span className="trending-title">Trending this week</span>
                <span className="trending-sub">Most liked wines right now</span>
              </div>
              <TrendingCoverflow wines={trending} onWineClick={onWineClick} />
            </div>
          )}

          {/* Vibe chips */}
          <div className="vd-vibes-wrap">
            <div
              className="vd-vibes"
              ref={chipsRef}
              onPointerDown={chipsDown}
              onPointerMove={chipsMove}
              onPointerUp={chipsUp}
              onPointerCancel={chipsUp}
            >
              <button
                className={`vd-vibe-chip vd-green-chip${green ? ' active' : ''}`}
                onClick={() => setGreen(g => !g)}
                aria-pressed={green}
              >
                <Plant size={15} weight="fill" style={{ verticalAlign: '-0.18em' }} /> Natural
              </button>
              {VIBES.map(v => (
                <button
                  key={v.label}
                  className={`vd-vibe-chip${vibe === v.key ? ' active' : ''}`}
                  onClick={() => setVibe(v.key)}
                >
                  <v.Icon size={15} weight="fill" style={{ verticalAlign: '-0.18em' }} /> {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card stack */}
          <div className="vd-stack">
            {cards === null && (
              <div className="vd-skeleton">
                <div className="vd-sk-photo sk" />
                <div className="vd-sk-body">
                  <div className="sk sk-line" style={{ width: '60%' }} />
                  <div className="sk sk-line" style={{ width: '40%' }} />
                  <div className="sk sk-line" style={{ width: '80%' }} />
                </div>
              </div>
            )}

            {deckEmpty && (
              <div className="vd-empty">
                <span className="vd-empty-emoji"><Wine size={40} weight="fill" color="#b06fd6" /></span>
                <p>{vibe ? "That's every bottle for this vibe." : "You've seen every bottle for now."}</p>
                <p className="vd-empty-sub">
                  {vibe
                    ? 'See all wines instead, or check back as friends log more.'
                    : 'Check back as friends log more wines.'}
                </p>
                <div className="vd-empty-actions">
                  {vibe && <button className="vd-refresh-btn primary" onClick={() => setVibe(null)}><Wine size={15} weight="fill" style={{ verticalAlign: '-0.18em' }} /> Show all wines</button>}
                  <button className="vd-refresh-btn" onClick={() => loadDeck(vibe)}>↻ Check again</button>
                </div>
              </div>
            )}

            {remaining.map((wine, i) => {
              const isTop = i === 0;
              let style;
              if (isTop) {
                const rot = dx * 0.08;
                if (leaving === 'right')     style = { transform: 'translate(120vw, -8vh) rotate(30deg)',  transition: 'transform 0.28s ease-in' };
                else if (leaving === 'left') style = { transform: 'translate(-120vw, -8vh) rotate(-30deg)', transition: 'transform 0.28s ease-in' };
                else if (drag)              style = { transform: `translate(${dx}px, ${drag.dy * 0.4}px) rotate(${rot}deg)`, transition: 'none' };
                else                         style = { transform: 'none', transition: 'transform 0.2s ease-out' };
              } else {
                style = { transform: `translateY(${i * 10}px) scale(${1 - i * 0.04})`, transition: 'transform 0.25s ease' };
              }
              return (
                <div
                  key={wine.id}
                  className={`vd-card${isTop ? ' top' : ''}`}
                  style={{ ...style, zIndex: 10 - i }}
                  onPointerDown={isTop ? onPointerDown : undefined}
                  onPointerMove={isTop ? onPointerMove : undefined}
                  onPointerUp={isTop ? onPointerUp : undefined}
                >
                  {wine.image_path
                    ? <img className="vd-card-img" src={`${API}${wine.image_path}`} alt="" draggable="false" decoding="async" />
                    : <div className={`vd-card-placeholder vd-ph-${(wine.type || 'Red').toLowerCase().replace(/[^a-z]/g, '')}`}>
                        <span className="vd-ph-emoji">
                          <WineTypeIcon type={wine.type} size={56} />
                        </span>
                      </div>
                  }
                  <div className="vd-card-shade" />
                  {isTop && (
                    <>
                      <span className="vd-stamp vd-stamp-like" style={{ opacity: likeOpacity }}>I'D DRINK THIS</span>
                      <span className="vd-stamp vd-stamp-pass" style={{ opacity: passOpacity }}>PASS</span>
                    </>
                  )}
                  <div className="vd-card-info">
                    <h3 className="vd-card-name">{wine.name}</h3>
                    <p className="vd-card-meta">{wine.winery}{wine.vintage ? ` · ${wine.vintage}` : ''}</p>
                    <div className="vd-card-tags">
                      <span className="vd-tag">{wine.type}</span>
                      {wine.rating   ? <span className="vd-tag">★ {Number(wine.rating).toFixed(1)}</span> : null}
                      {wine.like_count > 0 && <span className="vd-tag"><Heart size={12} weight="fill" style={{ verticalAlign: '-0.1em' }} /> {wine.like_count}</span>}
                    </div>
                    {wine.notes && !wine.notes.startsWith('{') && (
                      <p className="vd-card-notes">"{wine.notes}"</p>
                    )}
                    <p className="vd-card-by">logged by @{wine.username}</p>
                  </div>
                </div>
              );
            })}

            {burstId > 0 && <EmojiBurst burstId={burstId} />}
          </div>

          {/* Swipe action buttons */}
          {!deckEmpty && cards !== null && cards.length > 0 && (
            <div className="vd-actions">
              <button className="vd-action-btn vd-pass" onClick={() => swipe('left')} title="Pass">✕</button>
              <button className="vd-action-btn vd-like" onClick={() => swipe('right')} title="I'd drink this"><WineTypeIcon type="Red" size={24} /></button>
            </div>
          )}

          {toast && <div className="vd-toast">{toast}</div>}
        </>
      )}

      {/* ── SEARCH MODE (has query) ── */}
      {hasQuery && (
        <div className="search-results">
          {loading && <SkeletonCard />}

          {noResults && (
            <div className="search-empty-hint">
              <p><WineTypeIcon type="Red" size={16} /> Nothing found for "{query.trim()}"</p>
              <p className="sehp-sub">Try a different spelling or a shorter word.</p>
            </div>
          )}

          {results.users.length > 0 && (
            <section className="sr-section">
              <span className="sr-section-title">People</span>
              {results.users.map(u => (
                <button key={u.id} className="sr-row" onClick={() => { saveRecent(query.trim()); onUserClick(u.id); }}>
                  {u.avatar_path
                    ? <img className="sr-avatar" src={`${API}${u.avatar_path}`} alt="" loading="lazy" decoding="async" />
                    : <span className="sr-avatar sr-avatar-fallback">{u.username.slice(0, 2).toUpperCase()}</span>
                  }
                  <span className="sr-row-label">@{u.username}</span>
                  <span className="sr-row-arrow">›</span>
                </button>
              ))}
            </section>
          )}

          {results.wineries.length > 0 && (
            <section className="sr-section">
              <span className="sr-section-title">Wineries</span>
              {results.wineries.map(w => (
                <button key={w.name} className="sr-row" onClick={() => { saveRecent(query.trim()); onWineryClick(w.name); }}>
                  <span className="sr-row-icon"><WineTypeIcon type="Red" size={16} /></span>
                  <span className="sr-row-label">{w.name}</span>
                  <span className="sr-row-count">{w.post_count} {w.post_count === 1 ? 'post' : 'posts'}</span>
                  <span className="sr-row-arrow">›</span>
                </button>
              ))}
            </section>
          )}

          {(results.grapes.length > 0 || results.regions.length > 0) && (
            <section className="sr-section">
              {results.grapes.length > 0 && (
                <>
                  <span className="sr-section-title">Grapes</span>
                  <div className="sr-chips">
                    {results.grapes.map(g => (
                      <button key={g} className="sr-chip sr-chip-grape" onClick={() => { saveRecent(g); setQuery(g); }}>{g}</button>
                    ))}
                  </div>
                </>
              )}
              {results.regions.length > 0 && (
                <>
                  <span className="sr-section-title">Regions</span>
                  <div className="sr-chips">
                    {results.regions.map(r => (
                      <button key={r.name} className="sr-chip sr-chip-region" onClick={() => { saveRecent(r.name); setQuery(r.name); }}><MapPin size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> {r.name}</button>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {results.posts.length > 0 && (
            <section className="sr-section">
              <span className="sr-section-title">Posts</span>
              <div className="feed-list">
                {results.posts.map(w => (
                  <WineCard
                    key={w.id}
                    wine={w}
                    currentUser={currentUser}
                    onDelete={handleDeletePost}
                    onUserClick={id => { saveRecent(query.trim()); onUserClick(id); }}
                    onWineClick={b => { saveRecent(query.trim()); onWineClick(b); }}
                    onWineryClick={n => { saveRecent(query.trim()); onWineryClick(n); }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Recent searches — shown when idle and history exists */}
      {!hasQuery && recent.length > 0 && deckEmpty && (
        <div className="search-results">
          <section className="sr-section">
            <div className="sr-section-head">
              <span className="sr-section-title">Recent searches</span>
              <button className="sr-clear-recent" onClick={clearRecent}>Clear all</button>
            </div>
            {recent.map(term => (
              <div key={term} className="sr-row sr-row-recent" onClick={() => setQuery(term)}>
                <span className="sr-row-icon"><MagnifyingGlass size={16} /></span>
                <span className="sr-row-label">{term}</span>
                <button className="sr-row-remove" onClick={e => { e.stopPropagation(); removeRecent(term); }}>×</button>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
