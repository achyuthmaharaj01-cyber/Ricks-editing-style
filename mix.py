#!/usr/bin/env python3
"""Gated-RMS level match: music = 0.5x voice (-6 dB), sfx RMS <= 0.5x voice, sfx peaks <= 0.7x voice peak. One linear gain only."""
import numpy as np, wave
def rd(p):
    with wave.open(p) as w:
        assert w.getframerate() == 48000 and w.getnchannels() == 1
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
def gated_rms(x, blk=int(.4 * 48000)):
    n = len(x) // blk; b = x[:n * blk].reshape(n, blk); r = np.sqrt((b ** 2).mean(1))
    keep = r > r.max() * 10 ** (-40 / 20); return np.sqrt((b[keep] ** 2).mean()) if keep.any() else 0
v, m, s = rd('work/voice.wav'), rd('work/music.wav'), rd('work/sfx.wav')
N = len(v); m = np.pad(m, (0, max(0, N - len(m))))[:N]; s = np.pad(s, (0, max(0, N - len(s))))[:N]
vr, mr, sr = gated_rms(v), gated_rms(m), gated_rms(s)
gm = 0.5 * vr / mr
gs = min(0.5 * vr / sr, 0.7 * np.abs(v).max() / np.abs(s).max())
db = lambda x: 20 * np.log10(max(x, 1e-9))
print(f'voice gated RMS {db(vr):.1f} dBFS  peak {db(np.abs(v).max()):.1f}')
print(f'music gated RMS {db(mr):.1f} -> gain {db(gm):+.1f} dB -> {db(mr*gm):.1f} dBFS ({db(mr*gm)-db(vr):+.1f} dB vs voice)')
print(f'sfx   gated RMS {db(sr):.1f} -> gain {db(gs):+.1f} dB -> {db(gated_rms(s*gs)):.1f} dBFS ({db(gated_rms(s*gs))-db(vr):+.1f} dB vs voice), peak {db(np.abs(s*gs).max()):.1f} (voice peak x0.7 = {db(.7*np.abs(v).max()):.1f})')
mix = v + m * gm + s * gs
pk = np.abs(mix).max(); g = min(1.0, 0.89 / pk)
print(f'sum peak {db(pk):.1f} dBFS, single linear gain {db(g):+.1f} dB')
mix *= g
with wave.open('work/mix.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
