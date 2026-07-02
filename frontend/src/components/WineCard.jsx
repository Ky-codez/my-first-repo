import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import Avatar from './Avatar.jsx';
import AddWine from './AddWine.jsx';
import ShareModal from './ShareModal.jsx';
import { getMoonInfo, TYPE_INFO, PHASE_INFO, ASCENDING_INFO } from '../utils/moonCalendar.js';
import { parseSAT, PRIMARY_LABELS } from './TastingNotes.jsx';
import { regionFlag, cleanLocation } from '../utils/regionFlags.js';
import { useLang, LANG_NAMES } from '../i18n.jsx';
import { Heart, ChatCircle, Repeat, ShareNetwork, NotePencil, BookmarkSimple, Fire, Lock, Globe, PencilSimple, MapPin, Plant, Leaf, Champagne } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';
import AmbassadorBadge from './AmbassadorBadge.jsx';

// Renders the wine photo in a portrait (4:5) frame, Vivino-style.
// If the owner framed the photo (PhotoAdjust), that exact region fills the
// frame. Otherwise the whole photo stays visible with a blurred copy filling
// the space around it so the tall frame never shows empty bars.
// The stored DB defaults (17, 0, 65, 87) mean "never adjusted".
function WineImage({ src, fx, fy, fw, fh }) {
  // Fade the photo in once it decodes — avoids a hard pop on slow connections.
  const [loaded, setLoaded] = useState(false);
  const onLoad = () => setLoaded(true);
  const valid =
    [fx, fy, fw, fh].every(v => typeof v === 'number') &&
    fw > 0 && fh > 0 &&
    fx >= 0 && fy >= 0 &&
    fx + fw <= 100 && fy + fh <= 100;
  const adjusted = valid && !(fx === 17 && fy === 0 && fw === 65 && fh === 87);
  if (adjusted) {
    return (
      <div className="wc-image-wrap focal">
        <img
          src={src} alt="" className={`wc-image-focal img-fade${loaded ? ' loaded' : ''}`}
          loading="lazy" decoding="async" onLoad={onLoad}
          style={{
            width:  `${10000 / fw}%`,
            height: `${10000 / fh}%`,
            left:   `${(-fx * 100) / fw}%`,
            top:    `${(-fy * 100) / fh}%`,
          }}
        />
      </div>
    );
  }
  return (
    <div className="wc-image-wrap">
      <img src={src} aria-hidden="true" className="wc-image-bg" loading="lazy" decoding="async" />
      <img src={src} alt="" className={`wc-image-img img-fade${loaded ? ' loaded' : ''}`}
           loading="lazy" decoding="async" onLoad={onLoad} />
    </div>
  );
}

const API = '';

// ─── Shared cellar cache ─────────────────────────────────────────────────────
// One GET /api/cellar per user per page load, shared by every card. Each card
// used to fire its own /api/cellar/check on mount — 40+ requests per feed
// render. Matching is the same as the old endpoint: exact name + winery
// (empty string when null). Mutations invalidate the cache so the next mount
// refetches.
let cellarCache = { userId: null, promise: null };
function fetchCellar(userId) {
  if (cellarCache.userId !== userId || !cellarCache.promise) {
    cellarCache = {
      userId,
      promise: fetch(`${API}/api/cellar`).then(r => (r.ok ? r.json() : [])).catch(() => []),
    };
  }
  return cellarCache.promise;
}
const invalidateCellar = () => { cellarCache = { userId: null, promise: null }; };
const WINE_TYPE_COLORS = {
  Red: '#e74c3c', White: '#f1c40f', 'Rosé': '#e91e8c',
  Sparkling: '#3498db', Champagne: '#d4af37', Dessert: '#e67e22',
  Fortified: '#9b59b6', Spirit: '#8d6e63',
};
// Gold and amber backgrounds need dark text for contrast; the rest take white
const WINE_TYPE_TEXT = {
  Red: '#fff', White: '#3a2e00', 'Rosé': '#fff',
  Sparkling: '#fff', Champagne: '#3a2e00', Dessert: '#fff',
  Fortified: '#fff', Spirit: '#fff',
};

// Vivino-style rating: prominent score number first, stars as support
function Stars({ value }) {
  return (
    <span className="rating-display">
      <span className="rating-score">{Number(value).toFixed(1)}</span>
      <span className="stars-display">
        {[1,2,3,4,5].map(n => (
          <span key={n} style={{ color: n <= value ? 'var(--rating)' : 'var(--rating-empty)' }}>★</span>
        ))}
      </span>
    </span>
  );
}

function WineCard({ wine: initialWine, currentUser, onDelete, onRelog, onUserClick, onWineClick, onWineryClick, rank }) {
  const [wine,           setWine]           = useState(initialWine);
  const [liked,          setLiked]          = useState(!!initialWine.user_liked);
  const [likeCount,      setLikeCount]      = useState(initialWine.like_count || 0);
  const [reposted,       setReposted]       = useState(!!initialWine.user_reposted);
  const [repostCount,    setRepostCount]    = useState(initialWine.repost_count || 0);
  const [showComments,   setShowComments]   = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false); // Instagram-style "view all"
  const [comments,       setComments]       = useState(null);
  const [newComment,     setNewComment]     = useState('');
  const [posting,        setPosting]        = useState(false);
  const [editingComment,   setEditingComment]   = useState(null); // { id, text }
  const [editText,         setEditText]         = useState('');
  const [confirmDeleteId,  setConfirmDeleteId]  = useState(null);
  const [editing,        setEditing]        = useState(false);
  const [sharing,        setSharing]        = useState(false);
  const [cellarItem,     setCellarItem]     = useState(null);
  const [showSavePicker, setShowSavePicker] = useState(false);
  // AI translation of plain-text tasting notes
  const { t, lang } = useLang();
  const [translation,     setTranslation]     = useState(null);   // translated text
  const [showTranslated,  setShowTranslated]  = useState(false);
  const [translating,     setTranslating]     = useState(false);

  const translateNotes = async () => {
    if (translation) { setShowTranslated(s => !s); return; }
    setTranslating(true);
    try {
      const res  = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: wine.notes, target: LANG_NAMES[lang] || 'English' }),
      });
      const data = await res.json();
      if (data.translation) { setTranslation(data.translation); setShowTranslated(true); }
    } catch {}
    setTranslating(false);
  };
  // 3D flip: continuous angle so the card can be dragged around with a
  // finger/cursor. Tap = +180°. Release mid-drag settles to nearest face.
  const [flipAngle,    setFlipAngle]    = useState(0);
  const [flipDragging, setFlipDragging] = useState(false);
  const flipDrag     = useRef(null); // { startX, startAngle, moved }
  const flipAngleRef = useRef(0);   // live angle without stale-closure issues

  const flipDown = (e) => {
    // Sensitivity is relative to the card width so it feels the same on a phone
    // or a wide desktop. A swipe of ~38% of the card width completes a flip, and
    // the card commits to the next face once dragged ~19% — an easy, short flick
    // either direction. (A fixed px factor needed ~600px, impossible on mobile.)
    const width = e.currentTarget.offsetWidth || 360;
    const k = 180 / (width * 0.38);
    flipDrag.current = { startX: e.clientX, startAngle: flipAngleRef.current, moved: false, k };
    setFlipDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const flipMove = (e) => {
    const d = flipDrag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 8) d.moved = true;
    const next = d.startAngle + dx * d.k;
    flipAngleRef.current = next;
    setFlipAngle(next);
  };
  const flipUp = () => {
    const d = flipDrag.current;
    if (!d) return;
    flipDrag.current = null;
    setFlipDragging(false);
    // Only a real drag flips — a plain tap does nothing, so scrolling the feed
    // on mobile (which fires a tap on release) never flips a card by accident.
    if (!d.moved) return;
    const snapAngle = Math.round(flipAngleRef.current / 180) * 180;
    flipAngleRef.current = snapAngle;
    // Enable transition first, then change angle in the next frame so the
    // browser sees a "before" state and animates only the remaining distance.
    requestAnimationFrame(() => setFlipAngle(snapAngle));
  };

  // Load cellar status from the shared per-user cache (see fetchCellar above)
  useEffect(() => {
    if (!currentUser) return;
    let on = true;
    fetchCellar(currentUser.id).then(items => {
      if (!on) return;
      setCellarItem(items.find(i => i.name === wine.name && (i.winery || '') === (wine.winery || '')) || null);
    });
    return () => { on = false; };
  }, [currentUser?.id, wine.name, wine.winery]);

  const saveToList = async (list) => {
    setShowSavePicker(false);
    invalidateCellar();   // cache is stale after any mutation
    if (cellarItem) {
      if (cellarItem.list === list) {
        // Remove
        await fetch(`${API}/api/cellar/${cellarItem.id}`, { method: 'DELETE' });
        setCellarItem(null);
      } else {
        // Move to other list
        const res = await fetch(`${API}/api/cellar/${cellarItem.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ list, notes: cellarItem.notes }),
        });
        setCellarItem(await res.json());
      }
    } else {
      const res = await fetch(`${API}/api/cellar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, name: wine.name, winery: wine.winery, vintage: wine.vintage, type: wine.type, list }),
      });
      setCellarItem(await res.json());
    }
  };

  const isOwner  = currentUser?.id === wine.user_id;
  // Use opened_at for moon badge (when bottle was actually opened); fall back to created_at
  const moonDate  = wine.opened_at || wine.created_at;
  const moonInfo  = moonDate ? getMoonInfo(new Date(moonDate.slice(0,10) + 'T12:00:00')) : null;
  const moonType  = moonInfo ? TYPE_INFO[moonInfo.type]   : null;
  const moonPhase = moonInfo ? PHASE_INFO[moonInfo.phase] : null;
  const moonAsc   = moonInfo ? ASCENDING_INFO[moonInfo.ascending ? 'ascending' : 'descending'] : null;
  const badgeColor = WINE_TYPE_COLORS[wine.type] || '#aaa';

  const toggleRepost = async () => {
    if (!currentUser) return;
    const prev = { reposted, repostCount };
    setReposted(!reposted);
    setRepostCount(c => reposted ? c - 1 : c + 1);
    try {
      const res  = await fetch(`${API}/api/wines/${wine.id}/repost`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id }),
      });
      const data = await res.json();
      setReposted(data.reposted);
      setRepostCount(data.repostCount);
    } catch {
      setReposted(prev.reposted); setRepostCount(prev.repostCount);
    }
  };

  const toggleLike = async () => {
    if (!currentUser) return;
    const prev = { liked, likeCount };
    setLiked(!liked);
    setLikeCount(c => liked ? c - 1 : c + 1);
    try {
      const res  = await fetch(`${API}/api/wines/${wine.id}/like`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id }),
      });
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(prev.liked); setLikeCount(prev.likeCount);
    }
  };

  const loadComments = async () => {
    if (comments !== null) { setShowComments(v => !v); setCommentsExpanded(false); return; }
    const res  = await fetch(`${API}/api/wines/${wine.id}/comments`);
    const data = await res.json();
    setComments(data);
    setShowComments(true);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    setPosting(true);
    const res     = await fetch(`${API}/api/wines/${wine.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, text: newComment }),
    });
    const comment = await res.json();
    setComments(c => [...(c || []), comment]);
    setNewComment('');
    setPosting(false);
  };

  const deleteComment = async (commentId) => {
    const token = localStorage.getItem('sipiary_token');
    await fetch(`${API}/api/comments/${commentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setComments(c => c.filter(x => x.id !== commentId));
  };

  const saveEditComment = async (commentId) => {
    if (!editText.trim()) return;
    const token = localStorage.getItem('sipiary_token');
    const res  = await fetch(`${API}/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: editText }),
    });
    const updated = await res.json();
    setComments(c => c.map(x => x.id === commentId ? { ...x, text: updated.text } : x));
    setEditingComment(null);
    setEditText('');
  };

  return (
    <div className="wine-card" style={{ borderTop: `4px solid ${badgeColor}` }}>
      {/* Repost banner */}
      {wine.reposted_by && (
        <div className="wc-repost-banner">
          <Repeat size={14} weight="bold" style={{ verticalAlign: '-0.15em' }} /> <strong>@{wine.reposted_by}</strong> reposted
        </div>
      )}
      {/* Trending banner — why this post is ranked */}
      {rank != null && (
        <div className={`wc-trending-banner${rank < 3 ? ' top' : ''}`}>
          <span className="wc-trending-rank"><Fire size={14} weight="fill" style={{ verticalAlign: '-0.15em' }} /> #{rank + 1}</span>
          <span className="wc-trending-why">
            {wine.like_count > 0 && <><Heart size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> {wine.like_count} {wine.like_count === 1 ? 'like' : 'likes'}</>}
            {wine.like_count > 0 && wine.comment_count > 0 && ' · '}
            {wine.comment_count > 0 && <><ChatCircle size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> {wine.comment_count} {wine.comment_count === 1 ? 'comment' : 'comments'}</>}
            {(wine.like_count > 0 || wine.comment_count > 0) && wine.trend_window ? ` ${wine.trend_window}` : ''}
          </span>
        </div>
      )}
      {/* Header */}
      <div className="wc-header">
        <button className="wc-user-btn" onClick={() => onUserClick?.(wine.user_id)}>
          <Avatar user={{ username: wine.username, avatar_path: wine.avatar_path }} size={38} />
          <div>
            <span className="wc-username">@{wine.username}{wine.is_ambassador ? <AmbassadorBadge size={15} /> : null}</span>
            <span className="wc-date">
              {wine.opened_at
                ? <>Opened {wine.opened_at}</>
                : wine.created_at?.slice(0, 10)}
            </span>
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {wine.is_private ? <span className="wc-private-badge"><Lock size={12} weight="fill" style={{ verticalAlign: '-0.12em' }} /> Private</span> : null}
          <span className="wc-type-badge" style={{ background: badgeColor, color: WINE_TYPE_TEXT[wine.type] || '#fff' }}>
            {wine.type}
          </span>
          {isOwner && (
            <>
              <button
                className={`wc-privacy-btn${wine.is_private ? ' private' : ''}`}
                title={wine.is_private ? 'Private — only you can see this' : 'Public — visible to everyone'}
                onClick={async () => {
                  const token = localStorage.getItem('sipiary_token');
                  const res = await fetch(`/api/wines/${wine.id}/privacy`, {
                    method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
                  });
                  const data = await res.json();
                  setWine(w => ({ ...w, is_private: data.is_private }));
                }}
              >
                {wine.is_private ? <Lock size={16} weight="fill" /> : <Globe size={16} />}
              </button>
              <button className="wc-edit" onClick={() => setEditing(true)} title="Edit"><PencilSimple size={16} /></button>
            </>
          )}
        </div>
      </div>

      {/* Wine image — tap to flip over to the tasting-card back */}
      {wine.image_path && (() => {
        const sat = parseSAT(wine.notes);
        const backTags = sat
          ? Object.entries(sat.primary || {}).filter(([, on]) => on).map(([k]) => PRIMARY_LABELS[k] || k)
          : [];
        // WSET shorthand line, the way students write it: "Acid M+ · Tannin M …"
        const sc = sat?.scales || {};
        const scaleBits = [
          sc.sweetness,
          sc.acidity  && `Acid ${sc.acidity}`,
          sc.tannin   && `Tannin ${sc.tannin}`,
          sc.body     && `${sc.body} body`,
          sc.finish   && `${sc.finish} finish`,
          sc.quality,
        ].filter(Boolean);
        // iOS Safari ignores backface-visibility, so we don't rely on it:
        // we explicitly fade each face in/out and swap them at the 90° edge-on
        // midpoint (where the card is invisible). During a drag the swap tracks
        // the live angle; on release it's delayed to the midpoint of the 0.55s
        // settle animation so the change is never visible.
        const normAngle = ((flipAngle % 360) + 360) % 360;
        const showBack  = normAngle > 90 && normAngle < 270;
        const faceTransition = flipDragging ? 'opacity 0s' : 'opacity 0s linear 0.275s';
        return (
          <div
            className="wc-flip"
            onPointerDown={flipDown}
            onPointerMove={flipMove}
            onPointerUp={flipUp}
            onPointerCancel={flipUp}
          >
            <div
              className="wc-flip-inner"
              style={{
                transform: `rotateY(${flipAngle}deg)`,
                WebkitTransform: `rotateY(${flipAngle}deg)`,
                transition: flipDragging ? 'none' : 'transform 0.55s cubic-bezier(0.35, 0.1, 0.25, 1)',
              }}
            >
              <div className="wc-flip-front" style={{ opacity: showBack ? 0 : 1, transition: faceTransition }}>
                <WineImage
                  src={`${API}${wine.image_path}`}
                  fx={wine.focal_x ?? 17}
                  fy={wine.focal_y ?? 0}
                  fw={wine.focal_w ?? 65}
                  fh={wine.focal_h ?? 87}
                />
                <span className="wc-flip-hint" title="Flip card">↻</span>
              </div>
              <div className="wc-flip-back" style={{ opacity: showBack ? 1 : 0, transition: faceTransition }}>
                <div className="wc-flip-back-inner">
                  <span className="wc-fb-label">Tasting Card</span>
                  <h4 className="wc-fb-name">{wine.name}</h4>
                  <p className="wc-fb-meta">
                    {wine.winery}{wine.vintage ? ` · ${wine.vintage}` : ''}{wine.type ? ` · ${wine.type}` : ''}
                  </p>
                  <div className="wc-fb-rating">{Number(wine.rating).toFixed(1)} <span className="wc-fb-stars">{'★'.repeat(Math.round(wine.rating))}</span></div>
                  {sat && backTags.length > 0 && (
                    <div className="wc-fb-tags">
                      {backTags.slice(0, 6).map(t => <span key={t} className="wc-fb-tag">{t}</span>)}
                    </div>
                  )}
                  {scaleBits.length > 0 && (
                    <p className="wc-fb-scales">{scaleBits.join(' · ')}</p>
                  )}
                  {!sat && wine.notes && <p className="wc-fb-notes">"{wine.notes}"</p>}
                  {!wine.notes && <p className="wc-fb-notes wc-fb-empty">No tasting notes yet</p>}
                  {moonType && (
                    <p className="wc-fb-moon">{moonType.emoji} {moonType.label} · {moonPhase.emoji} {moonPhase.name}</p>
                  )}
                  <span className="wc-fb-flip-back">↻ drag to flip back</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Wine details */}
      <div className="wc-body">
        <h3 className="wc-name">
          <button className="wc-name-btn" onClick={() => onWineClick?.({ name: wine.name, winery: wine.winery })}>
            <WineTypeIcon type={wine.type} size={18} /> {wine.name}
          </button>
        </h3>
        {wine.winery && (
          <p className="wc-winery">
            <button className="wc-winery-btn" onClick={() => onWineryClick?.(wine.winery)}>
              {wine.winery}
            </button>
            {wine.vintage ? ` · ${wine.vintage === 'NV' ? 'NV' : wine.vintage}` : ''}
          </p>
        )}

        {wine.tagged_users && (
          <p className="wc-tagged">
            with {wine.tagged_users.split(',').map((t, i, arr) => {
              const [id, uname] = t.split(':');
              return (
                <span key={id}>
                  <button className="wc-tagged-link" onClick={() => onUserClick?.(Number(id))}>@{uname}</button>
                  {i < arr.length - 1 ? ', ' : ''}
                </span>
              );
            })}
          </p>
        )}

        <div className="wc-meta-row">
          <Stars value={wine.rating} />
          {wine.location && (() => {
            const rf = regionFlag(wine.location);
            return (
              <span className="wc-meta">
                <MapPin size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> {rf ? cleanLocation(wine.location) : wine.location}
                {rf && <span className={`fi fi-${rf.iso} wc-flag`} title={rf.country} />}
              </span>
            );
          })()}
          {wine.grapes   && <span className="wc-meta">{wine.grapes}</span>}
          {!!wine.is_biodynamic && <span className="wc-badge bio"><Plant size={12} weight="fill" style={{ verticalAlign: '-0.12em' }} /> Biodynamic</span>}
          {!!wine.is_organic    && <span className="wc-badge org"><Leaf size={12} weight="fill" style={{ verticalAlign: '-0.12em' }} /> Organic</span>}
        </div>

        {wine.notes && (() => {
          const sat = parseSAT(wine.notes);
          if (!sat) return (
            <div className="wc-notes-wrap">
              <p className="wc-notes">
                "{showTranslated && translation ? translation : wine.notes}"
                {wine.updated_at && <span className="edited-tag">edited</span>}
              </p>
              {currentUser && (
                <button className="wc-translate-btn" onClick={translateNotes} disabled={translating}>
                  {translating ? t('translate.loading')
                    : showTranslated ? t('translate.original')
                    : t('translate.btn')}
                </button>
              )}
            </div>
          );

          // Collect all selected tags grouped by section
          const primary = [], secondary = [], tertiary = [];
          // Primary: follow SAT order using unified primary object
          Object.entries(sat.primary || {}).forEach(([key, on]) => {
            if (!on) return;
            // Show specific sub-items if any selected, otherwise show category label
            const subItems = Object.entries(sat.fruitItems || {})
              .filter(([k, v]) => v && k.startsWith(key + '__'))
              .map(([k]) => k.split('__')[1]);
            if (subItems.length) subItems.forEach(i => primary.push(i));
            else primary.push(PRIMARY_LABELS[key] || key);
          });
          if (sat.primaryCustom) primary.push(sat.primaryCustom);
          Object.entries(sat.secondary || {}).forEach(([k, v]) => {
            if (v) secondary.push(k.toUpperCase());
          });
          if (sat.secondaryCustom) secondary.push(sat.secondaryCustom);
          Object.entries(sat.tertiary || {}).forEach(([k, v]) => {
            if (v) tertiary.push(k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
          });
          if (sat.tertiaryCustom) tertiary.push(sat.tertiaryCustom);

          // WSET shorthand line: "Dry · Acid M+ · Tannin M · Full body · Long finish"
          const sc = sat.scales || {};
          const scLine = [
            sc.sweetness,
            sc.acidity && `Acid ${sc.acidity}`,
            sc.tannin  && `Tannin ${sc.tannin}`,
            sc.body    && `${sc.body} body`,
            sc.finish  && `${sc.finish} finish`,
            sc.quality,
          ].filter(Boolean).join(' · ');

          if (!primary.length && !secondary.length && !tertiary.length && !scLine) return null;
          return (
            <div className="wc-sat-notes">
              {scLine && <p className="wc-fb-scales">{scLine}</p>}
              {primary.length   > 0 && <div className="wc-sat-row"><span className="wc-sat-label primary">Primary</span>{primary.map(t   => <span key={t} className="wc-sat-tag primary">{t}</span>)}</div>}
              {secondary.length > 0 && <div className="wc-sat-row"><span className="wc-sat-label secondary">Secondary</span>{secondary.map(t => <span key={t} className="wc-sat-tag secondary">{t}</span>)}</div>}
              {tertiary.length  > 0 && <div className="wc-sat-row"><span className="wc-sat-label tertiary">Tertiary</span>{tertiary.map(t  => <span key={t} className="wc-sat-tag tertiary">{t}</span>)}</div>}
              {wine.updated_at && <span className="edited-tag">edited</span>}
            </div>
          );
        })()}

        {moonType && (
          <div className="wc-moon-row">
            <span className="wc-moon-pill" style={{ color: moonType.color,  borderColor: moonType.color  + '44', background: moonType.bg }}>
              {moonType.emoji} {moonType.label}
            </span>
            <span className="wc-moon-pill" style={{ color: moonPhase.color, borderColor: moonPhase.color + '44', background: '#0d0404' }}>
              {moonPhase.emoji} {moonPhase.name}
            </span>
            <span className="wc-moon-pill" style={{ color: moonAsc.color,   borderColor: moonAsc.color   + '44', background: '#0d0404' }}>
              {moonAsc.emoji} {moonAsc.label}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="wc-actions">
        {currentUser?.id === wine.user_id ? (
          /* Own wine — can't like yourself; show received likes read-only */
          <span className="wc-action-btn wc-action-static" title={`${likeCount} like${likeCount === 1 ? '' : 's'}`}>
            <Heart size={20} weight={likeCount > 0 ? 'fill' : 'regular'} color={likeCount > 0 ? '#e74c3c' : undefined} />
            {likeCount > 0 ? <span className="wc-action-count">{likeCount}</span> : null}
          </span>
        ) : (
          <button className={`wc-action-btn ${liked ? 'liked' : ''}`} onClick={toggleLike} title={liked ? 'Unlike' : 'Like'}>
            <Heart size={20} weight={liked ? 'fill' : 'regular'} />
            {likeCount > 0 ? <span className="wc-action-count">{likeCount}</span> : null}
          </button>
        )}
        <button className="wc-action-btn" onClick={loadComments} title="Comments">
          <ChatCircle size={20} />
          {wine.comment_count > 0 ? <span className="wc-action-count">{wine.comment_count}</span> : null}
        </button>
        {currentUser && currentUser.id !== wine.user_id && (
          <button className={`wc-action-btn${reposted ? ' reposted' : ''}`} onClick={toggleRepost} title={reposted ? 'Undo repost' : 'Repost'}>
            <Repeat size={20} weight={reposted ? 'bold' : 'regular'} />
            {repostCount > 0 ? <span className="wc-action-count">{repostCount}</span> : null}
          </button>
        )}
        <button className="wc-action-btn" onClick={() => setSharing(true)} title="Share">
          <ShareNetwork size={20} />
        </button>
        {onRelog && currentUser?.id === wine.user_id && (
          <button className="wc-action-btn" onClick={() => onRelog(wine)} title="Re-log this wine">
            <NotePencil size={20} />
          </button>
        )}
        {currentUser && (
          <div className="wc-save-wrap">
            <button
              className={`wc-action-btn${cellarItem ? ' saved' : ''}`}
              onClick={() => setShowSavePicker(v => !v)}
              title={cellarItem ? `Saved to ${cellarItem.list}` : 'Save'}
            >
              <BookmarkSimple size={20} weight={cellarItem ? 'fill' : 'regular'} />
            </button>
            {showSavePicker && (
              <div className="wc-save-picker">
                <button onClick={() => saveToList('wishlist')}>
                  <BookmarkSimple size={15} style={{ verticalAlign: '-0.15em' }} /> Want to Try {cellarItem?.list === 'wishlist' ? '✓' : ''}
                </button>
                <button onClick={() => saveToList('cellar')}>
                  <Champagne size={15} weight="fill" style={{ verticalAlign: '-0.15em' }} /> In My Cellar {cellarItem?.list === 'cellar' ? '✓' : ''}
                </button>
                {cellarItem && <button className="remove" onClick={() => saveToList(cellarItem.list)}>× Remove</button>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="wc-comments">
          {(comments || []).length === 0 && <p className="wc-no-comments">No comments yet. Be first!</p>}
          {(comments || []).length > 2 && !commentsExpanded && (
            <button className="wc-comments-more" onClick={() => setCommentsExpanded(true)}>
              View all {comments.length} comments
            </button>
          )}
          {(commentsExpanded ? (comments || []) : (comments || []).slice(0, 2)).map(c => (
            <div key={c.id} className="wc-comment">
              <Avatar user={{ username: c.username, avatar_path: c.avatar_path }} size={28} />
              <div className="wc-comment-body">
                <span className="wc-comment-user">@{c.username}{c.is_ambassador ? <AmbassadorBadge size={13} /> : null}</span>
                {editingComment?.id === c.id ? (
                  <div className="wc-comment-edit">
                    <input
                      className="wc-comment-edit-input"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditComment(c.id); if (e.key === 'Escape') { setEditingComment(null); setEditText(''); } }}
                      autoFocus
                    />
                    <div className="wc-comment-edit-actions">
                      <button className="wc-comment-save" onClick={() => saveEditComment(c.id)}>Save</button>
                      <button className="wc-comment-cancel" onClick={() => { setEditingComment(null); setEditText(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <span className="wc-comment-text">{c.text}{c.updated_at && <span className="edited-tag">edited</span>}</span>
                )}
              </div>
              {currentUser?.id === c.user_id && editingComment?.id !== c.id && (
                <div className="wc-comment-actions">
                  <button className="wc-comment-btn" title="Edit" onClick={() => { setEditingComment(c); setEditText(c.text); }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="wc-comment-btn wc-comment-del" title="Delete" onClick={() => setConfirmDeleteId(c.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
          {commentsExpanded && (comments || []).length > 2 && (
            <button className="wc-comments-more" onClick={() => setCommentsExpanded(false)}>Show fewer</button>
          )}
          {currentUser && (
            <form className="wc-comment-form" onSubmit={submitComment}>
              <Avatar user={currentUser} size={28} />
              <input
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button type="submit" disabled={posting || !newComment.trim()}>Post</button>
            </form>
          )}
        </div>
      )}

      {/* Delete comment confirmation */}
      {confirmDeleteId && (
        <div className="signout-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="signout-modal" onClick={e => e.stopPropagation()}>
            <p className="signout-title">Delete comment?</p>
            <p className="signout-sub">This can't be undone.</p>
            <div className="signout-actions">
              <button className="signout-confirm" onClick={() => { deleteComment(confirmDeleteId); setConfirmDeleteId(null); }}>Delete</button>
              <button className="signout-cancel" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal — rendered via portal so the card's transform doesn't clip it */}
      {sharing && createPortal(
        <ShareModal wine={wine} onClose={() => setSharing(false)} />,
        document.body
      )}

      {/* Edit modal */}
      {editing && (
        <AddWine
          currentUser={currentUser}
          wine={wine}
          onClose={() => setEditing(false)}
          onAdded={(updated) => {
            setWine(w => ({ ...w, ...updated, like_count: w.like_count, comment_count: w.comment_count }));
            setEditing(false);
          }}
          onDeleteWine={() => { onDelete(wine.id); setEditing(false); }}
        />
      )}
    </div>
  );
}

// Memoized: in a long feed, a state change in one card (or the parent) no longer
// re-renders every other card — only cards whose props actually changed.
export default memo(WineCard);
