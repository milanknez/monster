import { motion } from 'framer-motion';
import { X, Sword, Heart } from 'lucide-react';
import { cn, getMonsterMaxHP } from '../../utils';
import type { Monster } from '../../types';

export const DuelSelectionModal = ({ 
  caughtMonsters, 
  onSelect, 
  onClose,
  title = "Vyber si bojovníka",
  description
}: { 
  caughtMonsters: Monster[], 
  onSelect: (m: Monster) => void, 
  onClose: () => void,
  title?: string,
  description?: string
}) => {
  // Seřadit podle nejsilnějšího (lvl * útok nebo prostě lvl)
  const sorted = [...caughtMonsters].sort((a, b) => (b.level || 0) - (a.level || 0));

  return (
    <div className="fixed inset-0 z-[2100] flex flex-col bg-background-dark/95 backdrop-blur-xl">
      <div className="p-8 border-b border-red-500/20 flex justify-between items-center bg-red-950/20">
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{title}</h3>
          <p className="text-[10px] text-red-500 font-bold uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
            <Sword size={12} /> Příprava na souboj
          </p>
        </div>
        <button onClick={onClose} className="p-3 bg-red-900/40 rounded-2xl text-red-400 border border-red-500/20 hover:scale-110 active:scale-95 transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {sorted.length > 0 ? (
          sorted.map((monster: any, idx) => {
            const maxHP = getMonsterMaxHP(monster);
            const currentHP = monster.currentHP ?? maxHP;
            const hpPercent = Math.round((currentHP / maxHP) * 100);
            const isDisabled = hpPercent < 80;
            
            return (
              <motion.div
                key={`${monster.id}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => !isDisabled && onSelect(monster)}
                className={cn(
                  "bg-slate-900/80 border border-white/5 rounded-[2rem] p-5 flex items-center justify-between active:scale-[0.98] transition-all group overflow-hidden relative",
                  isDisabled ? "opacity-50 grayscale" : "cursor-pointer hover:border-red-500/30"
                )}
              >
                {isDisabled && (
                   <div className="absolute inset-0 bg-red-950/20 flex items-center justify-center z-40 pointer-events-none">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-black/80 px-4 py-2 rounded-full border border-red-500/30 shadow-2xl">Nízká Energie (pod 80%)</p>
                   </div>
                )}
                <div className="flex items-center gap-6">
                  <div className="size-20 bg-black/60 rounded-[1.5rem] p-3 border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-red-500/20">
                    <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
                    <img src={monster.image} className="w-full h-full object-contain relative z-10" alt="" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase italic tracking-tight">{monster.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="h-6 px-2 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none">LVL {monster.level}</span>
                       </div>
                       <div className={cn(
                         "h-6 px-2 rounded-full flex items-center gap-1.5 border shadow-inner",
                         hpPercent > 90 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                       )}>
                          <Heart size={10} className="fill-current" />
                          <span className="text-[9px] font-black leading-none">{hpPercent}%</span>
                       </div>
                    </div>
                  </div>
                </div>
                {!isDisabled && (
                   <div className="size-14 bg-red-600 rounded-3xl flex items-center justify-center text-white border-b-4 border-black/20 group-hover:bg-red-500 transition-colors shadow-lg">
                     <Sword size={24} />
                   </div>
                )}
              </motion.div>
            )
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12">
            <Sword size={64} className="text-slate-800 mb-6 animate-pulse" />
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] max-w-[200px]">Nemáš žádné příšerky schopné boje</p>
          </div>
        )}
      </div>
      
      <div className="p-8 bg-slate-950/80 border-t border-white/5">
        <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-[0.2em] leading-relaxed opacity-60">
          {description || "Zvolte svého šampiona, který se utká s nepřítelem. Pamatujte, že k boji je potřeba alespoň 80% energie!"}
        </p>
      </div>
    </div>
  )
}

DuelSelectionModal.displayName = 'DuelSelectionModal'
