import sys
from collections import deque
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()
bg = lambda p: min(p[0], p[1], p[2]) >= 232 and max(p[0], p[1], p[2]) - min(p[0], p[1], p[2]) <= 18
seen = bytearray(w * h)
q = deque()
for x in range(w):
    q.append((x, 0)); q.append((x, h - 1))
for y in range(h):
    q.append((0, y)); q.append((w - 1, y))
mask = Image.new("L", (w, h), 255)
m = mask.load()
while q:
    x, y = q.popleft()
    i = y * w + x
    if seen[i]:
        continue
    seen[i] = 1
    if not bg(px[x, y]):
        continue
    m[x, y] = 0
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
            q.append((nx, ny))
mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
im.putalpha(mask)
im = im.crop(im.getbbox())
im.save(dst)
print(dst, im.size)
