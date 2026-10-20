"""Encode the generated six-frame breathing study; no drawing or interpolation."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys
from PIL import Image, ImageChops, ImageStat

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent.parent / 'finn_pet'
TOOLS = Path.home() / '.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts'
DURATIONS = [900, 700, 600, 600, 700, 900]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def save_json(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

def main():
    spec = importlib.util.spec_from_file_location('trial01', ROOT.parent / 'build_trial.py')
    prior = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prior)
    spec = importlib.util.spec_from_file_location('pet_render', TOOLS / 'render_animation_previews.py')
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    files = sorted((ROOT / 'frames/idle').glob('*.png'))
    frames = [Image.open(p).convert('RGBA') for p in files]
    (ROOT / 'animations').mkdir(exist_ok=True)
    renderer.save_preview(frames, DURATIONS, ROOT / 'animations/idle.gif')
    frames[0].save(ROOT / 'animations/idle.webp', save_all=True, append_images=frames[1:],
                   duration=DURATIONS, loop=0, lossless=True, method=6, quality=100, exact=True)
    row = Image.new('RGBA', (1536,208))
    for i,frame in enumerate(frames):
        row.paste(frame,(i*192,0))
    row.save(ROOT / 'idle_row.png')
    source_atlas = Image.open(SOURCE / 'spritesheet.png').convert('RGBA')
    candidate = source_atlas.copy()
    candidate.paste(row, (0,0))
    candidate.save(ROOT / 'spritesheet.png')
    outputs = []
    for suffix in ['gif','webp']:
        path = ROOT / f'animations/idle.{suffix}'
        with Image.open(path) as im:
            decoded=[]
            for i in range(im.n_frames):
                im.seek(i)
                decoded.append(im.convert('RGBA').copy())
            loop=im.info.get('loop')
        outputs.append({'file':path.relative_to(ROOT).as_posix(), 'sha256':sha(path), 'frames':len(decoded),
                        'durationsMs':prior.encoded_durations(path), 'loop':loop,
                        'size':list(decoded[0].size),
                        'alphaPresentAllFrames':all(x.getchannel('A').getextrema()[0]==0 for x in decoded),
                        'visibleRgbAndAlphaExactToPng':[
                            all(a[3]==b[3] and (a[3]==0 or a[:3]==b[:3]) for a,b in zip(f.get_flattened_data(),d.get_flattened_data()))
                            for f,d in zip(frames,decoded)]})
    untouched=source_atlas.crop((0,208,1536,2288)).tobytes()==candidate.crop((0,208,1536,2288)).tobytes()
    bounds=[f.getbbox() for f in frames]
    checks={
        'sixFrames':len(frames)==6 and all(o['frames']==6 for o in outputs),
        'encodedTimings':all(o['durationsMs']==DURATIONS for o in outputs),
        'infiniteLoop':all(o['loop']==0 for o in outputs),
        'transparentExports':all(o['alphaPresentAllFrames'] for o in outputs),
        'webpVisibleLossless':all(outputs[1]['visibleRgbAndAlphaExactToPng']),
        'constantBounds':len(set(bounds))==1,
        'constantFootBaseline':len(set(b[3] for b in bounds))==1,
        'otherTenRowsPixelExact':untouched,
        'emptyUnusedIdleCells':row.crop((1152,0,1536,208)).getbbox() is None,
        'sourceAtlasHashUnchanged':sha(SOURCE/'spritesheet.png')=='4c441420de210d57ef4e84ee908081b0073b40af2710f5ed1914771471b25a88',
    }
    # These are diagnostic measurements, not visual-quality acceptance gates.
    change=[]
    for i in range(6):
        next_frame=frames[(i+1)%6]
        parts={}
        for name,box in {'head':(45,5,146,90),'torso':(40,90,150,145),'feet':(40,180,150,205)}.items():
            parts[name]=round(sum(ImageStat.Stat(ImageChops.difference(frames[i].crop(box),next_frame.crop(box))).mean),3)
        change.append({'from':i,'to':(i+1)%6,'meanRgbaAbsoluteDifferenceByRegion':parts})
    save_json(ROOT/'validation.json',{'ok':all(checks.values()),'checks':checks,'exports':outputs,
                                     'bounds':bounds,'frameDifferences':change,
                                     'limitations':['New generated artwork needs user visual acceptance.',
                                     'Stable bounds do not prove pixel-identical head or feet; small drawing differences remain.',
                                     'This breathing-only study keeps eyes open. Blink cadence is retained separately in trial 01.',
                                     'GIF uses palette and binary alpha; use PNG or WebP for soft edges.',
                                     'No app or account integration.']})
    save_json(ROOT/'animations.json',{
        'name':'Finn breathing study 02', 'status':'candidate for user comparison, not integrated',
        'state':'idle','row':0,'frames':6,'cellWidth':192,'cellHeight':208,'columns':8,'rows':11,
        'durationsMs':DURATIONS,'loopDurationMs':sum(DURATIONS),'loop':0,
        'gif':'animations/idle.gif','webp':'animations/idle.webp','framesDirectory':'frames/idle',
        'rowStrip':'idle_row.png','spritesheet':'spritesheet.png',
        'sourceAtlas':'../../finn_pet/spritesheet.png','sourceAtlasSha256':sha(SOURCE/'spritesheet.png'),
        'generatedStrip':'decoded/idle.png','generatedStripSha256':sha(ROOT/'decoded/idle.png'),
        'imageGeneration':'Built-in image_gen; identity-preserve with original source_idle_strip.png and finn_pet/idle.png.',
        'extraction':'Existing Pet extract_strip_frames.py, components method, shared row scale and vertical registration.',
        'scope':'Only row 0 replaced in this candidate atlas; rows 1..10 preserved pixel for pixel. Original atlas unchanged.',
        'frameSources':[{'index':i,'file':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'generatedPoseIndex':i} for i,p in enumerate(files)],
        'compatibility':'Existing idle name, six frames and 8x11 layout retained. Player must read custom durations. This is artwork only.',
        'review':'Breathing is very subtle. All eyes open. Tiny frame-to-frame details still vary; candidate remains separate from approved source.'
    })
    print(json.dumps({'ok':all(checks.values()),'checks':checks,'bounds':bounds,'frameDifferences':change},indent=2))
    if not all(checks.values()):
        raise SystemExit('Asset gate failed')

if __name__=='__main__':
    main()
