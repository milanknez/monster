import { Localized } from '../types';

export interface DungeonWaveConfig {
  waveIndex: number;
  enemyName: Localized<string> | string;
  enemyImage: string;
  enemyType: string;
  enemyCount: number;
  baseHp: number;
  level: number;
  shield?: number;
}

export interface BossSpecificDrop {
  resourceId: string;
  chance: number;
  minAmount: number;
  maxAmount: number;
}

export interface DungeonLootConfig {
  specificDrops: BossSpecificDrop[];
  maxSpecificDropsCount?: number; // Kolik z definovaných specifických itemů může maximálně padnout (např. 2)
  randomDropsCount: number;
  rarityDistribution: {
    legendary: number;
    epic: number;
    rare: number;
  };
  waveDrops?: Record<number, { chance: number; rarity: string }>;
  bossDrops?: { chance?: number; rarityDistribution?: Record<string, number> };
}

export interface DungeonConfig {
  id: string;
  name: Localized<string>;
  description: Localized<string>;
  backgroundImage: string;
  recommendedLevel: number;
  waves: DungeonWaveConfig[];
  lootTable: DungeonLootConfig;
}

export const dungeonsDB: DungeonConfig[] = [
  {
    "id": "dark_cave",
    "name": {
      "cz": "Kamenná jeskyně",
      "en": "Stone Cave",
      "sk": "Kamenná jaskyňa"
    },
    "description": {
      "cz": "Hluboká, kamenná jeskyně obývaná stínovými tvory. Na konci spí pradávný boss.",
      "en": "A deep stone cave inhabited by shadow creatures. An ancient boss sleeps at the end.",
      "sk": "Hlboká, kamenná jaskyňa obývaná tieňovými tvormi. Na konci spí prastarý boss."
    },
    "backgroundImage": "/dark_cave_bg.png",
    "recommendedLevel": 15,
    "waves": [
      {
        "waveIndex": 1,
        "enemyName": {
          "cz": "Stínový Netopýr",
          "en": "Umbrabat",
          "sk": "Tieňový Netopier"
        },
        "enemyImage": "/dungeon/wave1.png",
        "enemyType": "electric",
        "enemyCount": 3,
        "baseHp": 14000,
        "level": 14
      },
      {
        "waveIndex": 2,
        "enemyName": {
          "cz": "Jeskynní Chrlič",
          "en": "Cave Gargoyle",
          "sk": "Jaskynný Chrlič"
        },
        "enemyImage": "/dungeon/wave2.png",
        "enemyType": "nature",
        "enemyCount": 2,
        "baseHp": 28000,
        "level": 18,
        "shield": 6000
      },
      {
        "waveIndex": 3,
        "enemyName": {
          "cz": "Rypák Hlubin",
          "en": "Snout of the Depths",
          "sk": "Rypák Hlbín"
        },
        "enemyImage": "/dungeon/wave3.png",
        "enemyType": "nature",
        "enemyCount": 1,
        "baseHp": 75000,
        "level": 25,
        "shield": 18000
      }
    ],
    "lootTable": {
      "specificDrops": [
        {
          "resourceId": "sn01",
          "chance": 0.85,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "sn02",
          "chance": 0.6,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "sn03",
          "chance": 0.25,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "sn04",
          "chance": 1,
          "minAmount": 1,
          "maxAmount": 1
        }
      ],
      "maxSpecificDropsCount": 2,
      "randomDropsCount": 2,
      "rarityDistribution": {
        "legendary": 0.15,
        "epic": 0.4,
        "rare": 0.4
      }
    }
  },
  {
    "id": "lava_lair",
    "name": {
      "cz": "Sopečné doupě",
      "en": "Volcanic Lair",
      "sk": "Sopečné doupä"
    },
    "description": {
      "cz": "Žhavý sopečný komplex plný ohnivých elementálů. Vzduch se zde tetelí žárem.",
      "en": "A searing volcanic complex full of fire elementals. The air shimmers with heat.",
      "sk": "Žeravý sopečný komplex plný ohnivých elementálov. Vzduch sa tu chveje horúčavou."
    },
    "backgroundImage": "/lava_lair_bg.png",
    "recommendedLevel": 25,
    "waves": [
      {
        "waveIndex": 1,
        "enemyName": {
          "cz": "Žhavý Valoun",
          "en": "Emberstone Stalker",
          "sk": "Žeravý Valún"
        },
        "enemyImage": "/dungeon/lava_wave1.png",
        "enemyType": "fire",
        "enemyCount": 3,
        "baseHp": 28000,
        "level": 22
      },
      {
        "waveIndex": 2,
        "enemyName": {
          "cz": "Lávový Plivač",
          "en": "Magma Basilisk",
          "sk": "Lávový Pľuvač"
        },
        "enemyImage": "/dungeon/lava_wave2.png",
        "enemyType": "fire",
        "enemyCount": 2,
        "baseHp": 48000,
        "level": 26,
        "shield": 14000
      },
      {
        "waveIndex": 3,
        "enemyName": {
          "cz": "Karmadon, Král Lávových Hlubin",
          "en": "Karmadon, King of the Lava Depths",
          "sk": "Karmadon, Kráľ Lávových Hlbín"
        },
        "enemyImage": "/dungeon/lava_wave3.png",
        "enemyType": "fire",
        "enemyCount": 1,
        "baseHp": 140000,
        "level": 32,
        "shield": 35000
      }
    ],
    "lootTable": {
      "specificDrops": [
        {
          "resourceId": "ka01",
          "chance": 0.85,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "ka02",
          "chance": 0.6,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "ka03",
          "chance": 0.25,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "ka04",
          "chance": 1,
          "minAmount": 1,
          "maxAmount": 1
        }
      ],
      "maxSpecificDropsCount": 2,
      "randomDropsCount": 2,
      "rarityDistribution": {
        "legendary": 0.2,
        "epic": 0.4,
        "rare": 0.4
      }
    }
  },
  {
    "id": "frost_temple",
    "name": {
      "cz": "Katakomby",
      "en": "Catacombs",
      "sk": "Katakomby"
    },
    "description": {
      "cz": "Temné podzemní katakomby pod městem. Cestu hlídají prastaří strážci.",
      "en": "Dark underground catacombs beneath the city. Ancient sentinels guard the way.",
      "sk": "Temné podzemné katakomby pod mestom. Cestu strážia prastarí strážcovia."
    },
    "backgroundImage": "/frost_temple_bg.png",
    "recommendedLevel": 35,
    "waves": [
      {
        "waveIndex": 1,
        "enemyName": {
          "cz": "Katakombový Kostlivec",
          "en": "Catacomb Skeleton",
          "sk": "Katakombový Kostlivec"
        },
        "enemyImage": "/dungeon/catacomb_wave1.png",
        "enemyType": "dark",
        "enemyCount": 3,
        "baseHp": 40000,
        "level": 32
      },
      {
        "waveIndex": 2,
        "enemyName": {
          "cz": "Hrobový Přízrak",
          "en": "Crypt Wraith",
          "sk": "Hrobový Prízrak"
        },
        "enemyImage": "/dungeon/catacomb_wave2.png",
        "enemyType": "dark",
        "enemyCount": 2,
        "baseHp": 70000,
        "level": 38,
        "shield": 20000
      },
      {
        "waveIndex": 3,
        "enemyName": {
          "cz": "Prastarý Lich",
          "en": "Ancient Lich",
          "sk": "Prastarý Lich"
        },
        "enemyImage": "/dungeon/catacomb_wave3.png",
        "enemyType": "dark",
        "enemyCount": 1,
        "baseHp": 210000,
        "level": 45,
        "shield": 50000
      }
    ],
    "lootTable": {
      "specificDrops": [
        {
          "resourceId": "li01",
          "chance": 0.85,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "li02",
          "chance": 0.6,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "li03",
          "chance": 0.25,
          "minAmount": 1,
          "maxAmount": 1
        },
        {
          "resourceId": "li04",
          "chance": 1,
          "minAmount": 1,
          "maxAmount": 1
        }
      ],
      "maxSpecificDropsCount": 2,
      "randomDropsCount": 3,
      "rarityDistribution": {
        "legendary": 0.25,
        "epic": 0.45,
        "rare": 0.3
      }
    }
  }
];
