// Canvas-painted textures: flat base + soft blotches + dark seams/strokes.
import * as THREE from './lib/three.module.js';

export const FONT = '"DejaVu Sans", "Liberation Sans", sans-serif';

let seedN = 1;
export const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const R = () => rnd(seedN++);

export const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export const shade = (hex, k) => {
  const c = new THREE.Color(hex); c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k);
  return '#' + c.getHexString();
};
export const mix = (a, b, t) => { const c = new THREE.Color(a).lerp(new THREE.Color(b), t); return '#' + c.getHexString(); };

export const toTex = (cv, repeat = [1, 1]) => {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
};

const blotches = (g, w, h, col, n = 40, rmin = 20, rmax = 90, alpha = .18) => {
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, r = rmin + R() * (rmax - rmin);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = alpha * (.5 + R() * .5); g.fillStyle = gr;
    // wrap
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); }
  }
  g.globalAlpha = 1;
};

// generic painted surface
export const surface = (base, { light, dark, seams = null, size = 256, n = 30 } = {}) => {
  const cv = canvas(size, size), g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  blotches(g, size, size, light || shade(base, 1.15), n, size * .06, size * .3, .25);
  blotches(g, size, size, dark || shade(base, .82), n, size * .06, size * .3, .22);
  if (seams) seams(g, size);
  return cv;
};

export const PAINT = {
  wood: (base = '#8a5a3a') => surface(base, {
    size: 256, seams: (g, s) => {
      g.strokeStyle = shade(base, .62); g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke(); }
      g.lineWidth = 2; g.strokeStyle = shade(base, .78);
      for (let i = 0; i < 4; i++) { const x = (rnd(i * 3.1) * s) | 0; g.beginPath(); g.moveTo(x, i * s / 4); g.lineTo(x, (i + 1) * s / 4); g.stroke(); }
      g.globalAlpha = .25; g.strokeStyle = shade(base, .7); g.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) { const y = rnd(i * 7.3) * s; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * .3, y + 4, s * .6, y - 4, s, y); g.stroke(); }
      g.globalAlpha = 1;
    }
  }),
  wallpaper: (base = '#2c3566', motif = '#3a4580') => surface(base, {
    size: 256, seams: (g, s) => {
      g.fillStyle = motif;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const cx = (x + (y % 2) * .5) * s / 4 + s / 8, cy = y * s / 4 + s / 8;
        g.beginPath(); g.ellipse(cx, cy, 9, 14, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(cx, cy - 22, 3, 3, 0, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = shade(base, .8); g.lineWidth = 2;
      for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * s / 8 + s / 16, 0); g.lineTo(i * s / 8 + s / 16, s); g.stroke(); }
    }
  }),
  rug: () => {
    const s = 512, cv = canvas(s, s), g = cv.getContext('2d');
    g.fillStyle = '#7a3448'; g.fillRect(0, 0, s, s);
    blotches(g, s, s, '#94455c', 30, 30, 120, .3);
    g.strokeStyle = '#e8c27a'; g.lineWidth = 14; g.strokeRect(30, 30, s - 60, s - 60);
    g.strokeStyle = '#3d1a28'; g.lineWidth = 6; g.strokeRect(60, 60, s - 120, s - 120);
    g.fillStyle = '#e8c27a';
    for (let i = 0; i < 5; i++) { g.save(); g.translate(s / 2, s / 2); g.rotate(i * Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -90, 26, 60, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = '#3d1a28'; g.beginPath(); g.arc(s / 2, s / 2, 34, 0, Math.PI * 2); g.fill();
    return cv;
  },
  blanket: () => {
    const s = 256, cv = surface('#d9a441', { size: s });
    const g = cv.getContext('2d');
    g.strokeStyle = '#b5772a'; g.lineWidth = 10;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, i * 64 + 32); g.lineTo(s, i * 64 + 32); g.stroke(); g.beginPath(); g.moveTo(i * 64 + 32, 0); g.lineTo(i * 64 + 32, s); g.stroke(); }
    g.fillStyle = '#f2e3c0';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 64, y * 64, 6, 0, 7); g.fill(); }
    return cv;
  },
  sheet: () => surface('#eef0f6', { size: 128, n: 12 }),
  metal: (base = '#7d8a99') => surface(base, {
    size: 256, seams: (g, s) => {
      g.strokeStyle = shade(base, .6); g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4);
      g.fillStyle = shade(base, .55);
      for (const [x, y] of [[14, 14], [s - 14, 14], [14, s - 14], [s - 14, s - 14]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    }
  }),
  tiles: (a = '#b9a7c9', b = '#a693b9') => {
    const s = 256, cv = canvas(s, s), g = cv.getContext('2d');
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s / 2, y * s / 2, s / 2, s / 2); }
    blotches(g, s, s, '#ffffff', 16, 20, 70, .12); blotches(g, s, s, '#3a2a4a', 16, 20, 70, .1);
    g.strokeStyle = '#5c4a6c'; g.lineWidth = 3;
    g.strokeRect(0, 0, s / 2, s / 2); g.strokeRect(s / 2, s / 2, s / 2, s / 2); g.strokeRect(s / 2, 0, s / 2, s / 2); g.strokeRect(0, s / 2, s / 2, s / 2);
    return cv;
  },
  brainWall: () => { // pink gyri folds
    const s = 512, cv = canvas(s, s), g = cv.getContext('2d');
    g.fillStyle = '#e59aa6'; g.fillRect(0, 0, s, s);
    blotches(g, s, s, '#f4b8c0', 30, 40, 140, .35); blotches(g, s, s, '#c97584', 30, 40, 140, .25);
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      let x = rnd(i * 1.7) * s, y = rnd(i * 2.9) * s, a = rnd(i * 4.1) * 6.28;
      g.strokeStyle = '#a8566a'; g.lineWidth = 7; g.globalAlpha = .7;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { a += (rnd(i * 13 + k) - .5) * 2.4; const nx = x + Math.cos(a) * 26, ny = y + Math.sin(a) * 26; g.quadraticCurveTo(x + Math.cos(a + 1) * 14, y + Math.sin(a + 1) * 14, nx, ny); x = nx; y = ny; }
      g.stroke();
    }
    g.globalAlpha = 1;
    return cv;
  },
};

// sign: text panel with frame. opts: bg, fg, border, font size, sub
export const sign = (lines, { w = 1024, h = 256, bg = '#2a1f3d', fg = '#ffe9a8', border = '#e8b04a', size = 120, bulbs = false, glow = null, radius = 40 } = {}) => {
  const cv = canvas(w, h), g = cv.getContext('2d');
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
  g.fillStyle = '#241726'; rr(0, 0, w, h, radius); g.fill();
  g.fillStyle = border; rr(10, 10, w - 20, h - 20, radius * .8); g.fill();
  g.fillStyle = bg; rr(26, 26, w - 52, h - 52, radius * .6); g.fill();
  if (bulbs) {
    const n = Math.round((w + h) / 60);
    for (let i = 0; i < n * 2; i++) {
      const t = i / (n * 2), per = 2 * (w + h) - 160; let d = t * per, x, y;
      const W = w - 80, H = h - 80;
      if (d < W) { x = 40 + d; y = 40; } else if ((d -= W) < H) { x = 40 + W; y = 40 + d; } else if ((d -= H) < W) { x = 40 + W - d; y = 40 + H; } else { d -= W; x = 40; y = 40 + H - d; }
      g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    }
  }
  const L = Array.isArray(lines) ? lines : [lines];
  g.textAlign = 'center'; g.textBaseline = 'middle';
  L.forEach((t, i) => {
    const sz = (i === 0 ? size : size * .55);
    g.font = `bold ${sz}px ${FONT}`;
    let fsz = sz; while (g.measureText(t).width > w - 110 && fsz > 10) { fsz -= 4; g.font = `bold ${fsz}px ${FONT}`; }
    const y = L.length === 1 ? h / 2 + 4 : h / 2 + (i - (L.length - 1) / 2) * size * .95;
    if (glow) { g.shadowColor = glow; g.shadowBlur = 30; }
    g.lineWidth = fsz * .12; g.strokeStyle = '#241726'; g.lineJoin = 'round'; g.strokeText(t, w / 2, y);
    g.fillStyle = fg; g.fillText(t, w / 2, y); g.shadowBlur = 0;
  });
  return cv;
};
