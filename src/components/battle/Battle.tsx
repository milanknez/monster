import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialOverlay } from './TutorialOverlay';
import {
  Sword, Shield as ShieldIcon, Zap, Sparkles, X, Wand2,
  FlaskConical, Trophy, Package, ChevronRight, Smile,
  RefreshCw, Star, Heart, Aperture, ArrowUpRight,
  ArrowDownLeft, Flame, Wind, Droplets, Leaf, Circle,
  Hourglass, Skull, Moon, Lock, Check, Hash, Target
} from 'lucide-react';
import type { Monster, LootTableEntry, Localized } from '../../types';
import { cn, getMonsterMaxHP, getMonsterMinLevel, TYPE_MATCHUP, ADVANTAGE_MULT, WEAKNESS_MULT, getLoc, triggerHaptic } from '../../utils';
import { useTranslation } from 'react-i18next';
import { RESOURCE_CONFIG } from '../../data/resources';
import { LootModal, type LootItem } from './LootModal';
import { DefeatModal } from './DefeatModal';
import { useGameSound } from '../../data/sounds';
import { useSoundSystem } from '../../context/SoundContext';

// --- Types ---
interface DamagePopup {
  id: number;
  value: number;
  isCrit: boolean;
  isEffective: boolean;
  isWeak: boolean;
  isHeal?: boolean;
  isPlayerSide?: boolean;
  isMiss?: boolean;
}

interface StatusEffect {
  type: 'burn' | 'slow' | 'paralyze' | 'curse' | 'regen' | 'debuff';
  duration: number;
  value?: number;
  casterAtk?: number;
}

// --- Internal UI Components ---

const HealthBar = ({ current, max, label, colorClass, shadowColor }: { current: number, max: number, label: string, colorClass: string, shadowColor: string }) => (
  <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 relative">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.max(0, Math.min(100, (current / max) * 100))}%` }}
      className={cn("h-full rounded-full transition-all duration-500", colorClass)}
      style={{ boxShadow: `0 0 15px ${shadowColor}` }}
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[8px] font-black text-white drop-shadow-md uppercase tracking-tighter">
        {Math.round(current)} / {max} {label}
      </span>
    </div>
  </div>
);

const MonsterPodium = ({ isPlayer, rarity }: { isPlayer?: boolean, rarity?: any }) => {
  const r = (getLoc(rarity) || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let color = isPlayer ? 'rgba(13,185,242,0.8)' : 'rgba(239,68,68,0.8)';
  let bg = isPlayer ? 'bg-primary/20 border-primary' : 'bg-red-500/20 border-red-500';

  if (r.includes('legend')) { color = 'rgba(245,158,11,0.8)'; bg = 'bg-amber-500/20 border-amber-500'; }
  else if (r.includes('epic') || r.includes('epick')) { color = 'rgba(168,85,247,0.8)'; bg = 'bg-purple-500/20 border-purple-500'; }
  else if (r.includes('vzacn') || r.includes('rare')) { color = 'rgba(59,130,246,0.8)'; bg = 'bg-blue-500/20 border-blue-500'; }

  return (
    <div className="absolute -bottom-6 flex items-center justify-center w-full pointer-events-none">
      <div
        className={cn("absolute w-40 h-40 rounded-full border-2 blur-[1.5px] opacity-30", bg)}
        style={{
          boxShadow: `0 0 40px ${color}`,
          transform: 'rotateX(78deg)'
        }}
      />
      <div className="absolute w-32 h-32 flex items-center justify-center" style={{ transform: 'rotateX(78deg)', transformStyle: 'preserve-3d' }}>
        <motion.div
          animate={{ rotateZ: isPlayer ? -360 : 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className={cn("absolute inset-0 border-2 border-dashed rounded-full opacity-40", isPlayer ? "border-primary/60" : "border-red-400/60")}
        />
        <motion.div
          animate={{ rotateZ: isPlayer ? 360 : -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className={cn("absolute inset-4 border border-dotted rounded-full opacity-30", isPlayer ? "border-primary/40" : "border-red-400/40")}
        />
      </div>
    </div>
  );
};

const PopupLayer = ({ popups, className, t }: { popups: DamagePopup[], className?: string, t: any }) => (
  <div className={cn("absolute top-0 w-full flex flex-col items-center pointer-events-none z-[400]", className)}>
    <AnimatePresence mode="popLayout">
      {popups.map(p => {
        if (p.value === 0 && !p.isMiss && !p.isHeal) return null;
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 30, scale: 0.2 }}
            animate={{ opacity: 1, y: -100, scale: p.isCrit ? [0.2, 2.2, 1.8] : [0.2, 1.4, 1.1] }}
            exit={{ opacity: 0, scale: 2.5, y: -150 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn(
              "absolute font-black italic flex items-center gap-1 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] whitespace-nowrap",
              p.isHeal ? "text-emerald-400 text-5xl" : p.isCrit ? "text-amber-500 text-7xl" : p.isMiss ? "text-slate-400 text-4xl" : p.isPlayerSide ? "text-6xl text-red-500" : "text-5xl text-red-400"
            )}
          >
            {p.isHeal ? <Heart size={28} className="fill-emerald-400" /> : (p.isEffective ? <ArrowUpRight size={32} className="text-emerald-400 stroke-[5]" /> : (p.isWeak && <ArrowDownLeft size={32} className="text-red-400 stroke-[5]" />))}
            <span className="drop-shadow-[0_0_10px_rgba(0,0,0,1)]">
              {p.isMiss ? t('battle.miss') : (p.isHeal ? '+' : '-') + p.value}
            </span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

const TypeIcon = ({ type }: { type: any }) => {
  const t = getLoc(type).toLowerCase() || '';
  if (t.includes('ohn') || t.includes('fire')) return <Flame className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" size={14} />;
  if (t.includes('vod') || t.includes('wat')) return <Droplets className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" size={14} />;
  if (t.includes('ele') || t.includes('elektr') || t.includes('zap')) return <Zap className="text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" size={14} />;
  if (t.includes('pří') || t.includes('pri') || t.includes('nat') || t.includes('leaf') || t.includes('travn')) return <Leaf className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={14} />;
  return <Circle className="text-slate-500" size={14} />;
};

const EffectBadges = ({ effects }: { effects: StatusEffect[] }) => (
  <div className="flex gap-2">
    {effects.map((e, i) => (
      <motion.div key={i} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase shadow-lg border backdrop-blur-md",
        e.type === 'burn' ? "bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-orange-500/10" :
          e.type === 'slow' ? "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-blue-500/10" :
            e.type === 'curse' ? "bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-purple-500/10" :
              e.type === 'regen' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10" :
                e.type === 'debuff' ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/10" :
                  "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-yellow-500/10"
      )}>
        {e.type === 'burn' ? <Flame size={12} className="animate-pulse" /> :
          e.type === 'slow' ? <Wind size={12} className="animate-bounce" /> :
            e.type === 'curse' ? <ShieldIcon size={12} className="rotate-180" /> :
              e.type === 'regen' ? <Heart size={12} className="animate-pulse" /> :
                e.type === 'debuff' ? <Target size={12} className="animate-pulse" /> :
                  <Zap size={12} className="animate-pulse" />}
        <span>{e.duration}</span>
      </motion.div>
    ))}
  </div>
);

const RarityBadge = ({ rarity }: { rarity: any }) => {
  const r = (getLoc(rarity) || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let color = "transparent";

  if (r.includes('legend')) { color = "#f59e0b"; }
  else if (r.includes('epic') || r.includes('epick')) { color = "#a855f7"; }
  else if (r.includes('vzacn') || r.includes('rare')) { color = "#3b82f6"; }
  else return null;

  return (
    <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none z-[60] overflow-hidden rounded-tl-xl transition-all duration-700">
      <div className="absolute top-0 left-0 w-[140%] h-[140%] -translate-x-[50%] -translate-y-[50%] rotate-45" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}33 100%)`, border: `1px solid ${color}66` }} />
      <div className="absolute top-0 left-0 w-2 h-2 bg-white/20 blur-[1px] -rotate-45 -translate-x-1 -translate-y-1" />
    </div>
  );
};

const SkillEffect = ({ type, fromSide, subType }: { type: string | Localized<string>, fromSide: 'player' | 'enemy', subType: string }) => {
  const isHeal = subType === 'heal' || subType === 'regen';
  const isCurse = subType === 'curse' || subType === 'debuff';
  const isDefense = subType === 'defense';
  const isMelee = subType === 'attack';
  const isClaw = subType === 'claw';

  const count = isHeal ? 15 : (isCurse || isDefense) ? 20 : isMelee ? 30 : isClaw ? 0 : 12;
  const particles = [...Array(count)].map((_, i) => ({
    id: i,
    delay: i * (isMelee ? 0.01 : (isCurse || isDefense ? 0.02 : 0.04)) + (isMelee ? 0.4 : 0),
    rotation: isMelee ? 0 : Math.random() * 360,
    scale: isHeal ? (2.0 + Math.random() * 1.5) : (isCurse || isDefense) ? (1.5 + Math.random() * 2) : isMelee ? 3.5 : (3.5 + Math.random() * 1.5),
    speed: isHeal ? (1.5 + Math.random() * 1.0) : (isCurse || isDefense) ? (1.5 + Math.random() * 1.0) : isMelee ? 0.4 : (0.8 + Math.random() * 0.4),
    offset: Math.random() * 100
  }));

  const getIcon = (idx: number) => {
    const s = 64;
    if (isHeal) return <Heart className="text-emerald-400 fill-emerald-400/80" size={s} />;
    if (isCurse) return <Skull className="text-purple-600 fill-purple-900/40 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]" size={s} />;
    if (isDefense) return <ShieldIcon className="text-blue-400 fill-blue-500/40 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" size={s} />;
    if (isMelee) return (
      <svg viewBox="0 0 100 100" className="w-2 h-2 fill-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]">
        <path d="M50 0 C60 30 90 40 100 50 C90 60 60 70 50 100 C40 70 10 60 0 50 C10 40 40 30 50 0" />
      </svg>
    );

    if (subType === 'claw') {
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full fill-white drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] overflow-visible">
          <defs>
            <linearGradient id="clawGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff1a1a" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <motion.path
            initial={{ pathLength: 0, opacity: 0, scale: 0.6 }}
            animate={{ pathLength: 1, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            d="M32,10 C31,25 26,38 29,48 L23,46 C21,65 20,78 26,95 C33,75 36,45 34,5 Z"
            fill="url(#clawGrad)"
          />
          <motion.path
            initial={{ pathLength: 0, opacity: 0, scale: 0.6 }}
            animate={{ pathLength: 1, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
            d="M52,15 C51,30 46,43 49,53 L43,51 C41,70 40,83 46,100 C53,80 56,50 54,10 Z"
            fill="url(#clawGrad)"
          />
          <motion.path
            initial={{ pathLength: 0, opacity: 0, scale: 0.6 }}
            animate={{ pathLength: 1, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeInOut" }}
            d="M72,20 C71,35 66,48 69,58 L63,56 C61,75 60,88 66,105 C73,85 76,55 74,15 Z"
            fill="url(#clawGrad)"
          />
        </svg>
      );
    }

    const lt = getLoc(type).toLowerCase();
    if (lt.includes('ohn') || lt.includes('fire')) return <Flame className="text-orange-500 fill-orange-500/60" size={s} />;
    if (lt.includes('vod') || lt.includes('wat')) return <Droplets className="text-blue-500 fill-blue-500/60" size={s} />;
    if (lt.includes('ele') || lt.includes('zap')) return <Zap className="text-yellow-400 fill-yellow-400/60" size={s} />;
    if (lt.includes('pří') || lt.includes('nat') || lt.includes('leaf') || lt.includes('pri')) return <Leaf className="text-emerald-500 fill-emerald-500/60" size={s} />;
    return <Sword className="text-white/90 drop-shadow-2xl" size={s} />;
  };

  const startCoords = {
    left: fromSide === 'player' ? '25%' : '75%',
    top: fromSide === 'player' ? '75%' : '25%'
  };
  const targetCoords = {
    left: fromSide === 'player' ? '70%' : '30%',
    top: fromSide === 'player' ? '28%' : '68%'
  };

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{
            opacity: 0,
            scale: 0,
            left: (isCurse || isMelee) ? targetCoords.left : startCoords.left,
            top: (isCurse || isMelee) ? targetCoords.top : startCoords.top,
            x: '-50%',
            y: '-50%'
          }}
          animate={isHeal ? {
            opacity: [0, 1, 1, 1, 0],
            scale: [0.5, p.scale, p.scale, 0],
            top: [startCoords.top, `calc(${startCoords.top} - 35%)`],
            left: [startCoords.left, `calc(${startCoords.left} + ${(Math.random() - 0.5) * 20}%)`],
            rotate: [p.rotation, p.rotation + 45]
          } : isCurse ? {
            opacity: [0, 0.8, 1, 0.8, 0],
            scale: [0.2, p.scale, p.scale * 1.5, 0],
            x: ['-50%', `${-50 + Math.cos(p.rotation) * 80}%`, `${-50 + Math.cos(p.rotation + 180) * 120}%`],
            y: ['-50%', `${-50 + Math.sin(p.rotation) * 80}%`, `${-50 + Math.sin(p.rotation + 180) * 120}%`],
            rotate: [p.rotation, p.rotation + 360],
            filter: ["blur(0px)", "blur(2px)", "blur(5px)", "blur(0px)"]
          } : isDefense ? {
            opacity: [0, 0.9, 1, 0.9, 0],
            scale: [0, p.scale * 1.2, p.scale * 2.5],
            x: ['-50%', `${-50 + Math.cos(p.rotation) * 90}%`],
            y: ['-50%', `${-50 + Math.sin(p.rotation) * 90}%`],
            rotate: [p.rotation, p.rotation + 180],
          } : isMelee ? {
            opacity: [0, 1, 1, 0],
            scale: [0, p.scale * 1.2, p.scale * 0.8, 0],
            x: ['-50%', `${-50 + (fromSide === 'player' ? (-50 - Math.random() * 200) : (50 + Math.random() * 200))}%`],
            y: ['-50%', `${-50 + (fromSide === 'player' ? (50 + Math.random() * 200) : (-50 - Math.random() * 200))}%`],
            rotate: [0, Math.random() * 360],
            filter: ["blur(0px)", "blur(1px)", "blur(2px)"]
          } : {
            opacity: [0, 1, 1, 1, 0],
            scale: [0.5, p.scale, p.scale, 0],
            left: [startCoords.left, targetCoords.left],
            top: [startCoords.top, targetCoords.top],
            rotate: [p.rotation, p.rotation + 720]
          }}
          transition={{ duration: p.speed, delay: p.delay, ease: (isHeal || isDefense || isMelee) ? "easeOut" : "easeInOut" }}
          className="absolute drop-shadow-[0_0_30px_rgba(255,255,255,0.9)]"
        >
          {getIcon(p.id)}
        </motion.div>
      ))}
      {subType === 'claw' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, left: targetCoords.left, top: targetCoords.top, x: '-50%', y: '-50%', rotate: -25 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          className="absolute w-36 h-36 pointer-events-none z-[10001]"
        >
          {getIcon(0)}
        </motion.div>
      )}

      {isMelee && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, left: targetCoords.left, top: targetCoords.top, x: '-50%', y: '-50%', rotate: fromSide === 'player' ? 15 : -165 }}
          animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0.5, 1, 1.1, 1.2] }}
          transition={{ duration: 0.4, times: [0, 0.1, 0.6, 1], ease: "easeOut", delay: 0.4 }}
          className="absolute w-20 h-20 pointer-events-none z-[10005]"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full fill-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">
            <path d="M25,10 Q32,50 20,90 Q28,50 35,10 Z" />
            <path d="M48,5 Q55,50 43,95 Q51,50 58,5 Z" />
            <path d="M71,10 Q78,50 66,90 Q74,50 81,10 Z" />
          </svg>
        </motion.div>
      )}

      {/* Central "Casting" Flash for Curse/Defense */}
      {(isCurse || isDefense) && (
        <motion.div
          initial={{ opacity: 0, scale: 0, left: isCurse ? targetCoords.left : startCoords.left, top: isCurse ? targetCoords.top : startCoords.top, x: '-50%', y: '-50%' }}
          animate={{ opacity: [0, 0.8, 0], scale: [0, 2, 4] }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("absolute size-48 rounded-full blur-3xl z-[-1]", isCurse ? "bg-purple-600/30" : "bg-blue-600/30")}
        />
      )}
    </div>
  );
};

// --- Helpers ---
const getFinalStats = (m: Monster) => {
  const stats = { atk: m.stats?.attack || 10, def: m.stats?.defense || 10, hp: m.stats?.hp || 100 };
  const levelBonus = (val: number) => Math.floor(val * Math.max(0, m.level - 1) * 0.1);

  const getEquipmentBonus = (slots: (string | null)[] | undefined, type: 'atk' | 'def' | 'hp', baseVal: number) => {
    if (!slots) return 0;
    return slots.reduce((total, id) => {
      if (id) {
        const cfg = RESOURCE_CONFIG[id];
        if (cfg?.stats?.[type]) {
          const val = cfg.stats[type]!;
          const currentBase = baseVal + leveling[type];
          return total + (cfg.statsType === 'perc' ? Math.floor(currentBase * (val / 100)) : val);
        }
      }
      return total;
    }, 0);
  };

  const leveling = {
    atk: levelBonus(stats.atk),
    def: levelBonus(stats.def),
    hp: levelBonus(stats.hp)
  };
  const gems = {
    atk: getEquipmentBonus(m.gems, 'atk', stats.atk),
    def: getEquipmentBonus(m.gems, 'def', stats.def),
    hp: getEquipmentBonus(m.gems, 'hp', stats.hp)
  };
  const items = {
    atk: getEquipmentBonus(m.items, 'atk', stats.atk),
    def: getEquipmentBonus(m.items, 'def', stats.def),
    hp: getEquipmentBonus(m.items, 'hp', stats.hp)
  };

  const total = {
    atk: stats.atk + leveling.atk + gems.atk + items.atk,
    def: stats.def + leveling.def + gems.def + items.def,
    hp: stats.hp + leveling.hp + gems.hp + items.hp
  };
  return { base: stats, leveling, gems, items, total };
};

// --- Main Component ---
export const Battle = ({
  playerMonster, enemyMonster, isAlreadyCaught, opponentName, incomingEmote, pvpRole,
  incomingAttack, xpMultiplier = 1, isInventoryFull, inventory, onSendEmote, onSendAttack, onUseItem,
  onWin, onLose, onBack, onCatch, onCatchFail, isNewMonster, isTutorial
}: {
  playerMonster: Monster, enemyMonster: Monster, isAlreadyCaught?: boolean, opponentName?: string,
  incomingEmote?: string | null, pvpRole?: 'challenger' | 'defender',
  incomingAttack?: { dmg: number, isCrit: boolean, isSkill: boolean, isEffective: boolean, isWeak: boolean, isShield?: boolean, timestamp: number } | null,
  xpMultiplier?: number,
  isInventoryFull?: boolean,
  inventory?: { type: string, count: number }[],
  onSendEmote?: (emote: string) => void,
  onSendAttack?: (attackData: { dmg: number, isCrit: boolean, isSkill: boolean, isEffective: boolean, isWeak: boolean, isShield?: boolean, heal?: number, currentHP?: number }) => void,
  onUseItem?: (type: string) => void,
  onWin: (xp: number, loot: any[]) => void, onLose: (xp: number) => void, onBack: () => void,
  onCatch?: (monster: Monster, xp: number, spawnId?: string) => void, onCatchFail?: () => void,
  isNewMonster?: boolean, isTutorial?: boolean
}) => {
  const { t, i18n } = useTranslation();
  const [tutorialStep, setTutorialStep] = useState(0);
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'win' | 'lose'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit' | 'win' | 'lose'>('idle');
  const [screenShake, setScreenShake] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [catchAnim, setCatchAnim] = useState(false);
  const [catchPhase, setCatchPhase] = useState<'idle' | 'throwing' | 'shaking' | 'success' | 'fail'>('idle');
  const [catchResult, setCatchResult] = useState(false);
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [showEmotes, setShowEmotes] = useState(false);
  const [outgoingEmote, setOutgoingEmote] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showLoot, setShowLoot] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const [isChestOpened, setIsChestOpened] = useState(false);
  const [loot, setLoot] = useState<LootItem[]>([]);
  const [activeBurst, setActiveBurst] = useState<{ id: number, type: string | Localized<string>, fromSide: 'player' | 'enemy', subType: any } | null>(null);
  const [turn, setTurn] = useState<'player' | 'enemy'>(pvpRole ? (pvpRole === 'challenger' ? 'player' : 'enemy') : 'player');
  const [itemUsedInTurn, setItemUsedInTurn] = useState(false);
  const [turnTime, setTurnTime] = useState(50);
  const { isMuted, volume } = useSoundSystem();
  const audioCtxRef = useRef<AudioContext | null>(null);

  const resumeAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  }, []);


  // Tutorial phase is purely informational at the start now
  const isTutorialActive = isTutorial && tutorialStep < 9;
  const isTutorialPaused = isTutorialActive;

  useEffect(() => {
    if (turn === 'player') setItemUsedInTurn(false);
  }, [turn]);

  // --- Turn Timer ---
  useEffect(() => {
    if (showLoot || playerAnim !== 'idle' || enemyAnim !== 'idle' || isTutorialActive) return;
    const timer = setInterval(() => {
      setTurnTime(prev => {
        if (prev <= 1) {
          if (prev === 1) {
            addLog(t('battle.log.time_up'));
            setTurn(t => t === 'player' ? 'enemy' : 'player');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showLoot, turn, playerAnim, enemyAnim, isTutorialActive, isTutorialPaused]);

  useEffect(() => {
    setTurnTime(pvpRole ? 50 : 30);
  }, [turn, pvpRole]);

  const playerMaxHP = getMonsterMaxHP(playerMonster);
  const enemyMaxHP = isTutorial ? Math.round(getMonsterMaxHP(enemyMonster) / 2) : getMonsterMaxHP(enemyMonster);
  const [playerHP, setPlayerHP] = useState<number>(playerMonster.currentHP ?? playerMaxHP);
  const [enemyHP, setEnemyHP] = useState<number>(enemyMonster.currentHP ?? enemyMaxHP);
  const [playerEnergy, setPlayerEnergy] = useState<number>(20);
  const [shieldTurns, setShieldTurns] = useState(0);
  const [shieldPower, setShieldPower] = useState(0.4);
  const [enemyShieldTurns, setEnemyShieldTurns] = useState(0);
  const [enemyShieldPower, setEnemyShieldPower] = useState(0.4);
  const [enemyEffects, setEnemyEffects] = useState<StatusEffect[]>([]);
  const [playerEffects, setPlayerEffects] = useState<StatusEffect[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [winXP, setWinXP] = useState<number>(0);

  const addLog = (msg: string) => setLogs(p => [msg, ...p].slice(0, 3));
  const triggerShake = (isHeavy = false) => { setScreenShake(true); if (isHeavy) { setShowFlash(true); setTimeout(() => setShowFlash(false), 80); } setTimeout(() => setScreenShake(false), 300); };
  const addPopup = (val: number, isEnemySide: boolean, extras: any = {}) => {
    const p = { id: Date.now() + Math.random(), value: val, isPlayerSide: !isEnemySide, ...extras };
    setPopups(prev => [...prev, p]);
    setTimeout(() => setPopups(prev => prev.filter(item => item.id !== p.id)), 1200);
  };

  const isLowHP = playerHP / playerMaxHP < 0.28 && playerHP > 0;

  const {
    playAttack, playHit, playCritical, playHeal, playSlash,
    playVictory, playDefeat, playDeath, playCatch, playClick,
    playBattleMusic, stopBattleMusic, playSpell, playLevelUp
  } = useGameSound(isLowHP);

  useEffect(() => {
    playBattleMusic();
    return () => stopBattleMusic();
  }, [playBattleMusic, stopBattleMusic]);


  // --- Heartbeat Logic ---
  useEffect(() => {
    if (!isLowHP || isMuted || showLoot || showDefeat || playerAnim === 'lose') return;

    const intervalId = setInterval(() => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const playThump = (freq: number, vol: number, dur: number, delay: number) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          osc.frequency.exponentialRampToValueAtTime(1, ctx.currentTime + delay + dur);

          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(vol * volume * 5.0, ctx.currentTime + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + dur + 0.1);
        } catch (e) { }
      };

      playThump(160, 1.0, 0.22, 0);
      playThump(130, 0.7, 0.25, 0.35);
    }, 1200);

    return () => {
      clearInterval(intervalId);
    };
  }, [playerHP, playerMaxHP, isMuted, volume, showLoot, showDefeat, playerAnim]);

  const npcAttackTriggeredRef = useRef(false);
  useEffect(() => {
    if (turn === 'player') npcAttackTriggeredRef.current = false;
  }, [turn]);

  const handleSendEmote = (emote: string) => {
    setOutgoingEmote(emote);
    onSendEmote?.(emote);
    setShowEmotes(false);
    setTimeout(() => setOutgoingEmote(null), 2500);
  };

  const calculateDamage = useCallback((attacker: Monster, defender: Monster, isSkill = false, abilityIdx: number = -1) => {
    const s = getFinalStats(attacker), d = getFinalStats(defender);

    if (isTutorial && attacker === enemyMonster) { s.total.atk *= 0.5; }
    if (isTutorial && defender === enemyMonster) { d.total.def *= 0.5; }

    // Wild monster damage reduction for low levels
    let wildMult = 1;
    if (attacker === enemyMonster && !pvpRole && !isTutorial) {
      if (attacker.level === 1) wildMult = 0.75;
      else if (attacker.level === 2) wildMult = 0.80;
      else if (attacker.level === 3) wildMult = 0.85;
    }

    const ability = isSkill ? attacker.abilities?.[abilityIdx] : null;

    // Normal attack multiplier is 0.8
    let mult = 0.8;

    if (isSkill && ability) {
      if (ability.type === 'extra') {
        // "Extra" type adds its percentage to the base attack (0.8 + (value/100))
        mult = 0.8 + ((ability.value ?? 40) / 100);
      } else {
        // Other skills use their percentage as an absolute multiplier
        mult = (ability.value ?? 155) / 100;
      }
    }

    const isCrit = Math.random() < (isSkill ? 0.35 : 0.1);
    let typeMult = 1, isEffective = false, isWeak = false;
    const match = TYPE_MATCHUP[getLoc(attacker.type, 'cz')];
    if (match) {
      if (match.strong === getLoc(defender.type, 'cz')) {
        if (Math.random() < 0.3) {
          typeMult = ADVANTAGE_MULT;
          isEffective = true;
        }
      }
      else if (match.weak === getLoc(defender.type, 'cz')) {
        typeMult = WEAKNESS_MULT;
        isWeak = true;
      }
    }
    const base = Math.round((s.total.atk * mult - d.total.def * 0.45) * (0.9 + Math.random() * 0.2));
    let dmg = Math.max(Math.floor(s.total.atk * 0.1), base) * typeMult;

    // Use latest effects if available
    const attackerEffects = attacker === playerMonster ? playerEffects : enemyEffects;
    if (attackerEffects.some(e => e.type === 'slow')) dmg *= 0.7;
    if (isCrit) dmg *= 1.6;
    dmg *= wildMult;

    if (defender === playerMonster && shieldTurns > 0) dmg *= shieldPower;
    if (attacker === playerMonster && enemyShieldTurns > 0) dmg *= enemyShieldPower;
    return { dmg: Math.round(dmg), isCrit, isEffective, isWeak };
  }, [playerMonster, shieldTurns, enemyShieldTurns, playerEffects, enemyEffects]);

  const estimateDamage = useCallback((attacker: Monster, defender: Monster, isSkill = false, abilityIdx: number = -1) => {
    const s = getFinalStats(attacker), d = getFinalStats(defender);

    if (isTutorial && attacker === enemyMonster) { s.total.atk *= 0.5; }
    if (isTutorial && defender === enemyMonster) { d.total.def *= 0.5; }

    // Wild monster damage reduction for low levels
    let wildMult = 1;
    if (attacker === enemyMonster && !pvpRole && !isTutorial) {
      if (attacker.level === 1) wildMult = 0.75;
      else if (attacker.level === 2) wildMult = 0.80;
      else if (attacker.level === 3) wildMult = 0.85;
    }

    const ability = isSkill ? attacker.abilities?.[abilityIdx] : null;

    // Normal attack multiplier is 0.8
    let mult = 0.8;

    if (isSkill && ability) {
      if (ability.type === 'extra') {
        // "Extra" type adds its percentage to the base attack (0.8 + (value/100))
        mult = 0.8 + ((ability.value ?? 40) / 100);
      } else {
        // Other skills use their percentage as an absolute multiplier
        mult = (ability.value ?? 155) / 100;
      }
    }

    const base = Math.round((s.total.atk * mult - d.total.def * 0.45));
    let dmg = Math.max(Math.floor(s.total.atk * 0.1), base) * wildMult;
    if (defender === playerMonster && shieldTurns > 0) dmg *= shieldPower;
    if (attacker === playerMonster && enemyShieldTurns > 0) dmg *= enemyShieldPower;
    return Math.round(dmg);
  }, [playerMonster, shieldTurns, enemyShieldTurns]);

  const executeAttack = (abilityIdx: number = -1) => {
    if (turn !== 'player' || playerAnim !== 'idle' || enemyHP <= 0 || catchAnim) return;
    const isSkill = abilityIdx >= 0;
    const ability = isSkill ? playerMonster.abilities?.[abilityIdx] : null;
    const cost = isSkill ? (ability?.type === 'attack' ? 50 : 30) : 0;
    if (isSkill && playerEnergy < cost) return;
    setShowSkills(false);
    setShowItems(false);

    // Tutorial progress
    if (isTutorial) {
      if (tutorialStep === 3) setTutorialStep(4);
      else if (tutorialStep === 4) setTutorialStep(5);
    }

    setPlayerAnim('attack');
    triggerHaptic('medium');
    if (isSkill) {
      if (ability?.type !== 'attack') playSpell();
      setActiveBurst({ id: Date.now(), type: playerMonster.type, fromSide: 'player', subType: ability?.type });
      setTimeout(() => setActiveBurst(null), 3000);
    } else {
      playAttack();
      setActiveBurst({ id: Date.now(), type: playerMonster.type, fromSide: 'player', subType: 'claw' });
      setTimeout(() => setActiveBurst(null), 1000);
    }

    if (isSkill) setPlayerEnergy(p => Math.max(0, p - cost)); else setPlayerEnergy(p => Math.min(100, p + 25));
    setTimeout(() => {
      let healValue = 0;
      // Periodic effects execution
      playerEffects.forEach(e => {
        if (e.type === 'burn') { const bd = Math.round(playerMaxHP * 0.05); setPlayerHP(p => Math.max(0, p - bd)); addPopup(bd, false); }
        if (e.type === 'curse') { const cd = Math.round((e.casterAtk || 10) * ((e.value || 20) / 100)); setPlayerHP(p => Math.max(0, p - cd)); addPopup(cd, false); }
        if (e.type === 'regen') { const rh = Math.round(playerMaxHP * ((e.value || 10) / 100)); setPlayerHP(p => Math.min(playerMaxHP, p + rh)); addPopup(rh, false, { isHeal: true }); }
      });

      const res = calculateDamage(playerMonster, enemyMonster, isSkill, abilityIdx);
      let dmg = res.dmg;
      const currentEffects = turn === 'player' ? playerEffects : enemyEffects;
      const debuffEffect = currentEffects.find(e => e.type === 'debuff');
      const missPenalty = debuffEffect ? (debuffEffect.value || 40) : 0;
      const hitChance = Math.max(ability?.chance || 100, 50) - missPenalty;

      if (ability && Math.random() > hitChance / 100) {
        addLog(t('battle.log.missed', { name: getLoc(ability.name, i18n.language) }));
        addPopup(0, true, { isMiss: true });
        dmg = 0;
      }
      else if (ability?.type === 'heal') {
        const hAmt = Math.round(playerMaxHP * ((ability.value || 15) / 100));
        healValue = hAmt;
        setPlayerHP(p => Math.min(playerMaxHP, p + hAmt));
        addPopup(hAmt, false, { isHeal: true });
        playHeal();
        dmg = 0;
      }
      else if (ability?.type === 'defense') { setShieldTurns(2); setShieldPower(1 - (ability.value || 60) / 100); dmg = 0; }
      else if (ability?.type === 'curse') {
        const s = getFinalStats(playerMonster);
        setEnemyEffects(p => [...p, { type: 'curse', duration: 2, value: ability.value || 20, casterAtk: s.total.atk }]);
        dmg = 0; addLog(t('battle.log.curse_cast'));
      }
      else if (ability?.type === 'debuff') {
        setEnemyEffects(p => [...p, { type: 'debuff', duration: 2, value: ability.value || 40 }]);
        dmg = 0; addLog(t('battle.log.debuff_cast'));
      }
      else if (isSkill && ability?.type === 'attack') {
        setTimeout(() => playSlash(), 100);
        setTimeout(() => playSlash(), 700);
      }
      else if (ability?.type === 'regen') { setPlayerEffects(p => [...p, { type: 'regen', duration: 2, value: ability.value || 10 }]); dmg = 0; addLog(t('battle.log.regen_active')); }

      // Tutorial logic: Prevent death, force 1 HP
      if (isTutorial && enemyHP - dmg <= 0) {
        setEnemyHP(0);
        if (tutorialStep < 6) {
          setTutorialStep(6); // Move to Catching step
          setTurn('player'); // Force player turn for catching
        }
      } else if (dmg > 0) {
        setEnemyHP(p => Math.max(0, p - dmg));
      }

      setEnemyAnim('hit');
      addPopup(dmg, true, res);
      triggerShake(res.isCrit || isSkill);

      if (res.isCrit) playCritical();
      else playHit();

      if (res.isEffective && Math.random() < 0.6) {
        const typeCz = getLoc(playerMonster.type, 'cz');
        if (typeCz === 'Ohnivá') { setEnemyEffects(p => [...p, { type: 'burn', duration: 2 }]); addLog(t('battle.log.burned')); }
        else if (typeCz === 'Vodní') { setEnemyEffects(p => [...p, { type: 'slow', duration: 2 }]); addLog(t('battle.log.slowed')); }
        else if (typeCz === 'Elektrická') { setEnemyEffects(p => [...p, { type: 'paralyze', duration: 1 }]); addLog(t('battle.log.paralyzed')); }
      }
      setPlayerEffects(p => p.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0));
      if (pvpRole && onSendAttack) {
        onSendAttack({
          ...res,
          heal: healValue,
          currentHP: playerHP + healValue,
          isSkill,
          isShield: ability?.type === 'defense'
        });
      }
      setTimeout(() => {
        setEnemyAnim('idle'); setPlayerAnim('idle');
        const wouldDie = enemyHP - dmg <= 0;
        if (wouldDie) {
          playDeath();
          setEnemyAnim('lose');
          setPlayerAnim('win');
          playVictory();
          setWinXP(Math.round((80 + enemyMonster.level * 15) * xpMultiplier));

          // NEW DYNAMIC LOOT GENERATION
          const generatedLoot: any[] = [];

          const rStr = (getLoc(enemyMonster.rarity) || '').toLowerCase();
          const isEpic = rStr.includes('epic') || rStr.includes('epick');
          const isRare = rStr.includes('rare') || rStr.includes('vzacn');
          const isCommon = !isEpic && !isRare;

          const getLootFromPool = (rarity: string, category?: string) => {
            const pool = Object.keys(RESOURCE_CONFIG)
              .filter(id => {
                const cfg = RESOURCE_CONFIG[id];
                const matchRarity = cfg.rarity === rarity;
                const matchCategory = !category || cfg.category === category;
                return matchRarity && matchCategory;
              })
              .map(id => ({ id, weight: RESOURCE_CONFIG[id].dropWeight ?? 10 }));

            if (pool.length === 0) {
              // Fallback if no items in that category exist for that rarity
              if (category) return getLootFromPool(rarity);
              return null;
            }
            const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
            let r = Math.random() * totalWeight;
            for (const item of pool) {
              if (r < item.weight) return item.id;
              r -= item.weight;
            }
            return pool[0].id;
          };

          const addLootItem = (targetRarity: string, category?: string) => {
            const id = getLootFromPool(targetRarity, category);
            if (!id) return;
            const cfg = RESOURCE_CONFIG[id];
            const min = cfg.dropMin ?? 1;
            const max = cfg.dropMax ?? 1;
            const count = min + Math.floor(Math.random() * (max - min + 1));
            generatedLoot.push({ id: id + '_' + Math.random(), type: id, count, collected: false });
          };

          // Loot Logic:
          if (isCommon) {
            // 80% Resource (material)
            if (Math.random() < 0.8) addLootItem('common', 'material');
            // 10% Gem or Relic (or just small chance for anything extra)
            if (Math.random() < 0.1) {
              const rand = Math.random();
              if (rand < 0.5) addLootItem('common', 'gem');
              else addLootItem('common', 'relic');
            }
            // Bonus material chance
            if (Math.random() < 0.15) addLootItem('common', 'material');
          }
          else if (isRare) {
            addLootItem('common', 'material');
            addLootItem('rare', 'material');
            if (Math.random() < 0.3) {
              const rand = Math.random();
              if (rand < 0.4) addLootItem('common', 'relic');
              else if (rand < 0.8) addLootItem('rare', 'gem');
              else addLootItem('rare', 'relic');
            }
          }
          else if (isEpic) {
            addLootItem('rare', 'material');
            addLootItem('rare', 'material');
            addLootItem('epic', 'material');
            if (Math.random() < 0.5) {
              const rand = Math.random();
              if (rand < 0.5) addLootItem('rare', 'relic');
              else addLootItem('epic', 'relic');
            }
            if (Math.random() < 0.02) addLootItem('legendary');
          }

          setLoot(generatedLoot);
          setTimeout(() => setShowLoot(true), 1200);
        }
        else setTurn('enemy');
      }, 400);
    }, 400);
  };

  const executeCatch = () => {
    if (turn !== 'player' || playerAnim !== 'idle' || catchAnim) return;
    if (enemyHP <= 0) return;
    
    const hpRatio = enemyHP / enemyMaxHP;
    const chance = Math.min(0.95, 0.95 * Math.pow(1 - hpRatio, 2.6));
    const success = Math.random() < chance;
    setCatchResult(success);
    
    setCatchAnim(true);
    triggerHaptic('light');
    setCatchPhase('throwing');
    playSpell();
    
    setTimeout(() => {
       setCatchPhase('shaking');
       playHit();
       
       setTimeout(() => {
           if (success) { 
              setCatchPhase('success');
              playLevelUp();
              const catchXp = Math.round((80 + enemyMonster.level * 15) * xpMultiplier * 1.2);
              setTimeout(() => { onCatch?.(enemyMonster, catchXp); setCatchAnim(false); setCatchPhase('idle'); }, 1500); 
           } else { 
              setCatchPhase('fail');
              playCatch(false);
              setEnemyAnim('hit');
              setTimeout(() => {
                  setCatchAnim(false); 
                  setCatchPhase('idle');
                  onCatchFail?.(); 
                  setLogs(p => [t('toasts.escaped'), ...p].slice(0, 3));
                  setTurn('enemy'); 
              }, 1000);
           }
       }, 1600); // 1.6s shaking phase
    }, 600); // 0.6s throwing phase
  };

  useEffect(() => {
    // PAUSE NPC turn logic during tutorial if we are showing information
    if (turn === 'enemy' && enemyHP > 0 && playerHP > 0 && !pvpRole && !npcAttackTriggeredRef.current && !isTutorialPaused) {
      npcAttackTriggeredRef.current = true;
      const timer = setTimeout(() => {
        if (enemyEffects.some(e => e.type === 'paralyze')) {
          addLog(t('battle.log.paralyzed'));
          setEnemyEffects(p => p.map(e => e.type === 'paralyze' ? { ...e, duration: e.duration - 1 } : e).filter(e => e.duration > 0));
          setTurn('player');
          return;
        }

        const abilities = enemyMonster.abilities || [];
        const skillIdx = abilities.length > 0 && Math.random() < 0.25 ? Math.floor(Math.random() * abilities.length) : -1;
        const isSkill = skillIdx >= 0;
        const ability = isSkill ? abilities[skillIdx] : null;

        setEnemyAnim('attack');
        if (isSkill) {
          if (ability?.type !== 'attack') playSpell();
          setActiveBurst({ id: Date.now(), type: enemyMonster.type, fromSide: 'enemy', subType: ability?.type });
          setTimeout(() => setActiveBurst(null), 3000);
        } else {
          playAttack();
          setActiveBurst({ id: Date.now(), type: enemyMonster.type, fromSide: 'enemy', subType: 'claw' });
          setTimeout(() => setActiveBurst(null), 1000);
        }

        setTimeout(() => {
          enemyEffects.forEach(e => {
            if (e.type === 'burn') { const bd = Math.round(enemyMaxHP * 0.05); setEnemyHP(p => Math.max(0, p - bd)); addPopup(bd, true); }
            if (e.type === 'curse') { const cd = Math.round((e.casterAtk || 10) * ((e.value || 20) / 100)); setEnemyHP(p => Math.max(0, p - cd)); addPopup(cd, true); }
            if (e.type === 'regen') { const rh = Math.round(enemyMaxHP * ((e.value || 10) / 100)); setEnemyHP(p => Math.min(enemyMaxHP, p + rh)); addPopup(rh, true, { isHeal: true }); }
          });

          const res = calculateDamage(enemyMonster, playerMonster, isSkill, skillIdx);
          let dmg = res.dmg;

          // Special Skill Logic for NPC
          const debuffEffect = enemyEffects.find(e => e.type === 'debuff');
          const missPenalty = debuffEffect ? (debuffEffect.value || 40) : 0;
          const hitChance = Math.max(ability?.chance || 100, 50) - missPenalty;

          if (ability && Math.random() > hitChance / 100) {
            addLog(t('battle.log.missed', { name: getLoc(enemyMonster.name, i18n.language) }));
            addPopup(0, false, { isMiss: true });
            dmg = 0;
          }
          else if (ability?.type === 'heal') {
            const heal = Math.round(enemyMaxHP * ((ability.value || 15) / 100));
            setEnemyHP(p => Math.min(enemyMaxHP, p + heal));
            addPopup(heal, true, { isHeal: true });
            playHeal();
            dmg = 0;
          }
          else if (ability?.type === 'defense') { setEnemyShieldTurns(2); setEnemyShieldPower(1 - (ability.value || 60) / 100); dmg = 0; addLog(t('battle.log.defending', { name: getLoc(enemyMonster.name, i18n.language) })); }
          else if (ability?.type === 'curse') {
            const s = getFinalStats(enemyMonster);
            setPlayerEffects(p => [...p, { type: 'curse', duration: 2, value: ability.value || 20, casterAtk: s.total.atk }]);
            dmg = 0; addLog(t('battle.log.curse_applied', { name: getLoc(enemyMonster.name, i18n.language) }));
          }
          else if (ability?.type === 'debuff') {
            setPlayerEffects(p => [...p, { type: 'debuff', duration: 2, value: ability.value || 40 }]);
            dmg = 0; addLog(t('battle.log.debuff_applied', { name: getLoc(enemyMonster.name, i18n.language) }));
          }
          if (isSkill && ability?.type === 'attack') {
            setTimeout(() => playSlash(), 100);
            setTimeout(() => playSlash(), 700);
          }
          else if (ability?.type === 'regen') { setEnemyEffects(p => [...p, { type: 'regen', duration: 2, value: ability.value || 10 }]); dmg = 0; addLog(t('battle.log.regen_active')); }

          if (dmg > 0) {
            setPlayerHP(p => Math.max(0, p - dmg)); setPlayerAnim('hit'); addPopup(dmg, false, res); triggerShake(res.isCrit);
            if (shieldTurns > 0) setShieldTurns(p => p - 1);
            if (res.isCrit) playCritical(); else playHit();
          }

          setEnemyEffects(p => p.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0));
          if (enemyShieldTurns > 0) setEnemyShieldTurns(p => p - 1);

          setTimeout(() => {
            setEnemyAnim('idle'); setPlayerAnim('idle');
            if (playerHP - dmg <= 0) {
              playDeath();
              setPlayerAnim('lose');
              playDefeat();
              const loseXP = Math.floor((80 + enemyMonster.level * 15) / 3);
              setWinXP(loseXP);
              setTimeout(() => setShowDefeat(true), 1200);
            } else setTurn('player');
          }, 400);
        }, 400);
      }, 1500); // Shorter delay for better flow
      return () => clearTimeout(timer);
    }
  }, [turn, pvpRole, isTutorialPaused]); // Added isTutorialPaused to resume combat after tutorial


  const lastAttackTime = useRef<number>(0);
  useEffect(() => {
    if (incomingAttack && pvpRole && incomingAttack.timestamp !== lastAttackTime.current) {
      lastAttackTime.current = incomingAttack.timestamp;
      if (incomingAttack.isShield) {
        setEnemyShieldTurns(2); setLogs(p => [t('battle.log.enemy_shield'), ...p]);
        setTimeout(() => setTurn('player'), 1200); return;
      }
      setTurn('enemy'); setEnemyAnim('attack');
      if (incomingAttack.isSkill) {
        playSpell();
        setActiveBurst({ id: Date.now(), type: enemyMonster.type, fromSide: 'enemy', subType: incomingAttack.isShield ? 'defense' : 'attack' });
        setTimeout(() => setActiveBurst(null), 3000);
      } else {
        playAttack();
      }
      setTimeout(() => {
        const hVal = (incomingAttack as any).heal || 0;
        if (hVal > 0) {
          setEnemyHP(p => Math.min(enemyMaxHP, p + hVal));
          addPopup(hVal, false, { isHeal: true, isPlayerSide: false });
        }

        if (typeof (incomingAttack as any).currentHP === 'number') {
          setEnemyHP((incomingAttack as any).currentHP);
        }

        setPlayerHP(p => Math.max(0, p - incomingAttack.dmg)); setPlayerAnim('hit'); addPopup(incomingAttack.dmg, false, incomingAttack);
        if (incomingAttack.isCrit) playCritical(); else playHit();
        if (shieldTurns > 0) setShieldTurns(p => p - 1);
        if (enemyShieldTurns > 0) setEnemyShieldTurns(p => p - 1);
        setTimeout(() => { setPlayerAnim('idle'); setEnemyAnim('idle'); if (playerHP - incomingAttack.dmg <= 0) { playDeath(); setPlayerAnim('lose'); setTimeout(() => onLose(Math.floor((80 + enemyMonster.level * 15) / 3)), 1200); } else setTurn('player'); }, 400);
      }, 400);
    }
  }, [incomingAttack, pvpRole, playerHP, shieldTurns, enemyShieldTurns, onLose]);

  return (
    <motion.div
      animate={screenShake ? { x: [-3, 3, -3, 3, 0], y: [1, -1, 1, -1, 0] } : {}}
      onMouseDown={resumeAudio}
      className="fixed inset-0 z-[9000] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none"
    >
      {/* ARENA BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img src="/battle_arena_background_1774157568210.png" className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105 saturate-[1.6] contrast-[1.2] brightness-[0.8]" alt="arena" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-transparent to-slate-950/95" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(transparent_0%,rgba(13,185,242,0.08)_100%)] border-t border-primary/10 perspective-[1000px]">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(13,185,242,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(13,185,242,0.4) 1px, transparent 1px)', backgroundSize: '60px 60px', transform: 'rotateX(60deg) translateY(-20%)', transformOrigin: 'top' }} />
        </div>
        <AnimatePresence>{showFlash && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white z-[50]" />}</AnimatePresence>
        <div className="absolute inset-0 z-10 opacity-30">
          {[...Array(20)].map((_, i) => (
            <motion.div key={i} initial={{ x: Math.random() * 100 + '%', y: Math.random() * 80 + 20 + '%', opacity: Math.random() * 0.5 + 0.2 }} animate={{ y: [null, '-=15%'], opacity: [null, 0, 0.4, 0] }} transition={{ duration: Math.random() * 4 + 4, repeat: Infinity }} className="absolute size-1.5 bg-primary rounded-full blur-[1.5px]" />
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-[5000] px-6 pt-3 pb-2 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-[8px] font-black text-white uppercase tracking-[0.4em] opacity-40 leading-none mb-1">{t("battle.arena_name")}</h2>
          {logs[0] && <motion.p key={logs[0]} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[9px] font-black text-primary uppercase italic truncate max-w-[150px]">{logs[0]}</motion.p>}
        </div>

        <div className="flex gap-2">
          {onSendEmote && (
            <div className="relative">
              <button onClick={() => setShowEmotes(!showEmotes)} className="p-1.5 rounded-full bg-slate-800/80 text-yellow-500 border border-white/5 active:scale-90"><Smile size={16} /></button>
              <AnimatePresence>{showEmotes && <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0 }} className="absolute top-12 right-0 grid grid-cols-4 gap-2 bg-slate-900/95 border border-white/20 p-2.5 rounded-2xl shadow-3xl backdrop-blur-xl z-[7000] min-w-[200px]">{['🤬', '🖕', '💩', '🤣', '🔥', '💎', '💀', '⚡'].map(e => <button key={e} onClick={() => handleSendEmote(e)} className="size-11 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl text-2xl transition-all active:scale-90">{e}</button>)}</motion.div>}</AnimatePresence>
            </div>
          )}
          <button onClick={onBack} className="p-1.5 rounded-full bg-slate-800/80 text-slate-400 border border-white/5"><X size={16} /></button>
        </div>
      </div>

      {/* Battle Scene */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden perspective-[1200px]">
        <AnimatePresence>
          {catchAnim && (
            <div className="absolute inset-0 z-[500] pointer-events-none overflow-hidden">
              {/* 1. CINEMATIC OVERLAY (Dimming the world) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 z-[390]"
              />

              {/* 2. CAGE SHADOW */}
              <motion.div
                initial={{ left: '25%', top: '75%', scale: 0, opacity: 0 }}
                animate={
                  catchPhase === 'throwing' ? { left: '73%', top: '24%', scale: 1, opacity: 0.8 } :
                  catchPhase === 'shaking' ? { left: '73%', top: '24%', scale: 1, opacity: 0.8 } :
                  catchPhase === 'success' ? { left: '73%', top: '24%', scale: 0.8, opacity: 0.6 } :
                  catchPhase === 'fail' ? { left: '73%', top: '24%', scale: 1, opacity: 0 } :
                  { scale: 0, opacity: 0 }
                }
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-[391] w-28 h-8 bg-black blur-md rounded-[100%]"
              />

              {/* 3. THE FLYING CAGE */}
              <motion.div
                initial={{ left: '25%', top: '75%', scale: 0.5, rotate: -45 }}
                animate={
                  catchPhase === 'throwing' ? { 
                    left: '73%', 
                    top: '24%', 
                    scale: 1, 
                    rotate: 0,
                    x: [0, 100, 0], // Slight arc
                    y: [0, -150, 0] // High arc
                  } :
                  catchPhase === 'shaking' && catchResult ? { 
                    left: '73%', top: '24%', 
                    scale: 1,
                    rotateZ: [0, 5, -5, 6, -6, 4, -4, 5, -5, 3, -3, 2, -2, 0]
                  } :
                  catchPhase === 'shaking' && !catchResult ? { 
                    left: '73%', top: '24%', 
                    scale: 1,
                    rotateZ: [0, 8, -8, 9, -9, 7, -7, 8, -8, 5, -5, 4, -4, 0]
                  } :
                  catchPhase === 'success' ? { 
                    left: '73%', top: '24%', 
                    scale: 1, filter: 'brightness(1.5)' 
                  } :
                  catchPhase === 'fail' ? { 
                    left: '73%', top: '24%', 
                    opacity: 0, scale: 1.2
                  } : { left: '73%', top: '24%', scale: 1 }
                }
                transition={{ 
                  duration: catchPhase === 'throwing' ? 0.6 : catchPhase === 'shaking' ? 1.6 : 0.4,
                  ease: catchPhase === 'throwing' ? "circOut" : "easeInOut"
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-[500]"
                style={{ transformOrigin: 'bottom center' }}
              >
                {/* Shared Gradients & Filters */}
                <svg width="0" height="0" className="absolute">
                  <defs>
                    <linearGradient id="iron" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="20%" stopColor="#475569" />
                      <stop offset="50%" stopColor="#94a3b8" />
                      <stop offset="80%" stopColor="#475569" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="iron-vert" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0f172a" />
                      <stop offset="30%" stopColor="#64748b" />
                      <stop offset="70%" stopColor="#334155" />
                      <stop offset="100%" stopColor="#020617" />
                    </linearGradient>
                    <filter id="rune-glow">
                      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                </svg>

                {/* Stunning 3D SVG Cage */}
                <svg viewBox="0 0 100 100" className={cn("w-36 h-36 drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] overflow-visible", catchPhase === 'fail' ? "hidden" : "block")}>
                  
                  {/* Back bars */}
                  <rect x="20" y="30" width="60" height="60" fill="none" stroke="#0f172a" strokeWidth="3" rx="1.5" opacity="0.7" />
                  <line x1="35" y1="30" x2="35" y2="90" stroke="#0f172a" strokeWidth="3" opacity="0.7" />
                  <line x1="65" y1="30" x2="65" y2="90" stroke="#0f172a" strokeWidth="3" opacity="0.7" />
                  <path d="M20,30 Q50,5 80,30" fill="none" stroke="#0f172a" strokeWidth="3" opacity="0.7" />

                  {/* Main Frame Base & Top */}
                  <rect x="12" y="85" width="76" height="10" fill="url(#iron)" rx="3" />
                  <rect x="15" y="25" width="70" height="8" fill="url(#iron)" rx="2" />
                  
                  {/* Front Bars */}
                  <rect x="26" y="30" width="6" height="58" fill="url(#iron-vert)" rx="3" />
                  <rect x="47" y="30" width="6" height="58" fill="url(#iron-vert)" rx="3" />
                  <rect x="68" y="30" width="6" height="58" fill="url(#iron-vert)" rx="3" />

                  {/* Cross Bar */}
                  <rect x="15" y="55" width="70" height="6" fill="url(#iron)" rx="2" />

                  {/* Front Dome */}
                  <path d="M15,28 Q50,-5 85,28" fill="none" stroke="url(#iron)" strokeWidth="6" strokeLinecap="round" />
                  <path d="M30,28 Q50,5 70,28" fill="none" stroke="url(#iron)" strokeWidth="4" strokeLinecap="round" />
                  
                  {/* Hanging Ring */}
                  <circle cx="50" cy="5" r="8" fill="none" stroke="url(#iron)" strokeWidth="4" />
                  <rect x="46" y="11" width="8" height="6" fill="url(#iron)" rx="2" />

                  {/* Magical Runes */}
                  <g filter="url(#rune-glow)">
                    <path d="M 48 57 L 52 57 L 50 60 Z" fill="#38bdf8" />
                    <path d="M 27 57 L 31 57 L 29 60 Z" fill="#38bdf8" />
                    <path d="M 69 57 L 73 57 L 71 60 Z" fill="#38bdf8" />
                    <circle cx="50" cy="90" r="1.5" fill="#38bdf8" />
                    <circle cx="30" cy="90" r="1.5" fill="#38bdf8" />
                    <circle cx="70" cy="90" r="1.5" fill="#38bdf8" />
                  </g>
                </svg>

                {/* Broken Cage Parts (Only visible on fail) */}
                {catchPhase === 'fail' && (
                  <div className="absolute inset-0 w-36 h-36">
                     {/* Top Dome */}
                     <motion.div initial={{ x: 0, y: 0, rotate: 0 }} animate={{ x: -20, y: -150, rotate: -45, opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
                       <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                         <path d="M15,28 Q50,-5 85,28" fill="none" stroke="url(#iron)" strokeWidth="6" strokeLinecap="round" />
                         <circle cx="50" cy="5" r="8" fill="none" stroke="url(#iron)" strokeWidth="4" />
                         <rect x="46" y="11" width="8" height="6" fill="url(#iron)" rx="2" />
                       </svg>
                     </motion.div>
                     {/* Left Bars */}
                     <motion.div initial={{ x: 0, y: 0, rotate: 0 }} animate={{ x: -100, y: 50, rotate: -30, opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
                       <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                         <rect x="26" y="30" width="6" height="58" fill="url(#iron-vert)" rx="3" />
                         <rect x="15" y="25" width="30" height="8" fill="url(#iron)" rx="2" />
                       </svg>
                     </motion.div>
                     {/* Right Bars */}
                     <motion.div initial={{ x: 0, y: 0, rotate: 0 }} animate={{ x: 100, y: 50, rotate: 30, opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
                       <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                         <rect x="68" y="30" width="6" height="58" fill="url(#iron-vert)" rx="3" />
                         <rect x="55" y="25" width="30" height="8" fill="url(#iron)" rx="2" />
                       </svg>
                     </motion.div>
                     {/* Base and Middle */}
                     <motion.div initial={{ x: 0, y: 0, rotate: 0 }} animate={{ x: 0, y: 100, rotate: 15, opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
                       <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                         <rect x="47" y="30" width="6" height="58" fill="url(#iron-vert)" rx="3" />
                         <rect x="15" y="55" width="70" height="6" fill="url(#iron)" rx="2" />
                         <rect x="12" y="85" width="76" height="10" fill="url(#iron)" rx="3" />
                       </svg>
                     </motion.div>
                  </div>
                )}
                
                {/* Success Flash inside cage */}
                {catchPhase === 'success' && (
                  <motion.div initial={{ opacity: 1, scale: 0 }} animate={{ opacity: 0, scale: 3 }} transition={{ duration: 1 }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Sparkles className="text-yellow-300 w-full h-full drop-shadow-[0_0_10px_yellow]" />
                  </motion.div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><h1 className="text-[200px] font-black italic text-white/40 tracking-tighter">VS</h1></motion.div>

        {/* ENEMY (TOP RIGHT) */}
        <div className="absolute top-[6%] right-[6%] flex flex-col items-end w-full max-w-[180px] z-20">
          <div id="tutorial-enemy-stats" className="w-full bg-slate-900/70 backdrop-blur-xl p-2.5 rounded-xl border border-red-500/10 shadow-2xl mb-4 transform -rotate-1 relative">
            <RarityBadge rarity={enemyMonster.rarity || ''} />
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5 overflow-hidden min-w-0 pl-5">
                <TypeIcon type={enemyMonster.type} />
                <span className="text-[10px] font-black text-white uppercase truncate">{getLoc(enemyMonster.name, i18n.language)}</span>
              </div>
              <span className="text-[8px] font-black text-red-500">Lv {enemyMonster.level}</span>
            </div>
            <HealthBar current={enemyHP} max={enemyMaxHP} label="HP" colorClass="bg-gradient-to-r from-red-600 to-rose-400" shadowColor="rgba(239,68,68,0.4)" />
            <div className="flex justify-between items-center mt-1.5 px-0.5">
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <Sword size={8} className="text-red-400" />
                  <span className="text-[9px] font-black text-white italic">
                    {getFinalStats(enemyMonster).total.atk}
                    <span className="text-[7px] text-slate-400 ml-1 font-normal not-italic">
                      ({getFinalStats(enemyMonster).base.atk}+{getFinalStats(enemyMonster).leveling.atk}+{getFinalStats(enemyMonster).gems.atk})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldIcon size={8} className="text-blue-400" />
                  <span className="text-[9px] font-black text-white italic">
                    {getFinalStats(enemyMonster).total.def}
                    <span className="text-[7px] text-slate-400 ml-1 font-normal not-italic">
                      ({getFinalStats(enemyMonster).base.def}+{getFinalStats(enemyMonster).leveling.def}+{getFinalStats(enemyMonster).gems.def})
                    </span>
                  </span>
                </div>
              </div>
              <EffectBadges effects={enemyEffects} />
            </div>
            {/* Timer for Enemy turn */}
            {turn === 'enemy' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
                <div className="relative">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Hourglass size={20} className={cn(turnTime <= 10 ? "text-red-500" : "text-amber-400")} />
                  </motion.div>
                  {turnTime <= 10 && <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-red-500/30 rounded-full blur-lg" />}
                </div>
                <span className={cn("text-lg font-black tabular-nums tracking-tighter", turnTime <= 10 ? "text-red-500 animate-pulse" : "text-white")}>
                  {turnTime}s
                </span>
              </motion.div>
            )}
          </div>
          <motion.div
            style={{ rotateX: '15deg', rotateY: '-15deg', transformStyle: 'preserve-3d', transformOrigin: 'bottom' }}
            animate={enemyAnim === 'attack' ? (activeBurst?.subType === 'attack' ? { z: [0, 0, 500, 500, 0], y: [0, -20, 420, 420, 0], x: [0, 30, -380, -380, 0], scale: [1, 0.8, 1.5, 1.5, 1] } : activeBurst?.subType === 'defense' ? { scale: [1, 1.1, 1], y: [0, 5, 0] } : { z: [0, 80, 0], y: [0, 50, 0], x: [0, -30, 0] }) : enemyAnim === 'hit' ? { rotateZ: [0, 8, -8, 0], x: [0, 15, -15, 0], scale: [1, 1.08, 1] } : { y: [0, -4, 0] }}
            transition={enemyAnim === 'attack' ? { duration: activeBurst?.subType === 'attack' ? 0.8 : (activeBurst?.subType === 'defense' ? 0.6 : 0.4), times: activeBurst?.subType === 'attack' ? [0, 0.25, 0.5, 0.8, 1] : undefined, ease: "easeInOut" } : enemyAnim === 'hit' ? { duration: 0.3 } : undefined}
            className="relative flex justify-center items-end h-28 w-28"
          >
            <AnimatePresence>{incomingEmote && <motion.div initial={{ opacity: 0, scale: 0, y: 0 }} animate={{ opacity: 1, scale: 1, y: -80 }} exit={{ opacity: 0, scale: 0 }} className="absolute z-[400] bg-white text-3xl p-2 rounded-2xl shadow-3xl border-2 border-slate-200">{incomingEmote}</motion.div>}</AnimatePresence>
            <div className="absolute bottom-4 w-full flex justify-center"><MonsterPodium rarity={enemyMonster.rarity || ''} /></div>
            <AnimatePresence>
              {enemyShieldTurns > 0 && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [1, 1.15, 1.05], opacity: [0.6, 0.8, 0.6], rotate: 360 }} exit={{ scale: 1.5, opacity: 0 }} transition={{ duration: 3, repeat: Infinity }} className="absolute size-32 rounded-full border-4 border-red-500/50 bg-[radial-gradient(circle,rgba(239,68,68,0.3)_0%,transparent_70%)] z-10 shadow-[0_0_50px_rgba(239,68,68,0.5)] flex items-center justify-center translate-y-4">
                  <div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-ping opacity-20" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-[450] pointer-events-none flex gap-2">
              <AnimatePresence>
                {enemyEffects.some(e => e.type === 'curse') && (
                  <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="bg-purple-900/90 border-2 border-purple-400 p-2 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.8)] animate-bounce">
                    <Skull size={18} className="text-white fill-purple-900" />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {enemyEffects.some(e => e.type === 'regen') && (
                  <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="bg-emerald-900/90 border-2 border-emerald-400 p-2 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-bounce">
                    <Leaf size={18} className="text-white fill-emerald-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <img src={enemyMonster.image || `/monsters/${enemyMonster.id}.png`} className={cn("w-24 h-24 object-contain mix-blend-screen drop-shadow-2xl relative z-10 translate-y-2", enemyAnim === 'lose' && "opacity-0")} />
            <AnimatePresence>
              {enemyAnim === 'hit' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.7, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-x-0 bottom-4 h-full bg-red-600/40 rounded-full blur-2xl z-20 pointer-events-none" />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {enemyAnim === 'hit' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.7, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-red-600/40 rounded-full blur-2xl z-20 pointer-events-none" />
              )}
            </AnimatePresence>
            <PopupLayer popups={popups.filter(p => !p.isPlayerSide)} className="-translate-x-12" t={t} />
          </motion.div>
        </div>

        <div className="absolute bottom-[10%] left-[6%] flex flex-col items-start w-full max-w-[220px] z-30">
          <motion.div
            style={{ rotateX: '-15deg', rotateY: '15deg', transformStyle: 'preserve-3d', transformOrigin: 'bottom' }}
            animate={playerAnim === 'attack' ? (activeBurst?.subType === 'attack' ? { z: [0, 0, 500, 500, 0], y: [0, 20, -500, -500, 0], x: [0, -30, 400, 400, 0], scale: [1, 0.8, 1.5, 1.5, 1] } : activeBurst?.subType === 'defense' ? { scale: [1, 1.1, 1], y: [0, -10, 0] } : { z: [0, 180, 0], y: [0, -100, 0], x: [0, 40, 0] }) : playerAnim === 'hit' ? { rotateZ: [0, -10, 10, 0], x: [0, -20, 20, 0], scale: [1, 1.08, 1] } : playerAnim === 'win' ? { y: [-15, 0, -15, 0], scale: [1, 1.05, 1] } : { y: [0, -6, 0] }}
            transition={playerAnim === 'attack' ? { duration: activeBurst?.subType === 'attack' ? 0.8 : (activeBurst?.subType === 'defense' ? 0.6 : 0.4), times: activeBurst?.subType === 'attack' ? [0, 0.25, 0.5, 0.8, 1] : undefined, ease: "easeInOut" } : playerAnim === 'hit' ? { duration: 0.3 } : undefined}
            className="relative flex justify-center items-end h-36 w-36 mb-4"
          >
            <AnimatePresence>{outgoingEmote && <motion.div initial={{ opacity: 0, scale: 0, y: 0 }} animate={{ opacity: 1, scale: 1, y: -100 }} exit={{ opacity: 0, scale: 0 }} className="absolute z-[400] bg-slate-900 text-3xl p-2 rounded-2xl shadow-3xl border-2 border-primary/40">{outgoingEmote}</motion.div>}</AnimatePresence>
            <div className="absolute bottom-6 w-full flex justify-center"><MonsterPodium isPlayer rarity={playerMonster.rarity || ''} /></div>
            <AnimatePresence>
              {shieldTurns > 0 && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [1, 1.15, 1.05], opacity: [0.6, 0.8, 0.6], rotate: 360 }} exit={{ scale: 1.5, opacity: 0 }} transition={{ duration: 3, repeat: Infinity }} className="absolute size-48 rounded-full border-4 border-primary/50 bg-[radial-gradient(circle,rgba(59,130,246,0.3)_0%,transparent_70%)] z-10 shadow-[0_0_50px_rgba(59,130,246,0.5)] flex items-center justify-center translate-y-4">
                  <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping opacity-20" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-[450] pointer-events-none flex gap-2">
              <AnimatePresence>
                {playerEffects.some(e => e.type === 'curse') && (
                  <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="bg-purple-900/90 border-2 border-purple-400 p-2 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.8)] animate-bounce">
                    <Skull size={22} className="text-white fill-purple-900" />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {playerEffects.some(e => e.type === 'regen') && (
                  <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="bg-emerald-900/90 border-2 border-emerald-400 p-2 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-bounce">
                    <Leaf size={22} className="text-white fill-emerald-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <img src={playerMonster.image || `/monsters/${playerMonster.id}.png`} className="w-32 h-32 object-contain drop-shadow-2xl relative z-20 translate-y-2" />
            <PopupLayer popups={popups.filter(p => p.isPlayerSide)} t={t} />
          </motion.div>
          <div id="tutorial-player-stats" className="w-full bg-slate-900/80 backdrop-blur-xl p-3 rounded-xl border border-primary/30 shadow-2xl space-y-1.5 transform rotate-1 relative">
            <RarityBadge rarity={playerMonster.rarity || ''} />
            <div className="flex justify-between items-center whitespace-nowrap overflow-visible">
              <div className="flex items-center gap-1.5 min-w-0"><TypeIcon type={playerMonster.type} /><span className="text-[12px] font-black text-white uppercase truncate">{getLoc(playerMonster.name, i18n.language)}</span></div>
              <span className="text-[8px] font-black text-primary ml-2 shrink-0">Lv {playerMonster.level}</span>
            </div>
            <HealthBar current={playerHP} max={playerMaxHP} label="HP" colorClass="bg-gradient-to-r from-emerald-500 to-teal-400" shadowColor="rgba(52,211,153,0.4)" />
            <div className="h-1 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-[0.5px] mb-1"><motion.div animate={{ width: `${playerEnergy}%` }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" /></div>

            <div className="flex justify-between items-center px-0.5">
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <Sword size={10} className="text-red-400" />
                  <span className="text-[10px] font-black text-white italic tracking-tighter">
                    {getFinalStats(playerMonster).total.atk}
                    <span className="text-[7px] text-slate-400 ml-1 font-normal not-italic tracking-normal">
                      ({getFinalStats(playerMonster).base.atk}+{getFinalStats(playerMonster).leveling.atk}+{getFinalStats(playerMonster).gems.atk})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldIcon size={10} className="text-blue-400" />
                  <span className="text-[10px] font-black text-white italic tracking-tighter">
                    {getFinalStats(playerMonster).total.def}
                    <span className="text-[7px] text-slate-400 ml-1 font-normal not-italic tracking-normal">
                      ({getFinalStats(playerMonster).base.def}+{getFinalStats(playerMonster).leveling.def}+{getFinalStats(playerMonster).gems.def})
                    </span>
                  </span>
                </div>
              </div>
              <EffectBadges effects={playerEffects} />
            </div>
            {/* Timer for Player turn */}
            {turn === 'player' && !isTutorial && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
                <div className="relative">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Hourglass size={20} className={cn(turnTime <= 10 ? "text-red-500" : "text-amber-400")} />
                  </motion.div>
                  {turnTime <= 10 && <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-red-500/30 rounded-full blur-lg" />}
                </div>
                <span className={cn("text-lg font-black tabular-nums tracking-tighter", turnTime <= 10 ? "text-red-500 animate-pulse" : "text-white")}>
                  {turnTime}s
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* CONTROL PANEL */}
      <div className="p-4 bg-slate-950/60 border-t border-white/5 backdrop-blur-3xl pb-4 relative z-[9100]">
        <div className={cn("grid gap-3", pvpRole ? "grid-cols-3" : "grid-cols-4")}>
          {/* Attack */}
          <motion.button
            id="tutorial-attack"
            whileTap={{ scale: 0.94, y: 4 }}
            onClick={() => executeAttack(-1)}
            disabled={turn !== 'player' || playerAnim !== 'idle' || catchAnim}
            className={cn(
              "col-span-1 h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl relative z-[7001]",
              turn === 'player' && !catchAnim ? "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_8px_0_rgba(239,68,68,0.2)] active:shadow-none translate-y-[-2px] active:translate-y-[0px]" : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500"
            )}
          >
            <Sword size={20} />
            <div className="flex flex-col items-center leading-none mt-1 gap-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider">{t('battle.attack')}</span>
              <span className="text-[8px] font-bold opacity-60">~ {estimateDamage(playerMonster, enemyMonster)} DMG</span>
            </div>
          </motion.button>

          {/* Skill */}
          <div className="relative col-span-1 z-[7001]">
            <AnimatePresence>{showSkills && <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-[80px] left-0 w-80 bg-slate-900 backdrop-blur-3xl p-4 rounded-2xl border border-purple-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] space-y-2.5"><h4 className="text-[11px] font-black text-purple-400 mb-1.5 uppercase text-center tracking-[0.2em] opacity-80">{t('battle.ability_menu')}</h4><div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">{playerMonster.abilities?.map((ab, idx) => {
              const cost = ab.type === 'attack' ? 50 : 30;
              const estDmg = estimateDamage(playerMonster, enemyMonster, true, idx);
              const isHeal = ab.type === 'heal';
              const isDefense = ab.type === 'defense';
              const isRegen = ab.type === 'regen';
              const isCurse = ab.type === 'curse';
              const healVal = isHeal ? Math.round(playerMaxHP * ((ab.value || 15) / 100)) : 0;

              const type = ab.type?.toLowerCase() || 'attack';
              const typeConfigs: Record<string, { icon: any, color: string, border: string }> = {
                'attack': { icon: <Sword size={16} strokeWidth={2.5} />, color: '#ef4444', border: 'border-l-red-500' },
                'extra': { icon: <Sparkles size={16} strokeWidth={2.5} />, color: '#fbbf24', border: 'border-l-amber-400' },
                'defense': { icon: <ShieldIcon size={16} strokeWidth={2.5} />, color: '#3b82f6', border: 'border-l-blue-400' },
                'heal': { icon: <Heart size={16} strokeWidth={2.5} />, color: '#10b981', border: 'border-l-emerald-400' },
                'regen': { icon: <Leaf size={16} strokeWidth={2.5} />, color: '#10b981', border: 'border-l-emerald-400' },
                'curse': { icon: <Skull size={16} strokeWidth={2.5} />, color: '#a855f7', border: 'border-l-purple-400' }
              };
              const config = typeConfigs[type] || typeConfigs['attack'];

              return (
                <button key={idx} onClick={() => { executeAttack(idx); setShowSkills(false); }} disabled={playerEnergy < cost || catchAnim} className={cn("flex items-center justify-between p-3 rounded-xl border border-white/5 border-l-4 transition-all text-left", config.border, playerEnergy >= cost && !catchAnim ? "bg-purple-600/15 hover:bg-purple-600/25 shadow-lg" : "opacity-50 grayscale-[0.5]")}>
                  <div className="flex-1 min-w-0 pr-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: config.color, filter: `drop-shadow(0 0 5px ${config.color}66)` }}>{config.icon}</span>
                      <span className="text-[12px] font-black text-white uppercase tracking-tight truncate flex-1">{getLoc(ab.name, i18n.language)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] leading-tight text-white/95">
                        <span className="inline-block text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/20 px-2 py-0.5 rounded-md mr-2">
                          {isHeal ? `+${healVal} HP` : isDefense ? `${t('battle.shield')} 🛡️` : isCurse ? `${t('battle.curse')} 💀` : isRegen ? `${t('battle.regen_short')} 🌿` : `~${estDmg} DMG`}
                          {ab.chance && ab.chance < 100 && <span className="ml-1 opacity-80 text-[8px]">({ab.chance}%)</span>}
                        </span>
                        <span className="text-slate-200 font-bold italic">{getLoc(ab.description, i18n.language)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 bg-black/20 p-1.5 rounded-lg border border-white/5 min-w-[50px]">
                    <span className="text-[11px] font-black text-purple-300 tabular-nums">{cost}⚡</span>
                    <span className="text-[7px] font-black text-purple-500/60 uppercase tracking-tighter">{t('battle.energy')}</span>
                  </div>
                </button>
              )
            })}</div></motion.div>}</AnimatePresence>
            <motion.button
              id="tutorial-skills"
              whileTap={{ scale: 0.94, y: 4 }}
              onClick={() => { setShowSkills(!showSkills); setShowItems(false); }}
              disabled={turn !== 'player' || playerAnim !== 'idle' || catchAnim}
              className={cn(
                "w-full h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl translate-y-[-2px] active:translate-y-[0px] relative z-[7001]",
                turn === 'player' && !catchAnim ? "bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-[0_8px_0_rgba(168,85,247,0.2)] active:shadow-none" : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500"
              )}
            >
              <Sparkles size={20} />
              <span className="text-[9px] font-black uppercase mt-1">{t('battle.skill')}</span>
            </motion.button>
          </div>
          <div className="relative col-span-1 z-[7001]">
            <AnimatePresence>
              {showItems && (
                <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-[80px] right-0 w-52 bg-slate-900/98 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl shadow-3xl z-[9999] space-y-3">
                  <h4 className="text-[10px] font-black text-blue-400 mb-1 uppercase text-center tracking-widest opacity-60">{t('battle.backpack')}</h4>
                  <div className="flex flex-col gap-2.5">
                    {(inventory?.filter(i => ['hp_potion', 'mana_potion'].includes(i.type)).length || 0) === 0 ? (
                      <p className="text-[9px] text-slate-500 font-bold uppercase py-4 text-center">{t('battle.no_potions')}</p>
                    ) : (
                      inventory?.filter(i => ['hp_potion', 'mana_potion'].includes(i.type)).map(i => {
                        const cfg = RESOURCE_CONFIG[i.type];
                        return (
                          <button key={i.type} onClick={() => {
                            if (cfg?.stats) {
                              if (cfg.stats.hp) {
                                const amount = cfg.statsType === 'perc' ? Math.round(playerMaxHP * (cfg.stats.hp / 100)) : cfg.stats.hp;
                                const nextHP = Math.min(playerMaxHP, playerHP + amount);
                                setPlayerHP(nextHP);
                                addPopup(amount, false, { isHeal: true });
                                addLog(t('battle.used_item', { name: getLoc(cfg.label, i18n.language), amount, stat: 'HP' }));
                                if (pvpRole && onSendAttack) {
                                  onSendAttack({ dmg: 0, heal: amount, currentHP: nextHP, isSkill: true, isCrit: false, isEffective: false, isWeak: false });
                                }
                              }
                              if (cfg.stats.energy) {
                                const amount = cfg.statsType === 'perc' ? Math.round(100 * (cfg.stats.energy / 100)) : cfg.stats.energy;
                                setPlayerEnergy(p => Math.min(100, p + amount));
                                addPopup(amount, false, { isHeal: true, color: 'text-cyan-400' });
                                addLog(t('battle.used_item', { name: getLoc(cfg.label, i18n.language), amount, stat: 'Mana' }));
                              }
                              playHeal?.();
                            }
                            onUseItem?.(i.type);
                            setShowItems(false);
                            setShowSkills(false);
                            setItemUsedInTurn(true);
                          }} className="flex justify-between items-center p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[10px] font-bold text-white uppercase hover:bg-blue-500/10 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{cfg?.icon || '📦'}</span>
                              <span>{getLoc(cfg?.label, i18n.language) || i.type.replace('_', ' ')}</span>
                            </div>
                            <span className="text-[9px] text-blue-300 bg-blue-500/20 px-2.5 py-0.5 rounded-lg">{i.count}x</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              id="tutorial-inventory"
              whileTap={!(turn !== 'player' || playerAnim !== 'idle' || catchAnim || itemUsedInTurn) ? { scale: 0.94, y: 4 } : {}}
              onClick={() => { setShowItems(!showItems); setShowSkills(false); }}
              disabled={turn !== 'player' || playerAnim !== 'idle' || catchAnim || itemUsedInTurn}
              className={cn(
                "w-full h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl translate-y-[-2px] active:translate-y-[0px] relative z-[7001]",
                turn === 'player' && !catchAnim && !itemUsedInTurn ? "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_8px_0_rgba(59,130,246,0.2)] active:shadow-none" : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500"
              )}
            >
              {itemUsedInTurn ? <Lock size={18} className="opacity-60" /> : <Package size={20} />}
              <span className="text-[9px] font-black uppercase mt-1">{itemUsedInTurn ? t('battle.used') : t('battle.inventory_short')}</span>
            </motion.button>
          </div>

          {/* Special (Catch) - PVE Only */}
          {!pvpRole && (() => {
            const catchChance = Math.max(1, Math.round(Math.min(0.95, 0.95 * Math.pow(1 - (enemyHP / enemyMaxHP), 2.6)) * 100));
            const isHighChance = catchChance >= 40;

            return (
              <motion.button
                id="tutorial-catch"
                whileTap={{ scale: 0.94, y: 4 }}
                onClick={executeCatch}
                disabled={turn !== 'player' || playerAnim !== 'idle' || catchAnim}
                className={cn(
                  "col-span-1 h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl relative z-[7001]",
                  turn === 'player' && !catchAnim ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_8px_0_rgba(245,158,11,0.2)] active:shadow-none translate-y-[-2px] active:translate-y-[0px]" : "bg-slate-900/40 border-white/5 opacity-40 text-slate-500"
                )}
              >
                <div className="relative">
                  <Target size={20} className={cn("text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]", isHighChance && "animate-pulse")} />
                  {isHighChance && <div className="absolute inset-0 animate-ping bg-amber-500/20 rounded-full scale-110" />}
                  {isAlreadyCaught && (
                    <div className="absolute -top-1 -right-1 size-3.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] border border-white/20 flex items-center justify-center z-10 scale-110">
                      <Check size={8} className="text-white stroke-[5]" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center leading-none mt-1 gap-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider">{t('battle.catch')}</span>
                  <span className="text-[8px] font-bold opacity-60">{catchChance}%</span>
                </div>
              </motion.button>
            );
          })()}
        </div>
      </div>

      {/* WIN MODAL */}
      <LootModal
        isOpen={showLoot}
        loot={loot}
        winXP={winXP}
        isChestOpened={isChestOpened}
        isInventoryFull={isInventoryFull}
        onOpenChest={() => setIsChestOpened(true)}
        onCollect={(id) => setLoot(p => p.map(x => x.id === id ? { ...x, collected: true } : x))}
        onComplete={() => onWin(winXP, loot)}
      />
      <DefeatModal
        isOpen={showDefeat}
        winXP={winXP}
        onComplete={() => onLose(winXP)}
      />
      <AnimatePresence>{activeBurst && <SkillEffect key={activeBurst.id} type={activeBurst.type} fromSide={activeBurst.fromSide} subType={activeBurst.subType} />}</AnimatePresence>

      <AnimatePresence>
        {isTutorialActive && (
          <TutorialOverlay
            step={tutorialStep}
            onNext={() => setTutorialStep(prev => prev + 1)}
            enemyName={getLoc(enemyMonster.name)}
          />
        )}
      </AnimatePresence>

      {/* Full-screen Low HP Vignette Moved to Root */}
      <AnimatePresence>
        {isLowHP && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            className="fixed inset-0 z-[10000] pointer-events-none shadow-[inset_0_0_120px_rgba(255,0,0,0.5),inset_0_0_40px_rgba(255,0,0,0.65)] border-[10px] border-red-600/20 backdrop-blur-[1px]"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Battle;
