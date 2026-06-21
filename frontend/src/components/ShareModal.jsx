import { useRef, useState } from 'react';
import WineShareCard from './WineShareCard.jsx';
import { wineShareUrl } from '../utils/site.js';

const canNativeShare = () => !!navigator.share && !!navigator.canShare;

export default function ShareModal({ wine, onClose }) {
  const cardRef  = useRef();
  const [status, setStatus] = useState('');

  const buildFilename = () => {
    const parts = [
      wine.username,
      wine.winery,
      wine.name,
      wine.vintage,
      'sipiary',
    ].filter(Boolean).map(p => String(p).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    return `${parts.join('_')}.png`;
  };

  const renderCanvas = async () => {
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(cardRef.current, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      backgroundColor: '#0e0608',
      logging: false,
    });
  };

  const handleShare = async () => {
    setStatus('rendering');
    try {
      const canvas = await renderCanvas();
      const filename = buildFilename();

      // iOS / modern Android — native share sheet
      if (canNativeShare()) {
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${wine.name} — Sipiary`,
            text: `Reviewed by @${wine.username} on Sipiary`,
          });
          setStatus('done');
          setTimeout(() => setStatus(''), 3000);
          return;
        }
      }

      // Desktop fallback — trigger download
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatus('done');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      // User cancelled native share — not an error
      if (err?.name === 'AbortError') { setStatus(''); return; }
      console.error(err);
      setStatus('');
      alert('Could not export image. Try again.');
    }
  };

  const copyLink = async () => {
    // Pretty, author-crediting link: /@username/<wine-slug>.
    const url = wineShareUrl(wine);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setStatus('copied');
    setTimeout(() => setStatus(''), 2500);
  };

  const isMobile = canNativeShare();
  const btnLabel = status === 'rendering'
    ? '⏳ Rendering…'
    : status === 'done'
    ? '✅ Shared!'
    : isMobile ? '📤 Share Image' : '📥 Download Image';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal share-modal">
        <div className="modal-header">
          <h2>📤 Share Wine</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="share-card-preview">
          <WineShareCard wine={wine} forwardRef={cardRef} />
        </div>

        <p className="share-hint">
          {isMobile
            ? 'Share this wine card to Instagram, Messages, AirDrop and more.'
            : 'Download the image or copy the link to share this wine anywhere.'}
        </p>

        <div className="share-actions">
          <button
            className="btn-primary share-dl-btn"
            onClick={handleShare}
            disabled={status === 'rendering'}
          >
            {btnLabel}
          </button>
          <button className="btn-secondary share-link-btn" onClick={copyLink}>
            {status === 'copied' ? '✅ Copied!' : '🔗 Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
