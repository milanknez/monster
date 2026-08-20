import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, ShieldAlert, Sparkles, Heart, Zap, Shield, Skull } from 'lucide-react';
import { cn, getLoc } from '../../../utils';
import type { DungeonPlayer } from './types';

interface DungeonActionControlsProps {
  isFighting: boolean;
  isPaused: boolean;
  isTransitioning: boolean;
  players: DungeonPlayer[];
  hpPotions: number;
  manaPotions: number;
  showItems: boolean;
  setShowItems: (show: boolean | ((prev: boolean) => boolean)) => void;
  showSkillsMenu: boolean;
  setShowSkillsMenu: (show: boolean | ((prev: boolean) => boolean)) => void;
  onBasicAttack: () => void;
  onTaunt: () => void;
  onExecuteAbility: (idx: number) => void;
  onUseHpPotion: () => void;
  onUseManaPotion: () => void;
}

export const DungeonActionControls: React.FC<DungeonActionControlsProps> = ({
  isFighting,
  isPaused,
  isTransitioning,
  players,
  hpPotions,
  manaPotions,
  showItems,
  setShowItems,
  showSkillsMenu,
  setShowSkillsMenu,
  onBasicAttack,
  onTaunt,
  onExecuteAbility,
  onUseHpPotion,
  onUseManaPotion,
}) => {
  if (!isFighting) return null;

  const mainPlayer = players[0];
  const mainPlayerStunned = mainPlayer && (mainPlayer.stunTimer > 0 || mainPlayer.freezeTimer > 0);
  const playerMonster = mainPlayer?.monster;
  const abilities = playerMonster?.abilities || [];

  return (
    <div className="p-4 bg-slate-950/85 border-t border-white/5 backdrop-blur-3xl relative z-[9100] flex flex-col items-center gap-3 w-full">
      <div className="grid grid-cols-4 gap-3 w-full max-w-md">
        
        {/* 1. Basic Attack */}
        <button
          onClick={onBasicAttack}
          disabled={mainPlayer?.isDead || (mainPlayer?.cooldown || 0) < 100 || isPaused || isTransitioning || mainPlayerStunned}
          className={cn(
            "h-14 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl relative overflow-hidden cursor-pointer",
            mainPlayer && mainPlayer.cooldown >= 100 && !mainPlayer.isDead && !isPaused && !isTransitioning && !mainPlayerStunned
              ? "bg-red-500/10 border-red-500/40 text-red-400 active:scale-95 shadow-[0_4px_0_rgba(239,68,68,0.2)]"
              : "bg-slate-900/40 border-white/5 opacity-40 text-slate-500 cursor-not-allowed"
          )}
        >
          <Swords size={18} />
          <span className="text-[8px] font-black uppercase mt-1">
            {mainPlayer && mainPlayer.cooldown >= 100 ? 'ÚTOK! ⚔️' : `Nabíjení (${Math.round(mainPlayer?.cooldown || 0)}%)`}
          </span>
        </button>

        {/* 2. Dynamic Skills Selector Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSkillsMenu(prev => !prev);
              setShowItems(false);
            }}
            disabled={mainPlayer?.isDead || isPaused || isTransitioning || mainPlayerStunned}
            className={cn(
              "w-full h-14 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl cursor-pointer",
              mainPlayer && !mainPlayer.isDead && !isPaused && !isTransitioning && !mainPlayerStunned
                ? "bg-purple-500/10 border-purple-500/40 text-purple-400 active:scale-95 shadow-[0_4px_0_rgba(168,85,247,0.2)]"
                : "bg-slate-900/40 border-white/5 opacity-40 text-slate-500 cursor-not-allowed"
            )}
          >
            <Sparkles size={18} />
            <span className="text-[8px] font-black uppercase mt-1">Schopnosti</span>
          </button>

          {/* Dynamic Skills Dropdown Menu */}
          <AnimatePresence>
            {showSkillsMenu && abilities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-52 bg-slate-900 border border-white/10 p-3 rounded-2xl shadow-2xl z-[10000] space-y-2 pointer-events-auto"
              >
                <h4 className="text-[9px] font-black text-purple-400 uppercase text-center tracking-widest opacity-60">
                  Schopnosti monstra
                </h4>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {abilities.map((ab, idx) => {
                    const isHeal = ab.type === 'heal' || ab.type === 'regen';
                    const cost = isHeal ? 30 : 40;
                    const hasEnergy = (mainPlayer?.energy || 0) >= cost;

                    return (
                      <button
                        key={idx}
                        disabled={!hasEnergy}
                        onClick={(e) => {
                          e.stopPropagation();
                          onExecuteAbility(idx);
                          setShowSkillsMenu(false);
                        }}
                        className={cn(
                          "w-full flex justify-between items-center p-2 rounded-xl text-[9px] font-bold text-white transition text-left border cursor-pointer active:scale-95",
                          isHeal ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30" : "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30",
                          !hasEnergy && "opacity-45 cursor-not-allowed pointer-events-none"
                        )}
                      >
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="truncate text-white font-bold">{getLoc(ab.name, 'cz')}</span>
                          <span className="text-[6px] text-slate-400 font-normal truncate italic">
                            {getLoc(ab.description, 'cz')}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded font-mono shrink-0 font-bold",
                          hasEnergy ? "text-purple-300 bg-purple-500/20" : "text-slate-500 bg-slate-800"
                        )}>
                          {cost}⚡
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Backpack (Potions) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowItems(prev => !prev);
              setShowSkillsMenu(false);
            }}
            disabled={mainPlayer?.isDead || isPaused || isTransitioning}
            className={cn(
              "w-full h-14 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl cursor-pointer",
              mainPlayer && !mainPlayer.isDead && !isPaused && !isTransitioning
                ? "bg-blue-500/10 border-blue-500/40 text-blue-400 active:scale-95 shadow-[0_4px_0_rgba(59,130,246,0.2)]"
                : "bg-slate-900/40 border-white/5 opacity-40 text-slate-500 cursor-not-allowed"
            )}
          >
            <span className="text-lg">🎒</span>
            <span className="text-[8px] font-black uppercase mt-1">Batoh</span>
          </button>

          {/* Inventory Popover */}
          <AnimatePresence>
            {showItems && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-16 right-0 w-44 bg-slate-900 border border-white/10 p-3 rounded-2xl shadow-2xl z-[9999] space-y-2"
              >
                <h4 className="text-[9px] font-black text-blue-400 uppercase text-center tracking-widest opacity-60">Lektvary</h4>
                
                {/* HP Potion */}
                <button
                  onClick={onUseHpPotion}
                  disabled={hpPotions <= 0}
                  className="w-full flex justify-between items-center p-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-bold text-white transition cursor-pointer"
                >
                  <span className="flex items-center gap-1">🧪 HP Lektvar (+400 HP)</span>
                  <span className="text-[8px] bg-emerald-500/20 px-1.5 py-0.5 rounded">{hpPotions}x</span>
                </button>

                {/* Mana Potion */}
                <button
                  onClick={onUseManaPotion}
                  disabled={manaPotions <= 0}
                  className="w-full flex justify-between items-center p-2 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-xl text-[9px] font-bold text-white transition cursor-pointer"
                >
                  <span className="flex items-center gap-1">🧪 Mana Lektvar (+50 EN)</span>
                  <span className="text-[8px] bg-blue-500/20 px-1.5 py-0.5 rounded">{manaPotions}x</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Agro / Taunt Button */}
        <button
          onClick={onTaunt}
          disabled={mainPlayer?.isDead || isPaused || isTransitioning || mainPlayerStunned || (mainPlayer?.energy || 0) < 20}
          className={cn(
            "h-14 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl cursor-pointer",
            mainPlayer && !mainPlayer.isDead && !isPaused && !isTransitioning && !mainPlayerStunned && mainPlayer.energy >= 20
              ? "bg-amber-500/10 border-amber-500/40 text-amber-400 active:scale-95 shadow-[0_4px_0_rgba(245,158,11,0.2)]"
              : "bg-slate-900/40 border-white/5 opacity-40 text-slate-500 cursor-not-allowed"
          )}
        >
          <Shield size={18} />
          <span className="text-[8px] font-black uppercase mt-1">
            AGRO (20⚡)
          </span>
        </button>
      </div>
    </div>
  );
};
