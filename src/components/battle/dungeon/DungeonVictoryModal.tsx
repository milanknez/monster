import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award } from 'lucide-react';
import { cn, getLoc, triggerHaptic } from '../../../utils';
import { ResourceIcon } from '../../ui/ResourceIcon';
import { rollForLootItem, passLootItem, watchLootRolls, PLAYER_UID } from '../../../lib/firebase';
import type { DungeonPlayer } from './types';

interface DungeonVictoryModalProps {
  battleResult: 'win' | 'lose' | null;
  dungeonTime: number;
  players: DungeonPlayer[];
  accumulatedLoot: any[];
  onRestart: () => void;
  onBack: () => void;
  onAddResource?: (type: any, amount?: number) => void;
  syncedStats?: {
    totalDamageDealt: number;
    dungeonTime: number;
    playersStats: Record<string, { td: number; th: number; dps: number }>;
  } | null;
  activeLobbyCode?: string | null;
  playerName?: string;
}

export const DungeonVictoryModal: React.FC<DungeonVictoryModalProps> = ({
  battleResult,
  dungeonTime,
  players,
  accumulatedLoot,
  onRestart,
  onBack,
  onAddResource,
  syncedStats,
  activeLobbyCode,
  playerName = 'Hráč',
}) => {
  const [selectedLootPreview, setSelectedLootPreview] = useState<any | null>(null);
  const [lootRolls, setLootRolls] = useState<Record<number, { status: 'idle' | 'rolling' | 'won' | 'passed'; roll?: number; npcRoll?: number; winnerName?: string; isWin?: boolean }>>({});
  const awardedItemsRef = useRef<Set<number>>(new Set());

  // Listen to multiplayer loot roll changes
  useEffect(() => {
    if (!activeLobbyCode || battleResult !== 'win') return;

    const unsubscribe = watchLootRolls(activeLobbyCode, (remoteRolls) => {
      if (!remoteRolls) return;

      setLootRolls((prev) => {
        const next = { ...prev };

        accumulatedLoot.forEach((loot, idx) => {
          const itemRolls = remoteRolls[idx];
          if (!itemRolls) return;

          const entries = Object.values(itemRolls) as any[];
          if (entries.length === 0) return;

          const myEntry = itemRolls[PLAYER_UID];
          const hasNeedRolls = entries.filter(e => e.action === 'need');
          const totalPlayersCount = Math.max(1, players.length);
          const allResponded = entries.length >= totalPlayersCount;

          // If I already rolled or passed, but others haven't finished yet
          if (!allResponded) {
            if (myEntry) {
              const otherEntry = entries.find(e => e.ui !== PLAYER_UID);
              next[idx] = {
                status: 'rolling',
                roll: myEntry.action === 'need' ? myEntry.rl : undefined,
                npcRoll: otherEntry?.action === 'need' ? otherEntry.rl : undefined
              };
            }
            return;
          }

          // All players have responded!
          if (hasNeedRolls.length > 0) {
            // Sort by highest roll
            const sorted = [...hasNeedRolls].sort((a, b) => b.rl - a.rl);
            const winner = sorted[0];
            const myRoll = myEntry?.action === 'need' ? myEntry.rl : undefined;
            const otherRoll = entries.find(e => e.ui !== PLAYER_UID && e.action === 'need')?.rl;
            const isMeWinner = winner.ui === PLAYER_UID;

            // Award item to player inventory once if won
            if (isMeWinner && !awardedItemsRef.current.has(idx)) {
              awardedItemsRef.current.add(idx);
              if (onAddResource) {
                onAddResource(loot.id, 1);
              }
            }

            if (myEntry?.action === 'need') {
              next[idx] = {
                status: isMeWinner ? 'won' : 'passed',
                roll: myRoll,
                npcRoll: otherRoll,
                winnerName: isMeWinner ? 'VY' : (winner.nm || 'Spoluhráč'),
                isWin: isMeWinner
              };
            } else {
              // I passed or didn't roll need
              next[idx] = {
                status: 'passed',
                roll: undefined,
                npcRoll: winner.rl,
                winnerName: isMeWinner ? 'VY' : (winner.nm || 'Spoluhráč'),
                isWin: false
              };
            }
          } else {
            // Everyone passed
            next[idx] = {
              status: 'passed',
              winnerName: 'Vzdáno',
              isWin: false
            };
          }
        });

        return next;
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeLobbyCode, battleResult, accumulatedLoot, players.length, onAddResource]);

  const effectiveDungeonTime = syncedStats?.dungeonTime ? syncedStats.dungeonTime : dungeonTime;

  const formatTime = (ticks: number) => {
    const totalSecs = ticks / 10;
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatedTotalDmg = players.reduce((sum, p) => sum + p.totalDamage, 0);
  const totalDamageDealt = syncedStats?.totalDamageDealt !== undefined ? syncedStats.totalDamageDealt : calculatedTotalDmg;

  return (
    <>
      <AnimatePresence>
        {battleResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div 
                className={cn(
                  "absolute -top-24 inset-x-0 h-48 rounded-full blur-3xl opacity-25 pointer-events-none",
                  battleResult === 'win' ? "bg-amber-500" : "bg-red-600"
                )} 
              />

              <div className="relative z-10 space-y-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  DUNGEON DOKONČEN
                </h2>
                <h1 className={cn("text-2xl font-black uppercase tracking-wider", battleResult === 'win' ? "text-amber-400" : "text-red-500")}>
                  {battleResult === 'win' ? 'VÍTĚZSTVÍ!' : 'PORÁŽKA!'}
                </h1>
              </div>

              {battleResult === 'win' && accumulatedLoot.length > 0 && (
                <div className="space-y-2 relative z-10">
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1">
                    <Award size={10} /> Získaná Kořist (Loot):
                  </span>
                  <div className="border border-amber-500/20 bg-slate-950/80 rounded-2xl overflow-hidden shadow-inner">
                    <div className="grid grid-cols-6 bg-slate-900/60 px-3 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">
                      <span className="col-span-3 text-left">Předmět / Rarita</span>
                      <span className="col-span-3 text-right">Akce / Hod</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {accumulatedLoot.slice(0, 6).map((loot, idx) => {
                        const rarityColor = 
                          loot.config.rarity === 'legendary' ? 'text-amber-400 font-black' :
                          loot.config.rarity === 'epic' ? 'text-purple-400 font-bold' :
                          loot.config.rarity === 'rare' ? 'text-blue-400 font-bold' :
                          'text-slate-300';
                        
                        const rollState = lootRolls[idx] || { status: 'idle' };

                        const handleNeedRoll = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (rollState.status !== 'idle') return;
                          
                          triggerHaptic('medium');
                          setLootRolls((prev) => ({ ...prev, [idx]: { status: 'rolling' } }));
                          
                          const playerRoll = Math.floor(1 + Math.random() * 100);

                          if (activeLobbyCode) {
                            rollForLootItem(activeLobbyCode, idx, PLAYER_UID, playerName, playerRoll);
                            return;
                          }

                          setTimeout(() => {
                            const npcRoll = players.length > 1 ? Math.floor(1 + Math.random() * 100) : 0;
                            const isWin = playerRoll >= npcRoll;
                            
                            if (isWin && onAddResource) {
                              onAddResource(loot.id, 1);
                            }

                            setLootRolls((prev) => ({
                              ...prev,
                              [idx]: {
                                status: isWin ? 'won' : 'passed',
                                roll: playerRoll,
                                npcRoll: players.length > 1 ? npcRoll : undefined,
                                winnerName: isWin ? 'VY' : 'Spoluhráč'
                              }
                            }));
                          }, 800);
                        };

                        const handlePass = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          if (activeLobbyCode) {
                            passLootItem(activeLobbyCode, idx, PLAYER_UID, playerName);
                          }
                          setLootRolls((prev) => ({ ...prev, [idx]: { status: 'passed', winnerName: 'Vzdáno' } }));
                        };

                        return (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedLootPreview(loot)}
                            className="grid grid-cols-6 items-center px-3 py-2 text-[10px] bg-slate-900/10 hover:bg-amber-500/10 cursor-pointer transition border-b border-white/5 last:border-none group"
                          >
                            <div className="col-span-3 flex items-center gap-2">
                              <div className={cn(
                                "size-8 rounded-lg flex items-center justify-center border text-base bg-black/40 group-hover:scale-105 transition-transform overflow-hidden p-1 shrink-0",
                                loot.config.rarity === 'legendary' ? 'border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]' :
                                loot.config.rarity === 'epic' ? 'border-purple-500/40' :
                                loot.config.rarity === 'rare' ? 'border-blue-500/40' : 'border-white/5'
                              )}>
                                <ResourceIcon id={loot.id} config={loot.config} size="sm" />
                              </div>
                              <div className="truncate text-left min-w-0">
                                <span className={cn("block truncate text-[11px] leading-tight group-hover:underline", rarityColor)}>
                                  {getLoc(loot.config.label, 'cz')}
                                </span>
                                <span className="text-[6px] text-slate-500 font-semibold uppercase tracking-wider block">
                                  {loot.config.rarity} • Klikni pro detail 🔍
                                </span>
                              </div>
                            </div>

                            <div className="col-span-3 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {rollState.status === 'idle' && (
                                <>
                                  <button
                                    onClick={handleNeedRoll}
                                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition active:scale-95"
                                  >
                                    Chci 🎲
                                  </button>
                                  <button
                                    onClick={handlePass}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-white/10 rounded-lg text-[9px] font-bold uppercase transition active:scale-95"
                                  >
                                    Nechci ❌
                                  </button>
                                </>
                              )}

                              {rollState.status === 'rolling' && (
                                <div className="flex items-center gap-1 text-amber-400 font-mono text-[9px] animate-pulse">
                                  <span className="animate-spin text-xs">🎲</span> {rollState.roll ? `Váš hod: ${rollState.roll} (čeká se...)` : 'Házení...'}
                                </div>
                              )}

                              {rollState.status === 'won' && (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-emerald-400 font-black text-[10px]">
                                    🎲 {rollState.roll} {rollState.npcRoll !== undefined ? `vs ${rollState.npcRoll}` : ''}
                                  </span>
                                  <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase">VZATO 🏆</span>
                                </div>
                              )}

                              {rollState.status === 'passed' && (
                                <div className="flex items-center gap-1 text-slate-400 font-mono text-[9px]">
                                  {rollState.roll !== undefined ? (
                                    <span className="text-red-400 font-bold">
                                      🎲 {rollState.roll} vs {rollState.npcRoll}
                                    </span>
                                  ) : (
                                    rollState.npcRoll !== undefined ? (
                                      <span className="text-amber-400 font-bold">
                                        🎲 {rollState.npcRoll}
                                      </span>
                                    ) : null
                                  )}
                                  <span className="uppercase text-[8px] text-slate-500 font-sans">
                                    ({rollState.winnerName || 'Vzdáno'})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] font-bold text-slate-300 leading-normal px-2 relative z-10">
                {battleResult === 'win' 
                  ? 'Vaše skupina vyčistila celý dungeon v čase ' + formatTime(effectiveDungeonTime) + '!'
                  : 'Monstra vás porazila v čase ' + formatTime(effectiveDungeonTime) + '.'}
              </p>

              <div className="bg-slate-950/80 rounded-2xl border border-white/5 overflow-hidden text-left relative z-10">
                <div className="grid grid-cols-4 bg-slate-900/60 px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-white/5">
                  <span>Hráč</span>
                  <span className="text-right">DMG (%)</span>
                  <span className="text-right">DPS</span>
                  <span className="text-right text-emerald-400">Léčení</span>
                </div>
                <div className="divide-y divide-white/5">
                  {[...players]
                    .map((p) => {
                      const pSync = p.uid && syncedStats?.playersStats?.[p.uid];
                      const pDmg = pSync ? pSync.td : p.totalDamage;
                      const pHeal = pSync ? pSync.th : p.totalHealing;
                      const pDps = pSync ? pSync.dps : (effectiveDungeonTime > 0 ? Math.round(p.totalDamage / (effectiveDungeonTime / 10)) : 0);
                      return { ...p, pDmg, pHeal, pDps };
                    })
                    .sort((a, b) => b.pDmg - a.pDmg)
                    .map((p, idx) => {
                      const dmgPct = totalDamageDealt > 0 ? Math.round((p.pDmg / totalDamageDealt) * 100) : 0;
                      const displayName = p.playerName || getLoc(p.monster.name, 'cz');
                      return (
                        <div key={p.index} className="grid grid-cols-4 px-3 py-2 text-[10px] font-bold items-center font-mono">
                          <span className="truncate font-sans pr-1 text-slate-300">
                            #{idx + 1} {displayName}{p.index === 0 && ' (VY)'}
                          </span>
                          <span className="text-right text-purple-300">
                            {p.pDmg} <span className="text-[8px] text-slate-500">({dmgPct}%)</span>
                          </span>
                          <span className="text-right text-amber-400">
                            {p.pDps}/s
                          </span>
                          <span className={cn("text-right", p.pHeal > 0 ? "text-emerald-400" : "text-slate-600")}>
                            {p.pHeal > 0 ? `+${p.pHeal}` : '0'}
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

              <div className="flex gap-3 pt-1 relative z-10">
                <button
                  onClick={onRestart}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                >
                  Zkusit Znovu
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                >
                  Zpět
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loot Item Detail Preview Modal */}
      <AnimatePresence>
        {selectedLootPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
            onClick={() => setSelectedLootPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedLootPreview(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5"
              >
                ✕
              </button>

              <div className="size-16 mx-auto rounded-2xl border-2 border-amber-500/40 bg-slate-950 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.2)] overflow-hidden p-2">
                <ResourceIcon id={selectedLootPreview.id} config={selectedLootPreview.config} size="lg" />
              </div>

              <div>
                <h3 className="text-base font-black uppercase text-amber-300 tracking-wider">
                  {getLoc(selectedLootPreview.config.label, 'cz')}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 mt-1 inline-block">
                  {selectedLootPreview.config.rarity || 'common'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950/50 p-3 rounded-xl border border-white/5">
                {getLoc(selectedLootPreview.config.description, 'cz') || 'Vzácná složka nalezená v útrobách dungeonu.'}
              </p>

              {selectedLootPreview.config.stats && (
                <div className="flex justify-center gap-2 font-mono text-xs">
                  {selectedLootPreview.config.stats.hp && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">+{selectedLootPreview.config.stats.hp} HP</span>}
                  {selectedLootPreview.config.stats.atk && <span className="text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">+{selectedLootPreview.config.stats.atk} ATK</span>}
                  {selectedLootPreview.config.stats.def && <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">+{selectedLootPreview.config.stats.def} DEF</span>}
                </div>
              )}

              <button
                onClick={() => setSelectedLootPreview(null)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition"
              >
                Rozumím
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
