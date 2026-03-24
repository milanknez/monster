import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Gift, ChevronRight } from 'lucide-react';
import { RESOURCE_CONFIG } from '../map/mapUtils';

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
}

export const LootModal = ({
  isOpen,
  loot,
  winXP,
  isChestOpened,
  onOpenChest,
  onCollect,
  onComplete
}: LootModalProps) => {
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
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">VÍTĚZSTVÍ!</h2>

            <div className="relative mb-8 flex justify-center min-h-[160px] w-full">
              {!isChestOpened ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onOpenChest}
                  className="cursor-pointer flex flex-col items-center relative"
                >
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative z-10">
                    <Gift size={110} className="text-primary drop-shadow-[0_0_15px_rgba(13,185,242,0.8)]" />
                  </div>
                  <p className="mt-4 text-[12px] font-black tracking-widest text-primary animate-pulse uppercase">Klikni k otevření</p>
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
                          onClick={() => onCollect(i.id)}
                          className="bg-slate-800 border-2 border-white/5 rounded-[1.5rem] p-5 cursor-pointer relative shadow-2xl flex flex-col items-center gap-2 group active:scale-95 transition-all"
                          style={{ boxShadow: `0 10px 30px -10px ${config.color}33` }}
                        >
                          <div className="size-12 flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-transform">
                            {config.hasCustomIcon ? (
                              <img src={`resources/${i.type}.png`} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-4xl drop-shadow-xl">{config.icon}</span>
                            )}
                          </div>
                          <span className="text-[9px] font-black text-white uppercase tracking-wider block opacity-70 text-center">{config.label}</span>

                          <span className="absolute -top-1 -right-1 bg-primary text-black text-[12px] font-black size-7 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                            {i.count}
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[1.5rem] pointer-events-none" />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {loot.every(l => l.collected) && (
                    <div className="col-span-2 flex justify-center mt-4">
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={onComplete}
                        className="py-2 px-6 text-xs bg-primary text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
                      >
                        Pokračovat <ChevronRight size={14} />
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
