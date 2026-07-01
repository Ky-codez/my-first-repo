import { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import WineCard from './WineCard.jsx';
import MainMenu from './MainMenu.jsx';
import BadgeWall from './BadgeWall.jsx';
import TasteMatch from './TasteMatch.jsx';
import { useLang } from '../i18n.jsx';
import { shareUrl } from '../utils/site.js';
import { MapPin, Calendar, Star, Plant, Camera, PencilSimple, ArrowsClockwise, CheckCircle, Heart, Repeat, Champagne } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';
import AmbassadorBadge from './AmbassadorBadge.jsx';
import RecapCard from './RecapCard.jsx';

const API = '';

const TASTE_TYPES  = ['Red','White','Rosé','Sparkling','Champagne','Dessert','Fortified','Spirit'];
const TASTE_GRAPES = ['Pinot Noir','Chardonnay','Cabernet Sauvignon','Merlot','Sauvignon Blanc','Riesling','Syrah','Grenache','Malbec','Tempranillo','Zinfandel','Viognier'];

export default function Profile({ userId, currentUser, onBack, onRelog, onUserClick, onWineClick, onLogout, onWineryClick, theme, onThemeChange, onLunarClick, onWhatsNewClick, onCellarClick, onPassportClick, onUserUpdate }) {
  const [user,         setUser]         = useState(null);
  const [wines,        setWines]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [tasteProfile, setTasteProfile] = useState(null);  // null | string | { reason }
  const [tasteLoading, setTasteLoading] = useState(false);
  const [bioEditing,   setBioEditing]   = useState(false);
  const [bioText,      setBioText]      = useState('');
  const [bioSaving,    setBioSaving]    = useState(false);
  const fileRef = useRef();
  const bioRef  = useRef();

  const { t } = useLang();
  const isOwn = currentUser?.id === userId;
  const [following, setFollowing] = useState(false);
  const [requested, setRequested] = useState(false);   // pending follow request (private accounts)
  const [followerCount, setFollowerCount] = useState(0);
  const [followRequests, setFollowRequests] = useState([]);  // incoming requests (own profile)

  // Profile tab: 'wines' | 'activity'
  const [profileTab,   setProfileTab]   = useState('wines');
  const [activity,     setActivity]     = useState(null); // null = not loaded yet

  // Sub-view: null | 'change-username' | 'change-email' | 'change-password' | 'connections'
  const [subView,      setSubView]      = useState(null);
  // Standalone taste tags (own profile)
  const [tasteTags,    setTasteTags]    = useState({ types: [], grapes: [] });
  const [tagPicker,    setTagPicker]    = useState(false);
  // Connections list (tap the Followers / Following stats)
  const [connTab,      setConnTab]      = useState('following'); // 'following' | 'followers'
  const [connPeople,   setConnPeople]   = useState([]);
  const [connWineries, setConnWineries] = useState([]);
  const [connLoading,  setConnLoading]  = useState(false);
  const [showSignOut,  setShowSignOut]  = useState(false);
  const [signOutAll,   setSignOutAll]   = useState(false);
  const [showRecap,    setShowRecap]    = useState(false);

  // Confirm sign-out. When "all devices" is ticked, bump the server-side
  // token_version first (invalidating every session) before clearing this one.
  const confirmSignOut = async () => {
    if (signOutAll) {
      const token = localStorage.getItem('sipiary_token');
      try {
        await fetch(`${API}/api/auth/logout-all`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* offline — still sign out locally */ }
    }
    onLogout();
  };
  const [unameForm,  setUnameForm]  = useState({ newUsername: '', password: '', error: '', success: false, saving: false });
  const [emailForm,  setEmailForm]  = useState({ newEmail: '', confirmEmail: '', password: '', error: '', success: false, saving: false });
  const [pwForm,     setPwForm]     = useState({ current: '', newPw: '', confirmPw: '', error: '', success: false, saving: false, showCurrent: false, showNew: false });

  useEffect(() => {
    setLoading(true);
    const isOwnProfile = currentUser?.id === userId;
    const fetches = [
      fetch(`${API}/api/users/${userId}?currentUserId=${currentUser?.id || 0}`).then(r => r.json()),
      fetch(`${API}/api/wines?userId=${userId}&currentUserId=${currentUser?.id || 0}`).then(r => r.json()),
    ];
    if (isOwnProfile) fetches.push(fetch(`${API}/api/users/${userId}/taste-tags`).then(r => r.json()));

    Promise.all(fetches).then(([u, w, tags]) => {
      setUser(u);
      setFollowing(u.isFollowing);
      setRequested(!!u.hasRequested);
      setFollowerCount(u.followerCount || 0);
      setBioText(u.bio || '');
      setWines(w);
      if (tags) setTasteTags(tags.types ? tags : { types: [], grapes: [] });
      setLoading(false);
      // Own profile with pending requests → load them for the inbox UI
      if (isOwnProfile && u.pendingRequestCount > 0) {
        fetch(`${API}/api/users/${userId}/follow-requests`)
          .then(r => r.json())
          .then(d => setFollowRequests(Array.isArray(d) ? d : []))
          .catch(() => {});
      }
    });
  }, [userId]);

  const toggleFollow = async () => {
    const prev = { following, requested, followerCount };
    try {
      const res  = await fetch(`${API}/api/users/${userId}/follow`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: currentUser.id }),
      });
      const data = await res.json();
      setFollowing(data.following);
      setRequested(!!data.requested);
      setFollowerCount(data.followerCount);
    } catch {
      setFollowing(prev.following);
      setRequested(prev.requested);
      setFollowerCount(prev.followerCount);
    }
  };

  // Owner accepts / declines an incoming follow request
  const respondRequest = async (requesterId, accept) => {
    setFollowRequests(rs => rs.filter(r => r.id !== requesterId));
    if (accept) setFollowerCount(c => c + 1);
    try {
      await fetch(`${API}/api/users/${userId}/follow-requests/${requesterId}${accept ? '/accept' : ''}`, {
        method: accept ? 'POST' : 'DELETE',
      });
    } catch { /* best-effort; list already updated optimistically */ }
  };

  // Toggle private account (own profile). Optimistic; reverts on failure.
  const togglePrivate = async () => {
    const next = !user?.isPrivate;
    setUser(u => ({ ...u, isPrivate: next }));
    try {
      const token = localStorage.getItem('sipiary_token');
      await fetch(`${API}/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_private: next }),
      });
    } catch {
      setUser(u => ({ ...u, isPrivate: !next }));
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    const res  = await fetch(`${API}/api/users/${userId}/avatar`, { method: 'POST', body: fd });
    const data = await res.json();
    setUser(u => ({ ...u, avatar_path: data.avatar_path }));
    if (userId === currentUser?.id && onUserUpdate) {
      onUserUpdate({ ...currentUser, avatar_path: data.avatar_path });
    }
    // Update currentUser in parent if it's own profile — via callback
    setUploading(false);
  };

  const saveBio = async () => {
    setBioSaving(true);
    try {
      const res  = await fetch(`${API}/api/users/${userId}/bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: bioText.trim() || null }),
      });
      const data = await res.json();
      setUser(u => ({ ...u, bio: data.bio }));
      setBioText(data.bio || '');
    } catch {}
    setBioSaving(false);
    setBioEditing(false);
  };

  const startBioEdit = () => {
    setBioEditing(true);
    setTimeout(() => bioRef.current?.focus(), 0);
  };

  const fetchTasteProfile = async () => {
    setTasteLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/${userId}/taste-profile`);
      const data = await res.json();
      setTasteProfile(data.profile || data.reason || 'Could not generate profile.');
    } catch {
      setTasteProfile('Something went wrong. Try again.');
    }
    setTasteLoading(false);
  };

  const handleDelete = async (wineId) => {
    await fetch(`${API}/api/wines/${wineId}`, { method: 'DELETE' });
    setWines(w => w.filter(x => x.id !== wineId));
  };

  const handleUsernameChange = async (e) => {
    e.preventDefault();
    setUnameForm(f => ({ ...f, saving: true, error: '' }));
    const token = localStorage.getItem('sipiary_token');
    const res = await fetch(`${API}/api/users/${userId}/change-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ newUsername: unameForm.newUsername, password: unameForm.password }),
    });
    const data = await res.json();
    if (data.error) return setUnameForm(f => ({ ...f, error: data.error, saving: false }));
    // Update token + user in localStorage with new username
    localStorage.setItem('sipiary_token', data.token);
    localStorage.setItem('sipiary_user', JSON.stringify(data.user));
    setUser(u => ({ ...u, username: data.user.username }));
    setUnameForm(f => ({ ...f, success: true, saving: false }));
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (emailForm.newEmail !== emailForm.confirmEmail) return setEmailForm(f => ({ ...f, error: 'Emails do not match' }));
    setEmailForm(f => ({ ...f, saving: true, error: '' }));
    const token = localStorage.getItem('sipiary_token');
    const res = await fetch(`${API}/api/users/${userId}/change-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ newEmail: emailForm.newEmail, password: emailForm.password }),
    });
    const data = await res.json();
    if (data.error) return setEmailForm(f => ({ ...f, error: data.error, saving: false }));
    setEmailForm({ newEmail: '', confirmEmail: '', password: '', error: '', success: true, saving: false });
    setUser(u => ({ ...u, email: emailForm.newEmail }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirmPw) return setPwForm(f => ({ ...f, error: 'New passwords do not match' }));
    setPwForm(f => ({ ...f, saving: true, error: '' }));
    const token = localStorage.getItem('sipiary_token');
    const res = await fetch(`${API}/api/users/${userId}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
    });
    const data = await res.json();
    if (data.error) return setPwForm(f => ({ ...f, error: data.error, saving: false }));
    // The server logged out every other device and issued this one a fresh
    // token — store it so the current session keeps working.
    if (data.token) localStorage.setItem('sipiary_token', data.token);
    setPwForm({ current: '', newPw: '', confirmPw: '', error: '', success: true, saving: false, showCurrent: false, showNew: false });
  };

  const openConnections = (tab) => {
    setConnTab(tab);
    setSubView('connections');
    setConnLoading(true);
    const wants = [fetch(`${API}/api/users/${userId}/${tab}`).then(r => r.json())];
    if (isOwn && tab === 'following') {
      wants.push(fetch(`${API}/api/users/${userId}/winery-follows`).then(r => r.json()));
    }
    Promise.all(wants).then(([people, wineries]) => {
      setConnPeople(Array.isArray(people) ? people : []);
      setConnWineries(Array.isArray(wineries) ? wineries : []);
      setConnLoading(false);
    }).catch(() => setConnLoading(false));
  };

  const unfollowPerson = async (personId) => {
    await fetch(`${API}/api/users/${personId}/follow`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower_id: currentUser.id }),
    });
    setConnPeople(p => p.filter(x => x.id !== personId));
    setUser(u => ({ ...u, followingCount: Math.max(0, (u.followingCount || 1) - 1) }));
  };

  const unfollowWinery = async (name) => {
    await fetch(`${API}/api/winery/follow`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, name }),
    });
    setConnWineries(w => w.filter(x => x.name !== name));
  };

  const removeTasteTag = async (kind, value) => {
    const next = {
      types:  kind === 'type'  ? tasteTags.types.filter(t => t !== value)  : tasteTags.types,
      grapes: kind === 'grape' ? tasteTags.grapes.filter(g => g !== value) : tasteTags.grapes,
    };
    setTasteTags(next);
    const token = localStorage.getItem('sipiary_token');
    await fetch(`${API}/api/users/${currentUser.id}/taste-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(next),
    }).catch(() => {});
  };

  const addTasteTag = async (kind, value) => {
    const already = kind === 'type' ? tasteTags.types.includes(value) : tasteTags.grapes.includes(value);
    if (already) return;
    const next = {
      types:  kind === 'type'  ? [...tasteTags.types,  value] : tasteTags.types,
      grapes: kind === 'grape' ? [...tasteTags.grapes, value] : tasteTags.grapes,
    };
    setTasteTags(next);
    const token = localStorage.getItem('sipiary_token');
    await fetch(`${API}/api/users/${currentUser.id}/taste-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(next),
    }).catch(() => {});
  };

  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteFriends = async () => {
    const url = shareUrl(`/?ref=${encodeURIComponent(currentUser.username)}`);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join me on Sipiary', text: `I'm tracking my wines on Sipiary — come join me!`, url });
        return;
      } catch { /* cancelled → fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(url); } catch {
      const el = document.createElement('textarea');
      el.value = url; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  if (loading) return (
    <div className="profile-page profile-skeleton" aria-hidden="true">
      <div className="psk-card">
        <div className="sk psk-avatar" />
        <div className="sk sk-line" style={{ width: '40%', height: 16, margin: '0.9rem auto 0.6rem' }} />
        <div className="psk-stats">
          {[0,1,2,3].map(i => <div key={i} className="sk psk-stat" />)}
        </div>
      </div>
      <div className="sk sk-line" style={{ width: '30%', height: 12, margin: '1.5rem 0 0.6rem' }} />
      <div className="psk-palate">
        {[0,1,2,3,4,5].map(i => <div key={i} className="sk psk-palate-cell" />)}
      </div>
    </div>
  );
  if (!user)   return <div className="loading-full">User not found.</div>;

  // Reusable topbar with back button + MainMenu (own profile)
  const ProfileTopbar = ({ onBackClick }) => (
    <div className="profile-topbar">
      {isOwn && (
        <MainMenu
          theme={theme} onThemeChange={onThemeChange}
          onLunarClick={onLunarClick} onWhatsNewClick={onWhatsNewClick} onCellarClick={onCellarClick}
          onLogout={() => setShowSignOut(true)}
          onChangeUsername={() => setSubView('change-username')}
          onChangeEmail={() => setSubView('change-email')}
          onChangePassword={() => setSubView('change-password')}
          onTogglePrivate={togglePrivate}
          isPrivate={!!user?.isPrivate}
          currentUser={currentUser}
        />
      )}
    </div>
  );

  // -- Connections sub-page (followers / following lists) ------------------
  if (subView === 'connections') return (
    <div className="accs-page">
      <ProfileTopbar onBackClick={() => setSubView(null)} />
      <h2 className="accs-page-title">@{user.username}</h2>

      <div className="conn-tabs">
        <button className={`conn-tab${connTab === 'following' ? ' active' : ''}`} onClick={() => openConnections('following')}>Following</button>
        <button className={`conn-tab${connTab === 'followers' ? ' active' : ''}`} onClick={() => openConnections('followers')}>Followers</button>
      </div>

      {connLoading && <p className="loading-state">Loading…</p>}

      {!connLoading && (
        <>
          {/* People */}
          <div className="conn-section">
            <span className="conn-section-title">People</span>
            {connPeople.length === 0 && (
              <p className="conn-empty">{connTab === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}</p>
            )}
            {connPeople.map(p => (
              <div key={p.id} className="fs-card">
                <button className="fs-user" onClick={() => onUserClick?.(p.id)}>
                  <Avatar user={p} size={42} />
                  <span className="fs-info">
                    <span className="fs-name">@{p.username}</span>
                  </span>
                </button>
                {isOwn && connTab === 'following' && (
                  <button className="conn-unfollow" onClick={() => unfollowPerson(p.id)}>Unfollow</button>
                )}
              </div>
            ))}
          </div>

          {/* Wineries — own profile, Following tab only */}
          {isOwn && connTab === 'following' && connWineries.length > 0 && (
            <div className="conn-section">
              <span className="conn-section-title">Wineries</span>
              {connWineries.map(w => (
                <div key={w.name} className="fs-card">
                  <div className="fs-user">
                    <span className="conn-winery-icon"><Champagne size={18} weight="fill" /></span>
                    <span className="fs-info">
                      <span className="fs-name">{w.name}</span>
                      <span className="fs-meta">{w.post_count} {w.post_count === 1 ? 'post' : 'posts'}</span>
                    </span>
                  </div>
                  <button className="conn-unfollow" onClick={() => unfollowWinery(w.name)}>Unfollow</button>
                </div>
              ))}
            </div>
          )}

        </>
      )}
    </div>
  );

  // -- Change Username sub-page ---------------------------------------------
  if (subView === 'change-username') return (
    <div className="accs-page">
      <ProfileTopbar onBackClick={() => { setSubView(null); setUnameForm({ newUsername: '', password: '', error: '', success: false, saving: false }); }} />
      <h2 className="accs-page-title">Change Username</h2>
      <p className="accs-current">Current username: <strong>{user.username}</strong></p>
      {unameForm.success ? (
        <div className="accs-success-box">
          <span>✓</span>
          <p>Username updated to <strong>@{user.username}</strong></p>
          <button className="btn-primary" onClick={() => setSubView(null)}>Back to Profile</button>
        </div>
      ) : (
        <form className="accs-form" onSubmit={handleUsernameChange}>
          <label className="accs-label">New username</label>
          <input
            placeholder=""
            value={unameForm.newUsername}
            onChange={e => setUnameForm(f => ({ ...f, newUsername: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''), error: '' }))}
            maxLength={32}
            autoFocus
            autoComplete="off"
          />
          <p className="accs-hint">Letters, numbers and underscores only — 3–32 characters</p>
          <label className="accs-label">Current password to confirm</label>
          <input
            type="password"
            placeholder=""
            value={unameForm.password}
            onChange={e => setUnameForm(f => ({ ...f, password: e.target.value, error: '' }))}
            autoComplete="current-password"
          />
          {unameForm.error && <p className="accs-error">{unameForm.error}</p>}
          <button type="submit" className="btn-primary accs-btn"
            disabled={unameForm.saving || !unameForm.newUsername || !unameForm.password}>
            {unameForm.saving ? 'Saving…' : 'Update Username'}
          </button>
        </form>
      )}
    </div>
  );

  // -- Change Email sub-page ------------------------------------------------
  if (subView === 'change-email') return (
    <div className="accs-page">
      <ProfileTopbar onBackClick={() => { setSubView(null); setEmailForm({ newEmail: '', confirmEmail: '', password: '', error: '', success: false, saving: false }); }} />
      <h2 className="accs-page-title">Change Email</h2>
      {user.email && <p className="accs-current">Current email: <strong>{user.email}</strong></p>}
      {emailForm.success ? (
        <div className="accs-success-box">
          <span>✓</span>
          <p>Email updated successfully</p>
          <button className="btn-primary" onClick={() => setSubView(null)}>Back to Profile</button>
        </div>
      ) : (
        <form className="accs-form" onSubmit={handleEmailChange}>
          <label className="accs-label">New email address</label>
          <input
            type="email" placeholder=""
            value={emailForm.newEmail}
            onChange={e => setEmailForm(f => ({ ...f, newEmail: e.target.value, error: '' }))}
            autoComplete="email" autoFocus
          />
          <label className="accs-label">Confirm new email</label>
          <input
            type="email" placeholder=""
            value={emailForm.confirmEmail}
            onChange={e => setEmailForm(f => ({ ...f, confirmEmail: e.target.value, error: '' }))}
            autoComplete="email"
            style={{ borderColor: emailForm.confirmEmail ? (emailForm.newEmail === emailForm.confirmEmail ? '#4caf50' : '#e74c3c') : '' }}
          />
          <label className="accs-label">Current password to confirm</label>
          <input
            type="password" placeholder=""
            value={emailForm.password}
            onChange={e => setEmailForm(f => ({ ...f, password: e.target.value, error: '' }))}
            autoComplete="current-password"
          />
          {emailForm.error && <p className="accs-error">{emailForm.error}</p>}
          <button type="submit" className="btn-primary accs-btn"
            disabled={emailForm.saving || !emailForm.newEmail || !emailForm.confirmEmail || !emailForm.password}>
            {emailForm.saving ? 'Saving…' : 'Update Email'}
          </button>
        </form>
      )}
    </div>
  );

  // -- Change Password sub-page ---------------------------------------------
  if (subView === 'change-password') return (
    <div className="accs-page">
      <ProfileTopbar onBackClick={() => { setSubView(null); setPwForm({ current: '', newPw: '', confirmPw: '', error: '', success: false, saving: false, showCurrent: false, showNew: false }); }} />
      <h2 className="accs-page-title">Change Password</h2>
      {pwForm.success ? (
        <div className="accs-success-box">
          <span>✓</span>
          <p>Password updated successfully</p>
          <button className="btn-primary" onClick={() => setSubView(null)}>Back to Profile</button>
        </div>
      ) : (
        <form className="accs-form" onSubmit={handlePasswordChange}>
          <label className="accs-label">Current password</label>
          <div className="pw-field-wrap">
            <input
              type={pwForm.showCurrent ? 'text' : 'password'}
              placeholder=""
              value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value, error: '' }))}
              autoComplete="current-password" autoFocus
            />
            <div className="pw-field-actions">
              {pwForm.current && <button type="button" className="pw-clear-btn" tabIndex={-1} onClick={() => setPwForm(f => ({ ...f, current: '' }))}>×</button>}
              <button type="button" className="pw-toggle-btn" tabIndex={-1}
                onClick={() => setPwForm(f => ({ ...f, showCurrent: !f.showCurrent }))}>
                {pwForm.showCurrent
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>
          <label className="accs-label">New password</label>
          <div className="pw-field-wrap">
            <input
              type={pwForm.showNew ? 'text' : 'password'}
              placeholder=""
              value={pwForm.newPw}
              onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value, error: '' }))}
              autoComplete="new-password"
            />
            <div className="pw-field-actions">
              {pwForm.newPw && <button type="button" className="pw-clear-btn" tabIndex={-1} onClick={() => setPwForm(f => ({ ...f, newPw: '' }))}>×</button>}
              <button type="button" className="pw-toggle-btn" tabIndex={-1}
                onClick={() => setPwForm(f => ({ ...f, showNew: !f.showNew }))}>
                {pwForm.showNew
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>
          {/* Password requirements shown below the field */}
          {pwForm.newPw && (
            <div className="accs-pw-rules">
              {[
                { ok: pwForm.newPw.length >= 8,             label: '8+ characters' },
                { ok: /[a-zA-Z]/.test(pwForm.newPw),       label: '1 letter' },
                { ok: /[0-9]/.test(pwForm.newPw),          label: '1 number' },
                { ok: /[^a-zA-Z0-9]/.test(pwForm.newPw),  label: '1 special character' },
              ].map(r => (
                <span key={r.label} className={`accs-pw-rule${r.ok ? ' ok' : ''}`}>
                  {r.ok ? '✓' : '✗'} {r.label}
                </span>
              ))}
            </div>
          )}
          <label className="accs-label">Confirm new password</label>
          <div className="pw-field-wrap">
            <input
              type={pwForm.showNew ? 'text' : 'password'}
              placeholder=""
              value={pwForm.confirmPw}
              onChange={e => setPwForm(f => ({ ...f, confirmPw: e.target.value, error: '' }))}
              autoComplete="new-password"
              style={{ borderColor: pwForm.confirmPw ? (pwForm.newPw === pwForm.confirmPw ? '#4caf50' : '#e74c3c') : '' }}
            />
            <div className="pw-field-actions">
              {pwForm.confirmPw && <button type="button" className="pw-clear-btn" tabIndex={-1} onClick={() => setPwForm(f => ({ ...f, confirmPw: '' }))}>×</button>}
            </div>
          </div>
          {pwForm.error && <p className="accs-error">{pwForm.error}</p>}
          <button type="submit" className="btn-primary accs-btn"
            disabled={pwForm.saving || !pwForm.current || !pwForm.newPw || !pwForm.confirmPw}>
            {pwForm.saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );

  // -- Profile stats derived from wine log ----------------------------------
  function topByFrequency(items) {
    if (!items.length) return null;
    const freq = {};
    items.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }

  const grapeTokens = wines.flatMap(w =>
    w.grapes ? w.grapes.split(/[,/]/).map(g => g.trim()).filter(Boolean) : []
  );
  const favGrape = topByFrequency(grapeTokens);

  const regions = wines.map(w => w.location).filter(Boolean);
  const favRegion = topByFrequency(regions);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthCounts = wines.reduce((acc, w) => {
    const d = w.opened_at || w.created_at;
    if (d) { const m = new Date(d.slice(0,10) + 'T12:00:00').getMonth(); acc[m] = (acc[m] || 0) + 1; }
    return acc;
  }, {});
  const activeMonth = Object.keys(monthCounts).length
    ? MONTHS[parseInt(Object.entries(monthCounts).sort((a,b) => b[1]-a[1])[0][0])]
    : null;

  const types = wines.map(w => w.type).filter(Boolean);
  const favType = topByFrequency(types);

  const avgRatingGiven = wines.length
    ? (wines.reduce((s, w) => s + (w.rating || 0), 0) / wines.length).toFixed(1)
    : null;

  const bioCount = wines.filter(w => w.is_biodynamic).length;
  const bioPct   = wines.length ? Math.round((bioCount / wines.length) * 100) : 0;

  const SI = { size: 20, weight: 'fill' };
  const stats = [
    favGrape   && { icon: <WineTypeIcon type="Red" size={20} />, label: 'Fav Grape',   value: favGrape },
    favRegion  && { icon: <MapPin {...SI} color="#c0392b" />,    label: 'Top Region',   value: favRegion },
    activeMonth&& { icon: <Calendar {...SI} color="#4f86d6" />,  label: 'Most Active',  value: activeMonth },
    favType    && { icon: <WineTypeIcon type={favType} size={20} />, label: 'Top Style', value: favType },
    avgRatingGiven && { icon: <Star {...SI} color="#e0a020" />,  label: 'Avg Rating', value: `${avgRatingGiven} / 5` },
    wines.length > 0 && { icon: <Plant {...SI} color="#5bb463" />, label: 'Biodynamic', value: `${bioPct}%` },
  ].filter(Boolean);

  return (
    <div className="profile-page">
      <div className="profile-topbar">
        {isOwn && (
          <MainMenu
            theme={theme} onThemeChange={onThemeChange}
            onLunarClick={onLunarClick} onWhatsNewClick={onWhatsNewClick} onCellarClick={onCellarClick}
            onLogout={() => setShowSignOut(true)}
            onChangeUsername={() => setSubView('change-username')}
            onChangeEmail={() => setSubView('change-email')}
            onChangePassword={() => setSubView('change-password')}
            onTogglePrivate={togglePrivate}
            isPrivate={!!user?.isPrivate}
            currentUser={currentUser}
          />
        )}
      </div>

      <div className="profile-header">
        <div className="profile-avatar-wrap">
          <Avatar user={user} size={90} />
          {isOwn && (
            <>
              <button className="avatar-edit-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? '...' : <Camera size={18} weight="fill" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </>
          )}
        </div>
        <div className="profile-info">
          <div className="profile-name-row">
            <h2>@{user.username}{user.is_ambassador ? <AmbassadorBadge size={20} /> : null}</h2>
            {!isOwn && (
              <button
                className={`follow-btn${following ? ' following' : ''}${requested ? ' requested' : ''}`}
                onClick={toggleFollow}
              >
                {following ? '✓ Following' : requested ? 'Requested' : '+ Follow'}
              </button>
            )}
          </div>
          <div className="profile-stats">
            <div className="stat"><span className="stat-val">{user.wineCount}</span><span className="stat-label">Wines</span></div>
            <button className="stat stat-btn" onClick={() => openConnections('followers')}><span className="stat-val">{followerCount}</span><span className="stat-label">Followers</span></button>
            <button className="stat stat-btn" onClick={() => openConnections('following')}><span className="stat-val">{user.followingCount || 0}</span><span className="stat-label">Following</span></button>
            <div className="stat"><span className="stat-val">{user.likesReceived}</span><span className="stat-label">Likes</span></div>
          </div>

          {/* Bio */}
          <div className="profile-bio-wrap">
            {isOwn && bioEditing ? (
              <div className="profile-bio-edit">
                <textarea
                  ref={bioRef}
                  className="profile-bio-textarea"
                  value={bioText}
                  onChange={e => setBioText(e.target.value)}
                  placeholder="Write a short intro about yourself…"
                  maxLength={300}
                  rows={3}
                />
                <div className="profile-bio-actions">
                  <span className="profile-bio-count">{bioText.length}/300</span>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => { setBioEditing(false); setBioText(user.bio || ''); }}>Cancel</button>
                  <button className="btn-primary"   style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={saveBio} disabled={bioSaving}>{bioSaving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            ) : (
              <div className="profile-bio-display" onClick={isOwn ? startBioEdit : undefined} title={isOwn ? 'Click to edit' : undefined}>
                {user.bio
                  ? <p className="profile-bio-text">{user.bio}</p>
                  : isOwn && <p className="profile-bio-placeholder"><PencilSimple size={14} style={{ verticalAlign: '-0.12em' }} /> Add a short intro…</p>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Follow requests — own profile, private account with pending requests */}
      {isOwn && followRequests.length > 0 && (
        <div className="follow-requests">
          <h3 className="profile-section-title" style={{ marginBottom: '0.6rem' }}>
            Follow requests <span className="fr-count">{followRequests.length}</span>
          </h3>
          {followRequests.map(r => (
            <div key={r.id} className="fr-row">
              <button className="fr-user" onClick={() => onUserClick(r.id)}>
                <Avatar user={r} size={40} />
                <span className="fr-name">@{r.username}</span>
              </button>
              <div className="fr-actions">
                <button className="fr-accept" onClick={() => respondRequest(r.id, true)}>Accept</button>
                <button className="fr-decline" onClick={() => respondRequest(r.id, false)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Taste Match — viewing someone else's profile (hidden for private accounts) */}
      {!isOwn && currentUser && !user.locked && (
        <TasteMatch currentUser={currentUser} otherUser={{ id: userId, username: user.username }} />
      )}

      {stats.length > 0 && (
        <div className="profile-palate">
          <h3 className="profile-section-title" style={{ marginBottom: '0.6rem' }}>
            {isOwn ? 'Your Palate' : 'Their Palate'}
          </h3>
          <div className="palate-grid">
            {stats.map(s => (
              <div key={s.label} className="palate-card">
                <span className="palate-icon">{s.icon}</span>
                <span className="palate-value">{s.value}</span>
                <span className="palate-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {wines.length >= 2 && (
        <div className="taste-profile-wrap">
          {!tasteProfile && !tasteLoading && (
            <button className="taste-profile-btn" onClick={fetchTasteProfile}>
              <WineTypeIcon type="Red" size={16} /> Discover your taste profile
            </button>
          )}
          {tasteLoading && (
            <div className="taste-profile-card loading">
              <span className="taste-profile-spinner"><ArrowsClockwise size={16} /></span> Analysing your palate…
            </div>
          )}
          {tasteProfile && !tasteLoading && (
            <div className="taste-profile-card">
              <span className="taste-profile-icon"><WineTypeIcon type="Red" size={18} /></span>
              <p className="taste-profile-text">{tasteProfile}</p>
              <button className="taste-profile-refresh" onClick={fetchTasteProfile} title="Regenerate"><ArrowsClockwise size={16} /></button>
            </div>
          )}
        </div>
      )}

      {/* Wine Passport — 3D globe of everywhere you've tasted from */}
      {isOwn && (
        <button className="passport-launch-btn" onClick={() => onPassportClick?.()}>
          <span className="plb-globe" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c98fe0" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
            </svg>
          </span>
          <span className="plb-text">
            <span className="plb-title">Wine Passport</span>
            <span className="plb-sub">Spin the globe & explore your wine world</span>
          </span>
          <span className="plb-arrow">→</span>
        </button>
      )}

      {/* Your Wine Recap — shareable Spotify-Wrapped-style stats */}
      {isOwn && (
        <button className="recap-launch-btn" onClick={() => setShowRecap(true)}>
          Your Wine Recap →
        </button>
      )}

      {/* Invite friends — earns the "Partner in Wine!" badge */}
      {isOwn && (
        <div className="invite-friends-card">
          <div className="invite-friends-text">
            <span className="invite-friends-title">Invite friends</span>
            <span className="invite-friends-sub">Refer a friend who joins to unlock the <strong>Partner in Wine!</strong> badge</span>
          </div>
          <button className="invite-friends-btn" onClick={inviteFriends}>
            {inviteCopied ? <><CheckCircle size={15} weight="fill" style={{ verticalAlign: '-0.18em' }} /> Link copied!</> : 'Share invite'}
          </button>
        </div>
      )}

      {/* Taste Tags — own profile only, standalone section */}
      {isOwn && (
        <div className="taste-tags-wrap">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <h3 className="profile-section-title" style={{ margin: 0 }}>Taste Tags</h3>
            <button className="taste-tags-add-btn" onClick={() => setTagPicker(p => !p)}>
              {tagPicker ? 'Done' : '+ Add'}
            </button>
          </div>
          <p className="taste-tags-hint">These boost matching wines in your Explore feed</p>

          {tagPicker && (
            <div className="taste-tags-picker">
              <p className="taste-tags-picker-label">Wine types</p>
              <div className="conn-tag-wrap">
                {TASTE_TYPES.map(t => (
                  <button
                    key={t}
                    className={`taste-tags-option${tasteTags.types.includes(t) ? ' selected' : ''}`}
                    onClick={() => tasteTags.types.includes(t) ? removeTasteTag('type', t) : addTasteTag('type', t)}
                  ><WineTypeIcon type={t} size={14} /> {t}</button>
                ))}
              </div>
              <p className="taste-tags-picker-label" style={{ marginTop: '0.5rem' }}>Grape varieties</p>
              <div className="conn-tag-wrap">
                {TASTE_GRAPES.map(g => (
                  <button
                    key={g}
                    className={`taste-tags-option${tasteTags.grapes.includes(g) ? ' selected' : ''}`}
                    onClick={() => tasteTags.grapes.includes(g) ? removeTasteTag('grape', g) : addTasteTag('grape', g)}
                  >{g}</button>
                ))}
              </div>
            </div>
          )}

          {!tagPicker && tasteTags.types.length === 0 && tasteTags.grapes.length === 0 && (
            <p className="taste-tags-empty">No taste tags yet — tap <strong>+ Add</strong> to set your preferences.</p>
          )}

          {!tagPicker && (tasteTags.types.length > 0 || tasteTags.grapes.length > 0) && (
            <div className="conn-tag-wrap">
              {tasteTags.types.map(t => (
                <span key={t} className="conn-tag"><WineTypeIcon type={t} size={13} /> {t} <button className="conn-tag-x" onClick={() => removeTasteTag('type', t)}>×</button></span>
              ))}
              {tasteTags.grapes.map(g => (
                <span key={g} className="conn-tag">{g} <button className="conn-tag-x" onClick={() => removeTasteTag('grape', g)}>×</button></span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign Out confirmation modal */}
      {showRecap && (
        <RecapCard userId={userId} username={user?.username} onClose={() => setShowRecap(false)} />
      )}

      {showSignOut && (
        <div className="signout-overlay" onClick={() => setShowSignOut(false)}>
          <div className="signout-modal" onClick={e => e.stopPropagation()}>
            <p className="signout-title">Sign out?</p>
            <p className="signout-sub">You'll need to log back in to access your account.</p>
            <label className="signout-all-row">
              <input type="checkbox" checked={signOutAll} onChange={e => setSignOutAll(e.target.checked)} />
              <span>Also sign out of all other devices</span>
            </label>
            <div className="signout-actions">
              <button className="signout-confirm" onClick={confirmSignOut}>Sign Out</button>
              <button className="signout-cancel" onClick={() => setShowSignOut(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Private account: non-owners see a locked panel instead of the content */}
      {user.locked ? (
        <div className="profile-locked">
          <svg className="profile-locked-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="profile-locked-title">This account is private</p>
          <p className="profile-locked-sub">
            {requested
              ? `Your follow request is pending. You'll see @${user.username}'s wines once they accept.`
              : `Follow @${user.username} to see their wines — they'll need to approve your request.`}
          </p>
        </div>
      ) : (
      <>
      {/* Tab bar */}
      <div className="profile-tabs">
        <button className={`profile-tab${profileTab === 'wines' ? ' active' : ''}`} onClick={() => setProfileTab('wines')}>
          {t('profile.journal')}
        </button>
        {isOwn && (
          <button
            className={`profile-tab${profileTab === 'activity' ? ' active' : ''}`}
            onClick={() => {
              setProfileTab('activity');
              if (activity === null) {
                fetch(`${API}/api/users/${userId}/activity?currentUserId=${currentUser?.id || 0}`)
                  .then(r => r.json())
                  .then(d => setActivity(Array.isArray(d) ? d : []))
                  .catch(() => setActivity([]));
              }
            }}
          >
            {t('profile.activity')}
          </button>
        )}
        <button className={`profile-tab${profileTab === 'badges' ? ' active' : ''}`} onClick={() => setProfileTab('badges')}>
          {t('profile.badges')}
        </button>
      </div>

      {/* Wine Journal tab */}
      {profileTab === 'wines' && (
        wines.length === 0
          ? <p className="empty-state">{isOwn ? 'You haven\'t logged any wines yet!' : 'No wines logged yet.'}</p>
          : <div className="profile-wines">
              {wines.map(w => (
                <WineCard key={w.id} wine={w} currentUser={currentUser} onDelete={handleDelete} onRelog={onRelog} onUserClick={onUserClick} onWineClick={onWineClick} />
              ))}
            </div>
      )}

      {/* Activity tab — likes & reposts by you */}
      {profileTab === 'activity' && (
        <div className="activity-feed">
          {activity === null && <p className="empty-state">Loading…</p>}
          {activity !== null && activity.length === 0 && (
            <p className="empty-state">No activity yet — like or repost wines to see them here.</p>
          )}
          {(activity || []).map((w, i) => (
            <div key={`${w.activity_type}-${w.id}-${i}`} className="activity-item">
              <div className="activity-label">
                {w.activity_type === 'liked' ? <><Heart size={13} weight="fill" style={{ verticalAlign: '-0.12em' }} /> You liked</> : <><Repeat size={13} weight="bold" style={{ verticalAlign: '-0.12em' }} /> You reposted</>}
              </div>
              <WineCard wine={w} currentUser={currentUser} onDelete={() => {}} onRelog={onRelog} onUserClick={onUserClick} onWineClick={onWineClick} />
            </div>
          ))}
        </div>
      )}

      {/* Badges tab — collectible holo cards */}
      {profileTab === 'badges' && <BadgeWall userId={userId} />}
      </>
      )}
    </div>
  );
}
