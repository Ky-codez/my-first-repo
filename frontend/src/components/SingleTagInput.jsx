import { useState, useEffect, useRef } from 'react';

const API = '';

/**
 * A single-value tag input.
 * - While empty: shows a text input with autocomplete dropdown
 * - Once a value is picked/typed+Enter: input disappears, replaced by a removable tag
 * - Removing the tag restores the input
 *
 * Props:
 *   field       —backend suggestions field name ('winery' | 'region' | etc.)
 *   value       —current string value (controlled)
 *   onChange    —called with new string value
 *   placeholder —input placeholder text
 *   tagColor    —CSS color for the tag border & text (default: wine purple)
 *   tagBg       —CSS background for the tag (default: semi-transparent purple)
 *   searchFn    —optional (query: string, limit: number) => string[]  for local search
 *   renderTag   —optional (value: string) => ReactNode  for custom tag content
 */
export default function SingleTagInput({
  field, value, onChange, placeholder,
  tagColor = '#9b7fe8',
  tagBg    = '#2d1a4a55',
  searchFn = null,
  renderTag = null,
}) {
  const [tagged,      setTagged]      = useState(!!value);
  const [input,       setInput]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [active,      setActive]      = useState(-1);
  const debounceRef = useRef();
  const wrapRef     = useRef();
  const inputRef    = useRef();

  // Sync when parent sets value externally (e.g. AI auto-fill)
  useEffect(() => {
    if (value) { setTagged(true); setInput(''); }
    else       { setTagged(false); setInput(''); }
  }, [value]);

  useEffect(() => {
    if (tagged || !input.trim()) { setSuggestions([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // local search (grapes/region DB)
      const local = searchFn ? searchFn(input.trim(), 6) : [];
      // DB suggestions
      let apiVals = [];
      try {
        const res = await fetch(`${API}/api/suggestions?field=${field}&q=${encodeURIComponent(input.trim())}`);
        apiVals = await res.json();
      } catch {}
      const seen = new Set(local.map(s => s.toLowerCase()));
      const merged = [...local];
      for (const v of apiVals) {
        if (!seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); merged.push(v); }
      }
      setSuggestions(merged.slice(0, 8));
      setOpen(merged.length > 0);
      setActive(-1);
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [input, tagged, field, searchFn]);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (val) => {
    onChange(val);
    setTagged(true);
    setInput('');
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
  };

  const remove = () => {
    onChange('');
    setTagged(false);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && open) { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp' && open)   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0) { select(suggestions[active]); return; }
      if (input.trim()) select(input.trim());
    }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  if (tagged && value) {
    return (
      <div className="single-tag-wrap">
        <span className="single-tag" style={{ borderColor: tagColor, color: tagColor, background: tagBg }}>
          {renderTag ? renderTag(value) : value}
          <button type="button" className="single-tag-remove" style={{ color: tagColor }} onClick={remove} tabIndex={-1}>×</button>
        </span>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="single-tag-wrap">
      <input
        ref={inputRef}
        className="single-tag-input"
        placeholder={placeholder}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="ac-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`ac-item${i === active ? ' active' : ''}`}
              onMouseDown={() => select(s)}
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
