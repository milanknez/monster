import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, ArrowLeftRight } from 'lucide-react';
import { cn, getLoc } from '../../utils';
import type { Monster } from '../../types';
import { RESOURCE_CONFIG } from '../../data/resources';

export const TradeSelectionModal = ({ 
  caughtMonsters, 
  onSelect, 
  onClose,
  offeringMonster 
}: { 
  caughtMonsters: Monster[], 
  onSelect: (m: Monster) => void, 
  onClose: () => void,
  offeringMonster?: { id: string, name: any, level: number }
}) => {
  const { t, i18n } = useTranslation();
  return (
    <div className="fixed inset-0 z-[2100] flex flex-col bg-background-dark">
      <div className="p-6 border-b border-primary/20 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-100 uppercase tracking-tighter">{t('trade.select_trade')}</h3>
          {offeringMonster && (
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
              {t('trade.for')} {getLoc(offeringMonster.name, i18n.language)} LVL {offeringMonster.level}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-2 bg-slate-800 rounded-xl text-slate-400">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {caughtMonsters.length > 0 ? (
          caughtMonsters.map((monster, idx) => (
            <motion.div
              key={`${monster.id}-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelect(monster)}
              className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="size-14 bg-black/40 rounded-xl p-2 border border-white/5 relative">
                  <img src={monster.image} className="w-full h-full object-contain" alt={getLoc(monster.name, i18n.language)} />
                  
                  {/* Jewel Sockets */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex flex-row gap-[1px] bg-slate-900/60 p-[3px] px-1 rounded-full backdrop-blur-sm border border-white/5 shadow-lg">
                    {[0, 1, 2].map((i) => {
                      const gemId = monster.gems?.[i];
                      const gemConfig = gemId ? RESOURCE_CONFIG[gemId] : null;

                      return (
                        <div
                          key={i}
                          className={cn(
                            "size-[0.25rem] rotate-45 border transition-all duration-500",
                            gemId
                              ? "shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                              : "bg-slate-900 border-white/10"
                          )}
                          style={{
                            backgroundColor: gemConfig?.color || (gemId ? '#fff' : 'transparent'),
                            borderColor: gemId ? 'rgba(255,255,255,0.6)' : undefined
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-black text-slate-100 uppercase tracking-tight">{getLoc(monster.name, i18n.language)}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LVL {monster.level} • {getLoc(monster.type, i18n.language)}</p>
                </div>
              </div>
              <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <ArrowLeftRight size={18} />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <p className="text-slate-500 font-bold uppercase tracking-widest">{t('trade.no_monsters')}</p>
          </div>
        )}
      </div>
      
      <div className="p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5">
        <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-[0.2em] leading-relaxed">
          {t('trade.trade_desc')}
        </p>
      </div>
    </div>
  )
}
