import fs from 'fs';
import path from 'path';

const monstersPath = 'd:/wamp64/www/monster/src/data/monsters';
const files = fs.readdirSync(monstersPath);

const KEYWORDS = {
  attack: ['masivn', 'ničiv', 'velk', 'zuřiv', 'exploze', 'super', 'nejsilnější', 'plamen', 'bouře', 'absolutn', 'třesk'],
  extra: ['rychl', 'sek', 'kous', 'výpad', 'dráp', 'lehk', 'bod', 'střel', 'ostrý', 'náraz'],
  defense: ['štít', 'chrán', 'aura', 'krunýř', 'pohlc', 'obran', 'zeď', 'blok', 'kamene'],
  heal: ['léč', 'regen', 'zdrav', 'obnov', 'vital', 'vyléč', 'květ'],
  buff: ['posil', 'nabud', 'zvýš', 'rychlost', 'koncentr', 'taktik', 'síla', 'vůle']
};

files.forEach(file => {
  if (!file.endsWith('.json')) return;
  
  const filePath = path.join(monstersPath, file);
  const monster = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (monster.abilities) {
    monster.abilities = monster.abilities.map((ability, idx) => {
      const text = `${ability.name} ${ability.description}`.toLowerCase();
      
      let type = idx === 0 ? 'attack' : 'extra';
      
      // Smart detection - Priority order matters!
      if (KEYWORDS.heal.some(k => text.includes(k))) type = 'heal';
      else if (KEYWORDS.defense.some(k => text.includes(k))) type = 'defense';
      else if (KEYWORDS.buff.some(k => text.includes(k))) type = 'buff';
      else if (KEYWORDS.attack.some(k => text.includes(k))) type = 'attack';
      else if (KEYWORDS.extra.some(k => text.includes(k))) type = 'extra';

      // Advanced Balance (Option B)
      let chance = 40;
      let value = 1.5;

      switch(type) {
        case 'attack': 
          chance = 35; 
          value = 1.85; 
          break;
        case 'extra':
          chance = 65; 
          value = 0.35; 
          break;
        case 'defense':
          chance = 35; // Slightly higher chance for survivability
          value = 0.4;  // 40% reduction
          break;
        case 'heal':
          chance = 35;
          value = 0.2; 
          break;
        case 'buff':
          chance = 40;
          value = 0.2; 
          break;
      }
      
      return {
        ...ability,
        type: type,
        chance: chance,
        value: value
      };
    });
    
    fs.writeFileSync(filePath, JSON.stringify(monster, null, 2), 'utf8');
    console.log(`Smart updated ${file} -> Types: ${monster.abilities.map(a => a.type).join(', ')}`);
  }
});
