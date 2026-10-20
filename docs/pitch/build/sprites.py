"""Build looping Lotte sprite animations (animated WebP) from Codex frames.

Each frame is cut out of its white background, aligned on the feet, and placed on a shared canvas.
Usage: python sprites.py <sprites dir>
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(sys.argv[1])
HEIGHT = 900
SEQUENCES = {
	"puzzled": [
		("00-base", 1400), ("02-glance", 900), ("00-base", 600), ("01-blink", 120), ("00-base", 1000),
		("03-talk", 700), ("00-base", 500), ("04-shrug", 800), ("00-base", 700), ("01-blink", 120),
	],
	"shrug": [
		("00-base", 1200), ("02-look-left", 800), ("00-base", 400), ("03-look-right", 800), ("00-base", 600),
		("01-blink", 120), ("00-base", 900), ("04-sigh", 900), ("00-base", 700), ("01-blink", 120),
	],
	"relieved": [
		("00-base", 900), ("02-cheer", 700), ("00-base", 500), ("01-blink", 120), ("00-base", 700),
		("03-happy", 900), ("00-base", 400), ("04-laugh", 800), ("00-base", 600), ("01-blink", 120),
	],
}


def cutout(path):
	im = Image.open(path).convert("RGBA")
	w, h = im.size
	px = im.load()
	is_bg = lambda p: min(p[0], p[1], p[2]) >= 232 and max(p[0], p[1], p[2]) - min(p[0], p[1], p[2]) <= 18
	seen = bytearray(w * h)
	mask = Image.new("L", (w, h), 255)
	m = mask.load()
	q = deque([(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)])
	while q:
		x, y = q.popleft()
		i = y * w + x
		if seen[i]:
			continue
		seen[i] = 1
		if not is_bg(px[x, y]):
			continue
		m[x, y] = 0
		for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
			if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
				q.append((nx, ny))
	mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
	im.putalpha(mask)
	return im


def feet_anchor(im):
	"""Bottom of the figure and the horizontal centre of the feet (lowest 8% of the figure)."""
	l, t, r, b = im.getbbox()
	band = im.crop((l, b - int((b - t) * 0.08), r, b)).getbbox()
	return l + (band[0] + band[2]) / 2, b


def build(pose):
	folder = ROOT / pose
	names = sorted({n for n, _ in SEQUENCES[pose]})
	missing = [n for n in names if not (folder / f"{n}.png").exists()]
	if missing:
		print(pose, "missing", missing)
		return
	frames = {}
	for n in names:
		im = cutout(folder / f"{n}.png")
		if im.size != frames.get("00-base", im).size:
			im = im.resize(frames["00-base"].size, Image.LANCZOS)
		frames[n] = im
	bx, bb = feet_anchor(frames["00-base"])
	canvas = frames["00-base"].size
	aligned = {}
	for n, im in frames.items():
		fx, fb = feet_anchor(im)
		layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
		layer.alpha_composite(im, (round(bx - fx), round(bb - fb)))
		aligned[n] = layer
	union = None
	for im in aligned.values():
		box = im.getbbox()
		union = box if union is None else (min(union[0], box[0]), min(union[1], box[1]), max(union[2], box[2]), max(union[3], box[3]))
	pad = 12
	union = (max(0, union[0] - pad), max(0, union[1] - pad), min(canvas[0], union[2] + pad), min(canvas[1], union[3] + pad))
	scale = HEIGHT / (union[3] - union[1])
	size = (round((union[2] - union[0]) * scale), HEIGHT)
	out = {n: im.crop(union).resize(size, Image.LANCZOS) for n, im in aligned.items()}
	# Nothing below the waist should move: lock the lower body to the base frame, blended softly
	lock = Image.linear_gradient("L").resize((size[0], round(size[1] * 0.1)))
	mask = Image.new("L", size, 0)
	top = round(size[1] * 0.5)
	mask.paste(lock, (0, top))
	mask.paste(255, (0, top + lock.height, size[0], size[1]))
	for n in out:
		if n != "00-base":
			out[n] = Image.composite(out["00-base"], out[n], mask)
	seq = [out[n] for n, _ in SEQUENCES[pose]]
	durations = [d for _, d in SEQUENCES[pose]]
	target = ROOT / f"lotte-{pose}.webp"
	seq[0].save(target, save_all=True, append_images=seq[1:], duration=durations, loop=0, quality=88, method=6, lossless=False, kmin=0, kmax=1, allow_mixed=False)
	out["00-base"].save(ROOT / f"lotte-{pose}-still.webp", quality=90)
	# contact sheet for review
	sheet = Image.new("RGBA", (size[0] * len(names), size[1]), (15, 29, 49, 255))
	for i, n in enumerate(names):
		sheet.alpha_composite(out[n], (i * size[0], 0))
	sheet.convert("RGB").resize((sheet.width // 3, sheet.height // 3)).save(ROOT / f"lotte-{pose}-sheet.jpg", quality=85)
	print(pose, "->", target, size, f"{target.stat().st_size // 1024} KB")


for pose in sys.argv[2:] or SEQUENCES:
	build(pose)
