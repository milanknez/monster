import React from 'react';
import { cn, getLoc } from '../../../utils';
import type { DungeonPlayer } from './types';

interface DungeonThreatListProps {
  players: DungeonPlayer[];
  bossTargetIdx: number;
}

export const DungeonThreatList: React.FC<DungeonThreatListProps> = ({ players, bossTargetIdx }) => {
  const maxGroupHP = Math.max(...players.map(p => p.maxHP || p.monster?.stats?.hp || 0), 1);

  return (
    <div className="absolute top-1/2 right-4 z-20 bg-slate-950/80 border border-white/5 p-2 rounded-xl text-[8px] font-mono space-y-1 backdrop-blur-md max-w-[145px]">
      <div className="text-[9px] font-black uppercase text-slate-400 border-b border-white/5 pb-0.5">Statistiky:</div>
      {players.map((p, idx) => {
        const hasHealAbility = p.monster?.abilities?.some((a: any) => a.type === 'heal' || a.type === 'regen');
        const playerHP = p.maxHP || p.monster?.stats?.hp || 0;
        const isTank = !hasHealAbility && playerHP === maxGroupHP && playerHP > 0;
        const roleIcon = hasHealAbility ? '💚' : isTank ? '🛡️' : '⚔️';

        return (
          <div key={p.index} className="flex justify-between gap-2 items-center">
            <span className={cn("truncate max-w-[90px] flex items-center gap-1", idx === bossTargetIdx && !p.isDead && "text-red-400 font-bold")}>
              <span className="text-[9px]">{roleIcon}</span>
              {idx === bossTargetIdx && !p.isDead ? '🎯 ' : ''}{idx === 0 ? 'VY' : (p.playerName || getLoc(p.monster.name, 'cz'))}
            </span>
            <span className="text-amber-400">{Math.round(p.threat)}</span>
          </div>
        );
      })}
    </div>
  );
};
