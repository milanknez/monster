import { Recipe } from '../types';

export const recipes: Recipe[] = [
  {
    id: 'xp_booster',
    name: 'XP Elixír',
    description: 'Zvýší zisk XP na 30 minut (násobitel 2x).',
    requirements: [
      { type: 'crystal', count: 5 },
      { type: 'herb', count: 2 },
    ],
    result: { type: 'item', id: 'xp_booster', amount: 1 }
  },
  {
    id: 'hp_potion',
    name: 'Lékárnička',
    description: 'Okamžitě obnoví 50 HP a zvýší regeneraci na 15 minut.',
    requirements: [
      { type: 'herb', count: 5 },
      { type: 'energy', count: 1 },
    ],
    result: { type: 'item', id: 'hp_potion', amount: 1 }
  },
  {
    id: 'energy_drink',
    name: 'Energy Drink',
    description: 'Zvýší maximální energii a dočasně sníží únavu při pohybu.',
    requirements: [
      { type: 'energy', count: 4 },
      { type: 'mineral', count: 2 },
    ],
    result: { type: 'item', id: 'energy_drink', amount: 1 }
  }
];
