from pathlib import Path
from PIL import Image, ImageDraw
import json

HERE = Path(__file__).resolve().parent
SESSION = HERE.parent
ROOT = SESSION.parents[4]
SOURCE = ROOT / 'docs/design/finn_pet/frames/failed'
OUT = HERE / 'frames'
OUT.mkdir(exist_ok=True)
original = Image.open(SOURCE / '00.png').convert('RGBA')
raised = Image.open(SOURCE / '03.png').convert('RGBA')

def polygon(points):
    mask = Image.new('L', (192,208))
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask

# Remove only the free arm. Its previously occluded torso edge is supplied by
# the original raised-arm source pose, never by a generated body.
erase = polygon([(122,83),(135,88),(147,106),(147,124),(136,135),(125,135),(120,123),(124,112),(125,98)])
body = Image.new('RGBA', original.size)
body.paste(original, (0,0))
body.paste((0,0,0,0), (0,0,192,208), erase)
donor = Image.new('RGBA', original.size)
donor.paste(raised, (2,0))
torso = polygon([(121,83),(127,90),(128,104),(127,120),(132,129),(134,135),(123,135),(119,120),(120,95)])
body.paste(donor, (0,0), torso)
body.save(HERE / 'body-plate.png')

definitions = [
    ('hand_low', [(123,85),(131,88),(141,100),(148,109),(148,120),(142,127),(134,128),(127,122),(130,113),(127,102),(123,94)]),
    ('hand_chest', [(123,85),(130,81),(134,77),(141,76),(149,82),(153,93),(152,105),(147,112),(137,114),(129,108),(125,98)]),
    ('hand_cheek', [(124,86),(128,80),(131,77),(129,72),(130,66),(133,63),(139,64),(144,70),(147,83),(152,94),(151,104),(146,110),(138,114),(130,108),(127,99)]),
    ('hand_temple', [(122,45),(126,43),(133,47),(141,55),(144,66),(143,73),(151,80),(156,92),(154,101),(149,107),(140,111),(131,106),(126,98),(123,89),(125,80),(130,77),(135,76),(135,70),(130,64),(126,59),(123,55)]),
]
allowed = Image.new('L', original.size)
ImageDraw.Draw(allowed).polygon([(118,40),(146,40),(159,76),(159,136),(118,136)],fill=255)
report = []
frames = [original]
original.save(OUT / 'rest.png')
for name, points in definitions:
    drawn = Image.open(SESSION / 'drawn_02/frames' / f'{name}.png').convert('RGBA')
    mask = polygon(points)
    mask.save(HERE / f'mask-{name}.png')
    layer = Image.new('RGBA', original.size)
    layer.paste(drawn, (0,0), mask)
    layer.save(HERE / f'layer-{name}.png')
    candidate = Image.alpha_composite(body, layer)
    candidate.save(OUT / f'{name}.png')
    changed_outside = sum(1 for a,b,m in zip(original.getdata(),candidate.getdata(),allowed.getdata()) if not m and a!=b)
    report.append({'name':name,'changedPixelsOutsideArmRegion':changed_outside,'alphaBounds':candidate.getchannel('A').getbbox(),'polygon':points})
    if changed_outside:
        raise ValueError(f'Unexpected body edit in {name}: {changed_outside}')
    frames.append(candidate)
strip=Image.new('RGBA',(192*len(frames),208))
for i,frame in enumerate(frames):strip.paste(frame,(i*192,0))
strip.save(HERE / 'pose-strip.png')
(HERE / 'frame-validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
