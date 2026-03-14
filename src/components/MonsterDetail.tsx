import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bolt, Zap, LayoutGrid, RefreshCw } from 'lucide-react';
import { cn, TYPE_COLORS } from '../utils';
import type { Monster } from '../types';

export const MonsterDetail = ({ monster, onBack, onTrade, onUpgrade }: { monster: Monster; onBack: () => void; onTrade?: () => void; onUpgrade?: () => void }) => {
  const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default']
  
  // Při otevření detailu nascrollovat nahoru
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="w-full min-h-screen bg-background-dark pb-32"
    >
      {/* Magic Card Layout - Full Width */}
      <div className={cn(
        "w-full rounded-b-[2.5rem] p-3 pt-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-t-0 overflow-hidden relative",
        monster.type === 'Ohnivá' ? "border-[#4a1a1a] bg-[#2a0a0a]" :
        monster.type === 'Vodní' ? "border-[#1a2a4a] bg-[#0a1a2a]" :
        monster.type === 'Přírodní' ? "border-[#1a3a1a] bg-[#0a2a0a]" :
        "border-[#3a2a1a] bg-[#2a1a0a]"
      )}>
        {/* Holographic Overlays */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.4)_45%,rgba(255,255,255,0.4)_50%,transparent_55%)] animate-shimmer" />

        {/* Card Content */}
        <div className="relative z-10 flex flex-col gap-3">
          
          {/* Header Area */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-inner">
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 transition-colors shrink-0"
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter drop-shadow-md truncate flex-1">
              {monster.name}
            </h2>
          </div>

          {/* Large Visual Area */}
          <div className="relative aspect-square w-full bg-black/60 rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl">
            <div className={cn("absolute inset-0 opacity-40", 
              monster.type === 'Ohnivá' ? "bg-[radial-gradient(circle_at_center,_#ff4444_0%,_transparent_70%)]" :
              monster.type === 'Vodní' ? "bg-[radial-gradient(circle_at_center,_#0db9f2_0%,_transparent_70%)]" :
              "bg-[radial-gradient(circle_at_center,_#a3e635_0%,_transparent_70%)]"
            )} />
            <motion.img 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              src={monster.image} 
              className="w-full h-full object-contain relative z-10 p-8 drop-shadow-[0_30px_50px_rgba(0,0,0,1)]" 
            />
          </div>

          {/* Type/Level Bar */}
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Typ příšerky</span>
              <span className="text-sm font-black text-slate-200 uppercase">{monster.type} // {monster.rarity}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Úroveň</span>
              <p className="text-lg font-black text-primary italic leading-none">LVL {monster.level}</p>
            </div>
          </div>

          {/* The "Scroll" Text Area */}
          <div className="bg-slate-950/60 backdrop-blur-lg rounded-[1.5rem] border-2 border-white/5 p-5 text-slate-100 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
             {/* Subtle Texture Overlay */}
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
             
             {/* Schopnosti */}
             <div className="relative z-10">
               <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 border-b border-primary/20 pb-1 flex items-center gap-2">
                 <Zap size={10} />
                 Schopnosti karty
               </h3>
               <div className="space-y-4">
                 {monster.abilities && monster.abilities.length > 0 ? (
                   monster.abilities.map((ability, idx) => (
                     <div key={idx} className="flex gap-4 group">
                        <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-lg transition-transform group-hover:scale-110", colors.bg)}>
                           <Zap size={16} className={colors.text} />
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase text-white leading-tight mb-0.5 tracking-tight">{ability.name}</p>
                          <p className="text-[11px] leading-snug text-slate-400 font-bold">{ability.description}</p>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="py-2 text-center border border-dashed border-white/10 rounded-xl">
                     <p className="text-xs italic text-slate-500 font-bold uppercase tracking-widest">Bez speciálních schopností</p>
                   </div>
                 )}
               </div>
             </div>

             {/* Příběh / Historie */}
             <div className="relative z-10 pt-2 border-t border-white/5">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                 <LayoutGrid size={10} />
                 Původ a historie
               </h3>
               <p className="text-sm text-slate-300 italic leading-relaxed font-bold tracking-tight">
                 "{monster.description || "O této příšerce zatím kolují jen legendy v zapomenutých sektorech..."}"
               </p>
             </div>
          </div>

          {/* Bottom Indicators */}
          <div className="flex justify-around items-center pt-2 pb-1">
             {[
               { k: 'ÚTOK', v: monster.level * 5, c: 'text-primary' },
               { k: 'RYCHLOST', v: monster.level * 3, c: 'text-secondary' },
               { k: 'ENERGIE', v: 100 - (monster.level * 2), c: 'text-purple-400' }
             ].map(s => (
               <div key={s.k} className="text-center px-4">
                 <p className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">{s.k}</p>
                 <p className={cn("text-lg font-black", s.c)}>{s.v}</p>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 mt-10 mb-8 flex gap-4">
        <button 
          onClick={onBack}
          className={cn(
            "group relative py-4 rounded-2xl overflow-hidden transition-all active:scale-95 border border-white/10",
            onTrade ? "flex-[0.8]" : "w-full"
          )}
        >
          {/* Dark Glass Background */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-md group-hover:bg-white/10" />
          
          <div className="relative z-10 flex items-center justify-center gap-2">
            <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-100 transition-colors" />
            <span className="text-sm font-black text-slate-400 group-hover:text-slate-100 uppercase tracking-wider transition-colors">Zavřít</span>
          </div>
        </button>

        {onTrade && (
          <button 
            onClick={onTrade}
            className="flex-1 group relative py-4 rounded-2xl overflow-hidden transition-all active:scale-95"
          >
            {/* Glossy Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-blue-700 shadow-[0_8px_20px_rgba(13,185,242,0.3)]" />
            
            {/* Animated Shine Effect */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            
            <div className="relative z-10 flex items-center justify-center gap-2">
              <RefreshCw size={18} className="text-background-dark animate-spin-slow" />
              <span className="text-sm font-black text-background-dark uppercase tracking-wider">Vyměnit</span>
            </div>
          </button>
        )}
      </div>

    </motion.div>
  )
}