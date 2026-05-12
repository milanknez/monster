import fs from 'fs';
import path from 'path';

const monstersDir = 'src/data/monsters';
const files = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));

console.log(`Found ${files.length} monsters to migrate.`);

files.forEach(file => {
  const filePath = path.join(monstersDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Skip if already migrated
  if (typeof data.name === 'object') return;

  const migrated = {
    ...data,
    name: { cz: data.name, en: data.name }, // Placeholder for EN
    description: { cz: data.description, en: data.description },
    type: { cz: data.type, en: data.type },
    rarity: { cz: data.rarity, en: data.rarity },
    abilities: data.abilities.map(ab => ({
      ...ab,
      name: { cz: ab.name, en: ab.name },
      description: { cz: ab.description, en: ab.description }
    }))
  };

  fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2));
  console.log(`Migrated ${file}`);
});

console.log('Migration complete. (EN versions are currently copies of CZ versions)');
