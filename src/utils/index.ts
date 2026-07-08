import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import i18n from '../i18n';

export function getLoc(val: any, lng: string = i18n.language): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const l = (lng || 'cz').split('-')[0].toLowerCase();
    const target = l === 'cs' ? 'cz' : l;
    return val[lng] || val[target] || val['cz'] || val['en'] || Object.values(val)[0] || '';
  }
  return String(val);
}

import { Flame, Droplets, Leaf, Zap, Moon, Sun, Shield, Sword, Heart, Activity, Info, Sparkles, Target, Star, Skull, RefreshCw, Plus, Package, Clock, FlaskConical, LayoutGrid, ChevronRight, ArrowLeft, Bolt, Box } from 'lucide-react';

export const TYPE_COLORS: Record<string, { text: string, bg: string, border: string }> = {
  'fire': { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  'water': { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  'nature': { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  'electric': { text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  'Default': { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' }
}

export const TYPE_ICONS: Record<string, any> = {
  'fire': Flame,
  'water': Droplets,
  'nature': Leaf,
  'electric': Zap
}

export const TYPE_MAP: Record<string, string> = {
  'Ohnivá': 'fire',
  'Vodní': 'water',
  'Přírodní': 'nature',
  'Elektrická': 'electric',
  'fire': 'fire',
  'water': 'water',
  'nature': 'nature',
  'electric': 'electric'
}

export const RARITY_MAP: Record<string, string> = {
  'Běžná': 'common',
  'Vzácná': 'rare',
  'Epická': 'epic',
  'Legendární': 'legendary',
  'common': 'common',
  'rare': 'rare',
  'epic': 'epic',
  'legendary': 'legendary'
}

export const RARITY_COLORS: Record<string, string> = {
  'common': 'text-slate-400',
  'rare': 'text-blue-400',
  'epic': 'text-purple-400',
  'legendary': 'text-amber-400'
}

export const RARITY_THEME: Record<string, { text: string, border: string, bg: string, glow: string, card: string, decor: string }> = {
  'common': {
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    bg: 'bg-slate-500',
    glow: 'bg-slate-500',
    card: 'border-white/5 bg-slate-900/40',
    decor: 'border-white/5'
  },
  'rare': {
    text: 'text-blue-400',
    border: 'border-blue-400',
    bg: 'bg-blue-500',
    glow: 'bg-blue-500',
    card: 'border-blue-500/40 bg-blue-500/5 shadow-blue-500/20',
    decor: 'border-blue-500/30'
  },
  'epic': {
    text: 'text-purple-400',
    border: 'border-purple-400',
    bg: 'bg-purple-500',
    glow: 'bg-purple-500',
    card: 'border-purple-500/40 bg-purple-500/5 shadow-purple-500/20',
    decor: 'border-purple-500/30'
  },
  'legendary': {
    text: 'text-amber-400',
    border: 'border-amber-400',
    bg: 'bg-amber-500',
    glow: 'bg-amber-500',
    card: 'border-amber-500/40 bg-amber-500/5 shadow-amber-500/20',
    decor: 'border-amber-500/30'
  }
}

export const getMonsterColors = (type: any) => {
  const t = getLoc(type, 'en').toLowerCase();
  return TYPE_COLORS[t] || TYPE_COLORS[TYPE_MAP[type]] || TYPE_COLORS.Default;
};
export const getMonsterTypeIcon = (type: any) => {
  const t = getLoc(type, 'en').toLowerCase();
  return TYPE_ICONS[t] || TYPE_ICONS[TYPE_MAP[type]];
};
export const getMonsterRarityColor = (rarity: any) => {
  const r = getLoc(rarity, 'en').toLowerCase();
  return RARITY_COLORS[r] || RARITY_COLORS[RARITY_MAP[rarity]] || 'text-white';
};
export const getRarityTheme = (rarity: any) => {
  const r = getLoc(rarity, 'en').toLowerCase();
  return RARITY_THEME[r] || RARITY_THEME[RARITY_MAP[rarity]] || RARITY_THEME['common'];
};

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

export const getMonsterMinLevel = (rarity: any) => {
  const r = getLoc(rarity).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (r.indexOf('legend') !== -1) return 11;
  if (r.indexOf('epic') !== -1 || r.indexOf('epick') !== -1) return 7;
  if (r.indexOf('vzacn') !== -1 || r.indexOf('rare') !== -1) return 4;
  return 1;
};

import { RESOURCE_CONFIG } from '../data/resources';
import { monsterDB } from '../data/monsters';

export const getBaseStats = (monster: any) => {
  if (monster && monster.stats) return monster.stats;
  if (monster && monster.id) {
    const dbData = monsterDB.find((d: any) => String(d.id) === String(monster.id));
    if (dbData && dbData.stats) return dbData.stats;
  }
  return { hp: 100, attack: 10, defense: 10 };
};

export const getMonsterMaxHP = (monster: any) => {
  if (!monster) return 100;
  const stats = getBaseStats(monster);
  const base = stats.hp || 100;
  const levelBonus = Math.floor(base * Math.max(0, (monster.level || 1) - 1) * 0.1);
  
  const getEqBonus = (slots: (string | null)[]) => {
    return (slots || []).reduce((acc: number, id: string | null) => {
      if (id) {
        const cfg = RESOURCE_CONFIG[id] as any;
        if (cfg?.stats?.hp) {
          const currentBase = base + levelBonus;
          return acc + (cfg.statsType === 'perc' ? Math.floor(currentBase * (cfg.stats.hp / 100)) : cfg.stats.hp);
        }
      }
      return acc;
    }, 0);
  };

  return base + levelBonus + getEqBonus(monster.gems || []) + getEqBonus(monster.items || []);
};

export const getMonsterDefense = (monster: any) => {
  if (!monster) return 10;
  const stats = getBaseStats(monster);
  const base = stats.defense || 10;
  const levelBonus = Math.floor(base * Math.max(0, (monster.level || 1) - 1) * 0.1);
  
  const getEqBonus = (slots: (string | null)[]) => {
    return (slots || []).reduce((acc: number, id: string | null) => {
      if (id) {
        const cfg = RESOURCE_CONFIG[id] as any;
        if (cfg?.stats?.def) {
          const currentBase = base + levelBonus;
          return acc + (cfg.statsType === 'perc' ? Math.floor(currentBase * (cfg.stats.def / 100)) : cfg.stats.def);
        }
      }
      return acc;
    }, 0);
  };

  return base + levelBonus + getEqBonus(monster.gems || []) + getEqBonus(monster.items || []);
};

export const getMonsterAttack = (monster: any) => {
  if (!monster) return 10;
  const stats = getBaseStats(monster);
  const base = stats.attack || 10;
  const levelBonus = Math.floor(base * Math.max(0, (monster.level || 1) - 1) * 0.1);
  
  const getEqBonus = (slots: (string | null)[]) => {
    return (slots || []).reduce((acc: number, id: string | null) => {
      if (id) {
        const cfg = RESOURCE_CONFIG[id] as any;
        if (cfg?.stats?.atk) {
          const currentBase = base + levelBonus;
          return acc + (cfg.statsType === 'perc' ? Math.floor(currentBase * (cfg.stats.atk / 100)) : cfg.stats.atk);
        }
      }
      return acc;
    }, 0);
  };

  return base + levelBonus + getEqBonus(monster.gems || []) + getEqBonus(monster.items || []);
};

export const getMonsterPower = (monster: any): number => {
  const hp = getMonsterMaxHP(monster);
  const atk = getMonsterAttack(monster);
  const def = getMonsterDefense(monster);
  return Math.round((hp / 2) + (atk * 8) + (def * 12) + ((monster.level || 1) * 100));
};

export const formatLocation = (lat?: number, lng?: number) => {
  if (lat === undefined || lng === undefined) return i18n.t('common.unknown_sector');
  // Simple sector logic based on coordinates
  const sectorX = Math.floor(Math.abs(lat * 100) % 26);
  const sectorY = Math.floor(Math.abs(lng * 100) % 26);
  const letter = String.fromCharCode(65 + sectorX);
  return `${i18n.t('common.sector')} ${letter}-${sectorY}`;
};

export const TYPE_MATCHUP: Record<string, { strong: string, weak: string, effect: string }> = {
  'Ohnivá': { strong: 'Přírodní', weak: 'Vodní', effect: 'BURN' },
  'Přírodní': { strong: 'Vodní', weak: 'Ohnivá', effect: 'REGEN' },
  'Vodní': { strong: 'Ohnivá', weak: 'Elektrická', effect: 'SLOW' },
  'Elektrická': { strong: 'Přírodní', weak: 'Ohnivá', effect: 'PARALYZE' }
};

export const ADVANTAGE_MULT = 1.3;
export const WEAKNESS_MULT = 0.7;

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  // Kontrola, zda jsou vibrace povoleny v nastavení
  const isEnabled = localStorage.getItem('monster_haptic_enabled') !== 'false';
  if (!isEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;

  switch (type) {
    case 'light':
      navigator.vibrate(15);
      break;
    case 'medium':
      navigator.vibrate(30);
      break;
    case 'heavy':
      navigator.vibrate(60);
      break;
    case 'success':
      navigator.vibrate([20, 50, 20]);
      break;
    case 'warning':
      navigator.vibrate([40, 100, 40]);
      break;
    case 'error':
      navigator.vibrate([60, 120, 60]);
      break;
  }
}

export const getPlayerRank = (caughtCount: number) => {
  if (caughtCount === 0) return i18n.t('ranks.r0');
  if (caughtCount <= 10) return i18n.t('ranks.r1');
  if (caughtCount <= 25) return i18n.t('ranks.r2');
  if (caughtCount <= 45) return i18n.t('ranks.r3');
  if (caughtCount <= 60) return i18n.t('ranks.r4');
  if (caughtCount < 70) return i18n.t('ranks.r5');
  return i18n.t('ranks.r6');
};

export const calculateBoostMultiplier = (activeBoosts: any[], type: 'xp_boost' | 'hp_regen') => {
  const boosts = (activeBoosts || []).filter(b => b.type === type && b.expiresAt > Date.now());
  if (boosts.length === 0) return 1;
  // Sečteme bonusové části (např. 2x a 1.5x => 1 + 1.0 + 0.5 = 2.5x)
  return Math.round(boosts.reduce((acc, b) => acc + (b.multiplier - 1), 1.0) * 10) / 10;
};

/**
 * Returns the image path for a monster, deriving it from the ID as fallback.
 * This is needed because after backup restore the .image field may be missing.
 */
export const getMonsterImage = (monster: { id?: string; image?: string } | null | undefined): string => {
  if (!monster) return '/monsters/001.png';
  if (monster.image) return monster.image;
  if (monster.id) return `/monsters/${monster.id}.png`;
  return '/monsters/001.png';
};