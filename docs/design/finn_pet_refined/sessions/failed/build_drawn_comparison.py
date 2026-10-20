from pathlib import Path
from PIL import Image
import base64
import hashlib
import io
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
OUT = HERE / 'drawn_02'
FRAMES = OUT / 'frames'
FRAMES.mkdir(exist_ok=True)
raw = Image.open(OUT / 'generated-strip.png').convert('RGBA')
tiles = [raw.crop((round(i*raw.width/3), 0, round((i+1)*raw.width/3), raw.height)) for i in range(3)]
near = Image.open(OUT / 'generated-near-face.png').convert('RGBA')
inputs = [tiles[0], tiles[1], near, tiles[2]]
names = ['hand_low', 'hand_chest', 'hand_cheek', 'hand_temple']
normalization = []

# Technical extraction only: a uniform scale, a transparent cell, and placement
# using the shoe baseline. No painted pixels, warped limbs or blended poses.
for name, im in zip(names, inputs):
    significant = im.getchannel('A').point(lambda a: 255 if a > 8 else 0)
    box = significant.getbbox()
    crop = im.crop(box)
    factor = 198 / crop.height
    size = (round(crop.width*factor), 198)
    scaled = crop.resize(size, Image.Resampling.LANCZOS)
    feet_top = 160
    feet = scaled.getchannel('A').crop((0, feet_top, scaled.width, scaled.height)).point(lambda a: 255 if a > 8 else 0).getbbox()
    foot_center = (feet[0]+feet[2])/2
    x = round(97.5-foot_center)
    canvas = Image.new('RGBA', (192,208))
    canvas.paste(scaled, (x,5))
    canvas.save(FRAMES / f'{name}.png')
    normalization.append({'name':name,'sourceCrop':box,'scale':factor,'placement':[x,5],'alphaBounds':canvas.getchannel('A').getbbox(),'significantAlphaBounds':canvas.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()})

source_paths = [ROOT / 'docs/design/finn_pet/frames/failed' / f'{i:02d}.png' for i in range(8)]
new_paths = [FRAMES / f'{name}.png' for name in names]
all_paths = source_paths + new_paths
data = []
for path in all_paths:
    im = Image.open(path).convert('RGBA')
    stream = io.BytesIO()
    im.save(stream, format='WEBP', lossless=True, exact=True, method=6)
    encoded = stream.getvalue()
    decoded = Image.open(io.BytesIO(encoded)).convert('RGBA')
    if decoded.tobytes() != im.tobytes():
        raise ValueError(f'Lossless decode mismatch: {path}')
    data.append('data:image/webp;base64,'+base64.b64encode(encoded).decode('ascii'))

sequences = [list(range(8)), [0,8,9,10,11,10,9,8,0]]
durations = [[140,140,140,140,140,140,140,240], [120,90,90,90,240,100,100,100,2470]]
html = (HERE / 'timing-01-comparison.html').read_text(encoding='utf-8')
html = re.sub(r'  const frames = .*?;\n', '  const frames = '+json.dumps(data,separators=(',',':'))+';\n', html)
html = re.sub(r'  const sequences = .*?;\n', '  const sequences = '+json.dumps(sequences)+';\n', html)
html = re.sub(r'  const durations = .*?;\n', '  const durations = '+json.dumps(durations)+';\n', html)
html = html.replace('7 bronframes · lus van 3400 ms','9 stappen · 4 nieuwe poses · 3400 ms')
html = html.replace('Frame 1 van 7','Frame 1 van 9')
html = html.replace('Finn in een korte bezorgde reactie met een langere rustpauze','Finn met vier nieuw getekende armstanden, heen en terug')
html = html.replace('Timingproef 01. Korte reactie, open ogen en daarna 2540 ms rust. Dezelfde ongewijzigde PNG beelden op 192 bij 208 pixels.', 'Tekenproef 02. Nieuwe armstanden, open ogen en dezelfde beginpose bij terugkeer. Kandidaat ter beoordeling, niet goedgekeurd.')
html = html.replace('Finn Teleurstelling: 8 bronbeelden geladen; lussen 1220 en 3400 ms.', 'Finn Teleurstelling: 8 bronbeelden en 4 nieuwe poses geladen; lussen 1220 en 3400 ms.')
if len(html)>512000:
    raise ValueError(f'HTML too large: {len(html)}')
(OUT / 'comparison.html').write_text(html,encoding='utf-8')
(HERE / 'current-comparison.html').write_text(html,encoding='utf-8')
metadata = {
    'animation':'failed','trial':'drawn_02','status':'candidate_pending_visual_user_review',
    'cellSize':[192,208], 'original':{'durationsMs':durations[0],'loopDurationMs':1220},
    'candidate':{'frameIds':[all_paths[i].relative_to(ROOT).as_posix() for i in sequences[1]],'durationsMs':durations[1],'loopDurationMs':sum(durations[1]),'exactSameFirstAndLastImage':True},
    'newArt':{'tool':'built-in imagegen','newPoses':names,'references':[str(p.relative_to(ROOT)) for p in [source_paths[0],source_paths[3]]],'prompts':['prompt.txt','prompt-second.txt','prompt-near-face.txt'],'rejectedOutput':'rejected-first-output.png','rejectionReason':'Changed proportions, glasses and background. Not used in playback.'},
    'processing':'Crop generated cells, uniformly resize each silhouette to 198 pixels tall, place by shoes in 192x208 transparent cells. No crossfade, interpolation or body warping.',
    'normalization':normalization,
    'inlineEncoding':'Lossless WebP, RGBA decode checked byte for byte against each PNG. Unique images embedded once.',
    'htmlCharacters':len(html),
    'sources':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in all_paths],
    'limitations':['Generated drawings may still differ in face, folder, clothing and shoe detail; requires visual review.','Reverse playback reuses the same arm poses.','The rest is static and still looks worried.','No application integration or user approval.'],
}
(OUT / 'provenance.json').write_text(json.dumps(metadata,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
strip=Image.new('RGBA',(192*5,208))
for i,path in enumerate([source_paths[0]]+new_paths):strip.paste(Image.open(path).convert('RGBA'),(i*192,0))
strip.save(OUT / 'pose-strip.png')
print(json.dumps({'htmlCharacters':len(html),'candidateDurationMs':sum(durations[1]),'normalization':normalization}))
