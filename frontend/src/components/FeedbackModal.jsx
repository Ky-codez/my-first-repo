import { useState } from 'react';

const API = '';

const TYPES = [
  { key: 'bug',   label: 'Bug' },
  { key: 'idea',  label: 'Idea' },
  { key: 'other', label: 'Other' },
];

// Lightweight feedback / bug-report form. Submits to /api/feedback, which the
// owner reads in the Founder Dashboard.
export default function FeedbackModal({ onClose }) {
  const [type, setType]       = useState('bug');
  const [message, setMessage] = useState('');
  const [status, setStatus]   = useState('');   // '' | 'sending' | 'done' | 'error'

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch(`${API}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus('done');
      setTimeout(onClose, 1400);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal feedback-modal">
        <div className="modal-header">
          <h2>Send Feedback</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {status === 'done' ? (
          <div className="feedback-done">
            <p className="feedback-done-title">Thank you!</p>
            <p className="feedback-done-sub">Your feedback has been sent. We read every message.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="feedback-form">
            <p className="feedback-intro">Found a bug or have an idea? Let us know — it goes straight to the team.</p>
            <div className="feedback-type-row">
              {TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`feedback-type-btn${type === t.key ? ' active' : ''}`}
                  onClick={() => setType(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              className="feedback-textarea"
              rows={5}
              maxLength={2000}
              placeholder={type === 'bug' ? 'What went wrong? What were you doing?' : 'Tell us more…'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              autoFocus
            />
            {status === 'error' && <p className="login-error">Could not send. Please try again.</p>}
            <button type="submit" className="btn-primary" disabled={status === 'sending' || !message.trim()}>
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
