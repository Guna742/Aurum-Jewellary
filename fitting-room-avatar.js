/**
 * AURUM JEWELLERY — fitting-room-avatar.js
 * Virtual Atelier — 3D Jewelry Bust Mannequin Try-On
 */

/* ── Globals ─────────────────────────────────────────────── */
let scene, camera, renderer, bustGroup, clock;
let isDragging = false, prevMouse = { x: 0, y: 0 };
let rotY = 0.15, rotX = -0.05, camZ = 4.2;
let breathPhase = 0;
let currentSkinColor = 0xEDE0D0; // default fair/warm white (velvet tone)
const outfitMeshes = { necklace: null, earrings: null, bangles: null };
const texLoader = new THREE.TextureLoader();

/* ── Skin Tone Palette ───────────────────────────────────── */
const SKIN_TONES = {
    fair:   { hex: '#F0DFC0', val: 0xEDE0D0, cloth: 0xE8D4B0 },
    light:  { hex: '#DDB890', val: 0xD4A882, cloth: 0xCCA880 },
    medium: { hex: '#C08060', val: 0xBB7A55, cloth: 0xAF7050 },
    tan:    { hex: '#A06040', val: 0x9A5E38, cloth: 0x8F5030 },
    dark:   { hex: '#6B3820', val: 0x6B3820, cloth: 0x5A2810 },
    deep:   { hex: '#3D1F10', val: 0x3D1F10, cloth: 0x2C1008 },
};

/* ── Init ────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', initAvatar);

function initAvatar() {
    const canvas = document.getElementById('avatarCanvas');
    if (!canvas || typeof THREE === 'undefined') return;
    const stage = canvas.parentElement;

    scene = new THREE.Scene();
    clock = new THREE.Clock();
    scene.fog = new THREE.FogExp2(0x020804, 0.04);

    camera = new THREE.PerspectiveCamera(42, stage.clientWidth / stage.clientHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    setupLights();
    setupEnvironment();

    bustGroup = new THREE.Group();
    scene.add(bustGroup);
    loadAvatarModel(currentSkinColor);

    setupControls(canvas);
    window.addEventListener('resize', onResize);

    document.getElementById('btnReset')?.addEventListener('click', resetCamera);
    document.getElementById('btnZoomIn')?.addEventListener('click',  () => { camZ = Math.max(2.0, camZ - 0.4); });
    document.getElementById('btnZoomOut')?.addEventListener('click', () => { camZ = Math.min(7.0, camZ + 0.4); });

    // Skin tone swatches
    document.querySelectorAll('.fr-skin-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            document.querySelectorAll('.fr-skin-swatch').forEach(s => s.classList.remove('active'));
            sw.classList.add('active');
            const tone = SKIN_TONES[sw.dataset.tone];
            if (tone) applySkinTone(tone.val);
        });
    });

    animate();
    setTimeout(() => document.getElementById('canvasHint')?.classList.add('hidden'), 5000);
}

/* ── Lights (Cinematic Soft-Box) ───────────────────────── */
function setupLights() {
    scene.add(new THREE.AmbientLight(0x1a2520, 2.5));

    // Forehead/Cheek Highlight (Main Soft-Box)
    const key = new THREE.DirectionalLight(0xfffcf0, 6.0);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    // Rim/Hair Shine
    const rimL = new THREE.PointLight(0xD4AF37, 8, 12);
    rimL.position.set(-4.5, 4.5, -3);
    scene.add(rimL);

    const rimR = new THREE.PointLight(0xFDFBF7, 6, 12);
    rimR.position.set(4.5, 4.0, -3);
    scene.add(rimR);

    const fill = new THREE.PointLight(0xfff0e0, 2.5, 6);
    fill.position.set(0, 0.5, 3.5);
    scene.add(fill);

    const top = new THREE.SpotLight(0xffffff, 4.5, 12, Math.PI / 6, 0.35);
    top.position.set(0, 8, 1.8);
    top.target.position.set(0, 1.8, 0);
    scene.add(top); scene.add(top.target);
}

/* ── Environment ─────────────────────────────────────────── */
function setupEnvironment() {
    // Glossy studio floor pad
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x020a05, roughness: 0.15, metalness: 0.75,
        transparent: true, opacity: 0.85
    });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.02, 64), floorMat);
    floor.position.y = -0.01; floor.receiveShadow = true;
    scene.add(floor);

    // Shadow blob under base
    const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.38, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 })
    );
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005;
    scene.add(shadow);

    // Dark showroom backdrop
    const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 10),
        new THREE.MeshBasicMaterial({ color: 0x020805 })
    );
    bg.position.set(0, 2.0, -5);
    scene.add(bg);

    // Subtle vignette gradient rings on floor
    for (let i = 1; i <= 3; i++) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(i * 0.6, i * 0.6 + 0.04, 64),
            new THREE.MeshBasicMaterial({ color: 0xD4AF37, transparent: true, opacity: 0.04 / i, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.006;
        scene.add(ring);
    }
}

/* ── AVATAR MANNEQUIN BUILD ────────────────────────────────── */
/**
 * Loads a realistic female bust model (GLB) to serve as the avatar mannequin.
 * Replaces the procedural generated primitives.
 */
function loadAvatarModel(skinVal) {
    while (bustGroup.children.length) bustGroup.remove(bustGroup.children[0]);

    if (!window.THREE.GLTFLoader) {
        console.warn('GLTFLoader not available. Ensure it is included in the HTML.');
        buildFallbackMannequin(skinVal);
        return;
    }

    const loader = new THREE.GLTFLoader();

    // Load the realistic user-provided .glb avatar
    loader.load('assets/avatar.glb', (gltf) => {
        const model = gltf.scene;

        // Scale and shift the model to match original manual bust dimension scale
        // These can be tweaked as needed depending on bounding limits
        model.scale.set(1.4, 1.4, 1.4);
        model.position.set(0, -0.2, 0); 
        
        // Improve shadow/materials and blend skin tone dynamically
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material) {
                    const matName = child.material.name ? child.material.name.toLowerCase() : '';
                    
                    // Simple heuristic to avoid coloring eyes or hair
                    if (!matName.includes('hair') && !matName.includes('eye') && !matName.includes('lash') && !matName.includes('cornea') && !matName.includes('brow')) {
                        // Blend user-selected skin tone onto the map or directly to mesh color
                        if (child.material.color) {
                            child.material.color.setHex(skinVal);
                        }
                        child.material.roughness = Math.max(0.35, child.material.roughness !== undefined ? child.material.roughness : 0);
                    }
                }
            }
        });

        bustGroup.add(model);
        
        // Hide canvas text hint sooner since asset took time to load
        document.getElementById('canvasHint')?.classList.add('hidden');
    }, undefined, (error) => {
        console.warn('Could not load assets/avatar.glb. Fallback to basic bust shape.', error);
        buildFallbackMannequin(skinVal);
    });
}

// Minimal fallback mannequin
function buildFallbackMannequin(skinVal) {
    const mat = makeBustMat(skinVal);
    const bustGeo = new THREE.CylinderGeometry(0.25, 0.45, 0.8, 64);
    const mesh = new THREE.Mesh(bustGeo, mat);
    mesh.position.y = 0.5;
    mesh.castShadow = true;
    bustGroup.add(mesh);
    
    // Base
    const baseGeo = new THREE.BoxGeometry(0.8, 0.065, 0.45);
    const darkMat = makeDarkBustMat(skinVal);
    const base = new THREE.Mesh(baseGeo, darkMat);
    base.position.set(0, -0.033, 0.05);
    bustGroup.add(base);
}

/* ── Material Helpers ────────────────────────────────────── */
function makeBustTex(col) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512; // Higher res
    const ctx = c.getContext('2d');
    const r = (col >> 16) & 0xff, g = (col >> 8) & 0xff, b = col & 0xff;

    // Skin base with Warm Subsurface undertones
    const grd = ctx.createRadialGradient(256, 128, 10, 256, 256, 400);
    grd.addColorStop(0, `rgb(${Math.min(r+40,255)},${Math.min(g+30,255)},${Math.min(b+20,255)})`);
    grd.addColorStop(0.5, `rgb(${r},${g},${b})`);
    grd.addColorStop(1, `rgb(${Math.max(r-35,0)},${Math.max(g-30,0)},${Math.max(b-25,0)})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);

    // Skin pore noise (Subtle)
    for (let i = 0; i < 4000; i++) {
        const grain = Math.random() * 0.05;
        ctx.fillStyle = `rgba(255,255,255,${grain})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
    }

    // Specular Highlight map (Oily zones)
    const spec = ctx.createLinearGradient(0, 0, 512, 512);
    spec.addColorStop(0, "rgba(255,255,255,0.0)");
    spec.addColorStop(0.5, "rgba(255,255,255,0.15)");
    spec.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, 512, 512);

    return new THREE.CanvasTexture(c);
}

function makeBustMat(col) {
    const t = makeBustTex(col);
    return new THREE.MeshPhysicalMaterial({
        map: t,
        roughness: 0.38,
        metalness: 0.02,
        clearcoat: 0.52,
        clearcoatRoughness: 0.22,
        sheen: 0.3,
        sheenRoughness: 0.5,
        sheenColor: 0xffd0b0,
        bumpMap: t,
        bumpScale: 0.001
    });
}

function makeDarkBustMat(col) {
    const r = (col >> 16) & 0xff, g = (col >> 8) & 0xff, b = col & 0xff;
    const darker = (Math.max(r-55,0) << 16) | (Math.max(g-50,0) << 8) | Math.max(b-40,0);
    return new THREE.MeshStandardMaterial({ color: darker, roughness: 0.65, metalness: 0.06 });
}

/* ── Skin Tone Switcher ──────────────────────────────────── */
function applySkinTone(val) {
    currentSkinColor = val;
    // Save currently selected items
    const savedItems = {};
    document.querySelectorAll('.fr-item.selected').forEach(el => {
        savedItems[el.dataset.type] = { ...el.dataset };
    });
    // Clear jewelry from scene
    Object.keys(outfitMeshes).forEach(k => {
        if (outfitMeshes[k]) { bustGroup.remove(outfitMeshes[k]); outfitMeshes[k] = null; }
    });
    // Rebuild bust with new tone
    loadAvatarModel(val);
    // Reapply jewelry
    Object.entries(savedItems).forEach(([type, data]) => window.applyOutfit(type, data));
}
window.applySkinTone = applySkinTone;

/* ── Apply Outfit (Jewelry on Bust) ─────────────────────── */
window.applyOutfit = function (type, data) {
    if (!bustGroup) return;

    const flash = document.getElementById('outfitFlash');
    if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 350); }

    if (outfitMeshes[type]) { bustGroup.remove(outfitMeshes[type]); outfitMeshes[type] = null; }
    if (!data) return;

    if (type === 'necklace') {
        const colMap = {
            'gold-necklace':  { chain: 0xFFD700, pend: 0xFFD700, pendType: 'diamond' },
            'ruby-necklace':  { chain: 0xD4AF37, pend: 0x9B2335, pendType: 'drop' },
            'pearl-earrings': { chain: 0xC0B090, pend: 0xF5EDD6, pendType: 'pearl' },
            'sapphire-set':   { chain: 0xD4AF37, pend: 0x1a4aaa, pendType: 'gem' },
        };
        const style = colMap[data.id] || { chain: 0xFFD700, pend: 0xFFD700, pendType: 'diamond' };

        const chainMat = new THREE.MeshStandardMaterial({
            color: style.chain, roughness: 0.06, metalness: 0.97, transparent: true, opacity: 0
        });
        const pendMat = new THREE.MeshStandardMaterial({
            color: style.pend, roughness: 0.04, metalness: 0.95, transparent: true, opacity: 0
        });

        const group = new THREE.Group();

        /* ── Necklace chain — CatmullRomCurve3 draping the bust neckline ── */
        // Points follow the collarbone/decollete of the bust in 3D space
        // The bust sits centered at x=0, necklace sits at y≈1.05 (upper chest / collar-bone)
        const neckY = 1.02;      // vertical position on the bust
        const neckR = 0.18;      // radius of chain curve
        const sag   = 0.068;     // how much it sags forward in the center

        const chainPoints = [];
        const segments = 36;
        for (let i = 0; i <= segments; i++) {
            // angle from 180° to 360° (front semicircle, left to right)
            const a = Math.PI + (i / segments) * Math.PI;
            const x = Math.sin(a) * neckR;
            const z = Math.cos(a) * neckR * 0.55 + 0.08; // flatten & push forward
            // gentle catenary sag — most at center
            const sagAmount = sag * Math.sin(i / segments * Math.PI);
            const y = neckY - sagAmount * 0.5;
            chainPoints.push(new THREE.Vector3(x, y, z));
        }

        const curve = new THREE.CatmullRomCurve3(chainPoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 60, 0.006, 8, false);
        const chainMesh = new THREE.Mesh(tubeGeo, chainMat);
        group.add(chainMesh);

        // Chain links as small torus beads for realism
        const linkCount = 18;
        for (let i = 0; i <= linkCount; i++) {
            const t = i / linkCount;
            const pt = curve.getPointAt(t);
            const tang = curve.getTangentAt(t);
            const linkGeo = new THREE.TorusGeometry(0.0065, 0.0025, 6, 10);
            const link = new THREE.Mesh(linkGeo, chainMat.clone());
            link.position.copy(pt);
            // Orient link perpendicular to chain direction
            link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tang);
            group.add(link);
        }

        /* ── Pendant ── */
        const pendCenterPt = curve.getPointAt(0.5); // center bottom point
        pendCenterPt.y -= 0.015;  // drop slightly below the chain center

        if (style.pendType === 'diamond') {
            // Classic diamond solitaire pendant
            const diamondGeo = new THREE.OctahedronGeometry(0.030, 0);
            diamondGeo.scale(0.75, 1.35, 0.55);
            const diamond = new THREE.Mesh(diamondGeo, pendMat);
            diamond.position.copy(pendCenterPt);
            diamond.position.y -= 0.035;
            diamond.position.z += 0.01;
            diamond.rotation.set(0.1, 0.4, 0);
            group.add(diamond);

            // Tiny bail (connector)
            const bailGeo = new THREE.TorusGeometry(0.010, 0.003, 6, 12, Math.PI);
            const bail = new THREE.Mesh(bailGeo, chainMat.clone());
            bail.position.copy(pendCenterPt);
            bail.position.y -= 0.006;
            bail.position.z += 0.008;
            group.add(bail);

        } else if (style.pendType === 'drop') {
            // Ruby teardrop
            const dropGeo = new THREE.SphereGeometry(0.022, 12, 10);
            dropGeo.scale(0.8, 1.4, 0.7);
            const drop = new THREE.Mesh(dropGeo, pendMat);
            drop.position.copy(pendCenterPt);
            drop.position.y -= 0.04;
            drop.position.z += 0.012;
            group.add(drop);
            // Choker-style additional arc beads near back
            for (let side = -1; side <= 1; side += 2) {
                const bead = new THREE.Mesh(new THREE.SphereGeometry(0.010, 8, 6), pendMat.clone());
                bead.position.set(side * 0.10, neckY + 0.01, 0.05);
                group.add(bead);
            }

        } else if (style.pendType === 'pearl') {
            // Pearl drop
            const pearlGeo = new THREE.SphereGeometry(0.026, 14, 12);
            const pearl = new THREE.Mesh(pearlGeo, new THREE.MeshStandardMaterial({
                color: 0xF8F0DC, roughness: 0.18, metalness: 0.25,
                transparent: true, opacity: 0
            }));
            pearl.position.copy(pendCenterPt);
            pearl.position.y -= 0.040;
            pearl.position.z += 0.012;
            group.add(pearl);

        } else if (style.pendType === 'gem') {
            // Sapphire faceted gem
            const gemGeo = new THREE.OctahedronGeometry(0.026, 1);
            gemGeo.scale(0.9, 1.0, 0.65);
            const gem = new THREE.Mesh(gemGeo, pendMat);
            gem.position.copy(pendCenterPt);
            gem.position.y -= 0.035;
            gem.position.z += 0.012;
            group.add(gem);
        }

        bustGroup.add(group);
        outfitMeshes.necklace = group;
        fadeIn(group);

    } else if (type === 'earrings') {
        const colMap = {
            'pearl-earrings': 0xF8F0DC,
            'diamond-drops':  0xd0f8ff,
        };
        const col = colMap[data.id] || 0xFFD700;
        const mat = new THREE.MeshStandardMaterial({
            color: col, roughness: 0.05, metalness: 0.92, transparent: true, opacity: 0
        });
        const group = new THREE.Group();
        // Exact earring position on refined anatomy
        const earY = 1.79;    // Optimized ear lob height
        const earX = 0.245;   // Exact side width
        const earZ = 0.03;    // Alignment with ear geometry
        [-earX, earX].forEach(side => {
            const stud = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mat.clone());
            stud.position.set(side, earY, earZ);
            const drop = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat.clone());
            drop.position.set(side, earY - 0.08, earZ);
            const wire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.002, 0.002, 0.05, 6),
                mat.clone()
            );
            wire.position.set(side, earY - 0.04, earZ);
            group.add(stud, drop, wire);
        });
        bustGroup.add(group);
        outfitMeshes.earrings = group;
        fadeIn(group);
    }
};

function fadeIn(obj) {
    let p = 0;
    const iv = setInterval(() => {
        p += 0.08;
        obj.traverse(c => {
            if (c.isMesh && c.material) c.material.opacity = Math.min(p, 1);
        });
        if (p >= 1) {
            clearInterval(iv);
            obj.traverse(c => {
                if (c.isMesh && c.material) c.material.transparent = false;
            });
        }
    }, 16);
}

window.clearOutfitSlot = function (type) {
    if (outfitMeshes[type]) { bustGroup.remove(outfitMeshes[type]); outfitMeshes[type] = null; }
};

/* ── Camera Controls ─────────────────────────────────────── */
function setupControls(canvas) {
    canvas.addEventListener('mousedown', e => {
        isDragging = true; prevMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        rotY += (e.clientX - prevMouse.x) * 0.008;
        rotX = Math.max(-0.45, Math.min(0.55, rotX + (e.clientY - prevMouse.y) * 0.005));
        prevMouse = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        camZ = Math.max(2.0, Math.min(7.0, camZ + e.deltaY * 0.006));
    }, { passive: false });

    let lt = null, pd = 0;
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { isDragging = true; lt = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
        if (e.touches.length === 2) { pd = tDist(e); isDragging = false; }
    });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging && lt) {
            rotY += (e.touches[0].clientX - lt.x) * 0.010;
            rotX = Math.max(-0.45, Math.min(0.55, rotX + (e.touches[0].clientY - lt.y) * 0.006));
            lt = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.touches.length === 2) {
            const d = tDist(e);
            camZ = Math.max(2.0, Math.min(7.0, camZ - (d - pd) * 0.015));
            pd = d;
        }
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isDragging = false; lt = null; });
}

const tDist = e => Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY
);

function resetCamera() { rotY = 0.15; rotX = -0.05; camZ = 4.2; }

/* ── Animate ─────────────────────────────────────────────── */
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    breathPhase += dt * 0.7;

    // Gentle float / sway
    if (bustGroup) {
        bustGroup.position.y = Math.sin(breathPhase) * 0.004;
        bustGroup.rotation.z = Math.sin(breathPhase * 0.5) * 0.002;
    }

    // Camera orbit
    const r = Math.sin(Math.PI / 2 - rotX);
    camera.position.set(
        Math.sin(rotY) * r * camZ,
        Math.cos(Math.PI / 2 - rotX) * camZ + 1.2,
        Math.cos(rotY) * r * camZ
    );
    // Look at center of avatar (neck/face area)
    camera.lookAt(0, 1.3, 0);
    renderer.render(scene, camera);
}

/* ── Resize ──────────────────────────────────────────────── */
function onResize() {
    const stage = document.getElementById('avatarCanvas')?.parentElement;
    if (!stage || !renderer) return;
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
}
