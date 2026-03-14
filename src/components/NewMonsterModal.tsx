import { motion } from 'framer-motion';
import { cn, TYPE_COLORS } from '../utils';
import type { Monster } from '../types';

export const NewMonsterModal = ({ monster, onClose, onAdd }: { monster: Monster | null; onClose: () => void; onAdd: (m: Monster) => void }) => {
  if (!monster) return null
  const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default']

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background-dark/95 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        className={cn(
          "relative w-full max-w-sm bg-slate-900 border-4 rounded-3xl overflow-hidden shadow-[0_0_70px_rgba(0,0,0,0.5)]",
          colors.border.replace('border-', 'border-opacity-50 border-')
        )}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-b from-transparent to-black", colors.bg.replace('bg-', 'bg-'))} />
        
        <div className="p-8 text-center relative z-10">
          <motion.div 
            animate={{ y: [-10, 10] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
            className="size-48 mx-auto mb-6 bg-slate-950 rounded-full border-4 border-white/5 flex items-center justify-center shadow-[0_0_40px_rgba(13,185,242,0.1)] relative p-4"
          >
            <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", colors.bg)} />
            <img src={monster.image} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          </motion.div>

          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block", colors.bg, colors.text)}>
            NOVÝ EXEMPLÁŘ ZAJIŠTĚN
          </span>
          <h2 className="text-4xl font-black text-slate-100 tracking-tighter mb-2">{monster.name}</h2>
          <p className="text-xs text-slate-400 mb-6 px-4 line-clamp-2">{monster.description}</p>
          
          <div className="flex justify-center gap-4 mb-8">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Vzácnost</p>
              <p className={cn("font-black", colors.text)}>{monster.rarity}</p>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Typ</p>
              <p className="font-black text-slate-100">{monster.type}</p>
            </div>
          </div>

          <button 
            onClick={() => onAdd(monster)}
            className="w-full bg-slate-100 hover:bg-white text-background-dark font-black py-4 rounded-2xl transition-all active:scale-95 shadow-xl uppercase tracking-tighter"
          >
            Přidat do sbírky
          </button>
        </div>
      </motion.div>
    </div>
  )
}