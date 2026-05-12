Add-Type -AssemblyName System.Drawing
$files = @("hp_potion_large.png", "xp_serum_2.png")
$dir = "d:\wamp64\www\monster\public\resources"

foreach ($file in $files) {
    $path = Join-Path $dir $file
    if (Test-Path $path) {
        Write-Host "Processing $file with smart threshold (brightness > 190, low saturation)..."
        $bmp = New-Object System.Drawing.Bitmap($path)
        $newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
        
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            for ($x = 0; $x -lt $bmp.Width; $x++) {
                $pixel = $bmp.GetPixel($x, $y)
                
                # Smart check for "white-ish" or "gray-ish" backgrounds
                $avg = ($pixel.R + $pixel.G + $pixel.B) / 3
                $diff = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B)) - [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
                
                # If it's very bright (>190) and has low saturation (diff < 40), make transparent
                if ($avg -gt 190 -and $diff -lt 40) {
                    $newBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
                } else {
                    $newBmp.SetPixel($x, $y, $pixel)
                }
            }
        }
        
        $bmp.Dispose()
        $newBmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        $newBmp.Dispose()
        Write-Host "Done $file."
    }
}
