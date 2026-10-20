$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$repo=(Get-Location).Path
$original=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'comparison_01.json') -Raw | ConvertFrom-Json
$sourcePaths=@($original.sourceFrames|ForEach-Object{$_.path})
$frames=@($sourcePaths|ForEach-Object{'data:image/png;base64,'+[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $repo $_)))})
$patches=@(0..2|ForEach-Object{[ordered]@{path='drawn_03/arm_patch_'+$_+'.png';x=118;y=78;width=63;height=57}})
foreach($name in @('half','closed')){
 $inputPath=Join-Path $PSScriptRoot ('drawn_02/blink_'+$name+'.png')
 $outputPath=Join-Path $PSScriptRoot ('drawn_03/blink_patch_'+$name+'.png')
 $image=[Drawing.Bitmap]::FromFile($inputPath)
 $patch=$image.Clone([Drawing.Rectangle]::new(78,42,46,22),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $patch.Save($outputPath,[Drawing.Imaging.ImageFormat]::Png);$patch.Dispose();$image.Dispose()
 $patches+=,[ordered]@{path='drawn_03/blink_patch_'+$name+'.png';x=78;y=42;width=46;height=22}
}
$embeddedPatches=@($patches|ForEach-Object{[ordered]@{x=$_.x;y=$_.y;width=$_.width;height=$_.height;src='data:image/png;base64,'+[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $_.path)))}})
$candidate=[ordered]@{frameIndices=@(0,1,2,3,2,1,0,4,5,4,0);durationsMs=@(400,90,90,650,100,100,650,50,80,70,920);loopDurationMs=3200;uniqueFrameCount=6;playbackStepCount=11}
$data=[ordered]@{frames=$frames;patches=$embeddedPatches;players=@($original.original,$candidate)}|ConvertTo-Json -Depth 8 -Compress
$html=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'comparison_02.html'))
$html=$html.Replace('Finn Iets vragen, getekende knippering 02','Finn Iets vragen, handgebaar 03').Replace('3 beelden, 5 stappen, lus 4200 ms','6 beelden, 11 stappen, lus 3200 ms').Replace('Twee nieuwe oogstanden, nog te beoordelen','Getekend handgebaar met knippering').Replace('Finn houdt zijn vragende houding vast en knippert met nieuwe tussenstanden, zonder hoofdknik','Finn maakt een vriendelijk vragend handgebaar en knippert, met vaste voeten')
$html=$html.Replace('Rechts zijn halfgesloten en gesloten ogen nieuw getekend. Hoofd, hand, lichaam en voeten blijven uit hetzelfde bronbeeld. Beide spelers delen dezelfde klok en celmaat van 192 bij 208. Geen crossfades of appintegratie.','Rechts beweegt de open hand omhoog en naar voren, houdt even aan en keert terug. Drie nieuwe armstanden, met de rustige knippering uit proef 02. Gezicht, map en voeten blijven behouden. Geen crossfades of appintegratie.')
$script=@'
<script>
(() => {
const data=__DATA__,root=document.getElementById('comparison'),players=data.players,displays=[document.getElementById('source'),document.getElementById('candidate')],labels=[document.getElementById('sourcePosition'),document.getElementById('candidatePosition')],toggle=document.getElementById('toggle'),restart=document.getElementById('restart'),status=document.getElementById('status');
let elapsed=0,previous=0,playing=true,ready=false,pools;const last=[-1,-1];
function draw(){players.forEach((player,index)=>{const time=elapsed%player.loopDurationMs;let end=0,step=player.durationsMs.length-1;for(let i=0;i<player.durationsMs.length;i++){end+=player.durationsMs[i];if(time<end){step=i;break}}const frame=player.frameIndices[step];if(last[index]!==frame){displays[index].src=pools[index][frame];last[index]=frame}displays[index].dataset.frame=String(frame);displays[index].dataset.step=String(step);labels[index].textContent=index===0?`Bronframe ${frame+1} van 6, ${Math.floor(time)} / ${player.loopDurationMs} ms`:`Stap ${step+1} van 11, ${Math.floor(time)} / ${player.loopDurationMs} ms`;});root.dataset.elapsed=String(Math.floor(elapsed));root.dataset.playing=String(playing);}
function tick(now){if(ready&&playing)elapsed+=now-previous;previous=now;if(ready)draw();requestAnimationFrame(tick)}
toggle.onclick=()=>{playing=!playing;previous=performance.now();toggle.textContent=playing?'Pauzeren':'Hervatten';toggle.setAttribute('aria-pressed',String(!playing));status.textContent=playing?'Beide animaties spelen':'Beide animaties gepauzeerd';draw()};restart.onclick=()=>{elapsed=0;previous=performance.now();draw()};
document.getElementById('background').onclick=()=>{document.querySelectorAll('.stage').forEach(stage=>stage.classList.toggle('dark'));document.getElementById('background').textContent=document.querySelector('.stage').classList.contains('dark')?'Lichte achtergrond':'Donkere achtergrond'};
const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
Promise.all([...data.frames,...data.patches.map(p=>p.src)].map(load)).then(async images=>{
 const derived=data.patches.map((patch,i)=>{const c=document.createElement('canvas');c.width=192;c.height=208;const g=c.getContext('2d');g.drawImage(images[0],0,0);g.clearRect(patch.x,patch.y,patch.width,patch.height);g.drawImage(images[6+i],patch.x,patch.y);return c.toDataURL('image/png')});
 pools=[data.frames,[data.frames[0],...derived]];await Promise.all(pools[1].map(load));ready=true;toggle.disabled=false;restart.disabled=false;previous=performance.now();root.dataset.ready='true';status.textContent='Beide animaties spelen';draw();console.info('Loaded original frames',data.frames.length,'candidate frames',pools[1].length,'durations',players.map(p=>p.durationsMs));
}).catch(()=>{status.textContent='Beelden konden niet laden';console.error('Finn laadfout')});requestAnimationFrame(tick);
})();
</script>
'@
$script=$script.Replace('__DATA__',$data)
$html=[regex]::Replace($html,'<script>[\s\S]*?</script>',[Text.RegularExpressions.MatchEvaluator]{param($m)$script})
if($html.Length -gt 512000){throw 'HTML exceeds inline rendering limit'}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'comparison_03.html'),$html,[Text.UTF8Encoding]::new($false))
$assetPaths=@('docs/design/finn_pet/frames/waiting/00.png','docs/design/finn_pet_refined/sessions/waiting/drawn_03/arm_0.png','docs/design/finn_pet_refined/sessions/waiting/drawn_03/arm_1.png','docs/design/finn_pet_refined/sessions/waiting/drawn_03/arm_2.png','docs/design/finn_pet_refined/sessions/waiting/drawn_02/blink_half.png','docs/design/finn_pet_refined/sessions/waiting/drawn_02/blink_closed.png')
$manifest=[ordered]@{animation='waiting';displayName='Iets vragen';variant='drawn_gesture_03';status='approved';approvalQuote='In orde zo, mag overgenomen worden';userFeedback='Proef 02 is te statisch, meer animatie gewenst.';cellWidth=192;cellHeight=208;original=$original.original;candidate=$candidate;candidateFrameTable=@(for($i=0;$i -lt $assetPaths.Count;$i++){[ordered]@{index=$i;path=$assetPaths[$i];sha256=(Get-FileHash -LiteralPath (Join-Path $repo $assetPaths[$i]) -Algorithm SHA256).Hash.ToLowerInvariant()}});generation=[ordered]@{tool='image_gen.imagegen';prompt='drawn_03/prompt.txt';raw='drawn_03/generated_strip.png';extraction='drawn_03/extract.ps1';newPoses='Drie opeenvolgende standen van de vrije arm en open hand.';retained='Hoofd, gezicht, map, romp en voeten uit bronframe 00; twee oogstanden uit proef 02.'};patches=$patches;htmlCharacters=$html.Length;limitations=@('Three drawn arm steps can still look stepped, especially at enlarged scale.','No head or torso motion added; this candidate isolates the asking hand gesture.','User approved; integration pending coordinator.')}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'comparison_03.json'),($manifest|ConvertTo-Json -Depth 9),[Text.UTF8Encoding]::new($false))
[pscustomobject]@{HtmlCharacters=$html.Length;CandidateFrames=6;PlaybackSteps=11;LoopMs=3200}
