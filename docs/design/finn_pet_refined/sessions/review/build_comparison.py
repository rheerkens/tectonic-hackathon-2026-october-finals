"""Build the review timing comparison from unchanged source PNG files."""
import base64
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
DESIGN = HERE.parents[2]
SOURCE = DESIGN / "finn_pet"
manifest = json.loads((SOURCE / "animations.json").read_text(encoding="utf-8"))
original = next(item for item in manifest["animations"] if item["name"] == "review")
frames = []
sources = []
for index in range(original["frames"]):
    relative = f"frames/review/{index:02d}.png"
    data = (SOURCE / relative).read_bytes()
    frames.append("data:image/png;base64," + base64.b64encode(data).decode("ascii"))
    sources.append({"index": index, "file": "docs/design/finn_pet/" + relative,
                    "sha256": hashlib.sha256(data).hexdigest()})

players = [
    {"name": "Origineel", "sequence": list(range(6)), "durationsMs": original["durationsMs"]},
    {"name": "Voorstel", "sequence": [0, 1, 2, 3, 1, 4, 5],
     "durationsMs": [320, 420, 200, 620, 240, 100, 1100]},
]
for player in players:
    player["loopDurationMs"] = sum(player["durationsMs"])

record = {
    "animation": "review", "sourceRow": 8, "candidate": "proposal01",
    "status": "candidate, not approved or integrated",
    "cellWidth": 192, "cellHeight": 208,
    "changes": "Timing and order only. Source frame 01 is reused before the blink.",
    "limitations": "No redrawing, morphing, crossfading, scaling or new inbetween poses. Existing hand jumps remain.",
    "players": players, "sourceFrames": sources,
}
template = (HERE / "comparison.template.html").read_text(encoding="utf-8")
html = template.replace("__FRAME_DATA__", json.dumps(frames)).replace("__PLAYERS__", json.dumps(players))
if len(html) >= 512000:
    raise ValueError("HTML exceeds the inline size limit")
(HERE / "comparison01.html").write_text(html, encoding="utf-8")
(HERE / "proposal01.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"htmlCharacters": len(html), "embeddedPngs": len(frames), "players": players}))
