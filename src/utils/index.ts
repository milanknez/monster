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
  'Default': { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' }
}

export const calculateLevel = (xp: number) => {
  if (xp <= 0) return 1;
  // Solving 125n^2 + 275n - xp = 0 for n
  // n is how many levels above 1 we have
  const n = (-275 + Math.sqrt(275 * 275 + 4 * 125 * xp)) / (2 * 125);
  return Math.floor(n) + 1;
};

export const getTotalXPForLevel = (lvl: number) => {
  if (lvl <= 1) return 0;
  const n = lvl - 1;
  return 125 * n * n + 275 * n;
};

export const getMonsterMinLevel = (rarity: string) => {
  const r = (rarity || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (r.indexOf('legend') !== -1) return 11;
  if (r.indexOf('epic') !== -1 || r.indexOf('epick') !== -1) return 7;
  if (r.indexOf('vzacn') !== -1 || r.indexOf('rare') !== -1) return 4;
  return 1;
};

import { RESOURCE_CONFIG } from '../data/resources';

export const getMonsterMaxHP = (monster: any) => {
  if (!monster || !monster.stats) return 100;
  const base = monster.stats.hp || 100;
  const minLvl = getMonsterMinLevel(monster.rarity || '');
  const levelBonus = Math.floor(base * Math.max(0, monster.level - minLvl) * 0.1);
  
  const getEqBonus = (slots: (string | null)[]) => {
    return (slots || []).reduce((acc: number, id: string | null) => {
      if (id) {
        const cfg = RESOURCE_CONFIG[id] as any;
        if (cfg?.stats?.hp) {
          return acc + (cfg.statsType === 'perc' ? Math.floor(base * (cfg.stats.hp / 100)) : cfg.stats.hp);
        }
      }
      return acc;
    }, 0);
  };

  return base + levelBonus + getEqBonus(monster.gems) + getEqBonus(monster.items || []);
};

export const getMonsterAttack = (monster: any) => {
  if (!monster || !monster.stats) return 10;
  const base = monster.stats.attack || 10;
  const minLvl = getMonsterMinLevel(monster.rarity || '');
  const levelBonus = Math.floor(base * (monster.level - minLvl) * 0.1);
  
  const getEqBonus = (slots: (string | null)[]) => {
    return (slots || []).reduce((acc: number, id: string | null) => {
      if (id) {
        const cfg = RESOURCE_CONFIG[id] as any;
        if (cfg?.stats?.atk) {
          return acc + (cfg.statsType === 'perc' ? Math.floor(base * (cfg.stats.atk / 100)) : cfg.stats.atk);
        }
      }
      return acc;
    }, 0);
  };

  return base + levelBonus + getEqBonus(monster.gems) + getEqBonus(monster.items || []);
};

export const formatLocation = (lat?: number, lng?: number) => {
  if (lat === undefined || lng === undefined) return 'Neznámý Sektor';
  // Simple sector logic based on coordinates
  const sectorX = Math.floor(Math.abs(lat * 100) % 26);
  const sectorY = Math.floor(Math.abs(lng * 100) % 26);
  const letter = String.fromCharCode(65 + sectorX);
  return `SEKTOR ${letter}-${sectorY}`;
};

export const TYPE_MATCHUP: Record<string, { strong: string, weak: string, effect: string }> = {
  'Ohnivá': { strong: 'Přírodní', weak: 'Vodní', effect: 'BURN' },
  'Přírodní': { strong: 'Vodní', weak: 'Ohnivá', effect: 'REGEN' },
  'Vodní': { strong: 'Ohnivá', weak: 'Elektrická', effect: 'SLOW' },
  'Elektrická': { strong: 'Přírodní', weak: 'Ohnivá', effect: 'PARALYZE' }
};

export const ADVANTAGE_MULT = 1.3;
export const WEAKNESS_MULT = 0.7;

export const getPlayerRank = (caughtCount: number) => {
  if (caughtCount === 0) return 'Snílek u krbu';
  if (caughtCount <= 10) return 'Certifikovaný krysobijce';
  if (caughtCount <= 25) return 'Potulný žoldák';
  if (caughtCount <= 45) return 'Vědmák z paneláku';
  if (caughtCount <= 60) return 'Drakobijce na plný úvazek';
  if (caughtCount < 70) return 'Legendární přemožitel';
  return 'Strážce celého Bestiáře (100 %)';
};