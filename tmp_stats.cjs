const fs = require('fs');
const path = require('path');

const dir = 'src/data/monsters';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const stats = {
  Běžná: {},
  Vzácná: {},
  Epická: {},
  Legendární: {}
};

files.forEach(f => {
  const content = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
  const r = content.rarity || 'Běžná';
  const t = content.type || 'unknown';
  if (!stats[r]) stats[r] = {};
  if (!stats[r][t]) stats[r][t] = 0;
  stats[r][t]++;
});

console.log(JSON.stringify(stats, null, 2));
