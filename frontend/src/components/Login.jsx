import { useState, useEffect, useRef } from 'react';

const API = '';

function validatePassword(pw) {
  const rules = [
    { ok: pw.length >= 8,              label: '8+ characters' },
    { ok: /[a-z]/.test(pw),           label: '1 lowercase letter' },
    { ok: /[A-Z]/.test(pw),           label: '1 uppercase letter' },
    { ok: /[0-9]/.test(pw),           label: '1 number' },
    { ok: /[^a-zA-Z0-9]/.test(pw),   label: '1 special character' },
  ];
  return rules;
}

export default function Login({ onLogin }) {
  const refUsername = new URLSearchParams(window.location.search).get('ref');
  const [mode,           setMode]           = useState(refUsername ? 'register' : 'login');
  const [username,       setUsername]       = useState('');
  const [email,          setEmail]          = useState('');
  const [emailConfirm,   setEmailConfirm]   = useState('');
  const [password,       setPassword]       = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [rememberMe,     setRememberMe]     = useState(true);
  const [agreed,         setAgreed]         = useState(false);   // legal-age + Terms consent (register)
  const [website,        setWebsite]        = useState('');      // honeypot — humans leave this empty
  const [pwFocused,      setPwFocused]      = useState(false);
  const [showPw,         setShowPw]         = useState(false);
  const [showPwConfirm,  setShowPwConfirm]  = useState(false);

  // Live availability checks (register mode)
  const [usernameAvail, setUsernameAvail] = useState(null); // null=unchecked, true=ok, false=taken
  const [emailAvail,    setEmailAvail]    = useState(null);
  const usernameTimer = useRef(null);
  const emailTimer    = useRef(null);

  useEffect(() => {
    if (mode !== 'register' || username.trim().length < 1) { setUsernameAvail(null); return; }
    clearTimeout(usernameTimer.current);
    setUsernameAvail(null);
    usernameTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`${API}/api/auth/check-username?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        setUsernameAvail(data.available);
      } catch { setUsernameAvail(null); }
    }, 500);
    return () => clearTimeout(usernameTimer.current);
  }, [username, mode]);

  useEffect(() => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (mode !== 'register' || !valid) { setEmailAvail(null); return; }
    clearTimeout(emailTimer.current);
    setEmailAvail(null);
    emailTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`${API}/api/auth/check-email?email=${encodeURIComponent(email.trim())}`);
        const data = await res.json();
        setEmailAvail(data.available);
      } catch { setEmailAvail(null); }
    }, 500);
    return () => clearTimeout(emailTimer.current);
  }, [email, mode]);

  // Forgot-password sub-flow
  const [forgotMode,     setForgotMode]     = useState(false);
  const [forgotEmail,    setForgotEmail]    = useState('');
  const [forgotSent,     setForgotSent]     = useState(false);
  const [forgotLoading,  setForgotLoading]  = useState(false);
  const [forgotError,    setForgotError]    = useState('');

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError('');
    try {
      await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setForgotSent(true);
    } catch {
      setForgotError('Could not connect. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const pwRules    = validatePassword(password);
  const pwValid    = pwRules.every(r => r.ok);
  const emailMatch = email === emailConfirm;
  const pwMatch    = password === passwordConfirm;

  const switchMode = (m) => { setMode(m); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    if (mode === 'register') {
      if (!email) return setError('Email is required');
      if (!emailMatch) return setError('Emails do not match');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Invalid email address');
      if (!pwValid) return setError('Password does not meet requirements');
      if (!pwMatch) return setError('Passwords do not match');
      if (!agreed) return setError('Please confirm you are of legal drinking age and agree to the Terms.');
    }

    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const ref = new URLSearchParams(window.location.search).get('ref');
      const body = mode === 'register'
        ? { username: username.trim(), password, email: email.trim(), tos_agreed: true, website, ...(ref ? { ref } : {}) }
        : { username: username.trim(), password, rememberMe };
      const res  = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      onLogin(data.token, data.user, mode === 'register');
    } catch {
      setError('Could not connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">🍷</div>
        <h1 className="login-title">Sipiary</h1>
        <p className="login-sub">Wine, your way — track it, discover it, share it</p>

        {refUsername && (
          <div className="login-ref-banner">🤝 <strong>@{refUsername}</strong> invited you to Sipiary — sign up to say cheers!</div>
        )}

        <div className="login-mode-toggle">
          <button className={`login-mode-btn${mode === 'login' ? ' active' : ''}`} onClick={() => switchMode('login')}>Login</button>
          <button className={`login-mode-btn${mode === 'register' ? ' active' : ''}`} onClick={() => switchMode('register')}>Register</button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Honeypot — hidden from humans; bots that fill it are rejected server-side */}
          {mode === 'register' && (
            <input
              type="text" name="website" className="hp-field"
              tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={website} onChange={e => setWebsite(e.target.value)}
            />
          )}
          <input
            placeholder={mode === 'login' ? 'Username or email' : 'Username'}
            value={username}
            onChange={e => setUsername(mode === 'login' ? e.target.value : e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            maxLength={mode === 'login' ? 254 : 32}
            autoFocus
            autoComplete={mode === 'login' ? 'username email' : 'username'}
            style={mode === 'register' && username.trim().length >= 1
              ? { borderColor: usernameAvail === true ? '#4caf50' : usernameAvail === false ? '#e74c3c' : '' }
              : {}}
          />
          {mode === 'register' && username.trim().length >= 1 && usernameAvail === false && (
            <p className="confirm-match-hint" style={{ margin: 0 }}>✗ That username is already taken</p>
          )}
          {mode === 'register' && username.trim().length >= 1 && usernameAvail === true && (
            <p className="confirm-match-hint ok" style={{ margin: 0 }}>✓ Username is available</p>
          )}

          {mode === 'register' && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onPaste={e => e.preventDefault()}
                onCopy={e => e.preventDefault()}
                autoComplete="email"
                style={{ borderColor: email
                  ? emailAvail === false ? '#e74c3c'
                  : emailAvail === true ? '#4caf50'
                  : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '#4caf50' : '#e74c3c'
                  : '' }}
              />
              {email && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && (
                <p className="confirm-match-hint" style={{ margin: 0 }}>⚠ Please enter a valid email address</p>
              )}
              {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && emailAvail === false && (
                <p className="confirm-match-hint" style={{ margin: 0 }}>✗ An account with that email already exists</p>
              )}
              {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && emailAvail === true && (
                <p className="confirm-match-hint ok" style={{ margin: 0 }}>✓ Email is available</p>
              )}
              <input
                type="email"
                placeholder="Confirm email"
                value={emailConfirm}
                onChange={e => setEmailConfirm(e.target.value)}
                onPaste={e => e.preventDefault()}
                onCopy={e => e.preventDefault()}
                autoComplete="email"
                disabled={!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))}
                style={{ borderColor: emailConfirm ? (emailMatch ? '#4caf50' : '#e74c3c') : '', opacity: !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? 0.4 : 1 }}
              />
              {emailConfirm && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && (
                <p className="confirm-match-hint" style={{ margin: 0 }}>⚠ Please enter a valid email address</p>
              )}
              {emailConfirm && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <p className={`confirm-match-hint${emailMatch ? ' ok' : ''}`} style={{ margin: 0 }}>
                  {emailMatch ? '✓ Emails match' : '✗ Emails do not match'}
                </p>
              )}
            </>
          )}

          <div className="pw-field-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              onPaste={mode === 'register' ? e => e.preventDefault() : undefined}
              onCopy={e => e.preventDefault()}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
            <div className="pw-field-actions">
              {password && <button type="button" className="pw-clear-btn" onClick={() => setPassword('')} tabIndex={-1}>×</button>}
              <button type="button" className="pw-toggle-btn" onClick={() => setShowPw(s => !s)} tabIndex={-1}>
                {showPw
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {mode === 'login' && !forgotMode && (
            <p className="forgot-pw-link" onClick={() => { setForgotMode(true); setForgotSent(false); setForgotEmail(''); setForgotError(''); }}>
              Forgot password?
            </p>
          )}

          {/* Password strength rules — show when registering & password field touched */}
          {mode === 'register' && (pwFocused || password) && (
            <div className="pw-rules">
              {pwRules.map(r => (
                <span key={r.label} className={`pw-rule${r.ok ? ' ok' : ''}`}>
                  {r.ok ? '✓' : '✗'} {r.label}
                </span>
              ))}
            </div>
          )}

          {mode === 'register' && (
            <>
              <div className="pw-field-wrap">
                <input
                  type={showPwConfirm ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  onPaste={e => e.preventDefault()}
                  onCopy={e => e.preventDefault()}
                  autoComplete="new-password"
                  style={{ borderColor: passwordConfirm ? (pwMatch ? '#4caf50' : '#e74c3c') : '' }}
                />
                <div className="pw-field-actions">
                  {passwordConfirm && <button type="button" className="pw-clear-btn" onClick={() => setPasswordConfirm('')} tabIndex={-1}>×</button>}
                  <button type="button" className="pw-toggle-btn" onClick={() => setShowPwConfirm(s => !s)} tabIndex={-1}>
                    {showPwConfirm
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
              {passwordConfirm && (
                <p className={`confirm-match-hint${pwMatch ? ' ok' : ''}`} style={{ margin: 0 }}>
                  {pwMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </>
          )}

          {mode === 'login' && (
            <label className="remember-me-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span>Remember me for 30 days</span>
            </label>
          )}

          {mode === 'register' && (
            <label className="tos-consent-row">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span>
                I'm of legal drinking age and agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> &amp;{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
              </span>
            </label>
          )}

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password || (mode === 'register' && (!agreed || !pwValid || !pwMatch || !emailMatch || !email || usernameAvail === false || emailAvail === false))}
          >
            {loading ? '...' : mode === 'register' ? 'Create Account →' : 'Enter Sipiary →'}
          </button>

        </form>

        {mode === 'login' && forgotMode && (
          <div className="forgot-pw-panel">
            {forgotSent ? (
              <div className="forgot-pw-sent">
                <div className="forgot-pw-sent-icon">📬</div>
                <p className="forgot-pw-sent-title">Check your inbox</p>
                <p className="forgot-pw-sent-sub">If an account with that email exists, we sent a reset link. Check your spam folder too.</p>
                <button
                  type="button"
                  className="forgot-pw-back"
                  onClick={() => { setForgotMode(false); setForgotSent(false); }}
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="forgot-pw-form">
                <p className="forgot-pw-label">Enter your account email and we'll send you a reset link.</p>
                <input
                  type="email"
                  placeholder="Your email address"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  autoFocus
                  autoComplete="email"
                />
                {forgotError && <p className="login-error">{forgotError}</p>}
                <div className="forgot-pw-actions">
                  <button type="button" className="forgot-pw-back" onClick={() => setForgotMode(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading || !forgotEmail.trim()}>
                    {forgotLoading ? '...' : 'Send reset link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <p className="login-legal">
          <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · Drink responsibly 🍷
        </p>
      </div>
    </div>
  );
}
