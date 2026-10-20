"""Package the exact approved pixels and record approval within this session."""
from pathlib import Path
from PIL import Image, ImageChops
import hashlib
import json

HERE = Path(__file__).resolve().parent
OUT = HERE / 'drawing_02'
ROOT = HERE.parents[4]
manifest_path = OUT / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
approval = json.loads((OUT / 'approval.json').read_text(encoding='utf-8'))
bank = []
for item in manifest['sourceFrames']:
    path = ROOT / item['path']
    if hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
        raise ValueError(f'Approved source differs: {path}')
    bank.append(Image.open(path).convert('RGBA'))
for item in manifest['newPoses']:
    path = OUT / item['preparedPng']
    if hashlib.sha256(path.read_bytes()).hexdigest() != item['pngSha256']:
        raise ValueError(f'Approved prepared pose differs: {path}')
    bank.append(Image.open(path).convert('RGBA'))
frames = [bank[i] for i in manifest['candidateOrder']]
durations = manifest['candidateDurationsMs']
destination = OUT / 'running-left.webp'
frames[0].save(destination,save_all=True,append_images=frames[1:],format='WEBP',lossless=True,exact=True,duration=durations,loop=0,minimize_size=False)
data = destination.read_bytes()
encoded_durations = []
offset = 12
loop = None
while offset + 8 <= len(data):
    tag, size = data[offset:offset+4], int.from_bytes(data[offset+4:offset+8],'little')
    payload = data[offset+8:offset+8+size]
    if tag == b'ANMF': encoded_durations.append(int.from_bytes(payload[12:15],'little'))
    if tag == b'ANIM': loop = int.from_bytes(payload[4:6],'little')
    offset += 8 + size + (size % 2)
decoded = Image.open(destination)
if decoded.n_frames != 12 or decoded.size != (192,208) or encoded_durations != durations or loop != 0:
    raise ValueError('Animation export differs from approved sequence')
for i, expected in enumerate(frames):
    decoded.seek(i)
    actual = decoded.convert('RGBA')
    if actual.getchannel('A').tobytes() != expected.getchannel('A').tobytes():
        raise ValueError(f'Alpha mismatch in exported frame {i}')
    visible = expected.getchannel('A').point(lambda a:255 if a else 0)
    difference = ImageChops.difference(actual.convert('RGB'),expected.convert('RGB'))
    difference.paste((0,0,0),mask=ImageChops.invert(visible))
    if difference.getbbox(): raise ValueError(f'Visible pixel mismatch in frame {i}')
manifest.update({'status':'approved','approval':approval,
    'approvedAnimation':{'file':'running-left.webp','sha256':hashlib.sha256(data).hexdigest(),
        'frameCount':12,'durationsMs':encoded_durations,'loopDurationMs':sum(encoded_durations),'loop':loop,
        'size':[192,208],'alphaAndVisiblePixelsMatchApprovedFrames':True},
    'sessionWork':'complete','integration':'not performed here; central coordination owns integration'})
manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
comparison = OUT / 'comparison.html'
html = comparison.read_text(encoding='utf-8').replace('Tekenproef 02 · vier nieuwe tussenposes · nog te beoordelen.', 'Tekenproef 02 · goedgekeurd voor overname.')
comparison.write_text(html,encoding='utf-8')
print(json.dumps(manifest['approvedAnimation']))
