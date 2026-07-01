import { useEffect, useState } from 'react';
import Bottle3D from './Bottle3D.jsx';
import { WineTypeIcon } from './wineIcons.jsx';

const API = '';
const TYPES = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert'];

// PROTOTYPE preview page (reachable at /bottle-lab). Pulls a real logged wine
// photo to use as the label and lets you spin the procedural 3D bottle and
// switch the shape by type. Not linked in the main nav — it's a lab for
// deciding whether to ship 3D bottles.
export default function BottleLab() {
  const [wines, setWines] = useState([]);
  const [idx, setIdx]     = useState(0);
  const [type, setType]   = useState('Red');

  useEffect(() => {
    fetch(`${API}/api/wines`)
      .then(r => r.json())
      .then(d => {
        const withPhotos = (Array.isArray(d) ? d : []).filter(w => w.image_path);
        setWines(withPhotos);
        if (withPhotos[0]?.type) setType(withPhotos[0].type);
      })
      .catch(() => {});
  }, []);

  const wine = wines[idx];
  const imageUrl = wine ? `${API}${wine.image_path}` : null;

  return (
    <div className="bottlelab-page">
      <div className="bottlelab-box">
        <button className="legal-back" onClick={() => { window.location.href = '/'; }}>← Back to Sipiary</button>
        <h1 className="bottlelab-title"><WineTypeIcon type="Red" size={20} /> 3D Bottle — prototype</h1>
        <p className="bottlelab-sub">
          A stylised 3D bottle with a real label wrapped on. Drag to spin. This is an
          internal preview, not yet part of the app.
        </p>

        {imageUrl
          ? <Bottle3D imageUrl={imageUrl} type={type} height={420} />
          : <p className="bottlelab-empty">No wine photos found to preview with.</p>}

        <div className="bottlelab-controls">
          <div className="bottlelab-row">
            <span className="bottlelab-label">Bottle shape</span>
            <div className="bottlelab-chips">
              {TYPES.map(t => (
                <button key={t} className={`bottlelab-chip${type === t ? ' active' : ''}`} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
          </div>

          {wines.length > 1 && (
            <div className="bottlelab-row">
              <span className="bottlelab-label">Label photo</span>
              <div className="bottlelab-nav">
                <button className="bottlelab-chip" onClick={() => setIdx(i => (i - 1 + wines.length) % wines.length)}>‹ Prev</button>
                <span className="bottlelab-count">{idx + 1} / {wines.length}</span>
                <button className="bottlelab-chip" onClick={() => setIdx(i => (i + 1) % wines.length)}>Next ›</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
