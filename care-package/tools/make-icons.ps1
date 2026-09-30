# Generates the app icons in ../icons (Windows PowerShell, no extra software needed)
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot "..\icons"
function Icon($size, $file, $pad) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::FromArgb(255, 29, 107, 102))
  $s = $size * (1 - 2 * $pad); $o = $size * $pad
  # box
  $gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 232, 163, 23))
  $dark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 176, 118, 10))
  $g.FillRectangle($gold, [float]($o + $s * 0.18), [float]($o + $s * 0.42), [float]($s * 0.64), [float]($s * 0.42))
  $g.FillRectangle($dark, [float]($o + $s * 0.13), [float]($o + $s * 0.32), [float]($s * 0.74), [float]($s * 0.13))
  # ribbon
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $g.FillRectangle($white, [float]($o + $s * 0.46), [float]($o + $s * 0.32), [float]($s * 0.08), [float]($s * 0.52))
  # heart on top
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cx = $o + $s * 0.5; $cy = $o + $s * 0.2; $r = $s * 0.075
  $p.AddEllipse([float]($cx - 2 * $r), [float]($cy - $r), [float](2 * $r), [float](2 * $r))
  $p.AddEllipse([float]$cx, [float]($cy - $r), [float](2 * $r), [float](2 * $r))
  $p.AddPolygon(@((New-Object System.Drawing.PointF ([float]($cx - 1.95 * $r)), ([float]($cy + 0.2 * $r))),
                  (New-Object System.Drawing.PointF ([float]($cx + 1.95 * $r)), ([float]($cy + 0.2 * $r))),
                  (New-Object System.Drawing.PointF ([float]$cx), ([float]($cy + 2.1 * $r)))))
  $g.FillPath($white, $p)
  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Icon 192 "icon-192.png" 0.08
Icon 512 "icon-512.png" 0.08
Icon 512 "icon-maskable-512.png" 0.2
"icons written to $out"
