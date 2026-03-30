import { motion, AnimatePresence } from 'framer-motion';
import { Skull, ChevronRight, Zap } from 'lucide-react';

interface DefeatModalProps {
  isOpen: boolean;
  winXP: number;
  onComplete: () => void;
}

export const DefeatModal = ({
  isOpen,
  winXP,
  onComplete
}: DefeatModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-3xl px-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-sm bg-slate-900 border-2 border-red-500/30 rounded-[3rem] p-10 text-center shadow-[0_20px_60px_rgba(239,68,68,0.2)]"
          >
            <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
               <Skull size={40} className="text-red-500" />
            </div>
            
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">PORÁŽKA</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 px-4 leading-relaxed">
              Tvé monstrum bylo vyčerpáno, ale každý souboj tě posouvá dál!
            </p>

            {/* XP Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 px-5 py-2.5 rounded-full mb-10 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/10"
            >
              <div className="size-6 bg-blue-500 rounded-lg flex items-center justify-center text-black shadow-lg">
                <Zap size={14} fill="currentColor" />
              </div>
              <span className="text-lg font-black text-blue-400 tabular-nums tracking-tight">+{winXP} XP</span>
              <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest ml-1">Utěcha</span>
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl border border-white/5"
            >
              Vrátit se na mapu <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
