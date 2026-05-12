import { motion } from 'framer-motion';
import { Battery, Zap, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, calculateLevel, getTotalXPForLevel } from '../../utils';

export const StatsCard = ({
   caughtCount,
   playerHP,
   playerXP,
   isXPBoosted,
   isHPBoosted,
   xpMultiplier = 1,
   hpMultiplier = 1
}: {
   caughtCount: number,
   playerHP: number,
   playerXP: number,
   isXPBoosted?: boolean,
   isHPBoosted?: boolean,
   xpMultiplier?: number,
   hpMultiplier?: number
}) => {
   const { t } = useTranslation();
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
      if (totalSeconds <= 0) return t('stats_card.fully_charged');
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      let timeStr = "";
      if (h > 0) timeStr = `${h}h ${m}m`;
      else if (m > 0) timeStr = `${m}m ${s}s`;
      else timeStr = `${s}s`;

      return t('stats_card.remaining_time', { time: timeStr });
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
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] opacity-70">{t('stats_card.xp_label')}</span>
                        {isXPBoosted && (
                           <motion.div
                              animate={{ opacity: [1, 0.4, 1], scale: [1, 1.1, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="flex items-center gap-1 bg-primary px-1.5 py-0.5 rounded text-[8px] text-slate-950 font-black h-4"
                           >
                              <Zap size={10} fill="currentColor" />
                              <span>{t('stats_card.xp_boost', { mult: xpMultiplier })}</span>
                           </motion.div>
                        )}
                     </div>
                     <h2 className="text-5xl font-black text-slate-100 tracking-tighter leading-none">LVL {currentLevel}</h2>
                  </div>
                  <div className="text-right">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70">{t('stats_card.total_caught')}</span>
                     <p className="text-2xl font-black text-slate-100 tracking-tighter leading-none mt-1">{caughtCount}</p>
                  </div>
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider items-center">
                     <span className="text-primary/90">{t('stats_card.xp_to_next', { level: currentLevel + 1 })}</span>
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

            {/* Energy Section */}
            <div className="relative z-10">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                     <div className="size-5 bg-blue-500/20 rounded-md flex items-center justify-center">
                        <Battery size={12} className={cn("text-blue-500 transition-all", (playerHP < 20 || isHPBoosted) && "animate-pulse")} fill="currentColor" />
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{t('stats_card.energy')}</span>
                        {isHPBoosted && (
                           <motion.div
                              animate={{ y: [0, -2, 0] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="flex items-center gap-1 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[8px] text-emerald-500 font-black"
                           >
                              <ArrowUp size={8} />
                              <span>{t('stats_card.regen', { mult: hpMultiplier })}</span>
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
                        playerHP > 50 ? "bg-gradient-to-r from-blue-600 to-blue-400" :
                           playerHP > 20 ? "bg-gradient-to-r from-blue-700 to-blue-500" :
                              "bg-gradient-to-r from-blue-900 to-blue-700"
                     )}
                     style={{ boxShadow: playerHP > 10 ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none' }}
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
                              className="absolute top-0 size-full bg-blue-400/20 blur-md rounded-full"
                           />
                        ))}
                     </div>
                  )}
               </div>

               <div className="mt-2.5 flex justify-between items-center h-4">
                  <div className="flex items-center gap-1.5">
                     {(playerHP < 100 || isHPBoosted) && (
                        <div className={cn("size-1 rounded-full animate-pulse", isHPBoosted ? "bg-emerald-500 shadow-[0_0_5px_#10b981]" : "bg-blue-500")} />
                     )}
                     <p className="text-[9px] text-slate-500 font-bold uppercase italic tabular-nums">
                        {playerHP < 100 ? `${t('stats_card.charging')}: ${formatRemainingTime(remainingSeconds)}` : t('stats_card.status_optimal')}
                     </p>
                  </div>
                  <p className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">
                     {playerHP < 20 ? `⚠️ ${t('stats_card.critical_energy')}` : isHPBoosted ? `⚡ ${t('stats_card.accelerated_charging')}` : ""}
                  </p>
               </div>
            </div>
         </motion.div>
      </section>
   );
};
