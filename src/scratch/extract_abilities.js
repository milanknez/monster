import fs from 'fs';
import path from 'path';

const monstersDir = 'd:/wamp64/www/monster/src/data/monsters';
const files = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));

const results = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(monstersDir, file), 'utf-8');
  const monster = JSON.parse(content);
  
  if (monster.abilities) {
    monster.abilities.forEach(ability => {
      if (ability.type === 'attack') {
        results.push({
          monsterName: monster.name,
          rarity: monster.rarity,
          abilityName: ability.name,
          chance: ability.chance || 40,
          value: ability.value || 1.25,
          baseAttack: monster.stats?.attack || 0
        });

      }
    });
  }
});

const finalResults = JSON.stringify(results, null, 2);
fs.writeFileSync('d:/wamp64/www/monster/src/scratch/abilities_data.json', finalResults);
console.log('Done');

