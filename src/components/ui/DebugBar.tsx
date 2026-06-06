import React, { useState } from 'react';
import { Shield, Zap, Package, UserPlus, Heart, RefreshCw, X, Gift, Database, Star, FlaskConical, Bell, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

interface DebugBarProps {
  onClose: () => void;
  onCheat: (cheatId: string) => void;
}

export const DebugBar = ({ onClose, onCheat }: DebugBarProps) => {
  const [selectedCheat, setSelectedCheat] = useState('');

  const cheats = [
    { id: 'healMe', label: 'Uzdravit vše (Heal All)', icon: Heart, color: 'text-rose-400' },
    { id: 'addGems', label: 'Balíček surovin (Resources)', icon: Package, color: 'text-amber-400' },
    { id: 'giveXP', label: 'Přidat XP Monstru', icon: Zap, color: 'text-indigo-400' },
    { id: 'addPotions', label: 'Lektvary (HP/Mana)', icon: FlaskConical, color: 'text-emerald-400' },
    { id: 'spawn:common', label: 'Spawn Běžné (MAP)', icon: UserPlus, color: 'text-slate-400' },
    { id: 'spawn:rare', label: 'Spawn Vzácné (MAP)', icon: UserPlus, color: 'text-blue-400' },
    { id: 'spawn:legendary', label: 'Spawn Legendární (MAP)', icon: UserPlus, color: 'text-amber-400' },
    { id: 'addLegendary', label: 'Získat Legendární (Přímo)', icon: Gift, color: 'text-amber-500 font-bold' },
    { id: 'addMonster:075', label: 'Pyro Hedgehog #075', icon: Star, color: 'text-purple-400' },
    { id: 'addMonster:114', label: 'Luminis #114', icon: Star, color: 'text-amber-400' },

    { id: 'playerXP200', label: 'Hráč XP +200', icon: Zap, color: 'text-cyan-400' },
    { id: 'triggerLevelUp', label: 'Level Up Hráč', icon: Database, color: 'text-blue-400' },

    { id: 'testNotification', label: 'Test Notifikace', icon: Bell, color: 'text-indigo-400' },
    { id: 'debugIAP', label: 'Stav Obchodu (IAP DR)', icon: ShoppingBag, color: 'text-yellow-400' },
    { id: 'openEditor', label: 'Spustit Systémový Editor', icon: Database, color: 'text-rose-400 font-bold' },
  ];

  const handleCheatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      onCheat(val);
      setSelectedCheat(''); 
    }
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-slate-900 border-b-2 border-primary/50 text-white z-[100] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(0,180,255,0.15),transparent)] pointer-events-none" />
      
      <div className="px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-primary animate-pulse" />
          <span className="text-[10px] font-black tracking-tighter uppercase italic text-primary/80">
            Admin Debug
          </span>
        </div>

        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <select 
              className="w-full bg-slate-800 border border-primary/30 rounded-lg px-3 py-1.5 text-[11px] font-bold outline-none focus:border-primary transition-colors appearance-none"
              value={selectedCheat}
              onChange={handleCheatChange}
            >
              <option value="" disabled>Vyber techniku...</option>
              {cheats.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <Zap size={10} className="text-primary/50" />
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="p-1.5 bg-slate-800 border border-primary/30 rounded-lg hover:bg-slate-700 transition-colors"
            title="Reload App"
          >
            <RefreshCw size={14} className="text-primary" />
          </button>
          
          <button 
            onClick={onClose}
            className="p-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-colors"
          >
            <X size={14} className="text-rose-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
