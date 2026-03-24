export interface Monster {
  id: string;
  name: string;
  rarity: string;
  level: number;
  type: string;
  image: string;
  description: string;
  abilities?: {
    name: string;
    description: string;
    icon?: string;
    type?: 'attack' | 'defense' | 'buff' | 'heal' | 'extra';
    chance?: number;
    value?: number;
  }[];
  caughtAt?: number;

  // Base stats from data
  stats?: {
    hp: number;
    attack: number;
    defense: number;
  };
  
  currentHP?: number;
  totalXP?: number;
  
  // Progression
  evolvesInto?: string[]; 
  evolutionRequirements?: { type: ResourceType, count: number }[];
  
  // Customization
  gems?: (string | null)[]; // Max 3 gems, any type
}

export interface Boost {
  type: 'hp_regen' | 'xp_boost';
  multiplier: number;
  expiresAt: number;
}

export type SpawnRarity = 'common' | 'rare' | 'epic'

export interface SpawnPoint {
  id: string
  lat: number
  lng: number
  rarity: SpawnRarity
  monsterId: string
  level: number
  caught: boolean
}

export type ResourceType = 
  | 'crystal' | 'herb' | 'energy' | 'mineral' 
  | 'magic_crystal' | 'super_mineral' 
  | 'potion' 
  | 'xp_booster' | 'hp_potion' | 'energy_drink'
  | 'gem_red_1' | 'gem_red_2' | 'gem_red_3' | 'gem_red_4' | 'gem_red_5' | 'gem_red_6'
  | 'gem_green_1' | 'gem_green_2' | 'gem_green_3' | 'gem_green_4' | 'gem_green_5' | 'gem_green_6'
  | 'gem_white_1' | 'gem_white_2' | 'gem_white_3' | 'gem_white_4' | 'gem_white_5' | 'gem_white_6'

export interface InventoryItem {
  type: ResourceType;
  count: number;
}

export interface ResourceSpawn {
  id: string;
  lat: number;
  lng: number;
  type: ResourceType;
  amount: number;
  isCollected: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  requirements: { type: ResourceType, count: number }[];
  result: { type: 'boost' | 'item' | 'resource', id: string, amount: number };
}

export interface LootTableEntry {
  type: ResourceType;
  weight: number;
  min: number;
  max: number;
}

export interface ResourceConfig {
  color: string;
  label: string;
  icon: string;
  hasCustomIcon?: boolean;
}