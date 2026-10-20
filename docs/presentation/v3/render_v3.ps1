$ErrorActionPreference = 'Stop'
# v3 only: reads .local/presentation/v3 base, writes docs/presentation/v3. Never touches v1 files.
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$tempDir = Join-Path $root '.local/presentation/v3'
$outDir = $PSScriptRoot
$assetDir = Join-Path $outDir 'assets'
$base = Join-Path $tempDir 'SDtrust_Finals_Dashboard_v3_base.pptx'
$final = Join-Path $outDir 'SDtrust_Finals_Dashboard_v3.pptx'

# Session font loading only. No install or registry changes. Removed in finally.
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PresentationFontsV3 {
 [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int AddFontResourceEx(string file, uint flags, IntPtr reserved);
 [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern bool RemoveFontResourceEx(string file, uint flags, IntPtr reserved);
 [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
}
'@
$fontPaths = @((Join-Path $assetDir 'Manrope-Regular.ttf'), (Join-Path $assetDir 'Manrope-Bold.ttf'))
$fontLoad = @()
foreach ($f in $fontPaths) { $fontLoad += [pscustomobject]@{ path=$f; loaded=[PresentationFontsV3]::AddFontResourceEx($f, 0, [IntPtr]::Zero) } }
$msg = [IntPtr]::Zero
[void][PresentationFontsV3]::SendMessageTimeout([IntPtr]0xffff, 0x001D, [IntPtr]::Zero, [IntPtr]::Zero, 2, 1000, [ref]$msg)

$oldPowerPoint = @(Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = $null; $deck = $null
try {
 $app = New-Object -ComObject PowerPoint.Application
 $deck = $app.Presentations.Open($base, 0, 0, 0)
 $logos = 0
 foreach ($slide in $deck.Slides) {
  $slots = @()
  foreach ($shape in $slide.Shapes) { if ($shape.Name -eq 'LOGO_SLOT') { $slots += $shape } }
  foreach ($slot in $slots) {
   $logo = $slide.Shapes.AddPicture((Join-Path $assetDir 'logo.svg'), 0, -1, $slot.Left, $slot.Top, $slot.Width, $slot.Height)
   $logo.Name = 'Official SDtrust SVG'
   $slot.Delete(); $logos++
  }
 }
 $deck.SaveAs($final, 24, -1)
 $deck.Close(); $deck = $null
 [pscustomobject]@{ step='render'; logosPlaced=$logos; fontLoads=$fontLoad; saved=$final } | ConvertTo-Json -Depth 4 |
  Set-Content -LiteralPath (Join-Path $tempDir 'render_report.json') -Encoding UTF8
 Write-Output "Saved $final with $logos logos."
} finally {
 if ($null -ne $deck) { $deck.Close() }
 if ($null -ne $app -and $oldPowerPoint.Count -eq 0) { $app.Quit() }
 foreach ($f in $fontPaths) { [void][PresentationFontsV3]::RemoveFontResourceEx($f, 0, [IntPtr]::Zero) }
 [void][PresentationFontsV3]::SendMessageTimeout([IntPtr]0xffff, 0x001D, [IntPtr]::Zero, [IntPtr]::Zero, 2, 1000, [ref]$msg)
}
