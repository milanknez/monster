import { motion } from 'framer-motion';
import { Activity, Bolt } from 'lucide-react';
import { cn, TYPE_COLORS } from '../../utils';
import type { Monster } from '../../types';

export const LatestDetection = ({ lastCaught, onSelect }: { lastCaught: Monster | null, onSelect: (m: Monster) => void }) => (
  <section className="px-4 py-2">
    <div className="flex justify-between items-center mb-3 px-1">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Poslední detekce</h3>
      <button className="text-[10px] font-bold text-primary hover:underline uppercase">Historie</button>
    </div>
    
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      onClick={() => lastCaught && onSelect(lastCaught)}
      className="relative overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-primary/40 transition-colors group cursor-pointer"
    >
      <div className="flex items-center p-4 gap-5">
        <div className="size-20 bg-slate-950 rounded-xl border border-primary/20 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:border-primary/50 transition-colors p-2">
          <div className="absolute inset-0 bg-primary/5 animate-pulse" />
          <motion.img 
            whileHover={{ scale: 1.1, rotate: 5 }}
            src={lastCaught ? lastCaught.image : "/monsters/001.png"} 
            alt="Příšerka" 
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_8px_rgba(13,185,242,0.5)]"
          />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-black text-lg text-slate-100 tracking-tight uppercase">
              {lastCaught ? lastCaught.name.replace(' ', '_') : "IGNIS_DRACON"}
            </h4>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter",
              lastCaught ? (TYPE_COLORS[lastCaught.type]?.bg || "bg-primary") : "bg-red-500",
              lastCaught ? (TYPE_COLORS[lastCaught.type]?.text || "text-background-dark") : "text-white"
            )}>
              {lastCaught ? lastCaught.rarity : "VZÁCNÝ"} EXEMPLÁŘ
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {lastCaught ? "Právě detekováno" : "Detekováno před 2h"} • Sektor 7-G
          </p>
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-1">
              <Activity size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-slate-400">{lastCaught ? lastCaught.level * 5 : 85} ATK</span>
            </div>
            <div className="flex items-center gap-1">
              <Bolt size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-slate-400">{lastCaught ? lastCaught.type.toUpperCase() : "OHEŇ"}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  </section>
)
