import { useState, useEffect, forwardRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bolt, LayoutGrid, RefreshCw,
  Clock, Package, Plus, Heart, Sword, Shield, Trash2, X, FlaskConical,
  Sparkles, Info, Activity, ChevronRight, Star, Target, Gem, Dna, Skull, Zap
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import {
  cn, TYPE_COLORS, getMonsterMaxHP, getMonsterAttack,
  getMonsterDefense, TYPE_MATCHUP, getTotalXPForLevel, getMonsterPower, TYPE_ICONS, getLoc,
  getMonsterColors, getMonsterTypeIcon, getMonsterRarityColor, getRarityTheme, TYPE_MAP, RARITY_MAP
} from '../../utils';
import { RESOURCE_CONFIG } from '../../data/resources';
import { monsterDB } from '../../data/monsters';
import { ResourceIcon } from '../ui/ResourceIcon';
import type { Monster, Localized } from '../../types';

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
              colorClass.includes('emerald') ? "shadow-[0_0_12px_rgba(10,185,129,0.4)]" :
                "shadow-[0_0_12px_rgba(13,185,242,0.4)]"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};


const AbilityCard = ({ ability, originalAbility, idx, monsterType }: { ability: any, originalAbility?: any, idx: number, monsterType: string | Localized<string> }) => {
  const { t, i18n } = useTranslation();
  const effectiveType = ability.type || (idx === 0 ? 'attack' : 'extra');

  const effect = useMemo(() => {
    switch (effectiveType) {
      case 'attack': return { label: t('monster.abilities_card.attack'), val: `${ability.value || 155}% ATK`, icon: <Sword size={24} />, color: 'text-purple-400', bg: 'bg-purple-500/10', energy: 50 };
      case 'extra': return { label: t('monster.abilities_card.extra'), val: `+${ability.value || 35}% DMG`, icon: <Zap size={24} />, color: 'text-blue-400', bg: 'bg-blue-500/10', energy: 20 };
      case 'defense': return { label: t('monster.abilities_card.defense'), val: `-${ability.value || 60}% DMG`, icon: <Shield size={24} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10', energy: 30 };
      case 'heal': return { label: t('monster.abilities_card.heal'), val: `+${ability.value || 20}% HP`, icon: <Heart size={24} />, color: 'text-red-400', bg: 'bg-red-500/10', energy: 40 };
      case 'buff': return { label: t('monster.abilities_card.buff'), val: `+${ability.value || 20}% ALL`, icon: <Sparkles size={24} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10', energy: 30 };
      case 'curse': return { label: t('monster.abilities_card.curse'), val: `-${ability.value || 15}% ATK/Tah`, icon: <Skull size={24} />, color: 'text-purple-500', bg: 'bg-purple-500/10', energy: 30 };
      case 'regen': return { label: t('monster.abilities_card.regen'), val: `+${ability.value || 10}% HP/Tah`, icon: <RefreshCw size={24} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', energy: 30 };
      case 'debuff': return { label: t('monster.abilities_card.debuff'), val: `-${ability.value || 40}% Hit`, icon: <Target size={24} />, color: 'text-rose-400', bg: 'bg-rose-500/10', energy: 40 };
      default: return { label: t('monster.abilities_card.special'), val: t('monster.abilities_card.special_val'), icon: <Info size={24} />, color: 'text-slate-400', bg: 'bg-white/5', energy: 40 };
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
            <h4 className="text-lg font-black uppercase text-white tracking-tight leading-none drop-shadow-md">
              {typeof ability.name === 'object' ? getLoc(ability.name, i18n.language) : (getLoc(originalAbility?.name, i18n.language) || ability.name)}
            </h4>
            <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-70">
              <Star size={10} className="text-amber-500/50" />
              {ability.chance || 50}%
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-slate-400 font-medium mb-3 drop-shadow-sm min-h-[3em]">
            {typeof ability.description === 'object' ? getLoc(ability.description, i18n.language) : (getLoc(originalAbility?.description, i18n.language) || ability.description)}
          </p>

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

const RarityFrame = ({ rarity }: { rarity: any }) => {
  const { i18n } = useTranslation();
  const rCz = getLoc(rarity, 'cz');
  const rarityLabel = getLoc(rarity, i18n.language);
  if (rCz === 'Běžná') return null;

  const isLegendary = rCz === 'Legendární';
  const isEpic = rCz === 'Epická';
  const isRare = rCz === 'Vzácná';

  const frameColor = isLegendary ? 'border-amber-500' : isEpic ? 'border-purple-500' : 'border-blue-500';
  const shadowColor = isLegendary ? 'shadow-amber-900/60' : isEpic ? 'shadow-purple-900/60' : 'shadow-blue-900/60';
  const iconColor = isLegendary ? 'text-amber-400' : isEpic ? 'text-purple-400' : 'text-blue-400';
  const accentColor = isLegendary ? 'bg-amber-500' : isEpic ? 'bg-purple-500' : 'bg-blue-500';

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Glow Backdrop */}
      <div className={cn(
        "absolute inset-4 rounded-[2.5rem] blur-3xl opacity-10",
        accentColor
      )} />

      {/* Main Beveled Frame */}
      <div className={cn(
        "absolute inset-2 border-[8px] rounded-[2.5rem] border-double shadow-[0_0_50px_rgba(0,0,0,0.9)] transition-all duration-700",
        frameColor, shadowColor
      )} />

      {/* Inner Glowing Lining */}
      <div className={cn(
        "absolute inset-[14px] border rounded-[2.8rem] opacity-30",
        isLegendary ? "border-amber-300" : isEpic ? "border-purple-300" : "border-blue-300"
      )} />

      {/* Ornate Corner Caps */}
      {[
        { pos: 'top-0 left-0', rot: 'rotate-0' },
        { pos: 'top-0 right-0', rot: 'rotate-90' },
        { pos: 'bottom-0 left-0', rot: '-rotate-90' },
        { pos: 'bottom-0 right-0', rot: 'rotate-180' }
      ].map((c, i) => (
        <div key={i} className={cn("absolute size-20 pointer-events-none", c.pos, c.rot)}>
          <svg viewBox="0 0 100 100" className={cn("size-full filter drop-shadow-2xl", iconColor)}>
            <path
              d="M10,10 L50,10 Q60,10 60,20 L60,30 L40,30 L40,50 Q10,50 10,40 Z"
              fill="currentColor"
              className="opacity-100"
            />
            <path
              d="M18,18 L35,18 L35,35 L18,35 Z"
              fill="black"
              className="opacity-40"
            />
            {isLegendary && <circle cx="28" cy="28" r="3" fill="white" className="animate-pulse" />}
          </svg>
        </div>
      ))}

      {/* Rarity Tag/Badge */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-40">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            "px-10 py-1.5 bg-slate-950 border-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-2",
            frameColor
          )}
        >
          {isLegendary && <Star size={12} className="text-amber-400 fill-amber-400 animate-star-twinkle" />}
          <span className={cn("text-[11px] font-black uppercase tracking-[0.3em] italic", iconColor)}>
            {rarityLabel}
          </span>
          {isLegendary && <Star size={12} className="text-amber-400 fill-amber-400 animate-star-twinkle" />}
        </motion.div>
      </div>

      {/* Corner Flourishes */}
      <svg className="absolute inset-0 size-full opacity-40 mix-blend-overlay" viewBox="0 0 400 400">
        <path d="M50,100 Q30,50 100,50" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={iconColor} />
        <path d="M300,50 Q370,50 350,100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={iconColor} />
        <path d="M50,300 Q30,350 100,350" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={iconColor} />
        <path d="M300,350 Q370,350 350,300" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={iconColor} />
      </svg>

      {/* Animated Glint Overlay */}
      <div className="absolute inset-6 rounded-[2rem] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent w-[200%] -translate-x-full animate-rarity-glint" />
      </div>
    </div>
  );
};

const LevelBadge = ({ level, rarity }: { level: number, rarity: any }) => {
  const { t, i18n } = useTranslation();
  const rCz = getLoc(rarity, 'cz');
  const isLegendary = rCz === 'Legendární';
  const isEpic = rCz === 'Epická';
  const isRare = rCz === 'Vzácná';

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
        <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 whitespace-nowrap", iconColor)}>{t('monster.level_short')}</span>
        <p className="text-lg font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none tabular-nums">{level}</p>
      </div>
    </div>
  );
};

const MonsterScoreBadge = ({ score, rarity }: { score: number, rarity: any }) => {
  const { t, i18n } = useTranslation();
  const rCz = getLoc(rarity, 'cz');
  const isLegendary = rCz === 'Legendární';
  const isEpic = rCz === 'Epická';
  const isRare = rCz === 'Vzácná';

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
          <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap", iconColor)}>{t('stats.power')}</span>
        </div>
        <p className="text-lg font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none tabular-nums">{score}</p>
      </div>
    </div>
  );
};

const RarityEffects = ({ rarity }: { rarity: any }) => {
  const { i18n } = useTranslation();
  const rCz = getLoc(rarity, 'cz');
  if (rCz === 'Běžná') return null;

  const isLegendary = rCz === 'Legendární';
  const isEpic = rCz === 'Epická';
  const isRare = rCz === 'Vzácná';

  const particleCount = isLegendary ? 20 : isEpic ? 12 : 6;
  const particles = Array.from({ length: particleCount });
  const color = isLegendary ? 'bg-amber-400' : isEpic ? 'bg-purple-400' : 'bg-blue-400';
  const accentColor = isLegendary ? 'text-amber-300' : isEpic ? 'text-purple-300' : 'text-blue-300';

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background Glow Pulse */}
      <motion.div
        animate={{
          opacity: [0.1, 0.4, 0.1],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className={cn("absolute inset-0 blur-[80px]", color.replace('bg-', 'bg-opacity-25 bg-'))}
      />

      {/* Rays for Legendary */}
      {isLegendary && (
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="size-[500px] bg-[conic-gradient(from_0deg,transparent_0deg,white_10deg,transparent_20deg)] animate-rotate-slow opacity-30 blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900" />
        </div>
      )}

      {/* Random Floating Particles */}
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * 400 - 200,
            y: 400,
            opacity: 0,
            scale: 0
          }}
          animate={{
            y: [-50, -400],
            opacity: [0, 1, 0],
            scale: [0, Math.random() * 1.5 + 0.5, 0],
            x: (Math.random() - 0.5) * 100
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 10,
            ease: "linear"
          }}
          className={cn("absolute size-1.5 rounded-full blur-[1px] shadow-[0_0_10px_currentColor]", color.replace('bg-', 'text-'))}
          style={{ left: `${Math.random() * 100}%`, top: '100%' }}
        />
      ))}

      {/* Rarity Ring / Energy Orbit */}
      {(isLegendary || isEpic) && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className={cn(
            "absolute inset-10 border border-dashed rounded-full opacity-10",
            isLegendary ? "border-amber-400" : "border-purple-400"
          )}
        />
      )}

      {/* Twinkling Stars for Legendary */}
      {isLegendary && Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={`star-${i}`}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
          className="absolute text-amber-300"
          style={{
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
          }}
        >
          <Sparkles size={12 + Math.random() * 10} className="fill-current" />
        </motion.div>
      ))}
    </div>
  );
};

const MonsterImageWithEffects = ({ monster }: { monster: Monster }) => {
  const { i18n } = useTranslation();
  const rCz = getLoc(monster.rarity, 'cz');
  const isLegendary = rCz === 'Legendární';
  const isEpic = rCz === 'Epická';
  const isRare = rCz === 'Vzácná';
  const monsterImage = monster.image || `/monsters/${monster.id}.png`;

  const glowColor = isLegendary ? 'rgba(251, 191, 36, 0.5)' : isEpic ? 'rgba(168, 85, 247, 0.5)' : isRare ? 'rgba(59, 130, 246, 0.5)' : 'transparent';

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      {/* Floating container for both images to keep them perfectly synced */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          y: [0, -15, 0],
          rotate: [0, 1, 0, -1, 0]
        }}
        transition={{
          scale: { duration: 0.5 },
          opacity: { duration: 0.5 },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{ transform: 'translateZ(0)', willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
        className="relative w-full h-full"
      >
        {/* 1. Base Ambient Glow (Behind) */}
        {(isLegendary || isEpic || isRare) && (
          <div
            className="absolute inset-0 blur-[25px] opacity-20 z-0 scale-110"
            style={{
              backgroundColor: glowColor,
              maskImage: `url(${monsterImage})`,
              WebkitMaskImage: `url(${monsterImage})`,
              maskMode: 'alpha',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          />
        )}

        {/* 2. Main Monster Image */}
        <img
          src={monsterImage}
          className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
          style={{ backfaceVisibility: 'hidden' }}
        />

        {/* 3. Foil / Shimmer Overlay (Colorized reflection) */}
        {(isLegendary || isEpic || isRare) && (
          <div
            className="absolute inset-0 z-20 pointer-events-none mix-blend-soft-light opacity-40"
            style={{
              maskImage: `url(${monsterImage})`,
              WebkitMaskImage: `url(${monsterImage})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              backfaceVisibility: 'hidden'
            }}
          >
            <motion.div
              animate={{
                backgroundPosition: ['200% 200%', '-200% -200%'],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundImage: `linear-gradient(110deg, transparent 40%, ${glowColor} 45%, white 50%, ${glowColor} 55%, transparent 60%)`,
                backgroundSize: '300% 300%'
              }}
              className="absolute inset-0 opacity-50"
            />
          </div>
        )}

        {/* 4. Soft Aura Pulse (Slower, calmer) */}
        {(isLegendary || isEpic) && (
          <motion.div
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 z-15 pointer-events-none mix-blend-screen blur-xl"
            style={{
              backgroundColor: glowColor,
              maskImage: `url(${monster.image})`,
              WebkitMaskImage: `url(${monster.image})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              backfaceVisibility: 'hidden'
            }}
          />
        )}

        {/* 5. Twinkling "Sparkles" (Glitter effect) */}
        {isLegendary && (
          <div className="absolute inset-0 z-30 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "easeInOut"
                }}
                className="absolute size-4 rounded-full"
                style={{
                  top: `${15 + Math.random() * 70}%`,
                  left: `${15 + Math.random() * 70}%`,
                  background: 'radial-gradient(circle, white 0%, rgba(255,255,255,0.4) 30%, transparent 70%)',
                  filter: 'blur(0.5px)'
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- Constant Definitions ---


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
    const { t, i18n } = useTranslation();
    const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
    const [focusedItem, setFocusedItem] = useState<any>(null);
    const [confirmRelease, setConfirmRelease] = useState(false);
    const [showHealingModal, setShowHealingModal] = useState(false);
    const [showMutations, setShowMutations] = useState(false);
    const [showItemPicker, setShowItemPicker] = useState(false);

    if (!monster) return null;

    const colors = getMonsterColors(monster.type);
    const theme = getRarityTheme(monster.rarity);
    const rarityColor = getMonsterRarityColor(monster.rarity);

    const monsterImage = monster.image || `/monsters/${monster.id}.png`;

    // Prevent body scroll when any modal is open
    useEffect(() => {
      const isAnyModalOpen = showHealingModal || showMutations || showItemPicker || confirmRelease;
      if (isAnyModalOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [showHealingModal, showMutations, showItemPicker, confirmRelease]);

    const originalMonster = useMemo(() => monsterDB.find(dbm => dbm.id === monster.id), [monster.id]);
    const originalStats = originalMonster?.stats || { hp: 100, attack: 10, defense: 10 };

    const powerLevel = useMemo(() => getMonsterPower(monster), [monster]);

    const TypeIcon = ({ size = 20, className = "" }) => {
      const Icon = getMonsterTypeIcon(monster.type) || Bolt;
      const iconColor = colors.text;
      return <Icon size={size} className={cn(iconColor, className)} />;
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
                {typeof monster.name === 'object' ? getLoc(monster.name, i18n.language) : (getLoc(originalMonster?.name, i18n.language) || monster.name)}
              </h1>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", rarityColor)}>
                  {t(`rarities.${RARITY_MAP[typeof monster.rarity === 'string' ? monster.rarity : monster.rarity?.cz]}`)}
                </span>
                <div className="size-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-1">
                  <TypeIcon size={12} />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    {t(`monster_types.${TYPE_MAP[typeof monster.type === 'string' ? monster.type : monster.type?.cz]}`)}
                  </span>
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
                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] opacity-80">{t('stats.xp_next')}</span>
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
              getLoc(monster.type, 'cz') === 'Ohnivá' ? "bg-red-500" :
                getLoc(monster.type, 'cz') === 'Vodní' ? "bg-blue-500" :
                  getLoc(monster.type, 'cz') === 'Přírodní' ? "bg-emerald-500" :
                    "bg-amber-500"
            )} />

            <div className="relative aspect-square w-full bg-slate-800 rounded-3xl border-4 border-white/10 shadow-2xl flex items-center justify-center group-hover:border-white/20 transition-colors">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

              <RarityEffects rarity={monster.rarity} />
              <RarityFrame rarity={monster.rarity} />

              <MonsterImageWithEffects monster={monster} />

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
                        label={t('stats.hp')}
                        value={currentHP}
                        maxValue={maxHP}
                        colorClass="text-red-500"
                        icon={<Heart size={10} strokeWidth={3} className="fill-current" />}
                        subValue={
                          <div className="flex flex-col gap-1.5 mt-1">
                            <div className="text-[8px] font-black text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 w-fit">
                              {t('monster.bonus')} {maxHP - (originalStats.hp)}
                            </div>
                            {isDamaged && (
                              <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500/60 pl-1">
                                <RefreshCw size={8} className="animate-spin text-primary/40" />
                                <span>{t('monster.regeneration')} {(() => {
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
                          {t('monster.use_potion')}
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
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{t('stats.attack')}</span>
              <p className="text-xl font-black text-white italic tabular-nums leading-none">{getMonsterAttack(monster)}</p>
              <div className="text-[8px] font-black text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                {t('monster.bonus')} {getMonsterAttack(monster) - (originalStats.attack)}
              </div>
            </div>

            <div className="bg-white/[0.07] border border-white/10 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 backdrop-blur-md shadow-2xl transition-all relative overflow-hidden group hover:bg-white/[0.1] hover:border-white/20">
              <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Shield size={18} className="text-yellow-500 opacity-60 mb-1" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{t('stats.defense')}</span>
              <p className="text-xl font-black text-white italic tabular-nums leading-none">{getMonsterDefense(monster)}</p>
              <div className="text-[8px] font-black text-yellow-500/80 bg-yellow-500/5 px-2 py-0.5 rounded-full border border-yellow-500/10">
                {t('monster.bonus')} {getMonsterDefense(monster) - (originalStats.defense)}
              </div>
            </div>
          </div>

          {/* --- Abilities Section --- */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <Zap size={14} className="text-primary" />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] opacity-80">{t('monster.abilities')}</h3>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div className="space-y-4">
              {monster.abilities && monster.abilities.length > 0 ? (
                monster.abilities.map((ability, idx) => (
                  <AbilityCard 
                    key={idx} 
                    ability={ability} 
                    originalAbility={originalMonster?.abilities?.[idx]}
                    idx={idx} 
                    monsterType={monster.type} 
                  />
                ))
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                  <Info size={24} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-xs italic text-slate-600 font-bold uppercase tracking-widest px-8">
                    {t('monster.empty_potential')}
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
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('monster.story')}</h3>
            </div>

            <p className="text-sm text-slate-300 italic leading-relaxed font-medium tracking-tight mb-8 relative z-10">
              "{typeof monster.description === 'object' ? getLoc(monster.description, i18n.language) : (getLoc(originalMonster?.description, i18n.language) || monster.description || t('monster.unknown_species'))}"
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {(() => {
                const match = TYPE_MATCHUP[getLoc(monster.type, 'cz')];
                if (!match) return null;

                const strongAgainstColors = TYPE_COLORS[match.strong] || TYPE_COLORS['Default'];
                const weakAgainstColors = TYPE_COLORS[match.weak] || TYPE_COLORS['Default'];

                return (
                  <>
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">{t('monster.piercing')}</span>
                      <div className={cn("flex flex-col gap-1 border p-3 rounded-2xl", strongAgainstColors.bg, strongAgainstColors.border)}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("size-6 rounded-lg flex items-center justify-center", strongAgainstColors.bg)}>
                            <Sword size={12} className={strongAgainstColors.text} />
                          </div>
                          <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{t(`monster_types.${TYPE_MAP[match.strong]}`)}</span>
                        </div>
                        <div className="flex flex-col mt-1">
                          <p className="text-[8px] font-black text-white leading-none">1.3{t('monster.damage_multiplier')}</p>
                          <p className="text-[7px] font-bold text-slate-400 uppercase leading-none mt-0.5">{t('monster.pierce_chance')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">{t('monster.vulnerability')}</span>
                      <div className={cn("flex flex-col gap-1 border p-3 rounded-2xl", weakAgainstColors.bg, weakAgainstColors.border)}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("size-6 rounded-lg flex items-center justify-center", weakAgainstColors.bg)}>
                            <Shield size={12} className={weakAgainstColors.text} />
                          </div>
                          <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{t(`monster_types.${TYPE_MAP[match.weak]}`)}</span>
                        </div>
                        <div className="flex flex-col mt-1">
                          <p className="text-[8px] font-black text-white leading-none">0.7{t('monster.damage_multiplier')}</p>
                          <p className="text-[7px] font-bold text-slate-400 uppercase leading-none mt-0.5">{t('monster.reduced_efficiency')}</p>
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
                {t('monster.class')}: {t(`monster_types.${TYPE_MAP[typeof monster.type === 'string' ? monster.type : monster.type?.cz]}`)} | {t('monster.effect')}: {TYPE_MATCHUP[typeof monster.type === 'string' ? monster.type : monster.type?.cz]?.effect || "NONE"}
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
                <h3 className="text-xs font-black text-white uppercase tracking-widest">{t('monster.detail.gems_relics')}</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveSlotIdx(null);
                  setShowItemPicker(true);
                  setFocusedItem(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-xl text-primary text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Dna size={12} />
                {t('monster.detail.mutate')}
              </motion.button>
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
                        setActiveSlotIdx(idx);
                        setShowItemPicker(true);
                        setFocusedItem(null);
                      }}
                      className={cn(
                        "relative size-24 rounded-[2rem] border-2 flex items-center justify-center transition-all cursor-pointer group shadow-xl",
                        currentGem ? (() => {
                          const rCz = getLoc(gemConfig?.rarity, 'cz');
                          return (rCz === 'Legendární' ? "border-amber-500/50 bg-amber-500/10 shadow-amber-500/20" :
                            rCz === 'Epická' ? "border-purple-500/50 bg-purple-500/10 shadow-purple-500/20" :
                              rCz === 'Vzácná' ? "border-blue-500/50 bg-blue-500/10 shadow-blue-500/20" :
                                "bg-slate-800 border-white/20");
                        })() : "bg-black/40 border-dashed border-white/10 hover:border-white/30 hover:bg-black/60",
                        isPicking && "ring-4 ring-primary/40 border-primary/60 scale-105 z-20"
                      )}
                    >
                      {currentGem && gemConfig ? (
                        <>
                          <ResourceIcon id={currentGem} config={gemConfig} size="xl" className="group-hover:scale-110 transition-transform drop-shadow-lg" />
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
                          <p className="text-[8px] font-black text-slate-200 uppercase truncate max-w-[70px] mb-0.5">{getLoc(gemConfig?.label)}</p>
                          <p className="text-[9px] font-black text-emerald-400 italic">
                            {stats?.atk ? `+${stats.atk}${sym} ${t('stats.atk_short')}` : stats?.hp ? `+${stats.hp}${sym} ${t('stats.hp_short')}` : stats?.def ? `+${stats.def}${sym} ${t('stats.def_short')}` : t('monster.detail.bonus')}
                          </p>
                        </>
                      ) : (
                        <p className="text-[8px] font-black text-slate-700 uppercase italic tracking-widest mt-1">{t('monster.detail.slot')} {idx + 1}</p>
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
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">{t('monster.detail.equip_slot')} {activeSlotIdx + 1}</p>
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
                            getLoc(cfg.rarity, 'cz') === 'Legendární' ? "border-amber-500/20 bg-amber-500/5 shadow-amber-500/5" :
                              getLoc(cfg.rarity, 'cz') === 'Epická' ? "border-purple-500/20 bg-purple-500/5 shadow-purple-500/5" :
                                getLoc(cfg.rarity, 'cz') === 'Vzácná' ? "border-blue-500/20 bg-blue-500/5 shadow-blue-500/5" :
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
                                <h4 className="text-base font-black text-white uppercase tracking-tight truncate">{getLoc(cfg.label)}</h4>
                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                  getLoc(cfg.rarity, 'cz') === 'Legendární' ? "text-amber-500 border-amber-500/30 bg-amber-500/10" :
                                    getLoc(cfg.rarity, 'cz') === 'Epická' ? "text-purple-500 border-purple-500/30 bg-purple-500/10" :
                                      "text-slate-400 border-slate-500/30 bg-slate-500/10"
                                )}>{getLoc(cfg.rarity)}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {cfg.stats?.atk && <span className="text-[10px] font-black text-red-400 bg-red-400/5 px-2 py-0.5 border border-red-400/20 rounded-lg">+{cfg.stats?.atk}{sym} {t('stats.atk_short')}</span>}
                                {cfg.stats?.hp && <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/5 px-2 py-0.5 border border-emerald-400/20 rounded-lg">+{cfg.stats?.hp}{sym} {t('stats.hp_short')}</span>}
                                {cfg.stats?.def && <span className="text-[10px] font-black text-blue-400 bg-blue-400/5 px-2 py-0.5 border border-blue-400/20 rounded-lg">+{cfg.stats?.def}{sym} {t('stats.def_short')}</span>}
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">{getLoc(cfg.description)}</p>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { onEquipGem?.(activeSlotIdx, focusedItem.type); setActiveSlotIdx(null); setFocusedItem(null); }}
                            className="w-full py-4 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus size={18} strokeWidth={3} />
                            {t('monster.detail.equip_btn')}
                          </motion.button>
                        </motion.div>
                      );
                    })() : (
                      <div className="py-8 text-center border-2 border-dashed border-white/5 bg-white/[0.01] rounded-[2rem] opacity-40">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic tracking-tighter">{t('monster.detail.pick_item_desc')}</p>
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
                  {canRelease ? t('monster.release.action') : t('monster.release.last_monster')}
                </p>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                  {canRelease ? t('monster.release.action_desc') : t('monster.release.last_monster_desc')}
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
                      <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">{t('monster.healing.title')}</h2>
                      <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">{t('monster.healing.available_potions')}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowHealingModal(false)} className="size-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-slate-400 transition-colors shadow-inner"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-1 gap-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {inventory?.filter(i => (i?.type === 'hp_potion' || i?.type === 'hp_potion_large') && i?.count > 0).map(item => {
                    const cfg = RESOURCE_CONFIG[item?.type || ''];
                    if (!cfg) return null;
                    return (
                      <motion.button key={item?.type} whileTap={{ scale: 0.97 }} onClick={() => { item?.type && onUsePotion?.(item.type); setShowHealingModal(false); }} className="group relative flex items-center gap-5 p-6 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl hover:border-emerald-500/30 transition-all text-left overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="size-20 flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 group-hover:rotate-3 transition-transform">
                          <ResourceIcon id={item?.type || ''} config={cfg} size="lg" className="invert brightness-200" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-lg font-black text-white uppercase tracking-tight leading-tight">{getLoc(cfg.label, i18n.language)}</p>
                            <p className="bg-emerald-500 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full shadow-lg">{item?.count}x</p>
                          </div>
                          <p className="text-xs font-bold text-slate-400 italic leading-snug line-clamp-2">{getLoc(cfg.description, i18n.language)}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                  {(!inventory || inventory.filter(i => (i?.type === 'hp_potion' || i?.type === 'hp_potion_large') && i?.count > 0).length === 0) && (
                    <div className="py-20 text-center">
                      <div className="size-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner"><FlaskConical size={40} className="text-slate-700" /></div>
                      <p className="text-sm font-black text-slate-600 uppercase tracking-widest italic max-w-[200px] mx-auto">{t('monster.healing.no_potions')}</p>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowHealingModal(false)} className="w-full mt-10 py-5 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-[2rem] transition-all active:scale-95 shadow-xl">{t('monster.healing.later_btn')}</button>
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
                <h2 className="text-3xl font-black text-white uppercase italic mb-3 tracking-tighter">{t('monster.release.confirm_title')}</h2>
                <p className="text-slate-400 text-sm font-bold mb-10 leading-relaxed px-4">{t('monster.release.confirm_desc')} <span className="text-white font-black underline decoration-red-500/50">{getLoc(monster.name || originalMonster?.name, i18n.language)}</span>?</p>
                <div className="flex flex-col gap-4">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => onRelease?.()} className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-[2rem] shadow-2xl shadow-red-600/20 transition-all font-black">{t('monster.release.confirm_btn')}</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmRelease(false)} className="w-full py-5 bg-[#252a33] hover:bg-[#2d333d] text-slate-100 font-black uppercase tracking-widest rounded-[2rem] transition-all">{t('monster.release.cancel_btn')}</motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Equipment & Relic Picker Modal (Bottom Sheet) */}
        <AnimatePresence>
          {showItemPicker && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-end flex-col">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowItemPicker(false); setActiveSlotIdx(null); setFocusedItem(null); }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-w-lg bg-[#0f172a] border-t-4 border-amber-500/50 rounded-t-[2.5rem] p-8 pb-12 shadow-[0_-20px_100px_rgba(0,0,0,0.9)] relative z-10 max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-8 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="size-14 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                      {activeSlotIdx !== null ? <Gem size={32} /> : <Dna size={32} />}
                    </div>
                      <div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">
                          {activeSlotIdx !== null ? `${t('monster.detail.slot')} ${activeSlotIdx + 1}` : getLoc(monster.name || originalMonster?.name, i18n.language)}
                        </h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">
                          {activeSlotIdx !== null ? t('monster.detail.gem_insertion') : t('monster.genom.mod')}
                        </p>
                      </div>
                  </div>
                  <button
                    onClick={() => { setShowItemPicker(false); setActiveSlotIdx(null); setFocusedItem(null); }}
                    className="size-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-slate-400 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Grid of Items */}
                <div className="grid grid-cols-4 gap-3 mb-6 overflow-y-auto pr-2 custom-scrollbar shrink-0 max-h-[250px]">
                  {inventory?.filter(i => {
                    if (!i || i.count <= 0) return false;
                    const isGem = i.type.startsWith('gem_');
                    const isMutation = i.type.startsWith('loot_') || i.type.startsWith('item_') || i.type.startsWith('xp_');
                    
                    if (activeSlotIdx !== null) return isGem;
                    return isMutation;
                  }).map(i => {
                    const cfg = RESOURCE_CONFIG[i.type];
                    const isSelected = focusedItem?.type === i.type;
                    return (
                      <motion.button
                        key={i.type}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setFocusedItem(i)}
                        className={cn(
                          "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all shadow-xl",
                          cfg.rarity === 'legendary' ? "border-amber-500/20 bg-amber-500/5 shadow-amber-500/5" :
                            cfg.rarity === 'epic' ? "border-purple-500/20 bg-purple-500/5 shadow-purple-500/5" :
                              cfg.rarity === 'rare' ? "border-blue-500/20 bg-blue-500/5 shadow-blue-500/5" :
                                "border-white/5 bg-white/5",
                          isSelected && "ring-4 ring-amber-500/30 border-amber-500 bg-amber-500/10 scale-105 z-10"
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
                          className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 shadow-3xl space-y-4"
                        >
                          <div className="flex items-center gap-5">
                            <div className="size-20 bg-black/40 rounded-3xl flex items-center justify-center border border-white/5 shadow-inner shrink-0">
                              <ResourceIcon id={focusedItem.type} config={cfg} size="xl" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-2xl font-black text-white uppercase tracking-tight truncate">{getLoc(cfg.label, i18n.language)}</h4>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(cfg.stats?.atk || 0) !== 0 && (
                                  <span className="text-[10px] font-black text-red-400 bg-red-400/5 px-2 py-0.5 border border-red-400/20 rounded-lg">
                                    {(cfg.stats?.atk || 0) > 0 ? '+' : ''}{cfg.stats?.atk}{sym} {t('stats.atk_short')}
                                  </span>
                                )}
                                {(cfg.stats?.hp || 0) !== 0 && (
                                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/5 px-2 py-0.5 border border-emerald-400/20 rounded-lg">
                                    {(cfg.stats?.hp || 0) > 0 ? '+' : ''}{cfg.stats?.hp}{sym} {t('stats.hp_short')}
                                  </span>
                                )}
                                {(cfg.stats?.def || 0) !== 0 && (
                                  <span className="text-[10px] font-black text-blue-400 bg-blue-400/5 px-2 py-0.5 border border-blue-400/20 rounded-lg">
                                    {(cfg.stats?.def || 0) > 0 ? '+' : ''}{cfg.stats?.def}{sym} {t('stats.def_short')}
                                  </span>
                                )}
                                {(cfg.stats?.xp || 0) !== 0 && (
                                  <span className="text-[10px] font-black text-amber-400 bg-amber-400/5 px-2 py-0.5 border border-amber-400/20 rounded-lg">
                                    {(cfg.stats?.xp || 0) > 0 ? '+' : ''}{cfg.stats?.xp} XP
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 font-medium leading-relaxed italic tracking-tight">{getLoc(cfg.description, i18n.language)}</p>

                          <div className="flex flex-col gap-3 pt-2">
                            {(cfg.category === 'relic' || focusedItem.type.startsWith('loot_')) && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onPermanentlyUpgrade && cfg.stats) {
                                    onPermanentlyUpgrade(focusedItem.type, cfg.stats);
                                    setShowItemPicker(false);
                                    setActiveSlotIdx(null);
                                    setFocusedItem(null);
                                  }
                                }}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-orange-900/40 flex items-center justify-center gap-2 border-b-4 border-black/20"
                              >
                                <Sparkles size={18} />
                                {t('monster.detail.permanently_upgrade_dna')}
                              </motion.button>
                            )}

                            {cfg.category === 'gem' && activeSlotIdx !== null && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  if (focusedItem.type.startsWith('gem_')) {
                                    onEquipGem?.(activeSlotIdx, focusedItem.type);
                                  } else {
                                    onEquipItem?.(activeSlotIdx, focusedItem.type);
                                  }
                                  setShowItemPicker(false);
                                  setActiveSlotIdx(null);
                                  setFocusedItem(null);
                                }}
                                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-[0.1em] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 border border-white/10 text-[11px]"
                              >
                                <Package size={18} />
                                {t('monster.detail.equip_btn')} {t('monster.detail.slot')} {activeSlotIdx + 1}
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })() : (
                      <div className="py-12 text-center border-2 border-dashed border-white/5 bg-white/[0.01] rounded-[2rem] opacity-40">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic px-12">{t('monster.detail.pick_item_desc')}</p>
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
                        {t('monster.genom.title')}
                      </h2>
                      <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] italic">
                        {t('monster.genom.subtitle')}
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
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">{t('monster.genom.no_mutations')}</p>
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
                                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{getLoc(cfg?.label, i18n.language) || mut.id}</h4>
                                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                    {new Date(mut.timestamp).toLocaleDateString()} • {new Date(mut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="size-6 bg-primary/10 rounded-full flex items-center justify-center text-[8px] font-black text-primary border border-primary/20">
                                  #{idx + 1}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {(cfg?.stats?.atk || 0) > 0 && <span className="text-[8px] font-black text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">+{cfg.stats?.atk} {t('stats.atk_short')}</span>}
                                {(cfg?.stats?.hp || 0) > 0 && <span className="text-[8px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20">+{cfg.stats?.hp} {t('stats.hp_short')}</span>}
                                {(cfg?.stats?.def || 0) > 0 && <span className="text-[8px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg border border-blue-400/20">+{cfg.stats?.def} {t('stats.def_short')}</span>}
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
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest">{t('monster.genom.total_mutations')} {monster.mutations?.length || 0}</p>
                    </div>
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-tighter leading-none opacity-40">{t('monster.genom.verified')}</p>
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
