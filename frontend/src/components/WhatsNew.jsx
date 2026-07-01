// User-facing "What's New" — a simple two-column timeline: date on the left,
// features on the right. (The detailed version lives in the admin dashboard.)
// When you ship something, add a row at the top.

const RELEASES = [
  {
    date: 'Jun 2026',
    items: [
      'Tag the people you tasted a wine with.',
      'Send Feedback from the menu to report bugs or ideas.',
      'This What’s New page.',
    ],
  },
  {
    date: 'Jun 2026',
    items: [
      'Private accounts with follow requests (approve who sees your wines).',
      'Palate-match % shown on suggested people.',
      'A cleaner, more polished look.',
    ],
  },
  {
    date: 'Jun 2026',
    items: [
      'Much faster photo loading on mobile.',
      'Today’s Moon — your biodynamic day type on the home feed.',
      'Scan a bottle barcode to auto-fill a wine.',
    ],
  },
  {
    date: 'Jun 2026',
    items: [
      'One-tap mood logging and a “wine persona” at sign-up.',
      'Forgot-password reset and instant notifications.',
      'A taste profile that sums up your palate.',
    ],
  },
];

import { WineTypeIcon } from './wineIcons.jsx';

export default function WhatsNew({ onBack }) {
  return (
    <div className="whatsnew-page">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="whatsnew-hero">
        <h1>What’s New</h1>
        <p>The latest features and improvements in Sipiary.</p>
      </div>

      <div className="wn-table">
        {RELEASES.map((r, i) => (
          <div key={i} className="wn-row">
            <div className="wn-when">{r.date}</div>
            <ul className="wn-what">
              {r.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <p className="whatsnew-foot"><WineTypeIcon type="Red" size={15} /> Thanks for being part of Sipiary.</p>
    </div>
  );
}
