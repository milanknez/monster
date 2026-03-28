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
  items?: (string | null)[]; // Max 3 items (relics)
}

export interface Boost {
  type: 'hp_regen' | 'xp_boost';
  multiplier: number;
  expiresAt: number;
}

export type SpawnRarity = 'common' | 'rare' | 'epic' | 'legendary'

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
  | 'loot_1' | 'loot_2' | 'loot_3' | 'loot_4' | 'loot_5' | 'loot_6' | 'loot_7' | 'loot_8'
  | 'loot_9' | 'loot_10' | 'loot_11' | 'loot_12' | 'loot_13' | 'loot_14' | 'loot_15' | 'loot_16'
  | 'item_1' | 'item_2' | 'item_3' | 'item_4' | 'item_5' | 'item_6' | 'item_7' | 'item_8'
  | 'item_9' | 'item_10' | 'item_11' | 'item_12' | 'item_13' | 'item_14' | 'item_15' | 'item_16';

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

export type ResourceCategory = 'material' | 'consumable' | 'gem' | 'relic' | 'loot_item';
export type ItemRarity = 'Běžná' | 'Vzácná' | 'Epická' | 'Legendární';

export interface ResourceConfig {
  color: string;
  label: string;
  icon: string;
  hasCustomIcon?: boolean;
  description?: string;
  stats?: { hp?: number; atk?: number; def?: number; energy?: number };
  statsType?: 'flat' | 'perc';
  category?: ResourceCategory;
  rarity?: ItemRarity;
  recipe?: { type: string; count: number }[];
  recipeAmount?: number;
  dropWeight?: number; // Relative weight in its rarity pool (defaults to 10 if missing)
  dropMin?: number;
  dropMax?: number;
  customIcon?: string;
  specialEffect?: 'none' | 'xp_boost' | 'hp_regen';
  effectDuration?: number; // duration in minutes
}

export type Cooldowns = Record<string, number>;

export interface NearbyPlayer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen: number;
  level: number;
  avatarSeed?: string;
  avatarStyle?: string;
}