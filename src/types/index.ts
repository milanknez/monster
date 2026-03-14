export interface Monster {
  id: string;
  name: string;
  rarity: string;
  level: number;
  type: string;
  image: string;
  description: string;
  abilities?: { name: string; description: string; icon?: string }[];
}