import { Localized } from '../types';

export interface DungeonWaveConfig {
  waveIndex: number;
  enemyRarityPool: 'rare' | 'epic' | 'legendary';
  enemyCount: number;
  cloneSameMonster: boolean;
  baseHp: number;
  level: number;
  shield?: number;
}

export interface DungeonConfig {
  id: string;
  name: Localized<string>;
  description: Localized<string>;
  backgroundImage: string;
  recommendedLevel: number;
  waves: DungeonWaveConfig[];
  lootTable: {
    waveDrops: {
      [waveIndex: number]: {
        chance: number;
        rarity: 'common' | 'rare' | 'epic' | 'legendary';
      };
    };
    bossDrops: {
      chance: number;
      rarityDistribution: {
        legendary: number;
        epic: number;
        rare: number;
      };
    };
  };
}

export const dungeonsDB: DungeonConfig[] = [
  {
    id: 'dark_cave',
    name: { cz: 'Temná jeskyně', en: 'Dark Cave', sk: 'Temná jaskyňa' },
    description: { 
      cz: 'Hluboká, kamenná jeskyně obývaná stínovými tvory. Na konci spí pradávný boss.', 
      en: 'A deep stone cave inhabited by shadow creatures. An ancient boss sleeps at the end.',
      sk: 'Hlboká, kamenná jaskyňa obývaná tieňovými tvormi. Na konci spí prastarý boss.'
    },
    backgroundImage: '/dark_cave_bg.png',
    recommendedLevel: 15,
    waves: [
      {
        waveIndex: 1,
        enemyRarityPool: 'rare',
        enemyCount: 2,
        cloneSameMonster: true,
        baseHp: 2500,
        level: 12
      },
      {
        waveIndex: 2,
        enemyRarityPool: 'epic',
        enemyCount: 2,
        cloneSameMonster: true,
        baseHp: 4000,
        level: 18,
        shield: 1000
      },
      {
        waveIndex: 3,
        enemyRarityPool: 'legendary',
        enemyCount: 1,
        cloneSameMonster: false,
        baseHp: 10000,
        level: 25,
        shield: 2500
      }
    ],
    lootTable: {
      waveDrops: {
        1: { chance: 0.10, rarity: 'common' },
        2: { chance: 0.15, rarity: 'rare' }
      },
      bossDrops: {
        chance: 1.0,
        rarityDistribution: {
          legendary: 0.55,
          epic: 0.30,
          rare: 0.15
        }
      }
    }
  },
  {
    id: 'lava_lair',
    name: { cz: 'Plamenné doupě', en: 'Lava Lair', sk: 'Plamenný brloh' },
    description: { 
      cz: 'Žhavý sopečný komplex plný ohnivých elementálů. Vzduch se zde tetelí žárem.', 
      en: 'A searing volcanic complex full of fire elementals. The air shimmers with heat.',
      sk: 'Žeravý sopečný komplex plný ohnivých elementálov. Vzduch sa tu chveje horúčavou.'
    },
    backgroundImage: '/lava_lair_bg.png',
    recommendedLevel: 25,
    waves: [
      {
        waveIndex: 1,
        enemyRarityPool: 'rare',
        enemyCount: 2,
        cloneSameMonster: true,
        baseHp: 3800,
        level: 22
      },
      {
        waveIndex: 2,
        enemyRarityPool: 'epic',
        enemyCount: 2,
        cloneSameMonster: true,
        baseHp: 5800,
        level: 26,
        shield: 1800
      },
      {
        waveIndex: 3,
        enemyRarityPool: 'legendary',
        enemyCount: 1,
        cloneSameMonster: false,
        baseHp: 14500,
        level: 32,
        shield: 3500
      }
    ],
    lootTable: {
      waveDrops: {
        1: { chance: 0.15, rarity: 'rare' },
        2: { chance: 0.20, rarity: 'epic' }
      },
      bossDrops: {
        chance: 1.0,
        rarityDistribution: {
          legendary: 0.65,
          epic: 0.25,
          rare: 0.10
        }
      }
    }
  },
  {
    id: 'frost_temple',
    name: { cz: 'Mrazivý chrám', en: 'Frost Temple', sk: 'Mrazivý chrám' },
    description: { 
      cz: 'Zapomenutý ledový chrám v horách věčného sněhu. Cestu hlídají mraziví strážci.', 
      en: 'A forgotten ice temple in the mountains of eternal snow. Frost sentinels guard the way.',
      sk: 'Zabudnutý ľadový chrám v horách večného snehu. Cestu strážia mraziví strážcovia.'
    },
    backgroundImage: '/frost_temple_bg.png',
    recommendedLevel: 35,
    waves: [
      {
        waveIndex: 1,
        enemyRarityPool: 'rare',
        enemyCount: 2,
        cloneSameMonster: true,
        baseHp: 5000,
        level: 32
      },
      {
        waveIndex: 2,
        enemyRarityPool: 'epic',
        enemyCount: 2,
        cloneSameMonster: true,
        baseHp: 7500,
        level: 38,
        shield: 2500
      },
      {
        waveIndex: 3,
        enemyRarityPool: 'legendary',
        enemyCount: 1,
        cloneSameMonster: false,
        baseHp: 20000,
        level: 45,
        shield: 5000
      }
    ],
    lootTable: {
      waveDrops: {
        1: { chance: 0.20, rarity: 'rare' },
        2: { chance: 0.25, rarity: 'epic' }
      },
      bossDrops: {
        chance: 1.0,
        rarityDistribution: {
          legendary: 0.75,
          epic: 0.20,
          rare: 0.05
        }
      }
    }
  }
];
