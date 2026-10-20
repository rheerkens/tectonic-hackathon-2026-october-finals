"""Extract generated drawings, using one shared scale and explicit pose anchors."""
from pathlib import Path
import json
from PIL import Image

HERE = Path(__file__).resolve().parent
SCALE = 0.28
# bounds are measured on the three connected figures (alpha > 16).
# Head anchors derive from alpha > 32 above y=265 in the generated strip.
POSES = [
    ("A_landing", (168, 19, 645, 710), 425.5, 29, 93.0, 14),
    ("B_knee_rejected", (847, 14, 1287, 669), 1102.5, 24, 96.75, 8),
    ("C_extension", (1531, 21, 2058, 696), 1819.5, 31, 97.0, 8),
]

def main():
    source = Image.open(HERE / "generated_strip.png").convert("RGBA")
    out = HERE / "frames"
    out.mkdir(exist_ok=True)
    report = []
    for name, box, head_x, head_y, target_x, target_y in POSES:
        crop = source.crop(box)
        size = (round(crop.width * SCALE), round(crop.height * SCALE))
        resized = crop.resize(size, Image.Resampling.LANCZOS)
        x = round(target_x - (head_x - box[0]) * SCALE)
        y = round(target_y - (head_y - box[1]) * SCALE)
        cell = Image.new("RGBA", (192, 208), (0, 0, 0, 0))
        cell.alpha_composite(resized, (x, y))
        cell.save(out / (name + ".png"))
        mask = cell.getchannel("A").point(lambda a: 255 if a > 16 else 0)
        report.append({"name": name, "crop": box, "scale": SCALE,
                       "placement": [x, y], "alpha16_bounds": mask.getbbox(),
                       "cell": [192, 208], "alpha_extrema": cell.getchannel("A").getextrema()})
    (HERE / "extraction.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
