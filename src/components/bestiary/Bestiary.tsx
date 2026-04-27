import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, QrCode, Heart } from 'lucide-react';
import { cn, TYPE_COLORS, getMonsterMaxHP, getMonsterAttack, getMonsterDefense, getTotalXPForLevel, getMonsterPower, TYPE_ICONS } from '../../utils';
import type { Monster } from '../../types';
import { monsterDB } from '../../data/monsters';
import { RESOURCE_CONFIG } from '../map/mapUtils';





const RARITY_THEME: Record<string, { text: string, border: string, bg: string, glow: string, card: string, decor: string }> = {
  'Běžná': {
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    bg: 'bg-slate-500',
    glow: 'bg-slate-500',
    card: 'border-white/5 bg-slate-900/40',
    decor: 'border-white/5'
  },
  'Vzácná': {
    text: 'text-blue-400',
    border: 'border-blue-400',
    bg: 'bg-blue-500',
    glow: 'bg-blue-500',
    card: 'border-blue-500/40 bg-blue-500/5 shadow-blue-500/20',
    decor: 'border-blue-500/30'
  },
  'Epická': {
    text: 'text-purple-400',
    border: 'border-purple-400',
    bg: 'bg-purple-500',
    glow: 'bg-purple-500',
    card: 'border-purple-500/40 bg-purple-500/5 shadow-purple-500/20',
    decor: 'border-purple-500/30'
  },
  'Legendární': {
    text: 'text-amber-400',
    border: 'border-amber-400',
    bg: 'bg-amber-500',
    glow: 'bg-amber-500',
    card: 'border-amber-500/40 bg-amber-500/5 shadow-amber-500/20',
    decor: 'border-amber-500/30'
  }
}

import { useGameSound } from '../../data/sounds';

export const Bestiary = ({ caughtMonsters, onSelect }: {
  caughtMonsters: Monster[],
  onSelect: (m: Monster) => void
}) => {
  const { playBookFlip, playClick } = useGameSound();
  const [filter, setFilter] = useState('Vše')
  const rarities = ['Vše', 'Běžná', 'Vzácná', 'Epická', 'Legendární']

  const caughtFiltered = caughtMonsters
    .filter(m => filter === 'Vše' || m.rarity === filter)
    .sort((a, b) => getMonsterPower(b) - getMonsterPower(a));

  const uncaughtInDB = monsterDB
    .filter(m => filter === 'Vše' || m.rarity === filter)
    .filter(m => !caughtMonsters.some(cm => cm.id === m.id))
    .slice(0, 6); // Limit unknown monsters to 6 items

  const allToDisplay = [...caughtFiltered, ...uncaughtInDB];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
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
              onClick={() => {
                setFilter(r);
                playBookFlip();
              }}
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
          const isCaught = 'caughtAt' in m || caughtMonsters.some(cm => cm.id === m.id && cm.level === m.level && (cm.xp || 0) === (m.xp || 0));
          const colors = TYPE_COLORS[m.type] || TYPE_COLORS['Default'];
          const theme = RARITY_THEME[m.rarity] || RARITY_THEME['Běžná'];

          return (
            <motion.div
              key={(m as any).caughtAt ? (m as any).caughtAt + idx : m.id}
              whileHover={isCaught ? { scale: 1.02, y: -4 } : {}}
              whileTap={isCaught ? { scale: 0.98 } : {}}
              onClick={() => isCaught && onSelect(caughtMonsters.find(cm => cm.id === m.id) || m)}
              className={cn(
                "relative group aspect-square rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 border-2",
                isCaught
                  ? theme.card
                  : "border-slate-800 bg-slate-900/40 grayscale"
              )}
            >
              {/* Decorative Frame for Rare/Epic/Legendary */}
              {isCaught && m.rarity !== 'Běžná' && (
                <>
                  <div className={cn(
                    "absolute inset-0 pointer-events-none border-2 rounded-2xl z-30 opacity-60",
                    theme.decor
                  )} />
                  <div className="absolute inset-0 pointer-events-none z-30">
                    {/* Corners */}
                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                      <div key={corner} className={cn(
                        "absolute size-4 border-2 pointer-events-none",
                        corner.includes('top') ? "top-0" : "bottom-0",
                        corner.includes('left') ? "left-0" : "right-0",
                        theme.border,
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
                    theme.glow
                  )} />
                </>
              )}
              {/* Overlay gradient - pointer-events-none ensures clicks always reach the card */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none" />

              {isCaught ? (
                <>
                  {/* Top Left: Level & Gems */}
                  <div className="absolute top-2 left-2 z-20 pointer-events-none flex flex-col items-center">
                    <div className="h-6 px-2 rounded-lg bg-slate-900/90 text-[9px] font-black flex items-center justify-center border border-white/20 shadow-lg leading-none text-primary uppercase">
                      LVL {m.level}
                    </div>
                    {/* Jewel Sockets (Horizontal Diamonds) */}
                    <div className="flex flex-row gap-1 mt-1.5">
                      {[0, 1, 2].map((i) => {
                        const gemId = m.gems?.[i];
                        const gemConfig = gemId ? RESOURCE_CONFIG[gemId] : null;

                        return (
                          <div
                            key={i}
                            className={cn(
                              "size-1.5 rotate-45 border transition-all duration-500",
                              gemId
                                ? "shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                : "bg-slate-900 border-white/5"
                            )}
                            style={{
                              backgroundColor: gemConfig?.color || (gemId ? '#fff' : 'transparent'),
                              borderColor: gemId ? 'rgba(255,255,255,0.6)' : undefined
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 z-20 pointer-events-none">
                    <div className="h-6 px-1.5 rounded-lg bg-slate-900/90 text-[8px] font-black flex items-center gap-1 border border-white/20 shadow-lg">
                      {(() => {
                        const maxHP = getMonsterMaxHP(m);
                        const currentHP = m.currentHP ?? maxHP;
                        const hpPerc = Math.min(100, Math.round((currentHP / maxHP) * 100));

                        return (
                          <>
                            <motion.div
                              animate={hpPerc < 80 ? { opacity: [1, 0, 1] } : { opacity: 1 }}
                              transition={{ repeat: Infinity, duration: 0.8 }}
                              className="flex items-center"
                            >
                              <Heart size={10} className="text-red-500 fill-red-500" />
                            </motion.div>
                            <span className={cn(
                              "text-white transition-colors",
                              hpPerc < 80 ? "text-red-400" : "text-white"
                            )}>{hpPerc}%</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Content */}
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
                  <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none mb-1">
                    <p className="text-white text-sm font-black uppercase tracking-tight line-clamp-1">{m.name}</p>
                    <p className={cn("text-[8px] font-black uppercase tracking-widest mt-0.5", theme.text)}>{m.rarity}</p>
                  </div>

                  {/* XP Level Bar at the very bottom */}
                  <div className="absolute bottom-1 left-3 right-3 h-1 bg-black/40 rounded-full border border-white/5 overflow-hidden z-20 pointer-events-none">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: (() => {
                          const currentLvlXP = getTotalXPForLevel(m.level);
                          const nextLvlXP = getTotalXPForLevel(m.level + 1);
                          const totalNeeded = nextLvlXP - currentLvlXP;
                          const perc = Math.max(0, Math.min(100, ((m.xp || 0) / totalNeeded) * 100));
                          return `${perc}%`;
                        })()
                      }}
                      className={cn("h-full rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]", theme.bg)}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center size-full gap-2 opacity-50 pointer-events-none">
                  <Lock size={32} className="text-slate-600" />
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Neznámý</p>

                  {/* Empty sockets for unknown monster */}
                  <div className="flex gap-2.5 mt-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="size-1.5 rotate-45 border bg-slate-800 border-white/5" />
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
