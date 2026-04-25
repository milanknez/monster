from PIL import Image

def remove_white(image_path, output_path, threshold=200):
    img = Image.open(image_path).convert("RGBA")
    pixels = img.load()
    
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r > threshold and g > threshold and b > threshold:
                avg = (r + g + b) / 3
                if avg >= 245:
                    pixels[x, y] = (r, g, b, 0)
                else:
                    alpha = int(255 * ((245 - avg) / (245 - threshold)))
                    pixels[x, y] = (r, g, b, max(0, min(255, alpha)))

remove_white("public/magic_cage.png", "public/magic_cage_transparent.png")
print("Done!")
