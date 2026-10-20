$ErrorActionPreference = 'Stop'
# Reopens the final embedded v2 deck WITHOUT loading font files, measures text bounds, exports PDF and previews.
$outDir = $PSScriptRoot
$final = Join-Path $outDir 'SDtrust_Finals_Refined_v2.pptx'
$pdf = Join-Path $outDir 'SDtrust_Finals_Refined_v2.pdf'
$previewDir = Join-Path $outDir 'preview'
New-Item -ItemType Directory -Force -Path $previewDir | Out-Null
$existing = @(Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = $null; $deck = $null
try {
 $app = New-Object -ComObject PowerPoint.Application
 $deck = $app.Presentations.Open($final, -1, 0, 0)
 $W = $deck.PageSetup.SlideWidth; $H = $deck.PageSetup.SlideHeight
 $overflows = @(); $outside = @(); $fonts = @{}; $textShapes = 0; $pictures = 0; $notes = @()
 foreach ($slide in $deck.Slides) {
  foreach ($shape in $slide.Shapes) {
   if ($shape.Type -eq 13 -or $shape.Type -eq 28) { $pictures++ }
   if ($shape.Left -lt -0.5 -or $shape.Top -lt -0.5 -or ($shape.Left+$shape.Width) -gt ($W+0.5) -or ($shape.Top+$shape.Height) -gt ($H+0.5)) {
    $outside += [pscustomobject]@{ slide=$slide.SlideIndex; name=$shape.Name }
   }
   if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
    $textShapes++
    $r = $shape.TextFrame2.TextRange
    $fonts[$r.Font.Name] = $true
    if ($r.BoundHeight -gt ($shape.Height+1.5) -or $r.BoundWidth -gt ($shape.Width+1.5)) {
     $overflows += [pscustomobject]@{ slide=$slide.SlideIndex; name=$shape.Name; text=$r.Text; height=$shape.Height; boundHeight=$r.BoundHeight; width=$shape.Width; boundWidth=$r.BoundWidth }
    }
   }
  }
  $nt = $slide.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text
  $notes += [pscustomobject]@{ slide=$slide.SlideIndex; chars=$nt.Length; hasBoundary=($nt -match 'EVIDENCE BOUNDARY'); hasSources=($nt -match 'SOURCES') }
  $slide.Export((Join-Path $previewDir ('slide_{0:00}.png' -f $slide.SlideIndex)), 'PNG', 1600, 900)
 }
 $deck.SaveCopyAs($pdf, 32)
 $report = [pscustomobject]@{
  opened=$true; application='Microsoft PowerPoint'; loadedFontsExternally=$false
  slides=$deck.Slides.Count; widthPoints=$W; heightPoints=$H
  textShapes=$textShapes; pictureShapes=$pictures; fontsUsed=@($fonts.Keys)
  overflowCount=$overflows.Count; overflows=$overflows; outsideSlide=$outside; notes=$notes
  previewSize='1600 x 900'; finalFile='SDtrust_Finals_Refined_v2.pptx'
 }
 $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $outDir 'native_validation_v2.json') -Encoding UTF8
 $report | ConvertTo-Json -Depth 6
} finally {
 if ($null -ne $deck) { $deck.Close() }
 if ($null -ne $app -and $existing.Count -eq 0) { $app.Quit() }
}
