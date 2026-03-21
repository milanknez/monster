import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, QrCode, Flame, Droplets, Leaf, Zap, Moon, Sun, Heart } from 'lucide-react';
import { cn, TYPE_COLORS } from '../../utils';
import type { Monster } from '../../types';
import { monsterDB } from '../../data/monsters';

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

  const caughtFiltered = caughtMonsters
    .filter(m => filter === 'Vše' || m.rarity === filter)
    .sort((a, b) => (b.level || 1) - (a.level || 1));

  const uncaughtInDB = monsterDB
    .filter(m => filter === 'Vše' || m.rarity === filter)
    .filter(m => !caughtMonsters.some(cm => cm.id === m.id));

  const allToDisplay = [...caughtFiltered, ...uncaughtInDB];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-16"
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
        {allToDisplay.map((m: any, idx) => {
          const isCaught = 'caughtAt' in m || caughtMonsters.some(cm => cm.id === m.id && cm.level === m.level && (cm.totalXP || 0) === (m.totalXP || 0));
          // Use monster object directly if it's a caught one (it has a level/XP)
          const colors = TYPE_COLORS[m.type] || TYPE_COLORS['Default']
          
          return (
            <motion.div 
              key={(m as any).caughtAt ? (m as any).caughtAt + idx : m.id}
              whileHover={isCaught ? { scale: 1.02, y: -4 } : {}}
              whileTap={isCaught ? { scale: 0.98 } : {}}
              onClick={() => {
                if (!isCaught) return;
                onSelect(m as Monster);
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
                  {/* Stats Badges */}
                  {isCaught && (
                    <div className="absolute top-2 left-2 right-2 flex justify-between z-20 pointer-events-none">
                      <div className="size-7 rounded-full bg-primary/90 text-background-dark text-[11px] font-black flex items-center justify-center border border-white/20 shadow-lg leading-none">
                        {m.level}
                      </div>
                      <div className="h-7 px-2 rounded-full bg-slate-900/90 text-[9px] font-black flex items-center gap-1 border border-white/20 shadow-lg">
                        <motion.div
                          animate={(m.currentHP !== undefined ? (m.currentHP / (m.stats?.hp || 100) * 100) : 100) < 80 ? { opacity: [1, 0, 1] } : { opacity: 1 }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="flex items-center"
                        >
                          <Heart size={10} className="text-red-500 fill-red-500" />
                        </motion.div>
                        <span className={cn(
                          "text-white transition-colors",
                          (m.currentHP !== undefined ? (m.currentHP / (m.stats?.hp || 100) * 100) : 100) < 80 ? "text-red-400" : "text-white"
                        )}>{Math.round(m.currentHP !== undefined ? (m.currentHP / (m.stats?.hp || 100) * 100) : 100)}%</span>
                      </div>
                    </div>
                  )}
                  {/* Type Icon (shrunk/moved) */}
                  <div className="absolute bottom-12 left-2 p-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 z-20 pointer-events-none flex items-center shadow-lg">
                    {(() => {
                      const Icon = TYPE_ICONS[m.type];
                      return Icon ? <Icon size={14} className={colors.text} /> : null;
                    })()}
                  </div>
                  <img 
                    src={`/monsters/${m.id}.png`} 
                    className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110 pointer-events-none" 
                  />
                  <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
                    <p className="text-white text-sm font-black uppercase tracking-tight line-clamp-1">{m.name}</p>
                    <p className={cn("text-[8px] font-black uppercase tracking-widest mt-0.5", RARITY_COLORS[m.rarity])}>{m.rarity}</p>
                    
                    {/* Capacity indicators (3 squares) */}
                    <div className="flex gap-1.5 mt-2">
                       {(() => {
                         const count = caughtMonsters.filter(cm => cm.id === m.id).length;
                         return [0, 1, 2].map(i => (
                           <div 
                             key={i} 
                             className={cn(
                               "size-2.5 rounded-sm border-t border-x transition-all duration-700",
                               i < count 
                                 ? cn(colors.bg.replace('/10', ''), colors.border.replace('/30', 'border-white/40'), "shadow-[0_0_8px_rgba(255,255,255,0.2)]")
                                 : "bg-slate-950 border-white/5"
                             )}
                           />
                         ));
                       })()}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center size-full gap-2 opacity-50 pointer-events-none">
                  <Lock size={32} className="text-slate-600" />
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Neznámý</p>
                  
                  {/* Capacity indicator for unknown monster (0/3) */}
                  <div className="flex gap-1 mt-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="size-2 rounded-sm border bg-white/5 border-white/10" />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
