import { useEffect, useRef, useState } from 'react';
import WineShareCard from './WineShareCard.jsx';
import { wineShareUrl } from '../utils/site.js';
import { renderStoryImage } from '../utils/storyImage.js';

const canNativeShare = () => !!navigator.share && !!navigator.canShare;

// Best-effort clipboard write. Done FIRST in the share gesture so the user can
// paste the review link as a story link sticker right after posting the image.
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

export default function ShareModal({ wine, onClose }) {
  const cardRef  = useRef();
  const [status, setStatus] = useState('');
  const [format, setFormat] = useState('story');   // 'story' | 'card'
  const [storyPreview, setStoryPreview] = useState(null);

  const shareLink = wineShareUrl(wine);

  // Pre-render the story preview when the tab is active (QR first, then image).
  useEffect(() => {
    if (format !== 'story' || storyPreview) return;
    let on = true;
    (async () => {
      let qr = null;
      try {
        const { default: QRCode } = await import('qrcode');
        qr = await QRCode.toDataURL(shareLink, { margin: 1, width: 240, color: { dark: '#0e0608', light: '#f5ece6' } });
      } catch { /* story renders without the QR */ }
      const canvas = await renderStoryImage(wine, qr);
      if (on) setStoryPreview(canvas.toDataURL('image/png'));
    })();
    return () => { on = false; };
  }, [format, storyPreview, wine, shareLink]);

  const buildFilename = (suffix) => {
    const parts = [
      wine.username,
      wine.winery,
      wine.name,
      wine.vintage,
      suffix,
      'sipiary',
    ].filter(Boolean).map(p => String(p).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    return `${parts.join('_')}.png`;
  };

  const renderCardCanvas = async () => {
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
    // Copy the link at the START of the gesture — this is the tap-through
    // mechanic: post the image to a story, paste the link as a link sticker.
    const linkCopied = await copyToClipboard(shareLink);
    try {
      let canvas, filename;
      if (format === 'story') {
        let qr = null;
        try {
          const { default: QRCode } = await import('qrcode');
          qr = await QRCode.toDataURL(shareLink, { margin: 1, width: 240, color: { dark: '#0e0608', light: '#f5ece6' } });
        } catch { /* optional */ }
        canvas = await renderStoryImage(wine, qr);
        filename = buildFilename('story');
      } else {
        canvas = await renderCardCanvas();
        filename = buildFilename('');
      }

      // iOS / modern Android — native share sheet
      if (canNativeShare()) {
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${wine.name} — Sipiary`,
            text: `Reviewed by @${wine.username} on Sipiary — ${shareLink}`,
          });
          setStatus(linkCopied ? 'done-copied' : 'done');
          setTimeout(() => setStatus(''), 5000);
          return;
        }
      }

      // Desktop fallback — trigger download
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatus(linkCopied ? 'done-copied' : 'done');
      setTimeout(() => setStatus(''), 5000);
    } catch (err) {
      // User cancelled native share — not an error
      if (err?.name === 'AbortError') { setStatus(''); return; }
      console.error(err);
      setStatus('');
      alert('Could not export image. Try again.');
    }
  };

  const copyLink = async () => {
    await copyToClipboard(shareLink);
    setStatus('copied');
    setTimeout(() => setStatus(''), 2500);
  };

  const isMobile = canNativeShare();
  const btnLabel = status === 'rendering'
    ? 'Rendering…'
    : status.startsWith('done')
    ? 'Shared!'
    : isMobile ? (format === 'story' ? 'Share to Story' : 'Share Image') : 'Download Image';

  const hint = status === 'done-copied'
    ? 'Link copied — add a link sticker to your story and paste it, so viewers can tap through to your review.'
    : format === 'story'
    ? (isMobile
        ? 'Made for stories. Your review link is copied when you share — paste it as a link sticker so viewers can tap through.'
        : 'A 9:16 image for Instagram or WhatsApp stories. Sharing also copies your review link for the story’s link sticker.')
    : (isMobile
        ? 'Share this wine card to Instagram, Messages, AirDrop and more.'
        : 'Download the image or copy the link to share this wine anywhere.');

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal share-modal">
        <div className="modal-header">
          <h2>Share Wine</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="share-fmt-toggle">
          <button
            className={`share-fmt-btn${format === 'story' ? ' active' : ''}`}
            onClick={() => setFormat('story')}
          >Story</button>
          <button
            className={`share-fmt-btn${format === 'card' ? ' active' : ''}`}
            onClick={() => setFormat('card')}
          >Card</button>
        </div>

        <div className="share-card-preview">
          {format === 'story' ? (
            storyPreview
              ? <img src={storyPreview} alt="Story preview" className="share-story-preview" />
              : <div className="share-story-preview share-story-loading">Rendering preview…</div>
          ) : (
            <WineShareCard wine={wine} forwardRef={cardRef} />
          )}
        </div>
        {/* The card canvas must exist in the DOM for html2canvas even when the
            story tab is showing — keep it rendered but visually hidden. */}
        {format === 'story' && (
          <div style={{ position: 'absolute', left: -10000, top: 0, width: 420 }} aria-hidden="true">
            <WineShareCard wine={wine} forwardRef={cardRef} />
          </div>
        )}

        <p className="share-hint">{hint}</p>

        <div className="share-actions">
          <button
            className="btn-primary share-dl-btn"
            onClick={handleShare}
            disabled={status === 'rendering'}
          >
            {btnLabel}
          </button>
          <button className="btn-secondary share-link-btn" onClick={copyLink}>
            {status === 'copied' ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
