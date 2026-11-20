import * as THREE from './lib/three.module.js';
import { PAINT, sign, toTex, canvas, shade, FONT } from './paint.js';
import { drawBean, drawShadow, amygdalaSide, catSide, drawFx, drawBubble, INK } from './toon.js';
import { FRAMES, HQX, H, BED, HQ, SHOTS, camAt, dofAt, lightFor, worldAt, actorsAt, fxAt, shotAt, CAL, MUSC, calCells, lampPos, DESIGNS } from './story.js';
import { q, M } from './motion.js';

const W = 1080, Hh = 1920;
const cv = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, Hh, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / Hh, 0.08, 1500);
scene.fog = new THREE.Fog(0x000000, 60, 300);

// ---------- materials ----------
const grad = new THREE.DataTexture(new Uint8Array([90, 255]), 2, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const texCache = {};
const ptex = (name, fn, rep = [1, 1]) => { const k = name; if (!texCache[k]) texCache[k] = toTex(fn()); const t = texCache[k].clone(); t.repeat.set(rep[0], rep[1]); t.needsUpdate = true; return t; };
const toon = (color, map = null, o = {}) => new THREE.MeshToonMaterial({ color, map, gradientMap: grad, ...o });

// box with world-scaled UVs (constant texel density); s = metres per texture repeat
const boxGeo = (w, h, d, s = 1) => {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face++) for (let i = 0; i < 4; i++) { const k = face * 4 + i; uv.setXY(k, uv.getX(k) * dims[face][0] / s, uv.getY(k) * dims[face][1] / s); }
  return g;
};
const mesh = (geo, mat, pos = [0, 0, 0], o = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos);
  m.castShadow = o.cast ?? true; m.receiveShadow = o.recv ?? true;
  if (o.rot) m.rotation.set(...o.rot); if (o.scale) m.scale.set(...o.scale);
  if (o.parent) o.parent.add(m); else scene.add(m);
  return m;
};
const box = (w, h, d, mat, pos, o = {}) => mesh(boxGeo(w, h, d, o.s || 1), mat, pos, o);
const cyl = (r0, r1, h, mat, pos, o = {}) => mesh(new THREE.CylinderGeometry(r0, r1, h, o.seg || 24), mat, pos, o);
const sph = (r, mat, pos, o = {}) => mesh(new THREE.SphereGeometry(r, 24, 16), mat, pos, o);
const plane = (w, h, mat, pos, o = {}) => mesh(new THREE.PlaneGeometry(w, h), mat, pos, { cast: false, ...o });
const signMesh = (cvs, w, h, pos, o = {}) => {
  const t = toTex(cvs); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const m = plane(w, h, o.basic ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : toon(0xffffff, t), pos, o);
  m.userData.tex = t; return m;
};

// ---------- sky ----------
const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, hor; varying vec3 vP; void main(){ float y = max(vP.y, 0.); gl_FragColor = vec4(mix(hor, top, pow(y,.55)), 1.); }',
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMat); sky.userData.nd = 'hide'; sky.renderOrder = -10; scene.add(sky);

// ---------- lights ----------
const sun = new THREE.DirectionalLight(0xffffff, 2); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
const lamp = new THREE.PointLight(0xffb070, 3, 9, 2); lamp.position.set(-0.95, 1.05, -2.2); scene.add(lamp);
const alarmLight = new THREE.PointLight(0xff2a1a, 0, 30, 1.2); alarmLight.position.set(HQX, 4.5, 1); scene.add(alarmLight);
const purpleLight = new THREE.PointLight(0xa070ff, 0, 12, 1.5); purpleLight.position.set(0.4, 2.6, -0.8); scene.add(purpleLight);

// ================= BEDROOM =================
const bedroom = {};
{
  const wood = toon(0xffffff, ptex('wood', () => PAINT.wood('#8a5a3a'), [1, 1]));
  const floorT = ptex('woodf', () => PAINT.wood('#6e4a34')); floorT.repeat.set(5, 5);
  plane(7, 7, toon(0xffffff, floorT), [0, 0, 0.3], { rot: [-Math.PI / 2, 0, 0] });
  const wp = ptex('wallp', () => PAINT.wallpaper('#34407a', '#435092'));
  wp.repeat.set(6, 2.8);
  const wallM = toon(0xffffff, wp);
  box(6.2, 2.9, 0.12, wallM, [0, 1.45, -2.66], { cast: false });
  const wpL = wp.clone(); wpL.repeat.set(6, 2.8); wpL.needsUpdate = true;
  box(0.12, 2.9, 6.4, toon(0xffffff, wpL), [-2.66, 1.45, 0.4], { cast: false });
  box(0.12, 2.9, 6.4, toon(0xffffff, wpL), [2.95, 1.45, 0.4], { cast: false });
  // skirting boards
  const skirt = toon('#e8dcc8');
  box(6.2, 0.14, 0.04, skirt, [0, 0.07, -2.59], { cast: false }); box(0.04, 0.14, 6.4, skirt, [-2.59, 0.07, 0.4], { cast: false });
  // window (back wall, right)
  const nightCv = canvas(512, 512), g = nightCv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#0a1236'); gr.addColorStop(1, '#2a3a7a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,230,${.4 + Math.random() * .6})`; g.beginPath(); g.arc(Math.random() * 512, Math.random() * 380, 1 + Math.random() * 2.2, 0, 7); g.fill(); }
  g.save(); g.translate(330, 150); g.scale(.55, .55); g.translate(-256, -256); drawFx(g, 'moon', 0); g.restore();
  g.fillStyle = '#121a3e'; for (let i = 0; i < 9; i++) { const x = i * 60 - 10, h = 60 + (i * 37 % 90); g.fillRect(x, 512 - h, 52, h); g.fillStyle = '#ffd77a'; if (i % 2) g.fillRect(x + 18, 512 - h + 20, 10, 12); g.fillStyle = '#121a3e'; }
  signMesh(nightCv, 1.1, 1.1, [1.6, 1.7, -2.595], { basic: true, recv: false });
  const frameM = toon('#efe6d6');
  box(1.26, 0.08, 0.1, frameM, [1.6, 2.27, -2.56]); box(1.26, 0.08, 0.1, frameM, [1.6, 1.13, -2.56]);
  box(0.08, 1.2, 0.1, frameM, [0.99, 1.7, -2.56]); box(0.08, 1.2, 0.1, frameM, [2.21, 1.7, -2.56]);
  box(0.05, 1.12, 0.06, frameM, [1.6, 1.7, -2.56]); box(1.16, 0.05, 0.06, frameM, [1.6, 1.7, -2.56]);
  box(1.4, 0.06, 0.2, frameM, [1.6, 1.08, -2.5]);
  // curtains (waving)
  const curtM = toon('#8a3e5a', null, { side: THREE.DoubleSide });
  bedroom.curtains = [];
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.42, 1.65, 6, 12);
    const m = mesh(geo, curtM, [1.6 + s * 0.78, 1.55, -2.5], { cast: false });
    m.userData.base = geo.attributes.position.array.slice(); m.userData.s = s; bedroom.curtains.push(m);
  }
  box(1.9, 0.05, 0.05, toon('#c9a46a'), [1.6, 2.4, -2.5]);
  // bed
  const bedWood = toon(0xffffff, ptex('woodb', () => PAINT.wood('#9a6440')));
  box(1.56, 0.32, 2.3, bedWood, [0.3, 0.19, -1.35], { s: .8 });
  box(1.52, 0.26, 2.2, toon('#f0eef6', ptex('sheet', PAINT.sheet)), [0.3, 0.47, -1.37]);
  box(1.66, 1.25, 0.1, bedWood, [0.3, 0.625, -2.52], { s: .8 });
  cyl(0.83, 0.83, 0.1, bedWood, [0.3, 1.25, -2.52], { rot: [Math.PI / 2, 0, 0], seg: 32, scale: [1, 1, 0.25] });
  box(1.66, 0.75, 0.1, bedWood, [0.3, 0.375, -0.17], { s: .8 });
  for (const x of [-0.5, 1.1]) for (const z of [-2.52, -0.17]) cyl(0.06, 0.06, 1.0, bedWood, [x, z < -1 ? 0.75 : 0.5, z], {});
  sph(1, toon('#f7f5fb'), [0.3, 0.66, -2.08], { scale: [0.56, 0.12, 0.26] });
  // blanket
  const blT = ptex('blanket', PAINT.blanket); blT.repeat.set(2, 2);
  bedroom.blanket = box(1.62, 0.4, 1.3, toon(0xffffff, blT), [0.3, 0.62, -0.82], { s: 1 });
  box(1.64, 0.07, 0.16, toon('#f4f2fa'), [0.3, 0.83, -1.43]);
  // nightstand + lamp + clock
  const nsM = toon(0xffffff, ptex('woodn', () => PAINT.wood('#7d5236')));
  box(0.55, 0.58, 0.45, nsM, [-0.95, 0.29, -2.3]);
  box(0.4, 0.04, 0.02, toon('#3a2418'), [-0.95, 0.4, -2.07], { cast: false });
  cyl(0.09, 0.12, 0.08, toon('#d4b06a'), [-1.05, 0.62, -2.35]);
  cyl(0.025, 0.025, 0.28, toon('#d4b06a'), [-1.05, 0.78, -2.35]);
  const shadeM = new THREE.MeshToonMaterial({ color: '#f2d38a', emissive: '#ffb860', emissiveIntensity: 0.8, gradientMap: grad });
  cyl(0.12, 0.2, 0.22, shadeM, [-1.05, 0.98, -2.35], { cast: false });
  const clk = canvas(256, 160), cg = clk.getContext('2d');
  cg.fillStyle = '#241726'; cg.fillRect(0, 0, 256, 160); cg.fillStyle = '#ff4a3a'; cg.font = `bold 92px ${FONT}`; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.shadowColor = '#ff2a1a'; cg.shadowBlur = 18; cg.fillText('3:07', 128, 84);
  box(0.26, 0.15, 0.1, toon('#3a3a52'), [-0.82, 0.655, -2.22]);
  signMesh(clk, 0.22, 0.13, [-0.82, 0.655, -2.168], { basic: true });
  // wardrobe
  const wdM = toon(0xffffff, ptex('woodw', () => PAINT.wood('#6a4a6a')));
  box(0.62, 2.1, 1.3, wdM, [-2.28, 1.05, 0.55], { s: .9 });
  box(0.02, 1.9, 0.02, toon(INK), [-1.96, 1.05, 0.55], { cast: false });
  sph(0.035, toon('#e8c46a'), [-1.95, 1.1, 0.48]); sph(0.035, toon('#e8c46a'), [-1.95, 1.1, 0.62]);
  // rug
  const rugT = toTex(PAINT.rug()); rugT.wrapS = rugT.wrapT = THREE.ClampToEdgeWrapping;
  box(2.0, 0.02, 1.5, toon(0xffffff, rugT), [0.1, 0.01, 0.75], { s: 100, cast: false });
  const rugGeo = new THREE.PlaneGeometry(2.0, 1.5);
  // poster on left wall
  const pst = sign(['SWEET', 'DREAMS'], { w: 512, h: 640, bg: '#f2e3c0', fg: '#3d6fd0', border: '#c96a5a', size: 96 });
  signMesh(pst, 0.6, 0.75, [-2.595, 1.75, -0.9], { rot: [0, Math.PI / 2, 0] });
  // books & slippers & toy
  const bc = ['#c94a4a', '#4a8ac9', '#e8c46a', '#5aa86a'];
  bc.forEach((c, i) => box(0.06, 0.24 - i * .02, 0.18, toon(c), [-1.12 + i * .065, 0.58 + (0.24 - i * .02) / 2 - .0, -2.4]));
}

// ================= HQ (brain control room) =================
const hq = {};
{
  const X = (x) => x + HQX;
  const tilesT = ptex('tiles', () => PAINT.tiles()); tilesT.repeat.set(7, 6);
  plane(16, 13, toon(0xffffff, tilesT), [X(0), 0, 1.8], { rot: [-Math.PI / 2, 0, 0] });
  const bw = ptex('brainw', PAINT.brainWall); bw.repeat.set(4, 2);
  box(16, 7, 0.2, toon(0xffffff, bw), [X(0), 3.5, -4.3], { cast: false });
  const bw2 = bw.clone(); bw2.repeat.set(4, 2); bw2.needsUpdate = true;
  box(0.2, 7, 13, toon(0xffffff, bw2), [X(-6.2), 3.5, 1.8], { cast: false });
  box(0.2, 7, 13, toon(0xffffff, bw2), [X(6.2), 3.5, 1.8], { cast: false });
  box(16, 0.18, 0.12, toon('#7a4a5a'), [X(0), 0.09, -4.16], { cast: false });
  const metal = toon(0xffffff, ptex('metal', () => PAINT.metal('#8796a8')));
  const metalDk = toon(0xffffff, ptex('metal2', () => PAINT.metal('#5d6a7c')));
  // BRAIN HQ sign
  signMesh(sign('BRAIN HQ', { w: 1024, h: 288, bg: '#3a1f4d', fg: '#ffe9a8', border: '#e8b04a', size: 150, bulbs: true }), 3.3, 0.93, [X(0), 5.3, -4.18]);
  // clock
  const ck = canvas(512, 512), g = ck.getContext('2d');
  g.fillStyle = INK; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill(); g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(256, 256, 226, 0, 7); g.fill();
  g.fillStyle = INK; g.font = `bold 60px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(String(i), 256 + Math.sin(a) * 180, 256 - Math.cos(a) * 180); }
  cyl(0.6, 0.6, 0.1, metalDk, [X(-2.0), 4.0, -4.15], { rot: [Math.PI / 2, 0, 0] });
  signMesh(ck, 1.1, 1.1, [X(-2.0), 4.0, -4.09]);
  hq.hands = [0.36, 0.5].map((L, i) => { const p = new THREE.Group(); p.position.set(X(-2.0), 4.0, -4.06 + i * .01); scene.add(p); box(0.05 - i * .015, L, 0.02, toon(INK), [0, L / 2 - 0.05, 0], { parent: p, cast: false }); return p; });
  hq.glitch = signMesh(sign('GLITCH!', { w: 512, h: 160, bg: '#5a0f1a', fg: '#ff5a4a', border: '#2a0a10', size: 96 }), 0.95, 0.3, [X(-2.0), 3.12, -4.17], { basic: true });
  // REM SLEEP neon
  hq.remOff = sign('REM SLEEP', { w: 768, h: 220, bg: '#1d1430', fg: '#4a3a66', border: '#3a2a50', size: 110 });
  hq.remOn = sign('REM SLEEP', { w: 768, h: 220, bg: '#1d1430', fg: '#8af0ff', border: '#6ad0ff', size: 110, glow: '#4ae0ff' });
  hq.rem = signMesh(hq.remOff, 1.8, 0.52, [X(-2.0), 2.45, -4.17], { basic: true });
  hq.remCv = hq.rem.userData.tex;
  // calendar board
  const cal = canvas(600, 800), cg = cal.getContext('2d');
  cg.fillStyle = INK; cg.fillRect(0, 0, 600, 800); cg.fillStyle = '#f2e3c0'; cg.fillRect(14, 14, 572, 772);
  cg.fillStyle = '#3a1f4d'; cg.fillRect(14, 14, 572, 110); cg.fillStyle = '#ffe9a8'; cg.font = `bold 62px ${FONT}`; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText('EVERY NIGHT', 300, 70);
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', '...'];
  days.forEach((d, i) => { const c = i % 2, r = Math.floor(i / 2); const x = 50 + c * 260, y = 150 + r * 160; cg.fillStyle = '#2a3566'; cg.fillRect(x, y, 240, 140); cg.fillStyle = '#ffe9a8'; cg.font = `bold 40px ${FONT}`; cg.fillText(d, x + 70, y + 70); cg.save(); cg.translate(x + 175, y + 70); cg.scale(.22, .22); cg.translate(-256, -256); drawFx(cg, 'moon', 0); cg.restore(); });
  signMesh(cal, CAL.w, CAL.h, CAL.c);
  // lever console
  const L = HQ.lever;
  box(1.7, 1.1, 0.95, metal, [L[0], 0.55, L[2]], { s: .9 });
  box(1.75, 0.08, 1.0, metalDk, [L[0], 1.12, L[2]]);
  signMesh(sign(['REM ATONIA', 'SAFETY SWITCH'], { w: 1024, h: 340, bg: '#f2c230', fg: '#241726', border: '#241726', size: 120 }), 1.5, 0.5, [L[0], 0.62, L[2] + 0.48]);
  // stripes
  const hz = canvas(256, 64), hg = hz.getContext('2d'); hg.fillStyle = '#f2c230'; hg.fillRect(0, 0, 256, 64); hg.fillStyle = INK; for (let i = -2; i < 10; i++) { hg.beginPath(); hg.moveTo(i * 32, 64); hg.lineTo(i * 32 + 16, 64); hg.lineTo(i * 32 + 48, 0); hg.lineTo(i * 32 + 32, 0); hg.fill(); }
  signMesh(hz, 1.7, 0.12, [L[0], 0.2, L[2] + 0.48]);
  // OFF / ON plate
  const oo = canvas(512, 256), og = oo.getContext('2d'); og.fillStyle = INK; og.fillRect(0, 0, 512, 256); og.fillStyle = '#e8e2d2'; og.fillRect(10, 10, 492, 236);
  og.font = `bold 84px ${FONT}`; og.textAlign = 'center'; og.textBaseline = 'middle'; og.fillStyle = '#3a8a4a'; og.fillText('OFF', 120, 120); og.fillStyle = '#c93a3a'; og.fillText('ON', 392, 120);
  signMesh(oo, 1.3, 0.65, [L[0], 1.85, L[2] - 0.43]);
  box(1.36, 0.9, 0.06, metalDk, [L[0], 1.6, L[2] - 0.47]);
  hq.lever = new THREE.Group(); hq.lever.position.set(L[0], L[1], L[2]); scene.add(hq.lever);
  cyl(0.05, 0.05, 0.85, toon('#c8ccd8'), [0, 0.42, 0], { parent: hq.lever });
  sph(0.12, toon('#d8302f'), [0, 0.86, 0], { parent: hq.lever });
  cyl(0.16, 0.2, 0.12, metalDk, [L[0], 1.2, L[2]]);
  // padlock (3D)
  hq.padlock = new THREE.Group(); scene.add(hq.padlock);
  box(0.3, 0.26, 0.12, toon('#f2c230'), [0, 0, 0], { parent: hq.padlock });
  mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 20, Math.PI), toon('#c8ccd8'), [0, 0.13, 0], { parent: hq.padlock });
  box(0.05, 0.09, 0.02, toon(INK), [0, -0.02, 0.065], { parent: hq.padlock, cast: false });
  // tanks + spinal tube
  const T = HQ.tube;
  hq.tankLabels = [];
  [['GABA', 0.9, '#7ad08a'], ['GLYCINE', 2.0, '#b48aff']].forEach(([n, x, c], i) => {
    cyl(0.44, 0.44, 1.0, toon(c, null, { emissive: c, emissiveIntensity: 0.15 }), [X(x), 2.1, -3.7], { seg: 28 });
    cyl(0.47, 0.47, 0.1, metalDk, [X(x), 2.62, -3.7]); cyl(0.47, 0.47, 0.1, metalDk, [X(x), 1.58, -3.7]);
    cyl(0.05, 0.05, 0.35, metalDk, [X(x), 1.38, -3.7]);
    const lb = signMesh(sign(n, { w: 640, h: 220, bg: '#fff6dc', fg: '#241726', border: c, size: 120 }), 0.85, 0.29, [X(x), 2.1, -3.2]);
    hq.tankLabels.push(lb);
  });
  box(1.2, 0.1, 0.1, metalDk, [X(1.45), 1.22, -3.7]);
  hq.tube = cyl(0.17, 0.17, 1.25, new THREE.MeshToonMaterial({ color: '#cfefff', transparent: true, opacity: 0.32, gradientMap: grad, depthWrite: false }), [T[0], 0.6, T[2]], { cast: false });
  hq.fluid = cyl(0.12, 0.12, 1, toon('#9a6ae8', null, { emissive: '#6a3ab8', emissiveIntensity: 0.4 }), [T[0], 0.6, T[2]], { cast: false });
  cyl(0.24, 0.24, 0.06, metalDk, [T[0], 0.03, T[2]]);
  signMesh(sign(['SPINAL', 'CORD'], { w: 512, h: 300, bg: '#fff6dc', fg: '#241726', border: '#9a6ae8', size: 110 }), 0.62, 0.36, [X(0.62), 0.75, -3.62]);
  // muscles panel
  const mp = canvas(600, 600), mg = mp.getContext('2d'); mg.fillStyle = INK; mg.fillRect(0, 0, 600, 600); mg.fillStyle = '#d8dce6'; mg.fillRect(14, 14, 572, 572);
  mg.fillStyle = '#3a1f4d'; mg.fillRect(14, 14, 572, 110); mg.fillStyle = '#ffe9a8'; mg.font = `bold 64px ${FONT}`; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText('MUSCLES', 300, 70);
  ['ARMS', 'LEGS', 'HANDS', 'FEET'].forEach((n, i) => { mg.fillStyle = '#241726'; mg.font = `bold 56px ${FONT}`; mg.textAlign = 'left'; mg.fillText(n, 50, 186 + i * 112); });
  signMesh(mp, MUSC.w, MUSC.h, MUSC.c);
  hq.lamps = [0, 1, 2, 3].map((i) => { const m = sph(0.1, new THREE.MeshToonMaterial({ color: '#5ae07a', emissive: '#3ad05a', emissiveIntensity: .8, gradientMap: grad }), lampPos(i), { cast: false }); return m; });
  // conscious mind desk
  const D = HQ.desk;
  const deskM = toon(0xffffff, ptex('woodd', () => PAINT.wood('#9a6a4a')));
  box(1.7, 0.08, 0.85, deskM, [D[0], 0.86, D[2]]);
  box(1.7, 0.82, 0.06, deskM, [D[0], 0.41, D[2] + 0.38]);
  for (const s of [-1, 1]) box(0.08, 0.82, 0.8, deskM, [D[0] + s * 0.8, 0.41, D[2]]);
  signMesh(sign(['CONSCIOUS', 'MIND'], { w: 900, h: 340, bg: '#fff6dc', fg: '#3d6fd0', border: '#3d6fd0', size: 120 }), 1.4, 0.53, [D[0], 0.45, D[2] + 0.42]);
  box(0.4, 0.04, 0.3, toon('#f4f2fa'), [D[0] + 0.4, 0.92, D[2] + 0.1], { rot: [0, .3, 0] });
  cyl(0.07, 0.06, 0.14, toon('#e86a5a'), [D[0] - 0.5, 0.97, D[2] + 0.1]);
  // projector
  const P = HQ.projector;
  hq.proj = new THREE.Group(); hq.proj.position.set(P[0], 0, P[2]); hq.proj.rotation.y = 0.7; scene.add(hq.proj);
  const projM = toon('#6a4a9a'), projDk = toon('#3d2a5e');
  cyl(0.08, 0.1, 1.0, metalDk, [0, 0.5, 0], { parent: hq.proj });
  cyl(0.45, 0.5, 0.08, metalDk, [0, 0.04, 0], { parent: hq.proj });
  box(1.0, 0.7, 0.75, projM, [0, 1.35, 0], { parent: hq.proj });
  cyl(0.2, 0.24, 0.42, projDk, [-0.65, 1.38, 0], { parent: hq.proj, rot: [0, 0, Math.PI / 2] });
  mesh(new THREE.CircleGeometry(0.18, 24), new THREE.MeshBasicMaterial({ color: '#fff2c8' }), [-0.865, 1.38, 0], { parent: hq.proj, rot: [0, -Math.PI / 2, 0], cast: false });
  hq.reels = [-0.25, 0.3].map((x) => { const r = new THREE.Group(); r.position.set(x, 1.95, 0); hq.proj.add(r); cyl(0.36, 0.36, 0.08, projDk, [0, 0, 0], { parent: r, rot: [Math.PI / 2, 0, 0], seg: 28 }); for (let k = 0; k < 3; k++) box(0.5, 0.06, 0.1, toon('#c8ccd8'), [0, 0, 0], { parent: r, rot: [0, 0, k * Math.PI / 3] }); return r; });
  const dm = signMesh(sign(['DREAM', 'PROJECTOR'], { w: 768, h: 330, bg: '#2a1f44', fg: '#d9c8ff', border: '#b48aff', size: 110 }), 0.9, 0.38, [0.02, 1.45, 0.38], { parent: hq.proj });
  // dream mode switch (half stuck)
  signMesh(sign(['DREAM MODE'], { w: 600, h: 160, bg: '#fff6dc', fg: '#241726', border: '#b48aff', size: 80 }), 0.62, 0.17, [0.0, 1.12, 0.38], { parent: hq.proj });
  const sl = canvas(512, 96), sg = sl.getContext('2d'); sg.fillStyle = INK; sg.fillRect(0, 0, 512, 96); sg.fillStyle = '#3a8a4a'; sg.fillRect(8, 8, 248, 80); sg.fillStyle = '#c93a3a'; sg.fillRect(256, 8, 248, 80); sg.fillStyle = '#fff'; sg.font = `bold 50px ${FONT}`; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('AWAKE', 132, 50); sg.fillText('DREAM', 380, 50);
  signMesh(sl, 0.8, 0.15, [0.0, 0.94, 0.38], { parent: hq.proj });
  hq.slider = box(0.08, 0.22, 0.06, toon('#f2f2f2'), [0, 0.94, 0.42], { parent: hq.proj });
  // beam
  const beamGeo = new THREE.ConeGeometry(1.3, 4.2, 32, 1, true); beamGeo.translate(0, -2.1, 0); beamGeo.rotateZ(-Math.PI / 2);
  hq.beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#c9a0ff', transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  hq.beam.position.set(-0.86, 1.38, 0); hq.beam.userData.nd = 'hide'; hq.beam.castShadow = false; hq.proj.add(hq.beam);
  // gears on wall
  hq.gears = [[-4.4, 4.6, .7], [-3.5, 5.3, .45], [4.4, 4.2, .8], [3.6, 5.1, .5]].map(([x, y, r], i) => {
    const gp = new THREE.Group(); gp.position.set(X(x), y, -4.12); scene.add(gp);
    const gm = toon(i % 2 ? '#c99a4a' : '#a8b4c4');
    cyl(r, r, 0.1, gm, [0, 0, 0], { parent: gp, rot: [Math.PI / 2, 0, 0], cast: false });
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; box(0.16, 0.16, 0.1, gm, [Math.cos(a) * r, Math.sin(a) * r, 0], { parent: gp, rot: [0, 0, a], cast: false }); }
    cyl(r * .3, r * .3, 0.14, toon(INK), [0, 0, 0.02], { parent: gp, rot: [Math.PI / 2, 0, 0], cast: false });
    gp.userData.dir = i % 2 ? -1 : 1; gp.userData.r = r; return gp;
  });
  // pipes
  const pipeM = toon('#9a8aa8');
  cyl(0.08, 0.08, 7, pipeM, [X(-5.6), 3.5, -4.0]); cyl(0.08, 0.08, 7, pipeM, [X(5.6), 3.5, -4.0]);
  cyl(0.08, 0.08, 11.2, pipeM, [X(0), 6.3, -4.0], { rot: [0, 0, Math.PI / 2] });
  // alarm beacons
  hq.beacons = [-3.4, 3.4].map((x) => { const m = sph(0.22, new THREE.MeshToonMaterial({ color: '#802020', emissive: '#ff2a1a', emissiveIntensity: 0, gradientMap: grad }), [X(x), 4.9, -4.0], { cast: false, scale: [1, .8, 1] }); cyl(0.25, 0.25, 0.1, metalDk, [X(x), 4.72, -4.0]); return m; });
  // name sign for brainstem
  hq.bsSign = signMesh(sign('BRAINSTEM', { w: 768, h: 200, bg: '#f2c230', fg: '#241726', border: '#241726', size: 110 }), 1.3, 0.34, [0, 0, 0], { basic: false });
  // amygdala floor ring
}

// ---------- cards / sprites ----------
const ndCard = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map } }, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying float vD; void main(){ if (texture2D(map, vUv).a < .5) discard; gl_FragColor = vec4(0.,0.,0.,vD); }',
});
const blobTex = (() => { const c = canvas(512, 512); drawFx(c.getContext('2d'), 'blob', 0); const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })();
const makeBlob = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.userData.nd = 'hide'; m.renderOrder = 1; scene.add(m); return m; };

const cards = {};
const getCard = (id, kind) => {
  if (cards[id]) return cards[id];
  let cw = 1200, ch = 2000, pw = 1.35, ph = 2.25, foot = 975 / 1000;
  if (kind === 'amyg' || kind === 'cat') { cw = 1200; ch = 1600; pw = 1.2; ph = 1.6; foot = 780 / 800; }
  if (kind === 'bubble') { cw = 1024; ch = 900; pw = 1; ph = 900 / 1024; foot = 0.5; }
  const c = canvas(cw, ch), t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const geo = new THREE.PlaneGeometry(pw, ph); geo.translate(0, ph / 2 - ph * (1 - foot), 0);
  const mat = new THREE.MeshBasicMaterial({ map: t, alphaTest: .02, transparent: true, side: THREE.DoubleSide, fog: false });
  const m = new THREE.Mesh(geo, mat); m.castShadow = kind !== 'bubble'; m.receiveShadow = false;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: .5 });
  m.userData.nd = 'card'; m.userData.ndMat = ndCard(t);
  scene.add(m);
  const blob = kind === 'bubble' ? null : makeBlob();
  cards[id] = { id, kind, c, g: c.getContext('2d'), t, m, key: '', blob };
  return cards[id];
};

const keyOf = (o) => JSON.stringify(o, (k, v) => typeof v === 'number' ? q(v, 2) : v);

const updateCard = (a, camPos) => {
  const C = getCard(a.id, a.kind);
  const P = { ...a.P };
  // only animated params that affect the drawing should be in the key
  const keyP = { ...P }; delete keyP.f;
  if (a.kind === 'bean' && (P.expr === 'nervous' || P.sweat || ['terror', 'relief'].includes(P.expr))) keyP.sw = Math.floor((P.f || 0) % 30 / 2);
  if (a.kind === 'bean' && ['wave', 'flail'].some((p) => P.armL === p || P.armR === p)) keyP.fw = P.f;
  if (a.kind === 'shadow') keyP.fs = Math.floor((P.f || 0) / 2);
  if (a.kind === 'amyg') keyP.fa = (P.mode === 'stand' || P.mode === 'smug') ? Math.floor(P.f / 3) : P.f;
  if (a.kind === 'cat') keyP.fc = Math.floor(P.f / 2);
  if (a.kind === 'bubble') { keyP.st = a.state; keyP.fb = Math.floor(P.f / 2); }
  const key = keyOf(keyP);
  if (key !== C.key) {
    C.key = key; const g = C.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, C.c.width, C.c.height);
    if (a.kind === 'bean') { g.setTransform(2, 0, 0, 2, 0, 0); drawBean(g, P); }
    if (a.kind === 'shadow') { g.setTransform(2, 0, 0, 2, 0, 0); if (P.eyesOnly) drawEyesOnly(g, P); else drawShadow(g, P); }
    if (a.kind === 'amyg') { g.setTransform(2, 0, 0, 2, 0, 0); amygdalaSide(g, P); }
    if (a.kind === 'cat') { g.setTransform(2, 0, 0, 2, 0, 0); catSide(g, P); }
    if (a.kind === 'bubble') drawBubble(g, a.state, P.f, { ...DESIGNS.HERO });
    C.t.needsUpdate = true;
  }
  const m = C.m, sc = a.scale ?? 1;
  m.visible = !a.hidden && sc > 0.001;
  m.position.set(...a.pos);
  const sq = a.squash || 0;
  if (a.lie !== undefined) { m.rotation.set(-Math.PI / 2 + a.lie, 0, 0); m.scale.set(sc, sc, sc); }
  else {
    m.rotation.set(0, Math.atan2(camPos.x - a.pos[0], camPos.z - a.pos[2]), 0);
    let flip = 1;
    if (a.dir !== undefined) {
      // flip when travel direction · camera-right < 0 ; sprites are drawn facing +x(right)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const fwd = new THREE.Vector3(a.dir, 0, 0); flip = right.dot(fwd) >= 0 ? 1 : -1;
      if (a.kind === 'cat') flip = a.dir < 0 ? -1 : 1; // cat drawn facing right
    }
    m.scale.set(sc * flip * (1 + sq * .5), sc * (1 - sq), sc);
  }
  if (C.blob) {
    C.blob.visible = m.visible && a.lie === undefined && a.kind !== 'shadow' || (a.kind === 'shadow' && m.visible && !a.P.eyesOnly && a.pos[1] < 0.05);
    const bw = (a.kind === 'cat' ? 0.9 : a.kind === 'amyg' ? 0.8 : 0.85) * sc;
    C.blob.position.set(a.pos[0], (a.pos[1] || 0) + 0.012, a.pos[2]); C.blob.scale.set(bw, bw * .6, 1);
  }
  return C;
};

const drawEyesOnly = (g, P) => {
  // just the glowing eyes of the shadow figure in the dark corner
  const top = 120, ey = top + 110, op = P.eyeOpen ?? 1;
  for (const s of [-1, 1]) {
    const x = 300 + s * 40;
    g.save(); g.shadowColor = '#ff3a2a'; g.shadowBlur = 50;
    const p = new Path2D(); const h = 20 * op;
    p.moveTo(x - s * 30, ey - 14); p.quadraticCurveTo(x, ey - h * .9 - 6, x + s * 30, ey + 6); p.quadraticCurveTo(x, ey + h, x - s * 30, ey - 14);
    g.fillStyle = '#ffef9a'; g.fill(p); g.fill(p); g.restore(); g.fillStyle = '#fffbe8'; g.fill(p);
    g.beginPath(); g.arc(x + s * 4, ey, 5 * op, 0, 7); g.fillStyle = '#ff4a2a'; g.fill();
  }
};

// fx sprite pool
const fxCache = {};
const fxTex = (kind, t, opt) => {
  const k = kind + ':' + q(t, kind === 'zzz' ? 2 : 1) + ':' + JSON.stringify(opt || {});
  if (!fxCache[k]) { const c = canvas(512, 512); drawFx(c.getContext('2d'), kind, t, opt); const tx = toTex(c); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; fxCache[k] = { tx, nd: ndCard(tx) }; }
  return fxCache[k];
};
const fxPool = [];
const getFx = (i) => {
  if (!fxPool[i]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .02, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.userData.nd = 'card'; m.renderOrder = 5; scene.add(m); fxPool[i] = m;
  }
  return fxPool[i];
};

// ---------- passes ----------
const colorRT = new THREE.WebGLRenderTarget(W, Hh, { type: THREE.HalfFloatType, samples: 4 });
const ndRT = new THREE.WebGLRenderTarget(W, Hh, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const inkRT = new THREE.WebGLRenderTarget(W, Hh, { type: THREE.HalfFloatType });
const ndVS = `varying vec3 vN; varying float vD;
void main(){ vec4 p = vec4(position,1.); vec3 n = normal;
#ifdef USE_INSTANCING
p = instanceMatrix*p; n = mat3(instanceMatrix)*n;
#endif
vec4 mv = modelViewMatrix*p; vD = -mv.z; vN = normalize(normalMatrix*n); gl_Position = projectionMatrix*mv; }`;
const ndFS = `varying vec3 vN; varying float vD; void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*.5+.5, vD); }`;
const ndMats = { [THREE.FrontSide]: new THREE.ShaderMaterial({ vertexShader: ndVS, fragmentShader: ndFS, side: THREE.FrontSide }), [THREE.DoubleSide]: new THREE.ShaderMaterial({ vertexShader: ndVS, fragmentShader: ndFS, side: THREE.DoubleSide }), [THREE.BackSide]: new THREE.ShaderMaterial({ vertexShader: ndVS, fragmentShader: ndFS, side: THREE.BackSide }) };

const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const INK_FS = `uniform sampler2D col, nd; uniform vec2 res; uniform float px, sat, vig, flash; uniform vec3 fogCol, lift, gain; varying vec2 vUv;
float edgeAt(vec2 uv, float r){
vec4 c = texture2D(nd, uv); if (dot(c.rgb,c.rgb) < .01) return 0.; float d = c.a; vec3 n = c.rgb*2.-1.;
float e = 0.; float rr = r * clamp(7./d, .62, 1.25);
for (int i=0;i<16;i++){ float a = float(i)*.785398 + (i>7 ? .39 : 0.); float k = i>7 ? .5 : 1.;
vec2 o = vec2(cos(a), sin(a))*rr*k/res; vec4 s = texture2D(nd, uv+o);
float ds = s.a; bool card = dot(s.rgb,s.rgb) < .01;
if (card && ds > 0.) continue;
if (card) ds = 1e4;
vec3 ns = s.rgb*2.-1.;
e = max(e, smoothstep(.006, .02, (ds - d)/d));
if (!card && abs(ds-d)/d < .06) e = max(e, smoothstep(.88, .72, dot(n, ns)) * .9);
}
return e * (1. - smoothstep(140., 520., d)*.8);
}
void main(){
vec3 c = texture2D(col, vUv).rgb;
float e = edgeAt(vUv, px);
c = mix(c, vec3(.012,.01,.014), e);
if (flash < -0.5) c = vec3(e);
float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, sat);
c = c*gain + lift;
vec2 q = vUv-.5; c *= 1. - vig*dot(q*vec2(1.,.75), q*vec2(1.,.75))*2.2;
c = mix(c, vec3(1.), flash);
gl_FragColor = vec4(c,1.); }`;
const DOF_FS = `uniform sampler2D src, nd; uniform vec2 res; uniform float focus, cinf, near; varying vec2 vUv;
float coc(vec2 uv){ float d = texture2D(nd, uv).a; if (d <= 0.) d = 2000.; float k = 1. - focus/d; return k > 0. ? cinf*k : min(-k*cinf*near, cinf*1.4); }
void main(){
float c0 = coc(vUv);
if (cinf < .5 || c0 < .6) { gl_FragColor = linearToOutputTexel(vec4(texture2D(src, vUv).rgb, 1.)); return; }
vec3 acc = vec3(0.); float wsum = 0.;
for (int i=0;i<48;i++){ float fi = float(i); float r = sqrt((fi+.5)/48.); float a = fi*2.39996;
vec2 o = vec2(cos(a), sin(a))*r*c0/res; float cs = coc(vUv+o);
float w = smoothstep(r*c0-1.5, r*c0+.5, cs + .5);
acc += texture2D(src, vUv+o).rgb*w; wsum += w; }
gl_FragColor = linearToOutputTexel(vec4(acc/max(wsum,1e-3), 1.)); }`;
const inkMat = new THREE.ShaderMaterial({ vertexShader: fsVS, fragmentShader: INK_FS, depthTest: false, depthWrite: false, uniforms: {
  col: { value: colorRT.texture }, nd: { value: ndRT.texture }, res: { value: new THREE.Vector2(W, Hh) }, px: { value: 2.5 }, sat: { value: 1.1 }, vig: { value: .2 }, flash: { value: 0 },
  fogCol: { value: new THREE.Color() }, lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) } } });
const dofMat = new THREE.ShaderMaterial({ vertexShader: fsVS, fragmentShader: DOF_FS, depthTest: false, depthWrite: false, uniforms: {
  src: { value: inkRT.texture }, nd: { value: ndRT.texture }, res: { value: new THREE.Vector2(W, Hh) }, focus: { value: 5 }, cinf: { value: 0 }, near: { value: 1 } } });
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), inkMat); fsQuad.frustumCulled = false;
const fsScene = new THREE.Scene(); fsScene.add(fsQuad);

// ---------- frame ----------
const v3 = (a) => new THREE.Vector3(...a);
let lastSet = '';
function applyLight(L, set) {
  const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const tg = v3(L.target);
  sun.target.position.copy(tg); sun.position.copy(tg).addScaledVector(dir, 30);
  sun.color.set(L.sunCol); sun.intensity = L.sunI;
  const ext = L.shadowExt; const sc = sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 70; sc.updateProjectionMatrix();
  hemi.color.set(L.hemiSky); hemi.groundColor.set(L.hemiGround); hemi.intensity = L.hemiI;
  skyMat.uniforms.top.value.set(L.skyTop); skyMat.uniforms.hor.value.set(L.skyHor);
  scene.fog.color.set(L.skyHor); scene.fog.near = L.fog[0]; scene.fog.far = L.fog[1];
  lamp.visible = set === 'bed' && !!L.lamp; if (L.lamp) { lamp.color.set(L.lamp.col); lamp.intensity = L.lamp.I; }
  alarmLight.intensity = (L.alarm || 0) * 30;
  purpleLight.intensity = (L.purple || 0) * 6;
  inkMat.uniforms.sat.value = L.sat; inkMat.uniforms.vig.value = L.vig; inkMat.uniforms.flash.value = L.flash || 0;
  inkMat.uniforms.gain.value.set(...L.gain); inkMat.uniforms.lift.value.set(...L.lift);
  const tint = new THREE.Color(L.cardTint);
  if (L.purple) tint.lerp(new THREE.Color('#c8a8ff'), L.purple * .5);
  for (const k in cards) cards[k].m.material.color.copy(tint);
}

function applyWorld(Wd, f) {
  // bedroom curtains
  for (const m of bedroom.curtains) { const p = m.geometry.attributes.position, b = m.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const k = (0.82 - y) / 1.65; p.setZ(i, Math.sin(f * .06 + y * 3 + x * 8 + m.userData.s) * .035 * k + Math.sin(x * 30) * .02); } p.needsUpdate = true; m.geometry.computeVertexNormals(); }
  // hq
  hq.lever.rotation.z = Wd.lever;
  const L = HQ.lever;
  const pad = hq.padlock;
  if (Wd.padlockFly >= 0) { const t = Wd.padlockFly / 30; pad.visible = t < 1; pad.position.set(L[0] + .32 + t * 1.6, 1.32 + t * 3 - t * t * 4.5, L[2] + .3 + t * .8); pad.rotation.set(t * 8, t * 5, t * 9); pad.scale.setScalar(1); }
  else { pad.visible = Wd.padlock > .001; pad.position.set(L[0] + .32, 1.32, L[2] + .3); pad.rotation.set(0, 0, 0); pad.scale.setScalar(Math.max(.001, Wd.padlock)); }
  hq.hands[0].rotation.z = -Wd.clockA; hq.hands[1].rotation.z = -Wd.clockB;
  hq.glitch.material.color.setScalar(Wd.glitchLamp ? 1 : 0.25);
  const remSrc = Wd.rem > .5 ? hq.remOn : hq.remOff;
  if (hq.rem.userData.src !== remSrc) { hq.rem.userData.src = remSrc; hq.rem.material.map.image = remSrc; hq.rem.material.map.needsUpdate = true; }
  // fluid
  const [b0, t0] = Wd.fluid, TL = 1.22;
  hq.fluid.visible = t0 - b0 > .005; hq.fluid.scale.y = Math.max(.001, (t0 - b0) * TL); hq.fluid.position.y = (b0 + t0) / 2 * TL;
  hq.tankLabels.forEach((m, i) => { const s = Math.max(.001, Wd.tankLabel[i]); m.scale.setScalar(s); });
  hq.lamps.forEach((m, i) => { const on = Wd.lamps[i]; m.material.color.set(on ? '#5ae07a' : '#5a3a3a'); m.material.emissive.set(on ? '#3ad05a' : '#000000'); });
  hq.reels.forEach((r, i) => r.rotation.z = Wd.reels * (i ? 1.3 : 1));
  hq.slider.position.x = (Wd.dreamSwitch - .5) * .7 + 0.0;
  hq.beam.material.opacity = Math.min(1, Wd.beam) * .55; hq.beam.visible = Wd.beam > .01; hq.beam.scale.set(1, Math.max(.01, Wd.beam), Math.max(.01, Wd.beam));
  hq.gears.forEach((g) => g.rotation.z = Wd.gears * g.userData.dir / g.userData.r);
  hq.beacons.forEach((m, i) => { m.material.emissiveIntensity = Wd.alarm * (.6 + .6 * Math.sin(f * .42 + i * Math.PI)) * 2; });
}

function renderFrame(f) {
  const c = camAt(f), s = c.shot;
  camera.position.set(...c.pos); camera.up.set(0, 1, 0); camera.lookAt(...c.look);
  camera.rotateZ(THREE.MathUtils.degToRad(c.roll || 0));
  camera.fov = c.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  sky.position.copy(camera.position);
  const L = lightFor(f); applyLight(L, s.set);
  applyWorld(worldAt(f), f);
  // actors
  const seen = new Set();
  for (const a of actorsAt(f)) { updateCard(a, camera.position); seen.add(a.id); }
  for (const k in cards) if (!seen.has(k)) { cards[k].m.visible = false; if (cards[k].blob) cards[k].blob.visible = false; }
  // brainstem name sign follows operator
  const op = actorsAt(f).find((a) => a.id === 'oper');
  hq.bsSign.visible = !!(op && op.sign > .001);
  if (hq.bsSign.visible) { hq.bsSign.position.set(op.pos[0] + 0.05, 2.55, op.pos[2] + 0.1); hq.bsSign.scale.setScalar(op.sign); hq.bsSign.rotation.y = Math.atan2(camera.position.x - op.pos[0], camera.position.z - op.pos[2]); }
  // fx
  const F = fxAt(f); let i = 0;
  for (const e of F) { const m = getFx(i++); const T = fxTex(e.kind, e.t, e.opt); m.material.map = T.tx; m.material.needsUpdate = true; m.userData.ndMat = T.nd; m.visible = e.size > .005; m.position.set(...e.pos); m.quaternion.copy(camera.quaternion); m.scale.setScalar(Math.max(.001, e.size)); }
  for (; i < fxPool.length; i++) fxPool[i].visible = false;

  // pass 1: colour
  renderer.setRenderTarget(colorRT); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
  // pass 2: normal + depth
  const saved = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.nd === 'hide' || !o.visible) { if (o.visible) { saved.push([o, null, true]); o.visible = false; } return; }
    saved.push([o, o.material, false]);
    if (o.userData.nd === 'card') o.material = o.userData.ndMat || o.material;
    else if (o.material.transparent && o.material.opacity < 0.05) { saved[saved.length - 1] = [o, null, true]; o.visible = false; }
    else o.material = ndMats[o.material.side ?? THREE.FrontSide];
  });
  const fog = scene.fog; scene.fog = null; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;
  renderer.setRenderTarget(ndRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  for (const [o, m, hid] of saved) { if (hid) o.visible = true; else o.material = m; }
  scene.fog = fog; renderer.shadowMap.autoUpdate = true;
  // pass 3: ink + grade
  fsQuad.material = inkMat; renderer.setRenderTarget(inkRT); renderer.render(fsScene, fsCam);
  // pass 4: lens
  const d = dofAt(f); dofMat.uniforms.focus.value = d.focus; dofMat.uniforms.cinf.value = d.cinf;
  fsQuad.material = dofMat; renderer.setRenderTarget(null); renderer.render(fsScene, fsCam);
}

window.FRAMES = FRAMES;
window.SHOTS = SHOTS.map((s) => ({ id: s.id, f0: s.f0, f1: s.f1 }));
window.renderFrame = (f) => { renderFrame(f); return true; };
document.fonts.ready.then(() => { window.ready = true; });
