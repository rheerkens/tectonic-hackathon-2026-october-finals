"""Extract the two generated poses onto the original fixed-size animation cells."""
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
image = Image.open(HERE / "imagegen_raw.png").convert("RGBA")
records = []
frames = []
for index in range(2):
    cell = image.crop((index * image.width // 2, 0, (index + 1) * image.width // 2, image.height))
    alpha = cell.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
    left, top, right, bottom = bounds
    scale = 198 / (bottom - top)
    shoe_bounds = alpha.crop((0, bottom - 100, cell.width, bottom)).point(lambda value: 255 if value >= 16 else 0).getbbox()
    shoe_center = (shoe_bounds[0] + shoe_bounds[2]) / 2
    # One uniform resize; feet are registered to the source shoe center and floor.
    crop = cell.crop(bounds)
    resized = crop.resize((round(crop.width * scale), 198), Image.Resampling.LANCZOS)
    x = round(95.5 - (shoe_center - left) * scale)
    frame = Image.new("RGBA", (192, 208))
    frame.alpha_composite(resized, (x, 5))
    filename = f"inbetween_{index + 1}.png"
    frame.save(HERE / filename)
    frames.append(frame)
    records.append({"file": filename, "cellBounds": bounds, "uniformScale": scale, "pasteXY": [x, 5], "alphaBounds": frame.getchannel("A").getbbox()})
(HERE / "extraction.json").write_text(json.dumps({"rawSize": image.size, "method": "Crop generated cells and uniformly downsample to the original 198 pixel subject height; align shoe center at x95.5 and floor at y202. No warp, blend, morph or crossfade.", "frames": records}, indent=2) + "\n", encoding="utf-8")
source = HERE.parents[3] / "finn_pet" / "frames" / "running"
contact = Image.new("RGBA", (192 * 4, 208))
for index, frame in enumerate([Image.open(source / "00.png"), *frames, Image.open(source / "02.png")]):
    contact.alpha_composite(frame.convert("RGBA"), (192 * index, 0))
contact.save(HERE / "pose_contact.png")
print(json.dumps(records))
