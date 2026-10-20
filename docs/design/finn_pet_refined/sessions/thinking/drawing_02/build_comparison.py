"""Build an original-versus-drawn comparison; preserve the timing-only experiment."""
import base64
import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent
SESSION = HERE.parent
SOURCE = HERE.parents[3] / "finn_pet" / "frames" / "running"
originals = [SOURCE / f"{index:02}.png" for index in range(6)]
candidate = [HERE / name for name in ["low.png", "middle.png", "temple.png"]]
paths = originals + candidate
encoded = ["data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii") for path in paths]
sequences = [list(range(6)), [0, 6, 7, 8, 7, 6]]
durations = [[120, 120, 120, 120, 120, 220], [3540, 100, 110, 440, 110, 100]]
html = (SESSION / "compare_01.html").read_text(encoding="utf-8")
html = re.sub(r"  const frames = .*?;\n", "  const frames = " + json.dumps(encoded) + ";\n", html, count=1)
html = re.sub(r"  const durations = .*?;\n", "  const durations = " + json.dumps(durations) + ";\n  const sequences = " + json.dumps(sequences) + ";\n", html, count=1)
html = html.replace("frames[frame]", "frames[sequences[index][frame]]")
html = html.replace("Dezelfde 6 frames · lus van 4400 ms", "6 frames, 4 houdingen · lus van 4400 ms")
html = html.replace("Finn met langere denkpauzes, timingproef 01", "Finn met twee getekende tussenposes en vaste voeten, kandidaat 02")
html = html.replace("Dezelfde oorspronkelijke PNG beelden op 192 bij 208 pixels. Rechts veranderen alleen de frametijden. Nog niet gekozen of geïntegreerd.", "Rechts: twee getekende tussenposes, dezelfde weg terug en een langere denkpauze. Vaste voeten en schaal. Nog niet gekozen of geïntegreerd.")
html = html.replace("Finn thinking: zes PNG beelden geladen; lussen 820 en 4400 ms.", "Finn kandidaat 02: negen unieke PNG beelden geladen; lussen 820 en 4400 ms.")
if len(html) > 512000:
    raise ValueError(f"HTML exceeds the 512000 character limit: {len(html)}")
(SESSION / "compare_02.html").write_text(html, encoding="utf-8")
base = Image.open(originals[0]).convert("RGBA")
mask = Image.open(HERE / "arm_region.png").convert("L")
outside = Image.eval(mask, lambda value: 255 - value)
validations = []
for path in candidate:
    im = Image.open(path).convert("RGBA")
    diff = ImageChops.difference(base, im)
    fixed_pixels_equal = all(ImageChops.multiply(channel, outside).getbbox() is None for channel in diff.split())
    lower_body_equal = all(channel.crop((0, 135, 192, 208)).getbbox() is None for channel in diff.split())
    validations.append({"file": path.name, "size": im.size, "mode": im.mode, "alphaBounds": im.getchannel("A").getbbox(), "pixelsOutsideArmRegionUnchanged": fixed_pixels_equal, "lowerBodyAndFeetUnchanged": lower_body_equal})
    if not fixed_pixels_equal or not lower_body_equal or im.size != (192, 208):
        raise ValueError(f"Fixed pixels changed in {path.name}")
manifest = {
    "state": "running", "status": "unapproved_candidate", "candidate": "thinking_drawing_02",
    "tool": "built-in image_gen", "cell": [192, 208],
    "original": {"sequence": sequences[0], "durationsMs": durations[0], "loopDurationMs": sum(durations[0])},
    "candidateTimeline": {"sequence": sequences[1], "durationsMs": durations[1], "loopDurationMs": sum(durations[1]), "uniquePoses": 4, "newDrawnPosesUsed": 2},
    "timelineExplanation": "Original chin pose, newly drawn early lift, newly drawn middle lift, source temple arm, middle lift reversed, early lift reversed; back to the exact starting chin pose.",
    "assembly": "Original frame 00 is the fixed body. Only the arm region is replaced with actual generated or original artwork. No crossfades, no interpolated pixels.",
    "rejectedPose": "The second pose in the first raw generation was too close to the temple and is kept as an experiment only.",
    "files": [{"index": i, "file": str(path.relative_to(HERE.parents[3])).replace('\\', '/'), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for i, path in enumerate(paths)],
    "validation": validations, "htmlCharacters": len(html), "priorExperiment": "../compare_01.html remains unchanged",
    "generationSources": [{"file": name, "sha256": hashlib.sha256((HERE / name).read_bytes()).hexdigest()} for name in ["imagegen_raw.png", "low_raw.png", "prompt.txt", "low_prompt.txt"]],
    "visualStatus": "Requires user review; technical validation does not prove smooth motion."
}
animation = [Image.open(paths[index]).convert("RGBA") for index in sequences[1]]
animation[0].save(HERE / "candidate.webp", save_all=True, append_images=animation[1:], duration=durations[1], loop=0, lossless=True, method=6)
with Image.open(HERE / "candidate.webp") as exported:
    actual = []
    for index in range(exported.n_frames):
        exported.seek(index)
        exported.load()
        actual.append(exported.info.get("duration"))
    manifest["webpValidation"] = {"frames": exported.n_frames, "durationsMs": actual, "loop": exported.info.get("loop"), "size": exported.size}
    if actual != durations[1]:
        raise ValueError("Encoded WebP timing differs from the candidate timeline")
(HERE / "candidate.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"characters": len(html), "uniqueImages": len(paths), "loopsMs": [sum(row) for row in durations], "validation": validations}))
