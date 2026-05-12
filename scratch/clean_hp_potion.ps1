Add-Type -AssemblyName System.Drawing
$file = "hp_potion_large.png"
$dir = "d:\wamp64\www\monster\public\resources"
$path = Join-Path $dir $file

if (Test-Path $path) {
    Write-Host "Removing WHITE frame/border and DARK residues from $file..."
    $bmp = New-Object System.Drawing.Bitmap($path)
    $newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
    
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            
            # Remove DARK background residues (sum < 75)
            $isDark = ($pixel.R + $pixel.G + $pixel.B) -lt 75
            
            # Remove WHITE frame/halo (R, G, B > 230)
            $isWhite = ($pixel.R -gt 230 -and $pixel.G -gt 230 -and $pixel.B -gt 230)
            
            if ($isDark -or $isWhite) {
                $newBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            } else {
                $newBmp.SetPixel($x, $y, $pixel)
            }
        }
    }
    
    $bmp.Dispose()
    $newBmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $newBmp.Dispose()
    Write-Host "Done."
}
