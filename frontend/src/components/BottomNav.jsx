import Avatar from './Avatar.jsx';
import { useLang } from '../i18n.jsx';
import { House, Sparkle, Wine, Bell } from '@phosphor-icons/react';

// Icons fill on the active tab (Phosphor "fill" weight) and inherit colour via
// currentColor from .bn-btn (muted → red when active). The Me tab keeps the
// user's avatar — more personal than a generic user glyph.
export default function BottomNav({ view, currentUser, unreadCount, onHome, onNotif, onAddWine, onProfile, onVibes }) {
  const { t } = useLang();
  const SZ = 23;
  return (
    <nav className="bottom-nav">
      {/* Home */}
      <button className={`bn-btn${view === 'feed' ? ' active' : ''}`} onClick={onHome}>
        <span className="bn-icon-wrap">
          <span className="bn-icon"><House size={SZ} weight={view === 'feed' ? 'fill' : 'regular'} /></span>
        </span>
        <span className="bn-label">Home</span>
      </button>

      {/* Discover (Vibe + Search) */}
      <button className={`bn-btn${view === 'vibes' ? ' active' : ''}`} onClick={onVibes}>
        <span className="bn-icon-wrap">
          <span className="bn-icon"><Sparkle size={SZ} weight={view === 'vibes' ? 'fill' : 'regular'} /></span>
        </span>
        <span className="bn-label">{t('nav.vibes')}</span>
      </button>

      {/* Log Wine — centre */}
      <button className="bn-btn bn-add" onClick={onAddWine}>
        <span className="bn-add-inner">
          <span className="bn-add-emoji"><Wine size={24} weight="fill" color="#fff" /></span>
          <span className="bn-add-label">Log</span>
        </span>
      </button>

      {/* Alerts */}
      <button className={`bn-btn${view === 'notifications' ? ' active' : ''}`} onClick={onNotif}>
        <span className="bn-icon-wrap">
          <span className="bn-icon" style={{ position: 'relative', display: 'inline-flex' }}>
            <Bell size={SZ} weight={view === 'notifications' ? 'fill' : 'regular'} />
            {unreadCount > 0 && (
              <span className="bn-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </span>
        </span>
        <span className="bn-label">{t('nav.alerts')}</span>
      </button>

      {/* Profile — keep the avatar, it's more personal than a user glyph */}
      <button className={`bn-btn${view === 'profile' ? ' active' : ''}`} onClick={onProfile}>
        <span className="bn-icon-wrap">
          <span className="bn-icon">
            <Avatar user={currentUser} size={24} />
          </span>
        </span>
        <span className="bn-label">{t('nav.me')}</span>
      </button>
    </nav>
  );
}
