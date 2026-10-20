"""Arrange original images for the image generation edit request, without retouching."""
from pathlib import Path
from PIL import Image

here = Path(__file__).resolve().parent
source = here.parents[2] / 'finn_pet' / 'frames' / 'review'
target = here / 'drawn02'
target.mkdir(exist_ok=True)
base = Image.open(source / '01.png').convert('RGBA')
canvas = Image.new('RGBA', (768, 416))
for x in (0, 384):
    canvas.paste(base.resize((384, 416), Image.Resampling.NEAREST), (x, 0))
canvas.save(target / 'arm_reference.png')
