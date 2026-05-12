import { motion } from 'framer-motion';
import { LayoutGrid, BookOpen, Map as MapIcon, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, triggerHaptic } from '../../utils';
import { useGameSound } from '../../data/sounds';

export const NavBar = ({ active, onTabChange }: { active: string; onTabChange: (id: string) => void }) => {
  const { t } = useTranslation();
  const { playClick } = useGameSound();
  const navItems = [
    { id: 'home', label: t('tabs.home'), icon: LayoutGrid },
    { id: 'vault', label: t('tabs.bestiary'), icon: BookOpen },
    { id: 'inventory', label: t('tabs.inventory'), icon: Package },
    { id: 'world', label: t('tabs.world'), icon: MapIcon },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800/50 bg-background-dark/95 backdrop-blur-xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto px-4">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => {
              playClick();
              triggerHaptic('light');
              onTabChange(item.id);
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all relative px-2",
              active === item.id ? "text-primary" : "text-slate-500"
            )}
          >
            {active === item.id && (
              <motion.div 
                layoutId="nav-active"
                className="absolute -top-3 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_#0db9f2]"
              />
            )}
            <item.icon size={22} strokeWidth={active === item.id ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
