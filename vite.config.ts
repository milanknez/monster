import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'save-monster-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.url === '/api/save-monster') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const { id, monster } = data;
                if (!id || !monster) {
                  res.statusCode = 400;
                  res.end('Missing id or monster data');
                  return;
                }
                const filePath = path.resolve(__dirname, 'src/data/monsters', `${id}.json`);
                fs.writeFileSync(filePath, JSON.stringify(monster, null, 2));
                
                // Also update monsters.ts if it's a new monster or ensure it's imported
                const dbPath = path.resolve(__dirname, 'src/data/monsters.ts');
                let dbContent = fs.readFileSync(dbPath, 'utf8');
                const importLine = `import monster${id} from './monsters/${id}.json';`;
                
                if (!dbContent.includes(importLine)) {
                  // Add import if missing
                  const lastImportIndex = dbContent.lastIndexOf('import ');
                  const endOfLastImport = dbContent.indexOf(';', lastImportIndex) + 1;
                  dbContent = dbContent.slice(0, endOfLastImport) + '\n' + importLine + dbContent.slice(endOfLastImport);
                  
                  // Add to monsterDB array
                  if (dbContent.includes('export const monsterDB = [')) {
                    dbContent = dbContent.replace('export const monsterDB = [', `export const monsterDB = [\n  monster${id},`);
                  }
                  
                  fs.writeFileSync(dbPath, dbContent);
                }

                res.statusCode = 200;
                res.end('Monster saved successfully');
              } catch (error) {
                console.error('Save error:', error);
                res.statusCode = 500;
                res.end('Internal Server Error');
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
