import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = 'public/monsters';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
console.log(`Found ${files.length} images.`);

(async () => {
  for (const f of files) {
    const p = path.join(dir, f);
    const buf = fs.readFileSync(p);
    if (buf.length > 150 * 1024) { // > 150kb
      console.log(`Compressing ${f}...`);
      await sharp(buf).resize(512).png({ quality: 75, compressionLevel: 9 }).toFile(p);
    }
  }
  console.log('All shrunk successfully!');
})();
