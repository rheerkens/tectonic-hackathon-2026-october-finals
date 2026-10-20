"""Extract generated transition cells; assemble a review-only candidate."""
from pathlib import Path
import base64
import hashlib
import json
import re
import shutil
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parent
SESSION = ROOT.parent
SOURCE = SESSION.parents[2] / 'finn_pet'
TIMES = [100, 100, 140, 160, 120, 110, 110, 1560]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    out = ROOT / 'frames'
    out.mkdir(exist_ok=True)
    strip = Image.open(ROOT / 'generated-strip.png').convert('RGBA')
    width, height = strip.size
    # Only cell extraction, one shared uniform scale and foot registration.
    # No morphing, repainting, masking or background replacement.
    scale = 198 / 674
    extracted = []
    for index in range(3):
        left, right = round(index * width / 3), round((index + 1) * width / 3)
        cell = strip.crop((left, 0, right, height))
        alpha = list(cell.getchannel('A').get_flattened_data())
        rows = [sum(value > 128 for value in alpha[y * cell.width:(y + 1) * cell.width]) for y in range(height)]
        substantial = [y for y, count in enumerate(rows) if count >= 10]
        bottom = max(substantial) + 1
        foot_x = [x for y in range(560, 710) for x in range(cell.width) if alpha[y * cell.width + x] > 128]
        foot_center = (min(foot_x) + max(foot_x) + 1) / 2
        resized = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
        offset = (round(96 - foot_center * scale), round(203 - bottom * scale))
        frame = Image.new('RGBA', (192, 208))
        frame.paste(resized, offset)
        path = ROOT / f'transition-{index + 1}.png'
        frame.save(path)
        extracted.append({'file': path.name, 'cell': [left, 0, right, height], 'uniformScale': scale, 'offset': list(offset), 'bounds': list(frame.getbbox())})

    paths = [SOURCE / 'frames/waving/00.png', ROOT / 'transition-1.png', SOURCE / 'frames/waving/01.png', SOURCE / 'frames/waving/02.png', ROOT / 'transition-2.png', SOURCE / 'frames/waving/03.png', ROOT / 'transition-3.png', SOURCE / 'idle.png']
    frames = []
    for index, source in enumerate(paths):
        shutil.copyfile(source, out / f'{index:02}.png')
        frames.append(Image.open(source).convert('RGBA'))
    webp = ROOT / 'waving.webp'
    frames[0].save(webp, save_all=True, append_images=frames[1:], duration=TIMES, loop=0, lossless=True, quality=100, method=6, exact=True)
    data = webp.read_bytes()
    durations, pos = [], 12
    while pos + 8 <= len(data):
        kind, size = data[pos:pos + 4], struct.unpack_from('<I', data, pos + 4)[0]
        if kind == b'ANMF':
            durations.append(int.from_bytes(data[pos + 20:pos + 23], 'little'))
        pos += 8 + size + size % 2
    with Image.open(webp) as decoded:
        encoded_frames = decoded.n_frames
        encoded_size = list(decoded.size)
    if durations != TIMES or encoded_frames != 8 or encoded_size != [192, 208]:
        raise RuntimeError('Encoded animation differs from requested timing or cell dimensions')

    original_paths = [SOURCE / f'frames/waving/{i:02}.png' for i in range(4)]
    assets = original_paths + [ROOT / f'transition-{i}.png' for i in range(1, 4)] + [SOURCE / 'idle.png']
    embedded = ['data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode() for path in assets]
    html = (SESSION / 'current-comparison.html').read_text(encoding='utf-8')
    html = re.sub(r'const frames\s*=\s*\[[\s\S]*?\];', 'const frames = ' + json.dumps(embedded) + ';', html, count=1)
    html = html.replace('const durations = [[140,140,140,280],[200,200,240,200,1560]];', 'const durations = [[140,140,140,280],' + json.dumps(TIMES) + '];\n  const sequences = [[0,1,2,3],[0,4,1,2,5,3,6,7]];')
    html = html.replace('displays[index].src = frames[frame];', 'displays[index].src = frames[sequences[index][frame]];')
    html = html.replace('<strong>Voorstel</strong><div class="detail">5 frames', '<strong>Voorstel 02</strong><div class="detail">8 frames')
    html = html.replace('Bestaande beelden op 192 bij 208 pixels. Rechts is een timingvoorstel met de bestaande rustpose, nog niet goedgekeurd.', 'Drie nieuw getekende tussenposes en vijf bestaande beelden. Zelfde celmaat. Proef voor beoordeling, nog niet goedgekeurd.')
    html = html.replace('Finn waving: vijf oorspronkelijke PNG beelden geladen; lussen 700 en 2400 ms.', 'Finn waving: acht PNG beelden geladen; drie gegenereerde tussenposes; lussen 700 en 2400 ms.')
    html = html.replace('Finn waving vergelijking', 'Finn waving vergelijking met tussenposes')
    if len(html) >= 512000:
        raise RuntimeError(f'HTML exceeds inline limit: {len(html)}')
    (SESSION / 'comparison-02.html').write_text(html, encoding='utf-8')

    manifest = {
        'status': 'awaiting_visual_review', 'cell': [192, 208], 'durationsMs': TIMES, 'loopDurationMs': sum(TIMES),
        'imageGeneration': {'tool': 'built_in_image_gen', 'prompt': 'prompt.txt', 'originalOutput': 'generated-strip.png', 'originalOutputSize': list(strip.size)},
        'extraction': extracted,
        'frames': [{'frame': index, 'file': f'frames/{index:02}.png', 'source': str(source), 'sha256': digest(source), 'newDrawing': source.parent == ROOT, 'bounds': list(frames[index].getbbox())} for index, source in enumerate(paths)],
        'export': {'file': 'waving.webp', 'frames': encoded_frames, 'size': encoded_size, 'decodedDurationsMs': durations, 'sha256': digest(webp)},
        'comparison': {'file': '../comparison-02.html', 'characters': len(html), 'embeddedUniqueImages': len(embedded)},
        'limitations': ['Generated transitions may have identity or contour variation. Visual review is decisive.', 'Mechanical extraction uses shared scale plus foot registration; original source files remain unchanged.', 'No runtime integration, trigger change or user approval.']
    }
    (ROOT / 'metadata.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'export': manifest['export'], 'extraction': extracted, 'comparison': manifest['comparison']}, indent=2))

if __name__ == '__main__':
    main()
