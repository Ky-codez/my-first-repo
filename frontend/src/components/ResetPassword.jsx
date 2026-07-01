import { useState, useEffect } from 'react';
import { Eye, EyeSlash, CheckCircle } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';

const API = '';

function validatePassword(pw) {
  return [
    { ok: pw.length >= 8,           label: '8+ characters' },
    { ok: /[a-z]/.test(pw),         label: '1 lowercase letter' },
    { ok: /[A-Z]/.test(pw),         label: '1 uppercase letter' },
    { ok: /[0-9]/.test(pw),         label: '1 number' },
    { ok: /[^a-zA-Z0-9]/.test(pw),  label: '1 special character' },
  ];
}

// Standalone page shown at /reset-password?token=… — no login required.
export default function ResetPassword({ token, onDone }) {
  const [checking,        setChecking]        = useState(true);
  const [valid,           setValid]           = useState(false);
  const [password,        setPassword]        = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [done,            setDone]            = useState(false);

  // Validate the token up front so we can show "expired link" before the form.
  useEffect(() => {
    if (!token) { setChecking(false); setValid(false); return; }
    fetch(`${API}/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => { setValid(!!d.valid); setChecking(false); })
      .catch(() => { setValid(false); setChecking(false); });
  }, [token]);

  const pwRules = validatePassword(password);
  const pwValid = pwRules.every(r => r.ok);
  const pwMatch = password === passwordConfirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pwValid) return setError('Password does not meet requirements');
    if (!pwMatch)  return setError('Passwords do not match');
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setDone(true);
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo"><WineTypeIcon type="Red" size={48} /></div>
        <h1 className="login-title">Sipiary</h1>

        {checking && <p className="login-sub">Checking your reset link…</p>}

        {!checking && !valid && !done && (
          <>
            <p className="login-sub">This reset link is invalid or has expired.</p>
            <button type="button" onClick={onDone} style={{ marginTop: '1rem', width: '100%' }}>
              Back to login
            </button>
          </>
        )}

        {!checking && valid && !done && (
          <>
            <p className="login-sub">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="pw-field-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="new-password"
                />
                <div className="pw-field-actions">
                  {password && <button type="button" className="pw-clear-btn" onClick={() => setPassword('')} tabIndex={-1}>×</button>}
                  <button type="button" className="pw-toggle-btn" onClick={() => setShowPw(s => !s)} tabIndex={-1}>
                    {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {(password) && (
                <div className="pw-rules">
                  {pwRules.map(r => (
                    <span key={r.label} className={`pw-rule${r.ok ? ' ok' : ''}`}>
                      {r.ok ? '✓' : '✗'} {r.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="pw-field-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  style={{ borderColor: passwordConfirm ? (pwMatch ? '#4caf50' : '#e74c3c') : '' }}
                />
              </div>
              {passwordConfirm && (
                <p className={`confirm-match-hint${pwMatch ? ' ok' : ''}`} style={{ margin: 0 }}>
                  {pwMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}

              {error && <p className="login-error">{error}</p>}

              <button type="submit" disabled={loading || !pwValid || !pwMatch}>
                {loading ? '...' : 'Set new password →'}
              </button>
            </form>
          </>
        )}

        {done && (
          <div className="forgot-pw-sent">
            <div className="forgot-pw-sent-icon"><CheckCircle size={40} weight="fill" color="#5bb463" /></div>
            <p className="forgot-pw-sent-title">Password updated</p>
            <p className="forgot-pw-sent-sub">You've been logged out of all devices for safety. Log in with your new password.</p>
            <button type="button" onClick={onDone} style={{ marginTop: '1rem', width: '100%' }}>
              Go to login
            </button>
          </div>
        )}

        <p className="login-legal">
          <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · Drink responsibly
        </p>
      </div>
    </div>
  );
}
