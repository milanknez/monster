Add-Type -AssemblyName System.Drawing
$files = @("rusty_nail.png", "dog_paw.png", "old_glove.png")
$dir = "d:\wamp64\www\monster\public\resources"

foreach ($file in $files) {
    $path = Join-Path $dir $file
    if (Test-Path $path) {
        Write-Host "Aggressive cleaning of $file (removing dark and light residues)..."
        $bmp = New-Object System.Drawing.Bitmap($path)
        $newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
        
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            for ($x = 0; $x -lt $bmp.Width; $x++) {
                $pixel = $bmp.GetPixel($x, $y)
                
                # Check for white-ish (brightness > 220)
                $isWhite = ($pixel.R -gt 220 -and $pixel.G -gt 220 -and $pixel.B -gt 220)
                
                # Check for black-ish (sum < 80)
                $isBlack = ($pixel.R + $pixel.G + $pixel.B) -lt 80
                
                # Smart check for "gray-ish" (high brightness, low saturation)
                $avg = ($pixel.R + $pixel.G + $pixel.B) / 3
                $diff = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B)) - [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
                $isGray = ($avg -gt 180 -and $diff -lt 30)
                
                if ($isWhite -or $isBlack -or $isGray) {
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
