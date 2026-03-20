import { motion } from 'framer-motion';
import { X, ArrowLeftRight } from 'lucide-react';
import { cn } from '../utils';
import type { Monster } from '../types';

export const TradeSelectionModal = ({ 
  caughtMonsters, 
  onSelect, 
  onClose,
  offeringMonster 
}: { 
  caughtMonsters: Monster[], 
  onSelect: (m: Monster) => void, 
  onClose: () => void,
  offeringMonster?: { id: string, name: string, level: number }
}) => {
  return (
    <div className="fixed inset-0 z-[2100] flex flex-col bg-background-dark">
      <div className="p-6 border-b border-primary/20 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-100 uppercase tracking-tighter">Vyber k výměně</h3>
          {offeringMonster && (
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
              Za {offeringMonster.name} LVL {offeringMonster.level}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-2 bg-slate-800 rounded-xl text-slate-400">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {caughtMonsters.length > 0 ? (
          caughtMonsters.map((monster, idx) => (
            <motion.div
              key={`${monster.id}-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelect(monster)}
              className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="size-14 bg-black/40 rounded-xl p-2 border border-white/5">
                  <img src={monster.image} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="font-black text-slate-100 uppercase tracking-tight">{monster.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LVL {monster.level} • {monster.type}</p>
                </div>
              </div>
              <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <ArrowLeftRight size={18} />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <p className="text-slate-500 font-bold uppercase tracking-widest">Nemáš žádné příšerky k výměně</p>
          </div>
        )}
      </div>
      
      <div className="p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5">
        <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-[0.2em] leading-relaxed">
          Zvolte jednu z vlastních příšerek, kterou pošlete výměnou za exemplář od druhého lovce.
        </p>
      </div>
    </div>
  )
}
