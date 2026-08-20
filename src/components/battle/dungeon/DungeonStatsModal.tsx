import React from 'react';
import { cn, getLoc } from '../../../utils';
import type { DungeonPlayer } from './types';

interface DungeonStatsModalProps {
  battleResult: 'win' | 'lose' | null;
  dungeonTime: number;
  players: DungeonPlayer[];
  totalDamageDealt: number;
  onBack: () => void;
  onRestart: () => void;
  chestOpened: boolean;
  onOpenChest: () => void;
}

export const DungeonStatsModal: React.FC<DungeonStatsModalProps> = ({
  battleResult,
  dungeonTime,
  players,
  totalDamageDealt,
  onBack,
  onRestart,
  chestOpened,
  onOpenChest,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full text-center space-y-5 shadow-2xl relative overflow-hidden">
        {/* Glow Header */}
        <div 
          className={cn(
            "absolute -top-24 inset-x-0 h-48 rounded-full blur-3xl opacity-20 pointer-events-none",
            battleResult === 'win' ? "bg-amber-500" : "bg-red-600"
          )} 
        />

        <div className="relative z-10 space-y-2">
          <div className="text-4xl">{battleResult === 'win' ? '🏆' : '💀'}</div>
          <h2 className={cn("text-xl font-black uppercase tracking-wider", battleResult === 'win' ? "text-amber-400" : "text-red-500")}>
            {battleResult === 'win' ? 'Vítězství v Dungeonu!' : 'Porážka v Dungeonu'}
          </h2>
          <p className="text-[10px] text-slate-400 font-mono">
            {battleResult === 'win' 
              ? 'Vaše skupina vyčistila celý dungeon v čase ' + formatTime(dungeonTime) + '!'
              : 'Monstra vás porazila v čase ' + formatTime(dungeonTime) + '.'}
          </p>
        </div>

        {/* Players Damage / DPS Stats Table */}
        <div className="bg-slate-950/80 rounded-2xl border border-white/5 overflow-hidden text-left relative z-10">
          <div className="grid grid-cols-4 bg-slate-900/60 px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-white/5">
            <span>Hráč</span>
            <span className="text-right">DMG (%)</span>
            <span className="text-right">DPS</span>
            <span className="text-right text-emerald-400">Léčení</span>
          </div>
          <div className="divide-y divide-white/5">
            {players.map((p, idx) => {
              const dmgPct = totalDamageDealt > 0 ? Math.round((p.totalDamage / totalDamageDealt) * 100) : 0;
              const dpsVal = dungeonTime > 0 ? Math.round(p.totalDamage / (dungeonTime / 10)) : 0;
              const displayName = p.playerName || getLoc(p.monster.name, 'cz');
              return (
                <div key={p.index} className="grid grid-cols-4 px-3 py-2 text-[10px] font-bold items-center font-mono">
                  <span className="truncate font-sans pr-1 text-slate-300">
                    #{idx + 1} {displayName}{p.index === 0 && ' (VY)'}
                  </span>
                  <span className="text-right text-purple-300">
                    {p.totalDamage} <span className="text-[8px] text-slate-500">({dmgPct}%)</span>
                  </span>
                  <span className="text-right text-amber-400">
                    {dpsVal}/s
                  </span>
                  <span className={cn("text-right", p.totalHealing > 0 ? "text-emerald-400" : "text-slate-600")}>
                    {p.totalHealing > 0 ? `+${p.totalHealing}` : '0'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="bg-slate-900/40 px-3 py-2 text-[10px] font-bold border-t border-white/5 flex justify-between font-mono">
            <span className="font-sans text-slate-400">Celková skupina:</span>
            <span className="text-white">{totalDamageDealt} DMG</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 relative z-10 pt-2">
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
          >
            Odejít
          </button>
          <button
            onClick={onRestart}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Znovu Bojovat ⚔️
          </button>
        </div>
      </div>
    </div>
  );
};
