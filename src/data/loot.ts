import { ResourceType, LootTableEntry } from '../types';

export const LOOT_CONFIG = {

  battle_win: [
    { type: 'crystal', weight: 40, min: 1, max: 2 },
    { type: 'herb', weight: 30, min: 1, max: 2 },
    { type: 'mineral', weight: 20, min: 1, max: 2 },
    { type: 'energy', weight: 10, min: 1, max: 1 },
  ] as LootTableEntry[],
  
  // Potential for boss loot or specific rarity loot
  rare_bonus: [
    { type: 'magic_crystal', weight: 10, min: 1, max: 1 },
    { type: 'super_mineral', weight: 5, min: 1, max: 1 },
  ] as LootTableEntry[]
};
