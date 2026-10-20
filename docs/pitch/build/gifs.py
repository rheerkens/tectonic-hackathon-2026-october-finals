"""Turn the animated WebP sprites into GIFs for PowerPoint.

PowerPoint plays animated GIFs but GIF transparency is 1-bit, so each GIF is rendered onto the exact
slide background behind it (flat colour plus any halo circle), at 1.2x the 1600x900 design size.
Writes gifs/<name>.gif and gifs/manifest.json with the placement in design pixels.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw

PITCH = Path("/home/royh/.t3/worktrees/tectonic-hackathon-2026-october-finals/t3-fc2c5f3d/docs/pitch")
PET = Path("/home/royh/.t3/worktrees/tectonic-hackathon-2026-october-finals/t3-fc2c5f3d/apps/web/public/pet")
OUT = Path("/tmp/sdtrust-deck/gifs")
OUT.mkdir(exist_ok=True)
SCALE = 1.2
NIGHT = (15, 29, 49)
NAVY = (25, 45, 70)
IVORY = (248, 246, 241)

SPECS = [
	# name, source, background, halos [(x, y, size)], x, y, height, crop to content
	("lotte-puzzled", PITCH / "sprites/lotte-puzzled.webp", NIGHT, [(1002, 120, 504)], 1080, 90, 732, False),
	("lotte-shrug", PITCH / "sprites/lotte-shrug.webp", IVORY, [], 1300, 574, 300, False),
	("lotte-relieved", PITCH / "sprites/lotte-relieved.webp", NIGHT, [], 96, 156, 576, False),
	("finn-idle", PET / "idle.webp", IVORY, [], 190, 270, 500, True),
	("finn-waving", PET / "waving.webp", NIGHT, [], 380, 390, 340, True),
	("finn-waving-big", PET / "waving.webp", NIGHT, [], 1040, 200, 520, True),
]


def frames_of(path):
	im = Image.open(path)
	out = []
	for i in range(getattr(im, "n_frames", 1)):
		im.seek(i)
		out.append((im.convert("RGBA").copy(), im.info.get("duration", 100)))
	return out


manifest = {}
for name, src, bg, halos, x, y, h, crop in SPECS:
	frames = frames_of(src)
	if crop:
		box = None
		for f, _ in frames:
			b = f.getbbox()
			box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
		frames = [(f.crop(box), d) for f, d in frames]
	fw, fh = frames[0][0].size
	w = round(h * fw / fh)
	pw, ph = round(w * SCALE), round(h * SCALE)
	# background patch: what the slide shows behind this rectangle
	patch = Image.new("RGBA", (pw, ph), bg + (255,))
	draw = ImageDraw.Draw(patch)
	for hx, hy, size in halos:
		left, top = (hx - x) * SCALE, (hy - y) * SCALE
		draw.ellipse((left, top, left + size * SCALE, top + size * SCALE), fill=NAVY + (255,))
	rendered = []
	for f, d in frames:
		layer = patch.copy()
		layer.alpha_composite(f.resize((pw, ph), Image.LANCZOS))
		rendered.append((layer.convert("RGB"), d))
	# one shared palette for all frames, no dithering, so static areas never shimmer
	strip = Image.new("RGB", (pw, ph * len(rendered)))
	for i, (f, _) in enumerate(rendered):
		strip.paste(f, (0, i * ph))
	palette = strip.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
	gif = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f, _ in rendered]
	target = OUT / f"{name}.gif"
	gif[0].save(target, save_all=True, append_images=gif[1:], duration=[d for _, d in rendered], loop=0, disposal=1, optimize=False)
	manifest[name] = {"path": str(target), "x": x, "y": y, "w": w, "h": h}
	print(name, (pw, ph), len(gif), "frames", f"{target.stat().st_size // 1024} KB")

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
