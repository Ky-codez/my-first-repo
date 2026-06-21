/**
 * Add-to-Home-Screen guide. Helps phone users install Sipiary so it runs
 * full-screen (no browser address/nav bars = more usable space).
 *  - Android/Chrome: captures the native install prompt and offers one tap.
 *  - iOS/Safari: iOS has no programmatic install, so we show the steps.
 * Shows a dismissible banner automatically; the ☰ menu can reopen the full
 * guide anytime via the 'open-install-guide' event.
 */
import { useEffect, useState } from 'react';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);

export default function InstallGuide() {
  const [deferred, setDeferred] = useState(null); // Android beforeinstallprompt
  const [banner, setBanner]     = useState(false);
  const [open, setOpen]         = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if ((isIOS() || isAndroid()) && !localStorage.getItem('sipiary_a2hs_dismissed')) setBanner(true);

    const onBIP = (e) => { e.preventDefault(); setDeferred(e); };
    const onOpen = () => setOpen(true);
    const onInstalled = () => {
      setBanner(false); setOpen(false);
      localStorage.setItem('sipiary_a2hs_dismissed', '1');
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('open-install-guide', onOpen);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('open-install-guide', onOpen);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => { setBanner(false); localStorage.setItem('sipiary_a2hs_dismissed', '1'); };

  const androidInstall = async () => {
    if (!deferred) { setOpen(true); return; }
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null); setBanner(false);
  };

  if (isStandalone() || (!banner && !open)) return null;

  const ios = isIOS();

  return (
    <>
      {banner && !open && (
        <div className="a2hs-banner">
          <span className="a2hs-icon">📲</span>
          <div className="a2hs-text">
            <strong>Add Sipiary to your home screen</strong>
            <span>Full-screen &amp; app-like — no browser bars.</span>
          </div>
          {ios
            ? <button className="a2hs-cta" onClick={() => setOpen(true)}>How?</button>
            : <button className="a2hs-cta" onClick={androidInstall}>Install</button>}
          <button className="a2hs-close" onClick={dismiss} aria-label="Dismiss">✕</button>
        </div>
      )}

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal a2hs-modal">
            <div className="modal-header">
              <h2>📲 Add to Home Screen</h2>
              <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="a2hs-body">
              <p className="a2hs-why">
                Install Sipiary for the full-screen, app-like experience — it opens in
                its own window with no browser address bar, so you get more room. 🍷
              </p>
              {ios ? (
                <ol className="a2hs-steps">
                  <li>Tap the <strong>Share</strong> button <span className="a2hs-glyph">↑</span> at the bottom of Safari.</li>
                  <li>Scroll and tap <strong>Add to Home Screen</strong> <span className="a2hs-glyph">＋</span>.</li>
                  <li>Tap <strong>Add</strong> in the top-right.</li>
                  <li>Launch <strong>Sipiary</strong> from your home screen.</li>
                </ol>
              ) : deferred ? (
                <>
                  <p className="a2hs-why" style={{ marginBottom: '0.8rem' }}>Tap below, then confirm <strong>Install</strong>.</p>
                  <button className="btn-primary" style={{ width: '100%' }} onClick={androidInstall}>📲 Install Sipiary</button>
                </>
              ) : (
                <ol className="a2hs-steps">
                  <li>Tap the <strong>⋮ menu</strong> (top-right of Chrome).</li>
                  <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
                  <li>Confirm <strong>Install</strong>.</li>
                  <li>Launch <strong>Sipiary</strong> from your home screen.</li>
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
