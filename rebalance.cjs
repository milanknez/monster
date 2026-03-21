const fs = require('fs');
const path = require('path');

const monstersDir = path.join(__dirname, 'src/data/monsters');
const files = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));

const CONFIG = {
  'Běžná': { hp: 130, attack: 48, defense: 18 },
  'Vzácná': { hp: 220, attack: 85, defense: 28 },
  'Epická': { hp: 450, attack: 175, defense: 55 },
  'Legendární': { hp: 950, attack: 380, defense: 110 }
};

files.forEach(file => {
  const filePath = path.join(monstersDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const rarity = data.rarity;
  const cfg = CONFIG[rarity] || CONFIG['Běžná'];
  
  // More distinct variation (+/- 10%)
  const vary = (val) => Math.round(val * (0.9 + Math.random() * 0.2));
  
  data.stats = {
    hp: vary(cfg.hp),
    attack: vary(cfg.attack),
    defense: vary(cfg.defense)
  };
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${data.name} (${rarity}) with 10% variation`);
});
