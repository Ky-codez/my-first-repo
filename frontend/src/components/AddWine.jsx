import { useState, useRef } from 'react';
import TastingNotes, { parseSAT } from './TastingNotes.jsx';
import { useLang } from '../i18n.jsx';
import PourRating from './PourRating.jsx';
import PhotoAdjust from './PhotoAdjust.jsx';
import AutocompleteInput from './AutocompleteInput.jsx';
import GrapesTagInput from './GrapesTagInput.jsx';
import RegionTagInput from './RegionTagInput.jsx';
import SingleTagInput from './SingleTagInput.jsx';
import ShareModal from './ShareModal.jsx';
import { getMoonInfo, TYPE_INFO, PHASE_INFO } from '../utils/moonCalendar.js';

const API = '';
const WINE_TYPES = [
  { label: 'Red',       emoji: '🍷', color: '#c0392b', bg: '#c0392b22' },
  { label: 'White',     emoji: '🥂', color: '#d4a017', bg: '#d4a01722' },
  { label: 'Rosé',      emoji: '🌸', color: '#e91e8c', bg: '#e91e8c22' },
  { label: 'Sparkling', emoji: '✨', color: '#42a5f5', bg: '#42a5f522' },
  { label: 'Champagne', emoji: '🍾', color: '#d4af37', bg: '#d4af3722' },
  { label: 'Dessert',   emoji: '🍯', color: '#e67e22', bg: '#e67e2222' },
  { label: 'Fortified', emoji: '🏺', color: '#9b59b6', bg: '#9b59b622' },
  { label: 'Spirit',    emoji: '🥃', color: '#8d6e63', bg: '#8d6e6322' },
];

// Mood log — the whole rating boiled down to one tap on a face. For total
// beginners who don't yet know grapes or regions: "how did it make you feel?"
const MOODS = [
  { key: 'love', emoji: '😍', label: 'Loved it',   rating: 5 },
  { key: 'like', emoji: '😊', label: 'Liked it',   rating: 4 },
  { key: 'ok',   emoji: '🙂', label: 'It was OK',  rating: 3 },
  { key: 'meh',  emoji: '😕', label: 'Meh',        rating: 2 },
  { key: 'nope', emoji: '😣', label: 'Not for me', rating: 1 },
];
// Friendly fallback name when a beginner logs a mood without naming the wine.
const moodName = (rating) => ({
  5: 'A wine I loved', 4: 'A wine I liked', 3: 'An okay wine',
  2: 'A so-so wine',   1: 'Not my wine',
}[rating] || 'A wine I tried');

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-picker">
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          className={(hovered || value) >= n ? 'star on' : 'star'}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
        >★</span>
      ))}
    </div>
  );
}

// wine prop = existing wine object when editing, null when creating
export default function AddWine({ currentUser, onClose, onAdded, onWineClick, wine: editWine, prefill, onDeleteWine }) {
  const isEdit  = !!editWine;
  const isRelog = !!prefill && !editWine;
  const { t } = useLang();
  // Two ways to log: 'quick' (photo + name + pour, ~30 seconds) or 'full'
  // (the serious tasting sheet). The last choice sticks across sessions;
  // editing and re-logging always show the full form.
  const [logMode, setLogModeState] = useState(() =>
    (isEdit || isRelog) ? 'full' : (localStorage.getItem('sipiary_log_mode') || 'mood'));
  const setLogMode = (m) => { setLogModeState(m); localStorage.setItem('sipiary_log_mode', m); };
  const mood  = logMode === 'mood'  && !isEdit && !isRelog;
  const quick = logMode === 'quick' && !isEdit && !isRelog;
  const full  = !mood && !quick;   // full tasting sheet — also edit & re-log
  const [moodPicked, setMoodPicked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);  // delete-wine confirm (edit mode)
  // New logs default to PUBLIC (sharing is the point); users can flip to private.
  const [isPrivate, setIsPrivate] = useState(false);
  const fileRef     = useRef();
  const cameraRef   = useRef();
  const barcodeRef  = useRef();
  const [savedWine,    setSavedWine]    = useState(null); // set after save ? triggers success screen
  const [sharing,      setSharing]      = useState(false); // post-log share-to-stories modal
  const [otherReviews, setOtherReviews] = useState([]);   // other users who reviewed same bottle
  const [pairings,     setPairings]     = useState(null); // null | string[] | 'loading'

  const [preview,    setPreview]    = useState(editWine?.image_path ? `${API}${editWine.image_path}` : null);
  const [imageFile,  setImageFile]  = useState(null);
  // Card framing ({x,y,w,h} % of the image). Stored defaults mean "never
  // adjusted" — start from scratch so PhotoAdjust centres the photo instead.
  const isDefaultFocal = (w) =>
    w?.focal_x === 17 && w?.focal_y === 0 && w?.focal_w === 65 && w?.focal_h === 87;
  const [focal, setFocal] = useState(
    editWine?.image_path && editWine.focal_w != null && !isDefaultFocal(editWine)
      ? { x: editWine.focal_x, y: editWine.focal_y, w: editWine.focal_w, h: editWine.focal_h }
      : null
  );
  const [detecting,  setDetecting]  = useState(false);
  const [detectMsg,  setDetectMsg]  = useState('');
  const [barcoding,  setBarcoding]  = useState(false);
  const [barcodeMsg, setBarcodeMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const src = editWine ?? (prefill ? prefill : null);
  const [form, setForm] = useState({
    name:          src?.name      ?? '',
    winery:        src?.winery    ?? '',
    type:          src?.type      ?? 'Red',
    vintage:       isRelog ? '' : (src?.vintage ?? ''),
    isNV:          isRelog ? false : (src?.vintage === null || src?.vintage === 'NV'),
    location:      src?.location  ?? '',
    grapes:        src?.grapes    ?? '',
    is_biodynamic: isRelog ? false : !!src?.is_biodynamic,
    is_organic:    isRelog ? false : !!src?.is_organic,
    rating:        isRelog ? 4    : (src?.rating ?? 4),
    notes:         isRelog ? ''   : (src?.notes  ?? ''),
    opened_at:     isRelog ? todayStr : (src?.opened_at ?? todayStr),
  });

  // Compute lunar info for the currently selected opening day
  const openedDate   = form.opened_at ? new Date(form.opened_at + 'T12:00:00') : new Date();
  const openedMoon   = getMoonInfo(openedDate);
  const openedType   = TYPE_INFO[openedMoon.type];
  const openedPhase  = PHASE_INFO[openedMoon.phase];

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setFocal(null);            // new photo → re-centre the card frame
    setDetectMsg('');
  };

  const handleScanCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setFocal(null);
    setDetectMsg('');
    // auto-trigger detection after state settles
    setTimeout(() => detectWineFile(file), 50);
  };

  const detectWineFile = async (file) => {
    setDetecting(true);
    setDetectMsg('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await fetch(`${API}/api/detect`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.detected && data.data) {
        const d = data.data;
        setForm(f => ({
          ...f,
          name:          d.name          ?? f.name,
          type:          WINE_TYPES.some(w => w.label === d.type) ? d.type : f.type,
          winery:        d.winery        ?? f.winery,
          vintage:       d.vintage       ?? f.vintage,
          location:      d.location      ?? f.location,
          grapes:        d.grapes        ?? f.grapes,
          is_biodynamic: d.is_biodynamic ?? f.is_biodynamic,
          is_organic:    d.is_organic    ?? f.is_organic,
        }));
        // AI also suggests the best card framing — PhotoAdjust fits it to 4:5
        const c = data.crop;
        if (c && [c.x, c.y, c.w, c.h].every(n => typeof n === 'number')) {
          setFocal({ x: c.x, y: c.y, w: c.w, h: c.h });
        }
        setDetectMsg('✓ Wine detected! Review and confirm the fields below.');
      } else {
        setDetectMsg(data.reason ? `⚠️ ${data.reason}` : '⚠️ Could not detect details. Fill in manually.');
      }
    } catch {
      setDetectMsg('⚠️ Detection failed. Fill in manually.');
    } finally {
      setDetecting(false);
    }
  };

  const detectWine = () => {
    if (imageFile) detectWineFile(imageFile);
  };

  const handleBarcodeCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBarcoding(true);
    setBarcodeMsg('');
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromCanvas(canvas);
      const code = result.getText();

      const res  = await fetch(`${API}/api/barcode/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.found && data.data) {
        const d = data.data;
        setForm(f => ({
          ...f,
          name:   d.name   || f.name,
          winery: d.winery || f.winery,
          type:   WINE_TYPES.some(w => w.label === d.type) ? d.type : f.type,
        }));
        setBarcodeMsg(`✓ Found: ${d.name || code}. Review fields below.`);
      } else {
        setBarcodeMsg(`⚠️ Barcode ${code} not in database. Fill in manually.`);
      }
    } catch (err) {
      if (err?.name === 'NotFoundException') {
        setBarcodeMsg('⚠️ No barcode found in photo. Try again closer.');
      } else {
        setBarcodeMsg('⚠️ Scan failed. Fill in manually.');
      }
    } finally {
      setBarcoding(false);
      if (barcodeRef.current) barcodeRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mood && !moodPicked) return;
    // Mood logs may skip the name — fall back to a friendly label.
    const effectiveName = form.name.trim() || (mood ? moodName(form.rating) : '');
    if (!effectiveName) return;
    setSubmitting(true);

    const fd = new FormData();
    if (!isEdit) fd.append('user_id', currentUser.id);
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'isNV') return; // skip — derived from vintage value
      fd.append(k, k === 'name' ? effectiveName : String(v));
    });
    if (imageFile) fd.append('image', imageFile);
    if (focal) {
      fd.append('focal_x', focal.x);
      fd.append('focal_y', focal.y);
      fd.append('focal_w', focal.w);
      fd.append('focal_h', focal.h);
    }
    if (!isEdit) fd.append('is_private', isPrivate ? '1' : '0');

    try {
      const url    = isEdit ? `${API}/api/wines/${editWine.id}` : `${API}/api/wines`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, body: fd });
      const saved  = await res.json();
      onAdded(saved);

      if (!isEdit) {
        // fetch other reviewers of same bottle (exclude self)
        const params = new URLSearchParams({ name: saved.name || form.name, currentUserId: currentUser?.id || 0 });
        if (saved.winery || form.winery) params.append('winery', saved.winery || form.winery);
        const bottleRes  = await fetch(`${API}/api/wines/bottle?${params}`);
        const bottleData = await bottleRes.json();
        const others = (bottleData.wines || []).filter(w => w.user_id !== currentUser?.id);
        // dedupe by user
        const seen = new Set();
        const uniqueOthers = others.filter(w => { if (seen.has(w.user_id)) return false; seen.add(w.user_id); return true; });
        setSavedWine(saved);
        setOtherReviews(uniqueOthers);
        // fetch pairings in background
        setPairings('loading');
        fetch(`${API}/api/wines/${saved.id}/pairings`)
          .then(r => r.json())
          .then(d => setPairings(d.pairings || null))
          .catch(() => setPairings(null));
      } else {
        onClose();
      }
    } catch {
      alert('Failed to save wine.');
    } finally {
      setSubmitting(false);
    }
  };

  // -- Success screen after logging --------------------------------------------
  if (savedWine) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          {/* Cork pop! Plays once when the success screen mounts */}
          <div className="cork-pop" aria-hidden="true">
            <span className="cork-bottle">🍾</span>
            <span className="cork-cork">🟤</span>
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className="cork-confetti"
                style={{
                  '--cx': `${(Math.random() - 0.3) * 240}px`,
                  '--cy': `${-60 - Math.random() * 160}px`,
                  '--cr': `${Math.random() * 540 - 270}deg`,
                  animationDelay: `${0.18 + Math.random() * 0.25}s`,
                  background: ['#c0392b', '#8e44ad', '#f1c40f', '#e67e22', '#42a5f5'][i % 5],
                }}
              />
            ))}
          </div>
          <div className="modal-header">
            <h2>🍷 Wine Logged!</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="wine-logged-success">
            <p className="wls-name">{savedWine.name || form.name}</p>

            {savedWine.newBadges?.length > 0 && (
              <div className="badge-unlock">
                <p className="badge-unlock-title">
                  🎉 {savedWine.newBadges.length === 1 ? 'Badge unlocked!' : `${savedWine.newBadges.length} badges unlocked!`}
                </p>
                <div className="badge-unlock-list">
                  {savedWine.newBadges.map((b, i) => (
                    <div key={b.id} className={`badge-unlock-card rarity-${b.rarity}`} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                      <span className="badge-unlock-emoji">{b.emoji}</span>
                      <div className="badge-unlock-info">
                        <span className="badge-unlock-name">{b.name}</span>
                        <span className="badge-unlock-desc">{b.desc}</span>
                      </div>
                      <span className="badge-unlock-rarity">{b.rarity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherReviews.length > 0 ? (
              <>
                <p className="wls-others-label">
                  {otherReviews.length === 1
                    ? '1 other person reviewed this bottle'
                    : `${otherReviews.length} others reviewed this bottle`}
                </p>
                <div className="wls-reviewers">
                  {otherReviews.map(w => (
                    <button key={w.user_id} className="wls-reviewer" onClick={() => { onClose(); onWineClick?.({ name: savedWine.name || form.name, winery: savedWine.winery || form.winery }); }}>
                      <span className="wls-avatar">{w.username[0].toUpperCase()}</span>
                      <div className="wls-reviewer-info">
                        <span className="wls-username">@{w.username}</span>
                        <span className="wls-rating">{'★'.repeat(w.rating || 0)}{'☆'.repeat(5 - (w.rating || 0))}</span>
                        {w.notes && <span className="wls-note">"{w.notes.slice(0, 60)}{w.notes.length > 60 ? '…' : ''}"</span>}
                      </div>
                    </button>
                  ))}
                </div>
                <button className="wls-bottle-btn" onClick={() => { onClose(); onWineClick?.({ name: savedWine.name || form.name, winery: savedWine.winery || form.winery }); }}>
                  View bottle page →
                </button>
              </>
            ) : (
              <p className="wls-first">You're the first to review this bottle! 🍾</p>
            )}

            {(pairings === 'loading' || pairings?.length > 0) && (
              <div className="wls-pairings">
                <p className="wls-others-label">🍽️ Food pairings</p>
                {pairings === 'loading' ? (
                  <p className="wls-pairings-loading">Finding perfect matches…</p>
                ) : (
                  <div className="wls-pairings-list">
                    {pairings.map((p, i) => (
                      <span key={i} className="wls-pairing-chip">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              className="btn-primary wls-share-btn"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setSharing(true)}
            >
              📲 Share to Stories
            </button>
            <button className="btn-secondary" style={{ marginTop: '0.5rem', width: '100%' }} onClick={onClose}>Done</button>
          </div>
        </div>

        {sharing && (
          <ShareModal
            wine={{ ...savedWine, username: savedWine.username || currentUser?.username }}
            onClose={() => setSharing(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="log-page">
      <div className="log-page-header">
        <h2>{isEdit ? t('addwine.edit') : isRelog ? t('addwine.relog') : t('addwine.log')}</h2>
      </div>

        <form onSubmit={handleSubmit} className="add-wine-form">
          {/* Quick (~30s) vs the full tasting sheet */}
          {!isEdit && !isRelog && (
            <div className="aw-mode-toggle">
              <button type="button" className={`aw-mode-btn${mood ? ' active' : ''}`} onClick={() => setLogMode('mood')}>
                😊 Mood
              </button>
              <button type="button" className={`aw-mode-btn${quick ? ' active' : ''}`} onClick={() => setLogMode('quick')}>
                ⚡ {t('addwine.quick')}
              </button>
              <button type="button" className={`aw-mode-btn${full ? ' active' : ''}`} onClick={() => setLogMode('full')}>
                🎓 {t('addwine.full')}
              </button>
            </div>
          )}
          {/* Re-log: compact read-only identity, all identity fields hidden */}
          {isRelog && (
            <div className="relog-identity">
              <span className="relog-wine-name">🍷 {prefill.name}</span>
              {prefill.winery  && <span className="relog-winery">{prefill.winery}</span>}
              {prefill.vintage && <span className="relog-vintage">{prefill.vintage}</span>}
              {prefill.type    && <span className="relog-type">{prefill.type}</span>}
            </div>
          )}

          {/* Mood mode — the entire log in a few taps for total beginners */}
          {mood && (
            <div className="mood-log">
              <p className="mood-q">How was it?</p>
              <div className="mood-faces">
                {MOODS.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    className={`mood-face${moodPicked && form.rating === m.rating ? ' picked' : ''}`}
                    onClick={() => { set('rating', m.rating); setMoodPicked(true); }}
                  >
                    <span className="mood-emoji">{m.emoji}</span>
                    <span className="mood-label">{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="form-field full mood-name">
                <label>What was it? <span className="mood-optional">optional</span></label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. the red at dinner" />
              </div>

              <div className="mood-type-row">
                {WINE_TYPES.filter(w => ['Red','White','Rosé','Sparkling'].includes(w.label)).map(({ label, emoji, color, bg }) => (
                  <button
                    key={label}
                    type="button"
                    className={`wine-type-chip${form.type === label ? ' selected' : ''}`}
                    style={form.type === label ? { borderColor: color, background: bg, color } : {}}
                    onClick={() => set('type', label)}
                  >
                    <span className="wtc-emoji">{emoji}</span>
                    <span className="wtc-label">{label === 'Sparkling' ? 'Bubbly' : label}</span>
                  </button>
                ))}
              </div>

              {preview ? (
                <div className="mood-photo">
                  <img src={preview} alt="" className="mood-photo-thumb" />
                  <button type="button" className="upload-opt-btn" onClick={() => fileRef.current?.click()}>📷 Change photo</button>
                </div>
              ) : (
                <button type="button" className="upload-opt-btn mood-add-photo" onClick={() => fileRef.current?.click()}>
                  📷 Add a photo (optional)
                </button>
              )}
            </div>
          )}

          {/* Image + detect — hidden on re-log and in mood mode */}
          {!isRelog && !mood && (!preview ? (
            <div className="image-upload-area">
              <div className="image-placeholder">
                <span>📷</span>
                <p>Add a photo of your bottle</p>
              </div>
              <div className="image-upload-btns">
                <button type="button" className="upload-opt-btn" onClick={() => fileRef.current?.click()}>
                  📤 Upload Photo
                </button>
                <button type="button" className="upload-opt-btn scan" onClick={() => cameraRef.current?.click()}>
                  📸 Scan Label
                </button>
                <button type="button" className="upload-opt-btn barcode" onClick={() => barcodeRef.current?.click()} disabled={barcoding}>
                  {barcoding ? '⏳' : '🔢'} Barcode
                </button>
              </div>
            </div>
          ) : (
            <>
              <PhotoAdjust src={preview} value={focal} onChange={setFocal} />
              <div className="image-upload-btns" style={{ marginTop: '0.4rem' }}>
                <button type="button" className="upload-opt-btn" onClick={() => fileRef.current?.click()}>
                  📤 Change Photo
                </button>
                <button type="button" className="upload-opt-btn scan" onClick={() => cameraRef.current?.click()}>
                  📸 Rescan
                </button>
                <button type="button" className="upload-opt-btn barcode" onClick={() => barcodeRef.current?.click()} disabled={barcoding}>
                  {barcoding ? '⏳' : '🔢'} Barcode
                </button>
              </div>
            </>
          ))}
          {!isRelog && <input ref={fileRef}    type="file" accept="image/*"                       style={{ display:'none' }} onChange={handleImageChange} />}
          {!isRelog && <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleScanCapture} />}
          {!isRelog && <input ref={barcodeRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleBarcodeCapture} />}

          {!isRelog && !mood && imageFile && !detecting && (
            <button type="button" className="detect-btn" onClick={detectWine} disabled={detecting}>
              🔍 Auto-detect wine details
            </button>
          )}
          {!isRelog && !mood && detecting && <p className="detect-msg scanning">🔍 Scanning label…</p>}
          {!isRelog && !mood && !detecting && detectMsg && <p className="detect-msg">{detectMsg}</p>}
          {!isRelog && !mood && barcoding && <p className="detect-msg scanning">🔢 Reading barcode…</p>}
          {!isRelog && !mood && !barcoding && barcodeMsg && <p className="detect-msg">{barcodeMsg}</p>}

          {/* Opening day picker with live lunar preview — auto-set to today in mood mode */}
          {!mood && <div className="form-field full">
            <div className="opened-label-row">
              <label>📅 Date Opened *</label>
              {form.opened_at && (
                <div className="opened-moon-preview">
                  <span style={{ color: openedType.color }}>{openedType.emoji} {openedType.label}</span>
                  <span className="omp-dot" />
                  <span style={{ color: openedPhase.color }}>{openedPhase.emoji} {openedPhase.name}</span>
                  <span className="omp-dot" />
                  <span style={{ color: openedMoon.ascending ? '#3498db' : '#9b59b6' }}>
                    {openedMoon.ascending ? '↑ Ascending' : '↓ Descending'}
                  </span>
                </div>
              )}
            </div>
            <input
              type="date"
              value={form.opened_at}
              max={todayStr}
              onChange={e => set('opened_at', e.target.value)}
              required
            />
          </div>}

          {!isRelog && !mood && <div className="form-grid">
            <div className="form-field full">
              <label>Wine Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Château Margaux" required />
            </div>
            {!quick && <div className="form-field full winery-row">
              <div className="form-field">
                <label>Winery</label>
                <SingleTagInput
                  field="winery"
                  value={form.winery}
                  onChange={v => set('winery', v)}
                  placeholder="Domaine Leflaive"
                  tagColor="#e07b39"
                  tagBg="#3a1f0a55"
                />
              </div>
              <div className="form-field">
                <label>Region</label>
                <RegionTagInput value={form.location} onChange={v => set('location', v)} />
              </div>
              <div className="form-field winery-row-vintage">
                <label>Vintage</label>
                <input
                  type="text"
                  value={form.vintage}
                  onChange={e => {
                    const v = e.target.value;
                    set('vintage', v);
                    set('isNV', v.trim().toUpperCase() === 'NV');
                  }}
                  placeholder="2019 or NV"
                />
              </div>
            </div>}
            <div className="form-field full">
              <label>Type</label>
              <div className="wine-type-picker">
                {WINE_TYPES.map(({ label, emoji, color, bg }) => (
                  <button
                    key={label}
                    type="button"
                    className={`wine-type-chip${form.type === label ? ' selected' : ''}`}
                    style={form.type === label ? { borderColor: color, background: bg, color } : {}}
                    onClick={() => set('type', label)}
                  >
                    <span className="wtc-emoji">{emoji}</span>
                    <span className="wtc-label">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            {!quick && <div className="form-field full">
              <label>Grapes</label>
              <GrapesTagInput value={form.grapes} onChange={v => set('grapes', v)} />
            </div>}
          </div>}

          {/* Quick mode still captures scanned details — show them, don't ask */}
          {quick && (form.winery || form.vintage || form.location || form.grapes) && (
            <button type="button" className="aw-detected-chip" onClick={() => setLogMode('full')}>
              <span className="aw-detected-text">
                ✓ {[form.winery, form.vintage, form.location].filter(Boolean).join(' · ') || form.grapes}
              </span>
              <span className="aw-detected-edit">{t('addwine.editDetails')}</span>
            </button>
          )}

          {!isRelog && full && <div className="toggle-chip-row">
            <button
              type="button"
              className={`toggle-chip biodynamic${form.is_biodynamic ? ' selected' : ''}`}
              onClick={() => set('is_biodynamic', !form.is_biodynamic)}
            >
              🌱 Biodynamic
            </button>
            <button
              type="button"
              className={`toggle-chip organic${form.is_organic ? ' selected' : ''}`}
              onClick={() => set('is_organic', !form.is_organic)}
            >
              🌿 Organic
            </button>
          </div>}

          {/* Rating — mood mode already captured it via the faces above */}
          {!mood && (
            <div className="form-field full">
              <label>{t('addwine.rating')}</label>
              <PourRating value={form.rating} onChange={v => set('rating', v)} wineType={form.type} />
            </div>
          )}

          {/* Quick mode: one optional line. (If structured SAT notes already
              exist — e.g. written in full mode — keep the full editor so
              switching modes never mangles them.) Mood mode skips notes. */}
          {!mood && (quick && !parseSAT(form.notes) ? (
            <div className="form-field full">
              <label>{t('addwine.quickNote')}</label>
              <textarea
                className="tn-textarea"
                rows={2}
                placeholder={t('addwine.quickNotePh')}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          ) : (
            <TastingNotes value={form.notes} onChange={v => set('notes', v)} wineType={form.type} />
          ))}

          {/* Privacy — new logs choose visibility; mood logs default to private */}
          {!isEdit && !isRelog && (
            <div className="form-field full">
              <label>Who can see this?</label>
              <div className="privacy-toggle">
                <button type="button" className={`privacy-opt${isPrivate ? ' active' : ''}`} onClick={() => setIsPrivate(true)}>
                  🔒 Private <span>only you</span>
                </button>
                <button type="button" className={`privacy-opt${!isPrivate ? ' active' : ''}`} onClick={() => setIsPrivate(false)}>
                  🌍 Public <span>everyone</span>
                </button>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>{t('addwine.cancel')}</button>
            <button type="submit" className="btn-primary"
              disabled={submitting || (mood ? !moodPicked : (!isRelog && !form.name.trim()))}>
              {submitting ? 'Saving...'
                : isEdit  ? t('addwine.saveChanges')
                : isRelog ? t('addwine.relogBtn')
                : mood    ? 'Log it 🍷'
                : quick   ? t('addwine.logIt')
                : t('addwine.share')}
            </button>
          </div>

          {/* Delete — lives here in the edit form (no longer on the card) */}
          {isEdit && onDeleteWine && (
            confirmDelete ? (
              <div className="aw-delete-confirm">
                <span>Delete this wine permanently?</span>
                <div className="aw-delete-actions">
                  <button type="button" className="aw-delete-yes" onClick={onDeleteWine}>Yes, delete</button>
                  <button type="button" className="aw-delete-no" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" className="aw-delete-btn" onClick={() => setConfirmDelete(true)}>
                🗑 Delete this wine
              </button>
            )
          )}
        </form>
    </div>
  );
}
