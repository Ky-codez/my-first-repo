import { useState, useEffect } from 'react';
import { useLang } from '../i18n.jsx';

const API = '';
const WINE_TYPES = ['Red', 'White', 'Rosé', 'Sparkling', 'Champagne', 'Dessert', 'Fortified', 'Spirit'];
const WINE_TYPE_COLORS = {
  Red: '#e74c3c', White: '#f1c40f', 'Rosé': '#e91e8c',
  Sparkling: '#3498db', Champagne: '#d4af37', Dessert: '#e67e22',
  Fortified: '#9b59b6', Spirit: '#8d6e63',
};

function CellarItem({ item, onMove, onDelete, onOpenWine, onLogWine }) {
  const color = WINE_TYPE_COLORS[item.type] || '#aaa';
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="cellar-item">
      <div className="cellar-item-body">
        {/* Tap the name to see all community reviews of this bottle */}
        <button className="cellar-item-name cellar-item-link" onClick={() => onOpenWine(item)} title="See community reviews">
          🍷 {item.name}
        </button>
        {item.winery && <div className="cellar-item-meta">{item.winery}{item.vintage ? ` · ${item.vintage}` : ''}</div>}
        {item.type && (
          <span className="cellar-type-badge" style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
            {item.type}
          </span>
        )}
        {item.notes && <p className="cellar-item-notes">"{item.notes}"</p>}
      </div>
      <div className="cellar-item-actions">
        {/* Close the loop: drinking a saved bottle turns it into a journal post */}
        <button className="cellar-log-btn" onClick={() => onLogWine(item)} title="Drank it? Log it to your journal">
          🍷 Drank it — log now
        </button>
        <button className="cellar-move-btn" onClick={() => onMove(item)} title={item.list === 'wishlist' ? 'Move to Cellar' : 'Move to Wishlist'}>
          {item.list === 'wishlist' ? '📦 Move to Cellar' : '📋 Move to Wishlist'}
        </button>
        {confirming ? (
          <button className="cellar-delete-btn confirming" onClick={() => onDelete(item.id)} onMouseLeave={() => setConfirming(false)} title="Click again to remove">
            Sure?
          </button>
        ) : (
          <button className="cellar-delete-btn" onClick={() => setConfirming(true)} title="Remove">×</button>
        )}
      </div>
    </div>
  );
}

function AddItemForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState('wishlist');
  const [form, setForm] = useState({ name: '', winery: '', vintage: '', type: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const { t } = useLang();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onAdd({ ...form, list });
    setForm({ name: '', winery: '', vintage: '', type: '', notes: '' });
    setSaving(false);
    setOpen(false);
  };

  if (!open) return (
    <button className="cellar-add-btn" onClick={() => setOpen(true)}>+ Add wine</button>
  );

  return (
    <form className="cellar-add-form" onSubmit={submit}>
      <div className="cellar-list-pick">
        <button type="button" className={`cellar-list-tab${list === 'wishlist' ? ' active' : ''}`} onClick={() => setList('wishlist')}>{t('cellar.wishlist')}</button>
        <button type="button" className={`cellar-list-tab${list === 'cellar' ? ' active' : ''}`} onClick={() => setList('cellar')}>{t('cellar.cellar')}</button>
      </div>
      <input required placeholder="Wine name *" value={form.name} onChange={e => set('name', e.target.value)} />
      <div className="cellar-add-row">
        <input placeholder="Winery" value={form.winery} onChange={e => set('winery', e.target.value)} />
        <input placeholder="Vintage" type="number" value={form.vintage} onChange={e => set('vintage', e.target.value)} style={{ width: 90 }} />
      </div>
      <select value={form.type} onChange={e => set('type', e.target.value)}>
        <option value="">Type…</option>
        {WINE_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
      <input placeholder="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
      <div className="cellar-form-actions">
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>{t('addwine.cancel')}</button>
        <button type="submit" className="btn-primary" disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function Cellar({ currentUser, onBack, onWineClick, onRelog }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('wishlist'); // 'wishlist' | 'cellar'
  const { t } = useLang();

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/cellar?userId=${currentUser.id}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data) => {
    const res = await fetch(`${API}/api/cellar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, ...data }),
    });
    const item = await res.json();
    setItems(prev => [item, ...prev.filter(i => i.id !== item.id)]);
  };

  const handleMove = async (item) => {
    const newList = item.list === 'wishlist' ? 'cellar' : 'wishlist';
    const res = await fetch(`${API}/api/cellar/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: newList, notes: item.notes }),
    });
    const updated = await res.json();
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/cellar/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const wishlist = items.filter(i => i.list === 'wishlist');
  const cellar   = items.filter(i => i.list === 'cellar');
  const current  = tab === 'wishlist' ? wishlist : cellar;

  return (
    <div className="cellar-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="cellar-hero">
        <h1>{t('cellar.title')}</h1>
        <p>Track wines you want to try and bottles you have at home</p>
      </div>

      {/* Tabs */}
      <div className="cellar-tabs">
        <button className={`cellar-tab${tab === 'wishlist' ? ' active' : ''}`} onClick={() => setTab('wishlist')}>
          {t('cellar.wishlist')} <span className="cellar-count">{wishlist.length}</span>
        </button>
        <button className={`cellar-tab${tab === 'cellar' ? ' active' : ''}`} onClick={() => setTab('cellar')}>
          {t('cellar.cellar')} <span className="cellar-count">{cellar.length}</span>
        </button>
      </div>

      <AddItemForm onAdd={handleAdd} />

      {loading
        ? <p className="loading-state">Loading…</p>
        : current.length === 0
          ? <div className="cellar-empty">
              <p>{tab === 'wishlist' ? '📋 No wines on your wish list yet.' : '🍾 Your cellar is empty.'}</p>
              <p className="cellar-empty-hint">Add a wine above, or save one from any review in your feed.</p>
            </div>
          : <div className="cellar-list">
              {current.map(item => (
                <CellarItem
                  key={item.id}
                  item={item}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onOpenWine={(i) => onWineClick?.({ name: i.name, winery: i.winery })}
                  onLogWine={(i) => onRelog?.({ name: i.name, winery: i.winery, vintage: i.vintage, type: i.type || 'Red' })}
                />
              ))}
            </div>
      }
    </div>
  );
}
