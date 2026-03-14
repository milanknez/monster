import { motion } from 'framer-motion';
import { LayoutGrid, BookOpen, Map as MapIcon, ShoppingBag } from 'lucide-react';
import { cn } from '../utils';

export const NavBar = ({ active, onTabChange }: { active: string; onTabChange: (id: string) => void }) => {
  const navItems = [
    { id: 'home', label: 'Domů', icon: LayoutGrid },
    { id: 'vault', label: 'Bestiář', icon: BookOpen },
    { id: 'world', label: 'Svět', icon: MapIcon },
    { id: 'store', label: 'Obchod', icon: ShoppingBag },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800/50 bg-background-dark/95 backdrop-blur-xl px-4 pb-8 pt-3 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto px-4">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onTabChange(item.id)}
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