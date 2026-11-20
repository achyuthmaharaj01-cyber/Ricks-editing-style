// Story: every function is a pure function of frame f.
import { clamp, lerp, lerp3, ramp, M, camFromKeys, idle, blinkAt, walk } from './motion.js';

export const FPS = 30, FRAMES = 2315;
export const HQX = 100;
export const H = (x, y, z) => [x + HQX, y, z];

// ---------------- layout ----------------
export const BED = {
  hero: [0.3, 0.64, -0.35], // soles of the lying card
  heroTilt: 0.11,
  face: [0.3, 0.84, -1.82],
  chest: [0.3, 0.82, -1.25],
  corner: [-1.95, 0, -2.0],
  sit: [0.3, -0.06, -1.78],
};
export const HQ = {
  lever: H(-1.5, 1.15, -2.8), console: H(-1.5, 0, -2.8),
  operator: H(-0.5, 0, -2.25),
  tube: H(1.45, 0, -3.7), tubeTop: 1.35,
  desk: H(-4.0, 0, 0.2), mind: H(-4.0, 0, -0.42),
  projector: H(3.6, 0, 0.2), lens: H(3.0, 1.45, 0.62),
  amyg: H(0, 0, 0.8),
};

// ---------------- shots ----------------
const S = (id, f0, f1, set, light, keys, extra = {}) => ({ id, f0, f1, set, light, keys, ...extra });
export const SHOTS = [
  S('hook', 0, 136, 'bed', 'night', [
    { f: 0, pos: [0.3, 2.85, -1.0], look: [0.3, 0.84, -1.72], fov: 36 },
    { f: 38, pos: [0.32, 2.9, -0.98], look: [0.3, 0.84, -1.72], fov: 35.5 },
    { f: 78, pos: [2.4, 2.6, 0.9], look: [-0.5, 1.05, -1.75], fov: 50, ease: 'easeOut', path: [[1.2, 3.1, -0.4]] },
    { f: 136, pos: [2.36, 2.58, 0.85], look: [-0.52, 1.05, -1.75], fov: 49 },
  ], { dof: [[0, 9, 1.75], [40, 9, 1.75], [70, 0, 4]] }),
  S('demon', 136, 172, 'bed', 'night', [
    { f: 136, pos: [-0.6, 1.75, -0.35], look: [-1.95, 1.8, -2.0], fov: 38 },
    { f: 172, pos: [-0.8, 1.76, -0.6], look: [-1.95, 1.82, -2.0], fov: 37, roll: -2 },
  ], { dof: [[136, 8, 1.95]], kicks: [{ f: 154, a: .012 }] }),
  S('dive', 172, 203, 'bed', 'night', [
    { f: 172, pos: [0.3, 2.45, -1.25], look: [0.3, 0.84, -1.84], fov: 38 },
    { f: 203, pos: [0.3, 1.12, -1.78], look: [0.3, 0.8, -1.88], fov: 30, ease: 'easeIn' },
  ], { flash: [[196, 203, 209]] }),
  S('hq', 203, 318, 'hq', 'hq', [
    { f: 203, pos: H(0.3, 6.8, 5.6), look: H(0, 3.9, -4.2), fov: 48 },
    { f: 244, pos: H(0, 3.5, 7.4), look: H(0, 3.1, -4.2), fov: 50, ease: 'easeOut' },
    { f: 258, pos: H(0.05, 3.5, 7.3), look: H(0, 3.1, -4.2), fov: 49.6 },
    { f: 278, pos: H(1.5, 3.7, 0.5), look: H(1.5, 3.65, -4.2), fov: 38, path: [H(1.0, 3.6, 3.6)] },
    { f: 318, pos: H(1.5, 3.7, 0.35), look: H(1.5, 3.65, -4.2), fov: 37.4 },
  ], { dof: [[258, 0, 5], [280, 6, 4.6]] }),
  S('lever', 318, 568, 'hq', 'hq', [
    { f: 318, pos: H(-0.55, 2.2, 3.8), look: H(-1.05, 1.75, -2.6), fov: 44 },
    { f: 470, pos: H(-0.6, 2.1, 3.3), look: H(-1.05, 1.7, -2.6), fov: 43 },
    { f: 508, pos: H(-1.15, 1.5, 1.3), look: H(-1.4, 1.25, -2.8), fov: 38 },
    { f: 568, pos: H(-1.18, 1.5, 1.15), look: H(-1.4, 1.25, -2.8), fov: 37.5 },
  ], { kicks: [{ f: 460, a: .01 }, { f: 540, a: .012 }], dof: [[318, 0, 6], [500, 7, 2.9]] }),
  S('tanks', 568, 765, 'hq', 'hq', [
    { f: 568, pos: H(1.45, 2.0, 1.6), look: H(1.45, 1.75, -3.7), fov: 42 },
    { f: 698, pos: H(1.5, 1.95, 1.4), look: H(1.45, 1.72, -3.7), fov: 41 },
    { f: 728, pos: H(3.35, 1.7, -0.75), look: H(3.4, 1.6, -4.15), fov: 46, path: [H(2.4, 1.8, 0.0)] },
    { f: 765, pos: H(3.35, 1.7, -0.85), look: H(3.4, 1.6, -4.15), fov: 45.5 },
  ], { dof: [[568, 0, 5]] }),
  S('why', 765, 897, 'bed', 'night', [
    { f: 765, pos: [2.05, 1.95, 0.35], look: [0.55, 0.95, -1.35], fov: 40 },
    { f: 784, pos: [2.0, 1.95, 0.3], look: [0.55, 0.95, -1.35], fov: 39.6 },
    { f: 806, pos: [2.15, 2.25, 0.55], look: [0.45, 1.35, -1.5], fov: 44, ease: 'easeOut' },
    { f: 897, pos: [2.1, 2.25, 0.45], look: [0.45, 1.35, -1.5], fov: 43 },
  ], { dof: [[765, 7, 2.2], [790, 0, 3]] }),
  S('mind', 897, 1078, 'hq', 'hq', [
    { f: 897, pos: H(-3.5, 1.6, 3.7), look: H(-4.0, 1.0, -0.1), fov: 40 },
    { f: 995, pos: H(-3.55, 1.58, 3.4), look: H(-4.0, 1.0, -0.1), fov: 39 },
    { f: 1028, pos: H(-0.45, 1.85, 1.6), look: H(-0.95, 1.45, -2.5), fov: 40, ease: 'smooth', path: [H(-2.2, 2.0, 2.4)] },
    { f: 1078, pos: H(-0.5, 1.82, 1.4), look: H(-0.95, 1.45, -2.5), fov: 39 },
  ], { dof: [[897, 7, 3.4], [1000, 0, 4]] }),
  S('awake', 1078, 1222, 'bed', 'night', [
    { f: 1078, pos: [0.3, 2.85, -0.8], look: [0.3, 0.84, -1.55], fov: 38 },
    { f: 1200, pos: [0.3, 2.55, -0.9], look: [0.3, 0.84, -1.55], fov: 35, roll: 4, ease: 'smooth' },
    { f: 1222, pos: [0.3, 2.53, -0.91], look: [0.3, 0.84, -1.55], fov: 34.8, roll: 4.4 },
  ], { kicks: [{ f: 1125, a: .006 }, { f: 1143, a: .012 }] }),
  S('alarm', 1222, 1430, 'hq', 'hq', [
    { f: 1222, pos: H(0, 2.6, 7.0), look: H(0, 2.4, -2.0), fov: 47 },
    { f: 1290, pos: H(0.05, 2.5, 6.6), look: H(0, 2.3, -2.0), fov: 46 },
    { f: 1326, pos: H(0.4, 1.35, 4.3), look: H(0, 0.95, 0.8), fov: 40, ease: 'easeOut' },
    { f: 1380, pos: H(0.38, 1.38, 4.2), look: H(0, 0.95, 0.8), fov: 39.5 },
    { f: 1400, pos: H(0.3, 1.9, 5.4), look: H(0, 0.85, 0.6), fov: 44, ease: 'easeOut' },
    { f: 1430, pos: H(0.3, 1.92, 5.3), look: H(0, 0.85, 0.6), fov: 43.6 },
  ], { kicks: [{ f: 1255, a: .01 }, { f: 1334, a: .008 }], dof: [[1300, 0, 5], [1326, 7, 3.6], [1390, 0, 5]] }),
  S('dream', 1430, 1562, 'hq', 'hq', [
    { f: 1430, pos: H(1.9, 2.0, 3.7), look: H(3.35, 1.4, 0.2), fov: 40 },
    { f: 1562, pos: H(2.15, 1.85, 3.1), look: H(3.4, 1.4, 0.25), fov: 37, ease: 'smooth' },
  ], { dof: [[1430, 7, 3.8], [1562, 7, 3.2]] }),
  S('project', 1562, 1712, 'hq', 'hq', [
    { f: 1562, pos: H(2.15, 1.85, 3.1), look: H(3.4, 1.4, 0.25), fov: 37 },
    { f: 1630, pos: H(2.2, 1.8, 2.9), look: H(3.3, 1.42, 0.35), fov: 36.4 },
    { f: 1650, pos: H(2.35, 1.65, 2.3), look: H(3.0, 1.45, 0.62), fov: 36, ease: 'easeOut' },
    { f: 1712, pos: H(2.9, 1.47, 0.95), look: H(3.0, 1.45, 0.62), fov: 30, ease: 'easeIn' },
  ], { kicks: [{ f: 1634, a: .01 }], flash: [[1704, 1712, 1718]] }),
  S('figure', 1712, 1850, 'bed', 'night', [
    { f: 1712, pos: [2.4, 2.6, 0.9], look: [-0.5, 1.05, -1.75], fov: 50 },
    { f: 1782, pos: [2.35, 2.58, 0.85], look: [-0.5, 1.05, -1.75], fov: 49 },
    { f: 1814, pos: [2.0, 2.75, -0.55], look: [0.2, 0.95, -1.55], fov: 44, ease: 'smooth' },
    { f: 1850, pos: [1.97, 2.72, -0.58], look: [0.2, 0.95, -1.55], fov: 43.4, roll: 3 },
  ], { kicks: [{ f: 1758, a: .008 }, { f: 1810, a: .016 }], projected: true }),
  S('catchup', 1850, 1972, 'hq', 'hq', [
    { f: 1850, pos: H(-0.45, 1.85, 2.4), look: H(-0.95, 1.45, -2.5), fov: 40 },
    { f: 1928, pos: H(-0.5, 1.82, 2.2), look: H(-0.95, 1.45, -2.5), fov: 39 },
    { f: 1944, pos: H(1.45, 1.6, 1.9), look: H(1.45, 1.25, -3.7), fov: 42, ease: 'easeOut' },
    { f: 1972, pos: H(1.45, 1.6, 1.75), look: H(1.45, 1.25, -3.7), fov: 41.5 },
  ], { kicks: [{ f: 1862, a: .006 }, { f: 1915, a: .014 }], dof: [[1850, 6, 4.4], [1935, 0, 5]] }),
  S('vanish', 1972, 2018, 'bed', 'night', [
    { f: 1972, pos: [1.97, 2.72, -0.58], look: [0.2, 0.95, -1.55], fov: 43 },
    { f: 2018, pos: [2.05, 2.85, -0.45], look: [0.2, 0.95, -1.55], fov: 45, ease: 'easeOut' },
  ], { kicks: [{ f: 1993, a: .01 }] }),
  S('oops', 2018, 2203, 'hq', 'hq', [
    { f: 2018, pos: H(-0.25, 1.65, 3.4), look: H(-0.35, 1.25, -1.9), fov: 41 },
    { f: 2203, pos: H(-0.3, 1.6, 2.7), look: H(-0.35, 1.25, -1.9), fov: 39 },
  ], { kicks: [{ f: 2177, a: .01 }], dof: [[2018, 6, 4.4]] }),
  S('twist', 2203, 2315, 'bed', 'night', [
    { f: 2203, pos: [2.65, 1.62, -0.25], look: [-0.85, 1.55, -1.9], fov: 42 },
    { f: 2296, pos: [2.35, 1.58, -0.7], look: [-0.8, 1.6, -1.95], fov: 38, roll: 4, ease: 'smooth' },
    { f: 2315, pos: [2.33, 1.58, -0.73], look: [-0.82, 1.62, -1.95], fov: 37, roll: 4.5, ease: 'easeOut' },
  ], { kicks: [{ f: 2300, a: .006 }], dof: [[2203, 5, 2.4], [2286, 6, 4.0]] }),
];

export const shotAt = (f) => SHOTS.find((s) => f >= s.f0 && f < s.f1) || SHOTS[SHOTS.length - 1];

export const camAt = (f) => {
  const s = shotAt(f);
  const c = camFromKeys(s.keys, f, { kicks: s.kicks || [] });
  return { ...c, shot: s };
};

// DOF: piecewise [f, cinf, focus] with ~14 frame racks
export const dofAt = (f) => {
  const s = shotAt(f), D = s.dof || [[s.f0, 0, 5]];
  let a = D[0], b = null;
  for (let i = 0; i < D.length; i++) if (f >= D[i][0]) { a = D[i]; b = D[i + 1] || null; }
  if (b && f > b[0] - 14) { const t = M.smooth((f - (b[0] - 14)) / 14); return { cinf: lerp(a[1], b[1], t), focus: lerp(a[2], b[2], t) }; }
  return { cinf: a[1], focus: a[2] };
};

// ---------------- lights ----------------
export const LIGHTS = {
  night: {
    sunAz: 150, sunEl: 38, sunCol: '#9fb4ff', sunI: 1.9,
    hemiSky: '#6574b8', hemiGround: '#3a3048', hemiI: 1.05,
    skyTop: '#0b1030', skyHor: '#2a3566', fog: [60, 300],
    sat: 1.1, gain: [0.95, 0.97, 1.08], lift: [0.008, 0.01, 0.028], vig: .34,
    lamp: { col: '#ffb070', I: 3.2 }, cardTint: '#d4d8f4', shadowExt: 4,
  },
  hq: {
    sunAz: -28, sunEl: 52, sunCol: '#fff3df', sunI: 2.35,
    hemiSky: '#f2ddd2', hemiGround: '#8a6050', hemiI: 1.15,
    skyTop: '#3a2140', skyHor: '#c98a8a', fog: [60, 400],
    sat: 1.12, gain: [1.0, 0.97, 0.92], lift: [0, 0, 0], vig: .24,
    lamp: null, cardTint: '#fff6ee', shadowExt: 8,
  },
};

export const lightFor = (f) => {
  const s = shotAt(f), L = { ...LIGHTS[s.light] };
  // alarm: red pulse
  const al = alarmAt(f);
  if (al > 0) {
    const p = .5 + .5 * Math.sin(f * .42);
    L.gain = [1 + .22 * al * p, 1 - .3 * al * p, 1 - .32 * al * p];
    L.alarm = al * (.4 + .6 * p);
  }
  if (s.projected) {
    const k = ramp(f, 1712, 1740) * (1 - ramp(f, 1838, 1850));
    L.gain = [L.gain[0] * (1 + .12 * k), L.gain[1] * (1 - .06 * k), L.gain[2] * (1 + .18 * k)];
    L.purple = k;
  }
  if (s.id === 'vanish') { const k = 1 - ramp(f, 1993, 2008); L.purple = k * .9; }
  // flash
  L.flash = 0;
  for (const sh of SHOTS) for (const [a, m, b] of (sh.flash || [])) {
    if (f >= a && f <= b) L.flash = Math.max(L.flash, f <= m ? M.easeIn((f - a) / (m - a)) : 1 - M.easeOut((f - m) / (b - m)));
  }
  // the sting: brief darkening on the twist
  if (f >= 2203) L.vig = .34 + .1 * ramp(f, 2203, 2300);
  L.target = s.set === 'bed' ? [-0.4, 0.8, -1.4] : camAt(f).look;
  return L;
};

export const alarmAt = (f) => (f >= 1252 && f < 1430) ? ramp(f, 1252, 1258) : (f >= 1850 && f < 1862 ? 0 : 0);

// ---------------- world state ----------------
export const worldAt = (f) => {
  const W = {};
  // lever: OFF (+.7) -> ON (-.7) at 456-462; back OFF at 1912-1918
  let lv = 0.7;
  if (f >= 448) { const t = (f - 448) / 14; lv = lerp(0.7, -0.7, M.anticip(t, .08)); }
  if (f >= 1906) { const t = (f - 1906) / 12; lv = lerp(-0.7, 0.7, M.anticip(t, .1)); }
  W.lever = lv;
  // padlock: clamps at 536-542, pops off at 1915
  W.padlock = f < 534 ? 0 : f < 1915 ? M.back((f - 534) / 8) : 0;
  W.padlockFly = f >= 1915 ? (f - 1915) : -1;
  W.padGlint = f >= 1050 && f < 1066 ? (f - 1050) / 16 : -1;
  // REM SLEEP sign
  W.rem = f >= 372 ? (f < 380 ? ((f - 372) % 3 < 1.5 ? 1 : .2) : 1) : 0;
  // clock glitch
  W.glitch = f >= 200 && f < 318 ? 1 : 0;
  W.clockA = W.glitch ? (Math.sin(f * 2.7) * 1.3 + Math.sin(f * 7.9) * .7) : f * .002;
  W.clockB = W.glitch ? (Math.sin(f * 1.3 + 2) * 2.0) : f * .0003;
  W.glitchLamp = W.glitch && (Math.floor(f / 3) % 3 !== 0) ? 1 : 0;
  // calendar locks
  W.locks = [277, 281, 285, 289, 293, 296, 300, 303].map((a) => clamp((f - a) / 6));
  // fluid: flood 585-640 ; drain 1944-1966
  let top = 1, bot = 1;
  if (f >= 585) bot = 1 - M.smooth((f - 585) / 55);
  if (f >= 1944) top = 1 - M.smooth((f - 1944) / 22);
  if (f >= 1966) { top = 0; bot = 0; }
  W.fluid = [bot, top]; // fraction from bottom(0) to top(1): segment [bot..top] where 1 = tube top
  W.tankGlow = [clamp((f - 655) / 6), clamp((f - 677) / 6)];
  W.tankLabel = [f < 655 ? 0 : M.back((f - 655) / 9), f < 677 ? 0 : M.back((f - 677) / 9)];
  W.lamps = [710, 721, 731, 741].map((a) => (f >= a && f < 1944 + 10) ? 0 : 1);
  W.reels = f * 0.09;
  W.dreamSwitch = f >= 1508 ? .5 + Math.sin(f * 1.7) * .08 * (f < 1560 ? 1 : .3) : (f > 1440 ? .5 : 0.5);
  W.beam = f >= 1630 && f < 1712 ? M.spring((f - 1630) / 20, 2, 6) : 0;
  W.gears = f * 0.02;
  W.alarm = alarmAt(f);
  W.curtain = f;
  W.bubble = 0;
  return W;
};

// ---------------- actors ----------------
const HERO = {
  skin: '#ffe2c2', seed: 1, hair: '#6a4030',
  outfit: { top: '#78a6dc', stripes: '#a9caf2', bottom: '#5a86c0', leg: '#4a6ea8', shoe: '#e88a8a', buttons: '#fff4c8' },
  hat: { kind: 'nightcap', color: '#3d6fd0', color2: '#eef0ff' },
};
const OPER = {
  skin: '#c99067', seed: 3, stout: true, moustache: '#3a2a20',
  outfit: { top: '#e8873a', overalls: '#3d6ab0', leg: '#2e4f86', shoe: '#4a3348', badge: 'BRAINSTEM' },
  hat: { kind: 'helmet', color: '#f2c230' },
};
export const DESIGNS = { HERO, OPER };

const between = (f, a, b) => f >= a && f < b;

export const actorsAt = (f) => {
  const s = shotAt(f), A = [];
  const id1 = idle(f, 1), id2 = idle(f, 3), id3 = idle(f, 5);
  if (s.set === 'bed') {
    // --- hero
    if (s.id !== 'twist') {
      let expr = 'terror', look = [Math.sin(f * .13) > .3 ? .8 : Math.sin(f * .13) < -.3 ? -.8 : 0, -.2];
      if (s.id === 'why') { expr = 'sleep'; look = [0, 0]; }
      if (s.id === 'awake') { expr = f < 1123 ? 'sleep' : f < 1140 ? 'awake' : 'terror'; if (f < 1140) look = [0, 0]; }
      if (s.id === 'figure') expr = f < 1806 ? 'terror' : 'pained';
      if (s.id === 'vanish') expr = f < 1996 ? 'pained' : 'relief';
      if (s.id === 'dive' || s.id === 'demon') expr = 'terror';
      A.push({ id: 'hero', kind: 'bean', pos: BED.hero, lie: BED.heroTilt, scale: 1, P: { ...HERO, expr, look, armL: 'hang', armR: 'hang', headTilt: id1.headTilt * .4, blink: expr === 'sleep' || expr === 'terror' || expr === 'pained' ? 0 : blinkAt(f, 1), f } });
    } else {
      const sweatOn = f < 2260;
      A.push({ id: 'hero', kind: 'bean', pos: BED.sit, scale: 1, P: { ...HERO, expr: f < 2250 ? 'relief' : 'smile', sweat: sweatOn, armL: 'belly', armR: f < 2236 ? 'cheek' : 'hang', tilt: id1.tilt + 2, headTilt: id1.headTilt, bob: id1.bob, blink: blinkAt(f, 1), f } });
    }
    // --- shadow figure
    if (s.id === 'hook' || s.id === 'demon' || s.id === 'dive') {
      let horns = 1, hornFly = 0, eyes = 'glare';
      if (f >= 154) { hornFly = (f - 154) / 10; horns = hornFly < 1.4 ? 1 : 0; eyes = 'sheepish'; }
      A.push({ id: 'shadow', kind: 'shadow', pos: [BED.corner[0], 0, BED.corner[2]], scale: 1.15, P: { f, horns, hornFly, eyes, grin: f < 154, arms: f < 154 ? 'claw' : 'hang', sweat: f >= 158 } });
    }
    if (s.id === 'figure' || s.id === 'vanish') {
      const appear = f < 1752 ? 0 : M.back((f - 1752) / 10);
      if (appear > 0) {
        let pos = [BED.corner[0], 0, BED.corner[2]], sc = 1.15 * appear, sq = 0;
        if (f >= 1786) {
          const t = clamp((f - 1786) / 22);
          const a = BED.corner, b = [BED.chest[0], BED.chest[1], BED.chest[2]];
          pos = [lerp(a[0], b[0], M.smooth(t)), lerp(0, b[1], t) + Math.sin(t * Math.PI) * 0.45, lerp(a[2], b[2], M.smooth(t))];
          sc = lerp(1.15, .5, M.smooth(t));
          if (f >= 1808) { const k = (f - 1808); sq = Math.exp(-k * .25) * Math.cos(k * .8) * .3; }
        }
        A.push({ id: 'shadow', kind: 'shadow', pos, scale: sc, squash: sq, hidden: f >= 1993, P: { f, horns: 0, eyes: 'glare', grin: true, arms: f >= 1786 ? 'claw' : 'reach' } });
      }
    }
    if (s.id === 'twist') {
      const op = f < 2295 ? 0 : M.back((f - 2295) / 6);
      if (op > 0) A.push({ id: 'shadowEyes', kind: 'shadow', pos: [BED.corner[0], 0, BED.corner[2]], scale: 1.15, P: { f, eyesOnly: true, eyes: 'glare', eyeOpen: Math.min(1.2, op) } });
    }
    // --- cat
    if (s.id === 'why') {
      const t = M.easeOut((f - 765) / 9);
      A.push({ id: 'cat', kind: 'cat', pos: [lerp(1.75, 1.0, t), 0.82, -0.75], scale: .5, dir: -1, P: { f, look: f >= 771 ? [-.2, .9] : [-1, 0], lid: f >= 771 ? .45 : 0 } });
    }
    // --- bubble
    if (s.id === 'why' && f >= 796) {
      A.push({ id: 'bubble', kind: 'bubble', pos: [0.15, 1.42, -1.75], scale: M.back((f - 796) / 10), size: [1.35, 1.19], state: f < 866 ? 'dream' : 'hurt', P: { f } });
    }
  } else {
    // --- HQ: operator
    let op = { ...OPER, expr: 'neutral', armL: 'hang', armR: 'hip', tilt: id2.tilt, headTilt: id2.headTilt, bob: id2.bob, blink: blinkAt(f, 3), f };
    let opPos = HQ.operator;
    if (s.id === 'lever') {
      op.expr = f < 440 ? 'smile' : f < 470 ? 'stern' : 'grin';
      if (f >= 438 && f < 452) { op.armL = 'lift'; op.tilt = -6; }
      if (f >= 452 && f < 470) { op.armL = 'pull'; op.tilt = -10 + (f - 452) * .5; }
      if (f >= 470) { op.armL = 'thumb'; op.armR = 'hip'; }
      if (f >= 536) op.armL = 'thumb';
    }
    if (s.id === 'mind' || (s.id === 'catchup' && f < 1860)) { op.expr = 'doze'; op.blink = 0; op.headTilt = 8 + id2.headTilt; op.tilt = 3; op.armL = 'hang'; op.armR = 'hang'; }
    if (s.id === 'catchup' && f >= 1860) {
      op.expr = f < 1890 ? 'shock' : 'stern'; op.blink = 0;
      if (f >= 1896 && f < 1912) { op.armL = 'pull'; op.tilt = -8; }
      if (f >= 1912) { op.armL = 'lift'; op.tilt = 4; op.expr = 'grin'; }
      if (f < 1868) op.bob = .03 * M.back((f - 1860) / 8) - .03;
    }
    if (s.id === 'oops') {
      op.expr = f < 2170 ? 'nervous' : 'nervous'; op.armL = 'shrug'; op.armR = 'shrug';
      if (f >= 2100) { op.armR = 'cheek'; op.armL = 'shrug'; }
      if (f >= 2172) { op.sweat = 1; op.armL = 'cheek'; op.armR = 'cheek'; op.expr = 'pained'; }
      op.tilt = id2.tilt * 2;
    }
    const opPopSign = f >= 446 && f < 568 ? M.back((f - 446) / 9) : 0;
    A.push({ id: 'oper', kind: 'bean', pos: opPos, scale: 1, P: op, sign: opPopSign });
    // --- conscious mind (mini hero at desk)
    {
      let expr = 'doze', P = { ...HERO, armL: 'hang', armR: 'hang', tilt: id3.tilt, headTilt: 10 + id3.headTilt, bob: id3.bob, blink: 0, f };
      if (s.id === 'mind') {
        if (f >= 966) { const t = (f - 966) / 14; P.bob = M.anticip(t, .2) * .03 - .00; P.headTilt = lerp(10, 0, M.easeOut(t)); expr = 'awake'; P.armL = 'up'; P.armR = 'up'; }
        if (f >= 1000) { expr = 'shock'; }
      }
      if (f > 1078) expr = 'shock';
      P.expr = expr;
      A.push({ id: 'mind', kind: 'bean', pos: HQ.mind, scale: .8, P });
    }
    // --- amygdala
    if (f >= 1326) {
      const pop = M.back((f - 1326) / 9);
      let pos = HQ.amyg, mode = 'stand', phase = 0, dir = 1, look = [-.3, .5];
      if (s.id === 'alarm') {
        if (f >= 1356) mode = 'panic';
        if (f >= 1383) {
          mode = 'run';
          const w = walk(f, 1383, 2.2, .42);
          const a = w.dist / 0.7 - Math.PI / 2;
          pos = [HQ.amyg[0] + Math.cos(a) * 0.5, 0, HQ.amyg[2] + .2 + Math.sin(a) * 0.9];
          dir = -Math.sin(a) >= 0 ? 1 : -1; phase = w.phase;
          look = [1, -.2];
        }
      }
      if (s.id === 'oops') {
        const t = M.easeOut((f - 2080) / 14);
        pos = H(lerp(1.8, 0.1, t), 0, -1.1); mode = f < 2080 ? 'stand' : f < 2096 ? 'run' : 'smug'; phase = (f * .07) % 1; dir = -1;
        look = f >= 2100 ? [1, .1] : [-1, 0];
        if (f < 2080) pos = H(1.8, 0, -1.1);
      }
      if (s.id === 'oops' || s.id === 'alarm') A.push({ id: 'amyg', kind: 'amyg', pos, scale: (s.id === 'alarm' ? pop : 1) * .9, dir, P: { f, mode, phase, look: dir < 0 ? [-look[0], look[1]] : look, siren: s.id === 'alarm' && f >= 1350 ? 1 : 0 } });
    }
  }
  return A;
};

// ---------------- fx ----------------
// {kind, t(0..1), pos, size, opt}
export const fxAt = (f) => {
  const s = shotAt(f), F = [];
  const puff = (f0, pos, size = 1, dur = 14, kind = 'puff', opt = {}) => { if (f >= f0 && f < f0 + dur) F.push({ kind, t: (f - f0) / dur, pos, size, opt }); };
  if (s.set === 'bed') {
    // moon glow outside window handled in world; zzz while asleep
    if (s.id === 'why' || (s.id === 'awake' && f < 1122)) F.push({ kind: 'zzz', t: (f * .012) % 1, pos: [0.75, 1.2, -1.95], size: .55, loop: true });
    if (s.id === 'demon') puff(154, [-1.95, 2.25, -2.0], .9, 12, 'spark');
    if (s.id === 'awake') {
      if (f >= 1141) F.push({ kind: 'lock', t: 0, pos: [0.3, 0.95, -1.2], size: .34 * M.back((f - 1141) / 8), flat: true });
      puff(1141, [0.3, 0.98, -1.15], .7, 12);
    }
    if (s.id === 'figure') { puff(1750, [BED.corner[0], 1.2, BED.corner[2]], 2.2, 20, 'smoke'); puff(1808, [0.3, 1.0, -1.25], 1.2, 14); }
    if (s.id === 'vanish') puff(1991, [0.3, 1.25, -1.25], 1.8, 20, 'smoke');
    if (s.id === 'why') puff(796, [0.15, 1.6, -1.7], .9, 12);
  } else {
    if (s.id === 'hq') {
      const cells = calCells();
      [277, 281, 285, 289, 293, 296, 300, 303].forEach((a, i) => { if (f >= a) F.push({ kind: 'lock', t: 0, pos: cells[i], size: .22 * M.back((f - a) / 6) }); puff(a, cells[i], .35, 9); });
    }
    if (s.id === 'lever') {
      if (between(f, 402, 445)) for (let i = 0; i < 3; i++) { const t = ((f - 402) / 43 + i * .3) % 1; F.push({ kind: 'cloud', t: 0, pos: H(-2.6 + i * .9, 2.6 + t * .9 + i * .15, -3.4), size: .55 * Math.sin(Math.min(1, t * 1.3) * Math.PI) + .01 }); }
      puff(446, H(-0.5, 2.7, -2.2), .8, 12);
      puff(460, H(-1.0, 1.7, -2.7), .6, 10, 'spark');
      puff(536, H(-1.05, 1.15, -2.4), .7, 12);
    }
    if (s.id === 'tanks') { puff(655, H(0.9, 2.1, -3.2), .9, 12); puff(677, H(2.0, 2.1, -3.2), .9, 12); [710, 721, 731, 741].forEach((a, i) => puff(a, lampPos(i), .3, 8, 'puff', { col: '#555060' })); }
    if (s.id === 'mind' || s.id === 'catchup' && f < 1860) F.push({ kind: 'zzz', t: (f * .012) % 1, pos: s.id === 'mind' && f < 966 ? H(-3.55, 2.0, -0.4) : H(-0.1, 2.5, -2.2), size: .7, loop: true });
    if (s.id === 'mind') { if (f < 1010 && f >= 966) { } F.push(...(f >= 1000 ? [{ kind: 'zzz', t: (f * .012) % 1, pos: H(-0.1, 2.5, -2.2), size: .7, loop: true }] : [])); puff(1050, H(-0.95, 1.0, -2.45), .5, 16, 'spark'); puff(975, H(-4.0, 1.7, -0.3), .7, 10, 'spark', { col: '#ffffff' }); }
    if (s.id === 'alarm') { puff(1326, H(0, 0.6, 0.8), 1.4, 14); if (f >= 1334) F.push({ kind: 'text', t: 0, pos: H(0, 1.75, 0.8), size: 1.25 * M.back((f - 1334) / 8), opt: { text: 'AMYGDALA', size: 76, col: '#ff8a8a' } }); }
    if (s.id === 'dream' || s.id === 'project') for (let i = 0; i < 4; i++) { const t = ((f * .012) + i * .25) % 1; F.push({ kind: 'cloud', t: 0, pos: H(3.7 + Math.sin(i * 2 + t * 3) * .3, 2.0 + t * 1.6, 0.1 + i * .05), size: .45 * Math.sin(t * Math.PI) + .01 }); }
    if (s.id === 'catchup') { puff(1862, H(-0.35, 2.4, -2.2), .7, 10, 'spark'); }
    if (s.id === 'oops') { if (f >= 2174) F.push({ kind: 'text', t: 0, pos: H(-0.5, 2.35, -2.0), size: 1.0 * M.back((f - 2174) / 8), opt: { text: 'OOPS', size: 140, col: '#ffd84a' } }); puff(2174, H(-0.5, 2.35, -2.0), 1.0, 10); puff(2086, H(0.9, 0.3, -1.1), .6, 12); }
  }
  return F;
};

export const CAL = { c: H(1.5, 3.7, -4.12), w: 1.5, h: 2.0 };
export const calCells = () => { const o = []; for (let i = 0; i < 8; i++) { const c = i % 2, r = Math.floor(i / 2); o.push([CAL.c[0] + (c - .5) * .62, CAL.c[1] + .42 - r * .42, CAL.c[2] + .12]); } return o; };
export const MUSC = { c: H(3.4, 1.6, -4.12), w: 1.6, h: 1.6 };
export const lampPos = (i) => [MUSC.c[0] + .5, MUSC.c[1] + .36 - i * .3, MUSC.c[2] + .1];
