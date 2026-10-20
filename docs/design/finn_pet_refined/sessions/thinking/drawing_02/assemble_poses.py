"""Assemble real drawn arm poses with the fixed original body, without tweening."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[3] / "finn_pet" / "frames" / "running"
base = Image.open(SOURCE / "00.png").convert("RGBA")
mask = Image.new("L", base.size)
# The union of chin-hand, rising fingers and raised sleeve. The original head,
# folder, left arm, lower torso, legs and shoes remain outside this region.
polygon = [(101, 78), (119, 74), (125, 50), (147, 50), (159, 80), (159, 134), (111, 134), (111, 108), (101, 98)]
ImageDraw.Draw(mask).polygon(polygon, fill=255)
mask.save(HERE / "arm_region.png")
base.save(HERE / "rest.png")
inputs = [("inbetween_1.png", "middle.png"), ("inbetween_2.png", "high_experiment.png")]
if (HERE / "low_extracted.png").exists():
    inputs.insert(0, ("low_extracted.png", "low.png"))
for incoming, outgoing in inputs:
    art = Image.open(HERE / incoming).convert("RGBA")
    Image.composite(art, base, mask).save(HERE / outgoing)
top = Image.open(SOURCE / "02.png").convert("RGBA")
Image.composite(top, base, mask).save(HERE / "temple.png")
names = ["rest.png", *(["low.png"] if (HERE / "low.png").exists() else []), "middle.png", "temple.png"]
contact = Image.new("RGBA", (len(names) * 192, 208))
for index, name in enumerate(names):
    contact.alpha_composite(Image.open(HERE / name), (192 * index, 0))
contact.save(HERE / "assembled_contact.png")
(HERE / "assembly.json").write_text(json.dumps({"base": "docs/design/finn_pet/frames/running/00.png", "templeArm": "docs/design/finn_pet/frames/running/02.png", "maskPolygon": polygon, "method": "Hard region replacement with actual source/generated artwork, no morph, no crossfade. Pixels outside the region are copied from original frame 00.", "selectedPoses": names, "excluded": "high_experiment.png is near the temple endpoint and adds little useful movement."}, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"assembled": names}))
