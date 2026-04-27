const fs = require('fs');
const path = require('path');

const monstersDir = 'd:/wamp64/www/monster/src/data/monsters';
const files = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));

let modifiedCount = 0;
let abilitiesUpdated = 0;

files.forEach(file => {
  const filePath = path.join(monstersDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  let monster = JSON.parse(content);
  let changed = false;

  if (monster.abilities) {
    monster.abilities.forEach(ability => {
      // Cílíme na Heal a Štít (defense)
      if (ability.type === 'heal' || ability.type === 'defense' || ability.type === 'regen') {
        if (ability.chance === undefined || ability.chance === null || ability.chance < 65) {
          ability.chance = 65;
          changed = true;
          abilitiesUpdated++;
        }
      } else {
        // Ostatní schopnosti necháme na minimu 50%, jak jsme nastavili minule
        if (ability.chance === undefined || ability.chance === null || ability.chance < 50) {
          ability.chance = 50;
          changed = true;
          abilitiesUpdated++;
        }
      }
    });
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(monster, null, 2), 'utf-8');
    modifiedCount++;
  }
});

console.log(`Hotovo.`);
console.log(`Celkem zpracováno monster: ${files.length}`);
console.log(`Upraveno monster: ${modifiedCount}`);
console.log(`Aktualizováno schopností na 65%+: ${abilitiesUpdated}`);
