import { ResourceConfig } from '../types';

export const RESOURCE_CONFIG: Record<string, ResourceConfig> = {
  "crystal": {
    "color": "#0db9f2",
    "label": "Krystal",
    "icon": "💎",
    "category": "material",
    "rarity": "Běžná",
    "description": "Běžný drahokam sloužící k vylepšování základních atributů.",
    "dropWeight": 50,
    "dropMin": 2,
    "dropMax": 5
  },
  "herb": {
    "color": "#10b981",
    "label": "Bylinka",
    "icon": "🌿",
    "category": "material",
    "rarity": "Běžná",
    "description": "Přírodní surovina pro vaření lektvarů.",
    "dropWeight": 50,
    "dropMin": 2,
    "dropMax": 5
  },
  "energy": {
    "color": "#f59e0b",
    "label": "Energie",
    "icon": "⚡",
    "category": "material",
    "rarity": "Běžná",
    "description": "Kondenzovaná elektrická energie.",
    "dropWeight": 50,
    "dropMin": 2,
    "dropMax": 5
  },
  "mineral": {
    "color": "#64748b",
    "label": "Minerál",
    "icon": "🪨",
    "category": "material",
    "rarity": "Běžná",
    "description": "Tvrdý stavební kámen.",
    "dropWeight": 50,
    "dropMin": 2,
    "dropMax": 5
  },
  "magic_crystal": {
    "color": "#a855f7",
    "label": "Magický Krystal",
    "icon": "🔮",
    "category": "material",
    "rarity": "Vzácná",
    "description": "Vzácný magický drahokam.",
    "dropWeight": 50,
    "dropMin": 2,
    "dropMax": 5
  },
  "super_mineral": {
    "color": "#ea580c",
    "label": "Vzácný Minerál",
    "icon": "🌋",
    "category": "material",
    "rarity": "Vzácná",
    "description": "Ohněm kovaný kámen.",
    "dropWeight": 50,
    "dropMin": 2,
    "dropMax": 5
  },
  "monster_egg": {
    "color": "#a855f7",
    "label": "Tajemné vajíčko",
    "icon": "🥚",
    "category": "consumable",
    "rarity": "Legendární",
    "description": "Vylíhne se na vzácnou příšerku.",
    "dropWeight": 0,
    "dropMin": 1,
    "dropMax": 2
  },
  "xp_booster": {
    "color": "#ec4899",
    "label": "XP Elixír",
    "icon": "🧪",
    "category": "consumable",
    "rarity": "Vzácná",
    "description": "Dvojitý zisk XP na 15 minut.",
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
    "label": "HP Potion",
    "icon": "🧪",
    "category": "consumable",
    "rarity": "Běžná",
    "description": "Okamžitě vyléčí 50 HP.",
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
  "gem_red_1": {
    "color": "#ef4444",
    "label": "Rudý Jaspis 1",
    "icon": "🔴",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_1",
    "category": "gem",
    "rarity": "Běžná",
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
    "description": "Zvyšuje útok o 6 bodů.",
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_1": {
    "color": "#10b981",
    "label": "Zelený Nefrit 1",
    "icon": "🟢",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_1",
    "category": "gem",
    "rarity": "Běžná",
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
    "description": "Zvyšuje zdraví o 15 bodů.",
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_1": {
    "color": "#e2e8f0",
    "label": "Bílý Křemen 1",
    "icon": "⚪",
    "hasCustomIcon": true,
    "customIcon": "gem_white_1",
    "category": "gem",
    "rarity": "Běžná",
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
    "description": "Zvyšuje obranu o 4 body.",
    "dropWeight": 5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_2": {
    "color": "#ef4444",
    "label": "Rudý Jaspis 2",
    "icon": "🔴",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_1",
    "category": "gem",
    "rarity": "Běžná",
    "stats": {
      "atk": 12
    },
    "description": "Zvyšuje útok o 12 bodů.",
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
    "label": "Zelený Nefrit 2",
    "icon": "🟢",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_1",
    "category": "gem",
    "rarity": "Běžná",
    "stats": {
      "hp": 30
    },
    "description": "Zvyšuje zdraví o 30 bodů.",
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
    "label": "Bílý Křemen 2",
    "icon": "⚪",
    "hasCustomIcon": true,
    "customIcon": "gem_white_1",
    "category": "gem",
    "rarity": "Běžná",
    "stats": {
      "def": 8
    },
    "description": "Zvyšuje obranu o 8 bodů.",
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
    "label": "Rudý Jaspis 3",
    "icon": "🔴",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_2",
    "category": "gem",
    "rarity": "Vzácná",
    "stats": {
      "atk": 20
    },
    "description": "Zvyšuje útok o 20 bodů.",
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_3": {
    "color": "#10b981",
    "label": "Zelený Nefrit 3",
    "icon": "🟢",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_2",
    "category": "gem",
    "rarity": "Vzácná",
    "stats": {
      "hp": 50
    },
    "description": "Zvyšuje zdraví o 50 bodů.",
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_3": {
    "color": "#e2e8f0",
    "label": "Bílý Křemen 3",
    "icon": "⚪",
    "hasCustomIcon": true,
    "customIcon": "gem_white_2",
    "category": "gem",
    "rarity": "Vzácná",
    "stats": {
      "def": 15
    },
    "description": "Zvyšuje obranu o 15 bodů.",
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_4": {
    "color": "#ef4444",
    "label": "Rudý Jaspis 4",
    "icon": "💠",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_2",
    "category": "gem",
    "rarity": "Vzácná",
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
    "description": "Zvyšuje útok o 5 %.",
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_4": {
    "color": "#10b981",
    "label": "Zelený Nefrit 4",
    "icon": "🌿",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_2",
    "category": "gem",
    "rarity": "Vzácná",
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
    "description": "Zvyšuje zdraví o 5 %.",
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_4": {
    "color": "#e2e8f0",
    "label": "Bílý Křemen 4",
    "icon": "💎",
    "hasCustomIcon": true,
    "customIcon": "gem_white_2",
    "category": "gem",
    "rarity": "Vzácná",
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
    "description": "Zvyšuje obranu o 5 %.",
    "dropWeight": 2,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_5": {
    "color": "#ef4444",
    "label": "Rudý Jaspis 5",
    "icon": "💠",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_3",
    "category": "gem",
    "rarity": "Epická",
    "stats": {
      "atk": 10
    },
    "statsType": "perc",
    "description": "Zvyšuje útok o 10 %.",
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_5": {
    "color": "#10b981",
    "label": "Zelený Nefrit 5",
    "icon": "🌿",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_3",
    "category": "gem",
    "rarity": "Epická",
    "stats": {
      "hp": 10
    },
    "statsType": "perc",
    "description": "Zvyšuje zdraví o 10 %.",
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_5": {
    "color": "#e2e8f0",
    "label": "Bílý Křemen 5",
    "icon": "💎",
    "hasCustomIcon": true,
    "customIcon": "gem_white_3",
    "category": "gem",
    "rarity": "Epická",
    "stats": {
      "def": 10
    },
    "statsType": "perc",
    "description": "Zvyšuje obranu o 10 %.",
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_red_6": {
    "color": "#ef4444",
    "label": "Rudý Jaspis 6",
    "icon": "💠",
    "hasCustomIcon": true,
    "customIcon": "gem_ruby_3",
    "category": "gem",
    "rarity": "Epická",
    "stats": {
      "atk": 15
    },
    "statsType": "perc",
    "description": "Zvyšuje útok o 15 %.",
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_green_6": {
    "color": "#10b981",
    "label": "Zelený Nefrit 6",
    "icon": "🌿",
    "hasCustomIcon": true,
    "customIcon": "gem_emerald_3",
    "category": "gem",
    "rarity": "Epická",
    "stats": {
      "hp": 15
    },
    "statsType": "perc",
    "description": "Zvyšuje zdraví o 15 %.",
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "gem_white_6": {
    "color": "#e2e8f0",
    "label": "Bílý Křemen 6",
    "icon": "💎",
    "hasCustomIcon": true,
    "customIcon": "gem_white_3",
    "category": "gem",
    "rarity": "Epická",
    "stats": {
      "def": 15
    },
    "statsType": "perc",
    "description": "Zvyšuje obranu o 15 %.",
    "dropWeight": 0.5,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_1": {
    "label": "Ostnatý Štít",
    "icon": "🛡️",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 5
    },
    "rarity": "Běžná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+5 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_2": {
    "label": "Démonské Drápy",
    "icon": "💅",
    "stats": {
      "hp": 0,
      "atk": 5,
      "def": 0
    },
    "rarity": "Běžná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+5 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_3": {
    "label": "Rytířská Přilba",
    "icon": "🪖",
    "stats": {
      "hp": 20,
      "atk": 0,
      "def": 3
    },
    "rarity": "Vzácná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+20 HP, +3 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_4": {
    "label": "Lehké Boty",
    "icon": "🥾",
    "stats": {
      "hp": 10,
      "atk": 0,
      "def": 2
    },
    "rarity": "Běžná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+10 HP, +2 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_5": {
    "label": "Hůlka Magů",
    "icon": "🪄",
    "stats": {
      "hp": 0,
      "atk": 8,
      "def": 0
    },
    "rarity": "Vzácná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+8 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_6": {
    "label": "Krystalický Úlomek",
    "icon": "💎",
    "stats": {
      "hp": 0,
      "atk": 5,
      "def": 5
    },
    "rarity": "Vzácná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+5 ATK, +5 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_7": {
    "label": "Ohnivý Rubín",
    "icon": "🔴",
    "stats": {
      "hp": 0,
      "atk": 10,
      "def": 0
    },
    "rarity": "Epická",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+10 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_8": {
    "label": "Vodní Safír",
    "icon": "🔵",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 10
    },
    "rarity": "Epická",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+10 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_9": {
    "label": "Temná Sekera",
    "icon": "🟣",
    "stats": {
      "hp": 50,
      "atk": 0,
      "def": 0
    },
    "rarity": "Epická",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+50 HP).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_10": {
    "label": "Dračí krev",
    "icon": "🛡️",
    "stats": {
      "hp": 100,
      "atk": 0,
      "def": 0
    },
    "rarity": "Legendární",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+100 HP).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_11": {
    "label": "Prastarý Artefakt",
    "icon": "✨",
    "stats": {
      "hp": 150,
      "atk": 50,
      "def": 5
    },
    "rarity": "Legendární",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+150 HP, +50 ATK, +5 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_12": {
    "label": "tesákův luk",
    "icon": "🦷",
    "stats": {
      "hp": 0,
      "atk": 4,
      "def": 0
    },
    "rarity": "Běžná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+4 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_13": {
    "label": "meč skázy",
    "icon": "🔨",
    "stats": {
      "hp": 0,
      "atk": 12,
      "def": -2
    },
    "rarity": "Vzácná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+12 ATK, +-2 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_14": {
    "label": "Magická Truhla",
    "icon": "💍",
    "stats": {
      "hp": 100,
      "atk": 0,
      "def": 0
    },
    "rarity": "Legendární",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+100 HP).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_15": {
    "label": "báby svitek",
    "icon": "🥊",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 6
    },
    "rarity": "Běžná",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+6 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "loot_16": {
    "label": "Asasínská relikvie",
    "icon": "🗡️",
    "stats": {
      "hp": 0,
      "atk": 10,
      "def": 0
    },
    "rarity": "Epická",
    "color": "#94a3b8",
    "hasCustomIcon": true,
    "category": "relic",
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+10 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_1": {
    "label": "zub času",
    "color": "#e2e8f0",
    "icon": "🦷",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 5,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+5 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_2": {
    "label": "Stará kost",
    "color": "#f8fafc",
    "icon": "🦴",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 5
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+5 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_3": {
    "label": "Prasklá lebka",
    "color": "#cbd5e1",
    "icon": "💀",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 15,
      "atk": 0,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+15 HP).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_4": {
    "label": "ocelový řetěz",
    "color": "#94a3b8",
    "icon": "⛓️",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 8
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+8 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_5": {
    "label": "Tajemný přívěšek",
    "color": "#fcd34d",
    "icon": "📿",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 10,
      "atk": 0,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+10 HP).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_6": {
    "label": "Stará mince",
    "color": "#fbbf24",
    "icon": "🪙",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 5,
      "atk": 0,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+5 HP).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_7": {
    "label": "Prázdná ulita",
    "color": "#93c5fd",
    "icon": "🐚",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 12
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+12 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_8": {
    "label": "Ostrý kámen",
    "color": "#64748b",
    "icon": "🪨",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 6,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+6 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_9": {
    "label": "Dřevěný špalek",
    "color": "#78350f",
    "icon": "🪵",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 4,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+4 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_10": {
    "label": "Starý pergamen",
    "color": "#fde68a",
    "icon": "📜",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 8,
      "atk": 0,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+8 HP).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_11": {
    "label": "Dřevěný štít",
    "color": "#92400e",
    "icon": "🛡️",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 10
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+10 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_12": {
    "label": "Malý lektvar",
    "color": "#ef4444",
    "icon": "🧪",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 20,
      "atk": 0,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+20 HP).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_13": {
    "label": "Zrezivělý hřebík",
    "color": "#475569",
    "icon": "📍",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 7,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+7 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_14": {
    "label": "Stará rukavice",
    "color": "#78350f",
    "icon": "🧤",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 0,
      "def": 5
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+5 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_15": {
    "label": "Tupá dýka",
    "color": "#334155",
    "icon": "🗡️",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 0,
      "atk": 10,
      "def": 0
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+10 ATK).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "item_16": {
    "label": "Psí tlapka",
    "color": "#8b4513",
    "icon": "🐾",
    "hasCustomIcon": true,
    "category": "relic",
    "rarity": "Běžná",
    "stats": {
      "hp": 5,
      "atk": 5,
      "def": 5
    },
    "description": "[Relikvie] Trvale vylepší tvé monstrum (+5 HP, +5 ATK, +5 DEF).",
    "dropWeight": 15,
    "dropMin": 1,
    "dropMax": 1
  },
  "mana_potion": {
    "color": "#3b82f6",
    "label": "Mana Potion",
    "icon": "🧪",
    "category": "consumable",
    "rarity": "Běžná",
    "description": "Obnoví 60 bodů many (výdrže).",
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
    "statsType": "flat"
  }
};