import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Bell, Volume2, Shield, Trash2, Save, RefreshCw, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn, getPlayerRank } from '../../utils';
import { useSoundSystem } from '../../context/SoundContext';

const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Runner' },
  { id: 'bottts', name: 'Robot' },
  { id: 'pixel-art', name: 'Pixel' },
  { id: 'lorelei', name: 'Lorelei' },
];

const Toggle = ({ label, active, onToggle, icon }: { label: string, active: boolean, onToggle: () => void, icon?: any }) => (
  <button 
    onClick={onToggle}
    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
  >
    <div className="flex items-center gap-3">
      {icon && <div className="text-primary/60">{icon}</div>}
      <span className="text-sm font-bold text-slate-300">{label}</span>
    </div>
    <div className={cn(
      "w-10 h-6 rounded-full p-1 transition-colors duration-300",
      active ? "bg-primary" : "bg-slate-700"
    )}>
      <motion.div 
        animate={{ x: active ? 16 : 0 }}
        className="size-4 bg-slate-950 rounded-full shadow-lg"
      />
    </div>
  </button>
);

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onUpdateName: (name: string) => void;
  onResetProgress: () => void;
  avatarStyle: string;
  avatarSeed: string;
  onUpdateAvatar: (style: string, seed: string) => void;
  googleEmail?: string | null;
  playerEmail?: string | null;
  isGoogleLinked: boolean;
  onLogout: () => void;
  onLogin: () => void;
  caughtCount: number;
  totalMonsters: number;
  onUpdateEmail?: (email: string) => void;
  lastSync: number | null;
  isBatterySaver: boolean;
  onToggleBatterySaver: () => void;
  isDebugMode?: boolean;
  onToggleDebug?: () => void;
}

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  playerName, 
  onUpdateName,
  onResetProgress,
  avatarStyle,
  avatarSeed,
  onUpdateAvatar,
  googleEmail,
  playerEmail,
  isGoogleLinked,
  onLogout,
  onLogin,
  caughtCount,
  totalMonsters,
  onUpdateEmail,
  lastSync,
  isBatterySaver,
  onToggleBatterySaver,
  isDebugMode,
  onToggleDebug
}: SettingsModalProps) => {
  const { isMuted, setIsMuted } = useSoundSystem();
  const [tempName, setTempName] = useState(playerName);
  const [tempEmail, setTempEmail] = useState(playerEmail || '');
  const [notifications, setNotifications] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  
  // Debug toggle logic
  const [debugClicks, setDebugClicks] = useState(0);
  const [lastDebugClick, setLastDebugClick] = useState(0);

  const handleAvatarClick = () => {
    const now = Date.now();
    if (now - lastDebugClick < 500) {
      const newCount = debugClicks + 1;
      setDebugClicks(newCount);
      if (newCount >= 6) {
        onToggleDebug?.();
        setDebugClicks(0);
      }
    } else {
      setDebugClicks(1);
    }
    setLastDebugClick(now);
  };

  useEffect(() => {
    if (isOpen) {
      setTempName(playerName);
      setTempEmail(playerEmail || '');
      setShowConfirmReset(false);
    }
  }, [isOpen, playerName, playerEmail]);

  const handleSave = () => {
    if (tempName.trim()) {
      onUpdateName(tempName.trim());
      if (onUpdateEmail && tempEmail.trim() && tempEmail !== playerEmail) {
        onUpdateEmail(tempEmail.trim());
      }
      onClose();
    }
  };

  const randomizeAvatar = () => {
    const newSeed = Math.random().toString(36).substring(7);
    onUpdateAvatar(avatarStyle, newSeed);
  };

  const confirmReset = () => {
    setShowConfirmReset(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden relative z-10 shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-wider">
                {showConfirmReset ? 'Smazat vše' : 'Nastavení'}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh] relative min-h-[350px]">
              <AnimatePresence mode="wait">
                {showConfirmReset ? (
                  <motion.div
                    key="confirm-reset"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 text-center py-4"
                  >
                    <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                       <Trash2 size={40} className="animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase mb-2 text-center">Cesta do pekla?</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-tight leading-relaxed text-center">
                        Opravdu chceš smazat veškerý svůj postup? <br/>
                        Tato akce je nevratná! <br/>
                        Navždy přijdeš o všechny své příšery a úroveň.
                      </p>
                    </div>

                    <div className="space-y-3 pt-4">
                       <button
                         onClick={() => {
                           onResetProgress();
                           onClose();
                         }}
                         className="w-full py-4 bg-red-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-lg shadow-red-900/40 hover:brightness-110 active:scale-95 transition-all"
                       >
                         ANO, CHCI ZAČÍT ZNOVU
                       </button>
                       <button
                         onClick={() => setShowConfirmReset(false)}
                         className="w-full py-4 bg-slate-800 text-slate-400 font-black rounded-2xl uppercase text-[11px] tracking-widest hover:bg-slate-700 transition-all active:scale-95"
                       >
                         NENE, ZPĚT DO HRY
                       </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="settings-main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    {/* Profil & Avatar */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-2 text-primary">
                        <User size={16} className="fill-current opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Profil Runnera</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                          <div className="size-24 rounded-full border-4 border-primary/30 p-1 bg-slate-800 overflow-hidden ring-4 ring-primary/10 shadow-[0_0_20px_rgba(13,185,242,0.2)] active:scale-95 transition-transform">
                            <img 
                              src={`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${avatarSeed}`} 
                              alt="Avatar" 
                              className="w-full h-full rounded-full"
                            />
                          </div>
                          <button 
                            onClick={randomizeAvatar}
                            className="absolute bottom-0 right-0 size-8 bg-primary text-slate-950 rounded-full flex items-center justify-center shadow-lg active:rotate-180 transition-transform duration-300"
                          >
                            <RefreshCw size={14} strokeWidth={3} />
                          </button>
                        </div>

                        <div className="text-center -mt-2">
                           <p className="text-primary text-[11px] font-black uppercase tracking-[0.2em] italic mb-1 drop-shadow-[0_0_8px_rgba(13,185,242,0.5)]">
                             {getPlayerRank(caughtCount)}
                           </p>
                           <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest opacity-60">
                             Sbírka: {caughtCount} / {totalMonsters} monster
                           </p>
                        </div>

                        <div className="flex gap-2 w-full px-2">
                          {AVATAR_STYLES.map(style => (
                            <button
                              key={style.id}
                              onClick={() => onUpdateAvatar(style.id, avatarSeed)}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                                avatarStyle === style.id 
                                  ? "bg-primary text-slate-950 shadow-[0_0_10px_rgba(13,185,242,0.3)]" 
                                  : "bg-white/5 text-slate-500 hover:bg-white/10"
                              )}
                            >
                              {style.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest text-[9px]">Přezdívka lovce</label>
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          placeholder="Zadej své jméno..."
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-primary/50 transition-colors font-bold"
                        />
                      </div>
                    </section>

                    {/* Preference */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Bell size={16} className="fill-current opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Nastavení Herního UI</span>
                      </div>
                      
                      <div className="space-y-3">
                        <Toggle 
                          label="Šetřič baterie (Méně přesná GPS)" 
                          active={isBatterySaver} 
                          onToggle={onToggleBatterySaver} 
                          icon={<Shield size={14} className="text-primary" />}
                        />
                        <Toggle 
                          label="Push notifikace" 
                          active={notifications} 
                          onToggle={() => setNotifications(!notifications)} 
                        />
                        <Toggle 
                          label="Zvukové efekty" 
                          icon={<Volume2 size={14} />}
                          active={!isMuted} 
                          onToggle={() => setIsMuted(!isMuted)} 
                        />
                        <Toggle 
                          label="Haptická odezva" 
                          active={vibration} 
                          onToggle={() => setVibration(!vibration)} 
                        />
                      </div>
                    </section>

                    {/* Zabezpečení */}
                    <section className="space-y-4 pt-4">
                      <div className="flex items-center gap-2 text-red-500">
                        <Shield size={16} className="fill-current opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Správa účtu</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="mb-2">
                          <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest text-[9px] mb-1 block">
                            {googleEmail ? 'Zálohovaný Google Email' : 'Můj Lovecký Email'}
                          </label>
                          {googleEmail ? (
                             <div className="w-full bg-slate-950/50 border border-emerald-500/10 rounded-2xl px-4 py-3 text-emerald-500/80 font-medium flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                               <div className="flex items-center gap-3 truncate">
                                  <Mail size={16} className="text-emerald-500/40 shrink-0" />
                                  <span className="truncate text-xs font-bold">{googleEmail}</span>
                               </div>
                               <div className="px-2 py-0.5 bg-emerald-500/10 rounded text-[7px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">Synced</div>
                             </div>
                          ) : (
                             <div className="relative">
                               <input
                                 type="email"
                                 value={tempEmail}
                                 onChange={(e) => setTempEmail(e.target.value)}
                                 placeholder="Zadej svůj email..."
                                 className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 pl-11 text-slate-100 focus:outline-none focus:border-primary/50 transition-colors font-bold text-xs"
                               />
                               <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                             </div>
                          )}
                        </div>

                         {isGoogleLinked && lastSync && (
                            <div className="flex items-center justify-between px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl mb-3">
                               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Poslední Cloud Záloha</span>
                               <span className="text-[10px] text-emerald-500/80 font-black">{new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                         )}

                         {isGoogleLinked ? (
                            <button
                              onClick={onLogout}
                              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center text-slate-100 group-hover:scale-110 transition-transform">
                                  <User size={18} />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold text-slate-100">Odhlásit se</p>
                                  <p className="text-[10px] text-slate-500 font-medium tracking-tight">Vypne synchronizaci s tímto účtem</p>
                                </div>
                              </div>
                            </button>
                          ) : (
                            <button
                              onClick={onLogin}
                              className="w-full py-4 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/10 active:scale-95 group"
                            >
                              <svg className="size-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                              </svg>
                              <span className="font-black uppercase text-[10px] tracking-[0.1em]">Propojit s Google účtem</span>
                            </button>
                         )}

                         <button
                          onClick={confirmReset}
                          className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                               <Trash2 size={18} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-red-100">Resetovat postup</p>
                              <p className="text-[10px] text-red-500/60 font-medium whitespace-nowrap">Smaže tvůj herní profil z tohoto zařízení</p>
                            </div>
                          </div>
                        </button>

                      </div>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-800/30 border-t border-white/5 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-white/5 transition-all uppercase text-xs tracking-widest"
              >
                Zrušit
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] py-4 bg-primary text-slate-950 rounded-2xl font-black flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
              >
                <Save size={16} />
                Uložit nastavení
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
