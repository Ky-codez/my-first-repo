import { useState, useRef, useEffect } from 'react';
import { getMoonInfo, TYPE_INFO } from '../utils/moonCalendar.js';
import { useLang, LANGUAGES } from '../i18n.jsx';
import FeedbackModal from './FeedbackModal.jsx';
import { Sun, CloudSun, Moon, List, Champagne } from '@phosphor-icons/react';

const THEMES = [
  { key: 'light', Icon: Sun,      title: 'Light' },
  { key: 'auto',  Icon: CloudSun, title: 'Auto' },
  { key: 'dark',  Icon: Moon,     title: 'Dark' },
];

// Who sees the Founder Dashboard link. Must match the backend ADMIN_USERNAME
// (defaults to 'ky_codez'); update both if you change it.
const ADMIN_USERNAME = 'ky_codez';

export default function MainMenu({ theme, onThemeChange, onLunarClick, onWhatsNewClick, onCellarClick, onLogout, onChangeUsername, onChangeEmail, onChangePassword, onTogglePrivate, isPrivate, currentUser }) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
      <button className="main-menu-btn" onClick={() => setOpen(o => { if (o) setCellarCount(null); return !o; })} title="Menu">
        <span className="main-menu-icon"><List size={22} /></span>
      </button>

      {open && (
        <div className="main-menu-dropdown">
          {/* Founder Dashboard — owner only */}
          {currentUser?.username === ADMIN_USERNAME && (
            <>
              <button className="mm-item" onClick={() => { setOpen(false); window.location.href = '/admin'; }}>
                <span className="mm-item-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </span>
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
              <span className="mm-item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" />
                </svg>
              </span>
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
            <span className="mm-item-icon"><Champagne size={20} weight="fill" /></span>
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

          {/* What's New */}
          {onWhatsNewClick && (
            <button className="mm-item" onClick={() => { setOpen(false); onWhatsNewClick(); }}>
              <span className="mm-item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19" />
                </svg>
              </span>
              <div className="mm-item-text">
                <span className="mm-item-label">What's New</span>
                <span className="mm-item-sub">Latest features &amp; updates</span>
              </div>
            </button>
          )}

          {/* Send Feedback */}
          <button className="mm-item" onClick={() => { setOpen(false); setFeedbackOpen(true); }}>
            <span className="mm-item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <div className="mm-item-text">
              <span className="mm-item-label">Send Feedback</span>
              <span className="mm-item-sub">Report a bug or share an idea</span>
            </div>
          </button>

          <div className="mm-divider" />

          {/* Display mode */}
          <div className="mm-section-label">Display</div>
          <div className="mm-theme-row">
            {THEMES.map(({ key, Icon, title }) => (
              <button
                key={key}
                className={`mm-theme-btn${theme === key ? ' active' : ''}`}
                onClick={() => onThemeChange(key)}
                title={title}
              >
                <Icon size={20} weight={theme === key ? 'fill' : 'regular'} />
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
          {(onChangeUsername || onChangeEmail || onChangePassword || onTogglePrivate) && (
            <>
              <div className="mm-section-label">Settings</div>
              {onTogglePrivate && (
                <button className="mm-item" onClick={() => onTogglePrivate()}>
                  <span className="mm-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d={isPrivate ? 'M7 11V7a5 5 0 0 1 10 0v4' : 'M7 11V7a5 5 0 0 1 9.9-1'} />
                    </svg>
                  </span>
                  <div className="mm-item-text">
                    <span className="mm-item-label">Private account</span>
                    <span className="mm-item-sub">
                      {isPrivate ? 'On — only you can see your profile' : 'Off — anyone can see your profile'}
                    </span>
                  </div>
                  <span className={`mm-toggle${isPrivate ? ' on' : ''}`} aria-hidden="true">
                    <span className="mm-toggle-knob" />
                  </span>
                </button>
              )}
              {onChangeUsername && (
                <button className="mm-item" onClick={() => { setOpen(false); onChangeUsername(); }}>
                  <span className="mm-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </span>
                  <div className="mm-item-text">
                    <span className="mm-item-label">Change Username</span>
                  </div>
                </button>
              )}
              {onChangeEmail && (
                <button className="mm-item" onClick={() => { setOpen(false); onChangeEmail(); }}>
                  <span className="mm-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
                    </svg>
                  </span>
                  <div className="mm-item-text">
                    <span className="mm-item-label">Change Email</span>
                  </div>
                </button>
              )}
              {onChangePassword && (
                <button className="mm-item" onClick={() => { setOpen(false); onChangePassword(); }}>
                  <span className="mm-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
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
            <span className="mm-item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <div className="mm-item-text">
              <span className="mm-item-label">Sign Out</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
