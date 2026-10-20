from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[5]
metadata=json.loads((HERE/'provenance.json').read_text(encoding='utf-8'))
if metadata['status']!='approved_by_user_for_coordinator_takeover':
    raise ValueError('This export requires the recorded user approval.')
OUT=HERE/'approved'
(OUT/'frames').mkdir(parents=True,exist_ok=True)
sources=[ROOT/p for p in metadata['candidate']['frameIds']]
frames=[Image.open(p).convert('RGBA') for p in sources]
durations=metadata['candidate']['durationsMs']
for i,path in enumerate(sources):shutil.copyfile(path,OUT/'frames'/f'{i:02d}.png')
target=OUT/'failed.webp'
frames[0].save(target,format='WEBP',save_all=True,append_images=frames[1:],duration=durations,loop=0,lossless=True,exact=True,method=6)
decoded=Image.open(target)
actual=[]
checks=[]
for i in range(decoded.n_frames):
    decoded.seek(i)
    rgba=decoded.convert('RGBA')
    actual.append(decoded.info.get('duration'))
    a=frames[i].tobytes(); b=rgba.tobytes()
    alpha_equal=a[3::4]==b[3::4]
    visible_equal=all(a[j:j+3]==b[j:j+3] for j in range(0,len(a),4) if a[j+3])
    checks.append({'frame':i,'size':list(rgba.size),'alphaEqual':alpha_equal,'visibleRGBEqual':visible_equal})
if decoded.n_frames!=9 or actual!=durations or not all(c['alphaEqual'] and c['visibleRGBEqual'] and c['size']==[192,208] for c in checks):
    raise ValueError('Export does not match the approved animation.')
result={'animation':'failed','approvedVariant':'arm_03','approval':metadata['approval'],'frames':9,'size':[192,208],'durationsMs':actual,'loopDurationMs':sum(actual),'loop':decoded.info.get('loop'),'webp':'failed.webp','sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'frameFiles':[f'frames/{i:02d}.png' for i in range(9)],'validation':checks,'integrationPerformed':False}
(OUT/'animation.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'frames':decoded.n_frames,'durationsMs':actual,'loopDurationMs':sum(actual),'sha256':result['sha256'],'visiblePixelsAndAlphaEqual':True}))
