"""Extract generated in-betweens and build the isolated jumping comparison."""
import base64
import hashlib
import json
import re
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[2] / 'finn_pet'
originals = [SOURCE / 'frames' / 'jumping' / f'{i:02d}.png' for i in range(5)]
sheet_path = HERE / 'proposal02-generated-sheet.png'
sheet = Image.open(sheet_path).convert('RGBA')
out = HERE / 'proposal02-frames'
out.mkdir(exist_ok=True)
normalization = []
# Local y bounds interpolate the neighboring original frames. Resampling is
# uniform, never a morph, optical-flow image or crossfade between source poses.
target_boxes = [(50, 12, 141, 198), (50, 7, 140, 189),
                (50, 8, 141, 192), (50, 13, 141, 201)]
for i, target in enumerate(target_boxes):
    col, row = i % 2, i // 2
    region = (col * sheet.width // 2, row * sheet.height // 2,
              (col + 1) * sheet.width // 2, (row + 1) * sheet.height // 2)
    cell = sheet.crop(region)
    significant = cell.getchannel('A').point(lambda a: 255 if a >= 32 else 0).getbbox()
    # Preserve alpha around the significant figure with a small crop margin.
    margin = 3
    crop_box = (max(0, significant[0]-margin), max(0, significant[1]-margin),
                min(cell.width, significant[2]+margin), min(cell.height, significant[3]+margin))
    cropped = cell.crop(crop_box)
    scale = (target[3]-target[1]) / (significant[3]-significant[1])
    size = (round(cropped.width*scale), round(cropped.height*scale))
    resized = cropped.resize(size, Image.Resampling.LANCZOS)
    x = round((target[0]+target[2])/2 - ((significant[0]+significant[2])/2-crop_box[0])*scale)
    y = round(target[1] - (significant[1]-crop_box[1])*scale)
    canvas = Image.new('RGBA', (192,208))
    canvas.alpha_composite(resized, (x,y))
    path = out / f'{i:02d}.png'
    canvas.save(path)
    normalization.append({'cell':i, 'sheetCrop':region, 'significantAlphaBounds':significant,
                          'crop':crop_box, 'uniformScale':scale, 'position':[x,y],
                          'outputAlphaBounds':canvas.getbbox(), 'targetBounds':target})

inserted = [out / f'{i:02d}.png' for i in range(4)]
all_files = originals + inserted
sequences = [[0,1,2,3,4], [0,5,1,6,2,7,3,8,4]]
durations = [[140,140,140,140,280], [120,60,60,60,120,60,60,60,1200]]
data = ['data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode('ascii') for p in all_files]
previous = HERE / 'proposal01-comparison.html'
if not previous.exists():
    previous.write_bytes((HERE / 'current-comparison.html').read_bytes())
page = previous.read_text(encoding='utf-8')
page = re.sub(r'  const frames = .*?;\n', '  const frames = '+json.dumps(data)+';\n', page)
page = re.sub(r'  const durations = .*?;\n', '  const durations = '+json.dumps(durations)+';\n  const sequences = '+json.dumps(sequences)+';\n', page)
page = page.replace('displays[index].src = frames[frame];', 'displays[index].src = frames[sequences[index][frame]];')
page = page.replace('Frame ${frame+1} van 5', 'Frame ${frame+1} van ${list.length}')
page = page.replace('Dezelfde 5 frames · lus van 1800 ms', '9 frames · lus van 1800 ms')
page = page.replace('Finn met een snellere afzet en meer rust na de landing', 'Finn met vier getekende tussenposes tijdens de sprong')
page = page.replace('Timingproef 01. Dezelfde bronbeelden, schaal en transparantie. Nog niet goedgekeurd.', 'Tekenproef 02. Vier nieuwe tussenposes tussen de vijf bronframes. Eerste kandidaat, nog niet goedgekeurd.')
page = page.replace('<p class="position" id="trial-position">Frame 1 van 5</p>', '<p class="position" id="trial-position">Frame 1 van 9</p>')
if len(page) > 512000:
    raise ValueError('HTML limit exceeded')
(HERE / 'proposal02-comparison.html').write_text(page, encoding='utf-8')
(HERE / 'current-comparison.html').write_text(page, encoding='utf-8')
metadata = {
    'animation':'jumping', 'proposal':'02', 'status':'unapproved visual candidate',
    'generation':'Built-in imagegen, identity-preserve, original five PNGs as references',
    'promptFile':'proposal02-prompt.txt', 'generatedSheet':'proposal02-generated-sheet.png',
    'originalSequence':sequences[0], 'proposalSequence':sequences[1],
    'originalDurationsMs':durations[0], 'proposalDurationsMs':durations[1],
    'originalLoopMs':sum(durations[0]), 'proposalLoopMs':sum(durations[1]),
    'newPoses':['early lift','late ascent','early descent','approaching ground'],
    'normalization':normalization, 'cell':[192,208], 'crossfade':False,
    'limitations':['Generated details may differ from neighboring originals.',
                   'No new anticipation crouch or landing rebound.',
                   'Original jumping scale retained; difference from idle is not corrected.'],
    'files':[{'path':str(p.relative_to(HERE)) if p.is_relative_to(HERE) else str(p.relative_to(SOURCE)),
              'origin':'generated' if p in inserted else 'original',
              'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in all_files],
    'htmlCharacters':len(page),
}
(HERE / 'proposal02-provenance.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'htmlCharacters':len(page), 'normalization':normalization,'durations':durations}))
