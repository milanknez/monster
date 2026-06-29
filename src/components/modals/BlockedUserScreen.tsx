import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface BlockedUserScreenProps {
  playerName: string | null;
  userUid: string;
  onLogout: () => void;
}

export const BlockedUserScreen = ({ playerName, userUid, onLogout }: BlockedUserScreenProps) => {
  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-rose-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-red-500/5 blur-[60px] pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full space-y-8 flex flex-col items-center">
        {/* Animated Ban Icon */}
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
          className="size-24 bg-rose-500/10 border-2 border-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.15)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-rose-500/5 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-500" />
          <Shield size={44} className="relative z-10 animate-pulse" />
        </motion.div>

        <div className="space-y-3">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-black text-white uppercase italic tracking-wider"
          >
            Přístup Odepřen
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-0.5 w-16 bg-gradient-to-r from-transparent via-rose-500 to-transparent mx-auto" 
          />

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 text-xs font-semibold leading-relaxed"
          >
            Váš účet byl zablokován administrátorem za porušení pravidel hry. Pokud si myslíte, že se jedná o chybu, kontaktujte prosím podporu.
          </motion.p>
        </div>

        {/* User Details */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full bg-slate-900/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl space-y-2 text-left"
        >
          <div className="flex justify-between items-center text-[10px] font-black uppercase">
            <span className="text-slate-500">Uživatel:</span>
            <span className="text-white italic">{playerName || 'Lovec'}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase">
            <span className="text-slate-500">ID Účtu:</span>
            <span className="text-primary tracking-wide select-all">{userUid}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase">
            <span className="text-slate-500">Status:</span>
            <span className="text-rose-500 animate-pulse">ZABLOKOVÁN</span>
          </div>
        </motion.div>

        {/* Logout Button as safe exit */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogout}
          className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-500 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all"
        >
          Odhlásit se
        </motion.button>
      </div>
    </div>
  );
};
