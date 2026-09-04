import React, { useState } from 'react';
import { Shield, Zap, Package, UserPlus, Heart, RefreshCw, X, Gift, Database, Star, FlaskConical, Bell, ShoppingBag, Sword, Activity, Sparkles, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface DebugBarProps {
  onClose: () => void;
  onCheat: (cheatId: string) => void;
}

export const DebugBar = ({ onClose, onCheat }: DebugBarProps) => {
  const [selectedCheat, setSelectedCheat] = useState('');

  const cheats = [
    { id: 'spawn:epic', label: '🟣 Spawn Epické (MAP)', icon: UserPlus, color: 'text-purple-400 font-bold' },
    { id: 'spawn:legendary', label: '👑 Spawn Legendární (MAP)', icon: UserPlus, color: 'text-amber-400 font-bold' },
    { id: 'spawn:rare', label: '🔵 Spawn Vzácné (MAP)', icon: UserPlus, color: 'text-blue-400' },
    { id: 'spawn:common', label: '⚪ Spawn Běžné (MAP)', icon: UserPlus, color: 'text-slate-400' },
    { id: 'addEpic', label: '🎁 Získat Epické (Přímo)', icon: Gift, color: 'text-purple-400 font-bold' },
    { id: 'addLegendary', label: '🎁 Získat Legendární (Přímo)', icon: Gift, color: 'text-amber-500 font-bold' },
    { id: 'importBisiAshLord', label: '🔥 IMPORT: Démonický Pán Popela (od Biši, Lv 19, 157k CP)', icon: Flame, color: 'text-orange-400 font-black animate-pulse' },
    { id: 'addTrollUrine', label: '🧪 5x Trolí moč (Surovina)', icon: FlaskConical, color: 'text-yellow-400 font-bold' },
    { id: 'addCyclopsEye', label: '👁️ 2x Kyklopovo oko (Odhalení monster)', icon: Sparkles, color: 'text-sky-400 font-bold' },
    { id: 'addMasterHunterElixir', label: '🎯 2x Nektar Mistrovského Lovu (+25% chyt & 2x loot)', icon: Gift, color: 'text-amber-400 font-bold' },
    { id: 'addTitanBerserkPotion', label: '⚔️ 2x Sérum Titánského Hněvu (+35% DMG)', icon: Sword, color: 'text-rose-400 font-bold' },
    { id: 'addSecretBackpackItems', label: '🎒 TAJNÉ PŘEDMĚTY: 1x Bezedný váček + 1x Astrální truhla (Rozšíření batohu)', icon: Gift, color: 'text-amber-400 font-black animate-pulse' },
    { id: 'addSecretPouch', label: '🎒 1x Mystický bezedný váček (+4 sloty -> 20)', icon: Package, color: 'text-amber-400 font-bold' },
    { id: 'addSecretVault', label: '✨ 1x Astrální truhla dimenzí (MAX -> 24)', icon: Sparkles, color: 'text-purple-400 font-bold' },
    { id: 'healMe', label: 'Uzdravit vše (Heal All)', icon: Heart, color: 'text-rose-400' },
    { id: 'addLichSet', label: '👑 LICH BOSS SET: 4x Legendární Relikvie (+950 HP, +170 DEF, +115 ATK)', icon: Gift, color: 'text-amber-400 font-black' },
    { id: 'addMegaHPMutagens', label: '🧪 5x Mutagen Duší (+450 HP pro příšeru)', icon: Heart, color: 'text-rose-400 font-bold' },
    { id: 'addXPSerums', label: '🧬 5x XP Sérum (+700 XP pro příšeru)', icon: Zap, color: 'text-purple-400 font-bold' },
    { id: 'addHPMutagens', label: '🧪 5x HP Mutagen (+15 HP pro příšeru)', icon: Heart, color: 'text-rose-400' },
    { id: 'addTankMutations', label: '🛡️ TANK PACK: 5x HP + 5x DEF Mutagen', icon: Shield, color: 'text-emerald-400 font-bold' },
    { id: 'simulateRaid', label: '⏱️ SIMULACE DUNGEONU (Raid Benchmark)', icon: Activity, color: 'text-amber-400 font-bold' },
    { id: 'addDefMutagens', label: '🛡️ 5x Obranný Mutagen (+10 DEF)', icon: Shield, color: 'text-blue-400' },
    { id: 'addGems', label: 'Balíček surovin (Resources)', icon: Package, color: 'text-amber-400' },
    { id: 'giveXP', label: 'Přidat XP Monstru', icon: Zap, color: 'text-indigo-400' },
    { id: 'addPotions', label: 'Lektvary (HP/Mana)', icon: FlaskConical, color: 'text-emerald-400' },
    { id: 'spawnNearMe', label: 'Spawn Příšera + Bylina (MAP)', icon: UserPlus, color: 'text-purple-400 font-bold animate-pulse' },
    { id: 'add50RandomMonsters', label: '🎲 Získat 50 NÁHODNÝCH Příšer', icon: Star, color: 'text-amber-400 font-black animate-pulse' },
    { id: 'addMonster:075', label: 'Pyro Hedgehog #075', icon: Star, color: 'text-purple-400' },
    { id: 'addMonster:103', label: 'Bouřný Rys #103 (Reflect)', icon: Star, color: 'text-amber-400 font-bold' },
    { id: 'addMonster:114', label: 'Luminis #114', icon: Star, color: 'text-amber-400' },

    { id: 'playerXP200', label: 'Hráč XP +200', icon: Zap, color: 'text-cyan-400' },
    { id: 'triggerLevelUp', label: 'Level Up Hráč', icon: Database, color: 'text-blue-400' },
    { id: 'resetLevel', label: 'Resetovat na Level 1', icon: RefreshCw, color: 'text-rose-400 font-bold' },

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
            onClick={() => onCheat('spawn:epic')}
            className="px-2 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 border border-purple-500/40 rounded-lg hover:from-purple-600 hover:to-indigo-500 transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-white shadow-sm shrink-0"
            title="Okamžitě spawne Epické monstrum vedle tebe na mapě"
          >
            <UserPlus size={12} className="text-purple-200" />
            Epic
          </button>

          <button 
            onClick={() => onCheat('openDungeonSim')}
            className="px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-500 border border-red-500/30 rounded-lg hover:from-red-500 hover:to-rose-400 transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"
            title="Dungeon"
          >
            <Sword size={12} className="text-white" />
            Dungeon
          </button>

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
