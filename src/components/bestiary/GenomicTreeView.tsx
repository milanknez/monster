import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Dna, Lock, Sparkles, Activity, Plus, Package, ArrowRightLeft, X, Shield, Sword, Heart, HelpCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, getLoc, getMonsterColors, getMonsterTypeIcon, getMonsterRarityColor, TYPE_MAP, RARITY_MAP } from '../../utils';
import { RESOURCE_CONFIG } from '../../data/resources';
import { ResourceIcon } from '../ui/ResourceIcon';
import type { Monster } from '../../types';

export interface GenomicTier {
  tier: number;
  name: string;
  requiredLevel: number;
  multiplier: number;
  bonusLabel: string;
  color: string;
  badgeClass: string;
  slotIndices: number[];
}

export const GENOMIC_TIERS: GenomicTier[] = [
  {
    tier: 6,
    name: 'Zakázaná DNA',
    requiredLevel: 25,
    multiplier: 2.5,
    bonusLabel: '🧬 2.5× ANOMÁLNÍ BOOST (+150 %)',
    color: '#e11d48',
    badgeClass: 'text-rose-300 border-rose-500/40 bg-rose-950/60 shadow-rose-500/20',
    slotIndices: [15]
  },
  {
    tier: 5,
    name: 'Apex Gen',
    requiredLevel: 20,
    multiplier: 2.0,
    bonusLabel: '👑 2.0× APEX BOOST (+100 %)',
    color: '#f59e0b',
    badgeClass: 'text-amber-300 border-amber-500/50 bg-amber-500/20 shadow-amber-500/20',
    slotIndices: [14]
  },
  {
    tier: 4,
    name: 'Prastará tkáň',
    requiredLevel: 16,
    multiplier: 1.5,
    bonusLabel: '💀 +50 % EFEKT',
    color: '#ec4899',
    badgeClass: 'text-pink-300 border-pink-500/50 bg-pink-500/20 shadow-pink-500/20',
    slotIndices: [12, 13]
  },
  {
    tier: 3,
    name: 'Nervová soustava',
    requiredLevel: 12,
    multiplier: 1.3,
    bonusLabel: '⚡ +30 % EFEKT',
    color: '#8b5cf6',
    badgeClass: 'text-purple-300 border-purple-500/50 bg-purple-500/20 shadow-purple-500/20',
    slotIndices: [9, 10, 11]
  },
  {
    tier: 2,
    name: 'Svalová vlákna',
    requiredLevel: 8,
    multiplier: 1.15,
    bonusLabel: '🩸 +15 % EFEKT',
    color: '#3b82f6',
    badgeClass: 'text-blue-300 border-blue-500/50 bg-blue-500/20 shadow-blue-500/20',
    slotIndices: [5, 6, 7, 8]
  },
  {
    tier: 1,
    name: 'Základní oběh',
    requiredLevel: 4,
    multiplier: 1.0,
    bonusLabel: '🌿 ZÁKLADNÍ (1.0×)',
    color: '#10b981',
    badgeClass: 'text-emerald-300 border-emerald-500/50 bg-emerald-500/20 shadow-emerald-500/20',
    slotIndices: [0, 1, 2, 3, 4]
  },
];

export const TOTAL_GENOMIC_SLOTS = 16;
export const BASE_GENOMIC_CAPACITY = 15;

export const getTierForSlot = (slotIndex: number): GenomicTier => {
  return GENOMIC_TIERS.find(t => t.slotIndices.includes(slotIndex)) || GENOMIC_TIERS[5];
};

export const getUnlockedGenomicSlots = (level: number): number => {
  let count = 0;
  if (level >= 4) count += 5;
  if (level >= 8) count += 4;
  if (level >= 12) count += 3;
  if (level >= 16) count += 2;
  if (level >= 20) count += 1;
  if (level >= 25) count += 1;
  return count;
};

export const ECGMonitor: React.FC<{ instabilityPct: number }> = ({ instabilityPct }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Barva linky podle buněčné nestability (při >100 % pulzuje výstražná krvavá/fialová záře)
  const strokeColor = instabilityPct > 100
    ? '#f43f5e'
    : instabilityPct > 80
    ? '#ef4444'
    : instabilityPct > 50
    ? '#f59e0b'
    : instabilityPct > 25
    ? '#06b6d4'
    : '#10b981';

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let x = 0;
    let prevY = 13;
    let phase = 0;

    // Rychlejší kreslení podle požadavku uživatele
    const speed = instabilityPct > 100 ? 9.5 : instabilityPct > 80 ? 8.5 : instabilityPct > 50 ? 6.8 : instabilityPct > 25 ? 5.5 : 4.6;
    // Interval mezi tepy
    const beatInterval = instabilityPct > 100 ? 18 : instabilityPct > 80 ? 25 : instabilityPct > 50 ? 35 : instabilityPct > 25 ? 48 : 58;
    let stepInBeat = 0;

    // Počáteční vyčištění
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // 100% čisté smazání oblasti před kurzorem (žádný zelený zákal ani mlha!)
      const clearWidth = 32;
      ctx.clearRect(x, 0, clearWidth, height);
      if (x + clearWidth > width) {
        ctx.clearRect(0, 0, (x + clearWidth) - width, height);
      }

      // Výpočet Y podle stavu nestability
      let targetY = centerY;
      stepInBeat = (stepInBeat + 1) % beatInterval;
      phase += 0.16;

      if (instabilityPct <= 25) {
        // --- 1. STABILNÍ: Čistý, pravidelný, klidný a svižný EKG sinus ---
        if (stepInBeat >= 8 && stepInBeat <= 12) {
          targetY = centerY - 3.5 * Math.sin(((stepInBeat - 8) / 4) * Math.PI);
        } else if (stepInBeat === 15) {
          targetY = centerY + 3;
        } else if (stepInBeat === 16) {
          targetY = centerY - 11;
        } else if (stepInBeat === 17) {
          targetY = centerY + 7;
        } else if (stepInBeat >= 21 && stepInBeat <= 28) {
          targetY = centerY - 4 * Math.sin(((stepInBeat - 21) / 7) * Math.PI);
        } else {
          targetY = centerY;
        }
      } else if (instabilityPct <= 50) {
        // --- 2. ZVÝŠENÁ ZÁTĚŽ: Rychlejší, vyšší amplituda ---
        if (stepInBeat >= 5 && stepInBeat <= 8) {
          targetY = centerY - 4 * Math.sin(((stepInBeat - 5) / 3) * Math.PI);
        } else if (stepInBeat === 11) {
          targetY = centerY + 4;
        } else if (stepInBeat === 12) {
          targetY = centerY - 12;
        } else if (stepInBeat === 13) {
          targetY = centerY + 8;
        } else if (stepInBeat >= 16 && stepInBeat <= 22) {
          targetY = centerY - 4.5 * Math.sin(((stepInBeat - 16) / 6) * Math.PI);
        } else {
          targetY = centerY + (Math.random() - 0.5) * 1.5;
        }
      } else if (instabilityPct <= 80) {
        // --- 3. VYSOKÁ NESTABILITA: Arytmie, zubaté zákmity, třes ---
        const jitter = (Math.random() - 0.5) * 4;
        if (stepInBeat === 6) {
          targetY = centerY + 6 + jitter;
        } else if (stepInBeat === 7) {
          targetY = centerY - 13 + jitter;
        } else if (stepInBeat === 8) {
          targetY = centerY + 9 + jitter;
        } else if (stepInBeat === 9) {
          targetY = centerY - 6 + jitter;
        } else if (stepInBeat >= 13 && stepInBeat <= 19) {
          targetY = centerY - 6 * Math.sin(((stepInBeat - 13) / 6) * Math.PI) + jitter;
        } else {
          targetY = centerY + jitter;
        }
      } else if (instabilityPct > 100) {
        // --- 5. PŘETÍŽENÍ GENOMU (> 100 %): Agresivní glitch, elektrické zkraty a výboje ---
        const glitch = (Math.random() - 0.5) * 18;
        const wave = Math.sin(phase * 4.5) * 7;
        targetY = centerY + wave + glitch;
        if (Math.random() < 0.25) {
          targetY = Math.random() < 0.5 ? 1 : height - 2;
        }
      } else {
        // --- 4. KRITICKÝ STROP (81 - 100 %): Extrémní fibrilace a chaotické zubaté blesky! ---
        const chaoticJitter = (Math.random() - 0.5) * 12;
        const wave = Math.sin(phase * 2.8) * 6;
        targetY = centerY + wave + chaoticJitter;
        if (Math.random() < 0.2) {
          targetY = Math.random() < 0.5 ? 2 : height - 2;
        }
      }

      // Kreslení ostré EKG linky bez rozmazávání pozadí
      ctx.beginPath();
      ctx.moveTo(x, prevY);
      ctx.lineTo(x + speed, targetY);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = instabilityPct > 100 ? 2.2 : 1.7;
      ctx.lineCap = 'round';
      ctx.shadowBlur = instabilityPct > 100 ? 6 : 0;
      ctx.shadowColor = strokeColor;
      ctx.stroke();

      // Kreslící zářící laserový hrot na čele
      ctx.beginPath();
      ctx.arc(x + speed, targetY, instabilityPct > 100 ? 2.5 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      prevY = targetY;
      x += speed;

      if (x >= width) {
        x = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [instabilityPct, strokeColor]);

  return (
    <div className="relative w-full h-7 overflow-hidden rounded-md bg-slate-950 border border-white/10 flex items-center shadow-inner">
      {/* Velmi jemná tmavá mřížka osciloskopu */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_7px] pointer-events-none" />

      {/* Živý HTML5 Canvas pro plynulé kreslení v reálném čase */}
      <canvas
        ref={canvasRef}
        width={600}
        height={28}
        className="w-full h-full block relative z-10"
      />
    </div>
  );
};

export interface GenomicTreeViewProps {
  monster: Monster;
  inventory?: any[];
  onBack: () => void;
  onApplyMutation: (itemType: string, stats: any, targetSlot: number, multiplier: number) => void;
  onRemoveMutation: (slotIndex: number) => void;
  onSwapSlots: (fromSlot: number, toSlot: number, newMultiplier: number, oldMultiplier: number) => void;
}

export const GenomicTreeView: React.FC<GenomicTreeViewProps> = ({
  monster,
  inventory = [],
  onBack,
  onApplyMutation,
  onRemoveMutation,
  onSwapSlots
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tree' | 'history'>('tree');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(25);

  // Spodní vysouvací panely (Bottom Sheet) & Drag and Drop
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [targetSlotForInsert, setTargetSlotForInsert] = useState<{ slotIndex: number; multiplier: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showInstabilityHelp, setShowInstabilityHelp] = useState(false);

  const monsterLevel = monster.level || 1;
  const mutations = monster.mutations || [];
  const mutationsCount = mutations.length;
  const unlockedSlotsCount = getUnlockedGenomicSlots(monsterLevel);

  // Buněčná nestabilita (přirozená kapacita je 15 slotů, Zakázaná DNA ji vystřelí nad 100 %)
  const hasForbiddenMutation = mutations.some((m: any, idx: number) => (m.slotIndex ?? idx) === 15);
  const baseCapacityPct = Math.round((mutationsCount / BASE_GENOMIC_CAPACITY) * 100);
  const instabilityPct = hasForbiddenMutation
    ? Math.max(105, baseCapacityPct + 15)
    : Math.min(100, baseCapacityPct);

  const instabilityInfo = useMemo(() => {
    if (instabilityPct > 100) {
      return {
        level: '⚠️ PŘETÍŽENÍ GENOMU (> 100 %)',
        statusColor: 'text-rose-400 font-black animate-pulse',
        barColor: 'bg-gradient-to-r from-red-600 via-purple-600 to-rose-500 animate-pulse',
        glowColor: 'shadow-rose-600/70',
        desc: 'Byla překročena přirozená kapacita organismu! Bestie je nestabilní a její DNA láme biologické limity.',
      };
    } else if (instabilityPct <= 25) {
      return {
        level: 'STABILNÍ GENOM',
        statusColor: 'text-emerald-400',
        barColor: 'bg-emerald-500',
        glowColor: 'shadow-emerald-500/30',
        desc: 'Buněčná struktura přijímá mutageny bez vnitřního odporu tkáně.',
      };
    } else if (instabilityPct <= 50) {
      return {
        level: 'ZVÝŠENÁ BUNĚČNÁ ZÁTĚŽ',
        statusColor: 'text-sky-400',
        barColor: 'bg-sky-500',
        glowColor: 'shadow-sky-500/30',
        desc: 'Svalová vlákna houstnou a žilami monstra pulzuje cizí bio-energie.',
      };
    } else if (instabilityPct <= 80) {
      return {
        level: 'VYSOKÁ NESTABILITA TKÁNĚ',
        statusColor: 'text-amber-400',
        barColor: 'bg-amber-500',
        glowColor: 'shadow-amber-500/40',
        desc: 'Varování: Organismus je silně přetížen, metabolická rovnováha kolísá.',
      };
    } else {
      return {
        level: 'KRITICKÝ STROP DNA',
        statusColor: 'text-rose-400',
        barColor: 'bg-rose-600',
        glowColor: 'shadow-rose-600/50',
        desc: 'Absolutní strop buněk! Další zásah by způsobil nevratný genetický kolaps.',
      };
    }
  }, [instabilityPct]);

  // Mapování pater a slotů
  const tierSlotsData = useMemo(() => {
    return GENOMIC_TIERS.map((tier) => {
      const isTierUnlocked = monsterLevel >= tier.requiredLevel;
      const slots = tier.slotIndices.map((slotIdx) => {
        const mutation = mutations.find((m: any, idx: number) => (m.slotIndex ?? idx) === slotIdx) || null;
        return {
          slotIndex: slotIdx,
          isUnlocked: isTierUnlocked,
          tier,
          mutation,
          config: mutation ? RESOURCE_CONFIG[mutation.id] : null
        };
      });

      return {
        ...tier,
        isTierUnlocked,
        slots
      };
    });
  }, [monsterLevel, mutations]);

  // Celkové kumulativní bonusy
  const totalBonuses = useMemo(() => {
    let atk = 0;
    let hp = 0;
    let def = 0;
    let xp = 0;
    mutations.forEach((m: any) => {
      const cfg = RESOURCE_CONFIG[m.id];
      const mult = (m as any).multiplier || 1.0;
      if (cfg?.stats?.atk) atk += Math.round(cfg.stats.atk * mult);
      if (cfg?.stats?.hp) hp += Math.round(cfg.stats.hp * mult);
      if (cfg?.stats?.def) def += Math.round(cfg.stats.def * mult);
      if (cfg?.stats?.xp) xp += cfg.stats.xp;
    });
    return { atk, hp, def, xp };
  }, [mutations]);

  // Filtrované mutageny z inventáře
  const availableMutagens = useMemo(() => {
    return inventory.filter((i: any) => {
      if (!i || (i.count ?? 0) <= 0 || !i.type) return false;
      const cfg = RESOURCE_CONFIG[i.type];
      const isGem = i.type.startsWith('gem_') || cfg?.category === 'gem';
      return (cfg?.category === 'relic' || (cfg?.stats && !isGem) || i.type.startsWith('loot_') || i.type.startsWith('item_'));
    });
  }, [inventory]);

  const colors = getMonsterColors(monster.type);
  const rarityColor = getMonsterRarityColor(monster.rarity);
  const TypeIcon = ({ size = 20, className = "" }) => {
    const Icon = getMonsterTypeIcon(monster.type) || Activity;
    const iconColor = colors.text;
    return <Icon size={size} className={cn(iconColor, className)} />;
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-950 text-white flex flex-col overflow-x-hidden select-none pb-20">
      {/* Celostránkové realistické pozadí svalů a žil s tmavou poloprůhlednou vrstvou */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
        <img
          src="/vein_matrix_bg.jpg"
          alt="Bio Vein Matrix Background"
          className="w-full h-full object-cover object-center opacity-35 filter contrast-125"
        />
        {/* Tmavá poloprůhledná vrstva pro čistou čitelnost */}
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[0.5px]" />
      </div>

      {/* Header Section přesně podle MonsterDetail / screenshotu */}
      <div className="sticky top-0 z-40 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 border-b border-white/5 backdrop-blur-xl bg-slate-950/85">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 transition-colors shadow-lg shrink-0"
          >
            <ArrowLeft size={20} strokeWidth={3} />
          </motion.button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white uppercase tracking-tighter truncate leading-none drop-shadow-lg mb-1">
              {getLoc(monster.name, i18n.language)}
            </h1>
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", rarityColor)}>
                {t(`rarities.${RARITY_MAP[getLoc(monster.rarity)] || getLoc(monster.rarity, 'en').toLowerCase()}`)}
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

          <div className={cn("size-10 rounded-2xl flex items-center justify-center border-2 shadow-2xl transition-transform hover:scale-105 shrink-0", colors.bg, colors.border)}>
            <TypeIcon size={20} />
          </div>
        </div>

        {/* EKG Monitor vitálních funkcí & buněčné nestability */}
        <div className="mt-2 px-1 space-y-1">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowInstabilityHelp(true)}
              className="text-[8px] font-black text-primary uppercase tracking-[0.2em] opacity-90 flex items-center gap-1.5 hover:opacity-100 transition-opacity group cursor-pointer"
              title="Klikni pro informace o buněčné nestabilitě"
            >
              <Activity size={11} className={instabilityInfo.statusColor} />
              <span className="group-hover:text-white transition-colors">Kapacita tkáně & nestabilita</span>
              <HelpCircle size={11} className="text-slate-400 group-hover:text-cyan-300 transition-colors" />
            </button>
            <span className={cn(
              "text-[9px] font-black tabular-nums transition-colors",
              instabilityPct > 100 ? "text-rose-400 font-black animate-pulse" : "text-white/50"
            )}>
              {mutationsCount} <span className="mx-0.5">/</span> {BASE_GENOMIC_CAPACITY} slotů ({instabilityPct} %{instabilityPct > 100 ? ' ⚠️ PŘETÍŽENÍ' : ''})
            </span>
          </div>

          {/* Animovaný zubatý sinus / EKG monitor života (kliknutím otevře poučení) */}
          <div onClick={() => setShowInstabilityHelp(true)} className="cursor-pointer">
            <ECGMonitor instabilityPct={instabilityPct} />
          </div>

          {/* Tenký spodní ukazatel kapacity */}
          <div className="h-1 bg-black/60 rounded-full border border-white/5 overflow-hidden p-[0.5px]">
            <motion.div
              className={cn("h-full rounded-full transition-all duration-300", instabilityInfo.barColor)}
              style={{ width: `${Math.min(100, instabilityPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hlavní strom žil */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 py-1.5 sm:px-6">
        {activeTab === 'tree' ? (
          <div className="flex flex-col items-center space-y-1 sm:space-y-1.5">
            {tierSlotsData.map((tier, tIdx) => {
              const isHiddenTier = tier.tier === 6 && !tier.isTierUnlocked;

              return (
                <div
                  key={tier.tier}
                  className={cn(
                    "w-full flex flex-col items-center relative transition-all duration-500",
                    isHiddenTier ? "opacity-30 hover:opacity-80 scale-90" : ""
                  )}
                >
                  {/* Minimalistická hlavička patra */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full border backdrop-blur-md shadow-sm flex items-center gap-1.5",
                      isHiddenTier ? "text-rose-300/60 border-rose-500/20 bg-rose-950/20" : tier.badgeClass
                    )}>
                      <span>{isHiddenTier ? '???' : tier.name}</span>
                      <span className="opacity-50">•</span>
                      <span>{isHiddenTier ? 'Zahalená resonance' : tier.bonusLabel}</span>
                    </span>
                    {!tier.isTierUnlocked && (
                      <span className={cn(
                        "text-[9px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border",
                        isHiddenTier
                          ? "bg-rose-950/40 border-rose-500/30 text-rose-300/70"
                          : "bg-black/60 border-amber-500/30 text-amber-300/90"
                      )}>
                        <Lock size={9} /> Lv {tier.requiredLevel}
                      </span>
                    )}
                  </div>

                  {/* Uzly v patře */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap z-10">
                    {tier.slots.map((slot) => {
                      const hasMutation = !!slot.mutation;
                      const isUnlocked = slot.isUnlocked;
                      const isSelected = selectedSlot?.slotIndex === slot.slotIndex;

                      if (hasMutation && slot.config) {
                        // Obsazený uzel s podporou Drag and Drop
                        return (
                          <motion.div
                            key={slot.slotIndex}
                            drag
                            dragSnapToOrigin
                            dragElastic={0.15}
                            whileHover={{ scale: 1.1 }}
                            whileDrag={{
                              scale: 1.35,
                              zIndex: 100,
                              filter: 'drop-shadow(0 0 25px rgba(6, 182, 212, 0.95))'
                            }}
                            onDragStart={() => {
                              setIsDragging(true);
                            }}
                            onDragEnd={(_, info) => {
                              setTimeout(() => setIsDragging(false), 80);
                              const elements = document.elementsFromPoint(info.point.x, info.point.y);
                              const targetEl = elements.find(el => el.hasAttribute('data-genomic-slot')) as HTMLElement | undefined;
                              if (targetEl) {
                                const targetSlotIdx = parseInt(targetEl.getAttribute('data-genomic-slot') || '-1', 10);
                                const targetMult = parseFloat(targetEl.getAttribute('data-multiplier') || '1.0');
                                const isTargetUnlocked = targetEl.getAttribute('data-unlocked') === 'true';

                                if (targetSlotIdx >= 0 && targetSlotIdx !== slot.slotIndex && isTargetUnlocked) {
                                  onSwapSlots(slot.slotIndex, targetSlotIdx, targetMult, tier.multiplier);
                                  setSelectedSlot(null);
                                }
                              }
                            }}
                            onClick={() => {
                              if (!isDragging) {
                                setSelectedSlot(slot);
                                setTargetSlotForInsert(null);
                              }
                            }}
                            data-genomic-slot={slot.slotIndex}
                            data-multiplier={tier.multiplier}
                            data-unlocked={slot.isUnlocked ? 'true' : 'false'}
                            className={cn(
                              "relative group size-14 sm:size-16 rounded-full bg-slate-950/90 border-2 shadow-[0_0_22px_rgba(16,185,129,0.4)] flex flex-col items-center justify-center p-1.5 cursor-grab active:cursor-grabbing transition-all select-none touch-none",
                              isSelected
                                ? "border-amber-400 ring-4 ring-amber-400/60 scale-105"
                                : tier.tier === 6
                                ? "border-purple-400 shadow-[0_0_25px_rgba(192,132,252,0.8)]"
                                : tier.tier === 5
                                ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)]"
                                : "border-emerald-400 hover:border-emerald-300"
                            )}
                            title={`${getLoc(slot.config.label, i18n.language)} (Chyť a přetáhni do jiného slotu, nebo klikni pro detail)`}
                          >
                            <ResourceIcon id={slot.mutation!.id} config={slot.config} size="md" />
                            <div className={cn(
                              "absolute inset-0 rounded-full border pointer-events-none animate-pulse",
                              tier.tier === 6
                                ? "border-purple-400/70"
                                : tier.tier === 5
                                ? "border-amber-400/60"
                                : "border-emerald-400/50"
                            )} />
                          </motion.div>
                        );
                      }

                      if (isUnlocked) {
                        // Volný uzel (drop cíl i klikací pro vložení)
                        return (
                          <motion.button
                            key={slot.slotIndex}
                            data-genomic-slot={slot.slotIndex}
                            data-multiplier={tier.multiplier}
                            data-unlocked="true"
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (!isDragging) {
                                setTargetSlotForInsert({ slotIndex: slot.slotIndex, multiplier: tier.multiplier });
                                setSelectedSlot(null);
                              }
                            }}
                            className={cn(
                              "size-14 sm:size-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all shadow-md backdrop-blur-sm group",
                              tier.tier === 6
                                ? "border-purple-400 bg-purple-950/50 hover:bg-purple-900/60 hover:border-purple-300 text-purple-200 shadow-[0_0_22px_rgba(192,132,252,0.4)]"
                                : "border-cyan-400/70 bg-slate-950/70 hover:bg-cyan-950/50 hover:border-cyan-300 text-cyan-300/80 hover:text-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.3)]"
                            )}
                            title={`Vložit mutagen do tohoto slotu (${tier.bonusLabel})`}
                          >
                            <Plus size={20} className="group-hover:scale-125 transition-transform" />
                          </motion.button>
                        );
                      }

                      // Zamčený uzel (pokud je skrytý Tier 6, je mlhavý a tajemný)
                      if (isHiddenTier) {
                        return (
                          <div
                            key={slot.slotIndex}
                            data-genomic-slot={slot.slotIndex}
                            data-multiplier={tier.multiplier}
                            data-unlocked="false"
                            className="size-12 sm:size-13 rounded-full border border-dashed border-purple-500/30 bg-purple-950/20 flex flex-col items-center justify-center text-purple-400/60 opacity-50 shadow-inner backdrop-blur-[1px]"
                            title="Tajemná dimenze genomu (odemkne se na Lv 25)"
                          >
                            <Sparkles size={14} className="mb-0.5 text-purple-400/50 animate-pulse" />
                            <span className="text-[7px] font-black tracking-widest text-purple-400/60 uppercase">Lv 25</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={slot.slotIndex}
                          data-genomic-slot={slot.slotIndex}
                          data-multiplier={tier.multiplier}
                          data-unlocked="false"
                          className="size-14 sm:size-16 rounded-full border border-slate-700/60 bg-slate-950/80 flex flex-col items-center justify-center text-slate-400 opacity-60 shadow-inner backdrop-blur-sm"
                          title={`Odemkne se na úrovni ${tier.requiredLevel}`}
                        >
                          <Lock size={16} className="mb-0.5 text-slate-400" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Lv {tier.requiredLevel}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* SVG žíly mezi patry */}
                  {tIdx < tierSlotsData.length - 1 && (
                    <div className="w-full max-w-sm h-3 flex items-center justify-center relative my-0.5 pointer-events-none">
                      <svg className="w-full h-full" viewBox="0 0 200 24" fill="none">
                        <path
                          d="M100 0 L100 24 M70 4 L100 24 L130 4"
                          stroke={tIdx === 0 ? "rgba(192, 132, 252, 0.35)" : "url(#veinGradientMain)"}
                          strokeWidth="2"
                          strokeDasharray={tIdx === 0 ? "3 3" : "4 2"}
                          opacity={tIdx === 0 && isHiddenTier ? 0.2 : 0.6}
                          className="animate-pulse"
                        />
                        <defs>
                          <linearGradient id="veinGradientMain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* --- CHRONOLOGIE --- */
          <div className="space-y-3 max-w-2xl mx-auto">
            {mutations.length === 0 ? (
              <div className="text-center py-16 text-slate-400 italic text-sm">
                <Dna className="size-12 mx-auto mb-3 opacity-30" />
                Dosud nebyly do této příšery vloženy žádné genetické mutace.
              </div>
            ) : (
              <div className="space-y-2">
                {mutations.slice(0, visibleHistoryCount).map((mut: any, idx: number) => {
                  const cfg = RESOURCE_CONFIG[mut.id];
                  const mult = (mut as any).multiplier || 1.0;
                  const atkBonus = cfg?.stats?.atk ? Math.round(cfg.stats.atk * mult) : 0;
                  const hpBonus = cfg?.stats?.hp ? Math.round(cfg.stats.hp * mult) : 0;
                  const defBonus = cfg?.stats?.def ? Math.round(cfg.stats.def * mult) : 0;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 backdrop-blur-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-11 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-center">
                          <ResourceIcon id={mut.id} config={cfg} size="md" />
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-black text-white uppercase">
                            {getLoc(cfg?.label, i18n.language) || mut.id}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {new Date(mut.timestamp).toLocaleDateString()} • {mult > 1.0 ? `${mult}× Boost` : 'Standard'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 justify-end text-[9px] font-black">
                        {atkBonus > 0 && <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">+{atkBonus} ATK</span>}
                        {hpBonus > 0 && <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">+{hpBonus} HP</span>}
                        {defBonus > 0 && <span className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">+{defBonus} DEF</span>}
                      </div>
                    </div>
                  );
                })}

                {mutations.length > visibleHistoryCount && (
                  <button
                    onClick={() => setVisibleHistoryCount(p => p + 25)}
                    className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-xl text-xs font-black text-emerald-300 uppercase tracking-widest transition-colors"
                  >
                    + Načíst další ({mutations.length - visibleHistoryCount} zbývá)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- BOTTOM SHEET: DETAIL MUTAGENU VYJÍŽDĚJÍCÍ ZE SPODA --- */}
      <AnimatePresence>
        {selectedSlot && selectedSlot.config && (() => {
          const atkStat = selectedSlot.config.stats?.atk ? Math.round(selectedSlot.config.stats.atk * selectedSlot.tier.multiplier) : 0;
          const hpStat = selectedSlot.config.stats?.hp ? Math.round(selectedSlot.config.stats.hp * selectedSlot.tier.multiplier) : 0;
          const defStat = selectedSlot.config.stats?.def ? Math.round(selectedSlot.config.stats.def * selectedSlot.tier.multiplier) : 0;

          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSlot(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Bottom Sheet Drawer */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 240 }}
                className="relative z-10 w-full max-w-lg bg-slate-950/95 border-t-2 border-emerald-400/50 rounded-t-[2.5rem] p-6 pb-12 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 backdrop-blur-2xl"
              >
                {/* Drag pill handle */}
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-2 mb-1 cursor-pointer" onClick={() => setSelectedSlot(null)} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="size-14 rounded-2xl bg-slate-900 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <ResourceIcon id={selectedSlot.mutation.id} config={selectedSlot.config} size="lg" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                        {getLoc(selectedSlot.config.label, i18n.language) || selectedSlot.mutation.id}
                      </h4>
                      <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                          {selectedSlot.tier.name}
                        </span>
                        <span>{selectedSlot.tier.bonusLabel}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="size-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Popis relikvie */}
                {selectedSlot.config.description && (
                  <p className="text-xs text-slate-300 italic bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
                    {getLoc(selectedSlot.config.description, i18n.language)}
                  </p>
                )}

                {/* Staty */}
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  {atkStat > 0 && (
                    <span className="text-red-400 bg-red-400/10 px-3 py-1 rounded-xl border border-red-400/20 flex items-center gap-1.5 shadow-sm">
                      <Sword size={14} />
                      +{atkStat} ATK
                    </span>
                  )}
                  {hpStat > 0 && (
                    <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-xl border border-emerald-400/20 flex items-center gap-1.5 shadow-sm">
                      <Heart size={14} />
                      +{hpStat} HP
                    </span>
                  )}
                  {defStat > 0 && (
                    <span className="text-blue-400 bg-blue-400/10 px-3 py-1 rounded-xl border border-blue-400/20 flex items-center gap-1.5 shadow-sm">
                      <Shield size={14} />
                      +{defStat} DEF
                    </span>
                  )}
                </div>

                {/* Tlačítko Odebrat (přesun je řešen pomocí Drag & Drop) */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onRemoveMutation(selectedSlot.slotIndex);
                      setSelectedSlot(null);
                    }}
                    className="w-full py-3.5 px-4 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                    title="Odebrat tuto relikvii z těla a vrátit do batohu"
                  >
                    <Package size={16} />
                    Odebrat
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* --- BOTTOM SHEET: VÝBĚR MUTAGENU VYJÍŽDĚJÍCÍ ZE SPODA --- */}
      <AnimatePresence>
        {targetSlotForInsert && (() => {
          const targetTier = getTierForSlot(targetSlotForInsert.slotIndex);
          const mult = targetSlotForInsert.multiplier;

          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setTargetSlotForInsert(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Bottom Sheet Drawer */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 240 }}
                className="relative z-10 w-full max-w-xl sm:max-w-2xl bg-slate-950/95 border-t-2 border-cyan-400 rounded-t-[2.5rem] p-4 sm:p-6 pb-12 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-3 sm:gap-4 backdrop-blur-2xl max-h-[85vh]"
              >
                {/* Drag pill handle */}
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-1 mb-0.5 cursor-pointer" onClick={() => setTargetSlotForInsert(null)} />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <Sparkles size={16} className="text-cyan-400" />
                      Vložit Mutagen do žíly
                    </h4>
                    <p className="text-[11px] sm:text-xs text-cyan-300 font-bold mt-0.5">
                      {targetTier.name} • {targetTier.bonusLabel}
                    </p>
                  </div>

                  <button
                    onClick={() => setTargetSlotForInsert(null)}
                    className="size-8 sm:size-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Seznam mutagenů z batohu */}
                {availableMutagens.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic text-xs border border-dashed border-white/10 rounded-2xl">
                    V batohu nemáš žádné relikvie ani mutageny vhodné k vložení.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5 overflow-y-auto pr-1 max-h-80 custom-scrollbar">
                    {availableMutagens.map((item: any) => {
                      const cfg = RESOURCE_CONFIG[item.type];
                      const atkBonus = cfg?.stats?.atk ? Math.round(cfg.stats.atk * mult) : 0;
                      const hpBonus = cfg?.stats?.hp ? Math.round(cfg.stats.hp * mult) : 0;
                      const defBonus = cfg?.stats?.def ? Math.round(cfg.stats.def * mult) : 0;

                      return (
                        <motion.button
                          key={item.type}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (cfg?.stats) {
                              const effectiveStats = {
                                ...cfg.stats,
                                hp: cfg.stats.hp ? Math.round(cfg.stats.hp * mult) : undefined,
                                atk: cfg.stats.atk ? Math.round(cfg.stats.atk * mult) : undefined,
                                def: cfg.stats.def ? Math.round(cfg.stats.def * mult) : undefined,
                              };
                              onApplyMutation(item.type, effectiveStats, targetSlotForInsert.slotIndex, mult);
                              setTargetSlotForInsert(null);
                            }
                          }}
                          className="p-2 sm:p-2.5 bg-slate-900/90 hover:bg-cyan-950/60 border border-white/15 hover:border-cyan-400 rounded-2xl flex flex-col items-center text-center gap-1 transition-all shadow-lg group"
                        >
                          <ResourceIcon id={item.type} config={cfg} size="md" />
                          <span className="text-[10px] sm:text-[11px] font-black text-white uppercase line-clamp-1 w-full">
                            {getLoc(cfg?.label, i18n.language) || item.type}
                          </span>
                          <span className="text-[8px] font-bold text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded-full border border-cyan-500/30">
                            {item.count}× na skladě
                          </span>
                          <div className="flex flex-wrap gap-0.5 sm:gap-1 justify-center text-[7px] sm:text-[8px] font-black text-slate-300 mt-0.5">
                            {atkBonus > 0 && <span className="text-red-400">+{atkBonus} ATK</span>}
                            {hpBonus > 0 && <span className="text-emerald-400">+{hpBonus} HP</span>}
                            {defBonus > 0 && <span className="text-blue-400">+{defBonus} DEF</span>}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* --- MODÁL: POUČENÍ O BUNĚČNÉ NESTABILITĚ --- */}
      <AnimatePresence>
        {showInstabilityHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstabilityHelp(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-5 shadow-2xl z-10 max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              {/* Hlavička modalu */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      Protokol buněčné nestability
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Biologický limit a přetížení DNA
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstabilityHelp(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Obsah poučení */}
              <div className="py-4 space-y-3.5 text-xs text-slate-300 leading-relaxed">
                {/* Úvod */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                  <p className="font-semibold text-slate-200">
                    Každá genetická mutace v těle bestie vyžaduje bio-energii. Základní kostra organismu má přirozenou bezpečnou kapacitu <span className="text-cyan-300 font-black">15 slotů</span>.
                  </p>
                </div>

                {/* Stupně nestability */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Fáze zátěže organismu:
                  </h4>

                  <div className="grid gap-2">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                      <div className="size-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                      <div>
                        <div className="font-black text-emerald-300 uppercase text-[11px]">
                          0 – 25 % • Stabilní genom
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Tělo přijímá mutageny bez vnitřního odporu. Srdeční rytmus je klidný a pravidelný.
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-start gap-2.5">
                      <div className="size-2 rounded-full bg-sky-400 mt-1 shrink-0" />
                      <div>
                        <div className="font-black text-sky-300 uppercase text-[11px]">
                          26 – 50 % • Zvýšená zátěž
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Svalová vlákna houstnou a elektrický puls tkání se zrychluje.
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                      <div className="size-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                      <div>
                        <div className="font-black text-amber-300 uppercase text-[11px]">
                          51 – 80 % • Vysoká nestabilita
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Metabolismus kolísá, objevuje se arytmie a třes svaloviny. Bestie je nabitá nestálou energií.
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                      <div className="size-2 rounded-full bg-rose-400 mt-1 shrink-0" />
                      <div>
                        <div className="font-black text-rose-300 uppercase text-[11px]">
                          81 – 100 % • Kritický strop
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Absolutní hranice přirozené biologické kapacity (15/15 slotů).
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                      <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0 animate-pulse" />
                      <div>
                        <div className="font-black text-rose-300 uppercase text-[11px] flex items-center gap-1.5">
                          <span>&gt; 100 % • Zakázaná DNA & Přetížení</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Na <span className="text-amber-300 font-bold">úrovni 25</span> lze odemknout tajný 16. slot (<span className="text-rose-300 font-bold">Zakázaná DNA</span>). Vložením mutagenu dojde k prolomení limitu těla a vystřelení nestability nad 100 %!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dopad na hru */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1">
                  <div className="font-black text-amber-300 uppercase text-[11px] flex items-center gap-1.5">
                    <span>⚔️ Dopad nestability na souboje</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Vysoká nestabilita a přetížení nad 100 % dodávají monstru gigantické statistické bonusy, avšak v těžkých bojích a dungeonech mohou vyvolat nečekané stavy (např. nekontrolovatelný záchvat hněvu, přehřátí nebo nestabilní výboje).
                  </p>
                </div>
              </div>

              {/* Tlačítko zavřít */}
              <div className="pt-2">
                <button
                  onClick={() => setShowInstabilityHelp(false)}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-colors shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                  Rozumím
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spodní fixní lišta se součtem DNA */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/90 border-t border-white/10 backdrop-blur-2xl px-4 py-3 flex items-center justify-center max-w-4xl mx-auto shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kumulativní DNA:</span>
          <div className="flex items-center gap-2 text-[10px] font-black">
            <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              +{totalBonuses.hp} HP
            </span>
            <span className="text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
              +{totalBonuses.atk} ATK
            </span>
            <span className="text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              +{totalBonuses.def} DEF
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
