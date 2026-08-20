import type { Monster } from '../../../types';

export interface DungeonPlayer {
  index: number;
  uid?: string;
  playerName?: string;
  monster: Monster;
  currentHP: number;
  maxHP: number;
  energy: number;
  cooldown: number; // 0 to 100
  threat: number;   // Threat points
  dps: number;
  totalDamage: number;
  totalHealing: number;
  isDead: boolean;
  stunTimer: number;    // Dizzy stun
  freezeTimer: number;  // Ice block freeze
  rootTimer: number;    // Rooted
  burnTimer: number;    // Dot burn
}

export interface DungeonEnemy {
  index: number;
  monster: Monster;
  currentHP: number;
  maxHP: number;
  energy: number;
  shield: number;
  shieldMax: number;
  isBoss: boolean;
  isDead: boolean;
}

export interface DamagePopup {
  id: number;
  value: number;
  isCrit: boolean;
  isHeal: boolean;
  isPlayerTarget: boolean;
  targetIndex?: number;
}

export interface FlyingSpell {
  id: number;
  type: 'attack' | 'heal' | 'boss_attack';
  fromIdx: number;
  toIdx: number;
  startX: string;
  startY: string;
  endX: string;
  endY: string;
  element?: string;
}
