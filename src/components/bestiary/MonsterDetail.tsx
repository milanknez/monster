import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bolt, Zap, LayoutGrid, RefreshCw, Flame, Droplets, Leaf, Clock, Package, Plus, Heart, Sword, Shield, Trash2, X, FlaskConical, Sparkles, Info, Trophy, ChevronRight } from 'lucide-react';

import { cn, TYPE_COLORS, getMonsterMaxHP, TYPE_MATCHUP } from '../../utils';
import { RESOURCE_CONFIG } from '../../data/resources';
import { ResourceIcon } from '../ui/ResourceIcon';
import type { Monster } from '../../types';

const RARITY_COLORS: Record<string, string> = {
  'Běžná': 'text-slate-400',
  'Vzácná': 'text-blue-400',
  'Epická': 'text-purple-400',
  'Legendární': 'text-amber-400'
}

export const MonsterDetail = forwardRef<HTMLDivElement, { 
  monster: Monster; 
  onBack: () => void; 
  onUpgrade?: () => void; 
  inventory?: any[]; 
  onUsePotion?: (type: string) => void; 
  onUseLoot?: (type: string) => void;
  onEquipGem?: (idx: number, gemType: string | null) => void; 
  onEquipItem?: (idx: number, itemType: string | null) => void;
  onRelease?: () => void 
}>(
  ({ monster, onBack, onUpgrade, inventory, onUsePotion, onUseLoot, onEquipGem, onEquipItem, onRelease }, ref) => {
    const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
    const [activeItemSlotIdx, setActiveItemSlotIdx] = useState<number | null>(null);
    const [confirmRelease, setConfirmRelease] = useState(false);
    const [showHealingModal, setShowHealingModal] = useState(false);
    const [showLootModal, setShowLootModal] = useState(false);
    if (!monster) return null;
    const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default']

    // Při otevření detailu nascrollovat nahoru
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

    const TypeIcon = () => {
      switch (monster.type) {
        case 'Ohnivá': return <Flame size={20} className="text-red-500" />;
        case 'Vodní': return <Droplets size={20} className="text-blue-400" />;
        case 'Přírodní': return <Leaf size={20} className="text-green-400" />;
        case 'Elektrická': return <Zap size={20} className="text-yellow-400" />;
        default: return <Bolt size={20} className="text-yellow-400" />;
      }
    };

    const TypeIconLarge = () => {
      const props = { size: 180, className: "opacity-[0.05] absolute -top-10 -right-10 rotate-12 pointer-events-none" };
      switch (monster.type) {
        case 'Ohnivá': return <Flame {...props} className={cn(props.className, "text-red-500")} />;
        case 'Vodní': return <Droplets {...props} className={cn(props.className, "text-blue-500")} />;
        case 'Přírodní': return <Leaf {...props} className={cn(props.className, "text-green-500")} />;
        case 'Elektrická': return <Zap {...props} className={cn(props.className, "text-yellow-500")} />;
        default: return <Bolt {...props} className={cn(props.className, "text-yellow-500")} />;
      }
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 100 || info.velocity.x > 500) {
            onBack();
          }
        }}
        className="w-full min-h-screen bg-background-dark pb-20"
      >
        <div className={cn(
          "w-full rounded-b-[2.5rem] p-3 pt-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-t-0 overflow-hidden relative",
          monster.type === 'Ohnivá' ? "border-[#4a1a1a] bg-[#2a0a0a]" :
            monster.type === 'Vodní' ? "border-[#1a2a4a] bg-[#0a1a2a]" :
              monster.type === 'Přírodní' ? "border-[#1a3a1a] bg-[#0a2a0a]" :
                "border-[#3a2a1a] bg-[#2a1a0a]"
        )}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-[2.5rem]">
            <div className="absolute inset-0 w-[200%] h-full opacity-20 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.6)_45%,rgba(255,255,255,0.6)_50%,transparent_55%)] animate-shimmer transform-gpu" />
          </div>

          <TypeIconLarge />

          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-inner">
              <button
                onClick={onBack}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 transition-colors shrink-0"
              >
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter drop-shadow-md truncate leading-none mb-1.5">
                  {monster.name}
                </h2>
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none">XP k další úrovni</span>
                    <span className="text-[8px] font-black text-white/50 tabular-nums leading-none">{Math.round(monster.totalXP || 0)} / {monster.level * 250}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ((monster.totalXP || 0) / (monster.level * 250)) * 100)}%` }}
                      className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                    />
                  </div>
                </div>
              </div>
              <div className={cn("size-10 rounded-xl flex items-center justify-center border shadow-lg", colors.bg, colors.border)}>
                <TypeIcon />
              </div>
            </div>

            <div className="relative aspect-square w-full bg-black/60 rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl">
              <div className={cn("absolute inset-0 opacity-40",
                monster.type === 'Ohnivá' ? "bg-[radial-gradient(circle_at_center,_#ff4444_0%,_transparent_70%)]" :
                  monster.type === 'Vodní' ? "bg-[radial-gradient(circle_at_center,_#0db9f2_0%,_transparent_70%)]" :
                    "bg-[radial-gradient(circle_at_center,_#a3e635_0%,_transparent_70%)]"
              )} />
              <motion.img
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                src={monster.image}
                className="w-full h-full object-contain relative z-10 p-8 drop-shadow-[0_30px_50px_rgba(0,0,0,1)]"
              />
              <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center">
                <div className="bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1.5 rounded-xl shadow-2xl transform rotate-3">
                  <p className="text-xl font-black text-white italic leading-none tracking-tighter">LVL {monster.level}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-center items-center">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none mb-2">Kategorie Karty</span>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                    {(() => {
                      const Icon = () => {
                        switch (monster.type) {
                          case 'Ohnivá': return <Flame size={14} className="text-red-500" />;
                          case 'Vodní': return <Droplets size={14} className="text-blue-400" />;
                          case 'Přírodní': return <Leaf size={14} className="text-green-400" />;
                          case 'Elektrická': return <Zap size={14} className="text-yellow-400" />;
                          default: return <Bolt size={14} className="text-yellow-400" />;
                        }
                      };
                      return <Icon />;
                    })()}
                  </div>
                  <span className="text-sm font-black text-slate-200 uppercase tracking-wide">{monster.type}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-800 mx-1" />
                  <span className={cn("text-sm font-black uppercase tracking-wide", RARITY_COLORS[monster.rarity])}>{monster.rarity}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-1">
              {(() => {
                const maxHP = getMonsterMaxHP(monster);
                const currentHP = monster.currentHP ?? maxHP;

                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end px-1">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <Heart size={10} className="text-red-500" fill="currentColor" />
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-widest text-[8px]">Zdraví Monstra</span>
                        </div>
                        {Math.round(currentHP) < maxHP && (
                          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase mt-0.5">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <RefreshCw size={8} className="animate-spin text-primary/50" />
                              <span>Regenerace</span>
                              <div className="size-0.5 rounded-full bg-slate-700 mx-0.5" />
                              <div className="flex items-center gap-0.5 text-primary/70">
                                <Clock size={8} />
                                <span>{(() => {
                                  const diff = maxHP - currentHP;
                                  const healPerMin = maxHP * 0.1;
                                  const mins = diff / healPerMin;
                                  const sec = Math.ceil(mins * 60);
                                  if (sec < 60) return `${sec}s`;
                                  return `${Math.floor(mins)}m ${Math.round((mins % 1) * 60)}s`;
                                })()}</span>
                              </div>
                            </div>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setShowHealingModal(true)}
                              className="ml-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-[8px] font-black tracking-tighter flex items-center gap-1.5 shadow-xl shadow-emerald-900/40 border border-emerald-400/30"
                            >
                              <FlaskConical size={10} className="text-emerald-200" />
                              POUŽÍT LEKTVAR
                            </motion.button>
                          </div>
                        )}
                      </div>
                      <span className="text-[12px] font-black text-white tabular-nums tracking-tighter">
                        {Math.round(currentHP)} <span className="opacity-30">/</span> {maxHP}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden p-0.5 shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentHP / maxHP) * 100}%` }}
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-950/60 backdrop-blur-lg rounded-[1.5rem] border-2 border-white/5 p-5 text-slate-100 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
              <div className="relative z-10 space-y-6 px-1">
                <div className="relative z-10 py-5 px-1 grid grid-cols-3 gap-3 border-b border-white/5">
                  {[
                    { label: 'Útok', key: 'attack', base: monster.stats?.attack || 10, icon: <Sword size={12} />, type: 'gem_red', marker: 'bg-blue-500' },
                    { label: 'Obrana', key: 'defense', base: monster.stats?.defense || 10, icon: <Shield size={12} />, type: 'gem_white', marker: 'bg-emerald-500' },
                    { label: 'Zdraví', key: 'hp', base: monster.stats?.hp || 100, icon: <Heart size={12} />, type: 'gem_green', marker: 'bg-red-500' }
                  ].map((s, i) => {
                    const levelBonus = Math.floor(s.base * (monster.level - 1) * 0.1);
                    const getEqBonus = (slots: (string | null)[]) => {
                      return (slots || []).reduce((acc: number, id: string | null) => {
                        if (id) {
                          const cfg = RESOURCE_CONFIG[id];
                          const sKey = s.key === 'attack' ? 'atk' : s.key === 'defense' ? 'def' : 'hp';
                          if (cfg?.stats?.[sKey]) {
                             const val = cfg.stats[sKey]!;
                             return acc + (cfg.statsType === 'perc' ? Math.floor(s.base * (val / 100)) : val);
                          }
                        }
                        return acc;
                      }, 0);
                    };
                    const gemBonus = getEqBonus(monster.gems || []);
                    const itemBonus = getEqBonus(monster.items || []);

                    const totalBonus = levelBonus + gemBonus + itemBonus;
                    const totalVal = s.base + totalBonus;
                    const caps = s.key === 'hp' ? 1000 : s.key === 'attack' ? 400 : 120;
                    const percentage = Math.min(100, (totalVal / caps) * 100);

                    return (
                      <div key={i} className="flex flex-col bg-white/5 border border-white/5 rounded-2xl p-3 relative overflow-hidden group hover:bg-white/[0.08] transition-colors shadow-lg">
                        <div className="flex flex-col items-center mb-1">
                          <div className="text-white/30 mb-1">{s.icon}</div>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">{s.label}</span>
                        </div>
                        <div className="text-center relative z-10">
                          <p className="text-sm font-black text-white italic tracking-tighter leading-none">{totalVal}</p>
                          <p className="text-[7px] font-black text-emerald-400 mt-0.5">+{totalBonus}</p>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.03]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={cn("h-full", s.marker)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* UPGRADE BUTTON SECTION */}
                <div className="px-1 -mt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowLootModal(true)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-600/20 to-amber-900/40 border border-amber-500/30 rounded-2xl shadow-xl group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-shimmer-fast opacity-[0.05] pointer-events-none" />
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500 border border-amber-500/20">
                        <Trophy size={20} className="group-hover:rotate-12 transition-transform" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1">Dračí Kořist</p>
                        <p className="text-sm font-black text-white uppercase tracking-tighter leading-none">Trvalá Vylepšení</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-amber-500 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </div>

                <div className="relative z-[20] mt-2">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 border-b border-primary/20 pb-1 flex items-center gap-2">
                    <Zap size={10} />
                    Schopnosti karty
                  </h3>
                  <div className="space-y-4 relative z-[21]">
                    {monster.abilities && monster.abilities.length > 0 ? (
                      monster.abilities.map((ability, idx) => {
                        const effectiveType = ability.type || (idx === 0 ? 'attack' : 'extra');
                        const getAbilityEffectText = () => {
                          switch (effectiveType) {
                            case 'attack': return { label: 'Silný útok', val: `Zvyšuje útok o ${Math.round(((ability.value || 1.85) - 1) * 100)} %`, icon: <Sword size={10} />, color: 'text-purple-400', bg: 'bg-purple-500/10', energy: 50 };
                            case 'extra': return { label: 'Extra zásah', val: `Přidá ${Math.round((ability.value || 0.35) * 100)} % k poškození`, icon: <Zap size={10} />, color: 'text-blue-400', bg: 'bg-blue-500/10', energy: 20 };
                            case 'defense': return { label: 'Obrana', val: `Sníží utržené DMG o ${Math.round((ability.value || 0.4) * 100)} %`, icon: <Shield size={10} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', energy: 30 };
                            case 'heal': return { label: 'Léčení', val: `Okamžitě vyléčí ${Math.round((ability.value || 0.2) * 100)} % HP`, icon: <Heart size={10} />, color: 'text-red-400', bg: 'bg-red-500/10', energy: 40 };
                            case 'buff': return { label: 'Bonus', val: `Zvýší staty o ${Math.round((ability.value || 0.2) * 100)} %`, icon: <Sparkles size={10} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10', energy: 30 };
                            default: return { label: 'Schopnost', val: 'Speciální efekt', icon: <Info size={10} />, color: 'text-slate-400', bg: 'bg-white/5', energy: 40 };
                          }
                        };
                        const effect = getAbilityEffectText();
                        return (
                          <div key={idx} className="flex gap-4 group bg-white/[0.03] p-4 rounded-3xl border border-white/5 hover:border-white/20 transition-all relative z-[30] shadow-sm">
                            <div className={cn("size-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-lg transition-transform group-hover:scale-105 relative bg-slate-900/50", effect.bg)}>
                              <div className={effect.color}>
                                {(() => {
                                  switch (effectiveType) {
                                    case 'attack': return <Sword size={28} />;
                                    case 'extra': return <Zap size={28} />;
                                    case 'defense': return <Shield size={28} />;
                                    case 'heal': return <Heart size={28} />;
                                    case 'buff': return <Sparkles size={28} />;
                                    default: return <Info size={28} />;
                                  }
                                })()}
                              </div>
                              <div className="absolute -top-2 -right-2 bg-black border border-white/20 rounded-lg px-1.5 py-0.5 text-[10px] font-black text-white shadow-2xl z-[40] tabular-nums">
                                {effect.energy}⚡
                              </div>
                            </div>
                            <div className="flex-1 relative z-[31]">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-base font-black uppercase text-white tracking-tight leading-none drop-shadow-md">{ability.name}</p>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-60">{ability.chance || 40} % šance</div>
                              </div>
                              <p className="text-[12px] leading-relaxed text-slate-400 font-bold mb-3 drop-shadow-sm">{ability.description}</p>
                              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.03] mt-auto">
                                <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] opacity-40 leading-none", effect.color)}>{effect.label}:</span>
                                <span className={cn("text-[11px] font-black italic leading-none whitespace-nowrap", effect.color)}>{effect.val}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-xs italic text-slate-600 font-bold uppercase tracking-widest">Bez speciálních schopností</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-10 pt-2 border-t border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                    <LayoutGrid size={10} />
                    Původ a historie
                  </h3>
                  <p className="text-sm text-slate-300 italic leading-relaxed font-bold tracking-tight mb-6">
                    "{monster.description || "O této příšerce zatím kolují jen legendy v zapomenutých sektorech..."}"
                  </p>

                  {(() => {
                    const match = TYPE_MATCHUP[monster.type];
                    if (!match) return null;
                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case 'Ohnivá': return <Flame size={12} className="text-red-500" />;
                        case 'Vodní': return <Droplets size={12} className="text-blue-400" />;
                        case 'Přírodní': return <Leaf size={12} className="text-green-400" />;
                        case 'Elektrická': return <Zap size={12} className="text-yellow-400" />;
                        default: return <Sparkles size={12} className="text-slate-400" />;
                      }
                    };

                    return (
                      <div className="grid grid-cols-2 gap-4 bg-white/[0.03] border border-white/5 rounded-3xl p-4 shadow-xl mb-6">
                        <div className="flex flex-col gap-2">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Silný Proti</p>
                          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl relative overflow-hidden">
                            <div className="size-6 bg-emerald-500/20 rounded-lg flex items-center justify-center relative z-10">{getTypeIcon(match.strong)}</div>
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate relative z-10">{match.strong}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Slabý Proti</p>
                          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-2xl relative overflow-hidden">
                            <div className="size-6 bg-red-500/20 rounded-lg flex items-center justify-center relative z-10">{getTypeIcon(match.weak)}</div>
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate relative z-10">{match.weak}</span>
                          </div>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-white/5 mt-1 flex flex-col gap-1.5 opacity-60">
                          <div className="flex items-center gap-1.5 px-1">
                            <Info size={8} className="text-slate-500" />
                            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">
                              Výhoda: <span className="text-emerald-500">1.3x dmg (30% šance)</span> | Nevýhoda: <span className="text-red-500">0.7x dmg</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 relative z-10">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Vybavení (Relikvie a Gemy)</h3>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    {Array.from({ length: 3 }).map((_, idx) => {
                      const currentGem = monster.gems?.[idx];
                      const isPicking = activeSlotIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setActiveSlotIdx(idx)}
                          className={cn(
                            "size-20 aspect-square rounded-2xl border-2 flex items-center justify-center relative transition-all active:scale-95 cursor-pointer group",
                            currentGem ? "bg-slate-800 border-white/20 shadow-xl" : "bg-black/40 border-dashed border-white/10 hover:border-white/30",
                            isPicking && "ring-4 ring-amber-500/50 border-amber-500/60"
                          )}
                        >
                          {currentGem ? (
                            <>
                              <div className="size-14 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ResourceIcon id={currentGem} config={RESOURCE_CONFIG[currentGem]} size="lg" className="filter drop-shadow-md" />
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); onEquipGem?.(idx, null); }} className="absolute -top-2 -right-2 size-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 text-white transition-transform active:scale-75 z-20">
                                <Trash2 size={10} />
                              </button>
                            </>
                          ) : (
                            <Plus size={20} className="text-white/20" />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <AnimatePresence>
                    {activeSlotIdx !== null && (
                      <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                        <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 p-3 relative shadow-2xl">
                          <button onClick={() => setActiveSlotIdx(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white"><X size={14} /></button>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1 italic">Slot {activeSlotIdx + 1}: Vyber si vylepšení</p>
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {inventory?.filter(i => (i?.type.startsWith('gem_') || i?.type.startsWith('item_')) && i?.count > 0).map(i => (
                              <motion.button
                                key={i?.type}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => { onEquipGem?.(activeSlotIdx, i?.type || null); setActiveSlotIdx(null); }}
                                className="flex-shrink-0 size-16 bg-slate-800 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 active:bg-slate-700 transition-colors shadow-lg group relative overflow-hidden"
                              >
                                <div className="size-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <ResourceIcon id={i?.type || ''} config={RESOURCE_CONFIG[i?.type || '']} size="md" className="filter drop-shadow-md" />
                                </div>
                                <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1 rounded-sm relative z-10">{i?.count}x</span>
                              </motion.button>
                            ))}
                            {(!inventory || inventory.filter(i => (i?.type.startsWith('gem_') || i?.type.startsWith('item_')) && i?.count > 0).length === 0) && (
                              <div className="w-full text-center py-4 flex flex-col items-center gap-2">
                                <div className="text-3xl opacity-30">📦</div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase italic">Nemáš žádné vybavení v batohu</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 mt-12 mb-8 pb-12">
          <button onClick={() => setConfirmRelease(true)} className="w-full group relative py-5 rounded-[2rem] overflow-hidden transition-all active:scale-95 border-2 border-red-500/30 bg-red-950/20 shadow-2xl hover:border-red-500/50">
            <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Trash2 size={20} className="text-red-500 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p className="text-sm font-black text-red-500 uppercase tracking-widest leading-none mb-0.5">Propustit na svobodu</p>
              </div>
            </div>
          </button>
        </div>

        <AnimatePresence>
          {showHealingModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-end flex-col bg-black/80 backdrop-blur-xl">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-lg bg-slate-900 border-t-4 border-emerald-500/50 rounded-t-[3rem] p-8 pb-12 shadow-[0_-20px_50px_rgba(16,185,129,0.2)]">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500 border border-emerald-500/20"><Package size={24} /></div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Lékárnička</h2>
                    </div>
                  </div>
                  <button onClick={() => setShowHealingModal(false)} className="size-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 transition-colors"><X size={20} /></button>
                </div>
                <div className="grid grid-cols-1 gap-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                  {inventory?.filter(i => i?.type === 'hp_potion' && i?.count > 0).map(item => (
                    <motion.button key={item?.type} whileTap={{ scale: 0.97 }} onClick={() => { item?.type && onUsePotion?.(item.type); setShowHealingModal(false); }} className="group relative flex items-center gap-5 p-5 bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/20 rounded-[2rem] hover:border-emerald-500/40 transition-all text-left overflow-hidden">
                      <div className="size-16 flex-shrink-0 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform"><Plus size={32} className="text-white" /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-lg font-black text-white uppercase tracking-tight">Lektvar HP</p>
                          <p className="bg-emerald-500 text-background-dark text-[10px] font-black px-2 py-0.5 rounded-full">{item?.count}x</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                  {(!inventory || inventory.filter(i => i?.type === 'hp_potion' && i?.count > 0).length === 0) && (
                    <div className="py-12 text-center">
                      <div className="size-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50 border border-white/5"><FlaskConical size={32} className="text-slate-600" /></div>
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest italic">Nemáš žádné léčivé lektvary</p>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowHealingModal(false)} className="w-full mt-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95">Možná později</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLootModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-end flex-col bg-black/80 backdrop-blur-xl">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-lg bg-slate-900 border-t-4 border-amber-500/50 rounded-t-[3rem] p-8 pb-12 shadow-[0_-20px_50px_rgba(245,158,11,0.2)]">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500 border border-amber-500/20"><Trophy size={24} /></div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Dračí Poklad</h2>
                      <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest mt-1">Trvalé vylepšení statistik</p>
                    </div>
                  </div>
                  <button onClick={() => setShowLootModal(false)} className="size-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 transition-colors"><X size={20} /></button>
                </div>
                <div className="grid grid-cols-1 gap-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
                  {inventory?.filter(i => i?.type.startsWith('loot_') && i?.count > 0).map(item => {
                    const config = RESOURCE_CONFIG[item.type];
                    return (
                      <motion.button key={item?.type} whileTap={{ scale: 0.97 }} onClick={() => { item?.type && onUseLoot?.(item.type); setShowLootModal(false); }} className="group relative flex items-center gap-5 p-5 bg-gradient-to-br from-amber-600/10 to-amber-900/10 border border-amber-500/20 rounded-[2rem] hover:border-amber-500/40 transition-all text-left overflow-hidden">
                        <div className="size-20 flex-shrink-0 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <ResourceIcon id={item.type} config={config} size="lg" className="filter drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-lg font-black text-white uppercase tracking-tight">{config?.label}</p>
                            <p className="bg-amber-500 text-background-dark text-[10px] font-black px-2 py-0.5 rounded-full">{item?.count}x</p>
                          </div>
                          <div className="flex gap-4">
                            {config?.stats?.atk ? <div className="flex items-center gap-1 text-red-400 font-black text-[10px]"><Sword size={10} /> +{config.stats.atk}</div> : null}
                            {config?.stats?.def ? <div className="flex items-center gap-1 text-blue-400 font-black text-[10px]"><Shield size={10} /> +{config.stats.def}</div> : null}
                            {config?.stats?.hp ? <div className="flex items-center gap-1 text-emerald-400 font-black text-[10px]"><Heart size={10} /> +{config.stats.hp}</div> : null}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                  {(!inventory || inventory.filter(i => i?.type.startsWith('loot_') && i?.count > 0).length === 0) && (
                    <div className="py-12 text-center">
                      <div className="size-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50 border border-white/5"><Trophy size={32} className="text-slate-600" /></div>
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest italic px-8">Tvůj vak na vzácný loot je prázdný. Zkus ulovit nějakou epickou příšeru!</p>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowLootModal(false)} className="w-full mt-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 text-xs opacity-50">Zpět k monstru</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmRelease && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="w-full max-w-sm bg-slate-900 border-2 border-red-500/30 rounded-[3rem] p-8 text-center shadow-[0_0_100px_rgba(239,68,68,0.2)]">
                <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><Trash2 size={40} className="text-red-500" /></div>
                <h2 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tighter">Poslední varování</h2>
                <p className="text-slate-400 text-sm font-bold mb-8 leading-relaxed">Opravdu chceš propustit <span className="text-white">{monster.name}</span>?</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => onRelease?.()} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-95">Ano, propustit</button>
                  <button onClick={() => setConfirmRelease(false)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95">Ne, nechat si jej</button>
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
