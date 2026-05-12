import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils';
import type { Monster } from '../../types';
import { monsterDB } from '../../data/monsters';

export const RecentActivity = ({ caughtMonsters, onSelect, onSeeAll }: { caughtMonsters: Monster[], onSelect: (m: Monster) => void, onSeeAll: () => void }) => {
  const { t } = useTranslation();
  // If no caught monsters, show some "placeholder" tiles to satisfy "historie a dlaždice"
  const displayList = caughtMonsters.length > 0 
    ? caughtMonsters.slice(0, 4) 
    : monsterDB.slice(0, 3).map(m => ({ ...m, image: `/monsters/${m.id}.png`, placeholder: true }));

  return (
    <section className="px-4 py-4">
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('dashboard.recent_activity')}</h3>
        <button 
          onClick={onSeeAll}
          className="text-[10px] font-bold text-primary hover:underline uppercase"
        >
          {t('dashboard.all_archive')}
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {displayList.map((m, idx) => (
          <motion.div 
            key={m.id + idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => !('placeholder' in m) && onSelect(m as Monster)}
            className={cn(
              "shrink-0 size-24 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer",
              'placeholder' in m && "opacity-40 grayscale cursor-default"
            )}
          >
            <img src={m.image} alt="Monster" className="size-full object-contain relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] pointer-events-none" />
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="absolute bottom-1 right-1 size-1.5 rounded-full bg-primary/30 pointer-events-none" />
          </motion.div>
        ))}
        {caughtMonsters.length === 0 && (
          <div className="shrink-0 size-24 bg-slate-900/20 border border-slate-800/50 border-dashed rounded-2xl flex flex-col items-center justify-center p-3 opacity-30">
            <Sparkles size={16} className="text-slate-500 mb-1" />
            <span className="text-[8px] font-bold uppercase text-slate-500">{t('dashboard.waiting_scan')}</span>
          </div>
        )}
      </div>
    </section>
  )
}
