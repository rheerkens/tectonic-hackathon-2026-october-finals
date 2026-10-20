"""Package exactly the approved review sequence for coordinator takeover."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

here = Path(__file__).resolve().parent
repo = here.parents[4]
manifest = json.loads((here / 'proposal02.json').read_text(encoding='utf-8'))
if not manifest.get('userApproval'):
    raise ValueError('No explicit approval recorded')
player = manifest['players'][1]
target = here / 'approved02'
(target / 'frames').mkdir(parents=True, exist_ok=True)
sources = []
for item in manifest['frameSources']:
    path = repo / item['path'].replace('\\', '/')
    if hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
        raise ValueError('Approved source hash mismatch: ' + str(path))
    sources.append(path)
images = []
for step, source_index in enumerate(player['sequence']):
    path = target / 'frames' / f'{step:02d}.png'
    shutil.copyfile(sources[source_index], path)
    images.append(Image.open(path).convert('RGBA'))
export = target / 'review.webp'
images[0].save(export, save_all=True, append_images=images[1:],
    duration=player['durationsMs'], loop=0, lossless=True, exact=True, method=6)
decoded = Image.open(export)
durations = []
visible_equal = True
for index in range(decoded.n_frames):
    decoded.seek(index)
    actual = decoded.convert('RGBA')
    durations.append(decoded.info['duration'])
    expected = images[index]
    if actual.getchannel('A').tobytes() != expected.getchannel('A').tobytes():
        visible_equal = False
    for left,right in zip(actual.getdata(),expected.getdata()):
        if right[3] and left != right:
            visible_equal = False
if decoded.n_frames != len(images) or durations != player['durationsMs'] or not visible_equal:
    raise ValueError('Export does not preserve approved frames and timing')
result = dict(manifest, export='review.webp',
    exportSha256=hashlib.sha256(export.read_bytes()).hexdigest(),
    decodedFrameCount=decoded.n_frames, decodedDurationsMs=durations,
    visiblePixelsAndAlphaExact=visible_equal, loop=decoded.info.get('loop'),
    integrationStatus='Prepared locally; coordinator owns shared and runtime takeover')
(target / 'manifest.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({key:result[key] for key in ['exportSha256','decodedFrameCount','decodedDurationsMs','visiblePixelsAndAlphaExact','loop']}))
