import { motion } from 'framer-motion';
import { Package, Clock, Star, Zap } from 'lucide-react';
import type { Boost, InventoryItem } from '../../types';
import { RESOURCE_CONFIG } from '../map/mapUtils';

export const Inventory = ({
  activeBoosts,
  inventory
}: {
  activeBoosts: Boost[],
  inventory: InventoryItem[]
}) => {
  // Fixní grid (např. 16 slotů)
  const SLOTS = 16;

  // Fill array with items up to 16, then fill the rest with null
  const gridItems = [...inventory];
  while (gridItems.length < SLOTS) {
    gridItems.push(null as any);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32"
    >
      {/* Header Info */}
      <div className="p-6 bg-slate-900/40 border-b border-white/5 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Package size={16} className="text-emerald-500" />
          <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">Můj Inventář</p>
        </div>
        <h2 className="text-2xl font-black text-white uppercase italic">Batoh s předměty</h2>
        <p className="text-slate-500 text-xs font-bold mt-1">Sbírej materiály a speciální vybavení (brzy).</p>
      </div>

      {/* Active Boosts / Temporary Items Section */}
      {activeBoosts.length > 0 && (
        <section className="px-6 mb-8">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Právě využíváš</h3>
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
                    {boost.type === 'xp_boost' ? <Star size={20} fill="currentColor" /> : <Zap size={20} fill="currentColor" />}
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

      {/* Slots Grid */}
      <section className="px-6">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kapacita ({inventory.reduce((acc, i) => acc + (i.count > 0 ? 1 : 0), 0)} / {SLOTS})</h3>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {gridItems.map((item, idx) => {
            const config = item ? RESOURCE_CONFIG[item.type] : null;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (idx % 4) * 0.05 + Math.floor(idx / 4) * 0.05 }}
                className="aspect-square rounded-xl bg-slate-900/40 border border-slate-800/60 shadow-inner flex flex-col items-center justify-center group relative overflow-hidden"
              >
                {item ? (
                  <div className="flex flex-col items-center justify-center relative z-10">
                    <span className="text-2xl mb-1">{config?.icon}</span>
                    <span className="text-[10px] font-black text-white bg-black/40 px-1.5 rounded-md min-w-[20px] text-center">{item.count}</span>
                  </div>
                ) : (
                  <Package size={16} className="text-slate-800/40 relative z-10" />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-white/5 rounded-tl-sm" />
                <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-white/5 rounded-br-sm" />
              </motion.div>
            )
          })}
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-slate-900/20 border border-white/5 text-center">
          <p className="text-[10px] font-black text-slate-600 uppercase italic">
            {inventory.length > 0 ? "V batohu máš pár věcí. Chceš něco zkombinovat?" : "Zatím se nezdá, že bys měl v batohu něco užitečného."}
          </p>
        </div>
      </section>
    </motion.div>
  );
};
