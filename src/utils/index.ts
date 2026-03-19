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