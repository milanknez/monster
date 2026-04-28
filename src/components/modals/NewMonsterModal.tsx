import { motion } from 'framer-motion';
import { cn, TYPE_COLORS } from '../../utils';
import type { Monster } from '../../types';

const RARITY_COLORS: Record<string, string> = {
  'Běžná': 'text-slate-400',
  'Vzácná': 'text-blue-400',
  'Epická': 'text-purple-400',
  'Legendární': 'text-amber-400'
}

export const NewMonsterModal = ({ monster, onClose, onAdd, isXPBoosted, xpMultiplier = 2, isStackFull }: { monster: Monster | null; onClose: () => void; onAdd: (m: Monster) => void; isXPBoosted?: boolean; xpMultiplier?: number; isStackFull?: boolean }) => {
  if (!monster) return null
  const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default']
  const monsterImage = monster.image || `/monsters/${monster.id}.png`

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
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
            <img src={monsterImage} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          </motion.div>

          <div className="flex flex-col items-center gap-1 mb-2">
            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", colors.bg, colors.text)}>
              NOVÝ EXEMPLÁŘ ZAJIŠTĚN
            </span>
            {isXPBoosted && (
              <span className="bg-blue-500 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter animate-pulse border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                ⚡ {xpMultiplier}x XP BOOST AKTIVNÍ
              </span>
            )}
          </div>
          <h2 className="text-4xl font-black text-slate-100 tracking-tighter mb-2">{monster.name}</h2>
          <p className="text-xs text-slate-400 mb-6 px-4 line-clamp-2">{monster.description}</p>

          <div className="flex justify-center gap-4 mb-8">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Vzácnost</p>
              <p className={cn("font-black", RARITY_COLORS[monster.rarity] || 'text-white')}>{monster.rarity}</p>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Typ</p>
              <p className="font-black text-slate-100">{monster.type}</p>
            </div>
          </div>

          <button
            disabled={isStackFull}
            onClick={() => onAdd(monster)}
            className={cn(
              "w-full py-4 rounded-2xl transition-all active:scale-95 shadow-xl uppercase tracking-tighter font-black",
              isStackFull
                ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                : "bg-slate-100 hover:bg-white text-background-dark"
            )}
          >
            {isStackFull ? "Kapacita druhu (3/3) plná" : "Přidat do sbírky"}
          </button>

          {isStackFull && (
            <button
              onClick={onClose}
              className="w-full mt-4 py-2 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-slate-300 transition-colors"
            >
              Propustit do divočiny
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
