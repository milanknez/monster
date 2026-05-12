Add-Type -AssemblyName System.Drawing
$files = @("hp_potion_large.png", "xp_serum_2.png")
$dir = "d:\wamp64\www\monster\public\resources"

foreach ($file in $files) {
    $path = Join-Path $dir $file
    if (Test-Path $path) {
        Write-Host "Removing BLACK background from $file..."
        $bmp = New-Object System.Drawing.Bitmap($path)
        $newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
        
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            for ($x = 0; $x -lt $bmp.Width; $x++) {
                $pixel = $bmp.GetPixel($x, $y)
                
                # Check for black or very dark background
                # Threshold: sum < 60 (approx 20 per channel)
                if ($pixel.R -lt 25 -and $pixel.G -lt 25 -and $pixel.B -lt 25) {
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
