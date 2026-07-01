import { useEffect, useRef, useState } from 'react';

// ── PROTOTYPE (Path B) ───────────────────────────────────────────────────────
// A procedural 3D wine bottle (shape chosen by type) with the uploaded photo
// wrapped on as the label. Not a real photo→3D reconstruction — a stylised,
// spinnable model. three.js is imported dynamically so it never weighs down the
// main app; this component is only rendered on the /bottle-lab preview page.
//
// Kept in the codebase for evaluation. To ship it for real, drop <Bottle3D>
// into the wine page / share card.

// Bottle silhouette profiles — [radius, height] points revolved around Y.
const PROFILES = {
  bordeaux:  [[0,0],[1.0,0],[1.0,3.0],[0.97,3.2],[0.35,3.7],[0.32,5.0],[0.45,5.25],[0.45,5.4]],
  burgundy:  [[0,0],[1.05,0],[1.05,2.6],[0.95,3.0],[0.4,3.9],[0.34,5.0],[0.46,5.25],[0.46,5.4]],
  champagne: [[0,0],[1.15,0],[1.15,2.4],[1.0,3.0],[0.42,4.0],[0.4,5.1],[0.5,5.35],[0.5,5.5]],
  flute:     [[0,0],[0.85,0],[0.85,3.6],[0.75,4.0],[0.34,4.6],[0.3,5.6],[0.4,5.8],[0.4,5.95]],
};
const TYPE_PROFILE = {
  Red: 'bordeaux', Fortified: 'bordeaux', Dessert: 'flute', Spirit: 'bordeaux',
  White: 'burgundy', 'Rosé': 'burgundy',
  Sparkling: 'champagne', Champagne: 'champagne',
};
const GLASS_COLOR = {
  bordeaux: 0x1c3b2a, burgundy: 0x16331f, champagne: 0x2c3b1e, flute: 0x3a5a2a,
};

export default function Bottle3D({ imageUrl, type = 'Red', height = 420 }) {
  const mountRef = useRef(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let renderer, scene, camera, controls, frame, ro, disposed = false;
    const mount = mountRef.current;
    if (!mount) return;

    (async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
        if (disposed) return;

        const w = mount.clientWidth, h = height;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
        camera.position.set(0, 2.7, 13);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;   // filmic, photographic look
        renderer.toneMappingExposure = 1.1;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        // Procedural studio environment → real reflections on the glass (the
        // single biggest thing that stops it looking like clay). No asset needed.
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        // A touch of direct light on top of the environment for a crisp highlight.
        scene.add(new THREE.AmbientLight(0xffffff, 0.25));
        const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(5, 9, 7); scene.add(key);
        const rim = new THREE.DirectionalLight(0xffd9b0, 0.7); rim.position.set(-6, 5, -4); scene.add(rim);

        const profKey = PROFILES[TYPE_PROFILE[type]] ? TYPE_PROFILE[type] : 'bordeaux';
        const pts = PROFILES[profKey].map(([x, y]) => new THREE.Vector2(x, y));

        const bottle = new THREE.Group();

        // Glass body (revolved silhouette)
        const glassGeo = new THREE.LatheGeometry(pts, 128);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: GLASS_COLOR[profKey], roughness: 0.06, metalness: 0,
          clearcoat: 1.0, clearcoatRoughness: 0.06, ior: 1.5,
          reflectivity: 0.7, envMapIntensity: 1.6,
        });
        bottle.add(new THREE.Mesh(glassGeo, glassMat));

        // Capsule on the neck
        const capGeo = new THREE.CylinderGeometry(0.5, 0.47, 0.7, 48, 1, true);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x3a0d12, roughness: 0.5, metalness: 0.3 });
        const cap = new THREE.Mesh(capGeo, capMat); cap.position.y = 4.95; bottle.add(cap);

        // Label — the photo on a FRONT-FACING curved panel (not a 360° band, which
        // is what made it read as "a tiny bottle printed on the bottle").
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
          imageUrl,
          (tex) => {
            if (disposed) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            // Zoom in slightly so the label fills the panel rather than showing
            // the whole bottle photo with empty margins.
            tex.center.set(0.5, 0.5); tex.repeat.set(0.78, 0.62); tex.offset.set(0.11, 0.2);
            const arc = 2.1; // ~120° front panel, centered on +Z (faces camera)
            const labelGeo = new THREE.CylinderGeometry(1.012, 1.012, 1.6, 64, 1, true, -arc / 2, arc);
            const labelMat = new THREE.MeshStandardMaterial({
              map: tex, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.4,
            });
            const label = new THREE.Mesh(labelGeo, labelMat);
            label.position.y = 1.5;
            bottle.add(label);
          },
          undefined,
          () => { /* keep the bare bottle if the image fails */ },
        );

        bottle.position.y = -2.7;
        scene.add(bottle);

        // Soft contact shadow (radial-gradient canvas) so it sits on a surface.
        const shc = document.createElement('canvas'); shc.width = shc.height = 128;
        const sctx = shc.getContext('2d');
        const grad = sctx.createRadialGradient(64, 64, 6, 64, 64, 64);
        grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        sctx.fillStyle = grad; sctx.fillRect(0, 0, 128, 128);
        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(3.6, 3.6),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shc), transparent: true, depthWrite: false }),
        );
        shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.78; scene.add(shadow);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.minDistance = 9; controls.maxDistance = 18;
        controls.autoRotate = true; controls.autoRotateSpeed = 1.0;
        controls.target.set(0, 0, 0);
        controls.enableDamping = true;

        const animate = () => { frame = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
        animate();

        ro = new ResizeObserver(() => {
          const nw = mount.clientWidth;
          camera.aspect = nw / height; camera.updateProjectionMatrix(); renderer.setSize(nw, height);
        });
        ro.observe(mount);
      } catch (e) {
        setErr('3D preview failed to load.');
      }
    })();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      ro?.disconnect();
      controls?.dispose?.();
      if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
    };
  }, [imageUrl, type, height]);

  return (
    <div className="bottle3d" ref={mountRef} style={{ width: '100%', height }}>
      {err && <p className="bottle3d-err">{err}</p>}
    </div>
  );
}
