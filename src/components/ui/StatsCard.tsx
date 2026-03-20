import { motion } from 'framer-motion';
import { Heart, Zap, ArrowUp } from 'lucide-react';
import { cn, calculateLevel, getTotalXPForLevel } from '../../utils';

export const StatsCard = ({ 
  caughtCount, 
  playerHP, 
  playerXP,
  isXPBoosted, 
  isHPBoosted 
}: { 
  caughtCount: number, 
  playerHP: number,
  playerXP: number,
  isXPBoosted?: boolean,
  isHPBoosted?: boolean
}) => {
  const currentLevel = calculateLevel(playerXP);

  const xpAtStartOfLevel = getTotalXPForLevel(currentLevel);
  const xpAtEndOfLevel = getTotalXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = playerXP - xpAtStartOfLevel;
  const xpRequiredForNextLevel = xpAtEndOfLevel - xpAtStartOfLevel;
  const progressPercentage = (xpInCurrentLevel / xpRequiredForNextLevel) * 100;
  
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
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] opacity-70">Zkušenosti</span>
                {isXPBoosted && (
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1], scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-1 bg-primary px-1.5 py-0.5 rounded text-[8px] text-slate-950 font-black h-4"
                  >
                    <Zap size={10} fill="currentColor" />
                    <span>XP BOOST</span>
                  </motion.div>
                )}
              </div>
              <h2 className="text-5xl font-black text-slate-100 tracking-tighter leading-none">LVL {currentLevel}</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70">Celkem chyceno</span>
              <p className="text-2xl font-black text-slate-100 tracking-tighter leading-none mt-1">{caughtCount}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider items-center">
              <span className="text-primary/90">XP k úrovni {currentLevel + 1}</span>
              <span className="text-slate-400">{Math.round(xpInCurrentLevel)} / {Math.round(xpRequiredForNextLevel)}</span>
            </div>
            <div className="h-2 w-full bg-slate-950/50 rounded-full overflow-hidden border border-white/5 p-0.5 relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full shadow-[0_0_15px_rgba(13,185,242,0.4)]" 
              />
              {isXPBoosted && (
                <motion.div 
                  animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                />
              )}
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
                <Heart size={12} className={cn("text-red-500 transition-all", (playerHP < 20 || isHPBoosted) && "animate-pulse")} fill="currentColor" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-red-500/80 uppercase tracking-widest">Energie</span>
                {isHPBoosted && (
                  <motion.div
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="flex items-center gap-1 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[8px] text-emerald-500 font-black"
                  >
                    <ArrowUp size={8} />
                    <span>REGEN ACTIVE</span>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-100">{Math.round(playerHP)}%</span>
            </div>
          </div>

          <div className="h-2.5 w-full bg-slate-950/50 rounded-full border border-white/5 p-0.5 overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${playerHP}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-500 relative z-10",
                playerHP > 50 ? "bg-gradient-to-r from-red-600 to-red-500" :
                playerHP > 20 ? "bg-gradient-to-r from-orange-600 to-orange-500" :
                "bg-gradient-to-r from-red-800 to-red-600"
              )}
              style={{ boxShadow: playerHP > 10 ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none' }}
            />
            {isHPBoosted && (
              <div className="absolute inset-0 z-0 flex overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ left: '-10%', opacity: 0 }}
                    animate={{ 
                      left: ['-10%', '110%'], 
                      opacity: [0, 0.4, 0],
                      scale: [1, 1.5, 1]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      delay: i * 0.5,
                      ease: "easeInOut" 
                    }}
                    className="absolute top-0 size-full bg-red-400/20 blur-md rounded-full"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-2.5 flex justify-between items-center h-4">
               <div className="flex items-center gap-1.5">
                 {(playerHP < 100 || isHPBoosted) && (
                   <div className={cn("size-1 rounded-full animate-pulse", isHPBoosted ? "bg-emerald-500 shadow-[0_0_5px_#10b981]" : "bg-red-500")} />
                 )}
                 <p className="text-[9px] text-slate-500 font-bold uppercase italic tabular-nums">
                   {playerHP < 100 ? `REGEN: ${formatRemainingTime(remainingSeconds)}` : "STAV: OPTIMÁLNÍ"}
                 </p>
               </div>
               <p className="text-[9px] text-red-500/80 font-black uppercase tracking-tighter">
                 {playerHP < 20 ? "⚠️ KRITICKÁ ENERGIE" : isHPBoosted ? "⚡ ZRYCHLENÉ DOBÍJENÍ" : ""}
               </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
