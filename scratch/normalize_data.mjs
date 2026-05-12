import fs from 'fs';
import path from 'path';

const resourcesPath = 'd:/wamp64/www/monster/src/data/resources.ts';
let resourcesContent = fs.readFileSync(resourcesPath, 'utf8');

// 1. Restore missing items if they are gone
const missingItems = `
  "wooden_shield": {
    "color": "#94a3b8",
    "label": { "cz": "Dřevěný štít", "en": "Wooden Shield", "sk": "Drevený štít" },
    "icon": "🛡️",
    "category": "relic",
    "rarity": "common",
    "description": { 
      "cz": "Malý, opotřebovaný štít, který poskytuje základní ochranu.", 
      "en": "A small, worn shield providing basic protection.", 
      "sk": "Malý, opotrebovaný štít, ktorý poskytuje základnú ochranu." 
    },
    "dropWeight": 15, "dropMin": 1, "dropMax": 1,
    "stats": { "def": 2 },
    "hasCustomIcon": true, "customIcon": "wooden_shield"
  },
  "rusty_nail": {
    "color": "#94a3b8",
    "label": { "cz": "Zrezivělý hřebík", "en": "Rusty Nail", "sk": "Zhrdzavený klinec" },
    "icon": "📌",
    "category": "relic",
    "rarity": "common",
    "description": { 
      "cz": "Starý a zrezivělý hřebík. Pořád může ublížit.", 
      "en": "An old and rusty nail. It can still hurt.", 
      "sk": "Starý a zhrdzavený klinec. Stále môže ublížiť." 
    },
    "dropWeight": 15, "dropMin": 1, "dropMax": 1,
    "stats": { "atk": 2 },
    "hasCustomIcon": true, "customIcon": "rusty_nail"
  },
  "old_glove": {
    "color": "#94a3b8",
    "label": { "cz": "Stará rukavice", "en": "Old Glove", "sk": "Stará rukavica" },
    "icon": "🧤",
    "category": "relic",
    "rarity": "common",
    "description": { 
      "cz": "Potrhaná kožená rukavice. Trochu chrání ruku.", 
      "en": "A tattered leather glove. Offers slight protection.", 
      "sk": "Potrhaná kožená rukavica. Trochu chráni ruku." 
    },
    "dropWeight": 20, "dropMin": 1, "dropMax": 1,
    "stats": { "def": 1 },
    "hasCustomIcon": true, "customIcon": "old_glove"
  },
  "dog_paw": {
    "color": "#94a3b8",
    "label": { "cz": "Psí tlapka", "en": "Dog Paw", "sk": "Psia labka" },
    "icon": "🐾",
    "category": "relic",
    "rarity": "common",
    "description": { 
      "cz": "Zaschlý otisk tlapky. Přináší divokou sílu.", 
      "en": "A dried paw print. Brings wild power.", 
      "sk": "Zaschnutý odtlačok labky. Prináša divokú silu." 
    },
    "dropWeight": 20, "dropMin": 1, "dropMax": 1,
    "stats": { "atk": 1 },
    "hasCustomIcon": true, "customIcon": "dog_paw"
  }
`;

if (!resourcesContent.includes('wooden_shield')) {
    // Find the last item before };
    resourcesContent = resourcesContent.replace(/(\n\s*\}\s*;\s*$)/, `,${missingItems}$1`);
}

// 2. Normalize Rarity in resources.ts
const rarityMap = {
    '"Běžná"': '"common"',
    '"Vzácná"': '"rare"',
    '"Epická"': '"epic"',
    '"Legendární"': '"legendary"'
};

for (const [cz, key] of Object.entries(rarityMap)) {
    resourcesContent = resourcesContent.split(cz).join(key);
}

fs.writeFileSync(resourcesPath, resourcesContent);
console.log('resources.ts normalized.');

// 3. Normalize Monsters
const monstersDir = 'd:/wamp64/www/monster/src/data/monsters';
const files = fs.readdirSync(monstersDir);

const monsterTypeMap = {
    '"Ohnivá"': '"fire"',
    '"Vodní"': '"water"',
    '"Přírodní"': '"nature"',
    '"Elektrická"': '"electric"'
};

const monsterRarityMap = {
    '"Běžná"': '"common"',
    '"Vzácná"': '"rare"',
    '"Epická"': '"epic"',
    '"Legendární"': '"legendary"'
};

files.forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(monstersDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace types
        for (const [cz, key] of Object.entries(monsterTypeMap)) {
            content = content.split(cz).join(key);
        }
        // Replace rarities
        for (const [cz, key] of Object.entries(monsterRarityMap)) {
            content = content.split(cz).join(key);
        }
        
        fs.writeFileSync(filePath, content);
    }
});
console.log('Monster JSONs normalized.');
