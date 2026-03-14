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