import { useState, useRef, useCallback } from 'react';

// -- Wine tasting descriptor list for autocomplete ----------------------------
const DESCRIPTORS = [
  // Black fruits
  'blackcurrant','blackberry','black cherry','black plum','blueberry',
  // Red fruits
  'strawberry','raspberry','red cherry','cranberry','redcurrant','pomegranate',
  // Stone fruits
  'peach','apricot','nectarine','plum','cherry',
  // Citrus
  'lemon','lime','grapefruit','orange peel','lemon zest','yuzu',
  // Tropical
  'mango','pineapple','passion fruit','lychee','guava','banana','melon',
  // Green / herbal
  'green apple','pear','gooseberry','quince','grass','cut grass','green pepper',
  'bell pepper','asparagus','tomato leaf','nettle','mint','eucalyptus','basil','thyme','rosemary','bay leaf','dill',
  // Floral
  'rose','violet','lavender','elderflower','jasmine','honeysuckle','orange blossom','geranium','iris',
  // Dried / cooked fruit
  'raisin','prune','fig','date','jam','dried cherry','dried apricot','stewed fruit',
  // Spice
  'black pepper','white pepper','clove','cinnamon','nutmeg','anise','star anise','cardamom','ginger',
  'liquorice','fennel','allspice',
  // Earthy / mineral
  'earth','soil','clay','gravel','slate','flint','wet stone','chalk','mineral','petrichor',
  'mushroom','forest floor','truffle','leather','game','meat','blood',
  // Oak / wood
  'vanilla','cedar','oak','toasty','smoke','smoky','charcoal','coffee','dark chocolate',
  'milk chocolate','mocha','caramel','butterscotch','coconut','sawdust','resin','tar',
  // Secondary (fermentation)
  'bread','brioche','biscuit','yeast','cream','butter','lactic','cheese','yoghurt','sour cream',
  // Tertiary (age / oxidation)
  'honey','beeswax','dried flowers','tea','tobacco','cigar box','leather','fur','nutty','almond',
  'walnut','hazelnut','marzipan','toffee','marmalade','orange liqueur','petrol','kerosene','diesel',
  // Finish descriptors
  'long finish','short finish','clean','fresh','crisp','bright','vibrant','silky','velvety',
  'tannic','grippy','austere','savoury','umami','briny','salty',
];

// -- SAT descriptor data (WSET Level 3 order) ---------------------------------

const RED_TYPES   = new Set(['Red', 'Rosé', 'Sparkling', 'Champagne', 'Fortified']);
const WHITE_TYPES = new Set(['White', 'Rosé', 'Sparkling', 'Champagne', 'Dessert', 'Spirit']);
const TANNIN_TYPES = new Set(['Red', 'Rosé', 'Fortified', 'Spirit']);
const MOUSSE_TYPES = new Set(['Sparkling', 'Champagne']);

// -- WSET SAT scales (Level 3 wording, M- / M / M+ shorthand) ------------------
const APP_INTENSITY = ['Pale', 'Medium', 'Deep'];
const INTENSITY5    = ['Light', 'M-', 'M', 'M+', 'Pronounced'];   // nose & flavour
const LEVEL5        = ['Low', 'M-', 'M', 'M+', 'High'];           // acidity & tannin
const BODY5         = ['Light', 'M-', 'M', 'M+', 'Full'];
const FINISH5       = ['Short', 'M-', 'M', 'M+', 'Long'];
const SWEETNESS     = ['Dry', 'Off-dry', 'Med-dry', 'Med-sweet', 'Sweet', 'Luscious'];
const ALCOHOL       = ['Low', 'Medium', 'High'];
const DEVELOPMENT   = ['Youthful', 'Developing', 'Fully developed', 'Tired'];
const MOUSSE        = ['Delicate', 'Creamy', 'Aggressive'];
const QUALITY       = ['Faulty', 'Poor', 'Acceptable', 'Good', 'Very good', 'Outstanding'];
const READINESS     = ['Too young', 'Drink now — can age', 'Drink now', 'Too old'];

const COLOURS = {
  Red:       ['Purple', 'Ruby', 'Garnet', 'Tawny'],
  'Rosé':    ['Pink', 'Salmon', 'Orange'],
  Fortified: ['Lemon', 'Gold', 'Amber', 'Brown', 'Ruby', 'Garnet', 'Tawny'],
  Spirit:    ['Clear', 'Straw', 'Gold', 'Amber', 'Brown'],
  Sparkling: ['Lemon', 'Gold', 'Pink', 'Salmon', 'Amber'],
  Champagne: ['Lemon', 'Gold', 'Pink', 'Salmon', 'Amber'],
};
const colourSetFor = (t) => COLOURS[t] || ['Lemon-green', 'Lemon', 'Gold', 'Amber'];

// Ordered primary items — exactly as per WSET SAT card
const PRIMARY_ITEMS = [
  { key: 'floral',        label: '🌸 Floral',           isFruit: false },
  { key: 'green_fruit',   label: '🍏 Green fruit',       isFruit: true,  whiteOnly: true },
  { key: 'citrus_fruit',  label: '🍋 Citrus fruit',      isFruit: true,  whiteOnly: true },
  { key: 'stone_fruit',   label: '🍑 Stone fruit',       isFruit: true,  whiteOnly: true },
  { key: 'tropical_fruit',label: '🍍 Tropical fruit',    isFruit: true,  whiteOnly: true },
  { key: 'red_fruit',     label: '🍓 Red fruit',         isFruit: true,  redOnly: true },
  { key: 'black_fruit',   label: '🫐 Black fruit',       isFruit: true,  redOnly: true },
  { key: 'dried_fruit',   label: '🍇 Dried/cooked fruit',isFruit: true  },
  { key: 'herbaceous',    label: '🌿 Herbaceous',        isFruit: false },
  { key: 'herbal',        label: '🌱 Herbal',            isFruit: false },
  { key: 'pungent_spice', label: '🌶️ Pungent Spice',     isFruit: false },
];

// Specific sub-descriptors per fruit type
const FRUIT_ITEMS = {
  green_fruit:    ['🍏 Green apple', '🍐 Pear', '🫐 Gooseberry', '🍐 Quince'],
  citrus_fruit:   ['🍋 Lemon', '🍋 Lime', '🍊 Grapefruit', '🍊 Orange peel'],
  stone_fruit:    ['🍑 Peach', '🍑 Apricot', '🍑 Nectarine', '🍒 Plum'],
  tropical_fruit: ['🥭 Mango', '🍍 Pineapple', '🌟 Passion fruit', '🍡 Lychee'],
  red_fruit:      ['🍓 Strawberry', '🍓 Raspberry', '🍒 Red cherry', '🫐 Cranberry'],
  black_fruit:    ['🫐 Blackcurrant', '🫐 Blackberry', '🫐 Blueberry', '🍒 Black cherry'],
  dried_fruit:    ['🍇 Raisin', '🍑 Prune', '🍯 Fig', '🍓 Jam'],
};

const SECONDARY_CATS = [
  { key: 'yeast', label: '🍞 Yeast' },
  { key: 'mlf',   label: '🥛 MLF'   },
  { key: 'oak',   label: '🪵 Oak'   },
];

const TERTIARY_CATS = [
  { key: 'oxidation',       label: '🌬️ Oxidation'       },
  { key: 'developed_fruit', label: '🍇 Developed Fruit'  },
  { key: 'bottle_age',      label: '⏳ Bottle Age'       },
];

// -- Helpers -------------------------------------------------------------------

export function parseSAT(value) {
  if (!value) return null;
  try {
    const p = JSON.parse(value);
    return p._type === 'sat' ? p : null;
  } catch { return null; }
}

// Human-readable labels for WineCard display
export const PRIMARY_LABELS = Object.fromEntries(
  PRIMARY_ITEMS.map(({ key, label }) => [key, label.replace(/^[^\w]+/, '').trim()])
);

function defaultSAT() {
  return {
    _type:        'sat',
    scales:       {},   // { sweetness: 'Dry', acidity: 'M+', … } single-select
    primary:      {},   // { [key]: true/false }
    fruitItems:   {},   // { [fruitKey__itemName]: true/false }
    primaryCustom: '',
    secondary:    {},
    secondaryCustom: '',
    tertiary:     {},
    tertiaryCustom: '',
  };
}

// True when nothing has been selected or written — a blank card must never be
// stored as the wine's notes (it would block quick mode and clutter the feed)
export function isEmptySAT(sat) {
  if (!sat) return true;
  const any = (o) => Object.values(o || {}).some(Boolean);
  return !any(sat.scales) && !any(sat.primary) && !any(sat.fruitItems) &&
         !any(sat.secondary) && !any(sat.tertiary) &&
         !(sat.primaryCustom   || '').trim() &&
         !(sat.secondaryCustom || '').trim() &&
         !(sat.tertiaryCustom  || '').trim();
}

// -- Inline ghost-text autocomplete (Gmail Smart Compose style) ---------------

function NotesAutocomplete({ value, onChange }) {
  // The matched descriptor we can complete to (e.g. "blackcurrant").
  const [fullMatch, setFullMatch] = useState('');
  const [wordStart, setWordStart] = useState(0);
  const taRef = useRef();

  const compute = (text, pos) => {
    const before = text.slice(0, pos);
    const match  = before.match(/[^\s,;]+$/);
    const word   = match ? match[0] : '';
    setWordStart(pos - word.length);
    if (word.length >= 2) {
      const lower = word.toLowerCase();
      const hit   = DESCRIPTORS.find(d => d.startsWith(lower) && d !== lower);
      if (hit) { setFullMatch(hit); return; }
    }
    setFullMatch('');
  };

  const handleChange = (e) => {
    onChange(e.target.value);
    compute(e.target.value, e.target.selectionStart);
  };

  // Accept the suggestion — works from a tap (mobile) or Tab (desktop).
  const accept = () => {
    const ta     = taRef.current;
    const pos    = ta.selectionStart;
    const text   = ta.value;
    const before = text.slice(0, wordStart);
    const after  = text.slice(pos);
    const sep    = after.startsWith(' ') || after === '' ? '' : ' ';
    const next   = before + fullMatch + sep + after;
    onChange(next);
    setFullMatch('');
    setTimeout(() => {
      ta.focus();
      const cur = (before + fullMatch + sep).length;
      ta.setSelectionRange(cur, cur);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (fullMatch && e.key === 'Tab') { e.preventDefault(); accept(); }
    if (e.key === 'Escape')           { setFullMatch(''); }
  };

  return (
    <div className="tn-autocomplete-wrap">
      <textarea
        ref={taRef}
        className="tn-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={e => compute(e.target.value, e.target.selectionStart)}
        onBlur={() => setTimeout(() => setFullMatch(''), 150)}
        rows={3}
        placeholder={!value ? 'Describe aromas, flavours, finish…' : ''}
      />
      {/* Tappable suggestion — replaces the old Tab-only inline ghost */}
      {fullMatch && (
        <button
          type="button"
          className="tn-suggest-chip"
          onMouseDown={(e) => { e.preventDefault(); accept(); }}
        >
          ✨ {fullMatch}<span className="tn-suggest-key">tap · Tab</span>
        </button>
      )}
    </div>
  );
}

// -- Chip button ---------------------------------------------------------------

// One WSET scale: a labelled row of single-select chips (tap again to clear)
function ScaleRow({ label, options, value, onPick }) {
  return (
    <div className="sat-scale-row">
      <span className="sat-scale-label">{label}</span>
      <div className="sat-scale-opts">
        {options.map(o => (
          <button
            key={o}
            type="button"
            className={`sat-scale-chip${value === o ? ' on' : ''}`}
            onClick={() => onPick(value === o ? '' : o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children, variant = 'normal' }) {
  return (
    <button
      type="button"
      className={`sat-chip sat-chip--${variant}${on ? ' sat-chip--on' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// -- Main component ------------------------------------------------------------

export default function TastingNotes({ value, onChange, wineType }) {
  const existing = parseSAT(value);
  const [mode, setMode] = useState(existing ? 'sat' : 'text');
  const [sat,  setSat]  = useState(existing || defaultSAT());
  // Live mirror of `sat` — rapid taps can fire before React re-renders, and
  // reading state directly would make each tap overwrite the previous one
  const satRef = useRef(sat);

  const update = (patch) => {
    const next = { ...satRef.current, ...patch };
    satRef.current = next;
    setSat(next);
    // Deselecting everything returns the value to "no notes yet"
    onChange(isEmptySAT(next) ? '' : JSON.stringify(next));
  };

  const setScale = (key, val) =>
    update({ scales: { ...(satRef.current.scales || {}), [key]: val } });

  const togglePrimary = (key) => {
    const cur = satRef.current;
    const next = { ...cur.primary, [key]: !cur.primary[key] };
    // Clear sub-items when deselecting a fruit type
    if (!next[key] && FRUIT_ITEMS[key]) {
      const fi = { ...cur.fruitItems };
      Object.keys(fi).filter(k => k.startsWith(key + '__')).forEach(k => delete fi[k]);
      update({ primary: next, fruitItems: fi });
    } else {
      update({ primary: next });
    }
  };

  const toggleFruitItem = (fruitKey, item) => {
    const k = `${fruitKey}__${item}`;
    update({ fruitItems: { ...satRef.current.fruitItems, [k]: !satRef.current.fruitItems[k] } });
  };

  const toggleCat = (group, key) =>
    update({ [group]: { ...satRef.current[group], [key]: !satRef.current[group][key] } });

  const switchMode = (m) => {
    setMode(m);
    // Opening a blank SAT card writes nothing — the value only becomes SAT
    // JSON once something is actually selected. Selections made earlier in
    // this session are restored when switching back.
    if (m === 'sat') onChange(isEmptySAT(satRef.current) ? '' : JSON.stringify(satRef.current));
    else onChange('');
  };

  const textVal = value && !parseSAT(value) ? value : '';

  return (
    <div className="tn-wrap">
      <div className="tn-header">
        <label className="tn-label">Tasting Notes</label>
        <div className="tn-mode-btns">
          <button type="button" className={`tn-mode-btn${mode === 'sat' ? ' active' : ''}`} onClick={() => switchMode('sat')}>
            📋 WSET SAT
          </button>
          <button type="button" className={`tn-mode-btn${mode === 'text' ? ' active' : ''}`} onClick={() => switchMode('text')}>
            ✏️ Notes
          </button>
        </div>
      </div>

      {mode === 'text' && (
        <NotesAutocomplete value={textVal} onChange={onChange} />
      )}

      {mode === 'sat' && (
        <div className="sat-card">

          {/* -- APPEARANCE -- */}
          <div className="sat-section">
            <p className="sat-section-title">
              <span className="sat-section-dot appearance" />
              👁 Appearance
            </p>
            <ScaleRow label="Intensity" options={APP_INTENSITY} value={sat.scales?.appearanceIntensity} onPick={v => setScale('appearanceIntensity', v)} />
            <ScaleRow label="Colour" options={colourSetFor(wineType)} value={sat.scales?.colour} onPick={v => setScale('colour', v)} />
          </div>

          {/* -- NOSE -- */}
          <div className="sat-section">
            <p className="sat-section-title">
              <span className="sat-section-dot nose" />
              👃 Nose
            </p>
            <ScaleRow label="Intensity" options={INTENSITY5} value={sat.scales?.noseIntensity} onPick={v => setScale('noseIntensity', v)} />
            <ScaleRow label="Development" options={DEVELOPMENT} value={sat.scales?.development} onPick={v => setScale('development', v)} />
          </div>

          {/* -- PRIMARY -- */}
          <div className="sat-section">
            <p className="sat-section-title">
              <span className="sat-section-dot primary" />
              Primary Aromas &amp; Flavours
            </p>

            <div className="sat-fruit-clusters">
              {PRIMARY_ITEMS.map(({ key, label, isFruit, redOnly, whiteOnly }) => {
                if (redOnly   && wineType && !RED_TYPES.has(wineType))   return null;
                if (whiteOnly && wineType && !WHITE_TYPES.has(wineType)) return null;
                return (
                  <div key={key} className="sat-fruit-group">
                    <Chip
                      variant={isFruit ? 'sub' : 'normal'}
                      on={!!sat.primary[key]}
                      onClick={() => togglePrimary(key)}
                    >
                      {label}
                    </Chip>
                    {isFruit && sat.primary[key] && FRUIT_ITEMS[key] && (
                      <div className="sat-fruit-items">
                        {FRUIT_ITEMS[key].map(item => (
                          <Chip
                            key={item}
                            variant="item"
                            on={!!sat.fruitItems[`${key}__${item}`]}
                            onClick={() => toggleFruitItem(key, item)}
                          >
                            {item}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <input
              className="sat-custom"
              placeholder="Others — write your own…"
              value={sat.primaryCustom}
              onChange={e => update({ primaryCustom: e.target.value })}
            />
          </div>

          {/* -- SECONDARY -- */}
          <div className="sat-section">
            <p className="sat-section-title">
              <span className="sat-section-dot secondary" />
              Secondary — Fermentation
            </p>
            <div className="sat-chips-row">
              {SECONDARY_CATS.map(({ key, label }) => (
                <Chip key={key} on={!!sat.secondary[key]} onClick={() => toggleCat('secondary', key)}>
                  {label}
                </Chip>
              ))}
            </div>
            <input
              className="sat-custom"
              placeholder="Other secondary notes?"
              value={sat.secondaryCustom}
              onChange={e => update({ secondaryCustom: e.target.value })}
            />
          </div>

          {/* -- TERTIARY -- */}
          <div className="sat-section">
            <p className="sat-section-title">
              <span className="sat-section-dot tertiary" />
              Tertiary — Oxidation &amp; Bottle Age
            </p>
            <div className="sat-chips-row">
              {TERTIARY_CATS.map(({ key, label }) => (
                <Chip key={key} on={!!sat.tertiary[key]} onClick={() => toggleCat('tertiary', key)}>
                  {label}
                </Chip>
              ))}
            </div>
            <input
              className="sat-custom"
              placeholder="Other tertiary notes?"
              value={sat.tertiaryCustom}
              onChange={e => update({ tertiaryCustom: e.target.value })}
            />
          </div>

          {/* -- PALATE -- */}
          <div className="sat-section">
            <p className="sat-section-title">
              <span className="sat-section-dot palate" />
              👅 Palate
            </p>
            <ScaleRow label="Sweetness" options={SWEETNESS} value={sat.scales?.sweetness} onPick={v => setScale('sweetness', v)} />
            <ScaleRow label="Acidity" options={LEVEL5} value={sat.scales?.acidity} onPick={v => setScale('acidity', v)} />
            {(!wineType || TANNIN_TYPES.has(wineType)) && (
              <ScaleRow label="Tannin" options={LEVEL5} value={sat.scales?.tannin} onPick={v => setScale('tannin', v)} />
            )}
            {MOUSSE_TYPES.has(wineType) && (
              <ScaleRow label="Mousse" options={MOUSSE} value={sat.scales?.mousse} onPick={v => setScale('mousse', v)} />
            )}
            <ScaleRow label="Alcohol" options={ALCOHOL} value={sat.scales?.alcohol} onPick={v => setScale('alcohol', v)} />
            <ScaleRow label="Body" options={BODY5} value={sat.scales?.body} onPick={v => setScale('body', v)} />
            <ScaleRow label="Flavour int." options={INTENSITY5} value={sat.scales?.flavourIntensity} onPick={v => setScale('flavourIntensity', v)} />
            <ScaleRow label="Finish" options={FINISH5} value={sat.scales?.finish} onPick={v => setScale('finish', v)} />
          </div>

          {/* -- CONCLUSIONS -- */}
          <div className="sat-section">
            <p className="sat-section-title">
              <span className="sat-section-dot conclusion" />
              🎓 Conclusions
            </p>
            <ScaleRow label="Quality" options={QUALITY} value={sat.scales?.quality} onPick={v => setScale('quality', v)} />
            <ScaleRow label="Readiness" options={READINESS} value={sat.scales?.readiness} onPick={v => setScale('readiness', v)} />
          </div>

        </div>
      )}
    </div>
  );
}
