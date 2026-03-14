import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '../utils';

export const StatsCard = ({ caughtCount, playerHP }: { caughtCount: number, playerHP: number }) => {
  // Simple logic for leveling: each monster gives 250 XP
  // 1000 XP per level.
  const totalXp = caughtCount * 250;
  const currentLevel = Math.floor(totalXp / 1000) + 1;
  const xpInCurrentLevel = totalXp % 1000;
  const totalXpRequiredForNextLevel = 1000;
  const progressPercentage = (xpInCurrentLevel / totalXpRequiredForNextLevel) * 100;
  
  // Display blocks (1-5)
  const fullBlocks = Math.floor(progressPercentage / 20);

  return (
    <section className="p-4 flex flex-col gap-3">
      {/* XP Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden group"
      >
        <div className="absolute -right-4 -top-4 size-24 bg-primary/10 blur-3xl rounded-full" />
        
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">Úroveň synchronizace</span>
            <h2 className="text-5xl font-black text-slate-100 tracking-tighter">LVL {currentLevel}</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Celkem chyceno</span>
            <p className="text-2xl font-black text-slate-100 tracking-tighter">{caughtCount}</p>
          </div>
        </div>
        
        <div className="space-y-3 relative z-10">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className="text-primary/80">XP k úrovni {currentLevel + 1}</span>
            <span className="text-slate-400">{xpInCurrentLevel} / {totalXpRequiredForNextLevel}</span>
          </div>
          <div className="h-2.5 w-full bg-slate-900/50 rounded-full overflow-hidden border border-primary/20 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full shadow-[0_0_15px_rgba(13,185,242,0.5)]" 
            />
          </div>
        </div>
      </motion.div>

      {/* HP Bar - Zjednodušený elegantní pruh se srdcem */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-500/5 border border-red-500/10 rounded-2xl px-5 py-4 flex flex-col gap-2"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Heart size={14} className={cn("text-red-500 transition-all", playerHP < 20 && "animate-pulse")} fill="currentColor" />
            </div>
            <span className="text-[10px] font-black text-red-500/80 uppercase tracking-widest">Energie Runnera</span>
          </div>
          <span className="text-xs font-black text-slate-100">{Math.round(playerHP)}%</span>
        </div>
        <div className="h-3 w-full bg-slate-950 rounded-full border border-red-500/10 p-0.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${playerHP}%` }}
            className={cn(
              "h-full rounded-full transition-colors duration-500",
              playerHP > 50 ? "bg-gradient-to-r from-red-600 to-red-500" :
              playerHP > 20 ? "bg-gradient-to-r from-orange-600 to-orange-500" :
              "bg-gradient-to-r from-red-800 to-red-600"
            )}
            style={{ boxShadow: playerHP > 10 ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none' }}
          />
        </div>
        <div className="flex justify-between items-center">
             <p className="text-[9px] text-slate-500 font-bold uppercase italic">
               {playerHP < 100 ? "⚡ Probíhá regenerace..." : "✅ Plná energie"}
             </p>
             <p className="text-[9px] text-slate-500 font-bold uppercase italic tabular-nums">
               {playerHP < 20 ? "⚠️ Vyčerpání!" : ""}
             </p>
        </div>
      </motion.div>
    </section>
  );
};