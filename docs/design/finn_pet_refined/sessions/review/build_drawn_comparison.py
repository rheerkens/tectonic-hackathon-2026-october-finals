"""Pack the second review candidate. Does not modify sources or the first trial."""
import base64
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[2] / 'finn_pet'
manifest = json.loads((SOURCE / 'animations.json').read_text(encoding='utf-8'))
original = next(row for row in manifest['animations'] if row['name'] == 'review')
paths = [SOURCE / f'frames/review/{i:02d}.png' for i in range(6)]
paths += [HERE / 'drawn02/arm_low.png', HERE / 'drawn02/pair_0.png']
data = [path.read_bytes() for path in paths]
players = [
    {'name':'Origineel','sequence':list(range(6)),'durationsMs':original['durationsMs'],'loopDurationMs':1030},
    {'name':'Voorstel','sequence':[0,1,6,7,2,3,2,7,6,1,0],
     'durationsMs':[320,100,90,90,100,650,100,90,90,100,1070],'loopDurationMs':2800},
]
if sum(players[1]['durationsMs']) != players[1]['loopDurationMs']:
    raise ValueError('Candidate timing does not match declared duration')
template = (HERE / 'comparison.template.html').read_text(encoding='utf-8')
template = template.replace('6 bronframes · 7 stappen · 3000 ms','4 bronposes + 2 nieuw · 11 stappen · 2800 ms')
template = template.replace('Stap 1 van 7','Stap 1 van 11')
template = template.replace('Timingproef 01. Dezelfde oorspronkelijke PNG beelden, zonder hertekening. Eén startklok voor beide.',
    'Proef 02. Twee getekende armhoudingen, ook op de terugweg. Ogen blijven open. Eén startklok voor beide.')
template = template.replace('zes PNG beelden geladen; origineel 1030 ms, voorstel 3000 ms.',
    'acht PNG beelden geladen; origineel 1030 ms, voorstel 2800 ms.')
html = template.replace('__FRAME_DATA__',json.dumps(['data:image/png;base64,'+base64.b64encode(item).decode('ascii') for item in data]))
html = html.replace('__PLAYERS__',json.dumps(players))
if len(html) >= 512000:
    raise ValueError('Comparison exceeds inline HTML limit')
record = {
    'animation':'review','candidate':'drawn02','status':'candidate, awaiting user review',
    'imagegenMode':'built-in imagegen','cell':[192,208],
    'players':players,'newPoses':[{'index':6,'role':'hand leaving hip'}, {'index':7,'role':'hand nearing folder'}],
    'frameSources':[{'index':i,'path':str(path.relative_to(HERE.parents[4])),'sha256':hashlib.sha256(item).hexdigest()}
                   for i,(path,item) in enumerate(zip(paths,data))],
    'drawingBoundary':[108,89,148,145],
    'processing':'Generated arm region cropped from registered imagegen output onto source 01. No motion interpolation or crossfade.',
    'preserved':'All pixels outside drawingBoundary in both new poses, including face and feet, copied from original 01.',
    'loopSeam':'First and last candidate steps both use original 00, byte identical.',
    'limits':'Open eyes only; existing small head changes between source poses remain. Arm joins require visual review.',
    'initialGeneration':'drawn02/raw_pair_rejected.png: too high for low pose. Left cell reused only as upper inbetween; right cell unused.',
    'prompts':['drawn02/imagegen_prompt.txt','drawn02/low_arm_prompt.txt'],
    'htmlCharacters':len(html),
}
existing_path = HERE / 'proposal02.json'
if existing_path.exists():
    previous = json.loads(existing_path.read_text(encoding='utf-8'))
    if previous.get('userApproval'):
        if previous['players'] != record['players'] or previous['frameSources'] != record['frameSources']:
            raise ValueError('Approved variant changed; preserve it and create a new candidate')
        record['status'] = previous['status']
        record['userApproval'] = previous['userApproval']
(HERE / 'comparison02.html').write_text(html,encoding='utf-8')
existing_path.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'htmlCharacters':len(html),'uniqueImages':len(data),'candidateSteps':len(players[1]['sequence']),
    'loopDurationMs':players[1]['loopDurationMs']}))
