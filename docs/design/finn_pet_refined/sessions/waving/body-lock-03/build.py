"""Build a layered browser study with one fixed original body and an arm window."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
SESSION = ROOT.parent
ARM_PATH = 'M137 35H192V153H136L126 131L128 111L122 81L135 70Z'

def main():
    approved_path = ROOT / 'metadata.json'
    if approved_path.exists() and json.loads(approved_path.read_text(encoding='utf-8')).get('status') == 'approved_for_adoption':
        raise SystemExit('Approved variant is frozen. Create a new version for further changes.')
    previous = SESSION / 'inbetween-02/metadata.json'
    record = json.loads(previous.read_text(encoding='utf-8'))
    record['status'] = 'rejected_by_user'
    record['review']['approval'] = 'rejected'
    record['review']['userFeedback'] = 'Je kan nog atlijd met gemak die additionele frames spotten, finn wordt om de één of andere reden dikker'
    previous.write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')

    html = (SESSION / 'comparison-02.html').read_text(encoding='utf-8')
    original = '<img id="waving-trial" width="192" height="208" alt="Finn met een rustiger zwaairitme en terugkeer naar rust">'
    replacement = f'''<svg id="locked-sprite" width="192" height="208" viewBox="0 0 192 208" role="img" aria-label="Finn met vaste bronpose en bewegende arm" style="display:block;margin:auto;max-width:100%;height:auto">
      <defs>
        <mask id="body-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="192" height="208"><rect width="192" height="208" fill="white"/><path d="{ARM_PATH}" fill="black"/></mask>
        <clipPath id="arm-cut"><path d="{ARM_PATH}"/></clipPath>
      </defs>
      <image id="waving-body" width="192" height="208"/>
      <image id="waving-trial" width="192" height="208" clip-path="url(#arm-cut)"/>
    </svg>'''
    if original not in html:
        raise RuntimeError('Expected candidate player image not found')
    html = html.replace(original, replacement)
    html = html.replace('<strong>Voorstel 02</strong>', '<strong>Voorstel 03 · vaste basis</strong>')
    html = html.replace('Drie nieuw getekende tussenposes en vijf bestaande beelden. Zelfde celmaat. Proef voor beoordeling, nog niet goedgekeurd.', 'Vaste oorspronkelijke basis, alleen de arm wisselt. De aansluiting bij schouder en heup is nog een proef.')
    html = html.replace('displays[index].src = frames[sequences[index][frame]];', '''if(index === 0){
          displays[index].src = frames[sequences[index][frame]];
        } else {
          const resting = frame === 0 || frame === 7;
          const body = root.querySelector('#waving-body');
          body.setAttribute('href',frames[0]);
          if(resting) body.removeAttribute('mask');
          else body.setAttribute('mask','url(#body-cut)');
          displays[index].setAttribute('href',frames[sequences[index][frame]]);
          displays[index].style.display = resting ? 'none' : '';
        }''')
    html = html.replace('Finn waving vergelijking met tussenposes','Finn waving met vaste oorspronkelijke basis')
    html = html.replace('Finn waving: acht PNG beelden geladen; drie gegenereerde tussenposes; lussen 700 en 2400 ms.','Finn waving: vaste oorspronkelijke basis, armvenster, acht stappen, 2400 ms.')
    (SESSION / 'comparison-03.html').write_text(html, encoding='utf-8')
    metadata = {
        'status': 'experimental_layered_preview_not_approved',
        'comparison': '../comparison-03.html',
        'basis': 'docs/design/finn_pet/frames/waving/00.png',
        'armSources': '../inbetween-02/metadata.json',
        'durationsMs': [100, 100, 140, 160, 120, 110, 110, 1560],
        'loopDurationMs': 2400,
        'armWindowSvgPath': ARM_PATH,
        'method': 'Browser renders an unchanged original basis outside the arm window. Existing original or generated images supply only the arm window. No new drawing, scaling or PNG modification.',
        'limitations': ['The arm window includes its shoulder attachment and small adjacent clothing areas, which still need visual review.', 'This is a layered browser study, not a newly exported complete sprite sequence.', 'No runtime or source files modified.']
    }
    (ROOT / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'htmlCharacters':len(html), 'status':metadata['status']}))

if __name__ == '__main__':
    main()
