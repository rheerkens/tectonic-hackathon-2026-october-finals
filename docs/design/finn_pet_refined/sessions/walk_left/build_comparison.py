"""Build only this session's self-contained timing comparison and provenance."""
from pathlib import Path
import base64
import hashlib
import json
import struct

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[2] / "finn_pet"
source_manifest = json.loads((SOURCE / "animations.json").read_text(encoding="utf-8"))
animation = next(a for a in source_manifest["animations"] if a["name"] == "running-left")
original = animation["durationsMs"]
candidate = [130, 140, 130, 130, 130, 140, 130, 130]
frames = []
provenance = []
for index in range(animation["frames"]):
    relative = Path(animation["framesDirectory"]) / f"{index:02d}.png"
    data = (SOURCE / relative).read_bytes()
    dimensions = struct.unpack(">II", data[16:24])
    if data[:8] != b"\x89PNG\r\n\x1a\n" or dimensions != (192, 208):
        raise ValueError(f"Unexpected source PNG: {relative}")
    frames.append("data:image/png;base64," + base64.b64encode(data).decode("ascii"))
    provenance.append({"frame": index, "source": "docs/design/finn_pet/" + relative.as_posix(),
                       "sha256": hashlib.sha256(data).hexdigest(), "width": dimensions[0], "height": dimensions[1]})
if len(frames) != 8 or sum(original) != 1060 or sum(candidate) != 1060:
    raise ValueError("Unexpected frame count or loop duration")
template = (HERE / "comparison.template.html").read_text(encoding="utf-8")
html = template.replace("__FRAMES_JSON__", json.dumps(frames)).replace("__DURATIONS_JSON__", json.dumps([original, candidate]))
if len(html) > 512000 or html.count("data:image/png;base64,") != 8:
    raise ValueError("Comparison exceeds inline budget or duplicates images")
(HERE / "timing_01_comparison.html").write_text(html, encoding="utf-8")
manifest = {
    "animation": "running-left", "row": 2, "status": "candidate_unapproved",
    "candidateId": "timing_01", "kind": "timing_only", "redrawn": False,
    "sourceManifest": "docs/design/finn_pet/animations.json",
    "sourceManifestSha256": hashlib.sha256((SOURCE / "animations.json").read_bytes()).hexdigest(),
    "original": {"durationsMs": original, "loopDurationMs": sum(original)},
    "candidate": {"durationsMs": candidate, "loopDurationMs": sum(candidate), "halfCyclesMs": [sum(candidate[:4]), sum(candidate[4:])]},
    "frameOrder": list(range(8)), "frames": provenance,
    "preserved": ["Original PNG bytes and alpha", "192 by 208 cells", "Original drawing scale and positions", "Original frame order", "1060 ms total loop"],
    "changes": ["Frame 8 hold reduced from 220 ms to 130 ms", "Contact poses 2 and 6 displayed for 140 ms; other poses for 130 ms", "Both four-frame halves last 530 ms"],
    "limitations": ["No new foot-contact or in-between drawings", "Existing body and contour jumps remain", "Unapproved candidate; coordinate internal timing with running-right before integration"],
    "comparison": "timing_01_comparison.html", "htmlCharacters": len(html), "embeddedPngCount": len(frames),
    "externalResources": 0, "integration": "none"
}
(HERE / "timing_01.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"comparison": str(HERE / "timing_01_comparison.html"), "htmlCharacters": len(html),
                  "frames": len(frames), "originalMs": original, "candidateMs": candidate, "totalsMs": [sum(original),sum(candidate)]}))
