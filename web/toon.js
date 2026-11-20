// 2D cartoon drawing: bean characters, the shadow figure, creatures, fx sprites.
import { FONT, shade, mix } from './paint.js';

export const INK = '#241726';
const LIGHT = -120 * Math.PI / 180; // light from upper-left
const TAU = Math.PI * 2;
export const rad = (d) => d * Math.PI / 180;

// ---------- Pen ----------
export class Pen {
  constructor(g, u = 2.36) { this.g = g; this.u = u; }
  line(pts, w, col, cap = 'round') { const g = this.g; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.lineWidth = w; g.strokeStyle = col; g.lineCap = cap; g.lineJoin = 'round'; g.stroke(); }
  curve(a, c, b, w, col) { const g = this.g; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c[0], c[1], b[0], b[1]); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.stroke(); }
  poly(pts) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; }
  ellPts(cx, cy, rx, ry, n = 48, f = null) { const o = []; for (let i = 0; i < n; i++) { const t = i / n * TAU; let x = Math.cos(t), y = Math.sin(t); if (f) [x, y] = f(x, y, t); o.push([cx + x * rx, cy + y * ry]); } return o; }
  ell(cx, cy, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot, 0, TAU); return p; }
  dot(x, y, r, col) { const g = this.g; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = col; g.fill(); }
  stroke(path, w, col) { const g = this.g; g.lineWidth = w; g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(path); }
  thickAngle() { return [Math.cos(LIGHT + Math.PI), Math.sin(LIGHT + Math.PI)]; }
  // outline thicker on side away from the light, then shaded fill
  shadedFill(path, base, bbox, { ink = INK, w = 4.4, dk = .74, hi = 1.08 } = {}) {
    const g = this.g, u = this.u, [ax, ay] = this.thickAngle();
    g.save(); g.translate(ax * 1.6 * u, ay * 1.6 * u); g.fillStyle = ink; g.fill(path); g.lineWidth = w * u; g.strokeStyle = ink; g.lineJoin = 'round'; g.stroke(path); g.restore();
    this.stroke(path, w * u, ink);
    const [x0, y0, x1, y1] = bbox;
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, shade(base, hi)); gr.addColorStop(.48, base); gr.addColorStop(.62, shade(base, dk)); gr.addColorStop(1, shade(base, dk * .92));
    g.fillStyle = gr; g.fill(path);
  }
  inkRing(x, y, r, fill, w = 2.6) { this.dot(x, y, r + w * this.u * .5, INK); this.dot(x, y, r, fill); }
  clip(path, fn) { const g = this.g; g.save(); g.clip(path); fn(); g.restore(); }
  mul(p, k) { return [p[0] * k, p[1] * k]; }
  limb(a, c, b, w, col) { const u = this.u; this.curve(a, c, b, (w + 4.4) * u, INK); this.curve(a, c, b, w * u, col); }
}

// superellipse blob with egg + asymmetry
const blobPath = (cx, cy, rx, ry, { n = 2.6, egg = .08, seed = 1, wob = .02 } = {}) => {
  const p = new Path2D();
  for (let i = 0; i <= 72; i++) {
    const t = i / 72 * TAU, c = Math.cos(t), s = Math.sin(t);
    let x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    x *= 1 + egg * y; // wider at bottom (y down)
    const w = 1 + wob * Math.sin(t * 3 + seed) + wob * .6 * Math.cos(t * 2 + seed * 2);
    const X = cx + x * rx * w, Y = cy + y * ry * w;
    i ? p.lineTo(X, Y) : p.moveTo(X, Y);
  }
  p.closePath(); return p;
};

// ---------- faces ----------
const EXPR = {
  neutral: { eyes: 'dot', mouth: 'dash', brow: 0 },
  stern: { eyes: 'dot', mouth: 'frown', brow: -16 },
  grin: { eyes: 'happy', mouth: 'grin', brow: 6 },
  laugh: { eyes: 'squeeze', mouth: 'laugh', brow: 8 },
  nervous: { eyes: 'dot', mouth: 'wave', brow: 18, sweat: 1, look: [.6, 0] },
  shock: { eyes: 'shock', mouth: 'O', brow: 'arc' },
  terror: { eyes: 'shock', mouth: 'wave', brow: 22, sweat: 1 },
  smile: { eyes: 'dot', mouth: 'smile', brow: 4 },
  pained: { eyes: 'squeeze', mouth: 'teeth', brow: 20 },
  squint: { eyes: 'slit', mouth: 'frown', brow: -10 },
  smug: { eyes: 'side', mouth: 'smirk', brow: -6, look: [1, 0] },
  sleep: { eyes: 'closed', mouth: 'o', brow: 4 },
  relief: { eyes: 'closed', mouth: 'smile', brow: 14, sweat: 1 },
  doze: { eyes: 'lid', mouth: 'o', brow: 6 },
  awake: { eyes: 'shock', mouth: 'o', brow: 'arc' },
};

const drawFace = (pen, hx, hy, P) => {
  const g = pen.g, u = pen.u;
  const E = { ...(EXPR[P.expr] || EXPR.neutral) };
  if (P.eyes) E.eyes = P.eyes; if (P.mouth) E.mouth = P.mouth;
  const look = P.look || E.look || [0, 0];
  let eyes = E.eyes;
  if (P.blink >= 1 && !['closed', 'happy', 'squeeze'].includes(eyes)) eyes = 'closed';
  else if (P.blink >= .5 && ['dot', 'shock'].includes(eyes)) eyes = 'lid';
  const ex = 13 * u, ey = hy + 2, my = hy + 22 * u;
  for (const s of [-1, 1]) {
    const x = hx + s * ex;
    switch (eyes) {
      case 'dot': { pen.g.beginPath(); pen.g.ellipse(x + look[0] * 3 * u, ey + look[1] * 3 * u, 3.6 * u, 4.8 * u, 0, 0, TAU); g.fillStyle = INK; g.fill(); pen.dot(x + look[0] * 3 * u - 1.1 * u, ey - 1.6 * u, 1.1 * u, '#fff'); break; }
      case 'lid': { pen.g.beginPath(); pen.g.ellipse(x, ey + 1.5 * u, 3.6 * u, 2.6 * u, 0, 0, Math.PI); g.fillStyle = INK; g.fill(); pen.line([[x - 5.5 * u, ey + 1 * u], [x + 5.5 * u, ey + .6 * u]], 2.2 * u, INK); break; }
      case 'happy': pen.curve([x - 5 * u, ey + 2 * u], [x, ey - 6 * u], [x + 5 * u, ey + 2 * u], 2.6 * u, INK); break;
      case 'closed': pen.curve([x - 5 * u, ey], [x, ey + 4.5 * u], [x + 5 * u, ey], 2.4 * u, INK); break;
      case 'squeeze': pen.line([[x - s * 5 * u, ey - 4 * u], [x + s * 4 * u, ey], [x - s * 5 * u, ey + 4 * u]], 2.6 * u, INK); break;
      case 'shock': { pen.inkRing(x, ey - 1 * u, 7.4 * u, '#fff', 1.8); pen.dot(x + look[0] * 3.5 * u, ey - 1 * u + look[1] * 3.5 * u, 2.2 * u, INK); break; }
      case 'slit': pen.line([[x - 5 * u, ey], [x + 5 * u, ey]], 2.8 * u, INK); break;
      case 'side': { pen.g.beginPath(); pen.g.ellipse(x, ey + 1.6 * u, 4.6 * u, 3 * u, 0, 0, Math.PI); g.fillStyle = '#fff'; g.fill(); pen.dot(x + look[0] * 2.6 * u, ey + 2.2 * u, 2.2 * u, INK); pen.line([[x - 6 * u, ey + 1 * u], [x + 6 * u, ey + .4 * u]], 2.4 * u, INK); break; }
    }
    // brows
    const by = ey - 11 * u - (E.brow === 'arc' ? 4 * u : 0);
    if (E.brow === 'arc') pen.curve([x - 5 * u, by + 2 * u], [x, by - 4 * u], [x + 5 * u, by + 2 * u], 2.4 * u, INK);
    else { const a = rad(E.brow) * -s; const dx = Math.cos(a) * 5 * u, dy = Math.sin(a) * 5 * u; pen.line([[x - dx, by - dy], [x + dx, by + dy]], 2.4 * u, INK); }
  }
  // cheeks
  g.globalAlpha = .22; pen.dot(hx - 22 * u, ey + 9 * u, 5 * u, '#e8606a'); pen.dot(hx + 22 * u, ey + 9 * u, 5 * u, '#e8606a'); g.globalAlpha = 1;
  // mouth
  const mx = hx + (look[0] || 0) * 2 * u;
  switch (E.mouth) {
    case 'dash': pen.line([[mx - 6 * u, my], [mx + 6 * u, my]], 2.4 * u, INK); break;
    case 'frown': pen.curve([mx - 7 * u, my + 2 * u], [mx, my - 4 * u], [mx + 7 * u, my + 2 * u], 2.4 * u, INK); break;
    case 'smirk': pen.curve([mx - 6 * u, my + 1 * u], [mx + 3 * u, my + 2 * u], [mx + 8 * u, my - 3 * u], 2.4 * u, INK); break;
    case 'smile': pen.curve([mx - 8 * u, my - 2 * u], [mx, my + 6 * u], [mx + 8 * u, my - 2 * u], 2.4 * u, INK); break;
    case 'o': pen.inkRing(mx, my, 2.4 * u, '#7a2a3a', 1.6); break;
    case 'O': { const p = pen.ell(mx, my + 2 * u, 6 * u, 8 * u); pen.stroke(p, 2.6 * u, INK); g.fillStyle = '#5a1a2a'; g.fill(p); break; }
    case 'wave': pen.line([[mx - 9 * u, my], [mx - 5 * u, my - 2.5 * u], [mx - 1 * u, my], [mx + 3 * u, my - 2.5 * u], [mx + 7 * u, my], [mx + 10 * u, my - 2 * u]], 2.2 * u, INK); break;
    case 'grin': case 'laugh': case 'teeth': {
      const h = E.mouth === 'laugh' ? 11 : E.mouth === 'teeth' ? 7 : 8;
      const p = new Path2D(); p.moveTo(mx - 11 * u, my - 2 * u); p.quadraticCurveTo(mx, my + (E.mouth === 'teeth' ? -1 : 1) * u, mx + 11 * u, my - 2 * u); p.quadraticCurveTo(mx, my + h * 2 * u, mx - 11 * u, my - 2 * u); p.closePath();
      if (E.mouth === 'teeth') { p.moveTo(0, 0); }
      pen.stroke(p, 2.6 * u, INK); g.fillStyle = '#5a1a2a'; g.fill(p);
      pen.clip(p, () => { g.fillStyle = '#fff'; g.fillRect(mx - 12 * u, my - 4 * u, 24 * u, (E.mouth === 'teeth' ? 9 : 4) * u); if (E.mouth === 'teeth') pen.line([[mx - 12 * u, my + 2 * u], [mx + 12 * u, my + 2 * u]], 1.2 * u, INK); });
      pen.stroke(p, 2.2 * u, INK); break;
    }
  }
  if (E.sweat || P.sweat) {
    const sx = hx + 34 * u, sy = hy - 12 * u + ((P.f || 0) % 30) * .4 * u;
    const p = new Path2D(); p.moveTo(sx, sy - 7 * u); p.quadraticCurveTo(sx + 5 * u, sy + 2 * u, sx, sy + 4 * u); p.quadraticCurveTo(sx - 5 * u, sy + 2 * u, sx, sy - 7 * u);
    pen.stroke(p, 1.8 * u, INK); g.fillStyle = '#9fd8ff'; g.fill(p);
  }
};

// ---------- arm poses (relative to shoulder, design units; s = side -1 left / +1 right) ----------
const ARMS = {
  hang: [[22, 128], [14, 66]],
  point: [[150, -12], [80, 6]],
  up: [[55, -150], [48, -70]],
  wave: [[70, -140], [62, -60]],
  hip: [[30, 96], [86, 48]],
  belly: [[-40, 104], [36, 86]],
  cheek: [[-6, -98], [70, -26]],
  thumb: [[96, -26], [86, 60]],
  shrug: [[128, -46], [96, 50]],
  reach: [[150, -66], [84, -20]],
  lift: [[90, -132], [92, -40]],
  cross: [[-52, 66], [46, 76]],
  grab: [[118, -104], [96, -10]],
  pull: [[96, 30], [70, -20]],
  flail: [[110, -110], [96, -30]],
  limp: [[28, 136], [10, 70]],
};

export const drawBean = (g, P) => {
  const HW = P.headW || 236, u = HW / 100, HH = 220 * (P.headK || 1);
  const pen = new Pen(g, u);
  const sk = P.skin || '#ffe2c2', O = P.outfit || {};
  const top = O.top || '#6fa0d8', topDk = O.topDk || shade(top, .7), bottom = O.bottom || shade(top, .8), legC = O.leg || shade(bottom, .72);
  const bob = (P.bob || 0) * 1000, sq = P.squash || 0;
  const cx = 300 + (P.dx || 0);
  const legLen = 1.38 * HH * (1 - sq * .5), torsoH = 1.08 * HH * (1 + sq * -.2), TW = (P.stout ? 112 : 100) * 2.0 * (1 + sq * .3);
  const hipY = 975 - legLen - bob;
  // legs
  const legs = P.legs || { kind: 'stand' };
  for (const s of [-1, 1]) {
    const hx = cx + s * 34, hy = hipY;
    let fx = cx + s * 40, fy = 966, lift = 0;
    if (legs.kind === 'walk' || legs.kind === 'run') {
      const ph = (legs.phase + (s > 0 ? .5 : 0)) * TAU, st = legs.kind === 'run' ? 70 : 40;
      fx = cx + s * 22 + st * Math.cos(ph) * (legs.dir || 1); lift = Math.max(0, Math.sin(ph)) * (legs.kind === 'run' ? 60 : 26);
    }
    if (legs.kind === 'kick' && s > 0) { fx = cx + 190; lift = 230; }
    const kx = (hx + fx) / 2 + s * 10, ky = (hy + fy - lift) / 2;
    pen.limb([hx, hy], [kx, ky], [fx, fy - lift], 5.8, legC);
    // boot/slipper
    const bp = pen.ell(fx + s * 8, fy - lift + 2, 15, 9);
    pen.shadedFill(bp, O.shoe || '#4a3348', [fx - 15, fy - 12, fx + 15, fy + 12], { w: 2.6 });
  }
  // upper body
  g.save();
  g.translate(cx, hipY); g.rotate(rad(P.tilt || 0)); g.translate(-cx, -hipY);
  const tcY = hipY - torsoH * .42, neckY = hipY - torsoH * .9;
  // skirt/hem (pajama shirt hem)
  if (O.skirt) {
    const p = pen.poly([[cx - TW * .5, hipY - 30], [cx + TW * .5, hipY - 30], [cx + TW * .58, hipY + 48], [cx - TW * .58, hipY + 48]]);
    pen.shadedFill(p, O.skirt, [cx - TW * .6, hipY - 30, cx + TW * .6, hipY + 50]);
  }
  const torso = blobPath(cx, tcY, TW * .5, torsoH * .55, { n: 2.3, egg: .16, seed: P.seed || 1 });
  pen.shadedFill(torso, top, [cx - TW * .5, tcY - torsoH * .5, cx + TW * .5, tcY + torsoH * .5]);
  pen.clip(torso, () => {
    if (O.stripes) { g.strokeStyle = O.stripes; g.lineWidth = 9; for (let y = tcY - torsoH; y < tcY + torsoH; y += 30) { g.beginPath(); g.moveTo(cx - TW, y); g.lineTo(cx + TW, y + 10); g.stroke(); } }
    if (O.overalls) { g.fillStyle = O.overalls; g.fillRect(cx - TW * .36, tcY - torsoH * .05, TW * .72, torsoH); pen.line([[cx - TW * .3, tcY - torsoH * .05], [cx - TW * .36, neckY]], 10, O.overalls); pen.line([[cx + TW * .3, tcY - torsoH * .05], [cx + TW * .36, neckY]], 10, O.overalls); pen.dot(cx - TW * .28, tcY - torsoH * .02, 6, '#e8c46a'); pen.dot(cx + TW * .28, tcY - torsoH * .02, 6, '#e8c46a'); g.fillStyle = shade(O.overalls, .8); g.fillRect(cx - 34, tcY + 14, 68, 46); }
    if (O.belt) { g.fillStyle = O.belt; g.fillRect(cx - TW, hipY - 44, TW * 2, 22); }
    // shadow side wash
    const gr = g.createLinearGradient(cx - TW * .5, 0, cx + TW * .5, 0); gr.addColorStop(.6, 'rgba(36,23,38,0)'); gr.addColorStop(1, 'rgba(36,23,38,.18)'); g.fillStyle = gr; g.fillRect(cx - TW, tcY - torsoH, TW * 2, torsoH * 2);
  });
  pen.stroke(torso, 4.2 * u, INK);
  if (O.buttons) for (let i = 0; i < 3; i++) pen.inkRing(cx, tcY - torsoH * .2 + i * 34, 4.5, O.buttons, 1.2);
  if (O.badge) { const bw = 96, bh = 34, bx = cx - TW * .05, by = tcY - torsoH * .28; g.fillStyle = INK; g.fillRect(bx - 3, by - 3, bw + 6, bh + 6); g.fillStyle = '#fff6dc'; g.fillRect(bx, by, bw, bh); g.fillStyle = INK; g.font = `bold 15px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(O.badge, bx + bw / 2, by + bh / 2 + 1); }
  // arms
  const shY = neckY + 46;
  const drawArm = (s, pose) => {
    const S = [cx + s * TW * .4, shY];
    let A = ARMS[pose] || ARMS.hang;
    let [h, c] = A;
    if (pose === 'wave' || pose === 'flail') { const a = Math.sin((P.f || 0) * (pose === 'flail' ? .9 : .45) + s) * (pose === 'flail' ? 40 : 26); h = [h[0] + a, h[1] + Math.abs(a) * .3]; }
    const H = [S[0] + s * h[0], S[1] + h[1]], C = [S[0] + s * c[0], S[1] + c[1]];
    pen.limb(S, C, H, 5.2, O.sleeve || topDk);
    if (pose === 'point') pen.line([[H[0], H[1]], [H[0] + s * 22, H[1] - 2]], 5 * u * .9, INK), pen.line([[H[0], H[1]], [H[0] + s * 21, H[1] - 2]], 2.4 * u, sk);
    if (pose === 'thumb') pen.line([[H[0], H[1]], [H[0], H[1] - 22]], 5 * u * .9, INK), pen.line([[H[0], H[1]], [H[0], H[1] - 21]], 2.4 * u, sk);
    pen.inkRing(H[0], H[1], 4.6 * u, sk, 2);
    return H;
  };
  const armsBehind = P.armsBehind;
  // head
  const hY = neckY - HH * .38;
  g.save(); g.translate(cx, neckY); g.rotate(rad(P.headTilt || 0)); g.translate(-cx, -neckY);
  const head = blobPath(cx, hY, HW * .5, HH * .5, { n: 2.5, egg: .06, seed: (P.seed || 1) * 1.7, wob: .025 });
  // hair behind
  if (P.hair) { const hp = blobPath(cx, hY - HH * .1, HW * .53, HH * .45, { n: 2.4, seed: 3 }); pen.shadedFill(hp, P.hair, [cx - HW * .5, hY - HH * .6, cx + HW * .5, hY + HH * .3]); }
  pen.shadedFill(head, sk, [cx - HW * .5, hY - HH * .5, cx + HW * .5, hY + HH * .5], { dk: .86 });
  // ears
  if (!P.noEars) for (const s of [-1, 1]) { const ep = pen.ell(cx + s * HW * .5, hY + 6, 12, 18); pen.shadedFill(ep, sk, [cx + s * HW * .5 - 12, hY - 12, cx + s * HW * .5 + 12, hY + 24], { w: 3, dk: .85 }); }
  pen.shadedFill(head, sk, [cx - HW * .5, hY - HH * .5, cx + HW * .5, hY + HH * .5], { dk: .86, w: 0.01 });
  // hair fringe
  if (P.hair) pen.clip(head, () => { const fp = blobPath(cx - 10, hY - HH * .52, HW * .62, HH * .26, { n: 2.2, seed: 5 }); g.fillStyle = P.hair; g.fill(fp); });
  pen.stroke(head, 4.2 * u, INK);
  drawFace(pen, cx, hY + HH * .02, P);
  if (P.moustache) { for (const s of [-1, 1]) { const mp = pen.ell(cx + s * 12 * u, hY + HH * .02 + 15 * u, 11 * u, 5 * u, s * .25); pen.shadedFill(mp, P.moustache, [cx - 20 * u, hY, cx + 20 * u, hY + 30 * u], { w: 2 }); } }
  // hats
  const hat = P.hat;
  if (hat && hat.kind === 'nightcap') {
    const c1 = hat.color || '#3d6fd0', top0 = hY - HH * .5;
    const flop = hat.flop || 0;
    const p = new Path2D();
    p.moveTo(cx - HW * .54, top0 + 34); p.quadraticCurveTo(cx - HW * .3, top0 - 120, cx + 60 + flop, top0 - 150);
    p.quadraticCurveTo(cx + 170 + flop, top0 - 120, cx + 200 + flop * 1.4, top0 + 10);
    p.quadraticCurveTo(cx + 120, top0 - 70, cx + HW * .54, top0 + 34); p.closePath();
    pen.shadedFill(p, c1, [cx - HW * .5, top0 - 150, cx + 200, top0 + 40]);
    pen.clip(p, () => { g.strokeStyle = hat.color2 || '#f2f0ff'; g.lineWidth = 16; for (let k = -6; k < 6; k++) { g.beginPath(); g.moveTo(cx + k * 60, top0 + 60); g.lineTo(cx + k * 60 + 160, top0 - 160); g.stroke(); } });
    pen.stroke(p, 4.2 * u, INK);
    const brim = blobPath(cx, top0 + 30, HW * .58, 22, { n: 3, egg: 0, seed: 2 });
    pen.shadedFill(brim, hat.color2 || '#f2f0ff', [cx - HW * .6, top0 + 8, cx + HW * .6, top0 + 52]);
    pen.inkRing(cx + 200 + flop * 1.4, top0 + 22, 22, hat.color2 || '#f2f0ff', 2.6);
  }
  if (hat && hat.kind === 'helmet') {
    const c1 = hat.color || '#f2c230', top0 = hY - HH * .46;
    const p = new Path2D(); p.ellipse(cx, top0 + 30, HW * .5, HH * .42, 0, Math.PI, TAU); p.closePath();
    pen.shadedFill(p, c1, [cx - HW * .5, top0 - 60, cx + HW * .5, top0 + 30]);
    pen.clip(p, () => pen.line([[cx, top0 - 70], [cx, top0 + 30]], 16, shade(c1, .8)));
    pen.stroke(p, 4.2 * u, INK);
    const b = blobPath(cx + 14, top0 + 32, HW * .64, 16, { n: 3, egg: 0 });
    pen.shadedFill(b, c1, [cx - HW * .6, top0 + 16, cx + HW * .7, top0 + 48]);
  }
  g.restore(); // head
  const handL = drawArm(-1, P.armL || 'hang'), handR = drawArm(1, P.armR || 'hang');
  g.restore(); // body
  return { handL, handR };
};

// ---------- shadow figure ----------
export const drawShadow = (g, P) => {
  const u = 2.36, pen = new Pen(g, u), f = P.f || 0;
  const cx = 300, top = 120, bot = 975;
  const body = new Path2D();
  const sway = Math.sin(f * .05) * 6;
  body.moveTo(cx - 70, top + 120);
  body.bezierCurveTo(cx - 150, top - 30, cx + 150, top - 30, cx + 70, top + 120); // head dome
  body.bezierCurveTo(cx + 130, top + 210, cx + 190, top + 420, cx + 170 + sway, bot - 120);
  // wispy bottom
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = cx + 170 + sway - t * 340 - sway * 2 * t;
    const y = bot - 90 + Math.sin(f * .12 + i * 1.7) * 18 + (i % 2 ? -50 : 20);
    body.lineTo(x, y);
  }
  body.bezierCurveTo(cx - 190, top + 420, cx - 130, top + 210, cx - 70, top + 120);
  body.closePath();
  g.save();
  g.shadowColor = 'rgba(120,70,200,.9)'; g.shadowBlur = 40;
  g.fillStyle = '#0c0814'; g.fill(body); g.restore();
  const gr = g.createLinearGradient(cx - 150, top, cx + 150, bot); gr.addColorStop(0, '#2a1f44'); gr.addColorStop(.5, '#120c1e'); gr.addColorStop(1, '#07050b');
  g.fillStyle = gr; g.fill(body);
  pen.stroke(body, 3.2 * u, '#4a3a78');
  // horns
  const hn = P.horns ?? 0;
  if (hn > 0) for (const s of [-1, 1]) {
    const hx = cx + s * 64, hy = top + 30 - (P.hornLift || 0) * s * 0 - (P.hornFly || 0) * 300, ox = s * (P.hornFly || 0) * 160;
    g.save(); g.translate(hx + ox, hy); g.rotate(s * ((P.hornFly || 0) * 3)); g.scale(hn, hn);
    const p = new Path2D(); p.moveTo(-s * 22, 10); p.quadraticCurveTo(s * 10, -40, s * 40, -78); p.quadraticCurveTo(s * 14, -30, s * 26, 14); p.closePath();
    pen.shadedFill(p, '#b0232f', [-40, -80, 40, 14], { w: 3 });
    g.restore();
  }
  // arms
  for (const s of [-1, 1]) {
    const S = [cx + s * 110, top + 260];
    const pose = P.arms || 'hang';
    const H = pose === 'reach' ? [cx + s * 230, top + 300] : pose === 'claw' ? [cx + s * 200, top + 180 + Math.sin(f * .3 + s) * 10] : [cx + s * 170, top + 560];
    const C = [S[0] + s * 70, (S[1] + H[1]) / 2];
    pen.curve(S, C, H, 26, '#3b2c62'); pen.curve(S, C, H, 18, '#0c0814');
    for (let k = -1; k <= 1; k++) pen.line([H, [H[0] + s * 26 + k * 6, H[1] + 26 + k * 10]], 7, '#0c0814');
  }
  // eyes
  const ey = top + 110, mood = P.eyes || 'glare', op = P.eyeOpen ?? 1;
  if (op > 0.02) for (const s of [-1, 1]) {
    const x = cx + s * 40;
    g.save(); g.shadowColor = mood === 'sheepish' ? '#ffd27a' : '#ff3a2a'; g.shadowBlur = 44;
    const p = new Path2D();
    const h = (mood === 'sheepish' ? 16 : 20) * op;
    if (mood === 'glare') { p.moveTo(x - s * 30, ey - 14); p.quadraticCurveTo(x, ey - h * .9 - 6, x + s * 30, ey + 6); p.quadraticCurveTo(x, ey + h, x - s * 30, ey - 14); }
    else { p.ellipse(x, ey, 22, h, 0, 0, TAU); }
    g.fillStyle = '#ffef9a'; g.fill(p); g.fill(p); g.restore();
    g.fillStyle = '#fffbe8'; g.fill(p);
    if (mood === 'sheepish') { pen.dot(x - 6, ey + 4 * op, 7 * op, '#2a1408'); }
    else pen.dot(x + s * 4, ey, 5 * op, '#ff4a2a');
  }
  if (P.grin) {
    const my = ey + 70, w = 70;
    const p = new Path2D(); p.moveTo(cx - w, my); p.quadraticCurveTo(cx, my + 60, cx + w, my); p.quadraticCurveTo(cx, my + 24, cx - w, my); p.closePath();
    g.save(); g.shadowColor = '#ff3a2a'; g.shadowBlur = 20; g.fillStyle = '#ffe9b0'; g.fill(p); g.restore();
    g.strokeStyle = '#0c0814'; g.lineWidth = 4; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 18, my + 4); g.lineTo(cx + i * 18, my + 50); g.stroke(); }
  }
  if (P.sweat) { const sx = cx + 120, sy = top + 40 + (f % 30) * 1.2; const p = new Path2D(); p.moveTo(sx, sy - 18); p.quadraticCurveTo(sx + 12, sy + 4, sx, sy + 10); p.quadraticCurveTo(sx - 12, sy + 4, sx, sy - 18); pen.stroke(p, 4, INK); g.fillStyle = '#9fd8ff'; g.fill(p); }
};

// ---------- creatures (side view, 600x800 design, feet at y=780) ----------
const ik2 = (h, f, L1, L2, back = -1) => {
  const dx = f[0] - h[0], dy = f[1] - h[1], d = Math.min(L1 + L2 - 1, Math.hypot(dx, dy));
  const a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const s = back < 0 ? 1 : -1;
  return [h[0] + Math.cos(a + s * c) * L1, h[1] + Math.sin(a + s * c) * L1];
};

const googly = (pen, x, y, r, look = [0, 0], lid = 0) => {
  pen.inkRing(x, y, r, '#fff', 2.4);
  pen.dot(x + look[0] * r * .45, y + look[1] * r * .45, r * .42, INK);
  pen.dot(x + look[0] * r * .45 - r * .14, y + look[1] * r * .45 - r * .16, r * .12, '#fff');
  if (lid > 0) { const p = new Path2D(); p.ellipse(x, y, r + 1, r + 1, 0, Math.PI, TAU); pen.g.save(); pen.g.beginPath(); pen.g.rect(x - r - 6, y - r - 6, 2 * r + 12, (2 * r + 6) * lid); pen.g.clip(); pen.g.fillStyle = '#c95a6a'; pen.g.beginPath(); pen.g.arc(x, y, r + 1, 0, TAU); pen.g.fill(); pen.g.restore(); pen.line([[x - r - 4, y - r + (2 * r) * lid], [x + r + 4, y - r + (2 * r) * lid]], 7, INK); }
};

export const amygdalaSide = (g, P) => {
  const u = 2.2, pen = new Pen(g, u), f = P.f || 0;
  const mode = P.mode || 'stand';
  const ph = (P.phase || 0) * TAU;
  const bob = mode === 'run' ? Math.abs(Math.sin(ph)) * 22 : Math.sin(f * .1) * 4;
  const bx = 300, by = 440 - bob, lean = mode === 'run' ? .18 : 0;
  // legs
  for (const s of [0, 1]) {
    const hip = [bx - 20 + s * 40, by + 150];
    let foot = [bx - 10 + s * 30, 772];
    if (mode === 'run') { const p = ph + s * Math.PI; foot = [bx + 70 * Math.cos(p), 772 - Math.max(0, Math.sin(p)) * 70]; }
    if (mode === 'panic') { const p = f * .9 + s * Math.PI; foot = [bx - 20 + s * 40 + Math.cos(p) * 16, 772 - Math.max(0, Math.sin(p)) * 34]; }
    const knee = ik2(hip, foot, 110, 110, -1);
    pen.limb(hip, knee, foot, 7, s ? '#b34a5c' : '#9c3c4e');
    const sh = pen.ell(foot[0] + 16, foot[1] - 4, 26, 13);
    pen.shadedFill(sh, '#3a2a4a', [foot[0] - 10, foot[1] - 17, foot[0] + 42, foot[1] + 9], { w: 3 });
  }
  g.save(); g.translate(bx, by + 150); g.rotate(lean); g.translate(-bx, -(by + 150));
  // back arm
  const fl = mode === 'panic' || mode === 'run' ? Math.sin(f * .8) : 0;
  pen.limb([bx - 60, by + 30], [bx - 130, by - 20 + fl * 30], [bx - 150, by - 90 - fl * 40], 5, '#9c3c4e'); pen.inkRing(bx - 150, by - 90 - fl * 40, 12, '#e2707e', 2);
  // almond body (pointed top)
  const body = new Path2D();
  body.moveTo(bx + 10, by - 230);
  body.bezierCurveTo(bx + 190, by - 120, bx + 170, by + 160, bx, by + 175);
  body.bezierCurveTo(bx - 170, by + 160, bx - 175, by - 110, bx + 10, by - 230);
  pen.shadedFill(body, P.color || '#e2707e', [bx - 170, by - 230, bx + 170, by + 180], { dk: .72 });
  // almond skin texture lines
  pen.clip(body, () => { g.globalAlpha = .35; for (let i = 0; i < 6; i++) pen.curve([bx - 120 + i * 45, by - 150], [bx - 140 + i * 50, by], [bx - 110 + i * 45, by + 160], 4, '#a8475a'); g.globalAlpha = 1; });
  pen.stroke(body, 4.4 * u, INK);
  // eye
  const look = P.look || [1, 0];
  googly(pen, bx + 55, by - 50, mode === 'smug' ? 44 : 56, look, mode === 'smug' ? .48 : 0);
  // brows
  if (mode === 'panic' || mode === 'run') pen.line([[bx + 10, by - 125], [bx + 100, by - 140]], 9, INK);
  else if (mode === 'smug') pen.line([[bx + 10, by - 108], [bx + 100, by - 100]], 9, INK);
  // mouth
  if (mode === 'smug') pen.curve([bx + 40, by + 50], [bx + 80, by + 64], [bx + 120, by + 38], 8, INK);
  else if (mode === 'stand') pen.curve([bx + 40, by + 50], [bx + 80, by + 70], [bx + 120, by + 50], 8, INK);
  else { const p = pen.ell(bx + 85, by + 60, 30, 40 + Math.sin(f * .7) * 8); pen.stroke(p, 8, INK); g.fillStyle = '#5a1a2a'; g.fill(p); }
  // front arm
  pen.limb([bx + 40, by + 40], [bx + 120, by - 10 - fl * 30], [bx + 150, by - 90 + fl * 40], 5, '#b34a5c'); pen.inkRing(bx + 150, by - 90 + fl * 40, 12, '#e2707e', 2);
  // siren
  if (P.siren !== undefined) {
    const sx = bx + 10, sy = by - 228;
    const base = pen.poly([[sx - 34, sy + 6], [sx + 34, sy + 6], [sx + 28, sy - 8], [sx - 28, sy - 8]]); pen.shadedFill(base, '#555a6e', [sx - 34, sy - 8, sx + 34, sy + 6], { w: 3 });
    const on = P.siren > 0;
    const dome = new Path2D(); dome.ellipse(sx, sy - 8, 26, 34, 0, Math.PI, TAU); dome.closePath();
    if (on) { g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 50; g.fillStyle = '#ff4a3a'; g.fill(dome); g.restore(); }
    pen.shadedFill(dome, on ? '#ff5a4a' : '#9a3a3a', [sx - 26, sy - 42, sx + 26, sy - 8], { w: 3 });
    if (on) { const a = f * .5; g.save(); g.globalAlpha = .55; g.fillStyle = '#ff6a50'; for (const k of [0, Math.PI]) { g.beginPath(); g.moveTo(sx, sy - 22); g.arc(sx, sy - 22, 150, a + k - .25, a + k + .25); g.closePath(); g.fill(); } g.restore(); }
  }
  // sweat drops when panic
  if (mode === 'panic' || mode === 'run') for (let i = 0; i < 3; i++) { const t = ((f * .07 + i / 3) % 1); const x = bx - 120 - t * 90 + i * 30, y = by - 160 + t * 120; const p = new Path2D(); p.moveTo(x, y - 18); p.quadraticCurveTo(x + 12, y + 4, x, y + 10); p.quadraticCurveTo(x - 12, y + 4, x, y - 18); g.globalAlpha = 1 - t; pen.stroke(p, 4, INK); g.fillStyle = '#9fd8ff'; g.fill(p); g.globalAlpha = 1; }
  g.restore();
};

export const catSide = (g, P) => {
  const u = 2.2, pen = new Pen(g, u), f = P.f || 0;
  const C = '#7a7c96', Cd = '#5b5d78';
  const bx = 280, by = 600;
  // tail
  const tw = Math.sin(f * .12) * 30;
  pen.limb([bx - 150, by - 10], [bx - 260, by - 60 + tw], [bx - 220, by - 200 + tw], 11, C);
  // back legs
  for (const [x, c] of [[bx - 110, Cd], [bx + 90, Cd]]) pen.limb([x, by + 40], [x + 6, by + 110], [x, by + 176], 9, c);
  const body = blobPath(bx, by, 175, 85, { n: 2.4, egg: .1, seed: 2 });
  pen.shadedFill(body, C, [bx - 175, by - 85, bx + 175, by + 85]);
  pen.clip(body, () => { for (let i = 0; i < 4; i++) pen.line([[bx - 100 + i * 50, by - 90], [bx - 120 + i * 50, by - 20]], 14, Cd); });
  pen.stroke(body, 4.2 * u, INK);
  for (const x of [bx - 80, bx + 120]) { pen.limb([x, by + 40], [x - 4, by + 110], [x, by + 176], 9, C); pen.inkRing(x + 8, by + 178, 13, C, 2); }
  // head
  const hx = bx + 170, hy = by - 120 + (P.headDip || 0);
  for (const s of [-1, 1]) { const e = pen.poly([[hx + s * 70 - 34, hy - 50], [hx + s * 70 + 20 * s, hy - 150], [hx + s * 70 + 34, hy - 40]]); pen.shadedFill(e, C, [hx - 110, hy - 150, hx + 110, hy - 40], { w: 3.4 }); }
  const head = blobPath(hx, hy, 110, 92, { n: 2.3, egg: .1, seed: 4 });
  pen.shadedFill(head, C, [hx - 110, hy - 92, hx + 110, hy + 92]);
  pen.clip(head, () => { pen.line([[hx - 20, hy - 100], [hx - 10, hy - 50]], 12, Cd); pen.line([[hx + 20, hy - 100], [hx + 14, hy - 52]], 12, Cd); });
  pen.stroke(head, 4.2 * u, INK);
  const look = P.look || [-1, 0];
  googly(pen, hx - 38, hy - 12, 34, look, P.lid || 0);
  googly(pen, hx + 42, hy - 12, 34, look, P.lid || 0);
  pen.dot(hx + 2, hy + 30, 10, '#d9737f');
  pen.curve([hx - 20, hy + 52], [hx + 2, hy + 62], [hx + 2, hy + 40], 5, INK); pen.curve([hx + 2, hy + 40], [hx + 4, hy + 62], [hx + 26, hy + 50], 5, INK);
  for (const s of [-1, 1]) for (const k of [-1, 1]) pen.line([[hx + s * 50, hy + 38 + k * 6], [hx + s * 120, hy + 30 + k * 16]], 3, INK);
};

// ---------- fx sprites (512x512) ----------
export const drawFx = (g, kind, t, opt = {}) => {
  const pen = new Pen(g, 2), S = 512, c = S / 2;
  if (kind === 'puff') {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + .3, r = 40 + t * 150, rr = (60 - t * 40) * (0.8 + .4 * Math.sin(i * 3.1));
      if (rr <= 2) continue;
      g.globalAlpha = Math.max(0, 1 - t * t);
      pen.inkRing(c + Math.cos(a) * r, c + Math.sin(a) * r * .7, rr, opt.col || '#f4f0f8', 3);
    }
    g.globalAlpha = 1;
  }
  if (kind === 'smoke') { // dark smoke puff
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = 30 + t * 170, rr = (70 - t * 50) * (0.8 + .4 * Math.sin(i * 2.3)); if (rr <= 2) continue; g.globalAlpha = Math.max(0, 1 - t); pen.dot(c + Math.cos(a) * r, c + Math.sin(a) * r * .8, rr + 4, '#5a4590'); pen.dot(c + Math.cos(a) * r, c + Math.sin(a) * r * .8, rr, '#1a1228'); }
    g.globalAlpha = 1;
  }
  if (kind === 'zzz') {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const k = (t + i / 3) % 1, x = c - 100 + k * 180 + Math.sin(k * 8) * 20, y = S - 80 - k * 360, sz = 60 + k * 70;
      g.globalAlpha = Math.sin(k * Math.PI); g.font = `bold ${sz}px ${FONT}`; g.lineWidth = 12; g.strokeStyle = INK; g.strokeText('Z', x, y); g.fillStyle = opt.col || '#cfe0ff'; g.fillText('Z', x, y);
    }
    g.globalAlpha = 1;
  }
  if (kind === 'stars') {
    for (let i = 0; i < 5; i++) {
      const a = t * 4 + i / 5 * TAU, x = c + Math.cos(a) * 170, y = c + Math.sin(a) * 60;
      const p = new Path2D(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 18 : 42, q = k / 10 * TAU - Math.PI / 2; const px = x + Math.cos(q) * r, py = y + Math.sin(q) * r; k ? p.lineTo(px, py) : p.moveTo(px, py); } p.closePath();
      pen.stroke(p, 9, INK); g.fillStyle = '#ffe14a'; g.fill(p);
    }
  }
  if (kind === 'lock') {
    const k = opt.col || '#f2c230';
    const sh = new Path2D(); sh.arc(c, c - 40, 90, Math.PI, 0); pen.stroke(sh, 52, INK); pen.stroke(sh, 34, '#b8bccc');
    const b = new Path2D(); b.roundRect(c - 140, c - 50, 280, 220, 30); pen.shadedFill(b, k, [c - 140, c - 50, c + 140, c + 170], { w: 5 });
    pen.dot(c, c + 40, 26, INK); pen.line([[c, c + 40], [c, c + 110]], 22, INK);
  }
  if (kind === 'moon') {
    g.save(); g.shadowColor = '#fff7c8'; g.shadowBlur = 40;
    const p = new Path2D(); p.arc(c, c, 150, 0, TAU); g.fillStyle = '#fff2b0'; g.fill(p); g.restore();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(c + 80, c - 50, 140, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
  }
  if (kind === 'glow') {
    const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, opt.col || 'rgba(255,200,120,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  }
  if (kind === 'blob') {
    const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(10,6,14,.55)'); gr.addColorStop(.6, 'rgba(10,6,14,.3)'); gr.addColorStop(1, 'rgba(10,6,14,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  }
  if (kind === 'cloud') {
    for (const [x, y, r] of [[c - 120, c + 30, 90], [c, c - 20, 120], [c + 120, c + 30, 90], [c - 40, c + 60, 80], [c + 60, c + 60, 80]]) pen.dot(x, y, r + 7, INK);
    for (const [x, y, r] of [[c - 120, c + 30, 90], [c, c - 20, 120], [c + 120, c + 30, 90], [c - 40, c + 60, 80], [c + 60, c + 60, 80]]) pen.dot(x, y, r, opt.col || '#d9d0ff');
    g.globalAlpha = .5; pen.dot(c - 30, c - 60, 40, '#fff'); g.globalAlpha = 1;
  }
  if (kind === 'text') {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${opt.size || 130}px ${FONT}`;
    g.lineWidth = 26; g.strokeStyle = INK; g.lineJoin = 'round'; g.strokeText(opt.text, c, c); g.fillStyle = opt.col || '#fff'; g.fillText(opt.text, c, c);
  }
  if (kind === 'spark') {
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r0 = 40 + t * 120, r1 = r0 + 80 * (1 - t); pen.line([[c + Math.cos(a) * r0, c + Math.sin(a) * r0], [c + Math.cos(a) * r1, c + Math.sin(a) * r1]], 18, INK); pen.line([[c + Math.cos(a) * r0, c + Math.sin(a) * r0], [c + Math.cos(a) * r1, c + Math.sin(a) * r1]], 9, opt.col || '#fff0a0'); }
  }
};

// ---------- dream bubble (1024x900) ----------
export const drawBubble = (g, state, f, heroP) => {
  const pen = new Pen(g, 2.4), W = 1024;
  // bubble shape
  const circles = [[512, 400, 330], [260, 360, 200], [770, 360, 200], [380, 220, 190], [650, 220, 190], [512, 560, 230]];
  g.fillStyle = INK; for (const [x, y, r] of circles) { g.beginPath(); g.arc(x, y, r + 14, 0, TAU); g.fill(); }
  pen.inkRing(240, 760, 40, '#efe8ff', 4); pen.inkRing(160, 850, 22, '#efe8ff', 4);
  const bub = new Path2D(); for (const [x, y, r] of circles) { bub.moveTo(x + r, y); bub.arc(x, y, r, 0, TAU); }
  g.fillStyle = '#efe8ff'; g.fill(bub);
  pen.clip(bub, () => {
    const gr = g.createLinearGradient(0, 100, 0, 800); gr.addColorStop(0, state === 'hurt' ? '#ffd9c8' : '#cfe6ff'); gr.addColorStop(1, state === 'hurt' ? '#ffb39a' : '#b5f0c8'); g.fillStyle = gr; g.fillRect(0, 0, W, 900);
    g.fillStyle = state === 'hurt' ? '#c98a6a' : '#7cc88a'; g.fillRect(0, 640, W, 300);
    if (state === 'dream') {
      // dragon on the right
      const dx = 760, dy = 520 + Math.sin(f * .2) * 8;
      const db = blobPath(dx, dy, 150, 110, { n: 2.3, seed: 2 }); pen.shadedFill(db, '#4fae5a', [dx - 150, dy - 110, dx + 150, dy + 110]);
      googly(pen, dx - 60, dy - 40, 30, [-1, 0]);
      for (let i = 0; i < 4; i++) { const t = pen.poly([[dx - 20 + i * 40, dy - 100], [dx + i * 40, dy - 150], [dx + 20 + i * 40, dy - 100]]); pen.shadedFill(t, '#f2c230', [dx - 20, dy - 150, dx + 160, dy - 100], { w: 3 }); }
      pen.line([[dx - 130, dy + 30], [dx - 100, dy + 40]], 8, INK);
      pen.dot(dx - 160, dy + 20 + Math.sin(f * .7) * 5, 18, '#ff8a3a');
    } else {
      // lamp knocked over
      g.save(); g.translate(780, 640); g.rotate(.9);
      const lb = pen.poly([[-40, 0], [40, 0], [16, -160], [-16, -160]]); pen.shadedFill(lb, '#8a5a3a', [-40, -160, 40, 0]);
      const sh = pen.poly([[-90, -150], [90, -150], [50, -280], [-50, -280]]); pen.shadedFill(sh, '#f2d38a', [-90, -280, 90, -150]);
      g.restore();
      g.save(); g.translate(560, 340); g.scale(.5, .5); drawFx(g, 'stars', f * .03); g.restore();
    }
  });
  // mini hero
  g.save(); g.translate(state === 'dream' ? 220 : 360, state === 'dream' ? 160 : 170); g.scale(.6, .6);
  drawBean(g, { ...heroP, expr: state === 'dream' ? 'grin' : 'pained', armL: state === 'dream' ? 'up' : 'cheek', armR: state === 'dream' ? 'point' : 'cheek', legs: state === 'dream' ? { kind: 'kick' } : { kind: 'stand' }, tilt: state === 'dream' ? -14 : 10, f });
  g.restore();
  if (state === 'dream') { g.font = `bold 70px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 14; g.strokeStyle = INK; g.strokeText('HI-YAH!', 470, 200); g.fillStyle = '#ffe14a'; g.fillText('HI-YAH!', 470, 200); }
  else { g.font = `bold 80px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 14; g.strokeStyle = INK; g.strokeText('OUCH!', 700, 220); g.fillStyle = '#ff6a5a'; g.fillText('OUCH!', 700, 220); }
};
