$ErrorActionPreference='Stop'
$repo=(Get-Location).Path
$originalMetadata=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'comparison_01.json') -Raw | ConvertFrom-Json
$paths=@($originalMetadata.sourceFrames | ForEach-Object { $_.path }) + @('docs/design/finn_pet_refined/sessions/waiting/drawn_02/blink_half.png','docs/design/finn_pet_refined/sessions/waiting/drawn_02/blink_closed.png')
$frames=@($paths | ForEach-Object { 'data:image/png;base64,'+[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $repo $_))) })
$candidate=[ordered]@{frameIndices=@(0,6,7,6,0);durationsMs=@(2100,50,80,70,1900);loopDurationMs=4200;uniqueFrameCount=3;playbackStepCount=5}
$data=[ordered]@{frames=$frames;players=@($originalMetadata.original,$candidate)}|ConvertTo-Json -Depth 7 -Compress
$html=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'comparison_01.html'))
$html=[regex]::Replace($html,'const data=.*?,root=document.getElementById',[Text.RegularExpressions.MatchEvaluator]{param($match) 'const data='+$data+',root=document.getElementById'})
$html=$html.Replace('Finn Iets vragen, vergelijking 01','Finn Iets vragen, getekende knippering 02')
$html=$html.Replace('3 bronframes, 5 stappen, lus 4200 ms','3 beelden, 5 stappen, lus 4200 ms')
$html=$html.Replace('Timingproef 01, nog te beoordelen','Twee nieuwe oogstanden, nog te beoordelen')
$html=$html.Replace('Finn houdt rustig zijn vragende houding aan, met een kort glimlachaccent en een knippering','Finn houdt zijn vragende houding vast en knippert met nieuwe tussenstanden, zonder hoofdknik')
$html=$html.Replace('Dezelfde originele PNG beelden op 192 bij 208 pixels. Rechts verandert alleen de framekeuze, volgorde en timing. Beide spelers delen dezelfde klok. Geen hertekening of appintegratie.','Rechts zijn halfgesloten en gesloten ogen nieuw getekend. Hoofd, hand, lichaam en voeten blijven uit hetzelfde bronbeeld. Beide spelers delen dezelfde klok en celmaat van 192 bij 208. Geen crossfades of appintegratie.')
$html=$html.Replace('labels[index].textContent=`Bronframe ${frame+1} van 6, ${Math.floor(time)} / ${player.loopDurationMs} ms`;','labels[index].textContent=index===0?`Bronframe ${frame+1} van 6, ${Math.floor(time)} / ${player.loopDurationMs} ms`:`Stap ${step+1} van 5, ${Math.floor(time)} / ${player.loopDurationMs} ms`;')
if($html.Length -gt 512000){throw 'HTML exceeds inline rendering limit'}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'comparison_02.html'),$html,[Text.UTF8Encoding]::new($false))
$manifest=[ordered]@{
 animation='waiting';displayName='Iets vragen';variant='drawn_blink_02';status='candidate_awaiting_user_review';cellWidth=192;cellHeight=208;
 original=$originalMetadata.original;candidate=$candidate;
 frameTable=@(for($i=0;$i -lt $paths.Count;$i++){[ordered]@{index=$i;path=$paths[$i];sha256=(Get-FileHash -LiteralPath (Join-Path $repo $paths[$i]) -Algorithm SHA256).Hash.ToLowerInvariant()}});
 generation=[ordered]@{tool='image_gen.imagegen';mode='built-in transparent edit';rawOutput='drawn_02/generated_strip.png';prompt='drawn_02/prompt.txt';reference='drawn_02/reference_three_cells.png';extraction='drawn_02/extract.ps1';usedGeneratedCells=@(0,1);unusedGeneratedCells=@(2)};
 processing=@('Two generated eyelid drawings were extracted and fitted to original lens interiors.','Original RGB outside those interiors, original glasses rims and the complete alpha channel are retained.','The same half closed drawing is used when closing and reopening. No temporal crossfade.','Generated third cell looked open rather than partly reopening and was not used.');
 changes=@('Removed the original closed eye frame which also tilts the head.','Removed the original smile accent from timing trial 01, avoiding its mouth and face jump.','Added half closed eyelids before and after a newly drawn closed eye pose.','Blink lasts 200 ms within an unchanged 4200 ms overall cadence. Last and first poses are the same original image.');
 limitations=@('Open hand stays extended. No new lifting or lowering gesture.','Static hold between blinks; no breathing motion.','Visual candidate, not user approved or integrated.');htmlCharacters=$html.Length
}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'comparison_02.json'),($manifest|ConvertTo-Json -Depth 9),[Text.UTF8Encoding]::new($false))
[pscustomobject]@{HtmlCharacters=$html.Length;EmbeddedImages=$frames.Count;LoopMs=$candidate.loopDurationMs;BlinkMs=200}
