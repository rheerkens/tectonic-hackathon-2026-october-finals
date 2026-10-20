$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$tempDir = Join-Path $root '.local/presentation'
$outDir = $PSScriptRoot
$assetDir = Join-Path $outDir 'assets'
$previewDir = Join-Path $outDir 'preview'
New-Item -ItemType Directory -Force -Path $previewDir | Out-Null

# Session font loading only. No install or registry changes.
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PresentationFonts {
 [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int AddFontResourceEx(string file, uint flags, IntPtr reserved);
 [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern bool RemoveFontResourceEx(string file, uint flags, IntPtr reserved);
 [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
}
'@
$fontPaths = @((Join-Path $assetDir 'Manrope-Regular.ttf'), (Join-Path $assetDir 'Manrope-Bold.ttf'))
$fontLoad = @()
foreach ($fontPath in $fontPaths) {
 $count = [PresentationFonts]::AddFontResourceEx($fontPath, 0, [IntPtr]::Zero)
 $fontLoad += [pscustomobject]@{ path=$fontPath; loaded=$count }
}
$fontMessageResult = [IntPtr]::Zero
[void][PresentationFonts]::SendMessageTimeout([IntPtr]0xffff, 0x001D, [IntPtr]::Zero, [IntPtr]::Zero, 2, 1000, [ref]$fontMessageResult)

$oldPowerPoint = @(Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = $null
$deck = $null
try {
 $app = New-Object -ComObject PowerPoint.Application
 $deck = $app.Presentations.Open((Join-Path $tempDir 'SDtrust_Finals_Draft_v1_base.pptx'), 0, 0, 0)
 $slides = @()
 foreach ($slide in $deck.Slides) {
  $logo = $slide.Shapes.AddPicture((Join-Path $assetDir 'logo.svg'), 0, -1, 50.4, 26.4, 28.8, 28.8)
  $logo.Name = 'Official SDtrust SVG'
  $shapes = @()
  foreach ($shape in $slide.Shapes) {
   if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
    $r = $shape.TextFrame2.TextRange
    $textHeight = [double]$r.BoundHeight
    $textWidth = [double]$r.BoundWidth
    $shapes += [pscustomobject]@{
     name=$shape.Name; text=$r.Text; font=$r.Font.Name
     fontSize=[double]$r.Font.Size; height=[double]$shape.Height; width=[double]$shape.Width
     boundHeight=$textHeight; boundWidth=$textWidth
     overflow=($textHeight -gt ($shape.Height + 1.5) -or $textWidth -gt ($shape.Width + 1.5))
     outsideSlide=($shape.Left -lt 0 -or $shape.Top -lt 0 -or ($shape.Left+$shape.Width) -gt ($deck.PageSetup.SlideWidth+1) -or ($shape.Top+$shape.Height) -gt ($deck.PageSetup.SlideHeight+1))
    }
   }
  }
  $slides += [pscustomobject]@{slide=[int]$slide.SlideIndex; shapes=$slide.Shapes.Count; text=$shapes}
 }
 $deck.SaveAs((Join-Path $outDir 'SDtrust_Finals_Draft_v1.pptx'), 24, -1)
 Write-Output 'Saved native PowerPoint with embedded font request.'
 $deck.SaveCopyAs((Join-Path $outDir 'SDtrust_Finals_Draft_v1.pdf'), 32)
 foreach ($slide in $deck.Slides) {
  $slide.Export((Join-Path $previewDir ('slide_{0:00}.png' -f $slide.SlideIndex)), 'PNG', 1600, 900)
 }
 $report = [pscustomobject]@{
  openedIn='Microsoft PowerPoint'; slides=$deck.Slides.Count
  widthPoints=$deck.PageSetup.SlideWidth; heightPoints=$deck.PageSetup.SlideHeight
  fontLoads=$fontLoad; slideReports=$slides
  source='Native PowerPoint text bounds and PNG export. No application runtime testing.'
 }
 $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outDir 'layout_validation.json') -Encoding UTF8
 $deck.Close()
 $deck = $null
 # Reopen the final deliverable, rather than only trusting the initial write.
 $deck = $app.Presentations.Open((Join-Path $outDir 'SDtrust_Finals_Draft_v1.pptx'), -1, 0, 0)
 Write-Output ('Final deliverable reopened: {0} slides.' -f $deck.Slides.Count)
 $deck.Close()
 $deck = $null
} finally {
 if ($null -ne $deck) { $deck.Close() }
 if ($null -ne $app -and $oldPowerPoint.Count -eq 0) { $app.Quit() }
 foreach ($fontPath in $fontPaths) { [void][PresentationFonts]::RemoveFontResourceEx($fontPath, 0, [IntPtr]::Zero) }
 [void][PresentationFonts]::SendMessageTimeout([IntPtr]0xffff, 0x001D, [IntPtr]::Zero, [IntPtr]::Zero, 2, 1000, [ref]$fontMessageResult)
}
