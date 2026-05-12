const fs = require('fs');
const path = 'd:/wamp64/www/monster/src/data/resources.ts';
let content = fs.readFileSync(path, 'utf8');

const insertion = `  },
  "xp_serum_1": {
    "color": "#22c55e",
    "label": { "cz": "XP Sérum I", "en": "XP Serum I", "sk": "XP Sérum I" },
    "icon": "💉",
    "category": "relic",
    "rarity": "Vzácná",
    "description": { "cz": "Genetický stimulant, který okamžitě přidá 200 XP.", "en": "Genetic stimulant that instantly adds 200 XP.", "sk": "Genetický stimulant, který okamžitě přidá 200 XP." },
    "dropWeight": 5, "dropMin": 1, "dropMax": 1,
    "stats": { "xp": 200 },
    "hasCustomIcon": true, "customIcon": "xp_serum_1"
  },
  "xp_serum_2": {
    "color": "#3b82f6",
    "label": { "cz": "XP Sérum II", "en": "XP Serum II", "sk": "XP Sérum II" },
    "icon": "💉",
    "category": "relic",
    "rarity": "Epická",
    "description": { "cz": "Silný genetický stimulant, který okamžitě přidá 400 XP.", "en": "Strong genetic stimulant that instantly adds 400 XP.", "sk": "Silný genetický stimulant, který okamžitě přidá 400 XP." },
    "dropWeight": 3, "dropMin": 1, "dropMax": 1,
    "stats": { "xp": 400 },
    "hasCustomIcon": true, "customIcon": "xp_serum_2"
  },
  "xp_serum_3": {
    "color": "#a855f7",
    "label": { "cz": "XP Sérum III", "en": "XP Serum III", "sk": "XP Sérum III" },
    "icon": "💉",
    "category": "relic",
    "rarity": "Legendární",
    "description": { "cz": "Maximální genetický stimulant, který okamžitě přidá 700 XP.", "en": "Ultimate genetic stimulant that instantly adds 700 XP.", "sk": "Maximálny genetický stimulant, ktorý okamžite přidá 700 XP." },
    "dropWeight": 1, "dropMin": 1, "dropMax": 1,
    "stats": { "xp": 700 },
    "hasCustomIcon": true, "customIcon": "xp_serum_3"
  }
};`;

// Use regex to replace the last }; with the insertion
content = content.replace(/\s*};\s*$/, insertion);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated resources.ts');
