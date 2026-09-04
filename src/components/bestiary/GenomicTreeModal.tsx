import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dna, Lock, Sparkles, Activity, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, getLoc } from '../../utils';
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

export interface GenomicTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  monster: Monster;
  onOpenMutatePicker: (targetSlot?: number, multiplier?: number) => void;
  onRemoveMutation?: (slotIndex: number) => void;
  onSwapSlots?: (fromSlot: number, toSlot: number, newMultiplier: number, oldMultiplier: number) => void;
}

export const GenomicTreeModal: React.FC<GenomicTreeModalProps> = ({
  isOpen,
  onClose,
  monster,
  onOpenMutatePicker,
  onRemoveMutation,
  onSwapSlots
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tree' | 'history'>('tree');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(20);

  // Stav pro akce nad uzlem (detail, extrakce, přesun)
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [movingSlot, setMovingSlot] = useState<number | null>(null);

  const monsterLevel = monster.level || 1;
  const mutations = monster.mutations || [];
  const mutationsCount = mutations.length;
  const unlockedSlotsCount = getUnlockedGenomicSlots(monsterLevel);
  const canMutate = mutationsCount < unlockedSlotsCount && mutationsCount < TOTAL_GENOMIC_SLOTS;

  // Buněčná nestabilita (0 - 100 %)
  const instabilityPct = Math.min(100, Math.round((mutationsCount / TOTAL_GENOMIC_SLOTS) * 100));

  const instabilityInfo = useMemo(() => {
    if (instabilityPct <= 25) {
      return {
        level: 'STABILNÍ GENOM',
        statusColor: 'text-emerald-400',
        barColor: 'bg-emerald-500',
        glowColor: 'shadow-emerald-500/20',
        desc: 'Buněčná struktura přijímá úpravy přirozeně a bez vnitřního odporu tkáně.',
      };
    } else if (instabilityPct <= 50) {
      return {
        level: 'ZVÝŠENÁ BUNĚČNÁ ZÁTĚŽ',
        statusColor: 'text-sky-400',
        barColor: 'bg-sky-500',
        glowColor: 'shadow-sky-500/20',
        desc: 'Svalová vlákna houstnou a žilami monstra začíná proudit cizí bio-energie.',
      };
    } else if (instabilityPct <= 80) {
      return {
        level: 'VYSOKÁ NESTABILITA TKÁNĚ',
        statusColor: 'text-amber-400',
        barColor: 'bg-amber-500',
        glowColor: 'shadow-amber-500/30',
        desc: 'Varování laboratoře: Organismus je silně přetížen, metabolická rovnováha kolísá.',
      };
    } else {
      return {
        level: 'KRITICKÝ STROP DNA',
        statusColor: 'text-rose-400',
        barColor: 'bg-rose-600',
        glowColor: 'shadow-rose-600/40',
        desc: 'Kritická nestabilita! Buněčná struktura je na absolutním limitu. Další úprava by způsobila genetický kolaps.',
      };
    }
  }, [instabilityPct]);

  // Mapování mutací do pyramidálních pater
  const tierSlotsData = useMemo(() => {
    return GENOMIC_TIERS.map((tier) => {
      const isTierUnlocked = monsterLevel >= tier.requiredLevel;
      const slots = tier.slotIndices.map((slotIdx) => {
        // Najdeme mutaci s tímto explicitním slotIndexem, nebo podle pořadí v poli
        const mutation = mutations.find((m: any, idx) => (m.slotIndex ?? idx) === slotIdx) || null;
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
    mutations.forEach(m => {
      const cfg = RESOURCE_CONFIG[m.id];
      const mult = (m as any).multiplier || 1.0;
      if (cfg?.stats?.atk) atk += Math.round(cfg.stats.atk * mult);
      if (cfg?.stats?.hp) hp += Math.round(cfg.stats.hp * mult);
      if (cfg?.stats?.def) def += Math.round(cfg.stats.def * mult);
      if (cfg?.stats?.xp) xp += cfg.stats.xp;
    });
    return { atk, hp, def, xp };
  }, [mutations]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Realistické pozadí pulzujících žil a svalů - decentní */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
            <img
              src="/vein_matrix_bg.jpg"
              alt="Bio Vein Matrix"
              className="w-full h-full object-cover object-center opacity-45 filter contrast-125 saturate-110"
            />
            {/* Jemný závoj pro klidné a čitelné popředí */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[0.5px]" />
          </div>

          {/* Header */}
          <div className="relative z-10 p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-primary/30 to-purple-500/30 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                <Dna className="size-6 text-emerald-400 animate-pulse" />
                <div className="absolute inset-0 bg-emerald-400/10 animate-ping" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>Biologická Matice Žil</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Lv {monsterLevel}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 font-bold">
                  {getLoc(monster.name, i18n.language)} • Kapacita tkáně {mutationsCount} / {TOTAL_GENOMIC_SLOTS}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="size-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Biohazard Instability Bar */}
          <div className="relative z-10 px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 shrink-0 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1.5 text-xs font-black">
              <span className="text-slate-300 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <Activity size={13} className={instabilityInfo.statusColor} />
                Genetická Zátěž & Svalová Nestabilita
              </span>
              <span className={cn("uppercase tracking-wider text-[11px] font-black", instabilityInfo.statusColor)}>
                {instabilityInfo.level} ({instabilityPct} %)
              </span>
            </div>

            {/* Progress Bar with pulse */}
            <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/20 p-0.5 relative shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${instabilityPct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn("h-full rounded-full transition-all duration-300 shadow-[0_0_12px_currentColor]", instabilityInfo.barColor, instabilityInfo.glowColor)}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-300 italic">
              {instabilityInfo.desc}
            </p>
          </div>

          {/* Režim přesunu upozornění */}
          {movingSlot !== null && (
            <div className="relative z-10 bg-cyan-950/90 border-b border-cyan-400 px-4 py-2 flex items-center justify-between text-xs text-cyan-200">
              <div className="flex items-center gap-2 font-bold">
                <ArrowRightLeft size={16} className="animate-spin text-cyan-300" />
                <span>Vyber cílový slot pro přesun mutagenu</span>
              </div>
              <button
                onClick={() => setMovingSlot(null)}
                className="px-2.5 py-0.5 bg-white/10 hover:bg-white/20 rounded-md text-[10px] uppercase font-black"
              >
                Zrušit
              </button>
            </div>
          )}

          {/* Tabs switch: Tree vs History */}
          <div className="relative z-10 flex border-b border-white/10 px-4 sm:px-6 bg-black/60 shrink-0">
            <button
              onClick={() => setActiveTab('tree')}
              className={cn(
                "py-2.5 px-4 text-xs font-black uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-2",
                activeTab === 'tree' ? "text-emerald-400 border-emerald-400" : "text-slate-400 border-transparent hover:text-slate-200"
              )}
            >
              <Dna size={14} />
              Pyramida Žil & Tkáň
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "py-2.5 px-4 text-xs font-black uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-2",
                activeTab === 'history' ? "text-emerald-400 border-emerald-400" : "text-slate-400 border-transparent hover:text-slate-200"
              )}
            >
              <Activity size={14} />
              Historie Mutací ({mutationsCount})
            </button>
          </div>

          {/* Modal Body */}
          <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5">
            {activeTab === 'tree' ? (
              /* --- PYRAMID VEIN TREE VIEW --- */
              <div className="flex flex-col items-center space-y-3">
                {tierSlotsData.map((tier, tIdx) => (
                  <div key={tier.tier} className="w-full flex flex-col items-center relative">
                    {/* Tier Level Header with Multiplier Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border shadow-md backdrop-blur-md", tier.badgeClass)}>
                        {tier.name}
                      </span>
                      <span className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-amber-300 shadow-sm">
                        {tier.bonusLabel}
                      </span>
                      {!tier.isTierUnlocked && (
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-md border border-white/10">
                          <Lock size={10} className="text-amber-400" /> Vyžaduje Lv {tier.requiredLevel}
                        </span>
                      )}
                    </div>

                    {/* Tier Slots Row with Bio-Vein Sockets */}
                    <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap z-10">
                      {tier.slots.map((slot) => {
                        const hasMutation = !!slot.mutation;
                        const isUnlocked = slot.isUnlocked;
                        const isSelectedForAction = selectedSlot?.slotIndex === slot.slotIndex;
                        const isSourceMove = movingSlot === slot.slotIndex;

                        if (hasMutation && slot.config) {
                          // Occupied Node - Living glowing bio-socket
                          return (
                            <motion.div
                              key={slot.slotIndex}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                if (movingSlot !== null) {
                                  // Kliknutí na jiný obsazený uzel v režimu přesunu -> prohodit!
                                  if (movingSlot !== slot.slotIndex && onSwapSlots) {
                                    const sourceTier = getTierForSlot(movingSlot);
                                    onSwapSlots(movingSlot, slot.slotIndex, tier.multiplier, sourceTier.multiplier);
                                    setMovingSlot(null);
                                    setSelectedSlot(null);
                                  }
                                } else {
                                  setSelectedSlot(slot);
                                }
                              }}
                              className={cn(
                                "relative group size-13 sm:size-15 rounded-full bg-slate-950/90 border-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex flex-col items-center justify-center p-1 cursor-pointer transition-all",
                                isSourceMove
                                  ? "border-cyan-400 ring-4 ring-cyan-400/50 scale-110"
                                  : isSelectedForAction
                                  ? "border-amber-400 ring-4 ring-amber-400/50 scale-105"
                                  : tier.tier === 5
                                  ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)]"
                                  : "border-emerald-400 hover:border-emerald-300"
                              )}
                              title={`${getLoc(slot.config.label, i18n.language)} (Klikni pro správu / extrakci)`}
                            >
                              <ResourceIcon id={slot.mutation!.id} config={slot.config} size="md" />
                              {/* Glowing pulse ring */}
                              <div className={cn(
                                "absolute inset-0 rounded-full border pointer-events-none animate-pulse",
                                tier.tier === 5 ? "border-amber-400/60" : "border-emerald-400/50"
                              )} />
                            </motion.div>
                          );
                        }

                        if (isUnlocked) {
                          // Unlocked Empty Node - Clean bio-socket with subtle plus icon, no text
                          return (
                            <motion.button
                              key={slot.slotIndex}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                if (movingSlot !== null) {
                                  // Přesun do tohoto volného slotu
                                  if (onSwapSlots) {
                                    const sourceTier = getTierForSlot(movingSlot);
                                    onSwapSlots(movingSlot, slot.slotIndex, tier.multiplier, sourceTier.multiplier);
                                    setMovingSlot(null);
                                    setSelectedSlot(null);
                                  }
                                } else {
                                  onOpenMutatePicker(slot.slotIndex, tier.multiplier);
                                }
                              }}
                              className={cn(
                                "size-13 sm:size-15 rounded-full border-2 border-dashed flex items-center justify-center transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] backdrop-blur-sm group",
                                movingSlot !== null
                                  ? "border-cyan-300 bg-cyan-900/50 animate-pulse text-cyan-200 ring-2 ring-cyan-300/50"
                                  : "border-cyan-400/60 bg-slate-950/60 hover:bg-cyan-950/40 hover:border-cyan-300 text-cyan-300/70 hover:text-cyan-200"
                              )}
                              title={movingSlot !== null ? "Klikni pro přesun mutagenu sem" : `Vložit mutagen (${tier.bonusLabel})`}
                            >
                              <Plus size={18} className="group-hover:scale-125 transition-transform" />
                            </motion.button>
                          );
                        }

                        // Locked Node
                        return (
                          <div
                            key={slot.slotIndex}
                            className="size-13 sm:size-15 rounded-full border border-slate-700/60 bg-slate-950/80 flex flex-col items-center justify-center text-slate-400 opacity-60 shadow-inner backdrop-blur-sm"
                            title={`Odemkne se na úrovni ${tier.requiredLevel}`}
                          >
                            <Lock size={14} className="mb-0.5 text-slate-400" />
                            <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Lv {tier.requiredLevel}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Connecting Vein SVG between tiers */}
                    {tIdx < tierSlotsData.length - 1 && (
                      <div className="w-full max-w-xs h-6 flex items-center justify-center relative my-0.5 pointer-events-none">
                        <svg className="w-full h-full" viewBox="0 0 200 24" fill="none">
                          <path
                            d="M100 0 L100 24 M70 4 L100 24 L130 4"
                            stroke="url(#veinGradient)"
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                            className="animate-pulse"
                          />
                          <defs>
                            <linearGradient id="veinGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}

                {/* Slot Action Sheet (Extrahovat / Přesunout) */}
                <AnimatePresence>
                  {selectedSlot && selectedSlot.config && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="w-full mt-3 p-4 bg-slate-900/90 border border-emerald-500/40 rounded-2xl shadow-xl flex flex-col gap-3 backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-11 rounded-xl bg-slate-950 border border-emerald-400/50 flex items-center justify-center">
                            <ResourceIcon id={selectedSlot.mutation.id} config={selectedSlot.config} size="md" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white uppercase">
                              {getLoc(selectedSlot.config.label, i18n.language) || selectedSlot.mutation.id}
                            </h4>
                            <p className="text-[10px] text-emerald-400 font-bold">
                              {selectedSlot.tier.name} • {selectedSlot.tier.bonusLabel}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedSlot(null)}
                          className="size-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Stat summary with tier multiplier */}
                      <div className="flex flex-wrap gap-2 text-[10px] font-black">
                        {(selectedSlot.config.stats?.atk || 0) > 0 && (
                          <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded-lg border border-red-400/20">
                            +{Math.round(selectedSlot.config.stats.atk * selectedSlot.tier.multiplier)} ATK
                          </span>
                        )}
                        {(selectedSlot.config.stats?.hp || 0) > 0 && (
                          <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20">
                            +{Math.round(selectedSlot.config.stats.hp * selectedSlot.tier.multiplier)} HP
                          </span>
                        )}
                        {(selectedSlot.config.stats?.def || 0) > 0 && (
                          <span className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg border border-blue-400/20">
                            +{Math.round(selectedSlot.config.stats.def * selectedSlot.tier.multiplier)} DEF
                          </span>
                        )}
                      </div>

                      {/* Action buttons: Move & Delete */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            setMovingSlot(selectedSlot.slotIndex);
                            setSelectedSlot(null);
                          }}
                          className="py-2.5 px-3 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                        >
                          <ArrowRightLeft size={14} />
                          Přesunout mutagen
                        </button>

                        <button
                          onClick={() => {
                            if (onRemoveMutation) {
                              onRemoveMutation(selectedSlot.slotIndex);
                            }
                            setSelectedSlot(null);
                          }}
                          className="py-2.5 px-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Trash2 size={14} />
                          Extrahovat (Smazat)
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* --- CHRONOLOGICAL HISTORY LIST VIEW --- */
              <div className="space-y-3">
                {mutations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-sm">
                    <Dna className="size-10 mx-auto mb-2 opacity-30" />
                    Žádné genetické mutace dosud nebyly aplikovány.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mutations.slice(0, visibleHistoryCount).map((mut, idx) => {
                      const cfg = RESOURCE_CONFIG[mut.id];
                      const mult = (mut as any).multiplier || 1.0;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-center">
                              <ResourceIcon id={mut.id} config={cfg} size="md" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-white uppercase">
                                {getLoc(cfg?.label, i18n.language) || mut.id}
                              </h5>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                {new Date(mut.timestamp).toLocaleDateString()} • {mult > 1.0 ? `${mult}× Boost` : 'Standard'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 justify-end text-[8px] font-black">
                            {(cfg?.stats?.atk || 0) > 0 && <span className="text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">+{Math.round((cfg?.stats?.atk || 0) * mult)} ATK</span>}
                            {(cfg?.stats?.hp || 0) > 0 && <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">+{Math.round((cfg?.stats?.hp || 0) * mult)} HP</span>}
                            {(cfg?.stats?.def || 0) > 0 && <span className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">+{Math.round((cfg?.stats?.def || 0) * mult)} DEF</span>}
                          </div>
                        </div>
                      );
                    })}

                    {mutations.length > visibleHistoryCount && (
                      <button
                        onClick={() => setVisibleHistoryCount(p => p + 25)}
                        className="w-full py-2.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-xl text-[10px] font-black text-primary uppercase tracking-widest transition-colors"
                      >
                        + Načíst další ({mutations.length - visibleHistoryCount} zbývá)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with cumulative DNA stats & Mutate action */}
          <div className="relative z-10 p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kumulativní DNA:</span>
              <div className="flex items-center gap-2 text-[10px] font-black">
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                  +{totalBonuses.hp} HP
                </span>
                <span className="text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                  +{totalBonuses.atk} ATK
                </span>
                <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                  +{totalBonuses.def} DEF
                </span>
              </div>
            </div>

            <button
              onClick={() => onOpenMutatePicker()}
              disabled={!canMutate}
              className={cn(
                "px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 border shadow-lg",
                canMutate
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/40 shadow-emerald-900/40"
                  : "bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed"
              )}
            >
              <Plus size={14} />
              <span>Vložit Mutagen</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
