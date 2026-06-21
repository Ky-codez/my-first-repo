import { useState, useRef, useEffect } from 'react';
import { getMoonInfo, TYPE_INFO } from '../utils/moonCalendar.js';
import { useLang, LANGUAGES } from '../i18n.jsx';

const THEMES = [
  { key: 'light', label: '☀️', title: 'Light' },
  { key: 'auto',  label: '🔆', title: 'Auto' },
  { key: 'dark',  label: '🌙', title: 'Dark' },
];

// Who sees the Founder Dashboard link. Must match the backend ADMIN_USERNAME
// (defaults to 'ky_codez'); update both if you change it.
const ADMIN_USERNAME = 'ky_codez';

export default function MainMenu({ theme, onThemeChange, onLunarClick, onCellarClick, onLogout, onChangeUsername, onChangeEmail, onChangePassword, currentUser }) {
  const [open, setOpen] = useState(false);
  const [cellarCount, setCellarCount] = useState(null);
  const { lang, setLang, t } = useLang();
  const ref = useRef();
  const todayMoon = getMoonInfo(new Date());
  const todayType = TYPE_INFO[todayMoon.type];

  useEffect(() => {
    if (!open || cellarCount !== null || !currentUser) return;
    fetch(`/api/cellar?userId=${currentUser.id}`)
      .then(r => r.json())
      .then(d => setCellarCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, [open, currentUser]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="main-menu-wrap" ref={ref}>
      <button className="main-menu-btn" onClick={() => setOpen(o => { if (o) setCellarCount(null); return !o; })} title="Menu">
        <span className="main-menu-icon">☰</span>
      </button>

      {open && (
        <div className="main-menu-dropdown">
          {/* Founder Dashboard — owner only */}
          {currentUser?.username === ADMIN_USERNAME && (
            <>
              <button className="mm-item" onClick={() => { setOpen(false); window.location.href = '/admin'; }}>
                <span className="mm-item-icon">📊</span>
                <div className="mm-item-text">
                  <span className="mm-item-label">Founder Dashboard</span>
                  <span className="mm-item-sub">Users, wines &amp; growth</span>
                </div>
              </button>
              <div className="mm-divider" />
            </>
          )}

          {/* Add to Home Screen — hidden once installed (standalone) */}
          {!window.matchMedia?.('(display-mode: standalone)').matches && window.navigator.standalone !== true && (
            <button
              className="mm-item"
              onClick={() => { setOpen(false); window.dispatchEvent(new Event('open-install-guide')); }}
            >
              <span className="mm-item-icon">📲</span>
              <div className="mm-item-text">
                <span className="mm-item-label">Add to Home Screen</span>
                <span className="mm-item-sub">Full-screen, app-like</span>
              </div>
            </button>
          )}

          {/* Cellar */}
          <button
            className="mm-item"
            onClick={() => { setOpen(false); onCellarClick(); }}
          >
            <span className="mm-item-icon">🍾</span>
            <div className="mm-item-text">
              <span className="mm-item-label">My Cellar</span>
              <span className="mm-item-sub">
                {cellarCount === null ? 'Your wine collection' : `${cellarCount} ${cellarCount === 1 ? 'bottle' : 'bottles'}`}
              </span>
            </div>
          </button>

          {/* Lunar Calendar */}
          <button
            className="mm-item"
            onClick={() => { setOpen(false); onLunarClick(); }}
          >
            <span className="mm-item-icon" style={{ color: todayType.color }}>
              {todayType.emoji}
            </span>
            <div className="mm-item-text">
              <span className="mm-item-label">Lunar Calendar</span>
              <span className="mm-item-sub">Today: {todayType.label}</span>
            </div>
          </button>

          <div className="mm-divider" />

          {/* Display mode */}
          <div className="mm-section-label">Display</div>
          <div className="mm-theme-row">
            {THEMES.map(({ key, label, title }) => (
              <button
                key={key}
                className={`mm-theme-btn${theme === key ? ' active' : ''}`}
                onClick={() => onThemeChange(key)}
                title={title}
              >
                {label}
                <span className="mm-theme-label">{title}</span>
              </button>
            ))}
          </div>
          <div className="mm-divider" />

          {/* Language */}
          <div className="mm-section-label">{t('menu.language')}</div>
          <div className="mm-theme-row">
            {LANGUAGES.map(({ code, label, flag }) => (
              <button
                key={code}
                className={`mm-theme-btn${lang === code ? ' active' : ''}`}
                onClick={() => setLang(code)}
                title={label}
              >
                {flag}
                <span className="mm-theme-label">{label}</span>
              </button>
            ))}
          </div>
          <div className="mm-divider" />

          {/* Settings — only shown when handlers are provided (own profile / feed) */}
          {(onChangeUsername || onChangeEmail || onChangePassword) && (
            <>
              <div className="mm-section-label">Settings</div>
              {onChangeUsername && (
                <button className="mm-item" onClick={() => { setOpen(false); onChangeUsername(); }}>
                  <span className="mm-item-icon">✏️</span>
                  <div className="mm-item-text">
                    <span className="mm-item-label">Change Username</span>
                  </div>
                </button>
              )}
              {onChangeEmail && (
                <button className="mm-item" onClick={() => { setOpen(false); onChangeEmail(); }}>
                  <span className="mm-item-icon">✉️</span>
                  <div className="mm-item-text">
                    <span className="mm-item-label">Change Email</span>
                  </div>
                </button>
              )}
              {onChangePassword && (
                <button className="mm-item" onClick={() => { setOpen(false); onChangePassword(); }}>
                  <span className="mm-item-icon">🔒</span>
                  <div className="mm-item-text">
                    <span className="mm-item-label">Change Password</span>
                  </div>
                </button>
              )}
              <div className="mm-divider" />
            </>
          )}

          {/* Logout */}
          <button
            className="mm-item mm-logout"
            onClick={() => { setOpen(false); onLogout(); }}
          >
            <span className="mm-item-icon">🚪</span>
            <div className="mm-item-text">
              <span className="mm-item-label">Sign Out</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
