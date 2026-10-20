"""Build only the jumping session's original versus timing proposal comparison."""
import base64
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parents[2] / 'finn_pet'
manifest = json.loads((SOURCE / 'animations.json').read_text(encoding='utf-8'))
original = next(item for item in manifest['animations'] if item['name'] == 'jumping')
times = [original['durationsMs'], [140, 80, 160, 80, 1340]]
frames = [SOURCE / 'frames' / 'jumping' / f'{i:02d}.png' for i in range(5)]
data = ['data:image/png;base64,' + base64.b64encode(file.read_bytes()).decode('ascii') for file in frames]
metadata = {
    'animation': 'jumping',
    'proposal': '01',
    'status': 'unapproved timing candidate',
    'cell': {'width': 192, 'height': 208},
    'sourceRow': original['row'],
    'frameOrder': [0, 1, 2, 3, 4],
    'originalDurationsMs': times[0],
    'originalLoopMs': sum(times[0]),
    'proposalDurationsMs': times[1],
    'proposalLoopMs': sum(times[1]),
    'changes': 'Timing only. Source PNG bytes embedded once and shared by both players.',
    'limits': 'No redraw, rescale or interpolation. Missing anticipation and landing compression remain; smaller scale than idle remains.',
    'frames': [{'file': 'docs/design/finn_pet/frames/jumping/' + file.name,
                'sha256': hashlib.sha256(file.read_bytes()).hexdigest()} for file in frames],
}
(HERE / 'proposal01-timing.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
html = '''<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Finn springen vergelijking</title>
<style>
html,body{margin:0;background:transparent;color:var(--foreground,#242424);font-family:var(--font-sans,system-ui,sans-serif)}
#finn-jumping-comparison{width:100%}
#finn-jumping-comparison .pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
#finn-jumping-comparison figure{margin:0;min-width:0;text-align:center}
#finn-jumping-comparison figcaption{margin:0 0 12px}
#finn-jumping-comparison strong{font-weight:500;display:block}
#finn-jumping-comparison .detail{color:var(--muted-foreground,#666);margin-top:4px}
#finn-jumping-comparison .stage{padding:16px;background:var(--muted,#f0f0ed);border-radius:var(--radius,8px)}
#finn-jumping-comparison img{display:block;width:192px;height:208px;margin:auto;max-width:100%;object-fit:contain}
#finn-jumping-comparison .position{font-variant-numeric:tabular-nums;margin:10px 0 0}
#finn-jumping-comparison .controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px}
#finn-jumping-comparison button{font:inherit;min-height:44px;padding:8px 16px;background:var(--secondary,#e8e8e6);color:var(--secondary-foreground,#242424);border:1px solid var(--border,#bbb);border-radius:var(--radius,8px)}
#finn-jumping-comparison .note{color:var(--muted-foreground,#666);margin:12px 0 0}
@media(max-width:479px){#finn-jumping-comparison .pair{grid-template-columns:1fr}}
</style>
</head>
<body>
<section id="finn-jumping-comparison" aria-label="Bewegende vergelijking van Finn springen">
  <div class="pair">
    <figure>
      <figcaption><strong>Origineel</strong><div class="detail">5 frames · lus van 840 ms</div></figcaption>
      <div class="stage"><img id="jumping-source" width="192" height="208" alt="Finn in de oorspronkelijke sprong"></div>
      <p class="position" id="source-position">Frame 1 van 5</p>
    </figure>
    <figure>
      <figcaption><strong>Voorstel</strong><div class="detail">Dezelfde 5 frames · lus van 1800 ms</div></figcaption>
      <div class="stage"><img id="jumping-trial" width="192" height="208" alt="Finn met een snellere afzet en meer rust na de landing"></div>
      <p class="position" id="trial-position">Frame 1 van 5</p>
    </figure>
  </div>
  <div class="controls"><button id="jumping-toggle" type="button" disabled>Pauzeren</button><span id="jumping-status" role="status">Beelden laden</span></div>
  <p class="note">Timingproef 01. Dezelfde bronbeelden, schaal en transparantie. Nog niet goedgekeurd.</p>
</section>
<script>
(() => {
  const root = document.getElementById('finn-jumping-comparison');
  const frames = __FRAMES__;
  const durations = __TIMINGS__;
  const totals = durations.map(list => list.reduce((a,b) => a+b,0));
  const displays = [root.querySelector('#jumping-source'),root.querySelector('#jumping-trial')];
  const labels = [root.querySelector('#source-position'),root.querySelector('#trial-position')];
  const toggle = root.querySelector('#jumping-toggle');
  const status = root.querySelector('#jumping-status');
  let elapsed = 0, previous = 0, playing = true, ready = false;
  const last = [-1,-1];
  const position = (time,list) => {
    let end = 0;
    for(let index=0;index<list.length;index++){
      end += list[index];
      if(time < end) return index;
    }
    return list.length-1;
  };
  function draw(){
    durations.forEach((list,index) => {
      const time = elapsed % totals[index];
      const frame = position(time,list);
      if(last[index] !== frame){
        displays[index].src = frames[frame];
        displays[index].dataset.frame = String(frame);
        last[index] = frame;
      }
      labels[index].textContent = `Frame ${frame+1} van 5 · ${Math.floor(time)} / ${totals[index]} ms`;
    });
    root.dataset.elapsed = String(Math.floor(elapsed));
    root.dataset.playing = String(playing);
  }
  function tick(now){
    if(ready && playing) elapsed += now-previous;
    previous = now;
    if(ready) draw();
    requestAnimationFrame(tick);
  }
  toggle.addEventListener('click',() => {
    playing = !playing;
    previous = performance.now();
    toggle.textContent = playing ? 'Pauzeren' : 'Hervatten';
    status.textContent = playing ? 'Beide animaties spelen' : 'Beide animaties gepauzeerd';
    draw();
  });
  Promise.all(frames.map(src => new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  }))).then(() => {
    ready = true;
    toggle.disabled = false;
    previous = performance.now();
    status.textContent = 'Beide animaties spelen';
    console.info(JSON.stringify({frames:frames.length,durations,totals}));
    draw();
    requestAnimationFrame(tick);
  }).catch(error => {status.textContent='Beelden laden is mislukt';console.error(error);});
})();
</script>
</body>
</html>
'''.replace('__FRAMES__', json.dumps(data)).replace('__TIMINGS__', json.dumps(times))
if len(html) > 512000:
    raise ValueError('HTML exceeds the inline size limit')
(HERE / 'current-comparison.html').write_text(html, encoding='utf-8')
print(json.dumps({'htmlCharacters': len(html), 'originalLoopMs': sum(times[0]), 'proposalLoopMs': sum(times[1]), 'embeddedImages': len(data)}))
