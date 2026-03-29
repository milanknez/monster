import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map as MapIcon, Target, Trophy, CheckCircle2, Timer, UserPlus, Sparkles } from 'lucide-react';
import { cn } from '../../utils';

import { Monster } from '../../types';
import { ReferralList, type ReferralEntry } from '../referrals/ReferralList';
import { useGameSound } from '../../data/sounds';

interface DailyQuestsProps {
  caughtMonsters: Monster[];
  dailyDistance: number;
  onClaimReward: (xp: number) => void;
  isXPBoosted: boolean;
  referrals?: ReferralEntry[];
  onInvite: () => void;
  onHatch: (uid: string) => void;
  onDelete: (uid: string) => void;
}

export const DailyQuests = ({ 
  caughtMonsters, 
  dailyDistance,
  onClaimReward,
  isXPBoosted,
  referrals = [],
  onInvite,
  onHatch,
  onDelete
}: DailyQuestsProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [claimedQuests, setClaimedQuests] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_claimed_quests');
      if (saved) {
        const { date, ids } = JSON.parse(saved);
        if (date === new Date().toDateString()) return ids;
      }
    } catch { return []; }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('monster_collector_claimed_quests', JSON.stringify({
      date: new Date().toDateString(),
      ids: claimedQuests
    }));
  }, [claimedQuests]);

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
      completed: monstersToday.length >= 5,
      reward: 500
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
      completed: rareCount >= 3,
      reward: 1000
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
      completed: (dailyDistance / 1000) >= 2.0,
      reward: 250
    },
  ]

  const { playLevelUp } = useGameSound();

  const handleClaim = (questId: number, xp: number) => {
    playLevelUp();
    setClaimedQuests(prev => [...prev, questId]);
    onClaimReward(xp);
  };

  return (
    <div className="p-4 space-y-8">
      {/* Daily Quests Section */}
      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Denní protokoly</h3>
          <div className="flex items-center gap-1 text-[10px] text-primary font-black uppercase">
            <Timer size={12} />
            <span>RESETOVÁNÍ ZA {timeLeft}</span>
          </div>
        </div>
        <div className="space-y-3">
          {quests.map((quest, idx) => {
            const Icon = quest.icon;
            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.1 }}
                className={cn(
                  "flex items-center p-4 bg-slate-900/40 border border-slate-800 rounded-2xl transition-all hover:bg-slate-900/60",
                  quest.completed && "border-green-500/30 bg-green-500/5"
                )}
              >
                <div className={cn("p-2.5 rounded-xl mr-4", quest.bg)}>
                  <Icon size={20} className={quest.color} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-100">{quest.title}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{quest.desc}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  {claimedQuests.includes(quest.id) ? (
                    <CheckCircle2 size={24} className="text-green-500" />
                  ) : quest.completed ? (
                    <button 
                      onClick={() => handleClaim(quest.id, quest.reward)}
                      className="bg-green-500 hover:bg-green-400 text-slate-950 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-tighter transition-all active:scale-95 shadow-lg shadow-green-500/20"
                    >
                      Získat {isXPBoosted ? `+${quest.reward * 2}` : `+${quest.reward}`} XP
                    </button>
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
            );
          })}
        </div>
      </section>

      {/* Lifetime / Referral Section */}
      <section className="pb-8">
        <div className="flex justify-between items-center mb-4 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Celoživotní úkoly</h3>
            <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black">BONUS</span>
          </div>
          <button 
            onClick={onInvite}
            className="flex items-center gap-1.5 text-[10px] text-primary font-black uppercase hover:text-white transition-colors"
          >
            <UserPlus size={14} />
            <span>Pozvat přítele</span>
          </button>
        </div>

        <div className="bg-slate-900/20 border border-slate-800/50 rounded-3xl p-4">
           <div className="flex items-center gap-4 mb-4 p-3 bg-primary/5 border border-primary/10 rounded-2xl">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <Sparkles size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                 <p className="text-xs font-black text-slate-100 leading-tight uppercase">Získej Vzácné Vajíčko</p>
                 <p className="text-[10px] text-slate-500 font-medium">Za každého přítele, který dosáhne 3. úrovně.</p>
              </div>
           </div>

           <ReferralList referrals={referrals} onHatch={onHatch} onDelete={onDelete} />
        </div>
      </section>
    </div>
  );
}
