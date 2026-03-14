import { ArrowLeft, Zap, Settings, QrCode } from 'lucide-react';
import { cn } from '../utils';

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  playerName?: string
  avatarStyle?: string
  avatarSeed?: string
  onQrClick?: () => void
  onSettingsClick?: () => void
}

export const Header = ({ 
  title = "Aether_Runner", 
  showBack = false, 
  onBack, 
  playerName = "Runner",
  avatarStyle = "avataaars",
  avatarSeed = "seed",
  onQrClick,
  onSettingsClick
}: HeaderProps) => (
  <header className="flex items-center justify-between p-4 border-b border-primary/20 bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
    <div className="flex items-center gap-3 flex-1">
      {showBack ? (
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft size={24} className="text-slate-100" />
        </button>
      ) : (
        <div className="size-11 rounded-full border-2 border-primary overflow-hidden bg-slate-800 p-0.5">
          <div 
            className="w-full h-full rounded-full bg-cover bg-center" 
            style={{ backgroundImage: `url('https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}')` }} 
          />
        </div>
      )}
      <div className="flex flex-col flex-1">
        <h1 className={cn("font-black tracking-wider text-slate-100 uppercase", showBack ? "text-lg" : "text-sm text-primary")}>
          {title}
        </h1>
        {!showBack && (
          <div className="flex items-center gap-1">
            <Zap size={12} className="text-primary fill-primary" />
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Elitní Průzkumník</span>
          </div>
        )}
      </div>
    </div>
    <div className="flex gap-2">
      {onQrClick && (
        <button 
          onClick={onQrClick}
          className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all border border-primary/20 active:scale-90"
        >
          <QrCode size={20} className="text-primary" />
        </button>
      )}
      {!showBack && (
        <button 
          onClick={onSettingsClick}
          className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all border border-primary/20 active:scale-90"
        >
          <Settings size={20} className="text-primary" />
        </button>
      )}
    </div>
  </header>
)