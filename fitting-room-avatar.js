/**
 * AURUM JEWELLERY — fitting-room-avatar.js
 * Virtual Atelier — 3D Jewellery Try-On
 */

/* ── Globals ─────────────────────────────────────────────── */
let scene, camera, renderer, avatarGroup, clock;
let isDragging = false, prevMouse = { x: 0, y: 0 };
let rotY = 0, rotX = 0.04, camZ = 6.8;
let currentGender = 'female';
let breathPhase = 0;
let currentSkinColor = 0xF0DFC0; // default fair
const outfitMeshes = { dress: null, necklace: null, earrings: null, bangles: null };
const texLoader = new THREE.TextureLoader();

/* ── Skin Tone Palette ───────────────────────────────────── */
const SKIN_TONES = {
    fair: { hex: '#F0DFC0', val: 0xF0DFC0, cloth: 0xE8D4B0 },
    light: { hex: '#DDB890', val: 0xDDB890, cloth: 0xCCA880 },
    medium: { hex: '#C08060', val: 0xC08060, cloth: 0xAF7050 },
    tan: { hex: '#A06040', val: 0xA06040, cloth: 0x8F5030 },
    dark: { hex: '#6B3820', val: 0x6B3820, cloth: 0x5A2810 },
    deep: { hex: '#3D1F10', val: 0x3D1F10, cloth: 0x2C1008 },
};

/* ── Dress Texture + Color Map ───────────────────────────── */
const DRESS_ASSETS = {
    'crimson-gown': { tex: 'assets/evening-gown.png', tint: 0x8B0000, type: 'gown' },
    'ivory-bridal': { tex: 'assets/couture-gown.png', tint: 0xF5F0E8, type: 'gown' },
    'noir-velvet': { tex: 'assets/evening-gown.png', tint: 0x1a1a2e, type: 'midi' },
    'midnight-tux': { tex: 'assets/tuxedo.png', tint: 0x0d1b4b, type: 'suit' },
    'rose-ethnic': { tex: 'assets/evening-gown.png', tint: 0xc0392b, type: 'midi' },
    'emerald-gown': { tex: 'assets/couture-gown.png', tint: 0x0d5016, type: 'gown' },
};

/* ── Body Profile (shared by body & dress for exact fit) ─── */
// Female body profile points (r, y) from floor up
// These EXACT values are reused for dress geometry to guarantee snug fit
const FEMALE_BODY = [
    { r: 0.060, y: 0.00 }, // ankle
    { r: 0.075, y: 0.15 }, // lower calf
    { r: 0.095, y: 0.40 }, // calf peak
    { r: 0.065, y: 0.60 }, // above ankle
    { r: 0.095, y: 0.65 }, // knee
    { r: 0.115, y: 0.90 }, // lower thigh
    { r: 0.130, y: 1.10 }, // upper thigh
    { r: 0.150, y: 1.22 }, // hip peak
    { r: 0.140, y: 1.34 }, // lower waist
    { r: 0.110, y: 1.52 }, // waist narrowest
    { r: 0.130, y: 1.70 }, // ribcage
    { r: 0.150, y: 1.90 }, // underbust
    { r: 0.160, y: 2.10 }, // bust
    { r: 0.150, y: 2.28 }, // upper chest
    { r: 0.130, y: 2.40 }, // clavicle
    { r: 0.090, y: 2.52 }, // neck base
    { r: 0.065, y: 2.68 }, // neck mid
    { r: 0.070, y: 2.80 }, // neck top
];

const MALE_BODY = [
    { r: 0.070, y: 0.00 }, // ankle
    { r: 0.085, y: 0.15 },
    { r: 0.100, y: 0.40 },
    { r: 0.075, y: 0.60 },
    { r: 0.105, y: 0.65 }, // knee
    { r: 0.135, y: 0.90 },
    { r: 0.155, y: 1.10 }, // upper thigh
    { r: 0.155, y: 1.22 }, // hip
    { r: 0.145, y: 1.38 },
    { r: 0.130, y: 1.52 }, // waist
    { r: 0.150, y: 1.70 },
    { r: 0.170, y: 1.90 },
    { r: 0.185, y: 2.10 }, // chest
    { r: 0.185, y: 2.28 },
    { r: 0.175, y: 2.40 }, // shoulder line
    { r: 0.100, y: 2.52 }, // neck base
    { r: 0.075, y: 2.70 },
    { r: 0.080, y: 2.82 }, // neck top
];

/* ── Init ────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', initAvatar);

function initAvatar() {
    const canvas = document.getElementById('avatarCanvas');
    if (!canvas || typeof THREE === 'undefined') return;
    const stage = canvas.parentElement;

    scene = new THREE.Scene();
    clock = new THREE.Clock();
    scene.fog = new THREE.FogExp2(0x050505, 0.045);

    camera = new THREE.PerspectiveCamera(48, stage.clientWidth / stage.clientHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    setupLights();
    setupEnvironment();

    avatarGroup = new THREE.Group();
    scene.add(avatarGroup);
    buildMannequin('female', currentSkinColor);

    setupControls(canvas);
    window.addEventListener('resize', onResize);

    document.getElementById('btnReset')?.addEventListener('click', resetCamera);
    document.getElementById('btnZoomIn')?.addEventListener('click', () => { camZ = Math.max(2.5, camZ - 0.5); });
    document.getElementById('btnZoomOut')?.addEventListener('click', () => { camZ = Math.min(9, camZ + 0.5); });
    document.getElementById('btnFemale')?.addEventListener('click', () => switchGender('female'));
    document.getElementById('btnMale')?.addEventListener('click', () => switchGender('male'));

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

/* ── Lights ─────────────────────────────────────────────── */
function setupLights() {
    scene.add(new THREE.AmbientLight(0x2a1840, 2.8));

    const key = new THREE.DirectionalLight(0xfff8f0, 5.0);
    key.position.set(2.5, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rimL = new THREE.PointLight(0xD4AF37, 5, 10);
    rimL.position.set(-4, 4, -3);
    scene.add(rimL);

    const rimR = new THREE.PointLight(0xFDFBF7, 4, 9);
    rimR.position.set(4, 3, -3);
    scene.add(rimR);

    const fill = new THREE.PointLight(0xfff0e0, 2, 8);
    fill.position.set(0, 1, 4.5);
    scene.add(fill);

    const top = new THREE.SpotLight(0xffffff, 3, 12, Math.PI / 7, 0.4);
    top.position.set(0, 9, 2);
    top.target.position.set(0, 2.8, 0);
    scene.add(top); scene.add(top.target);
}

/* ── Environment ─────────────────────────────────────────── */
function setupEnvironment() {
    // Glossy studio floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x080012, roughness: 0.2, metalness: 0.7, transparent: true, opacity: 0.8 });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.02, 64), floorMat);
    floor.position.y = -0.01; floor.receiveShadow = true;
    scene.add(floor);

    // Shadow blob under feet
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005;
    scene.add(shadow);

    // Dark backdrop
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshBasicMaterial({ color: 0x06060e }));
    bg.position.set(0, 3.5, -6);
    scene.add(bg);
}

/* ── MANNEQUIN BUILD ────────────────────────────────────── */
function buildMannequin(gender, skinVal) {
    while (avatarGroup.children.length) avatarGroup.remove(avatarGroup.children[0]);

    const isFemale = gender === 'female';
    const profile = isFemale ? FEMALE_BODY : MALE_BODY;

    const skinMat = makeSkinMat(skinVal);
    const darkMat = makeDarkMat(skinVal);

    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
        m.castShadow = true; avatarGroup.add(m); return m;
    };

    /* ── 1. BODY — single LatheGeometry from ankle to neck-top ── */
    const bodyPts = profile.map(p => new THREE.Vector2(p.r, p.y));
    const bodyGeo = new THREE.LatheGeometry(bodyPts, 40);
    add(bodyGeo, skinMat, 0, 0, 0);

    /* ── 2. HEAD — smooth egg mannequin head ── */
    // Elongated sphere, featureless mannequin look
    const headGeo = new THREE.SphereGeometry(0.195, 28, 22);
    headGeo.scale(0.88, 1.18, 0.9); // oval/egg shape
    const headY = isFemale ? 3.02 : 3.05;
    add(headGeo, skinMat, 0, headY, 0);

    /* ── 3. SHOULDERS (capped half-spheres) ── */
    const sw = isFemale ? 0.30 : 0.38;
    const shoulderY = isFemale ? 2.30 : 2.36;
    add(new THREE.SphereGeometry(isFemale ? 0.10 : 0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), skinMat, -sw, shoulderY, 0, 0, 0, 0);
    add(new THREE.SphereGeometry(isFemale ? 0.10 : 0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), skinMat, sw, shoulderY, 0, 0, 0, 0);

    /* ── 4. UPPER ARMS ── */
    const armW = isFemale ? 0.040 : 0.052;
    const armTopY = isFemale ? 2.22 : 2.28;
    const armBotY = isFemale ? 1.66 : 1.70;
    const armMidY = (armTopY + armBotY) / 2;
    const armLen = armTopY - armBotY;
    const armX = isFemale ? (sw + 0.095) : (sw + 0.110);
    add(new THREE.CylinderGeometry(armW, armW * 0.85, armLen, 12), skinMat, -armX, armMidY, 0.02, 0, 0, 0.08);
    add(new THREE.CylinderGeometry(armW, armW * 0.85, armLen, 12), skinMat, armX, armMidY, 0.02, 0, 0, -0.08);

    /* ── 5. ELBOWS ── */
    const elbowY = armBotY;
    add(new THREE.SphereGeometry(armW * 0.9, 10, 8), skinMat, -(armX + 0.02), elbowY, 0.02);
    add(new THREE.SphereGeometry(armW * 0.9, 10, 8), skinMat, (armX + 0.02), elbowY, 0.02);

    /* ── 6. FOREARMS ── */
    const faLen = isFemale ? 0.44 : 0.48;
    const faX = armX + 0.03;
    const faMidY = elbowY - faLen / 2;
    add(new THREE.CylinderGeometry(armW * 0.82, armW * 0.65, faLen, 12), skinMat, -(faX), faMidY, 0.03, 0, 0, -0.04);
    add(new THREE.CylinderGeometry(armW * 0.82, armW * 0.65, faLen, 12), skinMat, (faX), faMidY, 0.03, 0, 0, 0.04);

    /* ── 7. HANDS — flat paddle shape ── */
    const handY = elbowY - faLen;
    const handGeo = new THREE.BoxGeometry(0.10, 0.14, 0.045);
    add(handGeo, skinMat, -(faX), handY - 0.07, 0.03);
    add(handGeo, skinMat, (faX), handY - 0.07, 0.03);

    /* ── 8. FEET + HEELS ── */
    const footW = isFemale ? 0.075 : 0.090;
    const footMat = new THREE.MeshStandardMaterial({ color: isFemale ? 0x1a0808 : 0x080808, roughness: 0.35, metalness: 0.5 });
    const footGeo = new THREE.BoxGeometry(footW * 1.8, 0.04, 0.22);
    footGeo.translate(0, 0, 0.02);
    const legGap = isFemale ? 0.11 : 0.14;
    add(footGeo, footMat, -legGap, 0.02, 0.05);
    add(footGeo, footMat, legGap, 0.02, 0.05);

    if (isFemale) {
        // Stiletto heels
        const heelMat = new THREE.MeshStandardMaterial({ color: 0x0d0505, roughness: 0.2, metalness: 0.7 });
        add(new THREE.CylinderGeometry(0.016, 0.010, 0.14, 8), heelMat, -legGap, -0.03, -0.08);
        add(new THREE.CylinderGeometry(0.016, 0.010, 0.14, 8), heelMat, legGap, -0.03, -0.08);
    }

    /* ── 9. FEMALE BUST cups (subtle, mannequin style) ── */
    if (isFemale) {
        const bustMat = makeSkinMat(skinVal);
        add(new THREE.SphereGeometry(0.095, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), bustMat, -0.10, 2.05, 0.15, -0.35, 0, 0);
        add(new THREE.SphereGeometry(0.095, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), bustMat, 0.10, 2.05, 0.15, -0.35, 0, 0);
    }
}

/* ── Material Helpers ────────────────────────────────────── */
function makeSkinTex(col) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 512;
    const ctx = c.getContext('2d');
    const r = (col >> 16) & 0xff, g = (col >> 8) & 0xff, b = col & 0xff;
    const grd = ctx.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, `rgb(${Math.min(r + 30, 255)},${Math.min(g + 20, 255)},${Math.min(b + 10, 255)})`);
    grd.addColorStop(0.5, `rgb(${r},${g},${b})`);
    grd.addColorStop(1, `rgb(${Math.max(r - 20, 0)},${Math.max(g - 20, 0)},${Math.max(b - 20, 0)})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 600; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`;
        ctx.fillRect(Math.random() * 128, Math.random() * 512, 1, 1);
    }
    return new THREE.CanvasTexture(c);
}
function makeSkinMat(col) {
    const t = makeSkinTex(col);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.62, metalness: 0.02, bumpMap: t, bumpScale: 0.002 });
}
function makeDarkMat(col) {
    const r = (col >> 16) & 0xff, g = (col >> 8) & 0xff, b = col & 0xff;
    const darker = ((Math.max(r - 40, 0)) << 16) | ((Math.max(g - 40, 0)) << 8) | Math.max(b - 40, 0);
    return new THREE.MeshStandardMaterial({ color: darker, roughness: 0.7, metalness: 0.04 });
}

/* ── Skin Tone Switcher ──────────────────────────────────── */
function applySkinTone(val) {
    currentSkinColor = val;
    const savedItems = {};
    document.querySelectorAll('.fr-item.selected').forEach(el => { savedItems[el.dataset.type] = { ...el.dataset }; });
    Object.keys(outfitMeshes).forEach(k => { if (outfitMeshes[k]) { avatarGroup.remove(outfitMeshes[k]); outfitMeshes[k] = null; } });
    buildMannequin(currentGender, val);
    Object.entries(savedItems).forEach(([type, data]) => window.applyOutfit(type, data));
}
window.applySkinTone = applySkinTone;

/* ── Apply Outfit (Perfectly Fitted) ─────────────────────── */
window.applyOutfit = function (type, data) {
    if (!avatarGroup) return;

    const flash = document.getElementById('outfitFlash');
    if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 350); }

    if (outfitMeshes[type]) { avatarGroup.remove(outfitMeshes[type]); outfitMeshes[type] = null; }
    if (!data) return;

    const isFemale = currentGender === 'female';
    const profile = isFemale ? FEMALE_BODY : MALE_BODY;
    const asset = DRESS_ASSETS[data.id];

    if (type === 'dress') {
        const dressMeta = asset || { tint: 0x222222, type: 'gown' };
        const dressType = dressMeta.type || 'gown';

        // Load texture
        const tex = asset ? texLoader.load(asset.tex, () => renderer?.render(scene, camera)) : null;
        if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1.5); }

        const matProps = { roughness: 0.5, metalness: 0.04, side: THREE.DoubleSide, transparent: true, opacity: 0 };
        if (tex) matProps.map = tex;
        if (dressMeta.tint) matProps.color = new THREE.Color(dressMeta.tint);
        const dressMat = new THREE.MeshStandardMaterial(matProps);

        // ── Build dress profile that EXACTLY matches body ──
        let dressProfile = [];

        if (dressType === 'gown') {
            // Floor-length gown — tight at waist, bust, then flares at base
            dressProfile = profile.filter(p => p.y >= 0.0 && p.y <= 2.32).map(p => {
                let offset = 0.015;
                if (p.y < 0.5) offset = 0.06 + (0.5 - p.y) * 0.18; // skirt flare at bottom
                else if (p.y < 0.8) offset = 0.04;
                else if (p.y < 1.15) offset = 0.018; // thigh fitted
                else if (p.y <= 1.22) offset = 0.02; // hip
                else if (p.y < 1.55) offset = 0.015; // waist snug
                else offset = 0.018; // bodice
                return new THREE.Vector2(p.r + offset, p.y);
            });
        } else if (dressType === 'midi') {
            // Midi / bodycon — tight all over to knee
            const kneeY = 0.65;
            dressProfile = profile.filter(p => p.y >= kneeY && p.y <= 2.30).map(p => {
                const offset = p.y < 1.0 ? 0.012 : 0.014;
                return new THREE.Vector2(p.r + offset, p.y);
            });
            // Bottom hem (a tiny flare at knee)
            dressProfile.unshift(new THREE.Vector2(profile.find(p => p.y >= kneeY).r + 0.04, kneeY - 0.01));
        } else if (dressType === 'suit') {
            // Suit / tuxedo — blazer shape, broader shoulders
            dressProfile = profile.filter(p => p.y >= 0.0 && p.y <= 2.38).map(p => {
                let offset = 0.015;
                if (p.y < 0.2) offset = 0.016; // trouser ankle
                else if (p.y < 1.15) offset = 0.018; // trouser fitted
                else if (p.y < 1.55) offset = 0.020; // jacket waist
                else offset = 0.028; // jacket/chest puff
                return new THREE.Vector2(p.r + offset, p.y);
            });
            // Suit has wider shoulder cap
            dressProfile.push(new THREE.Vector2(0.20, 2.42));
        }

        // Close bottom of dress if not floor length
        if (dressProfile.length > 0 && dressProfile[0].y > 0.1) {
            dressProfile.unshift(new THREE.Vector2(0, dressProfile[0].y));
        }

        const dressGeo = new THREE.LatheGeometry(dressProfile, 40);
        const dressMesh = new THREE.Mesh(dressGeo, dressMat);
        dressMesh.castShadow = true;
        avatarGroup.add(dressMesh);
        outfitMeshes.dress = dressMesh;
        fadeIn(dressMesh);

        // Suit extras
        if (dressType === 'suit') {
            // White shirt collar
            const collarMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.4 });
            const collarGeo = new THREE.CylinderGeometry(0.075, 0.095, 0.18, 16);
            const collar = new THREE.Mesh(collarGeo, collarMat);
            collar.position.set(0, 2.50, 0.02);
            avatarGroup.add(collar);
            // Tie
            const tieMat = new THREE.MeshStandardMaterial({ color: 0x0d1b4b, roughness: 0.5, metalness: 0.1 });
            const tieGeo = new THREE.BoxGeometry(0.04, 0.42, 0.012);
            const tie = new THREE.Mesh(tieGeo, tieMat);
            tie.position.set(0, 2.24, 0.18);
            avatarGroup.add(tie);
        }

    } else if (type === 'necklace') {
        const colMap = { 'gold-necklace': 0xFFD700, 'ruby-necklace': 0x9B2335, 'pearl-earrings': 0xF5EDD6, 'sapphire-set': 0x1a4aaa };
        const col = colMap[data.id] || 0xFFD700;
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.08, metalness: 0.95, transparent: true, opacity: 0 });
        const group = new THREE.Group();
        const neckY = isFemale ? 2.58 : 2.56;
        const chain = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.01, 10, 44), mat);
        chain.position.set(0, neckY, 0.09); chain.rotation.x = Math.PI / 2.2;
        const pend = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), mat);
        pend.position.set(0, neckY - 0.10, 0.19);
        group.add(chain, pend);
        avatarGroup.add(group); outfitMeshes.necklace = group;
        fadeIn(group);

    } else if (type === 'earrings') {
        const colMap = { 'pearl-earrings': 0xF8F0DC, 'diamond-drops': 0xd0f8ff };
        const col = colMap[data.id] || 0xFFD700;
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.05, metalness: 0.92, transparent: true, opacity: 0 });
        const group = new THREE.Group();
        const earY = isFemale ? 2.98 : 3.01;
        [-0.21, 0.21].forEach(x => {
            const stud = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mat.clone());
            stud.position.set(x, earY, 0);
            const drop = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), mat.clone());
            drop.position.set(x, earY - 0.065, 0);
            const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 6), mat.clone());
            wire.position.set(x, earY - 0.030, 0);
            group.add(stud, drop, wire);
        });
        avatarGroup.add(group); outfitMeshes.earrings = group; fadeIn(group);

    } else if (type === 'bangles') {
        const col = data.id === 'gold-bangles' ? 0xFFD700 : 0xDAA520;
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.07, metalness: 0.95, transparent: true, opacity: 0 });
        const group = new THREE.Group();
        const sw = isFemale ? 0.30 : 0.38;
        const wx = sw + 0.135 + 0.03;
        const handY = isFemale ? 1.22 : 1.24;
        for (let i = 0; i < 4; i++) {
            const b = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.011, 10, 32), mat.clone());
            b.position.set(wx, handY - i * 0.024, 0.025);
            b.rotation.x = Math.PI / 2;
            group.add(b);
        }
        avatarGroup.add(group); outfitMeshes.bangles = group; fadeIn(group);
    }
};

function fadeIn(obj) {
    let p = 0;
    const iv = setInterval(() => {
        p += 0.08;
        obj.traverse(c => { if (c.isMesh && c.material) c.material.opacity = Math.min(p, 1); });
        if (p >= 1) { clearInterval(iv); obj.traverse(c => { if (c.isMesh && c.material) c.material.transparent = false; }); }
    }, 16);
}

window.clearOutfitSlot = function (type) {
    if (outfitMeshes[type]) { avatarGroup.remove(outfitMeshes[type]); outfitMeshes[type] = null; }
};

/* ── Gender Switch ───────────────────────────────────────── */
function switchGender(gender) {
    if (gender === currentGender) return;
    currentGender = gender;
    const flash = document.getElementById('outfitFlash');
    if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 500); }
    const saved = {};
    document.querySelectorAll('.fr-item.selected').forEach(el => { saved[el.dataset.type] = { ...el.dataset }; });
    Object.keys(outfitMeshes).forEach(k => { if (outfitMeshes[k]) { avatarGroup.remove(outfitMeshes[k]); outfitMeshes[k] = null; } });
    buildMannequin(gender, currentSkinColor);
    Object.entries(saved).forEach(([type, d]) => window.applyOutfit(type, d));
    document.getElementById('summaryAvatar').innerHTML = `<span class="fr-summary-icon">${gender === 'female' ? '♀' : '♂'}</span> ${gender.charAt(0).toUpperCase() + gender.slice(1)}`;
    document.querySelectorAll('.fr-avatar-btn').forEach(b => b.classList.toggle('active', b.dataset.gender === gender));
}

/* ── Camera Controls ─────────────────────────────────────── */
function setupControls(canvas) {
    canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        rotY += (e.clientX - prevMouse.x) * 0.008;
        rotX = Math.max(-0.35, Math.min(0.5, rotX + (e.clientY - prevMouse.y) * 0.005));
        prevMouse = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('wheel', e => { e.preventDefault(); camZ = Math.max(2.5, Math.min(9, camZ + e.deltaY * 0.006)); }, { passive: false });
    let lt = null, pd = 0;
    canvas.addEventListener('touchstart', e => { if (e.touches.length === 1) { isDragging = true; lt = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } if (e.touches.length === 2) { pd = tDist(e); isDragging = false; } });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); if (e.touches.length === 1 && isDragging && lt) { rotY += (e.touches[0].clientX - lt.x) * 0.010; rotX = Math.max(-0.35, Math.min(0.5, rotX + (e.touches[0].clientY - lt.y) * 0.006)); lt = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } if (e.touches.length === 2) { const d = tDist(e); camZ = Math.max(2.5, Math.min(9, camZ - (d - pd) * 0.015)); pd = d; } }, { passive: false });
    canvas.addEventListener('touchend', () => { isDragging = false; lt = null; });
}
const tDist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
function resetCamera() { rotY = 0; rotX = 0.04; camZ = 6.8; }

/* ── Animate ─────────────────────────────────────────────── */
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    breathPhase += dt * 1.1;
    if (avatarGroup) {
        avatarGroup.scale.y = 1 + Math.sin(breathPhase) * 0.0035;
        avatarGroup.scale.x = 1 - Math.sin(breathPhase) * 0.0015;
        avatarGroup.rotation.z = Math.sin(breathPhase * 0.4) * 0.003;
    }
    const r = Math.sin(Math.PI / 2 - rotX);
    camera.position.set(Math.sin(rotY) * r * camZ, Math.cos(Math.PI / 2 - rotX) * camZ + 1.4, Math.cos(rotY) * r * camZ);
    camera.lookAt(0, 1.4, 0);
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
