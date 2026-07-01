import { useEffect, useRef, useState } from 'react';
import { resolveLocation, REGIONS } from '../utils/wineGeo.js';
import { WineTypeIcon } from './wineIcons.jsx';

const API = '';
const WORLD_REGIONS = Object.keys(REGIONS).length;

// Vivid palette for tasted countries (cycled).
const PALETTE = ['#e0533f', '#e08a2f', '#d4b021', '#5bb463', '#2f9e9e', '#4f86d6', '#9a6fd6', '#d65fa8'];

// Normalise country names so our data matches the topojson feature names.
const ALIAS = {
  'united states': 'united states of america', usa: 'united states of america',
  'united kingdom': 'united kingdom', uk: 'united kingdom', england: 'united kingdom',
};
const canon = (s) => { const k = (s || '').trim().toLowerCase(); return ALIAS[k] || k; };

// lat/lng → unit-sphere point (radius r).
function latLng(lat, lng, r, THREE) {
  const phi = (90 - lat) * Math.PI / 180, theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}
// unit-sphere point → [lng, lat] (inverse of latLng).
function toLatLng(v) {
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, v.y))) * 180 / Math.PI;
  let lng = Math.atan2(v.z, -v.x) * 180 / Math.PI - 180;
  if (lng < -180) lng += 360; if (lng > 180) lng -= 360;
  return [lng, lat];
}
// Ray-casting point-in-polygon over a GeoJSON feature ([lng,lat] rings).
function inFeature(lng, lat, geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  for (const poly of polys) {
    const ring = poly[0]; let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

export default function WinePassport({ onBack, userId, onWineClick }) {
  const mountRef = useRef(null);
  const focusRef = useRef(null);   // effect assigns: (lat,lng) => zoom the globe there
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);   // tapped country { name, wines:[...] }
  const [region, setRegion] = useState(null);        // drilled-into region name (null = country level)
  const [miniWine, setMiniWine] = useState(null);    // wine tapped in the list → tiny preview card
  const [stats, setStats] = useState({ countries: 0, regions: 0, wines: 0 });

  // Tapping a new country resets the region drill + any open mini card.
  useEffect(() => { setRegion(null); setMiniWine(null); }, [selected]);

  useEffect(() => {
    let renderer, scene, camera, controls, frame, ro, disposed = false;
    const mount = mountRef.current;

    (async () => {
      let wines = [];
      try { wines = await fetch(`${API}/api/wines?userId=${userId}`).then(r => r.json()); } catch {}
      wines = Array.isArray(wines) ? wines : [];

      // Aggregate by country (for fill + tap card) and collect region pins.
      const byCountry = new Map();   // canonCountry → { country, wines, count, total }
      const pins = [];               // famous regions → glowing dots
      const regionSet = new Set();
      const tastedPts = [];          // every located wine's [lat,lng] → initial globe facing
      for (const w of wines) {
        const p = resolveLocation(w.location);
        if (!p) continue;
        tastedPts.push([p.lat, p.lng]);
        if (p.kind === 'region') { regionSet.add(p.name); pins.push(p); }
        const cc = canon(p.country);
        if (!byCountry.has(cc)) byCountry.set(cc, { country: p.country, wines: [], count: 0, total: 0 });
        const e = byCountry.get(cc);
        e.wines.push({
          id: w.id, name: w.name, winery: w.winery, rating: w.rating,
          type: w.type, image_path: w.image_path, location: w.location,
          region: p.kind === 'region' ? { name: p.name, lat: p.lat, lng: p.lng } : null,
        });
        e.count += 1; e.total += (w.rating || 0);
      }
      setStats({ countries: byCountry.size, regions: regionSet.size, wines: wines.length });
      if (disposed) return;

      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const topojson = await import('topojson-client');
      const world = (await import('world-atlas/countries-110m.json')).default;
      if (disposed || !mount) return;
      setLoading(false);

      const land = topojson.feature(world, world.objects.countries);
      // Assign each tasted country a palette colour.
      const colorByCanon = new Map();
      let ci = 0;
      for (const cc of byCountry.keys()) colorByCanon.set(cc, PALETTE[ci++ % PALETTE.length]);

      // ── Continent texture: tasted countries vivid, the rest muted ──
      const CW = 2048, CH = 1024;
      const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
      const cx = cv.getContext('2d');
      const px = (lng) => (lng + 180) / 360 * CW, py = (lat) => (90 - lat) / 180 * CH;
      const draw = (ring) => { cx.beginPath(); ring.forEach(([lng, lat], i) => { const x = px(lng), y = py(lat); i ? cx.lineTo(x, y) : cx.moveTo(x, y); }); cx.closePath(); cx.fill(); };
      const drawFeature = (geom) => {
        if (geom.type === 'Polygon') geom.coordinates.forEach(draw);           // each ring
        else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(poly => poly.forEach(draw));
      };
      const paint = (highlightCanon) => {
        cx.fillStyle = '#12224a'; cx.fillRect(0, 0, CW, CH);         // ocean (deep blue)
        for (const f of land.features) {
          const cc = canon(f.properties?.name);
          cx.fillStyle = cc === highlightCanon ? '#ffd76a'           // tapped → gold
            : colorByCanon.get(cc) || '#5b6a92';                     // tasted → vivid, else muted land (lightened so the globe reads as land vs sea)
          drawFeature(f.geometry);
        }
        tex.needsUpdate = true;
      };

      const w = mount.clientWidth, h = mount.clientHeight || 360;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
      camera.position.set(0, 0.4, 3.0);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      paint(null);

      const globe = new THREE.Group(); scene.add(globe);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), new THREE.MeshBasicMaterial({ map: tex }));
      globe.add(sphere);

      // Face the user's wines on load. Without this the globe opens on the empty
      // Americas (all muted) and reads as "colourless" — the tasted countries are
      // hidden on the far side. Circular-mean the tasted longitudes (handles the
      // ±180° wrap) and spin the globe so that meridian faces the camera.
      // Derivation: an unrotated point at longitude L sits at facing longitude
      // -90°, so rotation.y = -(90° + L) brings L to the front.
      const faceLng = tastedPts.length
        ? Math.atan2(
            tastedPts.reduce((s, [, lng]) => s + Math.sin(lng * Math.PI / 180), 0),
            tastedPts.reduce((s, [, lng]) => s + Math.cos(lng * Math.PI / 180), 0),
          ) * 180 / Math.PI
        : 10;  // no wines yet → open on Europe, which just looks nicer than the Pacific
      globe.rotation.y = -(90 + faceLng) * Math.PI / 180;
      globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0x6f9bd6, transparent: true, opacity: 0.12, side: THREE.BackSide })));

      // Region pins (small gold accents)
      for (const p of pins) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
        dot.position.copy(latLng(p.lat, p.lng, 1.012, THREE)); globe.add(dot);
      }

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false; controls.enableDamping = true;
      controls.minDistance = 1.4; controls.maxDistance = 4; controls.rotateSpeed = 0.7;
      controls.autoRotate = true; controls.autoRotateSpeed = 0.5;

      // Tap a country → find it, highlight it, zoom in, show its wines.
      const ray = new THREE.Raycaster();
      let downX = 0, downY = 0, focusTarget = null;
      const onDown = (e) => { downX = e.clientX; downY = e.clientY; controls.autoRotate = false; };
      const onUp = (e) => {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const m = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(m, camera);
        const hit = ray.intersectObject(sphere, false)[0];
        if (!hit) return;
        // hit.point is WORLD space; the texture/country lookup lives in the
        // globe's LOCAL frame, which is rotated (see globe.rotation.y). Convert
        // back before inverting to lat/lng, or every tap lands a continent off.
        const localHit = globe.worldToLocal(hit.point.clone()).normalize();
        const [lng, lat] = toLatLng(localHit);
        const feat = land.features.find(f => inFeature(lng, lat, f.geometry));
        if (!feat) { setSelected(null); paint(null); return; }
        const cc = canon(feat.properties.name);
        paint(cc);
        focusTarget = hit.point.clone().normalize().multiplyScalar(1.9);
        const agg = byCountry.get(cc);
        setSelected(agg ? { ...agg, name: agg.country } : { name: feat.properties.name, count: 0, wines: [] });
      };
      renderer.domElement.addEventListener('pointerdown', onDown);
      renderer.domElement.addEventListener('pointerup', onUp);

      // Let the card drill-down zoom the globe to a region's coordinates.
      // latLng() is in the globe's LOCAL frame; lift it to WORLD (the globe is
      // rotated) so the camera flies to the right spot.
      focusRef.current = (lat, lng) => {
        controls.autoRotate = false;
        const world = globe.localToWorld(latLng(lat, lng, 1, THREE));
        focusTarget = world.normalize().multiplyScalar(1.6);
      };

      const animate = () => {
        frame = requestAnimationFrame(animate);
        if (focusTarget) { camera.position.lerp(focusTarget, 0.08); if (camera.position.distanceTo(focusTarget) < 0.02) focusTarget = null; }
        controls.update(); renderer.render(scene, camera);
      };
      animate();
      ro = new ResizeObserver(() => { const nw = mount.clientWidth, nh = mount.clientHeight || 360; camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh); });
      ro.observe(mount);
      cleanup = () => { renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp); };
    })();

    let cleanup = () => {};
    return () => { disposed = true; if (frame) cancelAnimationFrame(frame); ro?.disconnect(); cleanup(); controls?.dispose?.(); if (renderer) { renderer.dispose(); renderer.domElement.remove(); } };
  }, [userId]);

  const pct = Math.min(100, Math.round((stats.regions / WORLD_REGIONS) * 100));

  // Group the selected country's wines by region (for the drill-down).
  const countryWines = selected?.wines || [];
  const regionGroups = (() => {
    const m = new Map();
    for (const w of countryWines) {
      const key = w.region?.name || null;
      if (!m.has(key)) m.set(key, { name: key, lat: w.region?.lat, lng: w.region?.lng, wines: [] });
      m.get(key).wines.push(w);
    }
    // named regions first (most wines first), the "no region" bucket last
    return [...m.values()].sort((a, b) => (a.name === null) - (b.name === null) || b.wines.length - a.wines.length);
  })();
  const namedRegions = regionGroups.filter(g => g.name);
  const looseWines = regionGroups.find(g => g.name === null)?.wines || [];
  const regionWines = region ? (regionGroups.find(g => g.name === region)?.wines || []) : [];
  const avg = (ws) => (ws.reduce((s, w) => s + (w.rating || 0), 0) / ws.length).toFixed(1);

  const openRegion = (g) => { setRegion(g.name); if (g.lat != null) focusRef.current?.(g.lat, g.lng); };

  const GlobeIcon = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
    </svg>
  );

  return (
    <div className="passport-page">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="passport-hero">
        <h1><span className="ph-icon">{GlobeIcon}</span> Wine Passport</h1>
        <p>Tap a country, then a region, to revisit your wines.</p>
      </div>

      <div className="passport-stats">
        <div className="ps-stat"><span className="ps-val">{stats.countries}</span><span className="ps-lbl">Countries</span></div>
        <div className="ps-stat"><span className="ps-val">{stats.regions}</span><span className="ps-lbl">Regions</span></div>
        <div className="ps-stat"><span className="ps-val">{stats.wines}</span><span className="ps-lbl">Wines</span></div>
        <div className="ps-stat"><span className="ps-val">{pct}%</span><span className="ps-lbl">Explored</span></div>
      </div>

      <div className="passport-globe" ref={mountRef}>
        {loading && <p className="passport-loading">Spinning up the globe…</p>}
      </div>

      {selected && (
        <div className="passport-card">
          {/* Always-reachable close (the bottom one can fall behind the nav on a
              tall card / small screen). */}
          <button className="pc-close-x" onClick={() => setSelected(null)} aria-label="Close">×</button>
          {/* Header — shows the drill path (country › region) */}
          <div className="pc-head">
            {region ? (
              <>
                <button className="pc-crumb" onClick={() => setRegion(null)}>← {selected.name}</button>
                <span className="pc-name">{region}</span>
                <span className="pc-sub">{regionWines.length} wine{regionWines.length === 1 ? '' : 's'} · {avg(regionWines)}★ avg</span>
              </>
            ) : (
              <>
                <span className="pc-name">{selected.name}</span>
                <span className="pc-sub">{selected.count
                  ? `${selected.count} wine${selected.count === 1 ? '' : 's'}${selected.total ? ` · ${(selected.total / selected.count).toFixed(1)}★ avg` : ''}`
                  : 'No wines logged here yet'}</span>
              </>
            )}
          </div>

          {/* Region drill: at country level show regions to drill into + any
              region-less wines; at region level show that region's wines. */}
          {region ? (
            <div className="pc-wines">
              {regionWines.map(w => (
                <button key={w.id} className="pc-wine" onClick={() => setMiniWine(w)}>
                  <WineTypeIcon type={w.type} size={15} /> {w.name}{w.winery ? ` · ${w.winery}` : ''}
                </button>
              ))}
            </div>
          ) : (
            <>
              {namedRegions.length > 0 && (
                <div className="pc-regions">
                  {namedRegions.map(g => (
                    <button key={g.name} className="pc-region" onClick={() => openRegion(g)}>
                      <span className="pc-region-name">{g.name}</span>
                      <span className="pc-region-meta">{g.wines.length} · {avg(g.wines)}★</span>
                      <span className="pc-region-arrow">›</span>
                    </button>
                  ))}
                </div>
              )}
              {looseWines.length > 0 && (
                <div className="pc-wines">
                  {looseWines.map(w => (
                    <button key={w.id} className="pc-wine" onClick={() => setMiniWine(w)}>
                      <WineTypeIcon type={w.type} size={15} /> {w.name}{w.winery ? ` · ${w.winery}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button className="pc-close" onClick={() => setSelected(null)}>Close</button>

          {/* Tiny wine card — tap it to open the full review */}
          {miniWine && (
            <div className="pc-mini-overlay" onClick={() => setMiniWine(null)}>
              <div className="pc-mini" onClick={(e) => e.stopPropagation()}>
                <button
                  className="pc-mini-body"
                  onClick={() => onWineClick?.({ name: miniWine.name, winery: miniWine.winery })}
                  title="Open full review"
                >
                  <div className="pc-mini-thumb">
                    {miniWine.image_path
                      ? <img src={`${API}${miniWine.image_path}`} alt="" />
                      : <WineTypeIcon type={miniWine.type} size={30} />}
                  </div>
                  <div className="pc-mini-info">
                    <span className="pc-mini-name"><WineTypeIcon type={miniWine.type} size={14} /> {miniWine.name}</span>
                    {miniWine.winery && <span className="pc-mini-winery">{miniWine.winery}</span>}
                    <span className="pc-mini-rating">{'★'.repeat(Math.round(miniWine.rating || 0))}{'☆'.repeat(5 - Math.round(miniWine.rating || 0))}</span>
                    <span className="pc-mini-cta">Tap to open review →</span>
                  </div>
                </button>
                <button className="pc-mini-close" onClick={() => setMiniWine(null)} aria-label="Close">×</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
