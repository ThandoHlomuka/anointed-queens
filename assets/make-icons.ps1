Add-Type -AssemblyName System.Drawing
$dir = "C:\Users\Thando Hlomuka\Desktop\Projects\anointed-queens\assets\icons"

function New-Icon($size, $path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::FromArgb(10,10,10))
  $gold   = [System.Drawing.Color]::FromArgb(212,175,55)
  $bright = [System.Drawing.Color]::FromArgb(255,215,0)
  $pen    = New-Object System.Drawing.Pen($bright, [Math]::Max(2, $size*0.05))
  $brush  = New-Object System.Drawing.SolidBrush($gold)
  $w = $size; $h = $size; $cx = $w/2; $baseY = $h*0.72
  $q1 = $cx - $w*0.22; $q2 = $cx - $w*0.16; $q3 = $cx - $w*0.05
  $q4 = $cx + $w*0.05; $q5 = $cx + $w*0.16; $q6 = $cx + $w*0.22
  $l1 = $baseY - $w*0.28; $l2 = $baseY - $w*0.14; $l3 = $baseY - $w*0.34
  $pts = @(
    @($q1, $baseY), @($q2, $l1), @($q3, $l2),
    @($cx, $l3), @($q4, $l2), @($q5, $l1),
    @($q6, $baseY)
  )
  $faces = $pts | ForEach-Object { New-Object System.Drawing.PointF($_[0], $_[1]) }
  $g.FillPolygon($brush, $faces)
  $g.DrawLine($pen, $cx-$w*0.26, $baseY+$w*0.03, $cx-$w*0.26, $baseY+$w*0.06)
  $g.DrawLine($pen, $cx-$w*0.20, $baseY+$w*0.03, $cx-$w*0.20, $baseY+$w*0.06)
  $g.DrawLine($pen, $cx+$w*0.20, $baseY+$w*0.03, $cx+$w*0.20, $baseY+$w*0.06)
  $g.DrawLine($pen, $cx+$w*0.26, $baseY+$w*0.03, $cx+$w*0.26, $baseY+$w*0.06)
  $g.FillRectangle($brush, $cx-$w*0.26, $baseY+$w*0.06, $w*0.52, $w*0.05)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-Icon 192 "$dir\icon-192.png"
New-Icon 512 "$dir\icon-512.png"

$bmp = New-Object System.Drawing.Bitmap(512,512)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(10,10,10))
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,212,175,55))), 148,148,216,216)
$g.Dispose()
$bmp.Save("$dir\icon-512-maskable.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Get-ChildItem $dir | Select-Object Name, Length