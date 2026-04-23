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
      if (ability.type === 'defense') {
        // Set value to 0.4 (60% reduction)
        ability.value = 0.4;
        
        // Update description to include the range as requested
        // If it already contains it, don't duplicate
        if (!ability.description.includes('55-65%')) {
          ability.description = ability.description.trim();
          if (ability.description.endsWith('.')) {
             ability.description = ability.description.slice(0, -1);
          }
          ability.description += ' (Snížení dmg 55-65%)';
        }
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${file}`);
    }
  }
});
