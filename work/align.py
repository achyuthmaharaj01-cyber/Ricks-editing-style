#!/usr/bin/env python3
"""Align script phrases to speech segments (silencedetect -35dB, 0.12s) with a DP over syllable counts."""
import json, re, subprocess, sys

VOICE = sys.argv[1] if len(sys.argv) > 1 else 'work/voice.wav'
SCRIPT = open('work/script.txt').read()

out = subprocess.run(['ffmpeg', '-hide_banner', '-i', VOICE, '-af', 'silencedetect=noise=-35dB:d=0.12', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', VOICE],
                           capture_output=True, text=True).stdout)
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
sil = list(zip(starts, ends))
# speech segments = gaps between silences
segs, t = [], 0.0
for s, e in sil:
    if s - t > 0.05: segs.append([t, s])
    t = e
if dur - t > 0.05: segs.append([t, dur])
segs = [s for s in segs if s[1] - s[0] > 0.08]

def syl(w):
    w = re.sub(r'[^a-z]', '', w.lower())
    if not w: return 0
    if w in ('rem',): return 1
    if w == 'gaba': return 2
    v = re.findall(r'[aeiouy]+', w)
    n = len(v)
    if w.endswith('e') and not w.endswith(('le', 'ee')) and n > 1: n -= 1
    return max(1, n)

# phrases: split at , . ? : ! keeping punctuation
words = SCRIPT.split()
phrases, cur = [], []
for w in words:
    cur.append(w)
    if re.search(r'[,.?:!]$', w):
        phrases.append(cur); cur = []
if cur: phrases.append(cur)
P = [{'text': ' '.join(p), 'words': p, 'syl': sum(syl(x) for x in p), 'end': p[-1][-1]} for p in phrases]

# DP: assign contiguous phrase groups to contiguous segment groups (1:many / many:1), cost by rate deviation
total_syl = sum(p['syl'] for p in P)
speech = sum(b - a for a, b in segs)
rate = total_syl / speech
INF = 1e18
nP, nS = len(P), len(segs)
dp = [[INF] * (nS + 1) for _ in range(nP + 1)]
bk = [[None] * (nS + 1) for _ in range(nP + 1)]
dp[0][0] = 0
for i in range(nP + 1):
    for j in range(nS + 1):
        if dp[i][j] >= INF: continue
        for di in range(1, 5):
            for dj in range(1, 5):
                if i + di > nP or j + dj > nS: continue
                if di > 1 and dj > 1: continue
                sy = sum(P[k]['syl'] for k in range(i, i + di))
                d = sum(segs[k][1] - segs[k][0] for k in range(j, j + dj))
                c = (sy / rate - d) ** 2 / max(d, .3)
                # penalise sentence ends swallowed inside a merged segment
                for k in range(i, i + di - 1):
                    if P[k]['end'] in '.?!:': c += 3.0
                    else: c += .15
                # mild penalty for splitting a phrase across segments
                c += .25 * (dj - 1)
                if dp[i][j] + c < dp[i + di][j + dj]:
                    dp[i + di][j + dj] = dp[i][j] + c
                    bk[i + di][j + dj] = (i, j)
i, j = nP, nS
groups = []
while (i, j) != (0, 0):
    pi, pj = bk[i][j]
    groups.append((list(range(pi, i)), list(range(pj, j))))
    i, j = pi, pj
groups.reverse()

out_words, out_phr = [], []
for pis, sjs in groups:
    ws = [w for k in pis for w in P[k]['words']]
    sy = [max(1, syl(w)) for w in ws]
    # timeline of speech within the segment group
    spans = [segs[k] for k in sjs]
    tot = sum(b - a for a, b in spans)
    def at(x):  # x in [0,tot] -> absolute time
        for a, b in spans:
            if x <= b - a: return a + x
            x -= b - a
        return spans[-1][1]
    acc, S = 0, sum(sy)
    # phrase timings
    wi = 0
    for k in pis:
        n = len(P[k]['words'])
        s0 = acc
        ptimes = []
        for w in P[k]['words']:
            a = at(acc / S * tot); acc += sy[wi]; b = at(acc / S * tot)
            out_words.append({'w': w, 't0': round(a, 3), 't1': round(b, 3), 'f': round(a * 30)})
            ptimes.append((a, b)); wi += 1
        out_phr.append({'text': P[k]['text'], 't0': round(ptimes[0][0], 3), 't1': round(ptimes[-1][1], 3),
                        'f0': round(ptimes[0][0] * 30), 'f1': round(ptimes[-1][1] * 30)})

json.dump({'duration': dur, 'frames': round(dur * 30), 'phrases': out_phr, 'words': out_words, 'segments': segs},
          open('work/phrases.json', 'w'), indent=1)
for p in out_phr:
    print(f"{p['t0']:6.2f}-{p['t1']:6.2f} f{p['f0']:4d}-{p['f1']:4d}  {p['text']}")
# pause check
print('\nlong pauses (>.4s) and the phrase before them:')
for a, b in sil:
    if b - a > .4:
        prev = [p for p in out_phr if p['t1'] <= a + .05]
        print(f"  {a:6.2f} ({b-a:.2f}s) after: ...{prev[-1]['text'][-30:] if prev else '-'}")
print('frames', round(dur * 30))
