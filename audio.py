#!/usr/bin/env python3
"""Synth music.wav + sfx.wav (48k mono). Event times in frames/30."""
import numpy as np, wave, json

SR = 48000
DUR = json.load(open('work/phrases.json'))['duration']
N = int(DUR * SR) + SR // 10
rng = np.random.default_rng(7)
fr = lambda f: f / 30.0

def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())

def lp(x, cut):  # one-pole low-pass (cut can be array)
    a = np.exp(-2 * np.pi * np.asarray(cut, dtype=float) / SR) * np.ones(len(x))
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y

def hp(x, cut): return x - lp(x, cut)

def add(buf, t, sig, g=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    n = min(len(sig), len(buf) - i); buf[i:i + n] += sig[:n] * g

def env(n, a=.005, r=.2):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r); return e

def tt(d): return np.arange(int(d * SR)) / SR

# ---------------- SFX ----------------
def whoosh(d=.6, f0=300, f1=2500, g=1):
    t = tt(d); n = rng.standard_normal(len(t)); e = np.sin(np.pi * t / d) ** 2
    cut = f0 + (f1 - f0) * np.sin(np.pi * t / d)
    return lp(n, cut) * e * g * 1.6

def thunk(f0=180, f1=55, d=.28, g=1):
    t = tt(d); ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / .04)) / SR
    s = np.sin(ph) * env(len(t), .002, d / 3.5)
    nz = lp(rng.standard_normal(len(t)), 1500) * env(len(t), .001, .02)
    return (s + .6 * nz) * g

def ting(f=2600, d=.7, g=.6):
    t = tt(d); s = sum(np.sin(2 * np.pi * f * k * t) * (1 / k ** 1.5) for k in (1, 2.76, 5.4))
    return s * env(len(t), .001, d / 4) * g

def click(g=.5):
    t = tt(.05); return (np.sin(2 * np.pi * 1800 * t) * env(len(t), .0005, .008) + rng.standard_normal(len(t)) * env(len(t), .0005, .004) * .5) * g

def clank(g=1):
    t = tt(.8); s = sum(np.sin(2 * np.pi * f * t + p) for f, p in ((410, 0), (1130, 1), (1710, 2), (2650, .5))) / 3
    return s * env(len(t), .001, .12) * g

def gurgle(d=1.8, g=.6):
    t = tt(d); out = np.zeros(len(t))
    for k in range(int(d * 14)):
        st = rng.uniform(0, d - .1); f = rng.uniform(250, 700); dd = .07
        tb = tt(dd); b = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * tb / dd)) / SR) * env(len(tb), .003, .025)
        i = int(st * SR); out[i:i + len(b)] += b[:len(out) - i]
    flow = lp(rng.standard_normal(len(t)), 500) * .5
    return (out + flow) * np.sin(np.pi * t / d) ** .5 * g

def siren(d, g=.35):
    t = tt(d); f = np.where((t * 2.2) % 1 < .5, 740, 990)
    ph = 2 * np.pi * np.cumsum(lp(f.astype(float), 30)) / SR
    s = np.sign(np.sin(ph)) * .5 + np.sin(ph) * .5
    return lp(s, 2200) * np.minimum(1, t / .05) * np.minimum(1, (d - t) / .1) * g

def patter(d, rate=11, g=.4):
    t = tt(d); out = np.zeros(len(t))
    for k in range(int(d * rate)):
        i = int(k / rate * SR); tb = tt(.04); b = np.sin(2 * np.pi * (300 + 80 * (k % 2)) * tb) * env(len(tb), .001, .01)
        out[i:i + len(b)] += b[:len(out) - i]
    return out * g

def whirr(d, g=.18):
    t = tt(d); pulse = (np.sin(2 * np.pi * 24 * t) > .6).astype(float)
    return lp(pulse + .3 * rng.standard_normal(len(t)), 900) * np.minimum(1, t / .3) * np.minimum(1, (d - t) / .3) * g

def zap(d=.9, g=.7):
    t = tt(d); f = 200 + 1600 * (1 - np.exp(-t / .1))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * .5 + lp(rng.standard_normal(len(t)), 3000) * .4
    return s * env(len(t), .01, .35) * g

def sting(g=1.0):
    t = tt(3.5)
    low = np.sin(2 * np.pi * 41 * t) * env(len(t), .005, 1.4)
    hit = lp(rng.standard_normal(len(t)), 900) * env(len(t), .001, .15)
    brass = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (146.8, 174.6, 207.7)) / 3
    brass = lp(brass, 1400) * env(len(t), .01, .5) * .5
    return (low + .7 * hit + brass) * g

def glitch_ticks(d):
    t0 = 0; out = np.zeros(int(d * SR))
    while t0 < d - .05:
        add(out, t0, click(.6) * (1 if rng.random() > .3 else .5)); t0 += rng.choice([.06, .09, .17, .25])
    return out

sfx = np.zeros(N)
W = lambda f, *a, **k: add(sfx, fr(f) - .3, whoosh(*a, **k))
for f in (40, 258, 470, 698, 806, 1000, 1290, 1386, 1640, 1786, 1928):
    W(f, .6, 250, 2200, .55)
add(sfx, fr(176), whoosh(.9, 200, 3500, .8))
add(sfx, fr(198), ting(3200, 1.0, .35)); add(sfx, fr(1706), ting(3400, 1.0, .35))
add(sfx, fr(1690), whoosh(.8, 300, 4000, .7))
add(sfx, fr(203), glitch_ticks(1.6), .7)
add(sfx, fr(154), thunk(320, 120, .2, .7)); add(sfx, fr(154), ting(2400, .6, .4))
for i, f in enumerate((277, 281, 285, 289, 293, 296, 300, 303)): add(sfx, fr(f), thunk(260 + i * 25, 120, .15, .55))
add(sfx, fr(372), click(.6)); add(sfx, fr(375), click(.4)); add(sfx, fr(378), click(.6))
add(sfx, fr(446), thunk(240, 90, .25, .6))
add(sfx, fr(452), whoosh(.3, 500, 2500, .4))
add(sfx, fr(460), thunk(150, 45, .4, 1.0)); add(sfx, fr(460), clank(.55))
add(sfx, fr(536), thunk(200, 70, .3, .9)); add(sfx, fr(538), ting(2800, .8, .45))
add(sfx, fr(585), gurgle(1.9, .55))
add(sfx, fr(655), thunk(280, 110, .2, .6)); add(sfx, fr(677), thunk(300, 120, .2, .6))
for f in (710, 721, 731, 741): add(sfx, fr(f), click(.7)); add(sfx, fr(f), thunk(120, 60, .15, .25))
add(sfx, fr(771), ting(1800, .4, .25))
add(sfx, fr(796), thunk(380, 200, .18, .5))
add(sfx, fr(866), thunk(160, 50, .3, .7)); add(sfx, fr(868), ting(2200, .5, .3))
add(sfx, fr(975), ting(3000, .6, .35)); add(sfx, fr(968), whoosh(.3, 400, 2600, .35))
add(sfx, fr(1050), ting(3600, 1.0, .5))
add(sfx, fr(1123), whoosh(.25, 600, 3000, .35))
add(sfx, fr(1141), thunk(180, 60, .35, .95)); add(sfx, fr(1143), clank(.35))
add(sfx, fr(1252), siren(fr(1430 - 1252) - .05, .3))
add(sfx, fr(1326), thunk(340, 140, .2, .7)); add(sfx, fr(1334), ting(2600, .4, .3))
add(sfx, fr(1383), patter(fr(1430 - 1383) - .05, 12, .45))
add(sfx, fr(1430), whirr(fr(1712 - 1430), .2))
add(sfx, fr(1512), click(.5)); add(sfx, fr(1516), click(.4)); add(sfx, fr(1521), click(.5))
add(sfx, fr(1630), zap(1.2, .6))
add(sfx, fr(1750), whoosh(.9, 120, 900, .8)); add(sfx, fr(1752), sting(.25))
add(sfx, fr(1808), thunk(110, 38, .6, 1.1))
add(sfx, fr(1862), ting(3000, .5, .35)); add(sfx, fr(1856), whoosh(.3, 400, 2600, .35))
add(sfx, fr(1912), thunk(150, 45, .4, .9)); add(sfx, fr(1912), clank(.5)); add(sfx, fr(1915), ting(3200, .8, .5))
add(sfx, fr(1944), gurgle(1.0, .55))
add(sfx, fr(1991), whoosh(.8, 150, 1200, .8)); add(sfx, fr(1993), ting(2000, .9, .35))
add(sfx, fr(2080), patter(.5, 12, .4)); add(sfx, fr(2086), thunk(300, 150, .15, .4))
add(sfx, fr(2109), ting(1500, .3, .2))
add(sfx, fr(2174), thunk(200, 70, .3, .9)); add(sfx, fr(2176), ting(2200, .5, .35))
add(sfx, fr(2207), sting(1.0))
add(sfx, fr(2295), sting(.55)); add(sfx, fr(2296), ting(900, 1.4, .3))
write('work/sfx.wav', sfx * .5)

# ---------------- MUSIC: eerie-plucky loop, stops on the twist line ----------------
bpm = 100; beat = 60 / bpm
music = np.zeros(N)
stop = fr(2207)
def pluck(f, d=.5, g=.5, bright=3000):
    t = tt(d); s = np.sign(np.sin(2 * np.pi * f * t)) * .4 + np.sin(2 * np.pi * f * t)
    return lp(s, bright) * env(len(t), .003, d / 4) * g
def bell(f, d=1.2, g=.25):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 3.01 * t)) * env(len(t), .002, d / 3) * g
def pad(f, d, g=.12):
    t = tt(d); s = sum(np.sin(2 * np.pi * f * k * t * (1 + .003 * np.sin(2 * np.pi * .3 * t + k))) / k for k in (1, 2, 3))
    return lp(s, 1200) * np.minimum(1, t / .4) * np.minimum(1, (d - t) / .4) * g
D = 146.83
roots = [D, D * 2 ** (-2 / 12), D * 2 ** (-4 / 12) * 2 ** (1 / 12), D * 2 ** (-5 / 12)]  # Dm - C - Bb(ish) - A
chords = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]]
mel = [12, 15, 14, 10, 12, 8, 7, 10, 12, 15, 17, 15, 14, 10, 13, 12]
bar = 4 * beat
t = .3; k = 0
while t < stop:
    r = roots[k % 4]
    add(music, t, pad(r, bar + .4, .1))
    for c in chords[k % 4]: add(music, t, pad(r * 2 ** (c / 12), bar + .4, .05))
    for b in range(4):
        tb = t + b * beat
        if tb >= stop: break
        add(music, tb, pluck(r / 2, .4, .45, 900))
        if b % 2 == 1: add(music, tb + beat / 2, pluck(r, .25, .2, 1500))
        m = mel[(k * 4 + b) % 16]
        if (k * 4 + b) % 3 != 2: add(music, tb, bell(D * 2 * 2 ** ((m - 12) / 12), 1.0, .18))
        # soft tick percussion
        add(music, tb, lp(rng.standard_normal(int(.03 * SR)), 6000) * env(int(.03 * SR), .0005, .006) * .25)
    t += bar; k += 1
# hard stop at the twist + low drone after
i = int(stop * SR); music[i:] = 0
fade = int(.03 * SR); music[i - fade:i] *= np.linspace(1, 0, fade)
dr = tt(DUR - stop + .1)
drone = (np.sin(2 * np.pi * 55 * dr) + .5 * np.sin(2 * np.pi * 55.6 * dr) + .3 * np.sin(2 * np.pi * 82.4 * dr)) * np.minimum(1, dr / .8) * .35
add(music, stop, lp(drone, 400))
write('work/music.wav', music * .5)
print('wrote work/music.wav work/sfx.wav', DUR)
