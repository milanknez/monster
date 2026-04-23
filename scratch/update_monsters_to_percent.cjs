const fs = require('fs');
const path = require('path');

const monstersDir = 'd:/wamp64/www/monster/src/data/monsters/';
const files = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(monstersDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.abilities) {
    let changed = false;
    data.abilities.forEach(ability => {
      // Logic for conversion:
      // defense: 0.4 multiplier (60% reduction) -> 60
      // attack: 1.55 multiplier -> 155
      // heal: 0.15 -> 15
      // regen: 0.1 -> 10
      // curse: 0.2 -> 20
      // extra: 0.4 -> 40
      
      if (ability.type === 'defense') {
        ability.value = 60; // We just set it to 60 as requested
        changed = true;
      } else if (ability.type === 'attack') {
        if (ability.value <= 5) ability.value = Math.round(ability.value * 100);
        changed = true;
      } else if (ability.type === 'heal' || ability.type === 'regen' || ability.type === 'curse' || ability.type === 'extra') {
        if (ability.value <= 1) ability.value = Math.round(ability.value * 100);
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${file}`);
    }
  }
});
