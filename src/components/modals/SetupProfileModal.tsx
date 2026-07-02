import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, Mail, ShieldCheck, Star, Globe, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { signInWithGoogle } from '../../lib/firebase';
import { cn } from '../../utils';

interface SetupProfileModalProps {
  onComplete: (name: string, email?: string, referralCode?: string, overrideUid?: string) => void;
  isLoggingIn?: boolean;
  initialReferral?: string;
}

export const SetupProfileModal = ({ onComplete, isLoggingIn = false, initialReferral }: SetupProfileModalProps) => {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    // Priority: Prop > LocalStorage
    const pendingRef = initialReferral || localStorage.getItem('pending_referral');
    if (pendingRef && !referralCode) {
      setReferralCode(pendingRef);
    }
  }, [initialReferral]);

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        // If user already has a display name, we use it
        const finalName = name.trim() || user.displayName || t('setup.name_placeholder');
        // Pass the UID explicitly to avoid race conditions with App's userUid state
        onComplete(finalName, user.email || undefined, referralCode.trim() || undefined, user.uid);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json && json.uid) {
          localStorage.setItem('monster_collector_uid', json.uid);
          localStorage.setItem('monster_collector_player_name', json.playerName || 'Lovec');
          if (json.avatarStyle) localStorage.setItem('monster_collector_avatar_style', json.avatarStyle);
          if (json.avatarSeed) localStorage.setItem('monster_collector_avatar_seed', json.avatarSeed);
          if (json.totalXP !== undefined) localStorage.setItem('monster_collector_xp', String(json.totalXP));
          if (json.caughtMonsters) localStorage.setItem('monster_collector_caught', JSON.stringify(json.caughtMonsters));
          if (json.inventory) {
            localStorage.setItem('monster_collector_inventory', JSON.stringify(json.inventory));
            localStorage.setItem('monster_collector_inventory_v2', JSON.stringify(json.inventory));
          }
          
          alert('Herní postup byl úspěšně obnoven ze souboru! Hra se nyní restartuje.');
          window.location.reload();
        } else {
          alert('Chyba: Neplatný soubor zálohy.');
        }
      } catch (err) {
        console.error(err);
        alert('Chyba při čtení souboru zálohy.');
      }
    };
    reader.readAsText(file);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
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
          {/* Language Switcher */}
          <div className="flex justify-center gap-2 mb-6">
            <button 
              onClick={() => changeLanguage('cs')} 
              className={cn(
                "px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all flex items-center gap-1.5",
                (i18n.language.startsWith('cz') || i18n.language.startsWith('cs')) ? "bg-primary text-slate-950 border-primary" : "bg-white/5 text-slate-500 border-white/10"
              )}
            >
              <span>🇨🇿</span> CZ
            </button>
            <button 
              onClick={() => changeLanguage('sk')} 
              className={cn(
                "px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all flex items-center gap-1.5",
                i18n.language.startsWith('sk') ? "bg-primary text-slate-950 border-primary" : "bg-white/5 text-slate-500 border-white/10"
              )}
            >
              <span>🇸🇰</span> SK
            </button>
            <button 
              onClick={() => changeLanguage('en')} 
              className={cn(
                "px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all flex items-center gap-1.5",
                i18n.language.startsWith('en') ? "bg-primary text-slate-950 border-primary" : "bg-white/5 text-slate-500 border-white/10"
              )}
            >
              <span>🇺🇸</span> EN
            </button>
          </div>

          <div className="size-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mb-8 border border-primary/20 mx-auto shadow-[0_0_30px_rgba(13,185,242,0.1)]">
            <div className="size-14 bg-gradient-to-br from-primary/20 to-blue-600/20 rounded-2xl flex items-center justify-center border border-primary/30 rotate-3">
              <Zap size={32} className="text-primary animate-pulse -rotate-3" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-white uppercase tracking-tighter text-center mb-2 italic">
            {t('setup.welcome')}
          </h2>
          <p className="text-[10px] text-slate-500 font-bold text-center mb-10 px-4 uppercase tracking-[0.2em] leading-relaxed opacity-80">
            {t('setup.subtitle')}
          </p>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] block text-center">
                  {t('setup.name_label')}
                </label>
                <input
                  type="text"
                  placeholder={t('setup.name_placeholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={15}
                  className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-4 py-4 text-center text-md text-white font-black placeholder:text-slate-800 focus:outline-none focus:border-primary/40 transition-all shadow-inner italic tracking-tight"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] block text-center">
                  {t('setup.email_label')}
                </label>
                <input
                  type="email"
                  placeholder={t('setup.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-4 py-4 text-center text-xs text-slate-300 font-bold placeholder:text-slate-800 focus:outline-none focus:border-primary/40 transition-all shadow-inner tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] block text-center">
                  {t('setup.referral_label')}
                </label>
                <input
                  type="text"
                  placeholder={t('setup.referral_placeholder')}
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 rounded-2xl px-4 py-4 text-center text-[10px] text-primary font-black placeholder:text-slate-800 focus:outline-none focus:border-primary/20 transition-all shadow-inner tracking-[0.3em]"
                />
              </div>
            </div>

            <button
              onClick={() => name.trim().length >= 3 && email.includes('@') && onComplete(name.trim(), email.trim(), referralCode.trim(), undefined)}
              disabled={isLoggingIn || name.trim().length < 3 || !email.includes('@')}
              className="w-full relative group transition-all disabled:opacity-20 translate-y-[-4px]"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative flex items-center justify-center py-5 bg-primary text-slate-950 font-black rounded-2xl leading-none transition duration-300 group-hover:scale-[1.02] active:scale-95 shadow-2xl">
                <span className="uppercase tracking-[0.2em] text-sm italic">{t('setup.start_button')}</span>
              </div>
            </button>

            <div className="pt-4 space-y-4">
               <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5" />
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">{t('setup.google_sub')}</span>
                    <span className="text-[7px] font-bold text-emerald-500/60 uppercase tracking-widest mt-0.5 animate-pulse">{t('setup.cloud_sync')}</span>
                  </div>
                  <div className="h-px flex-1 bg-white/5" />
               </div>

               <div className="flex justify-center items-center gap-4">
                 <button
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="size-14 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 group disabled:opacity-20"
                    title={t('setup.cloud_sync')}
                 >
                    <svg className="size-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                 </button>

                 <label
                    className="size-14 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 group cursor-pointer"
                    title="Obnovit ze souboru zálohy (.json)"
                 >
                    <FolderOpen size={24} className="text-white group-hover:scale-110 transition-transform" />
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileRestore}
                      className="hidden"
                    />
                 </label>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
