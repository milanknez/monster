Add-Type -AssemblyName System.Drawing
$files = @("hp_potion_large.png", "xp_serum_1.png", "xp_serum_2.png", "xp_serum_3.png")
$dir = "d:\wamp64\www\monster\public\resources"

foreach ($file in $files) {
    $path = Join-Path $dir $file
    if (Test-Path $path) {
        Write-Host "Processing $file with more aggressive threshold..."
        $bmp = New-Object System.Drawing.Bitmap($path)
        $newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
        
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            for ($x = 0; $x -lt $bmp.Width; $x++) {
                $pixel = $bmp.GetPixel($x, $y)
                
                # Check if it's "white-ish" or has low saturation and high brightness
                # Aggressive threshold: 220
                $threshold = 220
                if ($pixel.R -gt $threshold -and $pixel.G -gt $threshold -and $pixel.B -gt $threshold) {
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
