import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn, TYPE_COLORS } from '../utils';
import type { Monster } from '../types';
import { monsterDB } from '../data/monsters';

export const Bestiary = ({ caughtMonsters, onSelect }: { caughtMonsters: Monster[], onSelect: (m: Monster) => void }) => {
  const [filter, setFilter] = useState('Vše')
  const rarities = ['Vše', 'Běžná', 'Vzácná', 'Epická', 'Legendární']

  const filteredDB = monsterDB
    .filter(m => filter === 'Vše' || m.rarity === filter)
    .sort((a, b) => {
      const isACaught = caughtMonsters.some(cm => cm.id === a.id);
      const isBCaught = caughtMonsters.some(cm => cm.id === b.id);
      if (isACaught && !isBCaught) return -1;
      if (!isACaught && isBCaught) return 1;
      return 0; // Keep original order (by ID) if both caught or both locked
    });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32"
    >
      <div className="flex flex-col gap-3 p-6 bg-primary/5 border-b border-primary/10">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Globální Hodnocení</p>
            <p className="text-slate-100 text-2xl font-black uppercase tracking-tighter">Sběratel Úr. {Math.floor(caughtMonsters.length / 5) + 1}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-100 text-sm font-black uppercase">
              {caughtMonsters.length} / {monsterDB.length} 
              <span className="text-primary/60 ml-1">Objeveno</span>
            </p>
          </div>
        </div>
        <div className="relative h-3 w-full rounded-full bg-slate-800/50 border border-primary/20 p-0.5 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(caughtMonsters.length / monsterDB.length) * 100}%` }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_10px_#0db9f2]"
          />
        </div>
        <div className="flex justify-between">
          <p className="text-primary text-[10px] font-black uppercase">{Math.round((caughtMonsters.length / monsterDB.length) * 100)}% Kompletní</p>
          <p className="text-slate-500 text-[10px] font-black uppercase">Další milník: {caughtMonsters.length + (5 - (caughtMonsters.length % 5))}</p>
        </div>
      </div>

      <div className="sticky top-16 z-30 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
        <div className="flex px-4 gap-6 overflow-x-auto no-scrollbar scroll-smooth py-4">
          {rarities.map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={cn(
                "whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all relative pb-2",
                filter === r ? "text-primary" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {r}
              {filter === r && (
                <motion.div layoutId="filter-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_#0db9f2]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4">
        {filteredDB.map(m => {
          const isCaught = caughtMonsters.some(cm => cm.id === m.id)
          const colors = TYPE_COLORS[m.type] || TYPE_COLORS['Default']
          
          return (
            <motion.div 
              key={m.id}
              whileHover={isCaught ? { scale: 1.02, y: -4 } : {}}
              whileTap={isCaught ? { scale: 0.98 } : {}}
              onClick={() => isCaught && onSelect(caughtMonsters.find(cm => cm.id === m.id) || { ...m, level: 1, image: `/monsters/${m.id}.png` } as Monster)}
              className={cn(
                "group relative aspect-square rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer",
                isCaught ? colors.border : "border-slate-800 bg-slate-900/40 grayscale"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              
              {isCaught ? (
                <>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10 z-20">
                    <span className={cn("text-[9px] font-black uppercase", colors.text)}>{m.type}</span>
                  </div>
                  <img 
                    src={`/monsters/${m.id}.png`} 
                    className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute bottom-3 left-3 right-3 z-20">
                    <p className="text-white text-sm font-black uppercase tracking-tight line-clamp-1">{m.name}</p>
                    <div className="flex gap-1 mt-1.5">
                      <div className={cn("h-1 w-8 rounded-full", colors.bg.replace('/10', ''))}></div>
                      <div className="h-1 w-4 rounded-full bg-white/20"></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center size-full gap-2 opacity-50">
                  <Lock size={32} className="text-slate-600" />
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Neznámý</p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}