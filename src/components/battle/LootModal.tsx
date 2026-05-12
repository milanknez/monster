import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Gift, ChevronRight } from 'lucide-react';
import { RESOURCE_CONFIG } from '../map/mapUtils';
import { useGameSound } from '../../data/sounds';
import { useTranslation } from 'react-i18next';
import { getLoc } from '../../utils';

import { ResourceIcon } from '../ui/ResourceIcon';

export interface LootItem {
  id: string;
  type: string;
  count: number;
  collected: boolean;
}

interface LootModalProps {
  isOpen: boolean;
  loot: LootItem[];
  winXP: number;
  isChestOpened: boolean;
  onOpenChest: () => void;
  onCollect: (id: string) => void;
  onComplete: () => void;
  isInventoryFull?: boolean;
}

export const LootModal = ({
  isOpen,
  loot,
  winXP,
  isChestOpened,
  onOpenChest,
  onCollect,
  onComplete,
  isInventoryFull
}: LootModalProps) => {
  const { t } = useTranslation();
  const { playVictory, playClick } = useGameSound();

  const handleOpenChest = () => {
    playVictory();
    onOpenChest();
  };

  const handleCollect = (id: string) => {
    playClick();
    onCollect(id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-3xl px-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-sm bg-slate-900 border-2 border-primary/30 rounded-[3rem] p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,1)]"
          >
            <Trophy size={60} className="text-primary mx-auto mb-6 drop-shadow-[0_0_25px_#0db9f2]" />
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">{t('battle.modal.victory_title')}</h2>

            {/* XP Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-5 py-2.5 rounded-full mb-8 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10"
            >
              <div className="size-6 bg-emerald-500 rounded-lg flex items-center justify-center text-black shadow-lg">
                <Trophy size={14} fill="currentColor" />
              </div>
              <span className="text-lg font-black text-emerald-400 tabular-nums tracking-tight">+{winXP} XP</span>
              <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">{t('battle.modal.xp_earned')}</span>
            </motion.div>

            <div className="relative mb-8 flex justify-center min-h-[160px] w-full">
              {!isChestOpened ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleOpenChest}
                  className="cursor-pointer flex flex-col items-center relative"
                >
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative z-10">
                    <Gift size={110} className="text-primary drop-shadow-[0_0_15px_rgba(13,185,242,0.8)]" />
                  </div>
                  <p className="mt-4 text-[12px] font-black tracking-widest text-primary animate-pulse uppercase">{t('battle.modal.click_to_open')}</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 gap-4 w-full">
                  <AnimatePresence>
                    {loot.map(i => {
                      if (i.collected) return null;
                      const config = RESOURCE_CONFIG[i.type] || { icon: '📦', color: '#fff', label: i.type };
                      return (
                        <motion.div
                          key={i.id}
                          initial={{ scale: 0, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          onClick={() => handleCollect(i.id)}
                          className="bg-slate-800 border-2 border-white/5 rounded-[1.5rem] p-5 cursor-pointer relative shadow-2xl flex flex-col items-center gap-2 group active:scale-95 transition-all"
                          style={{ boxShadow: `0 10px 30px -10px ${config.color}33` }}
                        >
                          <div className="size-12 flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform">
                            <ResourceIcon id={i.type} config={config as any} size="lg" className="filter drop-shadow-xl" />
                          </div>
                          <span className="text-[9px] font-black text-white uppercase tracking-wider block opacity-70 text-center">{getLoc(config.label)}</span>

                          <span className="absolute -top-1 -right-1 bg-primary text-black text-[12px] font-black size-7 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                            {i.count}
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[1.5rem] pointer-events-none" />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div className="col-span-2 flex flex-col items-center mt-4 pt-4 border-t border-white/5 relative z-10 w-full">
                    {isInventoryFull && (
                      <div className="mb-2 text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-full text-[9px] uppercase tracking-widest border border-red-500/20">
                        {t('battle.modal.inventory_full')}
                      </div>
                    )}
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={onComplete}
                      className="py-2.5 px-6 mt-1 text-xs bg-primary text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      {loot.every(l => l.collected) ? t('battle.modal.continue') : t('battle.modal.collect_all')} <ChevronRight size={18} />
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
