$ErrorActionPreference = 'Stop'
$outputDir = $PSScriptRoot
$existing = @(Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = $null
$deck = $null
try {
 $app = New-Object -ComObject PowerPoint.Application
 $deck = $app.Presentations.Open((Join-Path $outputDir 'SDtrust_Finals_Draft_v1.pptx'), -1, 0, 0)
 $overflows = @()
 foreach ($slide in $deck.Slides) {
  foreach ($shape in $slide.Shapes) {
   if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
    $r=$shape.TextFrame2.TextRange
    if ($r.BoundHeight -gt ($shape.Height+1.5) -or $r.BoundWidth -gt ($shape.Width+1.5)) {
     $overflows += [pscustomobject]@{ slide=$slide.SlideIndex; text=$r.Text; height=$shape.Height; boundHeight=$r.BoundHeight; width=$shape.Width; boundWidth=$r.BoundWidth }
    }
   }
  }
  $slide.Export((Join-Path $outputDir ('preview/slide_{0:00}.png' -f $slide.SlideIndex)), 'PNG', 1600, 900)
 }
 $deck.SaveCopyAs((Join-Path $outputDir 'SDtrust_Finals_Draft_v1.pdf'), 32)
 $report=[pscustomobject]@{
  opened=$true; slides=$deck.Slides.Count; application='Microsoft PowerPoint'
  loadedFontsExternally=$false; overflowCount=$overflows.Count; overflows=$overflows
  previewSize='1600 x 900'; finalFile='SDtrust_Finals_Draft_v1.pptx'
 }
 $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $outputDir 'final_native_validation.json') -Encoding UTF8
 $report | ConvertTo-Json -Depth 6
} finally {
 if ($null -ne $deck) { $deck.Close() }
 if ($null -ne $app -and $existing.Count -eq 0) { $app.Quit() }
}
