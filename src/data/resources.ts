import { ResourceConfig } from '../types';

export const RESOURCE_CONFIG: Record<string, ResourceConfig> = {
  "crystal": {
    "color": "#0db9f2",
    "label": {
      "cz": "Krystal",
      "en": "Crystal",
      "sk": "Kryštál"
    },
    "icon": "💎",
    "category": "material",
    "rarity": "common",
    "description": {
      "cz": "Běžný drahokam sloužící k vylepšování základních atributů.",
      "en": "Common gem used for upgrading basic attributes.",
      "sk": "Bežný drahokam slúžiaci na vylepšovanie základných atribútov."
    },
    "dropWeight": 50,
    "dropMin": 1,
    "dropMax": 2
  },
  "herb": {
    "color": "#10b981",
    "label": {
      "cz": "Bylinka",
      "en": "Herb",
      "sk": "Bylinka"
    },
    "icon": "🌿",
    "category": "material",
    "rarity": "common",
    "description": {
      "cz": "Přírodní surovina pro vaření lektvarů.",
      "en": "Natural resource for brewing potions.",
      "sk": "Prírodná surovina na varenie lektvarov."
    },
    "dropWeight": 50,
    "dropMin": 1,
    "dropMax": 2
  },
  "energy": {
    "color": "#f59e0b",
    "label": {
      "cz": "Energie",
      "en": "Energy",
      "sk": "Energia"
    },
    "icon": "⚡",
    "category": "material",
    "rarity": "common",
    "description": {
      "cz": "Kondenzovaná elektrická energie.",
      "en": "Condensed electrical energy.",
      "sk": "Kondenzovaná elektrická energia."
    },
    "dropWeight": 50,
    "dropMin": 1,
    "dropMax": 2
  },
  "mineral": {
    "color": "#64748b",
    "label": {
      "cz": "Minerál",
      "en": "Mineral",
      "sk": "Minerál"
    },
    "icon": "🪨",
    "category": "material",
    "rarity": "common",
    "description": {
      "cz": "Tvrdý stavební kámen.",
      "en": "Hard construction stone.",
      "sk": "Tvrdý stavebný kameň."
    },
    "dropWeight": 50,
    "dropMin": 1,
    "dropMax": 2
  },
  "magic_crystal": {
    "color": "#a855f7",
    "label": {
      "cz": "Magický Krystal",
      "en": "Magic Crystal",
      "sk": "Magický Kryštál"
    },
    "icon": "🔮",
    "category": "material",
    "rarity": "rare",
    "description": {
      "cz": "Vzácný magický drahokam.",
      "en": "Rare magical gem.",
      "sk": "Vzácny magický drahokam."
    },
    "dropWeight": 50,
    "dropMin": 1,
    "dropMax": 1
  },
  "super_mineral": {
    "color": "#ea580c",
    "label": {
      "cz": "Vzácný Minerál",
      "en": "Rare Mineral",
      "sk": "Vzácny Minerál"
    },
    "icon": "🌋",
    "category": "material",
    "rarity": "rare",
    "description": {
      "cz": "Ohněm kovaný kámen.",
      "en": "Fire-forged stone.",
      "sk": "Ohňom kovaný kameň."
    },
    "dropWeight": 50,
    "dropMin": 1,
    "dropMax": 1
  },
  "monster_egg": {
    "color": "#a855f7",
    "label": {
      "cz": "Tajemné vajíčko",
      "en": "Mysterious Egg",
      "sk": "Tajomné vajíčko"
    },
    "icon": "🥚",
    "category": "consumable",
    "rarity": "legendary",
    "description": {
      "cz": "Vylíhne se na vzácnou příšerku.",
      "en": "Hatches into a rare monster.",
      "sk": "Vyliahne sa z neho vzácna príšerka."
    },
    "dropWeight": 0,
    "dropMin": 1,
    "dropMax": 2
  },
  "xp_booster": {
    "color": "#ec4899",
    "label": {
      "cz": "XP Elixír",
      "en": "XP Elixir",
      "sk": "XP Elixír"
    },
    "icon": "🧪",
    "category": "consumable",
    "rarity": "rare",
    "description": {
      "cz": "Dvojitý zisk XP na 15 minut.",
      "en": "Double XP gain for 15 minutes.",
      "sk": "Dvojitý zisk XP na 15 minút."
    },
    "recipe": [
      {
        "type": "crystal",
        "count": 5
      },
      {
        "type": "herb",
        "count": 2
      }
    ],
    "recipeAmount": 1,
    "dropWeight": 20,
    "dropMin": 1,
    "dropMax": 2,
    "specialEffect": "xp_boost",
    "effectDuration": 15,
    "hasCustomIcon": false
  },
  "hp_potion": {
    "color": "#ef4444",
    "label": {
      "cz": "HP Potion",
      "en": "HP Potion",
      "sk": "HP Potion"
    },
    "icon": "🧪",
    "category": "consumable",
    "rarity": "common",
    "description": {
      "cz": "Okamžitě vyléčí 50 HP.",
      "en": "Instantly heals 50 HP.",
      "sk": "Okamžite vylieči 50 HP."
    },
    "recipe": [
      {
        "type": "herb",
        "count": 5
      },
      {
        "type": "energy",
        "count": 1
      }
    ],
    "recipeAmount": 1,
    "dropWeight": 20,
    "dropMin": 1,
    "dropMax": 2,
    "stats": {
      "hp": 50
    },
    "statsType": "flat",
    "hasCustomIcon": true,
    "customIcon": "loot_10"
  },
  "hp_potion_large": {
    "color": "#f43f5e",
    "label": {
      "cz": "Super HP Lektvar",
      "en": "Super HP Potion",
      "sk": "Super HP Lektvar"
    },
    "icon": "🧪",
    "category": "consumable",
    "rarity": "rare",
    "description": {
      "cz": "Prémiový lektvar, který okamžitě vyléčí 100 HP.",
      "en": "Premium potion that instantly heals 100 HP.",
      "sk": "Prémiový lektvar, ktorý okamžite vylieči 100 HP."
    },
    "recipe": [
      {
        "type": "hp_potion",
        "count": 2
      },
      {
        "type": "magic_crystal",
        "count": 1
      }
    ],
    "recipeAmount": 1,
    "dropWeight": 10,
    "dropMin": 1,
    "dropMax": 1,
    "stats": {
      "hp": 100
    },
    "statsType": "flat",
    "hasCustomIcon": true,
    "customIcon": "hp_potion_large"
  },
  "gem_red_1": {
    "color": "#ef4444",
    "label": {
      "cz": "Rudý Jaspis 1",
      "en": "Red Jasper 1",
      "sk": "Červený Jaspis 1"
    },
    "icon": "🔴",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_1",
    "category": "gem",
    "rarity": "common",
    "stats": {
      "atk": 6
    },
    "recipe": [
      {
        "type": "mineral",
        "count": 5
      },
      {
        "type": "energy",
        "count": 2
      }
    ],
    "recipeAmount": 1,
    "description": {
      "cz": "Zvyšuje útok o 6 bodů.",
      "en": "Increases attack by 6 points.",
      "sk": "Zvyšuje útok o 6 bodov."
    },
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_1": {
    "color": "#10b981",
    "label": {
      "cz": "Zelený Nefrit 1",
      "en": "Green Jade 1",
      "sk": "Zelený Nefrit 1"
    },
    "icon": "🟢",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_1",
    "category": "gem",
    "rarity": "common",
    "stats": {
      "hp": 15
    },
    "recipe": [
      {
        "type": "herb",
        "count": 8
      },
      {
        "type": "crystal",
        "count": 2
      }
    ],
    "recipeAmount": 1,
    "description": {
      "cz": "Zvyšuje zdraví o 15 bodů.",
      "en": "Increases health by 15 points.",
      "sk": "Zvyšuje zdravie o 15 bodov."
    },
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_1": {
    "color": "#e2e8f0",
    "label": {
      "cz": "Bílý Křemen 1",
      "en": "White Quartz 1",
      "sk": "Biely Kremeň 1"
    },
    "icon": "⚪",
    "hasCustomIcon": true,
    "customIcon": "gem_white_1",
    "category": "gem",
    "rarity": "common",
    "stats": {
      "def": 4
    },
    "recipe": [
      {
        "type": "crystal",
        "count": 6
      },
      {
        "type": "energy",
        "count": 3
      }
    ],
    "recipeAmount": 1,
    "description": {
      "cz": "Zvyšuje obranu o 4 body.",
      "en": "Increases defense by 4 points.",
      "sk": "Zvyšuje obranu o 4 body."
    },
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_2": {
    "color": "#ef4444",
    "label": {
      "cz": "Rudý Jaspis 2",
      "en": "Red Jasper 2",
      "sk": "Červený Jaspis 2"
    },
    "icon": "🔴",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_1",
    "category": "gem",
    "rarity": "common",
    "stats": {
      "atk": 12
    },
    "description": {
      "cz": "Zvyšuje útok o 12 bodů.",
      "en": "Increases attack by 12 points.",
      "sk": "Zvyšuje útok o 12 bodov."
    },
    "recipe": [
      {
        "type": "gem_red_1",
        "count": 2
      },
      {
        "type": "mineral",
        "count": 5
      }
    ],
    "recipeAmount": 1,
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_2": {
    "color": "#10b981",
    "label": {
      "cz": "Zelený Nefrit 2",
      "en": "Green Jade 2",
      "sk": "Zelený Nefrit 2"
    },
    "icon": "🟢",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_1",
    "category": "gem",
    "rarity": "common",
    "stats": {
      "hp": 30
    },
    "description": {
      "cz": "Zvyšuje zdraví o 30 bodů.",
      "en": "Increases health by 30 points.",
      "sk": "Zvyšuje zdravie o 30 bodov."
    },
    "recipe": [
      {
        "type": "gem_green_1",
        "count": 2
      },
      {
        "type": "herb",
        "count": 6
      }
    ],
    "recipeAmount": 1,
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_2": {
    "color": "#e2e8f0",
    "label": {
      "cz": "Bílý Křemen 2",
      "en": "White Quartz 2",
      "sk": "Biely Kremeň 2"
    },
    "icon": "⚪",
    "hasCustomIcon": true,
    "customIcon": "gem_white_1",
    "category": "gem",
    "rarity": "common",
    "stats": {
      "def": 8
    },
    "description": {
      "cz": "Zvyšuje obranu o 8 bodů.",
      "en": "Increases defense by 8 points.",
      "sk": "Zvyšuje obranu o 8 bodov."
    },
    "recipe": [
      {
        "type": "gem_white_1",
        "count": 2
      },
      {
        "type": "crystal",
        "count": 4
      }
    ],
    "recipeAmount": 1,
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_3": {
    "color": "#ef4444",
    "label": {
      "cz": "Rudý Jaspis 3",
      "en": "Red Jasper 3",
      "sk": "Červený Jaspis 3"
    },
    "icon": "🔴",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_2",
    "category": "gem",
    "rarity": "rare",
    "stats": {
      "atk": 20
    },
    "description": {
      "cz": "Zvyšuje útok o 20 bodů.",
      "en": "Increases attack by 20 points.",
      "sk": "Zvyšuje útok o 20 bodov."
    },
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_3": {
    "color": "#10b981",
    "label": {
      "cz": "Zelený Nefrit 3",
      "en": "Green Jade 3",
      "sk": "Zelený Nefrit 3"
    },
    "icon": "🟢",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_2",
    "category": "gem",
    "rarity": "rare",
    "stats": {
      "hp": 50
    },
    "description": {
      "cz": "Zvyšuje zdraví o 50 bodů.",
      "en": "Increases health by 50 points.",
      "sk": "Zvyšuje zdravie o 50 bodov."
    },
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_3": {
    "color": "#e2e8f0",
    "label": {
      "cz": "Bílý Křemen 3",
      "en": "White Quartz 3",
      "sk": "Biely Kremeň 3"
    },
    "icon": "⚪",
    "hasCustomIcon": true,
    "customIcon": "gem_white_2",
    "category": "gem",
    "rarity": "rare",
    "stats": {
      "def": 15
    },
    "description": {
      "cz": "Zvyšuje obranu o 15 bodů.",
      "en": "Increases defense by 15 points.",
      "sk": "Zvyšuje obranu o 15 bodov."
    },
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_4": {
    "color": "#ef4444",
    "label": {
      "cz": "Rudý Jaspis 4",
      "en": "Red Jasper 4",
      "sk": "Červený Jaspis 4"
    },
    "icon": "💠",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_2",
    "category": "gem",
    "rarity": "rare",
    "stats": {
      "atk": 5
    },
    "statsType": "perc",
    "recipe": [
      {
        "type": "super_mineral",
        "count": 2
      },
      {
        "type": "magic_crystal",
        "count": 2
      }
    ],
    "recipeAmount": 1,
    "description": {
      "cz": "Zvyšuje útok o 5 %.",
      "en": "Increases attack by 5%.",
      "sk": "Zvyšuje útok o 5%."
    },
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_4": {
    "color": "#10b981",
    "label": {
      "cz": "Zelený Nefrit 4",
      "en": "Green Jade 4",
      "sk": "Zelený Nefrit 4"
    },
    "icon": "🌿",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_2",
    "category": "gem",
    "rarity": "rare",
    "stats": {
      "hp": 5
    },
    "statsType": "perc",
    "recipe": [
      {
        "type": "herb",
        "count": 20
      },
      {
        "type": "magic_crystal",
        "count": 3
      }
    ],
    "recipeAmount": 1,
    "description": {
      "cz": "Zvyšuje zdraví o 5 %.",
      "en": "Increases health by 5%.",
      "sk": "Zvyšuje zdravie o 5%."
    },
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_4": {
    "color": "#e2e8f0",
    "label": {
      "cz": "Bílý Křemen 4",
      "en": "White Quartz 4",
      "sk": "Biely Kremeň 4"
    },
    "icon": "💎",
    "hasCustomIcon": true,
    "customIcon": "gem_white_2",
    "category": "gem",
    "rarity": "rare",
    "stats": {
      "def": 5
    },
    "statsType": "perc",
    "recipe": [
      {
        "type": "magic_crystal",
        "count": 4
      },
      {
        "type": "mineral",
        "count": 10
      }
    ],
    "recipeAmount": 1,
    "description": {
      "cz": "Zvyšuje obranu o 5 %.",
      "en": "Increases defense by 5%.",
      "sk": "Zvyšuje obranu o 5%."
    },
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_5": {
    "color": "#ef4444",
    "label": {
      "cz": "Rudý Jaspis 5",
      "en": "Red Jasper 5",
      "sk": "Červený Jaspis 5"
    },
    "icon": "💠",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_3",
    "category": "gem",
    "rarity": "epic",
    "stats": {
      "atk": 10
    },
    "statsType": "perc",
    "description": {
      "cz": "Zvyšuje útok o 10 %.",
      "en": "Increases attack by 10%.",
      "sk": "Zvyšuje útok o 10%."
    },
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_5": {
    "color": "#10b981",
    "label": {
      "cz": "Zelený Nefrit 5",
      "en": "Green Jade 5",
      "sk": "Zelený Nefrit 5"
    },
    "icon": "🌿",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_3",
    "category": "gem",
    "rarity": "epic",
    "stats": {
      "hp": 10
    },
    "statsType": "perc",
    "description": {
      "cz": "Zvyšuje zdraví o 10 %.",
      "en": "Increases health by 10%.",
      "sk": "Zvyšuje zdravie o 10%."
    },
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_5": {
    "color": "#e2e8f0",
    "label": {
      "cz": "Bílý Křemen 5",
      "en": "White Quartz 5",
      "sk": "Biely Kremeň 5"
    },
    "icon": "💎",
    "hasCustomIcon": true,
    "customIcon": "gem_white_3",
    "category": "gem",
    "rarity": "epic",
    "stats": {
      "def": 10
    },
    "statsType": "perc",
    "description": {
      "cz": "Zvyšuje obranu o 10 %.",
      "en": "Increases defense by 10%.",
      "sk": "Zvyšuje obranu o 10%."
    },
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_6": {
    "color": "#ef4444",
    "label": {
      "cz": "Rudý Jaspis 6",
      "en": "Red Jasper 6",
      "sk": "Červený Jaspis 6"
    },
    "icon": "💠",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_3",
    "category": "gem",
    "rarity": "epic",
    "stats": {
      "atk": 15
    },
    "statsType": "perc",
    "description": {
      "cz": "Zvyšuje útok o 15 %.",
      "en": "Increases attack by 15%.",
      "sk": "Zvyšuje útok o 15%."
    },
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_6": {
    "color": "#10b981",
    "label": {
      "cz": "Zelený Nefrit 6",
      "en": "Green Jade 6",
      "sk": "Zelený Nefrit 6"
    },
    "icon": "🌿",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_3",
    "category": "gem",
    "rarity": "epic",
    "stats": {
      "hp": 15
    },
    "statsType": "perc",
    "description": {
      "cz": "Zvyšuje zdraví o 15 %.",
      "en": "Increases health by 15%.",
      "sk": "Zvyšuje zdravie o 15%."
    },
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_6": {
    "color": "#e2e8f0",
    "label": {
      "cz": "Bílý Křemen 6",
      "en": "White Quartz 6",
      "sk": "Biely Kremeň 6"
    },
    "icon": "💎",
    "hasCustomIcon": true,
    "customIcon": "gem_white_3",
    "category": "gem",
    "rarity": "epic",
    "stats": {
      "def": 15
    },
    "statsType": "perc",
    "description": {
      "cz": "Zvyšuje obranu o 15 %.",
      "en": "Increases defense by 15%.",
      "sk": "Zvyšuje obranu o 15%."
    },
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_1": {
    "recipe": [
      {
        "type": "mineral",
        "count": 8
      },
      {
        "type": "energy",
        "count": 2
      }
    ],
    "recipeAmount": 1,
    "label": {
      "cz": "Sérum z krunýře",
      "en": "Shell Serum",
      "sk": "Sérum z panciera"
    },
    "icon": "🧪",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 5
    },
    "rarity": "common",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_1",
    "category": "relic",
    "description": {
      "cz": "Zpevní kůži tvé příšery trvalým bonusem (+5 DEF).",
      "en": "Strengthens your monster's skin with a permanent bonus (+5 DEF).",
      "sk": "Spevní kožu tvojho monštra trvalým bonusom (+5 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_2": {
    "recipe": [
      {
        "type": "herb",
        "count": 8
      },
      {
        "type": "crystal",
        "count": 2
      }
    ],
    "recipeAmount": 1,
    "label": {
      "cz": "Dravý mutagen",
      "en": "Predatory Mutagen",
      "sk": "Dravý mutagén"
    },
    "icon": "🧪",
    "stats": {
      "hp": 0,
      "atk": 5,
      "def": 0
    },
    "rarity": "common",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_2",
    "category": "relic",
    "description": {
      "cz": "Zvýší agresivitu a sílu útoku příšery (+5 ATK).",
      "en": "Increases monster aggressiveness and attack power (+5 ATK).",
      "sk": "Zvýši agresivitu a silu útoku príšery (+5 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_3": {
    "label": {
      "cz": "Zahušťovač krve",
      "en": "Blood Thickener",
      "sk": "Zahusťovač krvi"
    },
    "icon": "🧪",
    "stats": {
      "hp": 20,
      "atk": 0,
      "def": 3
    },
    "rarity": "rare",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_3",
    "category": "relic",
    "description": {
      "cz": "Zvýší hustotu krve, posílí výdrž i odolnost (+20 HP, +3 DEF).",
      "en": "Increases blood density, strengthening stamina and resistance (+20 HP, +3 DEF).",
      "sk": "Zvýši hustotu krvi, posilní výdrž i odolnosť (+20 HP, +3 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_4": {
    "recipe": [
      {
        "type": "herb",
        "count": 5
      },
      {
        "type": "crystal",
        "count": 5
      },
      {
        "type": "mineral",
        "count": 2
      }
    ],
    "recipeAmount": 1,
    "label": {
      "cz": "Regenerační gel",
      "en": "Regeneration Gel",
      "sk": "Regeneračný gél"
    },
    "icon": "🧪",
    "stats": {
      "hp": 10,
      "atk": 0,
      "def": 2
    },
    "rarity": "common",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_4",
    "category": "relic",
    "description": {
      "cz": "Bio-gel urychlující obnovu tkání (+10 HP, +2 DEF).",
      "en": "Bio-gel accelerating tissue recovery (+10 HP, +2 DEF).",
      "sk": "Bio-gél urýchľujúci obnovu tkanív (+10 HP, +2 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_5": {
    "label": {
      "cz": "Adrenalinový extrakt",
      "en": "Adrenaline Extract",
      "sk": "Adrenalínový extrakt"
    },
    "icon": "🧪",
    "stats": {
      "hp": 0,
      "atk": 8,
      "def": 0
    },
    "rarity": "rare",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_5",
    "category": "relic",
    "description": {
      "cz": "Čistý extrakt z nadledvinek pro vyšší sílu v boji (+8 ATK).",
      "en": "Pure adrenal gland extract for higher combat strength (+8 ATK).",
      "sk": "Čistý extrakt z nadobličiek pre vyššiu silu v boji (+8 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_6": {
    "label": {
      "cz": "Stabilizovaná DNA",
      "en": "Stabilized DNA",
      "sk": "Stabilizovaná DNA"
    },
    "icon": "🧬",
    "stats": {
      "hp": 0,
      "atk": 5,
      "def": 5
    },
    "rarity": "rare",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_6",
    "category": "relic",
    "description": {
      "cz": "Vylepšený genetický kód pro celkové zvýšení statů (+5 ATK, +5 DEF).",
      "en": "Improved genetic code for an overall stat boost (+5 ATK, +5 DEF).",
      "sk": "Vylepšený genetický kód pre celkové zvýšenie štatistík (+5 ATK, +5 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_7": {
    "label": {
      "cz": "Vulkanický kondenzát",
      "en": "Volcanic Condensate",
      "sk": "Vulkanický kondenzát"
    },
    "icon": "🧪",
    "stats": {
      "hp": 0,
      "atk": 10,
      "def": 0
    },
    "rarity": "epic",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_7",
    "category": "relic",
    "description": {
      "cz": "Získává se z ohnivých monster, brutálně zvýší útok (+10 ATK).",
      "en": "Získává se z ohnivých monster, brutálně zvýší útok (+10 ATK).",
      "sk": "Získává se z ohnivých monster, brutálně zvýší útok (+10 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_8": {
    "label": {
      "cz": "Glaciální esence",
      "en": "Glacial Essence",
      "sk": "Glaciálna esencia"
    },
    "icon": "🧪",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 10
    },
    "rarity": "epic",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_8",
    "category": "relic",
    "description": {
      "cz": "Zmrazí povrch těla příšery do ledového krunýře (+10 DEF).",
      "en": "Zmrazí povrch těla příšery do ledového krunýře (+10 DEF).",
      "sk": "Zmrazí povrch těla příšery do ledového krunýře (+10 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_9": {
    "label": {
      "cz": "Mutagenní biomasa",
      "en": "Mutagenic Biomass",
      "sk": "Mutagénna biomasa"
    },
    "icon": "🧪",
    "stats": {
      "hp": 50,
      "atk": 0,
      "def": 0
    },
    "rarity": "epic",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "customIcon": "relic_9",
    "category": "relic",
    "description": {
      "cz": "Masivní nárůst svalové a orgánové hmoty příšery (+50 HP).",
      "en": "Masivní nárůst svalové a orgánové hmoty příšery (+50 HP).",
      "sk": "Masivní nárůst svalové a orgánové hmoty příšery (+50 HP)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_10": {
    "label": {
      "cz": "Dračí krev",
      "en": "Dragon Blood",
      "sk": "Dračia krv"
    },
    "icon": "🛡️",
    "stats": {
      "hp": 100,
      "atk": 0,
      "def": 0
    },
    "rarity": "legendary",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+100 HP).",
      "en": "Permanently improves your monster (+100 HP).",
      "sk": "Trvale vylepší tvoje monštrum (+100 HP)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_11": {
    "label": {
      "cz": "Prastarý Artefakt",
      "en": "Ancient Artifact",
      "sk": "Prastarý Artefakt"
    },
    "icon": "✨",
    "stats": {
      "hp": 150,
      "atk": 50,
      "def": 5
    },
    "rarity": "legendary",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+150 HP, +50 ATK, +5 DEF).",
      "en": "Permanently improves your monster (+150 HP, +50 ATK, +5 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+150 HP, +50 ATK, +5 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_12": {
    "recipe": [
      {
        "type": "mineral",
        "count": 10
      },
      {
        "type": "crystal",
        "count": 5
      }
    ],
    "recipeAmount": 1,
    "label": {
      "cz": "tesákův luk",
      "en": "tesákův luk",
      "sk": "tesákův luk"
    },
    "icon": "🦷",
    "stats": {
      "hp": 0,
      "atk": 4,
      "def": 0
    },
    "rarity": "common",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+4 ATK).",
      "en": "Permanently improves your monster (+4 ATK).",
      "sk": "Trvale vylepší tvoje monštrum (+4 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_13": {
    "label": {
      "cz": "meč skázy",
      "en": "Sword of Doom",
      "sk": "Meč skazy"
    },
    "icon": "🔨",
    "stats": {
      "hp": 0,
      "atk": 12,
      "def": -2
    },
    "rarity": "rare",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+12 ATK, +-2 DEF).",
      "en": "Permanently improves your monster (+12 ATK, +-2 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+12 ATK, +-2 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_14": {
    "label": {
      "cz": "Magická Truhla",
      "en": "Magic Chest",
      "sk": "Magická truhlica"
    },
    "icon": "💍",
    "stats": {
      "hp": 100,
      "atk": 0,
      "def": 0
    },
    "rarity": "legendary",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+100 HP).",
      "en": "Permanently improves your monster (+100 HP).",
      "sk": "Trvale vylepší tvoje monštrum (+100 HP)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_15": {
    "recipe": [
      {
        "type": "herb",
        "count": 10
      },
      {
        "type": "crystal",
        "count": 5
      }
    ],
    "recipeAmount": 1,
    "label": {
      "cz": "báby svitek",
      "en": "Old Hag's Scroll",
      "sk": "Babský zvitok"
    },
    "icon": "🥊",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 6
    },
    "rarity": "common",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+6 DEF).",
      "en": "Permanently improves your monster (+6 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+6 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_16": {
    "label": {
      "cz": "Asasínská relikvie",
      "en": "Assassin's Relic",
      "sk": "Asasínska relikvia"
    },
    "icon": "🗡️",
    "stats": {
      "hp": 0,
      "atk": 10,
      "def": 0
    },
    "rarity": "epic",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+10 ATK).",
      "en": "Permanently improves your monster (+10 ATK).",
      "sk": "Trvale vylepší tvoje monštrum (+10 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_1": {
    "label": {
      "cz": "zub času",
      "en": "Tooth of Time",
      "sk": "Zub času"
    },
    "color": "#e2e8f0",
    "icon": "🦷",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 5,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+5 ATK).",
      "en": "Permanently improves your monster (+5 ATK).",
      "sk": "Trvale vylepší tvoje monštrum (+5 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_2": {
    "label": {
      "cz": "Stará kost",
      "en": "Old Bone",
      "sk": "Stará kosť"
    },
    "color": "#f8fafc",
    "icon": "🦴",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 5
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+5 DEF).",
      "en": "Permanently improves your monster (+5 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+5 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_3": {
    "label": {
      "cz": "Prasklá lebka",
      "en": "Cracked Skull",
      "sk": "Prasknutá lebka"
    },
    "color": "#cbd5e1",
    "icon": "💀",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 15,
      "atk": 0,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+15 HP).",
      "en": "Permanently improves your monster (+15 HP).",
      "sk": "Trvale vylepší tvoje monštrum (+15 HP)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_4": {
    "label": {
      "cz": "ocelový řetěz",
      "en": "Steel Chain",
      "sk": "Oceľová reťaz"
    },
    "color": "#94a3b8",
    "icon": "⛓️",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 8
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+8 DEF).",
      "en": "Permanently improves your monster (+8 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+8 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_5": {
    "label": {
      "cz": "Tajemný přívěšek",
      "en": "Mysterious Pendant",
      "sk": "Tajomný prívesok"
    },
    "color": "#fcd34d",
    "icon": "📿",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 10,
      "atk": 0,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+10 HP).",
      "en": "Permanently improves your monster (+10 HP).",
      "sk": "Trvale vylepší tvoje monštrum (+10 HP)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_6": {
    "label": {
      "cz": "Stará mince",
      "en": "Old Coin",
      "sk": "Stará minca"
    },
    "color": "#fbbf24",
    "icon": "🪙",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 5,
      "atk": 0,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+5 HP).",
      "en": "Permanently improves your monster (+5 HP).",
      "sk": "Trvale vylepší tvoje monštrum (+5 HP)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_7": {
    "label": {
      "cz": "Prázdná ulita",
      "en": "Empty Shell",
      "sk": "Prázdna ulita"
    },
    "color": "#93c5fd",
    "icon": "🐚",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 12
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+12 DEF).",
      "en": "Permanently improves your monster (+12 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+12 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_8": {
    "label": {
      "cz": "Ostrý kámen",
      "en": "Sharp Stone",
      "sk": "Ostrý kameň"
    },
    "color": "#64748b",
    "icon": "🪨",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 6,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+6 ATK).",
      "en": "Permanently improves your monster (+6 ATK).",
      "sk": "Trvale vylepší tvoje monštrum (+6 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_9": {
    "label": {
      "cz": "Dřevěný špalek",
      "en": "Wooden Block",
      "sk": "Drevený poleno"
    },
    "color": "#78350f",
    "icon": "🪵",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 4,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+4 ATK).",
      "en": "Permanently improves your monster (+4 ATK).",
      "sk": "Trvale vylepší tvoje monštrum (+4 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_10": {
    "label": {
      "cz": "Starý pergamen",
      "en": "Old Parchment",
      "sk": "Starý pergamen"
    },
    "color": "#fde68a",
    "icon": "📜",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 8,
      "atk": 0,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+8 HP).",
      "en": "Permanently improves your monster (+8 HP).",
      "sk": "Trvale vylepší tvoje monštrum (+8 HP)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_11": {
    "label": {
      "cz": "Dřevěný štít",
      "en": "Wooden Shield",
      "sk": "Drevený štít"
    },
    "color": "#92400e",
    "icon": "🛡️",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 10
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+10 DEF).",
      "en": "Permanently improves your monster (+10 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+10 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1,
    "customIcon": "wooden_shield"
  },
  "item_12": {
    "label": {
      "cz": "Malý lektvar",
      "en": "Small Potion",
      "sk": "Malý lektvar"
    },
    "color": "#ef4444",
    "icon": "🧪",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 20,
      "atk": 0,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+20 HP).",
      "en": "Permanently improves your monster (+20 HP).",
      "sk": "Trvale vylepší tvoje monštrum (+20 HP)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_13": {
    "label": {
      "cz": "Zrezivělý hřebík",
      "en": "Rusty Nail",
      "sk": "Zhrdzavený klinec"
    },
    "color": "#475569",
    "icon": "📍",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 7,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+7 ATK).",
      "en": "Permanently improves your monster (+7 ATK).",
      "sk": "Trvale vylepší tvoje monštrum (+7 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1,
    "customIcon": "rusty_nail"
  },
  "item_14": {
    "label": {
      "cz": "Stará rukavice",
      "en": "Old Glove",
      "sk": "Stará rukavica"
    },
    "color": "#78350f",
    "icon": "🧤",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 5
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+5 DEF).",
      "en": "Permanently improves your monster (+5 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+5 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1,
    "customIcon": "old_glove"
  },
  "item_15": {
    "label": {
      "cz": "Tupá dýka",
      "en": "Blunt Dagger",
      "sk": "Tupá dýka"
    },
    "color": "#334155",
    "icon": "🗡️",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 0,
      "atk": 10,
      "def": 0
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+10 ATK).",
      "en": "Permanently improves your monster (+10 ATK).",
      "sk": "Trvale vylepší tvoje monštrum (+10 ATK)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_16": {
    "label": {
      "cz": "Psí tlapka",
      "en": "Dog Paw",
      "sk": "Psia labka"
    },
    "color": "#8b4513",
    "icon": "🐾",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "common",
    "stats": {
      "hp": 5,
      "atk": 5,
      "def": 5
    },
    "description": {
      "cz": "Trvale vylepší tvé monstrum (+5 HP, +5 ATK, +5 DEF).",
      "en": "Permanently improves your monster (+5 HP, +5 ATK, +5 DEF).",
      "sk": "Trvale vylepší tvoje monštrum (+5 HP, +5 ATK, +5 DEF)."
    },
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1,
    "customIcon": "dog_paw"
  },
  "mana_potion": {
    "color": "#3b82f6",
    "label": {
      "cz": "Mana Potion",
      "en": "Mana Potion",
      "sk": "Mana Potion"
    },
    "icon": "🧪",
    "category": "consumable",
    "rarity": "common",
    "description": {
      "cz": "Obnoví 60 bodů many (výdrže).",
      "en": "Restores 60 mana points (stamina).",
      "sk": "Obnoví 60 bodov many (výdrže)."
    },
    "recipe": [
      {
        "type": "energy",
        "count": 4
      },
      {
        "type": "mineral",
        "count": 2
      }
    ],
    "recipeAmount": 1,
    "dropWeight": 20,
    "dropMin": 1,
    "dropMax": 2,
    "stats": {
      "energy": 60
    },
    "statsType": "flat",
    "hasCustomIcon": true
  },
  "xp_serum_1": {
    "color": "#22c55e",
    "label": {
      "cz": "XP Sérum I",
      "en": "XP Serum I",
      "sk": "XP Sérum I"
    },
    "icon": "💉",
    "category": "relic",
    "rarity": "rare",
    "description": {
      "cz": "Genetický stimulant, který okamžitě přidá 200 XP.",
      "en": "Genetic stimulant that instantly adds 200 XP.",
      "sk": "Genetický stimulant, který okamžitě přidá 200 XP."
    },
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1,
    "stats": {
      "xp": 200
    },
    "hasCustomIcon": true,
    "customIcon": "xp_serum_1",
    "recipe": [
      {
        "type": "energy",
        "count": 4
      },
      {
        "type": "herb",
        "count": 5
      }
    ]
  },
  "xp_serum_2": {
    "color": "#3b82f6",
    "label": {
      "cz": "XP Sérum II",
      "en": "XP Serum II",
      "sk": "XP Sérum II"
    },
    "icon": "💉",
    "category": "relic",
    "rarity": "epic",
    "description": {
      "cz": "Silný genetický stimulant, který okamžitě přidá 400 XP.",
      "en": "Strong genetic stimulant that instantly adds 400 XP.",
      "sk": "Silný genetický stimulant, který okamžitě přidá 400 XP."
    },
    "dropWeight": 3,
    "dropMin": 1,
    "dropMax": 1,
    "stats": {
      "xp": 400
    },
    "hasCustomIcon": true,
    "customIcon": "xp_serum_2"
  },
  "xp_serum_3": {
    "color": "#a855f7",
    "label": {
      "cz": "XP Sérum III",
      "en": "XP Serum III",
      "sk": "XP Sérum III"
    },
    "icon": "💉",
    "category": "relic",
    "rarity": "legendary",
    "description": {
      "cz": "Maximální genetický stimulant, který okamžitě přidá 700 XP.",
      "en": "Ultimate genetic stimulant that instantly adds 700 XP.",
      "sk": "Maximálny genetický stimulant, ktorý okamžite přidá 700 XP."
    },
    "dropWeight": 1,
    "dropMin": 1,
    "dropMax": 1,
    "stats": {
      "xp": 700
    },
    "hasCustomIcon": true,
    "customIcon": "xp_serum_3"
  },
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
};