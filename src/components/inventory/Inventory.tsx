import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, Star, Zap, Beaker, Sparkles, Wand2, Trash2 } from 'lucide-react';
import type { Boost, InventoryItem } from '../../types';
import { RESOURCE_CONFIG } from '../map/mapUtils';
import { cn } from '../../utils';
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
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDrop = (toIdx: number) => {
    if (draggedIdx !== null && draggedIdx !== toIdx) {
      onSwap(draggedIdx, toIdx);
    }
    setDraggedIdx(null);
  };

  const isConsumable = (type: string) => {
    return ['xp_booster', 'hp_potion', 'energy_drink'].includes(type);
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
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Aktivní Efekty</h3>
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
                    <p className="text-xs font-black text-white uppercase">{boost.type === 'xp_boost' ? 'XP Elixír' : 'Energetický Nápoj'}</p>
                    <p className="text-[10px] font-bold text-emerald-500/70 uppercase">Bonus {boost.multiplier}x</p>
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
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kapacita ({inventory.filter(i => i).length} / {inventory.length})</h3>
          <p className="text-[9px] font-bold text-slate-600 uppercase">Max stack: 20x</p>
        </div>

        {/* Selected Item Info at the Top */}
        <div className="mb-4 min-h-[5rem]">
          <AnimatePresence mode="wait">
            {draggedIdx !== null && inventory[draggedIdx] ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col mb-3 bg-slate-800/80 p-4 rounded-2xl border border-white/10 shadow-lg relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white uppercase tracking-widest">
                      {RESOURCE_CONFIG[inventory[draggedIdx]!.type]?.label || inventory[draggedIdx]!.type}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {RESOURCE_CONFIG[inventory[draggedIdx]!.type]?.description || 'Žádný popis.'}
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { onDiscard(draggedIdx); setDraggedIdx(null); }}
                    className="p-2 ml-4 shrink-0 bg-red-950 border border-red-500/30 rounded-xl text-red-500 shadow-md shadow-red-500/10 active:scale-95 transition-all"
                    title="Zahodit"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" className="h-[4.5rem] flex flex-col items-center justify-center text-slate-600 bg-slate-900/40 rounded-2xl border border-white/5 border-dashed">
                <p className="text-[10px] uppercase font-black tracking-widest text-center mt-1 pb-1">Klikni na předmět pro detaily</p>
                <p className="text-[8px] uppercase font-bold tracking-wider opacity-50 italic">Kliknutím vybereš, dalším klikem jinam přesuneš</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
                    if (draggedIdx === null && item) {
                      setDraggedIdx(idx);
                    } else if (draggedIdx === idx) {
                      setDraggedIdx(null);
                      if (usable) onUseItem(item.type);
                    } else if (draggedIdx !== null) {
                      onSwap(draggedIdx, idx);
                      setDraggedIdx(null);
                    }
                  }}
                  layout
                  className={cn(
                    "aspect-square rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center group relative",
                    item
                      ? (config?.rarity === 'Legendární' ? "border-amber-500 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer active:scale-95" :
                        config?.rarity === 'Epická' ? "border-purple-500 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)] cursor-pointer active:scale-95" :
                          config?.rarity === 'Vzácná' ? "border-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.2)] cursor-pointer active:scale-95" :
                            "bg-slate-800 border-white/10 shadow-lg cursor-pointer active:scale-95")
                      : "bg-slate-900/60 border-slate-800/40 shadow-inner overflow-hidden",
                    isSelected ? "ring-2 ring-primary scale-105 z-30 shadow-[0_0_15px_rgba(13,185,242,0.4)]" : "",
                    usable && !isSelected && "hover:border-emerald-500/50"
                  )}
                >
                  {item ? (
                    <div className="flex flex-col items-center justify-center relative z-10 w-full h-full pointer-events-none">
                      <div className="size-10 flex items-center justify-center mb-0 group-hover:scale-110 transition-transform">
                        <ResourceIcon id={item.type} config={config!} size="md" className="filter drop-shadow-md" />
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
    </motion.div>
  );
};
