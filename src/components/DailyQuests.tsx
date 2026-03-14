import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map as MapIcon, Target, Trophy, CheckCircle2, Timer } from 'lucide-react';
import { cn } from '../utils';

import { Monster } from '../types';

export const DailyQuests = ({ caughtMonsters, dailyDistance }: { caughtMonsters: Monster[], dailyDistance: number }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const diff = endOfDay.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      return `${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTimestamp = todayStart.getTime();

  const monstersToday = caughtMonsters.filter(m => m.caughtAt && m.caughtAt >= todayTimestamp);
  const rareCount = monstersToday.filter(m => ['Vzácná', 'Epická', 'Legendární'].includes(m.rarity)).length;

  const quests = [
    {
      id: 1,
      title: 'Efektivní lovec',
      desc: 'Chyť 5 příšerek',
      progress: Math.min(monstersToday.length, 5),
      total: 5,
      icon: Target,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      completed: monstersToday.length >= 5
    },
    {
      id: 2,
      title: 'Lovec rarit',
      desc: 'Chyť 3 vzácné příšerky',
      progress: Math.min(rareCount, 3),
      total: 3,
      icon: Trophy,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      completed: rareCount >= 3
    },
    {
      id: 3,
      title: 'Průzkum města',
      desc: 'Ujdi dnes 2.0 km',
      progress: Math.min(Number((dailyDistance / 1000).toFixed(1)), 2.0),
      total: 2.0,
      icon: MapIcon,
      color: 'text-primary',
      bg: 'bg-primary/10',
      completed: (dailyDistance / 1000) >= 2.0
    },
  ]

  return (
    <section className="p-4 mb-32">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Denní protokoly</h3>
        <div className="flex items-center gap-1 text-[10px] text-primary font-black uppercase">
          <Timer size={12} />
          <span>RESETOVÁNÍ ZA {timeLeft}</span>
        </div>
      </div>
      <div className="space-y-3">
        {quests.map((quest, idx) => (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
            className={cn(
              "flex items-center p-4 bg-slate-900/40 border border-slate-800 rounded-2xl transition-all hover:bg-slate-900/60",
              quest.completed && "border-green-500/30 bg-green-500/5"
            )}
          >
            <div className={cn("p-2.5 rounded-xl mr-4", quest.bg)}>
              <quest.icon size={20} className={quest.color} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-100">{quest.title}</p>
              <p className="text-[11px] text-slate-500 font-medium">{quest.desc}</p>
            </div>
            <div className="text-right">
              {quest.completed ? (
                <CheckCircle2 size={24} className="text-green-500" />
              ) : (
                <>
                  <p className={cn("text-xs font-black", quest.color)}>
                    {quest.id === 3 ? `${quest.progress.toFixed(1)}km` : `${quest.progress}/${quest.total}`}
                  </p>
                  <div className="w-16 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-500", quest.completed ? "bg-green-500" : quest.color.replace('text', 'bg'))}
                      style={{ width: `${(quest.progress / quest.total) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
