import { ArrowLeft, Zap, Settings, MapPin, Beaker } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, getPlayerRank } from '../../utils';

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  playerName?: string
  avatarStyle?: string
  avatarSeed?: string
  onSettingsClick?: () => void
  onLocationClick?: () => void
  onAvatarClick?: () => void
  onCodexClick?: () => void
  caughtCount?: number
}

export const Header = ({ 
  title = "Aether_Runner", 
  showBack = false, 
  onBack, 
  playerName = "Runner",
  avatarStyle = "avataaars",
  avatarSeed = "seed",
  onSettingsClick,
  onLocationClick,
  onAvatarClick,
  onCodexClick,
  caughtCount = 0
}: HeaderProps) => {
  const { t } = useTranslation();
  return (
    <header className="flex items-center justify-between p-4 border-b border-primary/20 bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3 flex-1">
        {showBack ? (
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft size={24} className="text-slate-100" />
          </button>
        ) : (
          <button 
            onClick={onAvatarClick}
            className="size-11 rounded-full border-2 border-primary overflow-hidden bg-slate-800 p-0.5 active:scale-95 transition-transform"
          >
            <div 
              className="w-full h-full rounded-full bg-cover bg-center" 
              style={{ backgroundImage: `url('https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}')` }} 
            />
          </button>
        )}
        <div className="flex flex-col flex-1">
          <h1 className={cn("font-black tracking-wider text-slate-100 uppercase", showBack ? "text-lg" : "text-sm text-primary")}>
            {title}
          </h1>
          {!showBack && (
            <div className="flex items-center gap-1">
              <Zap size={12} className="text-primary fill-primary" />
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase italic">
                {getPlayerRank(caughtCount)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {onCodexClick && (
          <button 
            onClick={onCodexClick}
            className="px-3 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-all border border-secondary/20 active:scale-95 flex items-center gap-2"
          >
            <Beaker size={18} className="text-secondary" />
            <span className="text-[10px] font-black text-secondary uppercase tracking-widest">{t('tabs.laboratory')}</span>
          </button>
        )}
        {onLocationClick && (
          <button 
            onClick={onLocationClick}
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all border border-primary/20 active:scale-90"
          >
            <MapPin size={20} className="text-primary" />
          </button>
        )}
        {!showBack && (
          <button 
            onClick={onSettingsClick}
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all border border-primary/20 active:scale-90"
          >
            <Settings size={20} className="text-primary" />
          </button>
        )}
      </div>
    </header>
  );
}
