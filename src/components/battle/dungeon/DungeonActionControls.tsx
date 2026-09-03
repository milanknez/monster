import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, ShieldAlert, Sparkles, Heart, Zap, Shield, Skull, 
  Sword, RefreshCw, Target, Info 
} from 'lucide-react';
import { cn, getLoc } from '../../../utils';
import type { DungeonPlayer } from './types';

const getAbilityVisuals = (type?: string, idx: number = 0) => {
  const effectiveType = type || (idx === 0 ? 'attack' : 'extra');
  switch (effectiveType) {
    case 'attack':
      return { icon: <Sword size={16} />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
    case 'extra':
      return { icon: <Zap size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
    case 'defense':
      return { icon: <Shield size={16} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
    case 'heal':
      return { icon: <Heart size={16} />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
    case 'buff':
      return { icon: <Sparkles size={16} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
    case 'curse':
      return { icon: <Skull size={16} />, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/30' };
    case 'regen':
      return { icon: <RefreshCw size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    case 'debuff':
      return { icon: <Target size={16} />, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
    case 'reflect':
      return { icon: <ShieldAlert size={16} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' };
    default:
      return { icon: <Info size={16} />, color: 'text-slate-400', bg: 'bg-white/5 border-white/10' };
  }
};

interface DungeonActionControlsProps {
  isFighting: boolean;
  isPaused: boolean;
  isTransitioning: boolean;
  players: DungeonPlayer[];
  playerUid?: string;
  hpPotions: number;
  manaPotions: number;
  titanPotions?: number;
  masterHunterElixirs?: number;
  isTitanActive?: boolean;
  isMasterHunterActive?: boolean;
  showItems: boolean;
  setShowItems: (show: boolean | ((prev: boolean) => boolean)) => void;
  showSkillsMenu: boolean;
  setShowSkillsMenu: (show: boolean | ((prev: boolean) => boolean)) => void;
  onBasicAttack: () => void;
  onTaunt: () => void;
  onExecuteAbility: (idx: number) => void;
  onUseHpPotion: () => void;
  onUseManaPotion: () => void;
  onUseTitanPotion?: () => void;
  onUseMasterHunterElixir?: () => void;
}

export const DungeonActionControls: React.FC<DungeonActionControlsProps> = ({
  isFighting,
  isPaused,
  isTransitioning,
  players,
  playerUid,
  hpPotions,
  manaPotions,
  titanPotions = 0,
  masterHunterElixirs = 0,
  isTitanActive = false,
  isMasterHunterActive = false,
  showItems,
  setShowItems,
  showSkillsMenu,
  setShowSkillsMenu,
  onBasicAttack,
  onTaunt,
  onExecuteAbility,
  onUseHpPotion,
  onUseManaPotion,
  onUseTitanPotion,
  onUseMasterHunterElixir,
}) => {
  if (!isFighting) return null;

  const mainPlayer = (playerUid ? players.find(p => p.uid === playerUid) : null) || players[0];
  const mainPlayerStunned = mainPlayer && (mainPlayer.stunTimer > 0 || mainPlayer.freezeTimer > 0);
  const playerMonster = mainPlayer?.monster;
  const abilities = playerMonster?.abilities || [];
  const isClickingAbilityRef = React.useRef<boolean>(false);

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
                className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl z-[10000] space-y-2 pointer-events-auto"
              >
                <h4 className="text-[9px] font-black text-purple-400 uppercase text-center tracking-widest opacity-60">
                  Schopnosti monstra
                </h4>
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {abilities.map((ab, idx) => {
                    const isHeal = ab.type === 'heal' || ab.type === 'regen';
                    const cost = isHeal ? 30 : 40;
                    const hasEnergy = (mainPlayer?.energy || 0) >= cost;
                    const visual = getAbilityVisuals(ab.type, idx);

                    return (
                      <button
                        key={idx}
                        disabled={!hasEnergy}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickingAbilityRef.current) return;
                          isClickingAbilityRef.current = true;
                          setShowSkillsMenu(false);
                          onExecuteAbility(idx);
                          setTimeout(() => {
                            isClickingAbilityRef.current = false;
                          }, 600);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-xl text-left border transition-all cursor-pointer active:scale-95 shadow-md",
                          visual.bg,
                          !hasEnergy && "opacity-40 cursor-not-allowed pointer-events-none"
                        )}
                      >
                        {/* Ability Icon box */}
                        <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10 bg-slate-950/80 shadow-inner", visual.color)}>
                          {visual.icon}
                        </div>

                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black text-white block truncate leading-tight">
                            {getLoc(ab.name, 'cz')}
                          </span>
                          <span className="text-[7px] text-slate-400 font-medium block truncate mt-0.5 leading-none">
                            {getLoc(ab.description, 'cz')}
                          </span>
                        </div>

                        {/* Energy Cost Badge */}
                        <span className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded-md font-mono shrink-0 font-black border border-white/10",
                          hasEnergy ? "text-amber-300 bg-amber-500/20" : "text-slate-500 bg-slate-800"
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
                className="absolute bottom-16 right-0 w-56 sm:w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl z-[9999] space-y-2.5"
              >
                <h4 className="text-[9px] font-black text-blue-400 uppercase text-center tracking-widest opacity-60">Lektvary & Elixíry</h4>
                
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5">
                  {/* HP Potion */}
                  <button
                    onClick={onUseHpPotion}
                    disabled={hpPotions <= 0}
                    className="w-full flex justify-between items-center p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[9px] font-bold text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>🧪</span>
                      <span className="truncate">HP Lektvar (+400 HP)</span>
                    </span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded font-black shrink-0">{hpPotions}x</span>
                  </button>

                  {/* Mana Potion */}
                  <button
                    onClick={onUseManaPotion}
                    disabled={manaPotions <= 0}
                    className="w-full flex justify-between items-center p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-[9px] font-bold text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>⚡</span>
                      <span className="truncate">Mana Lektvar (+50 EN)</span>
                    </span>
                    <span className="text-[8px] bg-blue-500/20 text-blue-300 font-mono px-1.5 py-0.5 rounded font-black shrink-0">{manaPotions}x</span>
                  </button>

                  {/* Titan Berserk Potion */}
                  <button
                    onClick={onUseTitanPotion}
                    disabled={!onUseTitanPotion || titanPotions <= 0}
                    className={cn(
                      "w-full flex justify-between items-center p-2 rounded-xl text-[9px] font-bold text-white transition cursor-pointer border",
                      isTitanActive 
                        ? "bg-rose-500/20 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]" 
                        : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30",
                      (!onUseTitanPotion || titanPotions <= 0) && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <span>⚔️</span>
                      <div className="flex flex-col text-left truncate">
                        <span className="truncate text-rose-200">Titánský Hněv (+35% DMG)</span>
                        {isTitanActive && <span className="text-[7px] text-emerald-400 font-black uppercase">Aktivní buff</span>}
                      </div>
                    </div>
                    <span className="text-[8px] bg-rose-500/20 text-rose-300 font-mono px-1.5 py-0.5 rounded font-black shrink-0 ml-1">
                      {titanPotions}x
                    </span>
                  </button>

                  {/* Master Hunter Elixir */}
                  <button
                    onClick={onUseMasterHunterElixir}
                    disabled={!onUseMasterHunterElixir || masterHunterElixirs <= 0}
                    className={cn(
                      "w-full flex justify-between items-center p-2 rounded-xl text-[9px] font-bold text-white transition cursor-pointer border",
                      isMasterHunterActive 
                        ? "bg-amber-500/20 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                        : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30",
                      (!onUseMasterHunterElixir || masterHunterElixirs <= 0) && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <span>🎯</span>
                      <div className="flex flex-col text-left truncate">
                        <span className="truncate text-amber-200">Mistrovský Lov (2x Loot)</span>
                        {isMasterHunterActive && <span className="text-[7px] text-emerald-400 font-black uppercase">Aktivní buff</span>}
                      </div>
                    </div>
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded font-black shrink-0 ml-1">
                      {masterHunterElixirs}x
                    </span>
                  </button>
                </div>
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
