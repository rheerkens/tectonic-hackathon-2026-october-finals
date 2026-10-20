import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
im = Image.open(HERE / "low_raw.png").convert("RGBA")
alpha = im.getchannel("A")
bounds = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
left, top, right, bottom = bounds
scale = 198 / (bottom - top)
shoes = alpha.crop((0, bottom - round((bottom - top) * 0.14), im.width, bottom)).point(lambda value: 255 if value >= 16 else 0).getbbox()
center = (shoes[0] + shoes[2]) / 2
crop = im.crop(bounds)
crop = crop.resize((round(crop.width * scale), 198), Image.Resampling.LANCZOS)
x = round(95.5 - (center - left) * scale)
frame = Image.new("RGBA", (192, 208))
frame.alpha_composite(crop, (x, 5))
frame.save(HERE / "low_extracted.png")
(HERE / "low_extraction.json").write_text(json.dumps({"rawSize": im.size, "bounds": bounds, "scale": scale, "pasteXY": [x, 5]}, indent=2) + "\n", encoding="utf-8")
print({"bounds": bounds, "scale": scale, "pasteXY": [x, 5]})
