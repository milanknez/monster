import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, Star, Zap, Beaker, Sparkles, Wand2, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Boost, InventoryItem } from '../../types';
import { RESOURCE_CONFIG } from '../map/mapUtils';
import { cn, getLoc } from '../../utils';
import { ResourceIcon } from '../ui/ResourceIcon';

export const Inventory = ({
  activeBoosts,
  inventory,
  onOpenCodex,
  onSwap,
  onUseItem,
  onDiscard
}: {
  activeBoosts: Boost[],
  inventory: (InventoryItem | null)[],
  onOpenCodex: () => void,
  onSwap: (from: number, to: number) => void,
  onUseItem: (type: string) => void,
  onDiscard: (idx: number) => void
}) => {
  const { t } = useTranslation();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);

  // Reset confirmation state when item selection changes
  const handleSelect = (idx: number | null) => {
    setDraggedIdx(idx);
    setIsConfirmingDiscard(false);
    setIsActuallyDragging(false);
  };

  const handleDragStart = (idx: number) => {
    handleSelect(idx);
    setIsActuallyDragging(true);
  };

  const handleDragEnd = () => {
    setIsActuallyDragging(false);
    // Unselect after drag to keep screen clear
    setDraggedIdx(null);
  };

  const handleDrop = (toIdx: number) => {
    if (draggedIdx !== null && draggedIdx !== toIdx) {
      onSwap(draggedIdx, toIdx);
    }
    setDraggedIdx(null);
  };

  const isConsumable = (type: string) => {
    return ['xp_booster', 'energy_drink'].includes(type);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header Info */}
      <div className="p-4 pb-0 relative">
        {/* Title removed as requested - moved to global header */}
      </div>

      <div className="h-4" />

      {/* Active Boosts Section */}
      {activeBoosts.length > 0 && (
        <section className="px-6 mb-8">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t('inventory.active_effects')}</h3>
          <div className="grid grid-cols-1 gap-2">
            {activeBoosts.map((boost, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
                    {boost.type === 'xp_boost' ? <Star size={18} fill="currentColor" /> : <Zap size={18} fill="currentColor" />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase">{boost.type === 'xp_boost' ? t('inventory.xp_elixir') : t('inventory.energy_drink')}</p>
                    <p className="text-[10px] font-bold text-emerald-500/70 uppercase">{t('inventory.bonus')} {boost.multiplier}x</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                    <Clock size={10} />
                    <span>{Math.round((boost.expiresAt - Date.now()) / 60000)} min</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Slots Grid (4x5) */}
      <section className="px-6">
        <div className="flex justify-between items-end mb-4 pr-1">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('inventory.capacity')} ({inventory.filter(i => i).length} / {inventory.length})</h3>
          <p className="text-[9px] font-bold text-slate-600 uppercase">{t('inventory.max_stack')}</p>
        </div>

        {/* Slots Grid (4x5) */}
        <div className="grid grid-cols-4 gap-3 bg-slate-900/20 p-4 rounded-[2.5rem] border border-white/5">
          {inventory.map((item, idx) => {
            const config = item ? RESOURCE_CONFIG[item.type] : null;
            const usable = item && isConsumable(item.type);
            const isSelected = draggedIdx === idx;

            return (
              <div
                key={idx}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dt = e.dataTransfer.getData('text/plain');
                  if (dt) {
                    const fromID = parseInt(dt, 10);
                    if (!isNaN(fromID) && fromID !== idx) {
                      onSwap(fromID, idx);
                    }
                    setDraggedIdx(null);
                  } else {
                    handleDrop(idx);
                  }
                }}
                className="relative"
              >
                <motion.div
                  draggable={!!item}
                  onDragStart={(e: any) => {
                    e.dataTransfer.setData('text/plain', idx.toString());
                    e.dataTransfer.effectAllowed = 'move';
                    handleDragStart(idx);
                  }}
                  onDragEnd={() => setDraggedIdx(null)}
                  onClick={() => {
                    if (draggedIdx === idx) {
                      // Second click on the same item -> Use or Deselect
                      if (usable) {
                        onUseItem(item.type);
                        handleSelect(null);
                      } else {
                        handleSelect(null);
                      }
                    } else {
                      // Click on a different slot -> Just change selection or deselect
                      if (item) {
                        handleSelect(idx);
                      } else {
                        handleSelect(null);
                      }
                    }
                  }}
                  layout
                  className={cn(
                    "aspect-square rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center group relative",
                    item
                      ? (getLoc(config?.rarity, 'cz') === 'Legendární' ? "border-amber-500 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer active:scale-95" :
                        getLoc(config?.rarity, 'cz') === 'Epická' ? "border-purple-500 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)] cursor-pointer active:scale-95" :
                          getLoc(config?.rarity, 'cz') === 'Vzácná' ? "border-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.2)] cursor-pointer active:scale-95" :
                            "bg-slate-800 border-white/10 shadow-lg cursor-pointer active:scale-95")
                      : "bg-slate-900/60 border-slate-800/40 shadow-inner overflow-hidden",
                    isSelected ? "ring-2 ring-primary scale-105 z-30 shadow-[0_0_15px_rgba(13,185,242,0.4)]" : "",
                    usable && !isSelected && "hover:border-emerald-500/50"
                  )}
                >
                  {item ? (
                    <div className="flex flex-col items-center justify-center relative z-10 w-full h-full pointer-events-none">
                      <div className="size-14 flex items-center justify-center mb-0 group-hover:scale-110 transition-transform">
                        <ResourceIcon id={item.type} config={config!} size="lg" className="filter drop-shadow-md" />
                      </div>
                      <span className="absolute bottom-1 right-1 text-[9px] font-black text-white bg-black/60 px-1 rounded shadow-sm border border-white/10 leading-none py-0.5">
                        {item.count}
                      </span>


                      {usable && (
                        <div className="absolute top-1 right-1 size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                      )}
                    </div>
                  ) : (
                    <div className="size-5 rounded-full border-2 border-slate-800/30 relative z-10" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
                </motion.div>

                <div className="absolute -top-1 -left-1 text-[7px] font-black text-slate-800 opacity-20">{idx + 1}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Item Detail Floating Bar (Non-blocking) */}
      <AnimatePresence>
        {draggedIdx !== null && !isActuallyDragging && inventory[draggedIdx] && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-6 right-6 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 z-[60] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "size-12 rounded-xl border flex items-center justify-center shadow-lg",
                  RESOURCE_CONFIG[inventory[draggedIdx]!.type]?.rarity === 'legendary' ? "border-amber-500/50 bg-amber-500/10" :
                  RESOURCE_CONFIG[inventory[draggedIdx]!.type]?.rarity === 'epic' ? "border-purple-500/50 bg-purple-500/10" :
                  RESOURCE_CONFIG[inventory[draggedIdx]!.type]?.rarity === 'rare' ? "border-blue-500/50 bg-blue-500/10" :
                  "border-white/10 bg-slate-700"
                )}>
                  <ResourceIcon 
                    id={inventory[draggedIdx]!.type} 
                    config={RESOURCE_CONFIG[inventory[draggedIdx]!.type]!} 
                    size="md" 
                  />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">
                    {getLoc(RESOURCE_CONFIG[inventory[draggedIdx]!.type]?.label) || inventory[draggedIdx]!.type}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {getLoc(RESOURCE_CONFIG[inventory[draggedIdx]!.type]?.description) || t('inventory.no_desc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSelect(null)}
                  className="size-10 flex items-center justify-center bg-slate-700/50 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </motion.button>
              </div>
            </div>

            <div className="flex gap-2">
              <AnimatePresence mode="wait">
                {isConfirmingDiscard ? (
                  <motion.div 
                    key="confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex gap-2"
                  >
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { onDiscard(draggedIdx!); handleSelect(null); }}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      {t('inventory.discard_confirm') || 'Ano, zahodit'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsConfirmingDiscard(false)}
                      className="px-6 py-3 bg-slate-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest border border-white/5"
                    >
                      {t('common.cancel') || 'Ne'}
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="actions"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex gap-2 justify-end"
                  >
                    {isConsumable(inventory[draggedIdx]!.type) && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { onUseItem(inventory[draggedIdx]!.type); handleSelect(null); }}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 border-b-2 border-emerald-700"
                      >
                        <Zap size={16} fill="currentColor" />
                        {t('inventory.use_item')}
                      </motion.button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsConfirmingDiscard(true)}
                      className="size-12 flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={20} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
