import { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { Heart, ChatCircle, UserPlus, Handshake, Repeat, Factory, Bell } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';
import AmbassadorBadge from './AmbassadorBadge.jsx';

const API = '';
const NI = { size: 16, weight: 'fill' };

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr + 'Z').getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifRow({ n, selfId, onUserClick, onWineClick, onWineryClick, onDelete }) {
  const actor = { username: n.actor_username, avatar_path: n.actor_avatar };

  // Inner links call stopPropagation so they win over the whole-row tap
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  // Swipe-left to reveal a Delete button (touch + mouse via pointer events).
  const [dx, setDx] = useState(0);
  const cur = useRef(0); const base = useRef(0); const start = useRef(null); const moved = useRef(false);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const setOffset = (v) => { cur.current = v; setDx(v); };
  const down = (e) => { start.current = e.clientX; moved.current = false; };
  const move = (e) => {
    if (start.current == null) return;
    const d = e.clientX - start.current;
    if (Math.abs(d) > 4) moved.current = true;
    setOffset(clamp(base.current + d, -88, 0));
  };
  const up = () => {
    if (start.current == null) return;
    start.current = null;
    const snap = cur.current < -44 ? -84 : 0;
    base.current = snap; setOffset(snap);
  };
  const closeSwipe = () => { base.current = 0; setOffset(0); };

  // The actor's name — tapping it always goes to their profile.
  const actorEl = (
    <button type="button" className="notif-actor" onClick={stop(() => onUserClick?.(n.actor_id))}>
      @{n.actor_username}{n.actor_is_ambassador ? <AmbassadorBadge size={12} /> : null}
    </button>
  );

  let icon, text;
  if (n.type === 'like') {
    icon = <Heart {...NI} color="#c0392b" />;
    text = <>{actorEl} liked your wine <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name }))}><WineTypeIcon type="Red" size={14} /> {n.wine_name}</button></>;
  } else if (n.type === 'comment') {
    icon = <ChatCircle {...NI} color="#4f86d6" />;
    text = <>{actorEl} commented on <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name }))}><WineTypeIcon type="Red" size={14} /> {n.wine_name}</button>{n.message && <span className="notif-comment-preview"> "{n.message}"</span>}</>;
  } else if (n.type === 'follow') {
    icon = <UserPlus {...NI} />;
    text = <>{actorEl} started following you</>;
  } else if (n.type === 'follow_request') {
    icon = <UserPlus {...NI} />;
    text = <>{actorEl} requested to follow you <span className="notif-comment-preview">· tap to review</span></>;
  } else if (n.type === 'follow_accept') {
    icon = <Handshake {...NI} />;
    text = <>{actorEl} accepted your follow request</>;
  } else if (n.type === 'tag') {
    icon = <WineTypeIcon type="Red" size={16} />;
    text = <>{actorEl} tagged you in <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name }))}>{n.wine_name}</button></>;
  } else if (n.type === 'repost') {
    icon = <Repeat {...NI} color="#2f9e9e" />;
    text = <>{actorEl} reposted your wine <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name }))}><WineTypeIcon type="Red" size={14} /> {n.wine_name}</button></>;
  } else if (n.type === 'winery_review') {
    // message holds the winery name; wine_name holds the reviewed wine.
    icon = <Factory {...NI} />;
    text = <>{actorEl} reviewed <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name, winery: n.message }))}><WineTypeIcon type="Red" size={14} /> {n.wine_name}</button> from <button className="notif-wine-link" onClick={stop(() => onWineryClick?.(n.message))}><Factory size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> {n.message}</button></>;
  }

  // Whole-row tap → the notification's primary subject. Suppressed while/after a
  // swipe; if the delete panel is open, a tap just closes it.
  const handleRowClick = () => {
    if (moved.current) { moved.current = false; return; }  // ignore the click synthesized after a swipe
    if (cur.current !== 0) { closeSwipe(); return; }        // a real tap on an open row closes it

    if (n.type === 'follow_request') return onUserClick?.(selfId);     // your profile = where you accept
    if (n.type === 'follow' || n.type === 'follow_accept') return onUserClick?.(n.actor_id);
    if (n.type === 'winery_review') return onWineClick?.({ name: n.wine_name, winery: n.message });
    if (n.wine_name) return onWineClick?.({ name: n.wine_name });
  };

  return (
    <div className="notif-swipe">
      <div className="notif-actions">
        <button className="notif-act-delete" onClick={() => onDelete(n.id)}>Delete</button>
      </div>
      <div
        className={`notif-row${n.is_read ? '' : ' unread'}`}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={handleRowClick}
      >
        <button className="notif-avatar-btn" onClick={stop(() => onUserClick?.(n.actor_id))}>
          <Avatar user={actor} size={38} />
        </button>
        <div className="notif-body">
          <span className="notif-icon">{icon}</span>
          <span className="notif-text">{text}</span>
          <span className="notif-time">{timeAgo(n.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Notifications({ currentUser, onBack, onUserClick, onWineClick, onWineryClick }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  const deleteNotif = async (id) => {
    const token = localStorage.getItem('sipiary_token');
    await fetch(`${API}/api/notifications/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs(ns => ns.filter(n => n.id !== id));
  };

  useEffect(() => {
    const token = localStorage.getItem('sipiary_token');
    const auth  = { Authorization: `Bearer ${token}` };
    fetch(`${API}/api/notifications`, { headers: auth })
      .then(r => r.json())
      .then(d => { setNotifs(Array.isArray(d) ? d : []); setLoading(false); });
    fetch(`${API}/api/notifications/read`, { method: 'POST', headers: auth });
  }, [currentUser.id]);

  return (
    <div className="notif-page">
      <h2 className="notif-title"><Bell size={20} weight="fill" style={{ verticalAlign: '-0.18em' }} /> Notifications</h2>

      {loading && <p className="loading-state">Loading…</p>}
      {!loading && notifs.length === 0 && (
        <div className="notif-empty">
          <div className="notif-empty-art"><Bell size={44} weight="duotone" /></div>
          <p className="notif-empty-title">Nothing here yet</p>
          <p className="notif-empty-hint">Follow someone to see their posts, likes, and activity here.</p>
        </div>
      )}
      <div className="notif-list">
        {notifs.map(n => (
          <NotifRow key={n.id} n={n} selfId={currentUser?.id} onUserClick={onUserClick} onWineClick={onWineClick} onWineryClick={onWineryClick} onDelete={deleteNotif} />
        ))}
      </div>
    </div>
  );
}
