Add-Type -AssemblyName System.Drawing

function Draw-KailenLogo($size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background rounded rect
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 11, 16, 32))
    $radius = [float]($size * 0.22)
    $d = $radius * 2.0
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0.0, 0.0, $d, $d, 180.0, 90.0)
    $path.AddArc([float]($size - $d), 0.0, $d, $d, 270.0, 90.0)
    $path.AddArc([float]($size - $d), [float]($size - $d), $d, $d, 0.0, 90.0)
    $path.AddArc(0.0, [float]($size - $d), $d, $d, 90.0, 90.0)
    $path.CloseFigure()
    $g.FillPath($bgBrush, $path)

    # Scale factor from 100x100
    $s = [float]($size / 100.0)

    # Part "1" polygon
    [System.Drawing.PointF[]]$pts1 = @(
        [System.Drawing.PointF]::new([float](43.0 * $s), [float](14.0 * $s)),
        [System.Drawing.PointF]::new([float](43.0 * $s), [float](74.5 * $s)),
        [System.Drawing.PointF]::new([float](52.5 * $s), [float](74.5 * $s)),
        [System.Drawing.PointF]::new([float](52.5 * $s), [float](86.0 * $s)),
        [System.Drawing.PointF]::new([float](24.5 * $s), [float](86.0 * $s)),
        [System.Drawing.PointF]::new([float](24.5 * $s), [float](74.5 * $s)),
        [System.Drawing.PointF]::new([float](32.5 * $s), [float](74.5 * $s)),
        [System.Drawing.PointF]::new([float](32.5 * $s), [float](30.5 * $s)),
        [System.Drawing.PointF]::new([float](21.0 * $s), [float](39.0 * $s)),
        [System.Drawing.PointF]::new([float](21.0 * $s), [float](27.5 * $s)),
        [System.Drawing.PointF]::new([float](33.0 * $s), [float](14.0 * $s))
    )

    # Part "<" polygon
    [System.Drawing.PointF[]]$pts2 = @(
        [System.Drawing.PointF]::new([float](47.5 * $s), [float](50.0 * $s)),
        [System.Drawing.PointF]::new([float](71.0 * $s), [float](14.0 * $s)),
        [System.Drawing.PointF]::new([float](84.5 * $s), [float](14.0 * $s)),
        [System.Drawing.PointF]::new([float](61.0 * $s), [float](50.0 * $s)),
        [System.Drawing.PointF]::new([float](84.5 * $s), [float](86.0 * $s)),
        [System.Drawing.PointF]::new([float](71.0 * $s), [float](86.0 * $s))
    )

    $fgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.FillPolygon($fgBrush, $pts1)
    $g.FillPolygon($fgBrush, $pts2)

    $g.Dispose()
    return $bmp
}

$outputDir = Join-Path $PSScriptRoot "..\public"
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir }

# 1. Save 256x256 PNG icon
$bmp256 = Draw-KailenLogo 256
$pngPath = Join-Path $outputDir "icon.png"
$bmp256.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created: $pngPath"

# 2. Build multi-resolution ICO file (16, 32, 48, 64, 128, 256)
$sizes = @(16, 32, 48, 64, 128, 256)
$imagesData = @()

foreach ($sz in $sizes) {
    $b = Draw-KailenLogo $sz
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $b.Dispose()
    $ms.Dispose()
    $imagesData += ,@($sz, $bytes)
}

$icoPath = Join-Path $outputDir "icon.ico"
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter $fs

# ICONDIR header (6 bytes)
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type: 1 = ICO
$bw.Write([uint16]$imagesData.Count) # Number of images

$offset = 6 + ($imagesData.Count * 16)

# Write Directory Entries
foreach ($item in $imagesData) {
    $sz = $item[0]
    $data = $item[1]
    $bw.Write([byte]$(if ($sz -eq 256) { 0 } else { $sz })) # Width
    $bw.Write([byte]$(if ($sz -eq 256) { 0 } else { $sz })) # Height
    $bw.Write([byte]0) # Color count
    $bw.Write([byte]0) # Reserved
    $bw.Write([uint16]1) # Color planes
    $bw.Write([uint16]32) # Bits per pixel
    $bw.Write([uint32]$data.Length) # Size of image data
    $bw.Write([uint32]$offset) # Offset
    $offset += $data.Length
}

# Write Image Data (PNG streams)
foreach ($item in $imagesData) {
    $data = $item[1]
    $bw.Write($data)
}

$bw.Flush()
$bw.Close()
$fs.Close()
Write-Host "Created: $icoPath"
