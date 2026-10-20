from pathlib import Path
import base64
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SOURCE = ROOT / 'docs/design/finn_pet'
REFERENCE = ROOT / 'docs/design/finn_pet_refined/sessions/idle/current-comparison.html'

manifest = json.loads((SOURCE / 'animations.json').read_text(encoding='utf-8'))
original = next(a for a in manifest['animations'] if a['name'] == 'failed')
paths = [SOURCE / 'frames/failed' / f'{i:02d}.png' for i in range(8)]
frames = ['data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode('ascii') for p in paths]
sequences = [list(range(8)), [0, 1, 2, 3, 4, 6, 7]]
durations = [original['durationsMs'], [120, 120, 160, 150, 150, 160, 2540]]

# Reuse only the reference layout; the shared idle file is never written.
reference = REFERENCE.read_text(encoding='utf-8')
style = reference.split('<style>', 1)[1].split('</style>', 1)[0].replace('finn-idle-comparison', 'finn-failed-comparison')
html = '''<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Finn Teleurstelling vergelijking</title><style>STYLE</style></head><body>
<section id="finn-failed-comparison" aria-label="Bewegende vergelijking van Finn Teleurstelling">
  <div class="pair">
    <figure>
      <figcaption><strong>Origineel</strong><div class="detail">8 frames · lus van 1220 ms</div></figcaption>
      <div class="stage"><img id="failed-source" width="192" height="208" alt="Finn in de oorspronkelijke animatie Teleurstelling"></div>
      <p class="position" id="source-position">Frame 1 van 8</p>
    </figure>
    <figure>
      <figcaption><strong>Voorstel</strong><div class="detail">7 bronframes · lus van 3400 ms</div></figcaption>
      <div class="stage"><img id="failed-trial" width="192" height="208" alt="Finn in een korte bezorgde reactie met een langere rustpauze"></div>
      <p class="position" id="trial-position">Frame 1 van 7</p>
    </figure>
  </div>
  <div class="controls"><button class="btn" id="failed-toggle" type="button" disabled>Pauzeren</button><span id="failed-status" role="status">Beelden laden</span></div>
  <p class="note">Timingproef 01. Korte reactie, open ogen en daarna 2540 ms rust. Dezelfde ongewijzigde PNG beelden op 192 bij 208 pixels.</p>
</section>
<script>
(() => {
  const root = document.getElementById('finn-failed-comparison');
  const frames = FRAMES;
  const sequences = SEQUENCES;
  const durations = DURATIONS;
  const totals = durations.map(list => list.reduce((a,b) => a+b,0));
  const displays = [root.querySelector('#failed-source'),root.querySelector('#failed-trial')];
  const labels = [root.querySelector('#source-position'),root.querySelector('#trial-position')];
  const toggle = root.querySelector('#failed-toggle');
  const status = root.querySelector('#failed-status');
  let elapsed = 0, previous = 0, playing = true, ready = false;
  const last = [-1,-1];
  const visited = [new Set(), new Set()];
  function position(time,list){
    let end = 0;
    for(let i=0;i<list.length;i++){end+=list[i];if(time<end)return i;}
    return list.length-1;
  }
  function draw(){
    durations.forEach((list,i) => {
      const time = elapsed % totals[i];
      const frame = position(time,list);
      if(last[i]!==frame){
        displays[i].src=frames[sequences[i][frame]];
        displays[i].dataset.frame=String(frame);
        displays[i].dataset.sourceFrame=String(sequences[i][frame]);
        last[i]=frame;
        visited[i].add(frame);
      }
      labels[i].textContent=`Frame ${frame+1} van ${list.length} · ${Math.floor(time)} / ${totals[i]} ms`;
    });
    root.dataset.elapsed=String(Math.floor(elapsed));
    root.dataset.playing=String(playing);
    root.dataset.visited=JSON.stringify(visited.map(s=>[...s]));
  }
  function tick(now){
    if(ready&&playing)elapsed+=now-previous;
    previous=now;
    if(ready)draw();
    requestAnimationFrame(tick);
  }
  toggle.addEventListener('click',()=>{
    playing=!playing;previous=performance.now();
    toggle.textContent=playing?'Pauzeren':'Hervatten';
    toggle.setAttribute('aria-pressed',String(!playing));
    status.textContent=playing?'Beide animaties spelen':'Beide animaties gepauzeerd';draw();
  });
  Promise.all(frames.map(src=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;
  }))).then(()=>{
    ready=true;toggle.disabled=false;previous=performance.now();
    status.textContent='Beide animaties spelen';root.dataset.ready='true';draw();
    console.log('Finn Teleurstelling: 8 bronbeelden geladen; lussen 1220 en 3400 ms.');
  }).catch(()=>{status.textContent='Beelden konden niet laden';console.error('Finn PNG laadfout');});
  requestAnimationFrame(tick);
})();
</script></body></html>
'''
html = html.replace('STYLE', style).replace('FRAMES', json.dumps(frames, separators=(',', ':'))).replace('SEQUENCES', json.dumps(sequences)).replace('DURATIONS', json.dumps(durations))
if len(html) >= 512000:
    raise ValueError(f'HTML too large: {len(html)} characters')
(HERE / 'current-comparison.html').write_text(html, encoding='utf-8')
provenance = {
    'animation': 'failed', 'label': 'Teleurstelling', 'trial': 'timing_01',
    'status': 'candidate_pending_user_review', 'cellSize': [192,208],
    'original': {'sourceFramesZeroBased': sequences[0], 'durationsMs': durations[0], 'loopDurationMs': sum(durations[0])},
    'proposal': {'sourceFramesZeroBased': sequences[1], 'durationsMs': durations[1], 'loopDurationMs': sum(durations[1]), 'gestureDurationMs': sum(durations[1][:-1]), 'restDurationMs': durations[1][-1]},
    'change': 'Omit source frame 05 (closed eyes), retime the short gesture, hold source frame 07 for 2540 ms.',
    'limitations': ['No redrawing, interpolation, scaling or pixel edits.', 'Abrupt hand transitions remain.', 'End pose remains worried; it is not neutral idle.', 'No runtime integration or user approval.'],
    'sources': [{'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],
    'referenceLayout': REFERENCE.relative_to(ROOT).as_posix(),
    'htmlCharacters': len(html), 'embeddedUniqueImages': len(frames),
}
(HERE / 'timing_01.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'htmlCharacters':len(html),'uniqueImages':len(frames),'loopDurationMs':provenance['proposal']['loopDurationMs']}))
