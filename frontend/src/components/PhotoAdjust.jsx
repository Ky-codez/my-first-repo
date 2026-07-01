import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

// WYSIWYG photo framing: the photo sits inside the real 4:5 card frame.
// Drag to reposition, pinch / scroll / slider to zoom — what you see in the
// frame is exactly what the wine card shows. Emits the visible region as
// { x, y, w, h } percentages of the image (the wines.focal_* columns).
const FRAME_RATIO = 4 / 5; // card frame width / height
const MAX_ZOOM = 4;

const round2 = (f) => ({
  x: Math.round(f.x * 100) / 100,
  y: Math.round(f.y * 100) / 100,
  w: Math.round(f.w * 100) / 100,
  h: Math.round(f.h * 100) / 100,
});

const differs = (a, b) =>
  !a || !b || ['x', 'y', 'w', 'h'].some(k => Math.abs(a[k] - b[k]) > 0.75);

// Largest 4:5 region of an image with aspect `a` (naturalWidth / naturalHeight).
// Rect units are % of the image's own width/height, so the required w:h ratio
// in % units is FRAME_RATIO / a.
const coverRect = (a) => {
  if (a >= FRAME_RATIO) {
    const w = (FRAME_RATIO / a) * 100;          // wide image: full height
    return { x: (100 - w) / 2, y: 0, w, h: 100 };
  }
  const h = (a / FRAME_RATIO) * 100;            // tall image: full width
  return { x: 0, y: (100 - h) / 2, w: 100, h };
};

const clampRect = (f, a) => {
  const cover = coverRect(a);
  let w = Math.max(cover.w / MAX_ZOOM, Math.min(cover.w, f.w));
  let h = w * (cover.h / cover.w);
  return {
    x: Math.max(0, Math.min(100 - w, f.x)),
    y: Math.max(0, Math.min(100 - h, f.y)),
    w, h,
  };
};

// Fit any suggested box (legacy focal values, AI label detection) to a valid
// 4:5 rect that contains it.
const adoptValue = (v, a) => {
  if (!v || !(v.w > 0) || !(v.h > 0)) return coverRect(a);
  const cover = coverRect(a);
  const ratio = cover.w / cover.h;
  const w = Math.max(v.w, v.h * ratio);
  const h = w / ratio;
  return clampRect({ x: v.x + v.w / 2 - w / 2, y: v.y + v.h / 2 - h / 2, w, h }, a);
};

const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

export default function PhotoAdjust({ src, value, onChange }) {
  const frameRef    = useRef(null);
  const aspectRef   = useRef(null);     // naturalWidth / naturalHeight
  const rectRef     = useRef(null);     // live rect (avoids stale closures)
  const valueRef    = useRef(value);
  const onChangeRef = useRef(onChange);
  const pointers    = useRef(new Map()); // active pointers → pan / pinch
  const gesture     = useRef(null);      // { f0, pts } snapshot at gesture start
  const [rect, setRect] = useState(null);
  onChangeRef.current = onChange;

  const apply = (f) => {
    const nf = clampRect(f, aspectRef.current);
    rectRef.current = nf;
    setRect(nf);
    onChangeRef.current(round2(nf));
  };

  // (Re)initialise when a new image finishes loading
  const handleLoad = (e) => {
    const img = e.target;
    if (!img.naturalWidth) return;
    aspectRef.current = img.naturalWidth / img.naturalHeight;
    apply(adoptValue(valueRef.current, aspectRef.current));
  };

  // Adopt frames suggested from outside (e.g. AI label detection)
  useEffect(() => {
    const a = aspectRef.current;
    const prev = valueRef.current;
    valueRef.current = value;
    if (!a || !value || !rectRef.current) return;
    if (differs(value, prev) && differs(value, rectRef.current)) {
      apply(adoptValue(value, a));
    }
  }, [value]);

  // ── drag to pan · two fingers to pinch-zoom ────────────────────────────────
  const startGesture = () => {
    gesture.current = {
      f0: { ...rectRef.current },
      pts: [...pointers.current.values()].map(p => ({ ...p })),
    };
  };

  const down = (e) => {
    if (!rectRef.current) return;
    e.preventDefault();
    frameRef.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  };

  const move = (e) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g   = gesture.current;
    const el  = frameRef.current;
    const pts = [...pointers.current.values()];
    if (g.pts.length >= 2 && pts.length >= 2) {
      const d0 = dist(g.pts[0], g.pts[1]);
      const d1 = dist(pts[0], pts[1]);
      if (d0 < 1 || d1 < 1) return;
      const k  = d0 / d1; // fingers apart → smaller visible region = zoom in
      const cx = g.f0.x + g.f0.w / 2, cy = g.f0.y + g.f0.h / 2;
      apply({ x: cx - (g.f0.w * k) / 2, y: cy - (g.f0.h * k) / 2, w: g.f0.w * k, h: g.f0.h * k });
    } else {
      // dragging the photo right reveals its left side → region moves left
      const dx = pts[0].x - g.pts[0].x;
      const dy = pts[0].y - g.pts[0].y;
      apply({
        ...g.f0,
        x: g.f0.x - (dx / el.clientWidth)  * g.f0.w,
        y: g.f0.y - (dy / el.clientHeight) * g.f0.h,
      });
    }
  };

  const up = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) startGesture();
    else gesture.current = null;
  };

  // Wheel zoom needs a non-passive listener to stop the page scrolling
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const f = rectRef.current;
      if (!f) return;
      e.preventDefault();
      const k  = e.deltaY > 0 ? 1.07 : 1 / 1.07;
      const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      apply({ x: cx - (f.w * k) / 2, y: cy - (f.h * k) / 2, w: f.w * k, h: f.h * k });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const cover = aspectRef.current ? coverRect(aspectRef.current) : null;
  const zoom  = rect && cover ? cover.w / rect.w : 1;

  const setZoom = (z) => {
    const f = rectRef.current;
    if (!f || !cover) return;
    const w  = cover.w / z;
    const h  = cover.h / z;
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    apply({ x: cx - w / 2, y: cy - h / 2, w, h });
  };

  return (
    <div className="photo-adjust">
      <div
        ref={frameRef}
        className="pa-frame"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <img
          src={src}
          alt="Wine photo"
          className="pa-img"
          draggable={false}
          onLoad={handleLoad}
          style={rect ? {
            width:  `${10000 / rect.w}%`,
            height: `${10000 / rect.h}%`,
            left:   `${(-rect.x * 100) / rect.w}%`,
            top:    `${(-rect.y * 100) / rect.h}%`,
          } : { width: '100%', height: '100%', objectFit: 'contain', left: 0, top: 0 }}
        />
        <div className="pa-grid" aria-hidden="true" />
        <span className="pa-hint">↔ Drag to reposition</span>
      </div>
      <div className="pa-controls">
        <span className="pa-zoom-ico" aria-hidden="true"><MagnifyingGlass size={15} /></span>
        <input
          className="pa-zoom"
          type="range"
          min="1" max={MAX_ZOOM} step="0.01"
          value={zoom}
          onChange={e => setZoom(parseFloat(e.target.value))}
          aria-label="Zoom"
        />
        <button type="button" className="pa-reset" onClick={() => cover && apply(cover)}>
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
