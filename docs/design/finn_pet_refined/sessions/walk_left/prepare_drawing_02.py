from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
OUT = HERE / 'drawing_02'
OUT.mkdir(exist_ok=True)
SOURCE = HERE.parents[2] / 'finn_pet' / 'frames' / 'running-left'
sheet = Image.new('RGBA', (768, 480), (244, 244, 240, 255))
draw = ImageDraw.Draw(sheet)
for i in range(8):
    frame = Image.open(SOURCE / f'{i:02d}.png').convert('RGBA')
    x, y = (i % 4) * 192, (i // 4) * 240
    draw.text((x + 8, y + 5), f'SOURCE {i:02d}', fill=(20, 20, 20, 255))
    sheet.alpha_composite(frame, (x, y + 26))
sheet.save(OUT / 'reference_sheet.png')
print(OUT / 'reference_sheet.png')
