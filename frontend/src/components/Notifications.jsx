import { useState, useEffect } from 'react';
import Avatar from './Avatar.jsx';

const API = '';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr + 'Z').getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifRow({ n, onUserClick, onWineClick, onWineryClick, onDelete }) {
  const actor = { username: n.actor_username, avatar_path: n.actor_avatar };

  // Inner links call stopPropagation so they win over the whole-row tap
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  let icon, text;
  if (n.type === 'like') {
    icon = '❤️';
    text = <><strong>@{n.actor_username}</strong> liked your wine <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name }))}>🍷 {n.wine_name}</button></>;
  } else if (n.type === 'comment') {
    icon = '💬';
    text = <><strong>@{n.actor_username}</strong> commented on <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name }))}>🍷 {n.wine_name}</button>{n.message && <span className="notif-comment-preview"> "{n.message}"</span>}</>;
  } else if (n.type === 'follow') {
    icon = '👤';
    text = <><strong>@{n.actor_username}</strong> started following you</>;
  } else if (n.type === 'repost') {
    icon = '🔁';
    text = <><strong>@{n.actor_username}</strong> reposted your wine <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name }))}>🍷 {n.wine_name}</button></>;
  } else if (n.type === 'winery_review') {
    // message holds the winery name; wine_name holds the reviewed wine.
    // Both are tappable: wine name ? wine page, winery name ? winery page.
    icon = '🏭';
    text = <><strong>@{n.actor_username}</strong> reviewed <button className="notif-wine-link" onClick={stop(() => onWineClick?.({ name: n.wine_name, winery: n.message }))}>🍷 {n.wine_name}</button> from <button className="notif-wine-link" onClick={stop(() => onWineryClick?.(n.message))}>🏭 {n.message}</button></>;
  }

  // Whole-row tap ? the notification's primary subject:
  // the wine for review-related types, the new follower's profile for follows.
  const handleRowClick = () => {
    if (n.type === 'follow') return onUserClick?.(n.actor_id);
    if (n.type === 'winery_review') return onWineClick?.({ name: n.wine_name, winery: n.message });
    if (n.wine_name) return onWineClick?.({ name: n.wine_name });
  };

  return (
    <div className={`notif-row${n.is_read ? '' : ' unread'}`} onClick={handleRowClick}>
      <button className="notif-avatar-btn" onClick={stop(() => onUserClick?.(n.actor_id))}>
        <Avatar user={actor} size={38} />
      </button>
      <div className="notif-body">
        <span className="notif-icon">{icon}</span>
        <span className="notif-text">{text}</span>
        <span className="notif-time">{timeAgo(n.created_at)}</span>
      </div>
      <button className="notif-delete" title="Delete notification" onClick={stop(() => onDelete(n.id))}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
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
      <h2 className="notif-title">🔔 Notifications</h2>

      {loading && <p className="loading-state">Loading…</p>}
      {!loading && notifs.length === 0 && (
        <div className="notif-empty">
          <div className="notif-empty-art">🔔</div>
          <p className="notif-empty-title">Nothing here yet</p>
          <p className="notif-empty-hint">Follow someone to see their posts, likes, and activity here.</p>
        </div>
      )}
      <div className="notif-list">
        {notifs.map(n => (
          <NotifRow key={n.id} n={n} onUserClick={onUserClick} onWineClick={onWineClick} onWineryClick={onWineryClick} onDelete={deleteNotif} />
        ))}
      </div>
    </div>
  );
}
