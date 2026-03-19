import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, QrCode, Flame, Droplets, Leaf, Zap, Moon, Sun } from 'lucide-react';
import { cn, TYPE_COLORS } from '../utils';
import type { Monster } from '../types';
import { monsterDB } from '../data/monsters';

const TYPE_ICONS: Record<string, any> = {
  'Ohnivá': Flame,
  'Vodní': Droplets,
  'Přírodní': Leaf,
  'Elektrická': Zap,
  'Temná': Moon,
  'Světelná': Sun
}

const RARITY_COLORS: Record<string, string> = {
  'Běžná': 'text-slate-400',
  'Vzácná': 'text-purple-400',
  'Epická': 'text-orange-400',
  'Legendární': 'text-amber-400'
}

export const Bestiary = ({ caughtMonsters, onSelect }: { 
  caughtMonsters: Monster[], 
  onSelect: (m: Monster) => void
}) => {
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
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Globální Hodnocení</p>
            <p className="text-slate-100 text-2xl font-black uppercase tracking-tighter">Sběratel Úr. {Math.floor(caughtMonsters.length / 5) + 1}</p>
          </div>
          
          <div className="flex gap-2">
            <div className="text-right flex flex-col items-end">
              <p className="text-slate-100 text-sm font-black uppercase">
                {new Set(caughtMonsters.map(m => m.id)).size} / {monsterDB.length}
                <span className="text-primary/60 ml-1">Druhů</span>
              </p>
              <p className="text-slate-500 text-[10px] font-black uppercase mt-0.5">
                {caughtMonsters.length} celkem chyceno
              </p>
            </div>
          </div>
        </div>
        <div className="relative h-3 w-full rounded-full bg-slate-800/50 border border-primary/20 p-0.5 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(new Set(caughtMonsters.map(m => m.id)).size / monsterDB.length) * 100}%` }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_10px_#0db9f2]"
          />
        </div>
        <div className="flex justify-between">
          <p className="text-primary text-[10px] font-black uppercase">{Math.round((new Set(caughtMonsters.map(m => m.id)).size / monsterDB.length) * 100)}% Kompletní</p>
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
          const stackCount = caughtMonsters.filter(cm => cm.id === m.id).length
          const colors = TYPE_COLORS[m.type] || TYPE_COLORS['Default']
          
          return (
            <motion.div 
              key={m.id}
              whileHover={isCaught ? { scale: 1.02, y: -4 } : {}}
              whileTap={isCaught ? { scale: 0.98 } : {}}
              onClick={() => {
                if (!isCaught) return;
                const caughtData = caughtMonsters.find(cm => cm.id === m.id) || { ...m, level: 1, image: `/monsters/${m.id}.png` } as Monster;
                onSelect(caughtData);
              }}
              className={cn(
                "group relative aspect-square rounded-2xl overflow-hidden border transition-all duration-500 cursor-pointer shadow-lg",
                isCaught 
                  ? m.rarity === 'Vzácná' 
                    ? "border-purple-500/40 bg-purple-500/5 shadow-purple-500/20" 
                    : m.rarity === 'Epická'
                      ? "border-orange-500/40 bg-orange-500/5 shadow-orange-500/20"
                      : colors.border
                  : "border-slate-800 bg-slate-900/40 grayscale"
              )}
            >
              {/* Decorative Frame for Rare/Epic */}
              {isCaught && (m.rarity === 'Vzácná' || m.rarity === 'Epická') && (
                <>
                  <div className={cn(
                    "absolute inset-0 pointer-events-none border-2 rounded-2xl z-30 opacity-60",
                    m.rarity === 'Vzácná' ? "border-purple-500/30" : "border-orange-500/30"
                  )} />
                  <div className="absolute inset-0 pointer-events-none z-30">
                    {/* Corners */}
                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                      <div key={corner} className={cn(
                        "absolute size-4 border-2 pointer-events-none",
                        corner.includes('top') ? "top-0" : "bottom-0",
                        corner.includes('left') ? "left-0" : "right-0",
                        m.rarity === 'Vzácná' ? "border-purple-400" : "border-orange-400",
                        corner === 'top-left' && "border-r-0 border-b-0 rounded-tl-xl",
                        corner === 'top-right' && "border-l-0 border-b-0 rounded-tr-xl",
                        corner === 'bottom-left' && "border-r-0 border-t-0 rounded-bl-xl",
                        corner === 'bottom-right' && "border-l-0 border-t-0 rounded-br-xl"
                      )} />
                    ))}
                  </div>
                  {/* Glowing background */}
                  <div className={cn(
                    "absolute -inset-2 blur-2xl opacity-20 z-0",
                    m.rarity === 'Vzácná' ? "bg-purple-500" : "bg-orange-500"
                  )} />
                </>
              )}
              {/* Overlay gradient - pointer-events-none ensures clicks always reach the card */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none" />
              
              {isCaught ? (
                <>
                  <div className="absolute top-2 left-2 p-1.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10 z-20 pointer-events-none flex items-center">
                    {(() => {
                      const Icon = TYPE_ICONS[m.type];
                      return Icon ? <Icon size={12} className={colors.text} /> : null;
                    })()}
                  </div>
                  {/* Stack badge */}
                  {stackCount > 1 && (
                    <div className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-background-dark text-[10px] font-black flex items-center justify-center z-20 shadow-[0_0_8px_rgba(13,185,242,0.6)] pointer-events-none">
                      ×{stackCount}
                    </div>
                  )}
                  <img 
                    src={`/monsters/${m.id}.png`} 
                    className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110 pointer-events-none" 
                  />
                  <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
                    <p className="text-white text-sm font-black uppercase tracking-tight line-clamp-1">{m.name}</p>
                    <p className={cn("text-[8px] font-black uppercase tracking-widest mt-0.5", RARITY_COLORS[m.rarity])}>{m.rarity}</p>
                    <div className="flex gap-1 mt-1.5">
                      <div className={cn("h-1 w-8 rounded-full", colors.bg.replace('/10', ''))}></div>
                      <div className="h-1 w-4 rounded-full bg-white/20"></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center size-full gap-2 opacity-50 pointer-events-none">
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