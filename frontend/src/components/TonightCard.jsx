import { useEffect, useState } from 'react';
import { Wine, X } from '@phosphor-icons/react';

const API = '';

// Gentle inventory nudge — deliberately NOT pushy:
//   • only appears when the user actually owns bottles (list = 'cellar')
//   • dismiss or tap snoozes it for SNOOZE_DAYS (client-side, per device)
//   • the pick itself rotates daily on the server, so it never harps on
//     the same bottle
const SNOOZE_KEY  = 'sipiary_tonight_snooze';
const SNOOZE_DAYS = 4;

export default function TonightCard({ currentUser, onLog }) {
  const [pick, setPick] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (Date.now() < until) return;
    fetch(`${API}/api/cellar/tonight`)
      .then(r => (r.ok ? r.json() : null))
      .then(setPick)
      .catch(() => {});
  }, [currentUser]);

  if (!pick) return null;

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
    setPick(null);
  };

  const openIt = () => {
    snooze();
    onLog({ name: pick.name, winery: pick.winery, vintage: pick.vintage, type: pick.type });
  };

  const title = [pick.name, pick.vintage].filter(Boolean).join(' ');

  return (
    <div className="tonight-card">
      <Wine size={20} weight="fill" className="tonight-icon" />
      <button className="tonight-body" onClick={openIt}>
        <span className="tonight-eyebrow">Tonight, from your cellar</span>
        <span className="tonight-title">
          {title}{pick.winery ? <span className="tonight-winery"> · {pick.winery}</span> : null}
        </span>
        <span className="tonight-reason">{pick.reason}</span>
      </button>
      <button className="tonight-open-btn" onClick={openIt}>Open it</button>
      <button className="tonight-dismiss" onClick={snooze} aria-label="Dismiss for a few days">
        <X size={14} />
      </button>
    </div>
  );
}
