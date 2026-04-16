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
          const url = req.url || '';
          
          // Debug logging for API requests
          if (url.startsWith('/api/')) {
            console.log(`[API Request]: ${req.method} ${url}`);
          }

          const pathname = url.split('?')[0];

          if (req.method === 'POST' && pathname === '/api/save-monster') {
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
          } else if (req.method === 'POST' && pathname === '/api/save-config') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const { key, data } = JSON.parse(body); 
                const paths: Record<string, string> = {
                  loot: 'src/data/loot.ts',
                  recipes: 'src/data/recipes.ts',
                  gems: 'src/data/gems.ts',
                  resources: 'src/data/resources.ts',
                  settings: 'src/data/settings.ts'
                };

                const relativePath = paths[key];
                if (!relativePath) { res.statusCode = 400; res.end('Invalid config key'); return; }
                const filePath = path.resolve(__dirname, relativePath);
                
                let content = '';
                if (key === 'loot') content = `import { LootTableEntry } from '../types';\n\nexport const LOOT_CONFIG: Record<string, LootTableEntry[]> = ${JSON.stringify(data, null, 2)};`;
                else if (key === 'recipes') content = `import { Recipe } from '../types';\n\nexport const recipes: Recipe[] = ${JSON.stringify(data, null, 2)};`;
                else if (key === 'gems') content = `export const GEM_BONUSES: Record<string, { value: number, isPerc?: boolean }> = ${JSON.stringify(data, null, 2)};`;
                else if (key === 'resources') content = `import { ResourceConfig } from '../types';\n\nexport const RESOURCE_CONFIG: Record<string, ResourceConfig> = ${JSON.stringify(data, null, 2)};`;
                else if (key === 'settings') content = `export const SYSTEM_SETTINGS = ${JSON.stringify(data, null, 2)};`;


                fs.writeFileSync(filePath, content);
                res.statusCode = 200;
                res.end('Config saved successfully');
              } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.end('Internal Server Error');
              }
            });
          } else if (req.method === 'POST' && pathname === '/api/save-monster-image') {
            const parsedUrl = new URL(url, `http://${req.headers?.host || 'localhost'}`);
            const id = parsedUrl.searchParams.get('id');
            const dir = path.resolve(__dirname, 'public/monsters');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, `${id}.png`);
            req.pipe(fs.createWriteStream(filePath));
            req.on('end', () => { res.statusCode = 200; res.end('OK'); });
          } else if (req.method === 'POST' && pathname === '/api/save-resource-image') {
            const parsedUrl = new URL(url, `http://${req.headers?.host || 'localhost'}`);
            const id = parsedUrl.searchParams.get('id');
            const dir = path.resolve(__dirname, 'public/resources');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, `${id}.png`);
            req.pipe(fs.createWriteStream(filePath));
            req.on('end', () => { res.statusCode = 200; res.end('OK'); });
          } else if (req.method === 'GET' && pathname === '/api/list-resources') {
            const dir = path.resolve(__dirname, 'public/resources');
            if (!fs.existsSync(dir)) {
              res.statusCode = 200;
              res.end(JSON.stringify([]));
              return;
            }
            const files = fs.readdirSync(dir)
              .filter(f => f.endsWith('.png'))
              .map(f => f.replace('.png', ''));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(files));
          } else if (url.startsWith('/api/generate-image')) {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed: Use POST via the application to generate images.');
              return;
            }
            console.log('--- AI GENERATION START ---');
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
              try {
                const { id, prompt, apiKey, model = 'flux-1-dev' } = JSON.parse(body);
                if (!id || !prompt || !apiKey) { res.statusCode = 400; res.end('Missing params'); return; }
                
                // 1. Create Job on Krea.ai
                const jobRes = await fetch(`https://api.krea.ai/generate/image/bfl/${model}`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt, width: 1024, height: 1024 })
                }).then(r => r.json());

                if (!jobRes.id && !jobRes.job_id) { res.statusCode = 500; res.end(JSON.stringify(jobRes)); return; }
                const jobId = jobRes.id || jobRes.job_id;

                // 2. Poll for results
                let imageUrl = null;
                for (let i = 0; i < 30; i++) { // Max 90 seconds
                  await new Promise(r => setTimeout(r, 3000));
                  const statusRes = await fetch(`https://api.krea.ai/jobs/${jobId}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                  }).then(r => r.json());

                  if (statusRes.status === 'done' && statusRes.result?.url) {
                    imageUrl = statusRes.result.url;
                    break;
                  } else if (statusRes.status === 'error') {
                    res.statusCode = 500; res.end('Krea Error: ' + JSON.stringify(statusRes.error));
                    return;
                  }
                }

                if (!imageUrl) { res.statusCode = 504; res.end('Timeout'); return; }

                // 3. Download and Save
                const imgRes = await fetch(imageUrl);
                const dir = path.resolve(__dirname, 'public/monsters');
                const filePath = path.join(dir, `${id}.png`);
                const buffer = await imgRes.arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(buffer));

                res.statusCode = 200;
                res.end('OK');
              } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.end('AI Generation Failed');
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
