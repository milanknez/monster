const fs = require('fs');
const path = require('path');

const monstersDir = 'd:/wamp64/www/monster/src/data/monsters';
const files = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));

const groups = {};

files.forEach(file => {
  const m = JSON.parse(fs.readFileSync(path.join(monstersDir, file), 'utf-8'));
  const rarity = m.rarity;
  if (!groups[rarity]) groups[rarity] = { hp: [], atk: [], def: [] };
  groups[rarity].hp.push(m.stats.hp);
  groups[rarity].atk.push(m.stats.attack);
  groups[rarity].def.push(m.stats.defense);
});

const result = {};
const rarities = ['Běžná', 'Vzácná', 'Epická', 'Legendární'];

rarities.forEach(r => {
  const stats = groups[r];
  if (!stats) return;
  const avg = (arr) => Math.round(arr.reduce((a, b) => a + b) / arr.length);
  result[r] = {
    hp: `${Math.min(...stats.hp)} - ${Math.max(...stats.hp)} (ø ${avg(stats.hp)})`,
    atk: `${Math.min(...stats.atk)} - ${Math.max(...stats.atk)} (ø ${avg(stats.atk)})`,
    def: `${Math.min(...stats.def)} - ${Math.max(...stats.def)} (ø ${avg(stats.def)})`
  };
});

console.table(result);
