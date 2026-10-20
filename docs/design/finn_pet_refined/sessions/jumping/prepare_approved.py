"""Package the user-approved jumping candidate without changing shared assets."""
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[2] / 'finn_pet'
metadata = json.loads((HERE / 'proposal02-provenance.json').read_text(encoding='utf-8'))
files = [SOURCE / entry['path'] if entry['origin'] == 'original' else HERE / entry['path'] for entry in metadata['files']]
package = HERE / 'approved'
frame_dir = package / 'frames'
frame_dir.mkdir(parents=True, exist_ok=True)
ordered = []
entries = []
for index, source_index in enumerate(metadata['proposalSequence']):
    source = files[source_index]
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != metadata['files'][source_index]['sha256']:
        raise ValueError(f'Approved frame changed: {source}')
    target = frame_dir / f'{index:02d}.png'
    shutil.copyfile(source, target)
    ordered.append(Image.open(target).convert('RGBA'))
    entries.append({'file':f'frames/{index:02d}.png','sha256':digest,'origin':metadata['files'][source_index]['origin']})
webp = package / 'jumping.webp'
ordered[0].save(webp, format='WEBP', save_all=True, append_images=ordered[1:], duration=metadata['proposalDurationsMs'], loop=0, lossless=True, quality=100, method=6)
decoded = Image.open(webp)
actual_durations = []
for i in range(decoded.n_frames):
    decoded.seek(i)
    decoded.load()
    actual_durations.append(decoded.info.get('duration'))
if actual_durations != metadata['proposalDurationsMs'] or decoded.size != (192,208):
    raise ValueError('Export does not preserve approved frame timing and dimensions')
approval = {
    'animation':'jumping','approvedCandidate':'02',
    'userMessage':'In orde mag overgenomen worden',
    'recordedAtUtc':datetime.now(timezone.utc).isoformat(),
    'status':'approved, awaiting coordinator integration',
    'frameCount':9,'cell':[192,208],'durationsMs':actual_durations,'loopDurationMs':sum(actual_durations),
    'webp':{'file':'approved/jumping.webp','sha256':hashlib.sha256(webp.read_bytes()).hexdigest(),'loop':decoded.info.get('loop')},
    'frames':entries,
    'integrationNote':'Use the nine-frame WebP or manifest. Nine frames do not fit the original eight-column atlas row. Original atlas and runtime untouched here.',
}
(HERE / 'approval.json').write_text(json.dumps(approval,indent=2)+'\n',encoding='utf-8')
(package / 'manifest.json').write_text(json.dumps(approval,indent=2)+'\n',encoding='utf-8')
for name in ['current-comparison.html','proposal02-comparison.html']:
    path = HERE / name
    html = path.read_text(encoding='utf-8').replace('Eerste kandidaat, nog niet goedgekeurd.', 'Goedgekeurd voor overname.')
    path.write_text(html,encoding='utf-8')
print(json.dumps({'frames':decoded.n_frames,'durations':actual_durations,'loopMs':sum(actual_durations),'webpSha256':approval['webp']['sha256']}))
