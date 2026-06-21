import { useState, useEffect, useRef } from 'react';
import { searchGrapes } from '../utils/grapeDatabase.js';

const API = '';

function resolveAlias(q) {
  const results = searchGrapes(q, 1);
  return results[0] || null;
}

export default function GrapesTagInput({ value, onChange }) {
  // value = comma-separated string, e.g. "Pinot Noir, Cabernet Sauvignon"
  const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const [input,       setInput]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [active,      setActive]      = useState(-1);
  const debounceRef = useRef();
  const wrapRef     = useRef();
  const inputRef    = useRef();

  // fetch suggestions as user types
  useEffect(() => {
    if (!input.trim()) { setSuggestions([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // 1. Search the grape database (local, instant)
      const dbSuggestions = searchGrapes(input.trim(), 8).filter(g => !tags.includes(g));
      // 2. Pull previously used values from the API
      let apiVals = [];
      try {
        const res = await fetch(`${API}/api/suggestions?field=grapes&q=${encodeURIComponent(input.trim())}`);
        const raw = await res.json();
        for (const r of raw) {
          for (const part of r.split(/[,;]+/).map(s => s.trim()).filter(Boolean)) {
            if (!tags.includes(part)) apiVals.push(part);
          }
        }
      } catch {}
      // Merge: db first (better quality), then api values not already covered
      const seen = new Set(dbSuggestions.map(s => s.toLowerCase()));
      const merged = [...dbSuggestions];
      for (const v of apiVals) {
        if (!seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); merged.push(v); }
      }
      setSuggestions(merged.slice(0, 8));
      setOpen(merged.length > 0);
      setActive(-1);
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [input]);

  // close on outside click
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const addTag = (raw) => {
    const grape = raw.trim();
    if (!grape || tags.includes(grape)) { setInput(''); setOpen(false); return; }
    const newTags = [...tags, grape];
    onChange(newTags.join(', '));
    setInput('');
    setSuggestions([]);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  const removeTag = (idx) => {
    const newTags = tags.filter((_, i) => i !== idx);
    onChange(newTags.join(', '));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      if (open && active >= 0) { addTag(suggestions[active]); return; }
      // try alias resolution first
      const resolved = resolveAlias(input) || input;
      addTag(resolved);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags.length - 1);
    } else if (e.key === 'ArrowDown' && open) {
      e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault(); setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false); setActive(-1);
    }
  };

  return (
    <div ref={wrapRef} className="grapes-tag-wrap">
      {/* Text input sits on top, full width */}
      <div className="grapes-tag-input-row">
        <input
          ref={inputRef}
          className="grapes-tag-input"
          placeholder="Pinot Noir, Cabernet Sauvignon…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="ac-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`ac-item${i === active ? ' active' : ''}`}
              onMouseDown={() => addTag(s)}
              onMouseEnter={() => setActive(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {/* Tags sit below the input */}
      {tags.length > 0 && (
        <div className="grapes-tag-list">
          {tags.map((tag, i) => (
            <span key={i} className="grape-tag">
              {tag}
              <button type="button" className="grape-tag-remove" onClick={() => removeTag(i)} tabIndex={-1}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
