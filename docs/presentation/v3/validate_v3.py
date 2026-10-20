"""v3 package checks, PDF font proof and contact sheet. Reads/writes docs/presentation/v3 only. No app tests."""
from pathlib import Path
import sys, json, re, hashlib, zipfile, io
from xml.etree import ElementTree as E
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / '.local/presentation/vendor'))
from pptx import Presentation
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
import pymupdf

folder = ROOT / 'docs/presentation/v3'
path = folder / 'SDtrust_Finals_Dashboard_v3.pptx'
pdf_path = folder / 'SDtrust_Finals_Dashboard_v3.pdf'
p = Presentation(path)
visible = '\n'.join(sh.text_frame.text for pg in p.slides for sh in pg.shapes if sh.has_text_frame)
notes = [pg.notes_slide.notes_text_frame.text for pg in p.slides]
native = json.loads((folder / 'native_validation_v3.json').read_text(encoding='utf-8-sig'))
v1 = json.loads((ROOT / 'docs/presentation/slide_content.json').read_text(encoding='utf-8'))

with zipfile.ZipFile(path) as z:
    assert z.testzip() is None
    names = z.namelist()
    font_parts = [n for n in names if n.endswith('.fntdata')]
    media = [n for n in names if n.startswith('ppt/media/')]
    external = []
    for n in names:
        if n.endswith('.rels'):
            for rel in E.fromstring(z.read(n)):
                if rel.get('TargetMode') == 'External':
                    external.append(rel.attrib)
    pres_xml = z.read('ppt/presentation.xml').decode()

# Content guards: boundaries that must stay visible
required = ['No message is sent.', 'DEMO PLACEHOLDER', 'Scripted fixture demo · synthetic records',
            'Synthetic demo policy', 'Editable storyboard. This is not an app screenshot.', 'Future pilot']
missing = [r for r in required if r not in visible]
assert not missing, missing
assert re.search('[‐-―-]', visible) is None, 'hyphen or dash in visible text'
assert len(p.slides) == 8 and len(notes) == 8
assert all('EVIDENCE BOUNDARY' in n and 'SOURCES' in n and 'SPEAK' in n for n in notes)
for n, m in zip(notes, v1):  # script and sources carried over from reviewed v1
    assert m['spoken'] in n and m['status'] in n and all(src in n for src in m['sources']), m['slide']
assert sum(m['seconds'] for m in v1) == 170
assert native['opened'] and native['overflowCount'] == 0 and not native['outsideSlide']
assert native['loadedFontsExternally'] is False and native['slides'] == 8
assert len(font_parts) == 2 and 'saveSubsetFonts="0"' in pres_xml and 'embedTrueTypeFonts="1"' in pres_xml
assert not external, external
svg = [m for m in media if m.endswith('.svg')]
assert svg, 'official SVG logo missing'

pdf = pymupdf.open(pdf_path)
assert len(pdf) == 8
for pg in pdf: assert abs(pg.rect.width / pg.rect.height - 16 / 9) < 0.001
font_evidence, seen = [], set()
for pg in pdf:
    for res in pg.get_fonts():
        if res[0] in seen: continue
        seen.add(res[0])
        data = pdf.extract_font(res[0])[3]
        ex = TTFont(io.BytesIO(data))
        name = ex['name'].getDebugName(6)
        assert name in ['Manrope-Regular', 'Manrope-Bold'], name
        orig = TTFont(folder / 'assets' / (name + '.ttf'))
        ec, oc, checked = ex.getBestCmap(), orig.getBestCmap(), []
        for ch in 'ASDtrue0124':
            if ord(ch) not in ec: continue
            eg, og = ec[ord(ch)], oc[ord(ch)]
            assert ex['hmtx'][eg][0] == orig['hmtx'][og][0]
            assert ex['glyf'][eg].getCoordinates(ex['glyf'])[0] == orig['glyf'][og].getCoordinates(orig['glyf'])[0]
            checked.append(ch)
        assert checked
        font_evidence.append({'pdf_resource': res[3], 'postscript_name': name, 'glyph_outlines_and_widths_match': checked})

prev = folder / 'preview'
files = sorted(prev.glob('slide_*.png'))
assert len(files) == 8
canvas = Image.new('RGB', (1600, 1880), '#e5e1d8'); dr = ImageDraw.Draw(canvas)
for i, f in enumerate(files):
    im = Image.open(f); assert im.size == (1600, 900)
    x = 16 + (i % 2) * 800; y = 38 + (i // 2) * 460
    canvas.paste(im.resize((768, 432), Image.LANCZOS), (x, y))
    dr.text((x, y - 22), f'Slide {i + 1}', fill='#192d46')
canvas.save(prev / 'contact_sheet.png')

report = {
    'deck': path.name, 'slides': 8, 'aspect_ratio': '16:9', 'planned_seconds': 170,
    'native_reopen_without_external_fonts': True, 'measured_text_overflows': 0, 'shapes_outside_slide': 0,
    'native_text_shapes': native['textShapes'], 'native_picture_shapes': native['pictureShapes'],
    'notes_with_speak_cues_boundary_sources': 8, 'notes_match_reviewed_v1_script_and_sources': True,
    'visible_boundary_labels': required, 'visible_dashes': 0,
    'embedded_font_parts': font_parts, 'embedded_media': media, 'external_relationships': external,
    'pdf_pages': len(pdf), 'pdf_font_evidence': font_evidence, 'preview_dimensions': [1600, 900],
    'not_verified': ['Jury device and projector', 'Spoken timing (170 s is a budget, not a measured rehearsal)',
                     'Actual app demo: slide 4 is an editable placeholder', 'No app operated, built or tested'],
    'artifacts': {},
}
for f in [path, pdf_path, folder / 'SDtrust_Finals_Dashboard_v3_Notes.md', prev / 'contact_sheet.png'] + files:
    report['artifacts'][str(f.relative_to(folder)).replace('\\', '/')] = {'bytes': f.stat().st_size, 'sha256': hashlib.sha256(f.read_bytes()).hexdigest()}
(folder / 'validation_v3.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: report[k] for k in ['slides', 'pdf_pages', 'measured_text_overflows', 'embedded_font_parts', 'pdf_font_evidence', 'external_relationships']}, indent=1))
