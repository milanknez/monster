import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, Mail, ShieldCheck, Star } from 'lucide-react';
import { signInWithGoogle } from '../../lib/firebase';
import { cn } from '../../utils';

interface SetupProfileModalProps {
  onComplete: (name: string, referralCode?: string) => void;
  isLoggingIn?: boolean;
}

export const SetupProfileModal = ({ onComplete, isLoggingIn = false }: SetupProfileModalProps) => {
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isNewUser, setIsNewUser] = useState(true);

  useEffect(() => {
    const pendingRef = localStorage.getItem('pending_referral');
    if (pendingRef) setReferralCode(pendingRef);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        // If user already has a display name, we use it
        const finalName = name.trim() || user.displayName || 'Průzkumník';
        onComplete(finalName, referralCode.trim() || undefined);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length >= 3) {
      // For now, we still allow anonymous if needed, but the plan prioritizes Google
      handleGoogleLogin();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 border border-primary/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(13,185,242,0.15)] relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        
        <div className="p-8 relative z-10">
          <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/30 mx-auto">
            <User size={32} className="text-primary" />
          </div>

          <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter text-center mb-2">
            Vítejte lovče
          </h2>
          <p className="text-sm text-slate-400 font-medium text-center mb-8 px-2">
            Pro aktivaci online zálohy a odměn se prosím přihlaste.
          </p>

          <div className="space-y-6">
            <div className="relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2 text-center">
                Přezdívka (volitelné)
              </label>
              <input 
                type="text" 
                placeholder="Jak vám máme říkat?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={15}
                className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-center text-md text-slate-100 font-bold placeholder:text-slate-700 focus:outline-none focus:border-primary/30 transition-colors"
              />
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-2 text-center">
                Kód Pozvánky (pokud máš)
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="KÓD POZVÁNKY"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full bg-primary/5 border-2 border-primary/20 rounded-xl px-4 py-3 text-center text-xs text-primary font-mono placeholder:text-primary/20 focus:outline-none focus:border-primary/50 transition-colors"
                />
                {referralCode && (
                  <Star size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-pulse" />
                )}
              </div>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full bg-white text-background-dark font-black py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="size-5" alt="Google" />
              <span className="uppercase tracking-tight">Přihlásit přes Google</span>
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <ShieldCheck size={12} />
              <span>Bezpečné přihlášení a online záloha</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
