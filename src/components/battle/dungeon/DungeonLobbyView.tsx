import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Users, Shield, Lock, Check } from 'lucide-react';
import { cn, getLoc, triggerHaptic } from '../../../utils';
import { updateLobbyPlayerMonster, setPlayerMonsterLock, deleteDungeonLobby, PLAYER_UID } from '../../../lib/firebase';
import type { DungeonConfig } from '../../../data/dungeons';
import type { Monster } from '../../../types';

interface DungeonLobbyViewProps {
  selectedDungeon: DungeonConfig;
  activeLobbyCode: string | null;
  activeLobbyData: any;
  playersList: any[];
  caughtMonsters: Monster[];
  epicMonsters: Monster[];
  partySlots: (Monster | null)[];
  setPartySlots: React.Dispatch<React.SetStateAction<(Monster | null)[]>>;
  lobbyCountdown: number;
  onLeaveLobby: () => void;
  onStartSolo: () => void;
  onStartMultiplayer: () => void;
  lobbyMode: 'solo' | 'multiplayer' | null;
  setLobbyMode: (mode: 'solo' | 'multiplayer' | null) => void;
}

export const DungeonLobbyView: React.FC<DungeonLobbyViewProps> = ({
  selectedDungeon,
  activeLobbyCode,
  activeLobbyData,
  playersList,
  caughtMonsters,
  epicMonsters,
  partySlots,
  setPartySlots,
  lobbyCountdown,
  onLeaveLobby,
  onStartSolo,
  onStartMultiplayer,
  lobbyMode,
  setLobbyMode,
}) => {
  const [selectedMonsterIdx, setSelectedMonsterIdx] = useState<number | null>(null);

  const getMonsterRole = (monster: any) => {
    if (!monster) return null;
    const hp = monster.maxHP || monster.hp || monster.stats?.hp || 1000;
    if (hp >= 1300) return { label: 'TANK', icon: '🛡️', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    if (hp <= 950) return { label: 'HEALER', icon: '💚', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    return { label: 'DPS', icon: '⚔️', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  };

  // Solo mode lobby view
  if (lobbyMode === 'solo' || !activeLobbyCode) {
    return (
      <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all animate-fade-in">
        <div className="absolute inset-0 z-0 opacity-30">
          <img src={selectedDungeon.backgroundImage} className="w-full h-full object-cover blur-sm brightness-[0.3]" />
          <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.9))" />
        </div>

        <div className="relative z-10 px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={onLeaveLobby}
              className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h2 className="text-[8px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-0.5">Dungeon Arena</h2>
              <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">{getLoc(selectedDungeon.name, 'cz')}</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 relative z-10 overflow-y-auto px-6 py-8 flex flex-col items-center justify-between max-w-md mx-auto w-full gap-6">
          <div className="text-center space-y-2">
            <h3 className="text-base font-black text-amber-400 uppercase tracking-wider">VYBER PŘÍŠERU DO BOJE</h3>
            <p className="text-[10px] text-slate-400">Vyber si svého bojovníka z chycených monster pro sólo výpravu.</p>
          </div>

          {/* Party Slots */}
          <div className="grid grid-cols-4 gap-3 w-full">
            {partySlots.map((monster, idx) => {
              const role = monster ? getMonsterRole(monster) : null;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedMonsterIdx(idx)}
                  className={cn(
                    "aspect-square rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 p-2 text-center cursor-pointer",
                    monster ? "bg-slate-900/90 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]" : "bg-black/40 border-dashed border-white/10 hover:border-white/30"
                  )}
                >
                  {monster ? (
                    <>
                      <img src={monster.image} className="size-10 object-contain drop-shadow-md" />
                      <span className="text-[8px] font-black truncate w-full text-amber-300 mt-1">{getLoc(monster.name, 'cz')}</span>
                      {role && (
                        <span className={cn("text-[6px] font-bold px-1 py-0.2 rounded border uppercase tracking-wider mt-0.5 flex items-center gap-0.5", role.color)}>
                          <span>{role.icon}</span> {role.label}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-bold">+ SLOT {idx + 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Monster Selection list - 3 Columns with Rarity Borders, Level & Total Score */}
          <div className="w-full space-y-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Moje Příšery:</span>
            <div className="grid grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1.5 bg-slate-900/60 rounded-2xl border border-white/5">
              {(caughtMonsters.length > 0 ? caughtMonsters : epicMonsters).map((m) => {
                const isSelected = partySlots[0]?.id === m.id;
                const rarityBorder = 
                  m.rarity === 'legendary' ? 'border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)] bg-amber-500/10' :
                  m.rarity === 'epic' ? 'border-purple-500/80 shadow-[0_0_10px_rgba(168,85,247,0.2)] bg-purple-500/10' :
                  m.rarity === 'rare' ? 'border-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.15)] bg-blue-500/10' :
                  'border-white/10 bg-slate-800/80';

                const totalScore = (m.stats?.hp || 100) + (m.stats?.attack || 45) + (m.stats?.defense || 20);

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setPartySlots([m, null, null, null]);
                      triggerHaptic('light');
                    }}
                    className={cn(
                      "p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between cursor-pointer transition-all duration-200 active:scale-95 text-center relative overflow-hidden",
                      rarityBorder,
                      isSelected && "ring-2 ring-amber-400 scale-[1.03] z-10"
                    )}
                  >
                    <div className="absolute top-1.5 left-1.5 bg-black/70 px-1.5 py-0.5 rounded-md text-[7px] font-black text-amber-400 font-mono border border-white/10">
                      Lv {m.level || 1}
                    </div>

                    <img src={m.image} className="size-12 object-contain drop-shadow-md my-1" />
                    
                    <div className="w-full space-y-0.5">
                      <span className="text-[9px] font-black truncate w-full block text-white leading-tight">
                        {getLoc(m.name, 'cz')}
                      </span>
                      <div className="flex items-center justify-center gap-1 text-[7px] font-mono font-bold text-slate-300">
                        <span className="text-amber-400">⚡ {totalScore} PTS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={onStartSolo}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition cursor-pointer"
          >
            VSTOUPIT DO DUNGEONU ⚔️
          </button>
        </div>
      </div>
    );
  }

  // Multiplayer Room Lobby View
  const myData = activeLobbyData?.players?.[PLAYER_UID];
  const isHost = activeLobbyData?.hostUid === PLAYER_UID;

  return (
    <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all animate-fade-in">
      <div className="absolute inset-0 z-0 opacity-30">
        <img src={selectedDungeon.backgroundImage} className="w-full h-full object-cover blur-sm brightness-[0.3]" />
        <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.9))" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={onLeaveLobby}
            className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 className="text-[8px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-0.5">
              {getLoc(selectedDungeon.name, 'cz')}
            </h2>
            <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">
              LOBBY: {activeLobbyCode}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 relative z-10 overflow-y-auto px-6 py-6 flex flex-col gap-6 max-w-4xl w-full mx-auto">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => {
            const player = playersList[idx];
            const isMySlot = player && player.uid === PLAYER_UID;
            const role = player?.monster ? getMonsterRole(player.monster) : null;

            return (
              <div
                key={idx}
                className={cn(
                  "aspect-square rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 p-2 text-center",
                  player
                    ? player.isLocked
                      ? "bg-slate-900/90 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                      : "bg-slate-900/80 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                    : "bg-black/30 border-dashed border-white/10"
                )}
              >
                {player ? (
                  <>
                    <img src={player.monster?.image || '/monsters/001.png'} className="size-12 object-contain drop-shadow-md" />
                    <span className="text-[9px] font-black truncate w-full text-white mt-1">{player.name || 'Hráč'}</span>
                    {role && (
                      <span className={cn("text-[6px] font-bold px-1 py-0.2 rounded border uppercase tracking-wider mt-0.5 flex items-center gap-0.5", role.color)}>
                        <span>{role.icon}</span> {role.label}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[9px] text-slate-600 font-bold">VOLNÝ SLOT</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Lock in button */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              if (myData?.monster && activeLobbyCode) {
                setPlayerMonsterLock(activeLobbyCode, PLAYER_UID, !myData.isLocked);
                triggerHaptic('heavy');
              }
            }}
            disabled={!myData?.monster}
            className={cn(
              "flex-1 py-4 font-black text-xs uppercase tracking-widest rounded-2xl transition shadow-xl cursor-pointer flex items-center justify-center gap-2",
              myData?.isLocked 
                ? "bg-emerald-600 text-white shadow-emerald-600/30" 
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
            )}
          >
            {myData?.isLocked ? <Check size={18} /> : <Lock size={18} />}
            {myData?.isLocked ? 'ZAMČENO! PRIPRAVEN' : 'POTVRDIT PŘÍŠERU'}
          </button>
        </div>
      </div>
    </div>
  );
};
