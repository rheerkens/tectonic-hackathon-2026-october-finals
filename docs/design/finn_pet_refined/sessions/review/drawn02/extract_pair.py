"""Extract and register imagegen drawings; retain source pixels outside the arm area."""
from pathlib import Path
import json
from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[3] / 'finn_pet' / 'frames' / 'review'
base = Image.open(SOURCE / '01.png').convert('RGBA')
region = (108, 89, 148, 145)

def foot_anchor(image):
    box = image.getchannel('A').crop((0, 175, 192, 208)).point(lambda a: 255 if a >= 128 else 0).getbbox()
    return ((box[0] + box[2]) / 2, box[3] + 175)

def prepare(image, name):
    small = image.resize((192, 208), Image.Resampling.LANCZOS)
    target = foot_anchor(base)
    current = foot_anchor(small)
    delta = (round(target[0] - current[0]), round(target[1] - current[1]))
    aligned = Image.new('RGBA', base.size)
    aligned.paste(small, delta)
    aligned.save(HERE / (name + '_full.png'))
    output = base.copy()
    output.paste(aligned.crop(region), region[:2])
    output.save(HERE / (name + '.png'))
    return {'name':name,'registrationTranslationPx':delta,'newArtworkRegion':region,
            'staticHeadAndFeetPreserved':output.crop((0,0,192,86)).tobytes()==base.crop((0,0,192,86)).tobytes()
            and output.crop((0,145,192,208)).tobytes()==base.crop((0,145,192,208)).tobytes()}

if __name__ == '__main__':
    raw = Image.open(HERE / 'raw_pair_rejected.png').convert('RGBA')
    records=[]
    for index in range(2):
        box=(round(index*raw.width/2),0,round((index+1)*raw.width/2),raw.height)
        records.append(prepare(raw.crop(box), 'pair_'+str(index)))
    (HERE / 'pair_extraction.json').write_text(json.dumps(records,indent=2))
    print(json.dumps(records))
