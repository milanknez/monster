import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { APP_CONFIG } from '../../config';

export const TestEndedModal = () => {
  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-amber-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-amber-500/5 blur-[60px] pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full space-y-8 flex flex-col items-center">
        {/* Animated Trophy Icon */}
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
          className="size-24 bg-amber-500/10 border-2 border-amber-500/20 rounded-3xl flex items-center justify-center text-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden group"
        >
          <Trophy size={44} className="relative z-10 animate-bounce" />
        </motion.div>

        <div className="space-y-3">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-black text-white uppercase italic tracking-wider"
          >
            Testování skončilo!
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-0.5 w-16 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" 
          />

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 text-xs font-semibold leading-relaxed"
          >
            Děkujeme moc za účast v beta testu hry! Testovací fáze byla úspěšně ukončena. Pro pokračování ve hře si prosím stáhněte plnou verzi z Google Play.
          </motion.p>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-slate-500 text-[10px] leading-relaxed"
          >
            Upozornění: Pokud aplikaci pouze aktualizujete (neodinstalujete), váš dosavadní postup a herní účet se automaticky přenese do plné verze.
          </motion.p>
        </div>

        {/* Download Button */}
        <motion.a
          href={APP_CONFIG.INVITE_BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-primary text-slate-950 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 text-xs"
        >
          Stáhnout z Google Play
        </motion.a>
      </div>
    </div>
  );
};
