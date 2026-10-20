"""Build a timing-only thinking comparison from unchanged original PNG frames."""

import base64
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
DESIGN = HERE.parents[2]
SOURCE = DESIGN / "finn_pet"
LAYOUT = HERE.parent / "idle" / "current-comparison.html"
manifest = json.loads((SOURCE / "animations.json").read_text(encoding="utf-8"))
original = next(a for a in manifest["animations"] if a["name"] == "running")
proposal = [1800, 120, 120, 120, 120, 2120]
frames = [SOURCE / "frames" / "running" / f"{n:02}.png" for n in range(6)]
images = ["data:image/png;base64," + base64.b64encode(p.read_bytes()).decode("ascii") for p in frames]
html = LAYOUT.read_text(encoding="utf-8")
html, count = re.subn(r"  const frames = .*?;\n", "  const frames = " + json.dumps(images) + ";\n", html, count=1)
if count != 1:
    raise ValueError("Expected exactly one shared frame array in the reference layout")
html = html.replace("idle", "thinking")
html = html.replace("Finn thinking vergelijking", "Finn nadenken vergelijking")
html = html.replace("Bewegende vergelijking van Finn thinking", "Bewegende vergelijking van Finns denkpose")
html = html.replace("6 frames · lus van 1100 ms", "6 frames · lus van 820 ms")
html = html.replace("Proef 01 · voorkeur", "Voorstel")
html = html.replace("Finn in de oorspronkelijke thinking animatie", "Finn in de oorspronkelijke denkpose")
html = html.replace("Finn in de rustigere thinking proef 01", "Finn met langere denkpauzes, timingproef 01")
html = html.replace(
    "Oorspronkelijke PNG beelden op 192 bij 208 pixels. Proef 02 is visueel onvoldoende en blijft buiten deze vergelijking.",
    "Dezelfde oorspronkelijke PNG beelden op 192 bij 208 pixels. Rechts veranderen alleen de frametijden. Nog niet gekozen of geïntegreerd.",
)
html, count = re.subn(r"  const durations = .*?;\n", "  const durations = " + json.dumps([original["durationsMs"], proposal]) + ";\n", html, count=1)
if count != 1:
    raise ValueError("Expected one timing array in the reference layout")
html = html.replace("lussen 1100 en 4400 ms.", "lussen 820 en 4400 ms.")
if len(html) > 512000 or html.count("data:image/png;base64,") != 6:
    raise ValueError("Comparison must embed six unique PNGs once and fit the HTML limit")
if "Proef 02" in html or "voorkeur" in html:
    raise ValueError("Reference-specific status must not leak into this candidate")
(HERE / "compare_01.html").write_text(html, encoding="utf-8")
metadata = {
    "state": "running",
    "label": "Nadenken",
    "candidate": "thinking_timing_01",
    "status": "unapproved_candidate",
    "change": "Timing only; original frame order, unchanged PNG bytes, no new drawing or integration",
    "cell": {"width": 192, "height": 208},
    "original": {"row": original["row"], "durationsMs": original["durationsMs"], "loopDurationMs": original["loopDurationMs"]},
    "proposal": {"durationsMs": proposal, "loopDurationMs": sum(proposal), "frameOrder": list(range(6))},
    "rationale": "Hold chin poses 00 and 05 longer. Keep frames 01 through 04 at their original 120 ms so the gesture itself remains quick.",
    "limitations": ["No intermediate arm pose added", "Existing drawing differences remain", "Long holds contain no new breathing or blinking"],
    "layoutReference": "docs/design/finn_pet_refined/sessions/idle/current-comparison.html, read only",
    "frames": [{"path": "docs/design/finn_pet/frames/running/" + p.name, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in frames],
    "html": {"file": "compare_01.html", "characters": len(html), "embeddedPngCount": 6},
}
(HERE / "timing_01.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"characters": len(html), "originalMs": original["loopDurationMs"], "proposalMs": sum(proposal), "embeddedPngCount": 6}))
