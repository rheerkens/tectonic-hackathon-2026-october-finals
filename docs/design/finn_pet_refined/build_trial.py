"""Deterministic timing study. Does not draw or transform Finn pixels."""
from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
import struct
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / 'finn_pet'
TIMINGS = [1400, 900, 90, 110, 120, 1780]
SCRIPTS = Path.home() / '.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def save_json(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

def encoded_durations(path):
    if path.suffix == '.gif':
        with Image.open(path) as im:
            times = []
            for i in range(im.n_frames):
                im.seek(i)
                times.append(im.info['duration'])
            return times
    data = path.read_bytes()
    pos, times = 12, []
    while pos + 8 <= len(data):
        name, size = data[pos:pos+4], struct.unpack_from('<I', data, pos+4)[0]
        payload = data[pos+8:pos+8+size]
        if name == b'ANMF':
            times.append(int.from_bytes(payload[12:15], 'little'))
        pos += 8 + size + (size % 2)
    return times

def main():
    (ROOT / 'frames/idle').mkdir(parents=True, exist_ok=True)
    (ROOT / 'animations').mkdir(exist_ok=True)
    files = sorted((SOURCE / 'frames/idle').glob('*.png'))
    frames = [Image.open(p).convert('RGBA') for p in files]
    for p in files:
        shutil.copyfile(p, ROOT / 'frames/idle' / p.name)
    strip = Image.new('RGBA', (1536, 208))
    for i, frame in enumerate(frames):
        strip.paste(frame, (i * 192, 0))
    strip.save(ROOT / 'idle_row.png')
    spec = importlib.util.spec_from_file_location('pet_render', SCRIPTS / 'render_animation_previews.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.save_preview(frames, TIMINGS, ROOT / 'animations/idle.gif')
    frames[0].save(ROOT / 'animations/idle.webp', save_all=True, append_images=frames[1:],
                   duration=TIMINGS, loop=0, lossless=True, quality=100, method=6, exact=True)
    # A readable static companion, explicitly not evidence of playback by itself.
    contact = Image.new('RGB', (1152, 248), '#eeeae3')
    draw = ImageDraw.Draw(contact)
    clock = 0
    for i, frame in enumerate(frames):
        contact.paste(frame, (192*i, 32), frame)
        draw.text((192*i+12, 8), f'{i:02d}: {clock} ms / {TIMINGS[i]} ms', fill='#192d46')
        clock += TIMINGS[i]
    contact.save(ROOT / 'timing_contact.png')
    source_meta = json.loads((SOURCE / 'animations.json').read_text())
    manifest = {
        'name': 'Finn idle timing study 01', 'status': 'awaiting user visual review',
        'state': 'idle', 'row': 0, 'frames': 6, 'cellWidth': 192, 'cellHeight': 208,
        'durationsMs': TIMINGS, 'loopDurationMs': sum(TIMINGS), 'loop': 0,
        'gif': 'animations/idle.gif', 'webp': 'animations/idle.webp',
        'framesDirectory': 'frames/idle', 'rowStrip': 'idle_row.png',
        'sourceAtlas': '../finn_pet/spritesheet.png', 'sourceAtlasSha256': digest(SOURCE / 'spritesheet.png'),
        'sourceDurationsMs': source_meta['animations'][0]['durationsMs'],
        'sourcePetId': source_meta['petId'],
        'transformation': 'Timing only. Six source PNGs copied byte for byte in original order. No drawing, morph, interpolation, rescaling or registration change.',
        'compatibility': 'Row 0, six frames, cells 192x208, columns 0..5; columns 6..7 transparent. Original atlas remains authoritative for all other states and look directions. A player must consume these explicit timings to show the study. Fixed original timings will not change.',
        'frameMapping': [{'frame': i, 'source': f'../finn_pet/frames/idle/{p.name}', 'file': f'frames/idle/{p.name}', 'sha256': digest(p)} for i,p in enumerate(files)],
        'imageGeneration': 'Not used. No new or modified drawing in this timing study.'
    }
    save_json(ROOT / 'animations.json', manifest)
    original_checksums = json.loads((SOURCE / 'checksums.json').read_text())
    source_mismatches = [name for name,sha in original_checksums.items() if digest(SOURCE / name) != sha]
    exports = []
    for suffix in ['gif', 'webp']:
        path = ROOT / f'animations/idle.{suffix}'
        decoded = []
        with Image.open(path) as im:
            for i in range(im.n_frames):
                im.seek(i)
                decoded.append(im.convert('RGBA').copy())
            size, loop = list(im.size), im.info.get('loop')
        times = encoded_durations(path)
        exact = [a.tobytes() == b.tobytes() for a,b in zip(frames, decoded)]
        # Animated libwebp may alter hidden RGB at alpha 0. Validate every
        # visible RGB value and every alpha value separately, without hiding it.
        visible_exact = [all(p[3] == q[3] and (p[3] == 0 or p[:3] == q[:3])
                             for p,q in zip(a.get_flattened_data(), b.get_flattened_data()))
                         for a,b in zip(frames, decoded)]
        hidden_residue = [sum(p[3] == 0 and p[:3] != (0,0,0) for p in im.get_flattened_data()) for im in decoded]
        exports.append({'file': path.relative_to(ROOT).as_posix(), 'size': size, 'frames': len(decoded),
                        'durationsMs': times, 'loopDurationMs': sum(times), 'loop': loop,
                        'transparentPixelsEveryFrame': all(im.getchannel('A').getextrema()[0] == 0 for im in decoded),
                        'rgbaExactToSource': exact, 'visibleRgbAndAllAlphaExact': visible_exact,
                        'hiddenRgbResiduePixels': hidden_residue, 'sha256': digest(path)})
    checks = {
        'sourceHashesMatch': not source_mismatches,
        'sourcePngCopiesByteExact': all(digest(p) == digest(ROOT / 'frames/idle' / p.name) for p in files),
        'sixFramesBothExports': all(x['frames'] == 6 for x in exports),
        'timingsMatchBothExports': all(x['durationsMs'] == TIMINGS for x in exports),
        'transparentBothExports': all(x['transparentPixelsEveryFrame'] for x in exports),
        'webpVisibleRgbAndAllAlphaLossless': all(exports[1]['visibleRgbAndAllAlphaExact']),
        'rowCellsSixAndSevenEmpty': strip.crop((1152,0,1536,208)).getbbox() is None,
    }
    metrics = []
    for state in source_meta['animations']:
        fs = [Image.open(p).convert('RGBA') for p in sorted((SOURCE / state['framesDirectory']).glob('*.png'))]
        bounds = [im.getbbox() for im in fs]
        metrics.append({'state':state['name'], 'bounds':bounds,
                        'bottomYExclusive': [b[3] for b in bounds],
                        'loopSeamChangedPixels': sum(a != b for a,b in zip(fs[-1].get_flattened_data(),fs[0].get_flattened_data()))})
    save_json(ROOT / 'source_motion_metrics.json', metrics)
    result = {'ok':all(checks.values()), 'checks': checks, 'exports': exports,
              'sourceMismatches':source_mismatches,
              'idleBounds': [im.getbbox() for im in frames],
              'limitations':['GIF uses a palette and binary alpha, so it is not pixel exact.',
                             'Animated libwebp alters some hidden RGB values at alpha 0; visible RGB and all alpha are checked exactly. PNG frames retain exact source bytes.',
                             'Timing study preserves existing drawing discontinuities.',
                             'No new continuous breathing artwork; this study changes cadence only.',
                             'No desktop or account integration has been performed.']}
    save_json(ROOT / 'validation.json', result)
    print(json.dumps(result, indent=2))
    if not result['ok']:
        raise SystemExit('Asset validation failed')

if __name__ == '__main__':
    main()
