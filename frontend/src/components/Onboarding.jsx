import { useState, useEffect } from 'react';
import Avatar from './Avatar.jsx';

const API = '';

const WINE_TYPES = [
  { label: 'Red',       emoji: '🍷', color: '#e74c3c', hint: 'Pinot Noir, Cabernet, Merlot' },
  { label: 'White',     emoji: '🥂', color: '#f1c40f', hint: 'Chardonnay, Riesling, Sauvignon' },
  { label: 'Rosé',      emoji: '🌸', color: '#e91e8c', hint: 'Provence, blush styles' },
  { label: 'Sparkling', emoji: '✨', color: '#3498db', hint: 'Prosecco, Cava, Crémant' },
  { label: 'Champagne', emoji: '🍾', color: '#d4af37', hint: 'The real deal, from Champagne' },
  { label: 'Dessert',   emoji: '🍯', color: '#e67e22', hint: 'Sauternes, ice wine, Tokaji' },
  { label: 'Fortified', emoji: '🏺', color: '#9b59b6', hint: 'Port, Sherry, Madeira' },
  { label: 'Spirit',    emoji: '🥃', color: '#8d6e63', hint: 'Whisky, gin, rum, brandy' },
];

const GRAPES = [
  'Pinot Noir', 'Chardonnay', 'Cabernet Sauvignon', 'Merlot',
  'Sauvignon Blanc', 'Riesling', 'Syrah', 'Grenache',
  'Sangiovese', 'Tempranillo', 'Nebbiolo', 'Malbec',
  'Chenin Blanc', 'Pinot Gris', 'Gamay', 'Zinfandel',
];

// Picking a persona sets the default logging mode (which AddWine reads from
// localStorage), so a beginner gets the 2-tap mood log while a student gets
// the full WSET-style tasting sheet — without ever touching a settings page.
const PERSONAS = [
  { key: 'beginner',   emoji: '😊', logMode: 'mood',  title: "I'm new to wine",   sub: 'Keep it simple — just log how it made you feel' },
  { key: 'enthusiast', emoji: '🍷', logMode: 'quick', title: 'I know what I like', sub: 'Quick logging — name, photo, a pour rating' },
  { key: 'student',    emoji: '🎓', logMode: 'full',  title: 'I take it seriously', sub: 'Full structured tasting notes (WSET-style)' },
];

export default function Onboarding({ currentUser, onDone }) {
  const [step,        setStep]        = useState(1);
  const [persona,     setPersona]     = useState(null);
  const [selTypes,    setSelTypes]    = useState(new Set());
  const [selGrapes,   setSelGrapes]   = useState(new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [followed,    setFollowed]    = useState(new Set());

  const TOTAL_STEPS = 4;

  // Load follow suggestions for the final step
  useEffect(() => {
    if (step !== 4) return;
    fetch(`${API}/api/users/suggestions?currentUserId=${currentUser.id}`)
      .then(r => r.json())
      .then(d => setSuggestions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [step, currentUser.id]);

  // Picking a persona applies its default log mode immediately, so it sticks
  // even if the user skips the rest of onboarding.
  const pickPersona = (p) => {
    setPersona(p.key);
    localStorage.setItem('sipiary_log_mode', p.logMode);
    localStorage.setItem('sipiary_persona', p.key);
  };

  const toggleType = (value) => {
    setSelTypes(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const toggleGrape = (value) => {
    setSelGrapes(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const followUser = async (userId) => {
    setFollowed(f => new Set(f).add(userId));
    await fetch(`${API}/api/users/${userId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower_id: currentUser.id }),
    }).catch(() => {});
  };

  const saveTags = async () => {
    const token = localStorage.getItem('sipiary_token');
    await fetch(`${API}/api/users/${currentUser.id}/taste-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ types: [...selTypes], grapes: [...selGrapes] }),
    }).catch(() => {});
  };

  const next = async () => {
    if (step < TOTAL_STEPS) return setStep(step + 1);
    await saveTags();
    onDone();
  };

  const skipAll = async () => {
    // keep whatever was picked before skipping
    if (selTypes.size || selGrapes.size) await saveTags();
    onDone();
  };

  return (
    <div className="onboarding-page">
      <div className="ob-card">
        <div className="ob-progress">
          {[1, 2, 3, 4].map(s => (
            <span key={s} className={`ob-progress-bar${s <= step ? ' active' : ''}`} />
          ))}
        </div>
        <p className="ob-step-label">Step {step} of {TOTAL_STEPS}</p>

        {step === 1 && (
          <>
            <h2 className="ob-title">Welcome! How would you describe yourself?</h2>
            <p className="ob-sub">This sets how logging works — you can change it anytime</p>
            <div className="ob-persona-list">
              {PERSONAS.map(p => (
                <button
                  key={p.key}
                  className={`ob-persona-card${persona === p.key ? ' selected' : ''}`}
                  onClick={() => pickPersona(p)}
                >
                  <span className="ob-persona-emoji">{p.emoji}</span>
                  <span className="ob-persona-text">
                    <span className="ob-persona-title">{p.title}</span>
                    <span className="ob-persona-sub">{p.sub}</span>
                  </span>
                  <span className="ob-persona-check">{persona === p.key ? '✓' : ''}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="ob-title">What do you like to drink?</h2>
            <p className="ob-sub">Pick as many as you like</p>
            <div className="ob-type-grid">
              {WINE_TYPES.map(t => (
                <button
                  key={t.label}
                  className={`ob-type-card${selTypes.has(t.label) ? ' selected' : ''}`}
                  style={selTypes.has(t.label) ? { borderColor: t.color } : {}}
                  onClick={() => toggleType(t.label)}
                >
                  <span className="ob-type-emoji">{t.emoji}</span>
                  <span className="ob-type-label">{t.label}</span>
                  <span className="ob-type-hint">{t.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="ob-title">Any favourite grapes?</h2>
            <p className="ob-sub">We'll show you more of what you love</p>
            <div className="ob-grape-wrap">
              {GRAPES.map(g => (
                <button
                  key={g}
                  className={`ob-grape-chip${selGrapes.has(g) ? ' selected' : ''}`}
                  onClick={() => toggleGrape(g)}
                >
                  🍇 {g}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="ob-title">Follow some wine lovers</h2>
            <p className="ob-sub">Their reviews will fill your Following feed</p>
            <div className="ob-suggestions">
              {suggestions.length === 0 && (
                <p className="ob-empty">No suggestions yet — you can find people via search later!</p>
              )}
              {suggestions.map(u => (
                <div key={u.id} className="fs-card">
                  <div className="fs-user">
                    <Avatar user={u} size={42} />
                    <span className="fs-info">
                      <span className="fs-name">@{u.username}</span>
                      <span className="fs-meta">{u.post_count} {u.post_count === 1 ? 'post' : 'posts'} · {u.follower_count} {u.follower_count === 1 ? 'follower' : 'followers'}</span>
                    </span>
                  </div>
                  <button
                    className={`fs-follow-btn${followed.has(u.id) ? ' done' : ''}`}
                    disabled={followed.has(u.id)}
                    onClick={() => followUser(u.id)}
                  >
                    {followed.has(u.id) ? '✓ Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="ob-continue" onClick={next} disabled={step === 1 && !persona}>
          {step < TOTAL_STEPS ? 'Continue' : 'Start exploring →'}
        </button>
        <button className="ob-skip" onClick={skipAll}>Skip for now</button>
      </div>
    </div>
  );
}
