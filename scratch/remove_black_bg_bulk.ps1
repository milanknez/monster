Add-Type -AssemblyName System.Drawing
$files = @("wooden_shield.png", "rusty_nail.png", "old_glove.png", "dog_paw.png")
$dir = "d:\wamp64\www\monster\public\resources"

foreach ($file in $files) {
    $path = Join-Path $dir $file
    if (Test-Path $path) {
        Write-Host "Removing BLACK background and residues from $file..."
        $bmp = New-Object System.Drawing.Bitmap($path)
        $newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
        
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            for ($x = 0; $x -lt $bmp.Width; $x++) {
                $pixel = $bmp.GetPixel($x, $y)
                
                # Remove DARK background residues (sum < 70)
                if (($pixel.R + $pixel.G + $pixel.B) -lt 70) {
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
