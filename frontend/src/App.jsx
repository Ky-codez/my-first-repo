import { useState, useEffect } from 'react';

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('sipiary_theme') || 'auto');
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    localStorage.setItem('sipiary_theme', theme);
  }, [theme]);
  return [theme, setTheme];
}
import './App.css';
import Login           from './components/Login.jsx';
import Feed            from './components/Feed.jsx';
import AddWine         from './components/AddWine.jsx';
import Profile         from './components/Profile.jsx';
import LunarCalendar   from './components/LunarCalendar.jsx';
import WinePage        from './components/WinePage.jsx';
import Cellar          from './components/Cellar.jsx';
import Notifications   from './components/Notifications.jsx';
import PublicSharePage from './components/PublicSharePage.jsx';
import BottomNav       from './components/BottomNav.jsx';
import WineryPage      from './components/WineryPage.jsx';
import DiscoverPage    from './components/DiscoverPage.jsx';
import Onboarding      from './components/Onboarding.jsx';
import AgeGate         from './components/AgeGate.jsx';
import LegalPage       from './components/LegalPage.jsx';
import AdminPage       from './components/AdminPage.jsx';
import InstallGuide    from './components/InstallGuide.jsx';
import ResetPassword   from './components/ResetPassword.jsx';

// Detect a wine-share URL and return how to resolve it.
//   Canonical:  /@username/<slug>      → { username, slug }
//   Legacy:     /@username/wine/:id    → { id }
//               /share/wine/:id        → { id }
// Legacy id forms are checked first so /@user/wine/8 isn't read as slug "wine".
function getShareTarget() {
  const p = window.location.pathname;
  let m = p.match(/^\/@[^/]+\/wine\/(\d+)\/?$/) || p.match(/^\/share\/wine\/(\d+)\/?$/);
  if (m) return { id: m[1] };
  m = p.match(/^\/@([^/]+)\/([^/]+)\/?$/);
  if (m) return { username: decodeURIComponent(m[1]), slug: decodeURIComponent(m[2]) };
  return null;
}

// Static legal pages, readable without an account or passing the age gate.
function getLegalPage() {
  const p = window.location.pathname.replace(/\/$/, '');
  if (p === '/terms')   return 'terms';
  if (p === '/privacy') return 'privacy';
  return null;
}

// Password-reset deep link: /reset-password?token=… — readable without login.
function getResetToken() {
  if (window.location.pathname.replace(/\/$/, '') !== '/reset-password') return null;
  return new URLSearchParams(window.location.search).get('token') || '';
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sipiary_user')); } catch { return null; }
  });
  const [authToken,    setAuthToken]    = useState(() => localStorage.getItem('sipiary_token') || null);
  const [ageOk,        setAgeOk]        = useState(() => !!localStorage.getItem('sipiary_age_ok'));
  const shareTarget = getShareTarget();
  const [view,         setView]        = useState(shareTarget ? 'public-share' : 'feed');
  const [profileId,    setProfileId]   = useState(null);
  const [wineBottle,   setWineBottle]  = useState(null);    // { name, winery }
  const [wineryName,   setWineryName]  = useState(null);
  const [prevView,     setPrevView]    = useState('feed');
  const [unreadCount,  setUnreadCount] = useState(0);
  const [relogWine,    setRelogWine]   = useState(null);
  const [feedKey,      setFeedKey]     = useState(0);        // bump to refresh feed

  const handleLogin = (token, user, isNewUser = false) => {
    setAuthToken(token);
    setCurrentUser(user);
    localStorage.setItem('sipiary_token', token);
    localStorage.setItem('sipiary_user', JSON.stringify(user));
    if (isNewUser) {
      setView('onboarding');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem('sipiary_token');
    localStorage.removeItem('sipiary_user');
    // Per-user data that must not leak to the next person on this device
    localStorage.removeItem('sipiary_recent_searches');
    // Reset all navigation state so a fresh login can never land on the
    // previous account's profile / feed / bottle view.
    setView('feed');
    setProfileId(null);
    setWineBottle(null);
    setWineryName(null);
    setPrevView('feed');
    setRelogWine(null);
    setUnreadCount(0);
  };

  // On mount: validate stored token with server, refresh if still valid
  useEffect(() => {
    const token = localStorage.getItem('sipiary_token');
    if (!token || currentUser) return;
    fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.ok) return r.json();
        // Only an explicit rejection invalidates the session — a 5xx or
        // network blip must not log the user out
        if (r.status === 401 || r.status === 403) handleLogout();
        return null;
      })
      .then(data => {
        if (data?.token) handleLogin(data.token, data.user);
      })
      .catch(() => {});
  }, []);

  const openProfile = (userId) => {
    setProfileId(userId);
    setView('profile');
  };

  // Real-time notifications via WebSocket
  useEffect(() => {
    if (!currentUser || !authToken) return;
    let ws;
    let retryTimer;
    let dead = false;

    const connect = () => {
      if (dead) return;
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws/notifications?token=${encodeURIComponent(authToken)}`);
      ws.onmessage = (e) => {
        const { event, data } = JSON.parse(e.data);
        if (event === 'unread') setUnreadCount(data.count);
        else if (event === 'notification') setUnreadCount(c => c + 1);
      };
      ws.onclose = () => {
        if (!dead) retryTimer = setTimeout(connect, 4000);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      dead = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [currentUser, authToken]);

  const openWinePage = ({ name, winery }) => {
    setWineBottle({ name, winery });
    setView('wine');
  };

  const openWineryPage = (name) => {
    setPrevView(view);
    setWineryName(name);
    setView('winery');
  };

  const handleWineAdded = () => {
    setFeedKey(k => k + 1);
  };

  // Legal pages are always readable — even before login or the age gate.
  const legalPage = getLegalPage();
  if (legalPage) return <LegalPage page={legalPage} onBack={() => { window.location.href = '/'; }} />;

  // Password-reset page — reachable from the emailed link, no login/age gate.
  const resetToken = getResetToken();
  if (resetToken !== null) {
    return <ResetPassword token={resetToken} onDone={() => { window.location.href = '/'; }} />;
  }

  // Age gate — Sipiary is alcohol-related, so block everything until the
  // visitor confirms they're of legal drinking age (remembered in localStorage).
  if (!ageOk) return <AgeGate onConfirm={() => setAgeOk(true)} />;

  // Public share page — no login required
  if (view === 'public-share' && shareTarget) {
    return (
      <PublicSharePage
        target={shareTarget}
        onJoin={() => {
          window.history.replaceState({}, '', '/');
          if (currentUser) setView('feed');
          // else Login will show naturally once we clear public-share
          setView('feed');
        }}
      />
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  // Owner-only founder dashboard at /admin (server enforces who's an admin).
  if (window.location.pathname.replace(/\/$/, '') === '/admin') {
    return <AdminPage onBack={() => { window.location.href = '/'; }} />;
  }

  // New-user onboarding ? full screen, before the main app
  if (view === 'onboarding') {
    return (
      <Onboarding
        currentUser={currentUser}
        onDone={() => { setProfileId(currentUser.id); setView('profile'); }}
      />
    );
  }

  return (
    <>
      <InstallGuide />
      {view === 'feed' && (
        <Feed
          key={feedKey}
          currentUser={currentUser}
          onAddWine={() => setView('log')}
          onRelog={w => { setRelogWine(w); setView('log'); }}
          onUserClick={openProfile}
          onLunarClick={() => setView('lunar')}
          onCellarClick={() => setView('cellar')}
          onWineClick={openWinePage}
          onWineryClick={openWineryPage}
          onHome={() => setView('feed')}
          onSearchClick={() => setView('vibes')}
          onProfileClick={() => { setProfileId(currentUser.id); setView('profile'); }}
          theme={theme}
          onThemeChange={setTheme}
          onLogout={handleLogout}
        />
      )}


      {view === 'profile' && (
        <Profile
          key={profileId}
          userId={profileId}
          currentUser={currentUser}
          onBack={() => setView('feed')}
          onRelog={w => { setRelogWine(w); setView('log'); }}
          onUserClick={openProfile}
          onWineClick={openWinePage}
          onLogout={handleLogout}
          onWineryClick={openWineryPage}
          theme={theme}
          onThemeChange={setTheme}
          onLunarClick={() => setView('lunar')}
          onCellarClick={() => setView('cellar')}
          onUserUpdate={updated => {
            setCurrentUser(updated);
            localStorage.setItem('sipiary_user', JSON.stringify(updated));
          }}
        />
      )}

      {view === 'wine' && wineBottle && (
        <WinePage
          wineName={wineBottle.name}
          winery={wineBottle.winery}
          currentUser={currentUser}
          onBack={() => setView(profileId ? 'profile' : 'feed')}
          onRelog={w => { setRelogWine(w); setView('log'); }}
          onUserClick={openProfile}
          onWineClick={openWinePage}
          onWineryClick={openWineryPage}
        />
      )}

      {view === 'winery' && wineryName && (
        <WineryPage
          wineryName={wineryName}
          currentUser={currentUser}
          onBack={() => setView(prevView)}
          onUserClick={openProfile}
          onWineClick={openWinePage}
        />
      )}

      {view === 'vibes' && (
        <DiscoverPage
          currentUser={currentUser}
          onUserClick={openProfile}
          onWineClick={openWinePage}
          onWineryClick={openWineryPage}
        />
      )}

      {view === 'lunar' && (
        <LunarCalendar onBack={() => setView('feed')} />
      )}

      {view === 'cellar' && (
        <Cellar
          currentUser={currentUser}
          onBack={() => setView('feed')}
          onWineClick={openWinePage}
          onRelog={w => { setRelogWine(w); setView('log'); }}
        />
      )}

      {view === 'notifications' && (
        <Notifications
          currentUser={currentUser}
          onBack={() => { setUnreadCount(0); setView('feed'); }}
          onUserClick={openProfile}
          onWineClick={openWinePage}
          onWineryClick={openWineryPage}
        />
      )}

      {(view === 'log' || relogWine) && (
        <AddWine
          currentUser={currentUser}
          onClose={() => { setRelogWine(null); setView('feed'); }}
          onAdded={handleWineAdded}
          onWineClick={openWinePage}
          prefill={relogWine}
        />
      )}

      <BottomNav
        view={view}
        currentUser={currentUser}
        unreadCount={unreadCount}
        onHome={() => setView('feed')}
        onNotif={() => { setUnreadCount(0); setView('notifications'); }}
        onProfile={() => { setProfileId(currentUser.id); setView('profile'); }}
        onAddWine={() => setView('log')}
        onVibes={() => setView('vibes')}
      />
    </>
  );
}
