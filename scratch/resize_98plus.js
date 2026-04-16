import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const MONSTERS_DIR = 'public/monsters/';

async function processMonstersHigherThan98() {
  try {
    const files = fs.readdirSync(MONSTERS_DIR);
    console.log(`Scanning files from 98.png and up in ${MONSTERS_DIR}...`);

    for (const file of files) {
      if (!file.toLowerCase().endsWith('.png')) continue;

      // Extract number from filename (e.g., "098.png" -> 98, "101.png" -> 101)
      const numMatch = file.match(/^0*(\d+)\.png$/i);
      if (!numMatch) continue;

      const num = parseInt(numMatch[1], 10);
      if (num < 98) continue;

      const filePath = path.join(MONSTERS_DIR, file);
      
      try {
        const metadata = await sharp(filePath).metadata();
        
        if (metadata.width === 1024 && metadata.height === 1024) {
          console.log(`Processing ${file} (${metadata.width}x${metadata.height})...`);
          
          const tempPath = path.join(MONSTERS_DIR, `${file}_temp.png`);
          await sharp(filePath)
            .resize(512, 512)
            .toFile(tempPath);
          
          fs.renameSync(tempPath, filePath);
          console.log(`  -> Resized ${file} to 512x512`);
        } else {
          // console.log(`Skipping ${file} (${metadata.width}x${metadata.height})`);
        }
      } catch (err) {
        console.error(`  [ERROR] Failed to check/process ${file}:`, err.message);
      }
    }
    console.log('Task complete.');
  } catch (err) {
    console.error('Fatal error during processing:', err);
  }
}

processMonstersHigherThan98();
