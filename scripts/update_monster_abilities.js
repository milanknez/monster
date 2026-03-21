import fs from 'fs';
import path from 'path';

const monstersPath = 'd:/wamp64/www/monster/src/data/monsters';
const files = fs.readdirSync(monstersPath);

const KEYWORDS = {
  attack: ['masivn', 'ničiv', 'velk', 'zuřiv', 'exploze', 'super', 'nejsilnější', 'plamen', 'bouře', 'absolutn', 'třesk', 'výbuch', 'hněv'],
  extra: ['rychl', 'sek', 'kous', 'výpad', 'dráp', 'lehk', 'bod', 'střel', 'ostrý', 'náraz', 'šleh', 'hod', 'chňap'],
  defense: ['štít', 'chrán', 'aura', 'krunýř', 'pohlc', 'obran', 'zeď', 'blok', 'kamene', 'úkryt', 'útočiště', 'past', 'úprk', 'útěk'],
  heal: ['léč', 'regen', 'zdrav', 'obnov', 'vital', 'vyléč', 'květ', 'pohlazení'],
  buff: ['posil', 'nabud', 'zvýš', 'rychlost', 'koncentr', 'taktik', 'síla', 'vůle', 'energ', 'nabití']
};

files.forEach(file => {
  if (!file.endsWith('.json')) return;
  
  const filePath = path.join(monstersPath, file);
  const monster = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (monster.abilities) {
    monster.abilities = monster.abilities.map((ability, idx) => {
      const text = `${ability.name} ${ability.description}`.toLowerCase();
      
      // Default assignment based on position
      let type = idx === 0 ? 'attack' : 'extra';
      
      // Smart detection - Priority order matters!
      if (KEYWORDS.heal.some(k => text.includes(k))) type = 'heal';
      else if (KEYWORDS.defense.some(k => text.includes(k))) type = 'defense';
      else if (KEYWORDS.buff.some(k => text.includes(k))) type = 'buff';
      else if (KEYWORDS.attack.some(k => text.includes(k))) type = 'attack';
      else if (KEYWORDS.extra.some(k => text.includes(k))) type = 'extra';

      return {
        ...ability,
        type: type
      };
    });

    // Ensure variety - Force 2nd ability to be 'extra' if it's the same type as 1st
    if (monster.abilities.length > 1 && monster.abilities[0].type === monster.abilities[1].type) {
       monster.abilities[1].type = 'extra';
    }

    // Apply values based on the final type
    monster.abilities = monster.abilities.map(ability => {
      let chance = 40;
      let value = 1.5;

      switch(ability.type) {
        case 'attack': 
          chance = 35; 
          value = 1.85; 
          break;
        case 'extra':
          chance = 65; 
          value = 0.35; 
          break;
        case 'defense':
          chance = 35; 
          value = 0.4;  
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

      return { ...ability, chance, value };
    });
    
    fs.writeFileSync(filePath, JSON.stringify(monster, null, 2), 'utf8');
    console.log(`Smart updated ${file} -> Types: ${monster.abilities.map(a => a.type).join(', ')}`);
  }
});
