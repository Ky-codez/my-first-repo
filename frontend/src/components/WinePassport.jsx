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

      const land = topojson.feature(world, world.objects.countries);
      // Assign each tasted country a palette colour.
      const colorByCanon = new Map();
      let ci = 0;
      for (const cc of byCountry.keys()) colorByCanon.set(cc, PALETTE[ci++ % PALETTE.length]);

      // ── Geometry helpers for the dot globe ───────────────────────────────
      const ringC = (ring) => { let x = 0, y = 0; for (const [lng, lat] of ring) { x += lng; y += lat; } return [x / ring.length, y / ring.length]; };
      // A country's MAIN landmass (its largest polygon, by vertex count).
      const mainCentroid = (geom) => {
        if (geom.type === 'Polygon') return ringC(geom.coordinates[0]);
        let best = geom.coordinates[0];
        for (const p of geom.coordinates) if (p[0].length > best[0].length) best = p;
        return ringC(best[0]);
      };
      // Per-country main centroid + bounding box → a fast land lookup for the dot
      // grid, plus a mainland test so overseas territories (e.g. French Guiana,
      // which the dataset lumps into "France") never take a tasted country's colour.
      const mainC = new Map();
      const boxes = [];
      for (const f of land.features) {
        const cc = canon(f.properties?.name);
        mainC.set(cc, mainCentroid(f.geometry));
        let a = 180, b = -180, c = 90, d = -90;
        const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
        for (const r of rings) for (const [lng, lat] of r) { if (lng < a) a = lng; if (lng > b) b = lng; if (lat < c) c = lat; if (lat > d) d = lat; }
        boxes.push({ f, cc, a, b, c, d });
      }
      const findFeat = (lng, lat) => {
        for (const B of boxes) { if (lng < B.a || lng > B.b || lat < B.c || lat > B.d) continue; if (inFeature(lng, lat, B.f.geometry)) return B; }
        return null;
      };
      const isMainland = (cc, lng, lat) => {
        const ctr = mainC.get(cc); if (!ctr) return true;
        const dLng = Math.min(Math.abs(lng - ctr[0]), 360 - Math.abs(lng - ctr[0]));
        return Math.hypot(dLng, lat - ctr[1]) <= 45;
      };

      const w = mount.clientWidth, h = mount.clientHeight || 360;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
      camera.position.set(0, 0.35, 3.0);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const sun = new THREE.DirectionalLight(0x9ec2ff, 0.55);
      sun.position.copy(camera.position); scene.add(sun);

      // Starfield behind the globe — a bit of depth against the dark panel.
      const starN = 340, sp = new Float32Array(starN * 3);
      for (let i = 0; i < starN; i++) {
        const rr = 9 + Math.random() * 8, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        sp[i * 3] = rr * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = rr * Math.cos(ph); sp[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
      }
      const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcdd8f5, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.7 }));
      scene.add(stars);

      const globe = new THREE.Group(); scene.add(globe);

      // Ocean body — a dark sphere that gives the planet volume, hides the dots on
      // the far side, and is the ray-cast target for taps.
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.992, 64, 64),
        new THREE.MeshPhongMaterial({ color: 0x0a1a37, shininess: 14, specular: new THREE.Color(0x1b345c) }));
      globe.add(body);

      // ── Land as a dot matrix (the modern "cobe / Stripe" globe look) ──────
      // A lat/lng grid, thinned toward the poles for even spacing; each land
      // point becomes a dot. Tasted mainland → its palette colour, everything
      // else → a dim neutral dot.
      const DIM = new THREE.Color('#31405f');
      const tmp = new THREE.Color();
      const dPos = [], dCol = [], dBase = [], dotCanon = [];
      for (let lat = -84; lat <= 84; lat += 1.8) {
        const rows = Math.max(1, Math.round(Math.cos(lat * Math.PI / 180) * 195));
        for (let k = 0; k < rows; k++) {
          const lng = -180 + (360 * k) / rows;
          const F = findFeat(lng, lat);
          if (!F) continue;
          const main = isMainland(F.cc, lng, lat);
          const vivid = main ? colorByCanon.get(F.cc) : null;
          const c = vivid ? tmp.set(vivid) : DIM;
          const P = latLng(lat, lng, 1.001, THREE);
          dPos.push(P.x, P.y, P.z); dCol.push(c.r, c.g, c.b); dBase.push(c.r, c.g, c.b);
          dotCanon.push(main ? F.cc : '__x__');
        }
      }
      // Soft round sprite so dots are circles, not squares.
      const dcv = document.createElement('canvas'); dcv.width = dcv.height = 64;
      const dctx = dcv.getContext('2d');
      const grd = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      dctx.fillStyle = grd; dctx.beginPath(); dctx.arc(32, 32, 32, 0, Math.PI * 2); dctx.fill();
      const dotTex = new THREE.CanvasTexture(dcv);
      const dotGeo = new THREE.BufferGeometry();
      dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dPos, 3));
      dotGeo.setAttribute('color', new THREE.Float32BufferAttribute(dCol, 3));
      const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({
        size: 0.03, map: dotTex, alphaTest: 0.5, transparent: true, sizeAttenuation: true, vertexColors: true,
      }));
      globe.add(dots);
      const dotColorAttr = dotGeo.getAttribute('color');
      const GOLD = new THREE.Color('#ffd23f');
      const highlight = (cc) => {
        for (let i = 0; i < dotCanon.length; i++) {
          if (cc && dotCanon[i] === cc) dotColorAttr.setXYZ(i, GOLD.r, GOLD.g, GOLD.b);
          else dotColorAttr.setXYZ(i, dBase[i * 3], dBase[i * 3 + 1], dBase[i * 3 + 2]);
        }
        dotColorAttr.needsUpdate = true;
      };

      // Small static markers at your exact wine regions.
      for (const p of pins) {
        const at = latLng(p.lat, p.lng, 1.008, THREE);
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff0c4 }));
        m.position.copy(at); globe.add(m);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
        halo.position.copy(at); globe.add(halo);
      }
      setLoading(false);

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

      // Atmosphere — a fresnel rim glow (bright at the limb, fading inward) sells
      // the "planet with an atmosphere" look far better than a flat halo sphere.
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(1.22, 64, 64),
        new THREE.ShaderMaterial({
          transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
          uniforms: { glow: { value: new THREE.Color(0x5aa0e6) } },
          vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: 'uniform vec3 glow; varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); gl_FragColor = vec4(glow, 1.0) * clamp(i, 0.0, 1.0); }',
        }),
      );
      scene.add(atmo);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.minDistance = 1.5; controls.maxDistance = 4; controls.rotateSpeed = 0.55;
      controls.autoRotate = true; controls.autoRotateSpeed = 0.28;   // calm, slow drift

      // Tap a country → find it, highlight it, zoom in, show its wines.
      const ray = new THREE.Raycaster();
      let downX = 0, downY = 0, focusTarget = null;
      const onDown = (e) => { downX = e.clientX; downY = e.clientY; controls.autoRotate = false; };
      const onUp = (e) => {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const m = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(m, camera);
        const hit = ray.intersectObject(body, false)[0];
        if (!hit) return;
        // hit.point is WORLD space; the country lookup lives in the globe's LOCAL
        // frame, which is rotated (see globe.rotation.y). Convert back before
        // inverting to lat/lng, or every tap lands a continent off.
        const localHit = globe.worldToLocal(hit.point.clone()).normalize();
        const [lng, lat] = toLatLng(localHit);
        const F = findFeat(lng, lat);
        if (!F) { setSelected(null); highlight(null); return; }   // ocean → clear
        highlight(F.cc);                                          // gold the tapped country's dots
        focusTarget = hit.point.clone().normalize().multiplyScalar(1.9);
        const agg = byCountry.get(F.cc);
        setSelected(agg ? { ...agg, name: agg.country } : { name: F.f.properties.name, count: 0, wines: [] });
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
        sun.position.copy(camera.position);        // keep the face you're looking at lit
        stars.rotation.y += 0.0002;                // barely-there drift
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
        <p>Spin the globe — lit-up countries are ones you've tasted. Tap one, then a region, to revisit your wines.</p>
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
