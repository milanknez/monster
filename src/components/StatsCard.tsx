import { motion } from 'framer-motion';
import { cn } from '../utils';

export const StatsCard = ({ caughtCount }: { caughtCount: number }) => {
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
    <section className="p-4">
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
          <div className="h-3 w-full bg-slate-900/50 rounded-full overflow-hidden border border-primary/20 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full shadow-[0_0_15px_rgba(13,185,242,0.5)]" 
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={cn("h-1 w-6 rounded-full", i <= fullBlocks ? "bg-primary" : "bg-primary/20")} />
              ))}
            </div>
            <div className="text-[10px] text-primary font-black tracking-[0.2em]">{progressPercentage.toFixed(1)}% SYNC RATE</div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};