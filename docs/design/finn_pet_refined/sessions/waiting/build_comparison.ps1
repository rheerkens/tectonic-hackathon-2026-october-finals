$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$destination = $PSScriptRoot
$sourceDir = Join-Path $repo 'docs/design/finn_pet'
$sourceManifest = Get-Content -LiteralPath (Join-Path $sourceDir 'animations.json') -Raw | ConvertFrom-Json
$source = $sourceManifest.animations | Where-Object name -eq 'waiting'
$images = @(0..5 | ForEach-Object {
    $name = '{0:D2}.png' -f $_
    $path = Join-Path $sourceDir ('frames/waiting/' + $name)
    [ordered]@{
        index = $_
        path = 'docs/design/finn_pet/frames/waiting/' + $name
        sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
        data = 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
    }
})
$original = [ordered]@{ frameIndices = @(0,1,2,3,4,5); durationsMs = @($source.durationsMs); loopDurationMs = $source.loopDurationMs }
$candidate = [ordered]@{
    frameIndices = @(0,4,0,2,0)
    durationsMs = @(180,240,1800,110,1870)
    loopDurationMs = 4200
    uniqueSourceFrameCount = 3
    playbackStepCount = 5
}
$provenance = [ordered]@{
    animation = 'waiting'
    displayName = 'Iets vragen'
    variant = 'timing_01'
    status = 'candidate_awaiting_user_review'
    cellWidth = 192
    cellHeight = 208
    sourceRow = 6
    original = $original
    candidate = $candidate
    sourceFrames = @($images | ForEach-Object { [ordered]@{ index = $_.index; path = $_.path; sha256 = $_.sha256 } })
    changes = @('Short smile accent, then hold the forward facing open hand pose.', 'Blink for 110 ms once per 4200 ms.', 'Omit upward and sideways gaze frames 1, 3 and 5.')
    limitations = @('Only frame selection, sequence and timing changed. No redrawing, interpolation, scaling or translation.', 'Existing contour differences remain. No new hand raising or lowering transition.', 'No source replacement or application integration. User has not approved this candidate.')
}
$data = [ordered]@{ frames = @($images | ForEach-Object { $_.data }); players = @($original,$candidate) } | ConvertTo-Json -Depth 8 -Compress
$html = @'
<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Finn Iets vragen, vergelijking 01</title><style>
*{box-sizing:border-box}html,body{margin:0;background:transparent;color:var(--foreground,#242424);font:15px/1.5 var(--font-sans,system-ui,sans-serif)}
.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0;min-width:0;text-align:center}figcaption{margin:0 0 12px;min-height:75px}strong{font-weight:600;display:block}.detail{color:var(--muted-foreground,#666);margin-top:4px;font-size:14px}.stage{padding:16px;background:var(--muted,#f0f0ed);border-radius:var(--radius,8px)}.stage.dark{background:#222b36}.stage img{display:block;width:192px;height:208px;margin:auto;max-width:100%;object-fit:contain}.position{font-size:13px;font-variant-numeric:tabular-nums;margin:10px 0 0}.controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px}button{font:inherit;min-height:44px;padding:8px 16px;cursor:pointer;background:var(--secondary,#e8e8e6);color:var(--secondary-foreground,#242424);border:1px solid var(--border,#bbb);border-radius:var(--radius,8px)}button:focus-visible{outline:3px solid #2788bb;outline-offset:3px}.note{color:var(--muted-foreground,#666);margin:12px 0 0;font-size:13px}#status{font-size:14px}@media(max-width:479px){.pair{grid-template-columns:1fr}figcaption{min-height:0}}
</style></head><body><section id="comparison" aria-label="Iets vragen, bewegende vergelijking"><div class="pair">
<figure><figcaption><strong>Origineel</strong><div class="detail">6 frames, lus 1010 ms<br>Oorspronkelijke volgorde en timing</div></figcaption><div class="stage"><img id="source" width="192" height="208" alt="Finn stelt een vraag in de oorspronkelijke animatie"></div><p class="position" id="sourcePosition">Beelden laden</p></figure>
<figure><figcaption><strong>Voorstel</strong><div class="detail">3 bronframes, 5 stappen, lus 4200 ms<br>Timingproef 01, nog te beoordelen</div></figcaption><div class="stage"><img id="candidate" width="192" height="208" alt="Finn houdt rustig zijn vragende houding aan, met een kort glimlachaccent en een knippering"></div><p class="position" id="candidatePosition">Beelden laden</p></figure>
</div><div class="controls"><button id="toggle" type="button" disabled>Pauzeren</button><button id="restart" type="button" disabled>Opnieuw samen starten</button><button id="background" type="button">Donkere achtergrond</button><span id="status" role="status">Beelden laden</span></div><p class="note">Dezelfde originele PNG beelden op 192 bij 208 pixels. Rechts verandert alleen de framekeuze, volgorde en timing. Beide spelers delen dezelfde klok. Geen hertekening of appintegratie.</p></section><script>
(() => {
const data=__DATA__,root=document.getElementById('comparison'),players=data.players,displays=[document.getElementById('source'),document.getElementById('candidate')],labels=[document.getElementById('sourcePosition'),document.getElementById('candidatePosition')],toggle=document.getElementById('toggle'),restart=document.getElementById('restart'),status=document.getElementById('status');
let elapsed=0,previous=0,playing=true,ready=false;const last=[-1,-1];
function draw(){players.forEach((player,index)=>{const time=elapsed%player.loopDurationMs;let end=0,step=player.durationsMs.length-1;for(let i=0;i<player.durationsMs.length;i++){end+=player.durationsMs[i];if(time<end){step=i;break}}const frame=player.frameIndices[step];if(last[index]!==frame){displays[index].src=data.frames[frame];last[index]=frame}displays[index].dataset.frame=String(frame);displays[index].dataset.step=String(step);labels[index].textContent=`Bronframe ${frame+1} van 6, ${Math.floor(time)} / ${player.loopDurationMs} ms`;});root.dataset.elapsed=String(Math.floor(elapsed));root.dataset.playing=String(playing);}
function tick(now){if(ready&&playing)elapsed+=now-previous;previous=now;if(ready)draw();requestAnimationFrame(tick)}
toggle.onclick=()=>{playing=!playing;previous=performance.now();toggle.textContent=playing?'Pauzeren':'Hervatten';toggle.setAttribute('aria-pressed',String(!playing));status.textContent=playing?'Beide animaties spelen':'Beide animaties gepauzeerd';draw()};
restart.onclick=()=>{elapsed=0;previous=performance.now();draw()};document.getElementById('background').onclick=()=>{document.querySelectorAll('.stage').forEach(stage=>stage.classList.toggle('dark'));document.getElementById('background').textContent=document.querySelector('.stage').classList.contains('dark')?'Lichte achtergrond':'Donkere achtergrond'};
Promise.all(data.frames.map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src}))).then(images=>{ready=true;toggle.disabled=false;restart.disabled=false;previous=performance.now();root.dataset.ready='true';status.textContent='Beide animaties spelen';draw();console.info('Original PNG frames loaded',images.length,'dimensions',images.map(i=>[i.naturalWidth,i.naturalHeight]),'players',players)}).catch(()=>{status.textContent='Beelden konden niet laden';console.error('Finn PNG laadfout')});requestAnimationFrame(tick);
})();
</script></body></html>
'@
$html = $html.Replace('__DATA__', $data)
if ($html.Length -gt 512000) { throw 'HTML exceeds the inline rendering limit' }
[IO.File]::WriteAllText((Join-Path $destination 'comparison_01.html'), $html, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $destination 'comparison_01.json'), ($provenance | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
[pscustomobject]@{ HtmlCharacters=$html.Length; OriginalLoopMs=$original.loopDurationMs; CandidateLoopMs=$candidate.loopDurationMs; EmbeddedUniqueImages=$images.Count }
