import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'flag-icons/css/flag-icons.min.css'
import App from './App.jsx'
import { LangProvider } from './i18n.jsx'

// ─── One-time rebrand migration ────────────────────────────────────────────────
// Storage keys moved from wineiary_* to sipiary_*. Copy any legacy keys over so
// existing sessions and preferences survive the rename without a forced logout.
try {
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith('wineiary_')) continue;
    const next = 'sipiary_' + key.slice('wineiary_'.length);
    if (localStorage.getItem(next) === null) localStorage.setItem(next, localStorage.getItem(key));
    localStorage.removeItem(key);
  }
} catch { /* private mode / storage disabled — nothing to migrate */ }

// ─── API auth ────────────────────────────────────────────────────────────────
// Every same-origin /api request automatically carries the login token.
// The backend uses this header — never a user id in the body — to know who
// is acting, so components don't each need to attach it themselves.
const realFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (url.startsWith('/api')) {
    const token = localStorage.getItem('sipiary_token');
    if (token && !init.headers?.Authorization) {
      init = { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } };
    }
  }
  return realFetch(input, init);
};

// Register the service worker — makes Sipiary installable as a PWA.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>,
)
