/**
 * Age gate — shown once on first visit (Sipiary is an alcohol-related app).
 * The answer is remembered in localStorage so returning visitors aren't asked
 * again. "No" shows a polite block screen instead of letting them in.
 */
import { useState } from 'react';

export default function AgeGate({ onConfirm }) {
  const [denied, setDenied] = useState(false);

  const confirm = () => {
    try { localStorage.setItem('sipiary_age_ok', new Date().toISOString()); } catch {}
    onConfirm();
  };

  if (denied) {
    return (
      <div className="age-gate">
        <div className="age-gate-box">
          <div className="age-gate-logo">🍷</div>
          <h1 className="age-gate-title">Come back soon</h1>
          <p className="age-gate-text">
            Sorry — you must be of legal drinking age to use Sipiary. Please
            visit again when you are.
          </p>
          <button className="age-gate-secondary" onClick={() => setDenied(false)}>
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="age-gate">
      <div className="age-gate-box">
        <div className="age-gate-logo">🍷</div>
        <h1 className="age-gate-title">Welcome to Sipiary</h1>
        <p className="age-gate-sub">Wine, your way — track it, discover it, share it</p>
        <p className="age-gate-text">
          You must be of <strong>legal drinking age</strong> in your country to
          enter.
        </p>
        <p className="age-gate-question">Are you of legal drinking age?</p>
        <div className="age-gate-actions">
          <button className="age-gate-primary" onClick={confirm}>Yes, enter 🍷</button>
          <button className="age-gate-secondary" onClick={() => setDenied(true)}>No, I'm not</button>
        </div>
        <p className="age-gate-fine">
          By entering you agree to our{' '}
          <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
          Please enjoy wine responsibly.
        </p>
      </div>
    </div>
  );
}
