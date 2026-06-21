import { useState, useEffect, useRef } from 'react';
import { searchGrapes } from '../utils/grapeDatabase.js';
import { searchRegions } from '../utils/regionDatabase.js';

const API = '';

// -- Short-form alias maps -----------------------------------------------------

const GRAPE_ALIASES = {
  // Reds
  'pn':        'Pinot Noir',
  'cs':        'Cabernet Sauvignon',
  'cab sauv':  'Cabernet Sauvignon',
  'cab':       'Cabernet Sauvignon',
  'cf':        'Cabernet Franc',
  'merlot':    'Merlot',
  'syrah':     'Syrah',
  'shiraz':    'Shiraz',
  'gsm':       'Grenache, Syrah, Mourvèdre',
  'grenache':  'Grenache',
  'temp':      'Tempranillo',
  'tempranillo': 'Tempranillo',
  'malbec':    'Malbec',
  'barolo':    'Nebbiolo',
  'nebbiolo':  'Nebbiolo',
  'sangiovese':'Sangiovese',
  'zin':       'Zinfandel',
  'zinfandel': 'Zinfandel',
  'bb':        'Barbera',
  'barbera':   'Barbera',
  'mourvedre': 'Mourvèdre',
  'dolcetto':  'Dolcetto',
  'aglianico': 'Aglianico',
  'primitivo': 'Primitivo',
  'nero':      "Nero d'Avola",
  'montepulciano': 'Montepulciano',
  'touriga':   'Touriga Nacional',
  'xinomavro': 'Xinomavro',
  'saperavi':  'Saperavi',
  // Whites
  'chard':     'Chardonnay',
  'chardonnay':'Chardonnay',
  'sb':        'Sauvignon Blanc',
  'sauv blanc':'Sauvignon Blanc',
  'sauv b':    'Sauvignon Blanc',
  'riesling':  'Riesling',
  'ries':      'Riesling',
  'gv':        'Grüner Veltliner',
  'gruner':    'Grüner Veltliner',
  'gw':        'Gewürztraminer',
  'gewurz':    'Gewürztraminer',
  'pinot gris':'Pinot Gris',
  'pg':        'Pinot Grigio',
  'pinot grigio':'Pinot Grigio',
  'viognier':  'Viognier',
  'roussanne': 'Roussanne',
  'marsanne':  'Marsanne',
  'vermentino':'Vermentino',
  'alb':       'Albariño',
  'albarino':  'Albariño',
  'chenin':    'Chenin Blanc',
  'cb':        'Chenin Blanc',
  'muscadet':  'Melon de Bourgogne',
  'assyrtiko': 'Assyrtiko',
  'torrontes': 'Torrontés',
  // Sparkling / other
  'champ':     'Chardonnay, Pinot Noir, Pinot Meunier',
  'prosecco':  'Glera',
  'cava':      'Macabeo, Xarel·lo, Parellada',
};

const REGION_ALIASES = {
  // France
  'cdp':   'Châteauneuf-du-Pape',
  'cnp':   'Châteauneuf-du-Pape',
  'cdr':   'Côtes du Rhône',
  'bx':    'Bordeaux',
  'bdx':   'Bordeaux',
  'burg':  'Burgundy',
  'champ': 'Champagne',
  'als':   'Alsace',
  'prov':  'Provence',
  'lang':  'Languedoc',
  // Italy
  'tus':   'Tuscany',
  'pied':  'Piedmont',
  // Spain
  'rj':    'Rioja',
  'rdd':   'Ribera del Duero',
  'pb':    'Priorat',
  // New Zealand
  'co':    'Central Otago',
  'marlb': 'Marlborough',
  'hb':    'Hawke\'s Bay',
  // Australia
  'bv':    'Barossa Valley',
  'yv':    'Yarra Valley',
  'mriv':  'Margaret River',
  // USA
  'nv':    'Napa Valley',
  'rrv':   'Russian River Valley',
  'wv':    'Willamette Valley',
  'sb':    'Santa Barbara',
  'sr':    'Sonoma',
  // Portugal
  'dour':  'Douro',
  'vv':    'Vinho Verde',
  // Germany
  'mos':   'Mosel',
  'rg':    'Rheingau',
  // Argentina
  'mend':  'Mendoza',
  // South Africa
  'stell': 'Stellenbosch',
};

function resolveAliases(field, query) {
  if (field === 'grapes') return searchGrapes(query, 4);
  if (field === 'region') return searchRegions(query, 4);
  return [];
}

// -- Component -----------------------------------------------------------------

export default function AutocompleteInput({ field, value, onChange, placeholder, type = 'text', ...rest }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [active, setActive]           = useState(-1);
  const debounceRef = useRef();
  const wrapRef     = useRef();

  useEffect(() => {
    if (!value || value.trim().length < 1) { setSuggestions([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // 1. local aliases
      const aliases = resolveAliases(field, value);
      // 2. DB values
      let dbVals = [];
      try {
        const params = new URLSearchParams({ field, q: value.trim() });
        const res = await fetch(`${API}/api/suggestions?${params}`);
        dbVals = await res.json();
      } catch {}
      // merge: aliases first, then DB values (deduped)
      const seen = new Set(aliases.map(s => s.toLowerCase()));
      const merged = [...aliases];
      for (const v of dbVals) {
        if (!seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); merged.push(v); }
      }
      setSuggestions(merged.slice(0, 8));
      setOpen(merged.length > 0);
      setActive(-1);
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [value, field]);

  // close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (val) => { onChange(val); setSuggestions([]); setOpen(false); setActive(-1); };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  return (
    <div ref={wrapRef} className="ac-wrap">
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        {...rest}
      />
      {open && suggestions.length > 0 && (
        <ul className="ac-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`ac-item${i === active ? ' active' : ''}`}
              onMouseDown={() => pick(s)}
              onMouseEnter={() => setActive(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
