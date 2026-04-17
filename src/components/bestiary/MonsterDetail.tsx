import { useState, useEffect, forwardRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bolt, Zap, LayoutGrid, RefreshCw, Flame, Droplets, Leaf,
  Clock, Package, Plus, Heart, Sword, Shield, Trash2, X, FlaskConical,
  Sparkles, Info, Activity, ChevronRight, Star, Target, Gem, Dna
} from 'lucide-react';

import {
  cn, TYPE_COLORS, getMonsterMaxHP, getMonsterAttack,
  getMonsterDefense, TYPE_MATCHUP, getTotalXPForLevel
} from '../../utils';
import { RESOURCE_CONFIG } from '../../data/resources';
import { monsterDB } from '../../data/monsters';
import { ResourceIcon } from '../ui/ResourceIcon';
import type { Monster } from '../../types';

// --- Sub-components for better organization ---

const StatBar = ({
  label, value, maxValue, colorClass, icon, subValue
}: {
  label: string; value: number; maxValue: number; colorClass: string; icon: React.ReactNode; subValue?: string | React.ReactNode
}) => {
  const progress = Math.min(100, (value / maxValue) * 100);

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between items-end px-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={cn("opacity-80 transition-transform hover:scale-110", colorClass)}>{icon}</span>
            <span className={cn("text-[9px] font-black uppercase tracking-widest leading-none", colorClass)}>{label}</span>
          </div>
          {subValue && <div className="mt-1">{subValue}</div>}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[12px] font-black text-white tabular-nums tracking-tighter leading-none">
            {Math.round(value)} <span className="opacity-30 text-[10px]">/</span> {maxValue}
          </span>
        </div>
      </div>
      <div className="h-3 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden p-0.5 shadow-inner relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={cn(
            "h-full rounded-full transition-all duration-500",
            colorClass.replace('text-', 'bg-'),
            colorClass.includes('red') ? "shadow-[0_0_12px_rgba(239,68,68,0.4)]" :
              colorClass.includes('emerald') ? "shadow-[0_0_12px_rgba(16,185,129,0.4)]" :
                "shadow-[0_0_12px_rgba(13,185,242,0.4)]"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};


const AbilityCard = ({ ability, idx, monsterType }: { ability: any, idx: number, monsterType: string }) => {
  const effectiveType = ability.type || (idx === 0 ? 'attack' : 'extra');

  const effect = useMemo(() => {
    switch (effectiveType) {
      case 'attack': return { label: 'Silný útok', val: `+${Math.round(((ability.value || 1.85) - 1) * 100)}% ATK`, icon: <Sword size={24} />, color: 'text-purple-400', bg: 'bg-purple-500/10', energy: 50 };
      case 'extra': return { label: 'Extra zásah', val: `+${Math.round((ability.value || 0.35) * 100)}% DMG`, icon: <Zap size={24} />, color: 'text-blue-400', bg: 'bg-blue-500/10', energy: 20 };
      case 'defense': return { label: 'Obrana', val: `-${Math.round((ability.value || 0.4) * 100)}% DMG`, icon: <Shield size={24} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', energy: 30 };
      case 'heal': return { label: 'Léčení', val: `+${Math.round((ability.value || 0.2) * 100)}% HP`, icon: <Heart size={24} />, color: 'text-red-400', bg: 'bg-red-500/10', energy: 40 };
      case 'buff': return { label: 'Bonus', val: `+${Math.round((ability.value || 0.2) * 100)}% ALL`, icon: <Sparkles size={24} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10', energy: 30 };
      default: return { label: 'Schopnost', val: 'Speciální', icon: <Info size={24} />, color: 'text-slate-400', bg: 'bg-white/5', energy: 40 };
    }
  }, [effectiveType, ability.value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-white/[0.08] p-5 rounded-[2rem] border border-white/20 hover:border-white/30 backdrop-blur-md transition-all shadow-2xl overflow-hidden group-hover:bg-white/[0.12]"
    >
      <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-30", effect.bg)} />

      <div className="flex gap-4 relative z-10">
        <div className={cn("size-16 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-2xl transition-transform group-hover:scale-105 relative bg-slate-900/80", effect.bg)}>
          <div className={effect.color}>{effect.icon}</div>
          <div className="absolute -top-2 -right-2 bg-black/90 border border-white/20 rounded-lg px-2 py-0.5 text-[10px] font-black text-white shadow-2xl z-[40] tabular-nums">
            {effect.energy}⚡
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-lg font-black uppercase text-white tracking-tight leading-none drop-shadow-md">{ability.name}</h4>
            <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-70">
              <Star size={10} className="text-amber-500/50" />
              {ability.chance || 40}%
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-slate-400 font-medium mb-3 drop-shadow-sm min-h-[3em]">{ability.description}</p>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-auto">
            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] opacity-50", effect.color)}>{effect.label}</span>
            <div className={cn("px-3 py-1 rounded-full text-[11px] font-black italic tracking-tight shadow-inner", effect.bg, effect.color)}>
              {effect.val}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RarityFrame = ({ rarity }: { rarity: string }) => {
  if (rarity === 'Běžná') return null;

  const isLegendary = rarity === 'Legendární';
  const isEpic = rarity === 'Epická';

  const frameColor = isLegendary ? 'border-amber-600' : isEpic ? 'border-purple-600' : 'border-blue-600';
  const shadowColor = isLegendary ? 'shadow-amber-900/40' : isEpic ? 'shadow-purple-900/40' : 'shadow-blue-900/40';
  const iconColor = isLegendary ? 'text-amber-400' : isEpic ? 'text-purple-400' : 'text-blue-400';

  return (
    <div className="absolute inset-x-0 inset-y-0 pointer-events-none z-30">
      {/* Epic/Void Energy for Epic Rarity */}
      {isEpic && (
        <motion.div
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.02, 1]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-4 rounded-[2rem] bg-purple-500/5 blur-2xl pointer-events-none"
        />
      )}

      {/* Heavy Beveled Outer Frame */}
      <div className={cn(
        "absolute inset-2 border-[6px] rounded-[2rem] border-double shadow-[0_0_40px_rgba(0,0,0,0.8)]",
        frameColor, shadowColor
      )} />

      {/* Inner Metallic Lining */}
      <div className={cn(
        "absolute inset-[10px] border rounded-[3.2rem] pointer-events-none",
        isEpic ? "border-purple-400/20" : "border-white/10"
      )} />

      {/* Ornate Fantasy Corner Caps */}
      {[
        { pos: 'top-0 left-0', rot: 'rotate-0' },
        { pos: 'top-0 right-0', rot: 'rotate-90' },
        { pos: 'bottom-0 left-0', rot: '-rotate-90' },
        { pos: 'bottom-0 right-0', rot: 'rotate-180' }
      ].map((c, i) => (
        <div key={i} className={cn("absolute size-16 pointer-events-none", c.pos, c.rot)}>
          <svg viewBox="0 0 100 100" className={cn("size-full", iconColor)}>
            <path
              d="M10,10 L40,10 Q50,10 50,20 L50,30 L30,30 L30,50 Q10,50 10,40 Z"
              fill="currentColor"
              className="opacity-90 drop-shadow-xl"
            />
            <path
              d="M15,15 L35,15 L35,35 L15,35 Z"
              fill="black"
              className="opacity-40"
            />
            <circle cx="25" cy="25" r="4" fill="white" className="opacity-20" />
          </svg>
        </div>
      ))}

      {/* Center Top Crest */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className={cn(
          "px-8 py-1 bg-gradient-to-b from-slate-800 to-slate-950 border-x-4 border-b-4 border-t-4 rounded-xl shadow-2xl",
          frameColor
        )}>
          <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] italic", iconColor)}>
            {rarity}
          </span>
        </div>
      </div>

      {/* Corner Embellishments (SVG Flourishes) */}
      <svg className="absolute inset-0 size-full opacity-30" viewBox="0 0 400 400">
        <path d="M40,80 Q20,40 80,40" fill="none" stroke={isLegendary ? "#f59e0b" : "#3b82f6"} strokeWidth="2" strokeLinecap="round" />
        <path d="M320,40 Q380,40 360,80" fill="none" stroke={isLegendary ? "#f59e0b" : "#3b82f6"} strokeWidth="2" strokeLinecap="round" />
        <path d="M40,320 Q20,380 80,360" fill="none" stroke={isLegendary ? "#f59e0b" : "#3b82f6"} strokeWidth="2" strokeLinecap="round" />
        <path d="M320,360 Q380,380 360,320" fill="none" stroke={isLegendary ? "#f59e0b" : "#3b82f6"} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

const LevelBadge = ({ level, rarity }: { level: number, rarity: string }) => {
  const isLegendary = rarity === 'Legendární';
  const isEpic = rarity === 'Epická';
  const isRare = rarity === 'Vzácná';

  const iconColor = isLegendary ? 'text-amber-400' : isEpic ? 'text-purple-400' : isRare ? 'text-blue-400' : 'text-slate-400';
  const borderColor = isLegendary ? 'border-amber-600' : isEpic ? 'border-purple-600' : isRare ? 'border-blue-600' : 'border-slate-600';
  const bgColor = isLegendary ? 'bg-gradient-to-br from-amber-900/80 to-black' :
    isEpic ? 'bg-gradient-to-br from-purple-900/80 to-black' :
      isRare ? 'bg-gradient-to-br from-blue-900/80 to-black' :
        'bg-gradient-to-br from-slate-800/80 to-black';

  return (
    <div className="relative group min-w-[64px]">
      <div className="absolute inset-0 bg-black/40 blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
      <div className={cn(
        "relative px-4 py-2 border-2 flex flex-col items-center justify-center shadow-xl transition-all transform -skew-x-12 rounded-xl h-[48px]",
        borderColor, bgColor
      )}>
        <div className="absolute inset-x-1 inset-y-1 border border-white/5 rounded-lg pointer-events-none" />
        <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 whitespace-nowrap", iconColor)}>LVL</span>
        <p className="text-lg font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none tabular-nums">{level}</p>
      </div>
    </div>
  );
};

const MonsterScoreBadge = ({ score, rarity }: { score: number, rarity: string }) => {
  const isLegendary = rarity === 'Legendární';
  const isEpic = rarity === 'Epická';
  const isRare = rarity === 'Vzácná';

  const iconColor = isLegendary ? 'text-amber-500' : isEpic ? 'text-purple-500' : isRare ? 'text-blue-500' : 'text-slate-400';
  const borderColor = isLegendary ? 'border-amber-600' : isEpic ? 'border-purple-600' : isRare ? 'border-blue-600' : 'border-slate-600';
  const bgColor = isLegendary ? 'bg-gradient-to-br from-amber-900/80 to-black' :
    isEpic ? 'bg-gradient-to-br from-purple-900/80 to-black' :
      isRare ? 'bg-gradient-to-br from-blue-900/80 to-black' :
        'bg-gradient-to-br from-slate-800/80 to-black';

  return (
    <div className="relative group min-w-[64px]">
      <div className="absolute inset-0 bg-black/40 blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
      <div className={cn(
        "relative px-4 py-2 border-2 flex flex-col items-center justify-center shadow-xl transition-all transform -skew-x-12 rounded-xl h-[48px]",
        borderColor, bgColor
      )}>
        <div className="absolute inset-x-1 inset-y-1 border border-white/5 rounded-lg pointer-events-none" />
        <div className="flex items-center gap-1 mb-0.5">
          <Target size={10} className={cn("animate-pulse", iconColor)} />
          <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap", iconColor)}>Power</span>
        </div>
        <p className="text-lg font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none tabular-nums">{score}</p>
      </div>
    </div>
  );
};

const RarityEffects = ({ rarity }: { rarity: string }) => {
  if (rarity === 'Běžná') return null;

  const particleCount = rarity === 'Legendární' ? 12 : rarity === 'Epická' ? 8 : 4;
  const particles = Array.from({ length: particleCount });
  const color =
    rarity === 'Legendární' ? 'bg-amber-400' :
      rarity === 'Epická' ? 'bg-purple-400' :
        'bg-blue-400';

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background Glow Pulse */}
      <motion.div
        animate={{
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={cn("absolute inset-0 blur-[60px]", color.replace('bg-', 'bg-opacity-20 bg-'))}
      />

      {/* Random Floating Particles */}
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * 300,
            y: Math.random() * 300,
            opacity: 0,
            scale: 0
          }}
          animate={{
            y: [null, Math.random() * -100 - 50],
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
            x: [null, (Math.random() - 0.5) * 50]
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut"
          }}
          className={cn("absolute size-1 rounded-full blur-[1px] shadow-lg", color)}
          style={{ left: `${Math.random() * 100}%`, top: `${70 + Math.random() * 30}%` }}
        />
      ))}

      {/* Rarity Ring for Legendary */}
      {rarity === 'Legendární' && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 border-2 border-dashed border-amber-500/20 rounded-full"
        />
      )}
    </div>
  );
};

// --- Constant Definitions ---

const RARITY_COLORS: Record<string, { text: string, decoration: string, glow: string }> = {
  'Běžná': { text: 'text-slate-400', decoration: 'border-slate-400/20', glow: 'shadow-slate-500/10' },
  'Vzácná': { text: 'text-blue-400', decoration: 'border-blue-400/30', glow: 'shadow-blue-500/20' },
  'Epická': { text: 'text-purple-400', decoration: 'border-purple-400/40', glow: 'shadow-purple-500/30' },
  'Legendární': { text: 'text-amber-400', decoration: 'border-amber-400/50', glow: 'shadow-amber-500/40' }
};

// --- Main Component ---

export const MonsterDetail = forwardRef<HTMLDivElement, {
  monster: Monster;
  onBack: () => void;
  onUpgrade?: () => void;
  inventory?: any[];
  onUsePotion?: (type: string) => void;
  onEquipGem?: (idx: number, gemType: string | null) => void;
  onEquipItem?: (idx: number, itemType: string | null) => void;
  onPermanentlyUpgrade?: (itemType: string, stats: any) => void;
  onRelease?: () => void;
  canRelease?: boolean;
}>(
  ({ monster, onBack, onUpgrade, inventory, onUsePotion, onEquipGem, onEquipItem, onPermanentlyUpgrade, onRelease, canRelease = true }, ref) => {
    const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
    const [focusedItem, setFocusedItem] = useState<any>(null);
    const [confirmRelease, setConfirmRelease] = useState(false);
    const [showHealingModal, setShowHealingModal] = useState(false);
    const [showMutations, setShowMutations] = useState(false);

    if (!monster) return null;

    const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default'];
    const rarityInfo = RARITY_COLORS[monster.rarity] || RARITY_COLORS['Běžná'];

    useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

        const originalMonster = useMemo(() => monsterDB.find(dbm => dbm.id === monster.id), [monster.id]);
    const originalStats = originalMonster?.stats || { hp: 100, attack: 10, defense: 10 };

    const powerLevel = useMemo(() => {
      const atk = getMonsterAttack(monster);
      const def = getMonsterDefense(monster);
      const hp = getMonsterMaxHP(monster);
      return Math.round((hp / 2) + (atk * 8) + (def * 12) + (monster.level * 100));
    }, [monster]);

    const TypeIcon = ({ size = 20, className = "" }) => {
      const props = { size, className };
      switch (monster.type) {
        case 'Ohnivá': return <Flame {...props} className={cn("text-red-500", className)} />;
        case 'Vodní': return <Droplets {...props} className={cn("text-blue-400", className)} />;
        case 'Přírodní': return <Leaf {...props} className={cn("text-green-400", className)} />;
        case 'Elektrická': return <Zap {...props} className={cn("text-yellow-400", className)} />;
        default: return <Bolt {...props} className={cn("text-yellow-400", className)} />;
      }
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 100 || info.velocity.x > 500) {
            onBack();
          }
        }}
        className="w-full min-h-screen bg-slate-900 text-slate-100 pb-20 selection:bg-primary/30"
      >
        {/* --- Background Decorative Elements --- */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className={cn("absolute -top-1/4 -right-1/4 w-full h-full blur-[120px] opacity-[0.12] rounded-full", colors.bg)} />
          <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-slate-950/60 to-transparent" />
        </div>

        {/* --- Header Section --- */}
        <div className="sticky top-0 z-50 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl bg-black/20 border-b border-white/5">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 transition-colors shadow-lg"
            >
              <ArrowLeft size={22} strokeWidth={3} />
            </motion.button>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white uppercase tracking-tighter truncate leading-none drop-shadow-lg mb-1">
                {monster.name}
              </h1>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", rarityInfo.text)}>
                  {monster.rarity}
                </span>
                <div className="size-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-1">
                  <TypeIcon size={12} />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{monster.type}</span>
                </div>
              </div>
            </div>

            <div className={cn("size-12 rounded-2xl flex items-center justify-center border-2 shadow-2xl transition-transform hover:scale-105", colors.bg, colors.border)}>
              <TypeIcon size={24} />
            </div>
          </div>

          {/* Progress Bar in Header */}
          <div className="mt-4 px-1">
            {(() => {
              const currentLVL = monster.level;
              const nextXPBase = getTotalXPForLevel(currentLVL + 1);
              const currentXPBase = getTotalXPForLevel(currentLVL);
              const neededXPInLevel = nextXPBase - currentXPBase;
              const currentXPInLevel = monster.xp || 0;
              const progress = Math.min(100, (currentXPInLevel / neededXPInLevel) * 100);

              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] opacity-80">XP na další úroveň</span>
                    <span className="text-[9px] font-black text-white/40 tabular-nums">
                      {Math.round(currentXPInLevel)}<span className="mx-1">/</span>{Math.round(neededXPInLevel)} XP
                    </span>
                  </div>
                  <div className="h-1.5 bg-black/60 rounded-full border border-white/5 overflow-hidden p-[1px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="px-5 space-y-8 mt-6 relative z-10">
          {/* --- Monster Visual Stage --- */}
          <div className="relative group">
            {/* Visual Backdrops */}
            <div className={cn(
              "absolute inset-0 rounded-3xl blur-3xl opacity-20 transition-opacity group-hover:opacity-30",
              monster.type === 'Ohnivá' ? "bg-red-500" :
                monster.type === 'Vodní' ? "bg-blue-500" :
                  monster.type === 'Přírodní' ? "bg-emerald-500" :
                    "bg-amber-500"
            )} />

            <div className="relative aspect-square w-full bg-slate-800 rounded-3xl border-4 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group-hover:border-white/20 transition-colors">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

              <RarityEffects rarity={monster.rarity} />
              <RarityFrame rarity={monster.rarity} />

              <div className={cn(
                "absolute inset-0 opacity-[0.15]",
                monster.type === 'Ohnivá' ? "bg-[radial-gradient(circle_at_center,_#ff4444_0%,_transparent_70%)]" :
                  monster.type === 'Vodní' ? "bg-[radial-gradient(circle_at_center,_#3b82f6_0%,_transparent_70%)]" :
                    "bg-[radial-gradient(circle_at_center,_#10b981_0%,_transparent_70%)]"
              )} />

              <motion.img
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 2, 0, -2, 0]
                }}
                transition={{
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                }}
                src={monster.image}
                className="w-full h-full object-contain relative z-10 p-4 drop-shadow-[0_45px_70px_rgba(0,0,0,0.85)]"
              />

              {/* Mutation History Button - Left Side */}
              <div className="absolute bottom-6 left-6 z-40">
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: -15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMutations(true)}
                  className={cn(
                    "size-10 rounded-lg flex items-center justify-center border border-white/10 bg-background-dark/80 backdrop-blur-md text-primary shadow-2xl transition-all",
                    monster.mutations && monster.mutations.length > 0 ? "ring-1 ring-primary/30 ring-offset-1 ring-offset-slate-900" : "opacity-40 grayscale hover:grayscale-0"
                  )}
                >
                  <Dna size={18} className={cn(monster.mutations && monster.mutations.length > 0 && "animate-pulse")} />
                </motion.button>
              </div>

              {/* Badges - Right Side */}
              <div className="absolute bottom-6 right-6 z-40 flex items-center gap-2">
                <LevelBadge level={monster.level} rarity={monster.rarity} />
                <MonsterScoreBadge score={powerLevel} rarity={monster.rarity} />
              </div>
              {/* Shimmer Effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                <div className="absolute inset-x-0 h-full w-[200%] opacity-10 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.8)_45%,rgba(255,255,255,0.8)_50%,transparent_55%)] animate-[shimmer_3s_infinite] transform-gpu" />
              </div>
            </div>
          </div>

          {/* --- Statistics Overview --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              {(() => {
                const maxHP = getMonsterMaxHP(monster);
                const currentHP = monster.currentHP ?? maxHP;
                const isDamaged = Math.round(currentHP) < maxHP;

                return (
                  <div className="bg-white/[0.07] border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-md transition-all relative overflow-hidden group hover:bg-white/[0.1] hover:border-white/20">
                    <div className="flex flex-col gap-5">
                      <StatBar
                        label="Zdraví"
                        value={currentHP}
                        maxValue={maxHP}
                        colorClass="text-red-500"
                        icon={<Heart size={10} strokeWidth={3} className="fill-current" />}
                        subValue={
                          <div className="flex flex-col gap-1.5 mt-1">
                            <div className="text-[8px] font-black text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 w-fit">
                              Bonus {maxHP - (originalStats.hp)}
                            </div>
                            {isDamaged && (
                              <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500/60 pl-1">
                                <RefreshCw size={8} className="animate-spin text-primary/40" />
                                <span>Obnova za {(() => {
                                  const diff = maxHP - currentHP;
                                  const healPerMin = maxHP * 0.1;
                                  const mins = diff / healPerMin;
                                  const sec = Math.ceil(mins * 60);
                                  return sec < 60 ? `${sec}s` : `${Math.floor(mins)}m`;
                                })()}</span>
                              </div>
                            )}
                          </div>
                        }
                      />

                      {isDamaged && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowHealingModal(true)}
                          className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 py-3 rounded-2xl flex items-center justify-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                        >
                          <FlaskConical size={14} />
                          Použít léčivý lektvar
                          <ChevronRight size={14} className="opacity-50" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white/[0.07] border border-white/10 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 backdrop-blur-md shadow-2xl transition-all relative overflow-hidden group hover:bg-white/[0.1] hover:border-white/20">
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Sword size={18} className="text-blue-500 opacity-60 mb-1" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Útok</span>
              <p className="text-xl font-black text-white italic tabular-nums leading-none">{getMonsterAttack(monster)}</p>
              <div className="text-[8px] font-black text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                Bonus {getMonsterAttack(monster) - (originalStats.attack)}
              </div>
            </div>

            <div className="bg-white/[0.07] border border-white/10 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 backdrop-blur-md shadow-2xl transition-all relative overflow-hidden group hover:bg-white/[0.1] hover:border-white/20">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Shield size={18} className="text-emerald-500 opacity-60 mb-1" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Obrana</span>
              <p className="text-xl font-black text-white italic tabular-nums leading-none">{getMonsterDefense(monster)}</p>
              <div className="text-[8px] font-black text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                Bonus {getMonsterDefense(monster) - (originalStats.defense)}
              </div>
            </div>
          </div>

          {/* --- Abilities Section --- */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <Zap size={14} className="text-primary" />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] opacity-80">Speciální Schopnosti</h3>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div className="space-y-4">
              {monster.abilities && monster.abilities.length > 0 ? (
                monster.abilities.map((ability, idx) => (
                  <AbilityCard key={idx} ability={ability} idx={idx} monsterType={monster.type} />
                ))
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                  <Info size={24} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-xs italic text-slate-600 font-bold uppercase tracking-widest px-8">
                    Tato příšerka zatím neobjevila svůj pravý potenciál
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* --- Description & Bio --- */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transform rotate-12">
              <Activity size={120} />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <LayoutGrid size={14} className="text-slate-500" />
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Příběh a Biologie</h3>
            </div>

            <p className="text-sm text-slate-300 italic leading-relaxed font-medium tracking-tight mb-8 relative z-10">
              "{monster.description || "Zatím nepopsaný druh z hlubin digitálního ekosystému. Jeho návyky a původ jsou předmětem dalšího zkoumání."}"
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {(() => {
                const match = TYPE_MATCHUP[monster.type];
                if (!match) return null;

                const strongAgainstColors = TYPE_COLORS[match.strong] || TYPE_COLORS['Default'];
                const weakAgainstColors = TYPE_COLORS[match.weak] || TYPE_COLORS['Default'];

                return (
                  <>
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Průraznost</span>
                      <div className={cn("flex flex-col gap-1 border p-3 rounded-2xl", strongAgainstColors.bg, strongAgainstColors.border)}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("size-6 rounded-lg flex items-center justify-center", strongAgainstColors.bg)}>
                            <Sword size={12} className={strongAgainstColors.text} />
                          </div>
                          <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{match.strong}</span>
                        </div>
                        <div className="flex flex-col mt-1">
                          <p className="text-[8px] font-black text-white leading-none">1.3x ZRANĚNÍ</p>
                          <p className="text-[7px] font-bold text-slate-400 uppercase leading-none mt-0.5">30% Šance na průraz</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Zranitelnost</span>
                      <div className={cn("flex flex-col gap-1 border p-3 rounded-2xl", weakAgainstColors.bg, weakAgainstColors.border)}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("size-6 rounded-lg flex items-center justify-center", weakAgainstColors.bg)}>
                            <Shield size={12} className={weakAgainstColors.text} />
                          </div>
                          <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{match.weak}</span>
                        </div>
                        <div className="flex flex-col mt-1">
                          <p className="text-[8px] font-black text-white leading-none">0.7x ZRANĚNÍ</p>
                          <p className="text-[7px] font-bold text-slate-400 uppercase leading-none mt-0.5">Snížená efektivita</p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 opacity-50">
              <Info size={10} className="text-slate-500" />
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">
                Třída: {monster.type} | Efekt: {TYPE_MATCHUP[monster.type]?.effect || "NONE"}
              </p>
            </div>
          </div>

          {/* --- Equipment Section --- */}
          <div className="bg-[#0f141d]/80 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Sparkles size={16} className="text-amber-500" />
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Drahokamy a Relikvie</h3>
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">Slot Score: 3 / 3</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, idx) => {
                const currentGem = monster.gems?.[idx];
                const gemConfig = currentGem ? RESOURCE_CONFIG[currentGem] : null;
                const isPicking = activeSlotIdx === idx;

                const stats = gemConfig?.stats;
                const sym = gemConfig?.statsType === 'perc' ? '%' : '';

                return (
                  <div key={idx} className="flex flex-col items-center gap-3">
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setActiveSlotIdx(isPicking ? null : idx);
                        setFocusedItem(null);
                      }}
                      className={cn(
                        "relative size-20 rounded-3xl border-2 flex items-center justify-center transition-all cursor-pointer group shadow-xl",
                        currentGem ? (
                          gemConfig?.rarity === 'Legendární' ? "border-amber-500/50 bg-amber-500/10 shadow-amber-500/20" :
                            gemConfig?.rarity === 'Epická' ? "border-purple-500/50 bg-purple-500/10 shadow-purple-500/20" :
                              gemConfig?.rarity === 'Vzácná' ? "border-blue-500/50 bg-blue-500/10 shadow-blue-500/20" :
                                "bg-slate-800 border-white/20"
                        ) : "bg-black/40 border-dashed border-white/10 hover:border-white/30 hover:bg-black/60",
                        isPicking && "ring-4 ring-primary/40 border-primary/60 scale-105 z-20"
                      )}
                    >
                      {currentGem && gemConfig ? (
                        <>
                          <ResourceIcon id={currentGem} config={gemConfig} size="md" className="group-hover:scale-110 transition-transform drop-shadow-lg" />
                          <button
                            onClick={(e) => { e.stopPropagation(); onEquipGem?.(idx, null); }}
                            className="absolute -top-1.5 -right-1.5 size-6 bg-red-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-slate-900 text-white transition-all active:scale-75 z-30"
                          >
                            <Trash2 size={10} strokeWidth={3} />
                          </button>
                        </>
                      ) : (
                        <Plus size={20} className="text-white/20" />
                      )}
                    </motion.div>

                    <div className="text-center min-h-[2.5rem]">
                      {currentGem ? (
                        <>
                          <p className="text-[8px] font-black text-slate-200 uppercase truncate max-w-[70px] mb-0.5">{gemConfig?.label}</p>
                          <p className="text-[9px] font-black text-emerald-400 italic">
                            {stats?.atk ? `+${stats.atk}${sym} ATK` : stats?.hp ? `+${stats.hp}${sym} HP` : stats?.def ? `+${stats.def}${sym} DEF` : 'BONUS'}
                          </p>
                        </>
                      ) : (
                        <p className="text-[8px] font-black text-slate-700 uppercase italic tracking-widest mt-1">Slot {idx + 1}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Equipment Picker */}
            <AnimatePresence>
              {activeSlotIdx !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-t border-white/10 mt-6 pt-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Vybavit Slot {activeSlotIdx + 1}</p>
                    <button onClick={() => { setActiveSlotIdx(null); setFocusedItem(null); }} className="size-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-500"><X size={18} /></button>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-6 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                    {inventory?.filter(i => (i?.type.startsWith('gem_') || i?.type.startsWith('loot_') || i?.type.startsWith('item_')) && i?.count > 0).map(i => {
                      const cfg = RESOURCE_CONFIG[i.type];
                      const isSelected = focusedItem?.type === i.type;
                      return (
                        <motion.button
                          key={i.type}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setFocusedItem(i)}
                          onDoubleClick={() => {
                            if (activeSlotIdx !== null) {
                              if (i.type.startsWith('gem_')) {
                                onEquipGem?.(activeSlotIdx, i.type);
                              } else {
                                onEquipItem?.(activeSlotIdx, i.type);
                              }
                              setActiveSlotIdx(null);
                              setFocusedItem(null);
                            }
                          }}
                          className={cn(
                            "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all shadow-xl",
                            cfg.rarity === 'Legendární' ? "border-amber-500/20 bg-amber-500/5 shadow-amber-500/5" :
                              cfg.rarity === 'Epická' ? "border-purple-500/20 bg-purple-500/5 shadow-purple-500/5" :
                                cfg.rarity === 'Vzácná' ? "border-blue-500/20 bg-blue-500/5 shadow-blue-500/5" :
                                  "border-white/5 bg-white/5",
                            isSelected && "ring-4 ring-primary/30 border-primary bg-primary/10 scale-105 z-10"
                          )}
                        >
                          <ResourceIcon id={i.type} config={cfg} size="md" className={cn("drop-shadow-md transition-opacity", !isSelected && "opacity-80")} />
                          <div className="absolute -bottom-1 -right-1 bg-slate-950 border border-white/10 text-[7px] font-black text-white px-2 py-0.5 rounded-lg shadow-lg">
                            {i.count}x
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {focusedItem ? (() => {
                      const cfg = RESOURCE_CONFIG[focusedItem.type];
                      const sym = cfg.statsType === 'perc' ? '%' : '';
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={focusedItem.type}
                          className="bg-black/60 border border-white/10 rounded-[2rem] p-5 shadow-2xl space-y-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="size-20 bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/10 shadow-inner shrink-0">
                              <ResourceIcon id={focusedItem.type} config={cfg} size="lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-base font-black text-white uppercase tracking-tight truncate">{cfg.label}</h4>
                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                  cfg.rarity === 'Legendární' ? "text-amber-500 border-amber-500/30 bg-amber-500/10" :
                                    cfg.rarity === 'Epická' ? "text-purple-500 border-purple-500/30 bg-purple-500/10" :
                                      "text-slate-400 border-slate-500/30 bg-slate-500/10"
                                )}>{cfg.rarity}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {cfg.stats?.atk && <span className="text-[10px] font-black text-red-400 bg-red-400/5 px-2 py-0.5 border border-red-400/20 rounded-lg">+{cfg.stats?.atk}{sym} ATK</span>}
                                {cfg.stats?.hp && <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/5 px-2 py-0.5 border border-emerald-400/20 rounded-lg">+{cfg.stats?.hp}{sym} HP</span>}
                                {cfg.stats?.def && <span className="text-[10px] font-black text-blue-400 bg-blue-400/5 px-2 py-0.5 border border-blue-400/20 rounded-lg">+{cfg.stats?.def}{sym} DEF</span>}
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">{cfg.description}</p>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { onEquipGem?.(activeSlotIdx, focusedItem.type); setActiveSlotIdx(null); setFocusedItem(null); }}
                            className="w-full py-4 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus size={18} strokeWidth={3} />
                            Nasadit do slotu
                          </motion.button>
                        </motion.div>
                      );
                    })() : (
                      <div className="py-8 text-center border-2 border-dashed border-white/5 bg-white/[0.01] rounded-[2rem] opacity-40">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic tracking-tighter">Vyberte předmět z mřížky pro zobrazení detailů</p>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- Footer Release Action --- */}
        <div className="px-6 mt-16 mb-12">
          <motion.button
            whileHover={canRelease ? { scale: 1.02 } : {}}
            whileTap={canRelease ? { scale: 0.98 } : {}}
            onClick={() => { if (canRelease) setConfirmRelease(true); }}
            className={cn(
              "w-full group relative py-6 rounded-2xl overflow-hidden transition-all border-2 shadow-2xl",
              canRelease
                ? "border-red-500/20 bg-red-950/10 hover:border-red-500/40"
                : "opacity-40 grayscale border-slate-800 bg-slate-900/40 cursor-not-allowed"
            )}
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Trash2 size={24} className={cn("transition-transform group-hover:scale-110", canRelease ? "text-red-500" : "text-slate-500")} />
              <div className="text-left">
                <p className={cn("text-base font-black uppercase tracking-widest leading-none mb-1", canRelease ? "text-red-500" : "text-slate-500")}>
                  {canRelease ? "Propustit na svobodu" : "Poslední Monstrum"}
                </p>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                  {canRelease ? "Získáš prostor pro další unikáty" : "Nemůžeš propustit svou jedinou příšeru"}
                </p>
              </div>
            </div>
          </motion.button>
        </div>

        {/* --- Modals --- */}
        <AnimatePresence>
          {showHealingModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-end flex-col">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHealingModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border-t-4 border-emerald-500 rounded-t-[2rem] p-8 pb-12 shadow-[0_-20px_80px_rgba(16,185,129,0.3)] relative z-10">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-emerald-500/20 rounded-2xl text-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-500/10"><Package size={28} /></div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">Polní Lékárna</h2>
                      <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Dostupné lektvary</p>
                    </div>
                  </div>
                  <button onClick={() => setShowHealingModal(false)} className="size-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-slate-400 transition-colors shadow-inner"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-1 gap-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {inventory?.filter(i => i?.type === 'hp_potion' && i?.count > 0).map(item => (
                    <motion.button key={item?.type} whileTap={{ scale: 0.97 }} onClick={() => { item?.type && onUsePotion?.(item.type); setShowHealingModal(false); }} className="group relative flex items-center gap-5 p-6 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl hover:border-emerald-500/30 transition-all text-left overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="size-20 flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 group-hover:rotate-3 transition-transform">
                        <Plus size={36} className="text-white" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xl font-black text-white uppercase tracking-tight">Lektvar HP</p>
                          <p className="bg-emerald-500 text-slate-900 text-xs font-black px-3 py-1 rounded-full shadow-lg">{item?.count}x</p>
                        </div>
                        <p className="text-sm font-bold text-slate-400 italic leading-snug">Stabilizuje digitální integritu a okamžitě vyléčí 50 bodů zdraví.</p>
                      </div>
                    </motion.button>
                  ))}
                  {(!inventory || inventory.filter(i => i?.type === 'hp_potion' && i?.count > 0).length === 0) && (
                    <div className="py-20 text-center">
                      <div className="size-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner"><FlaskConical size={40} className="text-slate-700" /></div>
                      <p className="text-sm font-black text-slate-600 uppercase tracking-widest italic max-w-[200px] mx-auto">V tvém inventáři se nenachází žádné léčivo</p>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowHealingModal(false)} className="w-full mt-10 py-5 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-[2rem] transition-all active:scale-95 shadow-xl">Možná později</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmRelease && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmRelease(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="w-full max-w-sm bg-slate-900/90 backdrop-blur-xl border-2 border-red-500/20 rounded-[2rem] p-10 text-center shadow-[0_0_120px_rgba(239,68,68,0.25)] relative z-10">
                <div className="size-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-inner"><Trash2 size={48} className="text-red-500" /></div>
                <h2 className="text-3xl font-black text-white uppercase italic mb-3 tracking-tighter">Propustit?</h2>
                <p className="text-slate-400 text-sm font-bold mb-10 leading-relaxed px-4">Tato akce je nevratná. Opravdu se chceš rozloučit s <span className="text-white font-black underline decoration-red-500/50">{monster.name}</span>?</p>
                <div className="flex flex-col gap-4">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => onRelease?.()} className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-[2rem] shadow-2xl shadow-red-600/20 transition-all font-black">Potvrdit propuštění</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmRelease(false)} className="w-full py-5 bg-[#252a33] hover:bg-[#2d333d] text-slate-100 font-black uppercase tracking-widest rounded-[2rem] transition-all">Ponechat si příšeru</motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      
        {/* Equipment & Relic Picker Modal (Bottom Sheet) */}
        <AnimatePresence>
          {activeSlotIdx !== null && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-end flex-col">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => { setActiveSlotIdx(null); setFocusedItem(null); }} 
                className="absolute inset-0 bg-black/40 backdrop-blur-xl" 
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
                className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border-t-4 border-primary rounded-t-[2rem] p-8 pb-12 shadow-[0_-20px_80px_rgba(var(--primary-rgb),0.3)] relative z-10 max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-8 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/10">
                      <Gem size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">
                        Výběr Výbavy
                      </h2>
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest italic">
                        Slot {activeSlotIdx + 1} • Vyberte vylepšení
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setActiveSlotIdx(null); setFocusedItem(null); }} 
                    className="size-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-slate-400 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Grid of Items */}
                <div className="grid grid-cols-4 gap-3 mb-6 overflow-y-auto pr-2 custom-scrollbar shrink-0">
                  {inventory?.filter(i => (i?.type.startsWith('gem_') || i?.type.startsWith('loot_') || i?.type.startsWith('item_')) && i?.count > 0).map(i => {
                    const cfg = RESOURCE_CONFIG[i.type];
                    const isSelected = focusedItem?.type === i.type;
                    return (
                      <motion.button
                        key={i.type}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setFocusedItem(i)}
                        onDoubleClick={() => {
                          if (activeSlotIdx !== null) {
                            if (i.type.startsWith('gem_')) {
                              onEquipGem?.(activeSlotIdx, i.type);
                            } else {
                              onEquipItem?.(activeSlotIdx, i.type);
                            }
                            setActiveSlotIdx(null);
                            setFocusedItem(null);
                          }
                        }}
                        className={cn(
                          "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all shadow-xl",
                          cfg.rarity === 'Legendární' ? "border-amber-500/20 bg-amber-500/5 shadow-amber-500/5" :
                          cfg.rarity === 'Epická' ? "border-purple-500/20 bg-purple-500/5 shadow-purple-500/5" :
                          cfg.rarity === 'Vzácná' ? "border-blue-500/20 bg-blue-500/5 shadow-blue-500/5" :
                          "border-white/5 bg-white/5",
                          isSelected && "ring-4 ring-primary/30 border-primary bg-primary/10 scale-105 z-10"
                        )}
                      >
                        <ResourceIcon id={i.type} config={cfg} size="lg" className={cn("drop-shadow-md transition-opacity", !isSelected && "opacity-80")} />
                        <div className="absolute -bottom-1 -right-1 bg-slate-950 border border-white/10 text-[7px] font-black text-white px-2 py-0.5 rounded-lg shadow-lg">
                          {i.count}x
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Selected Item Detail (Inside Modal) */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {focusedItem ? (() => {
                      const cfg = RESOURCE_CONFIG[focusedItem.type];
                      const sym = cfg.statsType === 'perc' ? '%' : '';
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: 10 }} 
                          key={focusedItem.type} 
                          className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 shadow-3xl space-y-4"
                        >
                          <div className="flex items-center gap-4">
                             <div className="size-16 bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/10 shadow-inner shrink-0">
                               <ResourceIcon id={focusedItem.type} config={cfg} size="xl" />
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between mb-2">
                                 <h4 className="text-xl font-black text-white uppercase tracking-tight truncate">{cfg.label}</h4>
                                 <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", 
                                   cfg.rarity === 'Legendární' ? "text-amber-500 border-amber-500/30 bg-amber-500/10" :
                                   cfg.rarity === 'Epická' ? "text-purple-500 border-purple-500/30 bg-purple-500/10" :
                                   "text-slate-400 border-slate-500/30 bg-slate-500/10"
                                 )}>{cfg.rarity}</span>
                               </div>
                               <div className="flex flex-wrap gap-2">
                                  {(cfg.stats?.atk || 0) !== 0 && (
                                    <span className="text-[10px] font-black text-red-400 bg-red-400/5 px-2 py-0.5 border border-red-400/20 rounded-lg">
                                      {(cfg.stats?.atk || 0) > 0 ? '+' : ''}{cfg.stats?.atk}{sym} ATK
                                    </span>
                                  )}
                                  {(cfg.stats?.hp || 0) !== 0 && (
                                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/5 px-2 py-0.5 border border-emerald-400/20 rounded-lg">
                                      {(cfg.stats?.hp || 0) > 0 ? '+' : ''}{cfg.stats?.hp}{sym} HP
                                    </span>
                                  )}
                                  {(cfg.stats?.def || 0) !== 0 && (
                                    <span className="text-[10px] font-black text-blue-400 bg-blue-400/5 px-2 py-0.5 border border-blue-400/20 rounded-lg">
                                      {(cfg.stats?.def || 0) > 0 ? '+' : ''}{cfg.stats?.def}{sym} DEF
                                    </span>
                                  )}
                               </div>
                             </div>
                          </div>
                          <p className="text-xs text-slate-400 font-medium leading-relaxed italic tracking-tight">{cfg.description}</p>
                          
                          <div className="flex flex-col gap-2 pt-1">
                            {(cfg.category === 'relic' || (focusedItem && focusedItem.type && focusedItem.type.startsWith('loot_'))) && (
                              <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onPermanentlyUpgrade && cfg.stats) {
                                    onPermanentlyUpgrade(focusedItem.type, cfg.stats);
                                    setActiveSlotIdx(null);
                                    setFocusedItem(null);
                                  }
                                }}
                                className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-orange-900/40 flex items-center justify-center gap-2 border-b-4 border-black/20"
                              >
                                <Sparkles size={16} />
                                Trvale vylepšit
                              </motion.button>
                            )}

                            {cfg.category === 'gem' && (
                              <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  if (focusedItem.type.startsWith('gem_')) {
                                    onEquipGem?.(activeSlotIdx, focusedItem.type);
                                  } else {
                                    onEquipItem?.(activeSlotIdx, focusedItem.type);
                                  }
                                  setActiveSlotIdx(null);
                                  setFocusedItem(null);
                                }}
                                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 border border-white/5 active:bg-slate-700 shadow-inner text-[10px]"
                              >
                                <Package size={18} />
                                Nasadit do slotu {activeSlotIdx + 1}
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })() : (
                      <div className="py-12 text-center border-2 border-dashed border-white/5 bg-white/[0.01] rounded-2xl opacity-40">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Vyberte předmět z mřížky pro zobrazení detailů</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mutation History Modal (GEN Chain) */}
        <AnimatePresence>
          {showMutations && (
            <div className="fixed inset-0 z-[20000] flex items-center justify-end flex-col">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowMutations(false)} 
                className="absolute inset-0 bg-black/40 backdrop-blur-xl" 
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
                className="w-full max-w-lg bg-slate-800/60 backdrop-blur-xl border-t-4 border-primary/50 rounded-t-[2rem] p-8 pb-12 shadow-[0_-20px_100px_rgba(var(--primary-rgb),0.4)] relative z-10 max-h-[85vh] flex flex-col"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-8 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="size-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/10">
                      <Dna size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">
                        Genom Příšery
                      </h2>
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] italic">
                        Historie adaptací a mutací
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowMutations(false)} 
                    className="size-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {!monster.mutations || monster.mutations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
                      <Activity size={48} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">Žádné mutace nenalezeny</p>
                    </div>
                  ) : (
                    <div className="relative pl-8 space-y-6 mt-4">
                      {/* DNA Vertical Line */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-1 bg-gradient-to-b from-primary via-purple-500 to-primary/40 rounded-full" />
                      
                      {monster.mutations.map((mut, idx) => {
                        const cfg = RESOURCE_CONFIG[mut.id];
                        return (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative flex items-start gap-4"
                          >
                            {/* Node Icon Cluster */}
                            <div className="absolute -left-[27px] size-14 z-10">
                              <div className="size-full bg-slate-900 border-2 border-primary rounded-xl flex items-center justify-center shadow-lg overflow-hidden group">
                                <ResourceIcon id={mut.id} config={cfg} size="lg" />
                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="absolute -z-10 -inset-2 bg-primary/30 blur-xl rounded-full animate-pulse" />
                            </div>

                            <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-4 ml-8 backdrop-blur-md shadow-xl transition-all hover:bg-white/[0.06] hover:border-white/20">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{cfg?.label || mut.id}</h4>
                                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                    {new Date(mut.timestamp).toLocaleDateString()} • {new Date(mut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="size-6 bg-primary/10 rounded-full flex items-center justify-center text-[8px] font-black text-primary border border-primary/20">
                                  #{idx + 1}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                {(cfg?.stats?.atk || 0) > 0 && <span className="text-[8px] font-black text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">+{cfg.stats?.atk} ATK</span>}
                                {(cfg?.stats?.hp || 0) > 0 && <span className="text-[8px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20">+{cfg.stats?.hp} HP</span>}
                                {(cfg?.stats?.def || 0) > 0 && <span className="text-[8px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg border border-blue-400/20">+{cfg.stats?.def} DEF</span>}
                              </div>
                            </div>
                          </motion.div>
                        );
                      }).reverse()}
                    </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest">Celkem mutací: {monster.mutations?.length || 0}</p>
                    </div>
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-tighter leading-none opacity-40">Verifikováno Gen-Labem</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
</motion.div>
    )
  }
)

MonsterDetail.displayName = 'MonsterDetail'
