import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Bell, Volume2, Shield, Trash2, Save, RefreshCw, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../../utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onUpdateName: (name: string) => void;
  onResetProgress: () => void;
  avatarStyle: string;
  avatarSeed: string;
  onUpdateAvatar: (style: string, seed: string) => void;
  userEmail?: string | null;
  onLogout: () => void;
  onLogin: () => void;
}

const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Runner' },
  { id: 'bottts', name: 'Robot' },
  { id: 'pixel-art', name: 'Pixel' },
  { id: 'lorelei', name: 'Lorelei' },
];

import { useSoundSystem } from '../../context/SoundContext';

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  playerName, 
  onUpdateName,
  onResetProgress,
  avatarStyle,
  avatarSeed,
  onUpdateAvatar,
  userEmail,
  onLogout,
  onLogin
}: SettingsModalProps) => {
  const { isMuted, setIsMuted } = useSoundSystem();
  const [tempName, setTempName] = useState(playerName);
  const [notifications, setNotifications] = useState(true);
  const [vibration, setVibration] = useState(true);

  useEffect(() => {
    if (isOpen) setTempName(playerName);
  }, [isOpen, playerName]);

  const handleSave = () => {
    if (tempName.trim()) {
      onUpdateName(tempName.trim());
      onClose();
    }
  };

  const randomizeAvatar = () => {
    const newSeed = Math.random().toString(36).substring(7);
    onUpdateAvatar(avatarStyle, newSeed);
  };

  const confirmReset = () => {
    if (window.confirm('Opravdu chceš smazat veškerý postup? Tato akce je nevratná.')) {
      onResetProgress();
      onClose();
    }
  };

  const handleLogout = () => {
    if (window.confirm('Opravdu se chceš odhlásit?')) {
      onLogout();
      onClose();
    }
  };

  const handleLogin = async () => {
    console.log("SettingsModal: handleLogin clicked");
    await onLogin();
    onClose();
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
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-wider">Nastavení</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
              {/* Profil & Avatar */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <User size={16} className="fill-current opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Profil Runnera</span>
                </div>
                
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="size-24 rounded-full border-4 border-primary/30 p-1 bg-slate-800 overflow-hidden ring-4 ring-primary/10 shadow-[0_0_20px_rgba(13,185,242,0.2)]">
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

                <div className="space-y-4">
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
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest text-[9px] mb-1 block">Propojený Email</label>
                    <div className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-4 py-3 text-slate-400 font-medium flex items-center justify-between gap-3">
                       <div className="flex items-center gap-3 truncate">
                          <Mail size={16} className="text-slate-600 shrink-0" />
                          <span className="truncate text-xs">{userEmail || 'V režimu hosta'}</span>
                       </div>
                    </div>
                  </div>

                   {userEmail ? (
                     <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center text-slate-100 group-hover:scale-110 transition-transform">
                          <User size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-100">Odhlásit se</p>
                          <p className="text-[10px] text-slate-500 font-medium">Odpojí tvůj Google účet</p>
                        </div>
                      </div>
                    </button>
                   ) : (
                     <button
                        onClick={handleLogin}
                        className="w-full flex items-center justify-between p-4 bg-white text-slate-950 rounded-2xl transition-all group active:scale-95 shadow-lg shadow-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden">
                             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="size-5" alt="Google" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-black uppercase tracking-tight">Přihlásit přes Google</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Aktivuj zálohu a odměny</p>
                          </div>
                        </div>
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
