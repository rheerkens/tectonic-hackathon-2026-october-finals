from pathlib import Path
from PIL import Image
import base64
import hashlib
import io
import json
import re

HERE=Path(__file__).resolve().parent
SESSION=HERE.parent
ROOT=SESSION.parents[4]
originals=[ROOT/'docs/design/finn_pet/frames/failed'/f'{i:02d}.png' for i in range(8)]
names=['hand_low','hand_chest','hand_cheek','hand_temple']
new=[HERE/'frames'/f'{name}.png' for name in names]
paths=originals+new
encoded=[]
for path in paths:
    im=Image.open(path).convert('RGBA')
    output=io.BytesIO()
    im.save(output,format='WEBP',lossless=True,exact=True,method=6)
    value=output.getvalue()
    if Image.open(io.BytesIO(value)).convert('RGBA').tobytes()!=im.tobytes():
        raise ValueError('Lossless image mismatch')
    encoded.append('data:image/webp;base64,'+base64.b64encode(value).decode('ascii'))
sequences=[list(range(8)),[0,8,9,10,11,10,9,8,0]]
durations=[[140,140,140,140,140,140,140,240],[120,90,90,90,240,100,100,100,2470]]
html=(SESSION/'timing-01-comparison.html').read_text(encoding='utf-8')
html=re.sub(r'  const frames = .*?;\n','  const frames = '+json.dumps(encoded,separators=(',',':'))+';\n',html)
html=re.sub(r'  const sequences = .*?;\n','  const sequences = '+json.dumps(sequences)+';\n',html)
html=re.sub(r'  const durations = .*?;\n','  const durations = '+json.dumps(durations)+';\n',html)
html=html.replace('7 bronframes · lus van 3400 ms','9 stappen · vaste originele figuur · 3400 ms')
html=html.replace('Frame 1 van 7','Frame 1 van 9')
html=html.replace('Finn in een korte bezorgde reactie met een langere rustpauze','De oorspronkelijke Finn met alleen nieuwe armstanden')
html=html.replace('Timingproef 01. Korte reactie, open ogen en daarna 2540 ms rust. Dezelfde ongewijzigde PNG beelden op 192 bij 208 pixels.','Proef 03. Alleen de arm verandert. Originele romp, map, benen en schoenen blijven vast. Beide spelers gebruiken dezelfde startklok.')
html=html.replace('Finn Teleurstelling: 8 bronbeelden geladen; lussen 1220 en 3400 ms.','Finn Teleurstelling: 8 bronbeelden en 4 armcomposities geladen; lussen 1220 en 3400 ms.')
if len(html)>512000:raise ValueError('HTML exceeds inline limit')
(HERE/'comparison.html').write_text(html,encoding='utf-8')
(SESSION/'current-comparison.html').write_text(html,encoding='utf-8')
checks=json.loads((HERE/'frame-validation.json').read_text(encoding='utf-8'))
metadata={
    'animation':'failed','trial':'arm_03','status':'candidate_pending_user_review',
    'correction':'Rejected full-body redraws are replaced by arm-only composites over an original-source body plate.',
    'newGenerationThisRevision':False,
    'artOrigin':'Only the generated arm and hand pixels from drawn_02 are reused. Their built-in imagegen prompts and raw outputs remain archived there.',
    'fixedBody':'Original failed/00.png. Previously occluded torso edge uses a small static patch from original failed/03.png shifted two pixels right.',
    'cellSize':[192,208],
    'original':{'durationsMs':durations[0],'loopDurationMs':1220},
    'candidate':{'frameIds':[paths[i].relative_to(ROOT).as_posix() for i in sequences[1]],'durationsMs':durations[1],'loopDurationMs':3400,'firstAndLastSameOriginal':True},
    'validation':checks,
    'export':'Lossless WebP decoded RGBA equals PNG. No crossfade. No whole-body scaling or movement.',
    'htmlCharacters':len(html),
    'sources':[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],
    'limitations':['Small differences in sleeve shading and shoulder connection still require visual review.','The temple hand overlays a small part of the original glasses.','Static torso-edge reconstruction is hidden by the resting arm.'],
}
(HERE/'provenance.json').write_text(json.dumps(metadata,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'htmlCharacters':len(html),'changedPixelsOutsideArmRegion':[c['changedPixelsOutsideArmRegion'] for c in checks],'durationMs':3400}))
