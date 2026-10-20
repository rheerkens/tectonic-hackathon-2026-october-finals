"""Flatten the approved browser composition, without redrawing its source images.

Run once to prepare comparison.html. In the existing browser, call
window.captureApprovedFrame(index) for indices 0..7 and save the returned PNGs
as frames/00.png through 07.png. Then run with --encode.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
REFINED = ROOT.parents[1]
APPROVED = REFINED / "sessions/waving/comparison-03.html"
METADATA = REFINED / "sessions/waving/body-lock-03/metadata.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


metadata = json.loads(METADATA.read_text(encoding="utf-8"))
source = APPROVED.read_text(encoding="utf-8")
frames = json.loads(re.search(r"const frames = (\[.*?\]);", source, re.S).group(1))
durations = json.loads(re.search(r"const durations = (\[.*?\]);", source, re.S).group(1))[1]
order = json.loads(re.search(r"const sequences = (\[.*?\]);", source, re.S).group(1))[1]
clip = metadata["armWindowSvgPath"]
if durations != metadata["durationsMs"] or clip not in source:
    raise ValueError("Approved metadata and browser composition disagree")

if "--encode" not in sys.argv:
    (ROOT / "frames").mkdir(exist_ok=True)
    write_json(ROOT / "composition.json", {"frames": frames, "durations": durations, "order": order, "clip": clip})
    (ROOT / "comparison.html").write_text('''<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Begroeten, goedgekeurde compositie en export</title>
<style>body{font:15px/1.5 system-ui;color:#243246;max-width:860px;margin:24px auto;padding:0 16px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}.stage{background:#eae7df;min-height:240px;display:grid;place-items:center}svg,img{width:192px;height:208px;display:block}button{font:inherit;padding:10px 16px;margin:16px 8px 0 0}small{display:block}@media(max-width:480px){.pair{grid-template-columns:1fr}}</style>
<h1>Begroeten, dezelfde goedgekeurde beweging</h1><div class="pair"><section><h2>Goedgekeurde lagencompositie</h2><div class="stage" id="composition"></div></section><section><h2>Geëxporteerde PNG frames</h2><div class="stage"><img id="export" alt="Geëxporteerde Finn"></div></section></div><p id="status" role="status">Laden</p><button id="pause">Pauzeren</button><button id="step">Volgend frame</button><p>Beide kanten delen dezelfde klok. Acht stappen, 2400 ms. Deze export verandert geen tekening of lichaamsbouw.</p><p><a href="../../sessions/waving/comparison-03.html">Oorspronkelijke goedgekeurde vergelijking</a> · <a href="waving.webp">Werkelijke WebP export</a></p>
<script>
let data,phase=0,last=performance.now(),playing=true,current=0;
function svgFrame(index){const rest=index===0||index===7;return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="208" viewBox="0 0 192 208"><defs><mask id="body-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="192" height="208"><rect width="192" height="208" fill="white"/><path d="${data.clip}" fill="black"/></mask><clipPath id="arm-cut"><path d="${data.clip}"/></clipPath></defs><image width="192" height="208" href="${data.frames[0]}" ${rest?'':'mask="url(#body-cut)"'}/>${rest?'':`<image width="192" height="208" href="${data.frames[data.order[index]]}" clip-path="url(#arm-cut)"/>`}</svg>`}
window.captureApprovedFrame=async index=>{if(!data)throw Error('Not ready');const svg=svgFrame(index),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const im=new Image();im.src=url;await im.decode();const canvas=document.createElement('canvas');canvas.width=192;canvas.height=208;canvas.getContext('2d').drawImage(im,0,0);return canvas.toDataURL('image/png').split(',')[1]}finally{URL.revokeObjectURL(url)}};
function show(i){current=i;document.querySelector('#composition').innerHTML=svgFrame(i);document.querySelector('#export').src='frames/'+String(i).padStart(2,'0')+'.png';document.querySelector('#status').textContent='Frame '+(i+1)+' van 8, '+data.durations[i]+' ms'}
fetch('composition.json').then(r=>r.json()).then(d=>{data=d;window.approvedComposition=d;show(0);last=performance.now()});
function tick(now){if(data&&playing){phase=(phase+Math.min(now-last,100))%2400;let t=phase,i=0;while(i<7&&t>=data.durations[i])t-=data.durations[i++];if(i!==current)show(i)}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);
document.querySelector('#pause').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pauzeren':'Hervatten'};document.querySelector('#step').onclick=()=>{playing=false;document.querySelector('#pause').textContent='Hervatten';const next=(current+1)%8;phase=data.durations.slice(0,next).reduce((a,b)=>a+b,0);show(next)};
</script></html>''', encoding="utf-8")
    print("Prepared the approved SVG composition for browser rasterization")
else:
    images = [Image.open(ROOT / "frames" / f"{i:02}.png").convert("RGBA") for i in range(8)]
    images[0].save(ROOT / "waving.webp", save_all=True, append_images=images[1:], duration=durations, loop=0, lossless=True, quality=100, method=6, exact=True)
    actual_times, equal = [], []
    with Image.open(ROOT / "waving.webp") as im:
        count, size, loop = im.n_frames, im.size, im.info["loop"]
        for i in range(count):
            im.seek(i)
            im.load()
            actual_times.append(im.info["duration"])
            equal.append(all(a[3] == b[3] and (a[3] == 0 or a[:3] == b[:3]) for a, b in zip(images[i].get_flattened_data(), im.convert("RGBA").get_flattened_data())))
    if count != 8 or size != (192, 208) or loop != 0 or actual_times != durations or not all(equal):
        raise ValueError("Encoded export does not match the approved rasterized composition")
    manifest = {"state": "waving", "variant": "body_lock_03", "status": "approved_composition_exported", "approvalSource": "sessions/waving/body-lock-03/metadata.json", "approvedHtmlSha256": digest(APPROVED), "metadataSha256": digest(METADATA), "method": "Chromium native SVG rasterization of the exact approved mask, clip path and embedded source pixels, then lossless WebP", "clipPath": clip, "sourceOrder": order, "durationsMs": durations, "loopDurationMs": sum(durations), "frameCount": count, "size": list(size), "loop": loop, "webp": "waving.webp", "sha256": digest(ROOT / "waving.webp"), "frames": [{"file": f"frames/{i:02}.png", "sha256": digest(ROOT / "frames" / f"{i:02}.png")} for i in range(8)], "visiblePixelsAndAlphaMatchPng": all(equal), "firstAndLastEqual": images[0].tobytes() == images[-1].tobytes(), "excluded": "sessions/waving/inbetween-02/waving.webp, rejected full-body variant", "runtimeIntegrationPerformed": False}
    write_json(ROOT / "manifest.json", manifest)
    print(json.dumps({k: manifest[k] for k in ["frameCount", "durationsMs", "loopDurationMs", "sha256", "visiblePixelsAndAlphaMatchPng", "firstAndLastEqual"]}))
