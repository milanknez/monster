import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, Star, Zap, Hammer, Sparkles, Wand2 } from 'lucide-react';
import type { Boost, InventoryItem } from '../../types';
import { RESOURCE_CONFIG } from '../map/mapUtils';
import { cn } from '../../utils';

export const Inventory = ({
  activeBoosts,
  inventory,
  onOpenCodex,
  onSwap,
  onUseItem
}: {
  activeBoosts: Boost[],
  inventory: (InventoryItem | null)[],
  onOpenCodex: () => void,
  onSwap: (from: number, to: number) => void,
  onUseItem: (type: string) => void
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
      className="pb-32"
    >
      {/* Header Info */}
      <div className="p-6 pb-2 relative">
        <div className="flex items-center gap-3 mb-1">
          <Package size={16} className="text-emerald-500" />
          <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">Můj Inventář</p>
        </div>
        <h2 className="text-3xl font-black text-white uppercase italic">Batoh</h2>
        
        {/* Simple Top-Right Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenCodex}
          className="absolute top-6 right-6 size-12 bg-slate-900 border border-secondary/30 rounded-2xl flex items-center justify-center text-secondary shadow-lg shadow-secondary/5 group transition-all"
        >
          <Hammer size={24} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 size-2 bg-secondary rounded-full animate-pulse" />
        </motion.button>
      </div>

      <div className="h-4" />

      {/* Active Boosts Section */}
      {activeBoosts.length > 0 && (
        <section className="px-6 mb-8">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Aktivní Efekty</h3>
          <div className="grid grid-cols-1 gap-3">
            {activeBoosts.map((boost, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500">
                    {boost.type === 'xp_boost' ? <Star size={24} fill="currentColor" /> : <Zap size={24} fill="currentColor" />}
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
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kapacita ({inventory.filter(i => i).length} / 20)</h3>
          <p className="text-[9px] font-bold text-slate-600 uppercase">Max stack: 20x</p>
        </div>

        <div className="grid grid-cols-4 gap-3 bg-slate-900/20 p-4 rounded-[2.5rem] border border-white/5">
          {inventory.map((item, idx) => {
            const config = item ? RESOURCE_CONFIG[item.type] : null;
            const usable = item && isConsumable(item.type);

            return (
              <div 
                key={idx}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className="relative"
              >
                <motion.div
                  draggable={!!item}
                  onDragStart={() => handleDragStart(idx)}
                  onClick={() => usable && onUseItem(item.type)}
                  layout
                  className={cn(
                    "aspect-square rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center group relative overflow-hidden",
                    item 
                      ? "bg-slate-800 border-white/10 shadow-lg cursor-grab active:cursor-grabbing" 
                      : "bg-slate-900/60 border-slate-800/40 shadow-inner",
                    usable && "ring-1 ring-emerald-500/30 hover:ring-emerald-500/60 cursor-pointer"
                  )}
                >
                  {item ? (
                    <div className="flex flex-col items-center justify-center relative z-10 w-full h-full">
                      <span className="text-4xl mb-0 drop-shadow-md group-hover:scale-110 transition-transform">{config?.icon}</span>
                      <span className="absolute bottom-1 right-1 text-[9px] font-black text-white bg-black/60 px-1 rounded shadow-sm border border-white/10 leading-none py-0.5">
                        {item.count}
                      </span>
                      
                      {/* Action Overlay for Consumables */}
                      {usable && (
                        <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                           <div className="bg-emerald-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase">Použít</div>
                        </div>
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
        
        <div className="mt-8 text-center text-slate-600">
           <p className="text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-2">
              <Sparkles size={10} className="text-secondary" /> Drag & Drop k uspořádání <Sparkles size={10} className="text-secondary" />
           </p>
           <p className="text-[8px] uppercase font-bold tracking-wider mt-1 opacity-50 italic">Kliknutím na elixír ho vypiješ</p>
        </div>
      </section>
    </motion.div>
  );
};
