import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TYPE_COLORS: Record<string, { text: string, bg: string, border: string }> = {
  'Ohnivá': { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  'Vodní': { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  'Přírodní': { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  'Elektrická': { text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  'Temná': { text: 'text-purple-600', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
  'Světelná': { text: 'text-cyan-400', bg: 'bg-cyan-100/10', border: 'border-cyan-400/30' },
  'Default': { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' }
}

export const calculateLevel = (xp: number) => {
  if (xp <= 0) return 1;
  // Solving 125n^2 + 875n - xp = 0 for n
  // n is how many levels above 1 we have
  const n = (-875 + Math.sqrt(875 * 875 + 4 * 125 * xp)) / (2 * 125);
  return Math.floor(n) + 1;
};

export const getTotalXPForLevel = (lvl: number) => {
  if (lvl <= 1) return 0;
  const n = lvl - 1;
  return 125 * n * n + 875 * n;
};

export const GEM_BONUSES: Record<string, { value: number, isPerc?: boolean }> = {
  gem_red_1: { value: 6 },
  gem_red_2: { value: 12 },
  gem_red_3: { value: 20 },
  gem_red_4: { value: 5, isPerc: true },
  gem_red_5: { value: 10, isPerc: true },
  gem_red_6: { value: 15, isPerc: true },
  
  gem_green_1: { value: 15 },
  gem_green_2: { value: 30 },
  gem_green_3: { value: 50 },
  gem_green_4: { value: 5, isPerc: true },
  gem_green_5: { value: 10, isPerc: true },
  gem_green_6: { value: 15, isPerc: true },
  
  gem_white_1: { value: 4 },
  gem_white_2: { value: 8 },
  gem_white_3: { value: 15 },
  gem_white_4: { value: 5, isPerc: true },
  gem_white_5: { value: 10, isPerc: true },
  gem_white_6: { value: 15, isPerc: true },
};

export const getMonsterMaxHP = (monster: any) => {
  if (!monster || !monster.stats) return 100;
  const base = monster.stats.hp || 100;
  const levelBonus = Math.floor(base * (monster.level - 1) * 0.1);
  const gemBonus = (monster.gems || []).reduce((acc: number, gid: string) => {
    if (gid?.startsWith('gem_green')) {
      const g = GEM_BONUSES[gid];
      if (g) return acc + (g.isPerc ? Math.floor(base * (g.value / 100)) : g.value);
    }
    return acc;
  }, 0);
  return base + levelBonus + gemBonus;
};