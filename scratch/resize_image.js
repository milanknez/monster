import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const MONSTERS_DIR = 'public/monsters/';
const SIZE_THRESHOLD = 1024 * 1024; // 1MB

async function processMonsters() {
  try {
    const files = fs.readdirSync(MONSTERS_DIR);
    console.log(`Scanning ${files.length} files in ${MONSTERS_DIR}...`);

    for (const file of files) {
      if (!file.toLowerCase().endsWith('.png')) continue;

      const filePath = path.join(MONSTERS_DIR, file);
      const stats = fs.statSync(filePath);

      if (stats.size > SIZE_THRESHOLD) {
        console.log(`Processing ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);
        
        const tempPath = path.join(MONSTERS_DIR, `${file}_temp.png`);
        
        try {
          await sharp(filePath)
            .resize(512, 512)
            .toFile(tempPath);
          
          fs.renameSync(tempPath, filePath);
          const newStats = fs.statSync(filePath);
          console.log(`  -> Done. Compressed to ${(newStats.size / 1024).toFixed(2)} KB`);
        } catch (err) {
          console.error(`  [ERROR] Failed to process ${file}:`, err.message);
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
      }
    }
    console.log('Batch processing complete.');
  } catch (err) {
    console.error('Fatal error during batch processing:', err);
  }
}

processMonsters();
