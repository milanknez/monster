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
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const { id, monster } = data;
                if (!id || !monster) { res.statusCode = 400; res.end('Missing id or monster data'); return; }
                const filePath = path.resolve(__dirname, 'src/data/monsters', `${id}.json`);
                fs.writeFileSync(filePath, JSON.stringify(monster, null, 2));
                const dbPath = path.resolve(__dirname, 'src/data/monsters.ts');
                let dbContent = fs.readFileSync(dbPath, 'utf8');
                const importLine = `import monster${id} from './monsters/${id}.json';`;
                if (!dbContent.includes(importLine)) {
                  const lastImportIndex = dbContent.lastIndexOf('import ');
                  const endOfLastImport = dbContent.indexOf(';', lastImportIndex) + 1;
                  dbContent = dbContent.slice(0, endOfLastImport) + '\n' + importLine + dbContent.slice(endOfLastImport);
                  if (dbContent.includes('export const monsterDB = [')) {
                    dbContent = dbContent.replace('export const monsterDB = [', `export const monsterDB = [\n  monster${id},`);
                  }
                  fs.writeFileSync(dbPath, dbContent);
                }
                res.statusCode = 200;
                res.end('Monster saved successfully');
              } catch (error) {
                res.statusCode = 500;
                res.end('Internal Server Error');
              }
            });
          } else if (req.method === 'POST' && req.url === '/api/save-config') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const { key, data } = JSON.parse(body); 
                const paths: Record<string, string> = {
                  loot: 'src/data/loot.ts',
                  recipes: 'src/data/recipes.ts',
                  gems: 'src/data/gems.ts',
                  resources: 'src/data/resources.ts'
                };
                const relativePath = paths[key];
                if (!relativePath) { res.statusCode = 400; res.end('Invalid config key'); return; }
                const filePath = path.resolve(__dirname, relativePath);
                
                let content = '';
                if (key === 'loot') content = `import { LootTableEntry } from '../types';\n\nexport const LOOT_CONFIG: Record<string, LootTableEntry[]> = ${JSON.stringify(data, null, 2)};`;
                else if (key === 'recipes') content = `import { Recipe } from '../types';\n\nexport const recipes: Recipe[] = ${JSON.stringify(data, null, 2)};`;
                else if (key === 'gems') content = `export const GEM_BONUSES: Record<string, { value: number, isPerc?: boolean }> = ${JSON.stringify(data, null, 2)};`;
                else if (key === 'resources') content = `import { ResourceConfig } from '../types';\n\nexport const RESOURCE_CONFIG: Record<string, ResourceConfig> = ${JSON.stringify(data, null, 2)};`;

                fs.writeFileSync(filePath, content);
                res.statusCode = 200;
                res.end('Config saved successfully');
              } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.end('Internal Server Error');
              }
            });
          } else if (req.method === 'POST' && req.url?.startsWith('/api/save-monster-image')) {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const id = url.searchParams.get('id');
            const dir = path.resolve(__dirname, 'public/monsters');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, `${id}.png`);
            req.pipe(fs.createWriteStream(filePath));
            req.on('end', () => { res.statusCode = 200; res.end('OK'); });
          } else if (req.method === 'POST' && req.url?.startsWith('/api/save-resource-image')) {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const id = url.searchParams.get('id');
            const dir = path.resolve(__dirname, 'public/resources');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, `${id}.png`);
            req.pipe(fs.createWriteStream(filePath));
            req.on('end', () => { res.statusCode = 200; res.end('OK'); });
          } else {
            next();
          }
        });
      }
    }
  ],
})
