"""Build the scoped comparison and candidate from original PNGs and two new poses."""
from pathlib import Path
import base64
import hashlib
import json
import re
from PIL import Image

HERE = Path(__file__).resolve().parent
SESSION = HERE.parent
ROOT = SESSION.parents[4]
SOURCE = ROOT / "docs/design/finn_pet/frames/running-right"
ORIGINAL = [SOURCE / f"{i:02}.png" for i in range(8)]
DRAWINGS = [HERE / "frames/A_landing.png", HERE / "frames/C_extension.png"]
ORDER = [0, 8, 1, 2, 3, 9, 4, 8, 5, 6, 7, 9]
TIMES = [70, 70, 130, 130, 65, 65, 70, 70, 130, 130, 65, 65]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    paths = ORIGINAL + DRAWINGS
    template = (SESSION / "comparison.template.html").read_text(encoding="utf-8")
    template = template.replace('Finn lopen rechts vergelijking', 'Finn lopen rechts, tussenposes 02')
    template = template.replace('<strong>Voorstel</strong><div class="detail">8 frames', '<strong>Voorstel 02</strong><div class="detail">12 frames')
    template = template.replace('Finn met gelijkmatiger timing naar rechts', 'Finn met twee nieuwe tussenposes voor landen en uitstrekken')
    template = template.replace('Timingproef 01, dezelfde oorspronkelijke PNG beelden op 192 bij 208 pixels.', 'Twee nieuwe tekeningen, elk op twee overgangen gebruikt. 192 bij 208 pixels; oorspronkelijke lusduur.')
    template = re.sub(r'const frames=.*?;\n', 'const frames=' + json.dumps([p.as_posix() for p in paths]) + ';\n', template)
    template = re.sub(r'const durations=.*?;\n', 'const orders=[[0,1,2,3,4,5,6,7],'+json.dumps(ORDER)+'];\nconst durations=[[120,120,120,120,120,120,120,220],'+json.dumps(TIMES)+'];\n', template)
    template = template.replace('frames[frame];displays[index].dataset.frame=String(frame);', 'frames[orders[index][frame]];displays[index].dataset.frame=String(frame);displays[index].dataset.asset=String(orders[index][frame]);')
    template = template.replace("' van 8 · '", "' van '+list.length+' · '")
    template = template.replace("console.log('Finn rechts: '+images.length+' PNG beelden geladen; origineel en voorstel 1060 ms; voorstel 2 x 530 ms; één gedeelde klok.');", "console.log('Finn rechts 02: '+images.length+' unieke PNG beelden; 8 originele en 12 kandidaatframes; beide 1060 ms; één gedeelde klok.');")
    (HERE / 'comparison.template.html').write_text(template, encoding='utf-8')
    html = template
    for path in paths:
        html = html.replace(path.as_posix(), 'data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode('ascii'))
    if len(html) >= 512000:
        raise RuntimeError(f'HTML too large: {len(html)}')
    (SESSION / 'inbetweens-comparison.html').write_text(html, encoding='utf-8')
    candidate = [Image.open(paths[i]).convert('RGBA') for i in ORDER]
    candidate[0].save(HERE / 'candidate.webp', save_all=True, append_images=candidate[1:], duration=TIMES, loop=0, lossless=True, exact=True)
    metadata = {
        'animation':'running-right', 'trial':'inbetweens_02', 'status':'unapproved_candidate',
        'frameSize':[192,208], 'originalFrameCount':8, 'candidateFrameCount':12,
        'originalDurationsMs':[120,120,120,120,120,120,120,220],
        'candidateDurationsMs':TIMES, 'candidateOrder':ORDER, 'totalMs':sum(TIMES),
        'halfCycleMs':sum(TIMES[:6]), 'sharedClock':True,
        'uniqueNewDrawings':2, 'insertions':[
            {'drawing':'A_landing','afterSourceFramesZeroBased':[0,4],'purpose':'Weight transfer from extended stride into tucked support'},
            {'drawing':'C_extension','afterSourceFramesZeroBased':[3,7],'purpose':'Unfold raised knee into next extended stride, including loop closure'}],
        'unusedGeneratedDrawing':{'file':'frames/B_knee_rejected.png','reason':'Too high airborne; feet stop short of expected path. Not included.'},
        'generation':{'tool':'built-in image_gen.imagegen','prompt':'prompt.txt','output':'generated_strip.png','originalOutput':'C:/Users/Sebas/.codex/generated_images/01a1589e-d0d9-7823-a519-9a270e71302b/exec-c3a6e8ef-dfe0-4132-b41d-f5351cf6a9eb.png',
                      'referenceFramesZeroBased':[0,1,2,3],'extraction':'prepare_frames.py','sharedScale':0.28},
        'sources':[{'assetIndex':i,'file':p.relative_to(ROOT).as_posix(),'sha256':sha(p)} for i,p in enumerate(paths)],
        'htmlCharacters':len(html),'uniqueEmbeddedImages':html.count('data:image/png;base64,'),
        'limitations':['Drawing transition from original frames 02 to 03 and 06 to 07 remains unchanged.',
                       'Generated upper-body details can vary; no claim of pixel identical identity.',
                       'Candidate preserves 1060 ms but changed internal cadences require joint review with left.',
                       'No crossfade, optical-flow or application integration. Earlier timing_01 retained.']
    }
    approval_path = HERE / 'approval.json'
    if approval_path.exists():
        approval = json.loads(approval_path.read_text(encoding='utf-8'))
        metadata['status'] = approval['status']
        metadata['approval'] = 'approval.json'
    (HERE / 'candidate.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    check=Image.open(HERE / 'candidate.webp')
    durations=[]
    for i in range(check.n_frames):
        check.seek(i);check.load();durations.append(check.info.get('duration'))
    print(json.dumps({'htmlCharacters':len(html),'uniqueEmbeddedImages':metadata['uniqueEmbeddedImages'],
                      'encodedWebpFrames':check.n_frames,'encodedWebpDurations':durations,
                      'candidateTotalMs':sum(TIMES)},indent=2))

if __name__ == '__main__':
    main()
