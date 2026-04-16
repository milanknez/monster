const fs = require('fs');
const path = require('path');

const monstersDir = 'd:/wamp64/www/monster/src/data/monsters';
const files = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));

const CONFIG = {
  'Běžná': { chance: 80, value: 1.30 },
  'Vzácná': { chance: 80, value: 1.55 },
  'Epická': { chance: 80, value: 1.90 },
  'Legendární': { chance: 70, value: 2.30 }
};

let modifiedCount = 0;
let atkReducedCount = 0;

files.forEach(file => {
  const filePath = path.join(monstersDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  let monster = JSON.parse(content);
  let changed = false;

  // 1. Base ATK reduction for Legendaries
  if (monster.rarity === 'Legendární') {
    const oldAtk = monster.stats.attack;
    const newAtk = Math.round(oldAtk * 0.85);
    if (oldAtk !== newAtk) {
      monster.stats.attack = newAtk;
      changed = true;
      atkReducedCount++;
    }
  }

  // 2. Ability balancing
  if (monster.abilities) {
    const config = CONFIG[monster.rarity];
    if (config) {
      monster.abilities.forEach(ability => {
        if (ability.type === 'attack') {
          if (ability.chance !== config.chance || ability.value !== config.value) {
            ability.chance = config.chance;
            ability.value = config.value;
            changed = true;
          }
        }
      });
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(monster, null, 2), 'utf-8');
    modifiedCount++;
  }
});

console.log(`Finished.`);
console.log(`Total monsters processed: ${files.length}`);
console.log(`Monsters modified: ${modifiedCount}`);
console.log(`Legendaries with ATK reduced: ${atkReducedCount}`);
