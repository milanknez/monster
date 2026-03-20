export interface Monster {
  id: string;
  name: string;
  rarity: string;
  level: number;
  type: string;
  image: string;
  description: string;
  abilities?: { name: string; description: string; icon?: string }[];
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