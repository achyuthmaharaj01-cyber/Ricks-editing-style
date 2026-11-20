#!/usr/bin/env python3
"""sheet.py out.jpg cols thumbW file1 [file2 ...] - tile stills with frame labels."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); files = sys.argv[4:]
th = int(tw * 1920 / 1080); rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 26)), '#111')
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception: font = None
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 26)
    sheet.paste(im, (x, y + 26)); d.text((x + 6, y + 3), os.path.basename(f), fill='#ffd84a', font=font)
sheet.save(out, quality=88); print(out, sheet.size)
