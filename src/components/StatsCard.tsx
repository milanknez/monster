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

  // Výpočet času do 100% (TEST: 10 minut = 600 sekund)
  const SECONDS_FOR_100_PERCENT = 10 * 60;
  const remainingPercent = 100 - playerHP;
  const remainingSeconds = Math.max(0, Math.ceil((remainingPercent / 100) * SECONDS_FOR_100_PERCENT));
  
  const formatRemainingTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "PLNĚ NABITO";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) return `${h}h ${m}m do konce`;
    if (m > 0) return `${m}m ${s}s do konce`;
    return `${s}s do konce`;
  };

  return (
    <section className="p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group"
      >
        {/* Ambient background glows */}
        <div className="absolute -right-4 -top-4 size-32 bg-primary/10 blur-3xl rounded-full" />
        <div className="absolute -left-4 -bottom-4 size-32 bg-red-500/5 blur-3xl rounded-full" />
        
        {/* XP / Level Section */}
        <div className="relative z-10 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1 opacity-70">Zkušenosti</span>
              <h2 className="text-5xl font-black text-slate-100 tracking-tighter leading-none">LVL {currentLevel}</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70">Celkem chyceno</span>
              <p className="text-2xl font-black text-slate-100 tracking-tighter leading-none mt-1">{caughtCount}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
              <span className="text-primary/90">XP k úrovni {currentLevel + 1}</span>
              <span className="text-slate-400">{xpInCurrentLevel} / {totalXpRequiredForNextLevel}</span>
            </div>
            <div className="h-2 w-full bg-slate-950/50 rounded-full overflow-hidden border border-white/5 p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full shadow-[0_0_15px_rgba(13,185,242,0.4)]" 
              />
            </div>
          </div>
        </div>

        {/* Subtle Divider */}
        <div className="h-px w-full bg-white/5 relative z-10 my-5" />

        {/* HP / Energy Section */}
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="size-5 bg-red-500/20 rounded-md flex items-center justify-center">
                <Heart size={12} className={cn("text-red-500 transition-all", playerHP < 20 && "animate-pulse")} fill="currentColor" />
              </div>
              <span className="text-[10px] font-black text-red-500/80 uppercase tracking-widest">Energie</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-100">{Math.round(playerHP)}%</span>
            </div>
          </div>

          <div className="h-2.5 w-full bg-slate-950/50 rounded-full border border-white/5 p-0.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${playerHP}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                playerHP > 50 ? "bg-gradient-to-r from-red-600 to-red-500" :
                playerHP > 20 ? "bg-gradient-to-r from-orange-600 to-orange-500" :
                "bg-gradient-to-r from-red-800 to-red-600"
              )}
              style={{ boxShadow: playerHP > 10 ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none' }}
            />
          </div>

          <div className="mt-2.5 flex justify-between items-center h-4">
               <div className="flex items-center gap-1.5">
                 {playerHP < 100 && (
                   <div className="size-1 bg-red-500 rounded-full animate-pulse" />
                 )}
                 <p className="text-[9px] text-slate-500 font-bold uppercase italic tabular-nums">
                   {playerHP < 100 ? `REGEN: ${formatRemainingTime(remainingSeconds)}` : "STAV: OPTIMÁLNÍ"}
                 </p>
               </div>
               <p className="text-[9px] text-red-500/80 font-black uppercase tracking-tighter">
                 {playerHP < 20 ? "⚠️ KRITICKÁ ENERGIE" : ""}
               </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
};