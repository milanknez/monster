import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map as MapIcon, Target, Trophy, CheckCircle2, Timer, UserPlus, Sparkles, Sword } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, getLoc, RARITY_MAP } from '../../utils';

import { Monster } from '../../types';
import { ReferralList, type ReferralEntry } from '../referrals/ReferralList';
import { useGameSound } from '../../data/sounds';

interface DailyQuestsProps {
  caughtMonsters: Monster[];
  dailyDistance: number;
  onClaimReward: (xp: number) => void;
  isXPBoosted: boolean;
  playerLevel: number;
  dailyStats: { duels: number, epics: number, legendaries: number };
  referrals?: ReferralEntry[];
  onInvite: () => void;
  onHatch: (uid: string) => void;
  onDelete: (uid: string) => void;
  globalRank: number | null;
  leaderboardNearby?: { name: string, mct: number, rank: number, isMe?: boolean }[];
  leaderboardTop?: { name: string, mct: number, rank: number }[];
}

export const DailyQuests = ({ 
  caughtMonsters, 
  dailyDistance,
  onClaimReward,
  isXPBoosted,
  playerLevel,
  dailyStats,
  referrals = [],
  onInvite,
  onHatch,
  onDelete,
  globalRank,
  leaderboardNearby = [],
  leaderboardTop = []
}: DailyQuestsProps) => {
  const { t } = useTranslation();
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

  const [questHistory, setQuestHistory] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_quest_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('monster_collector_claimed_quests', JSON.stringify({
      date: new Date().toDateString(),
      ids: claimedQuests
    }));
  }, [claimedQuests]);

  useEffect(() => {
    localStorage.setItem('monster_collector_quest_history', JSON.stringify(questHistory));
  }, [questHistory]);

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
  const rareCount = monstersToday.filter(m => {
    const r = RARITY_MAP[getLoc(m.rarity, 'cz')];
    return ['rare', 'epic', 'legendary'].includes(r);
  }).length;

  const quests = [
    {
      id: 1,
      title: t('quests.list.q1_title'),
      desc: t('quests.list.q1_desc'),
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
      title: t('quests.list.q2_title'),
      desc: t('quests.list.q2_desc'),
      progress: Math.min(rareCount, 3),
      total: 3,
      icon: Trophy,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      completed: rareCount >= 3,
      reward: 500
    },
    {
      id: 3,
      title: t('quests.list.q3_title'),
      desc: t('quests.list.q3_desc'),
      progress: Math.min(Number((dailyDistance / 1000).toFixed(1)), 2.0),
      total: 2.0,
      icon: MapIcon,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      completed: (dailyDistance / 1000) >= 2.0,
      reward: 250
    },
    {
      id: 4,
      title: t('quests.list.q4_title'),
      desc: t('quests.list.q4_desc'),
      progress: Math.min(dailyStats.duels, 1),
      total: 1,
      icon: Sword,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      completed: dailyStats.duels >= 1,
      reward: 400,
      minLevel: 4
    },
    {
      id: 5,
      title: t('quests.list.q5_title'),
      desc: t('quests.list.q5_desc'),
      progress: Math.min(dailyStats.epics, 3),
      total: 3,
      icon: Sparkles,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      completed: dailyStats.epics >= 3,
      reward: 1200,
      minLevel: 4,
      requires: 2 // Lovec vzácných (id: 2)
    },
    {
      id: 6,
      title: t('quests.list.q6_title'),
      desc: t('quests.list.q6_desc'),
      progress: Math.min(dailyStats.legendaries, 1),
      total: 1,
      icon: Trophy,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      completed: dailyStats.legendaries >= 1,
      reward: 2500,
      minLevel: 6,
      requires: 5 // Lovec epiků
    }
  ];

  const visibleQuests = quests.filter(q => {
    if (q.minLevel && playerLevel < q.minLevel) return false;
    
    // Pokud tento quest vyžaduje jiný, zobrazím ho jen, pokud je ten předchozí splněn v historii
    if (q.requires) {
      const parentCompleted = questHistory.includes(q.requires);
      if (!parentCompleted) return false;
    }

    // Pokud je tento quest SÁM vyžadován pro jiný quest (je to parent), a ten je už odemčený, tak tentou skryji
    const hasNextQuestUnlocked = quests.find(child => child.requires === q.id && questHistory.includes(q.id));
    if (hasNextQuestUnlocked) return false;

    return true;
  });

  const { playLevelUp } = useGameSound();

  const handleClaim = (questId: number, xp: number) => {
    playLevelUp();
    setClaimedQuests(prev => [...prev, questId]);
    setQuestHistory(prev => prev.includes(questId) ? prev : [...prev, questId]);
    onClaimReward(xp);
  };

  return (
    <div className="p-4 space-y-8">
      {/* Daily Quests Section */}
      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('quests.daily_protocols')}</h3>
          <div className="flex items-center gap-1 text-[10px] text-primary font-black uppercase">
            <Timer size={12} />
            <span>{t('quests.reset_in', { time: timeLeft })}</span>
          </div>
        </div>
        <div className="space-y-3">
          {visibleQuests.map((quest, idx) => {
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
                      {t('quests.claim_reward', { xp: isXPBoosted ? quest.reward * 2 : quest.reward })}
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
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('quests.lifetime_tasks')}</h3>
            <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black">BONUS</span>
          </div>
          <button 
            onClick={onInvite}
            className="flex items-center gap-1.5 text-[10px] text-primary font-black uppercase hover:text-white transition-colors"
          >
            <UserPlus size={14} />
            <span>{t('quests.invite_friend')}</span>
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-900/20 border border-slate-800/50 rounded-3xl p-4">
           <div className="flex items-center gap-4 mb-4 p-3 bg-primary/5 border border-primary/10 rounded-2xl">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <Sparkles size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                 <p className="text-xs font-black text-slate-100 leading-tight uppercase">{t('quests.rare_egg')}</p>
                 <p className="text-[10px] text-slate-500 font-medium">{t('quests.egg_desc')}</p>
              </div>
           </div>

           <ReferralList referrals={referrals} onHatch={onHatch} onDelete={onDelete} />
          </div>
        </div>
      </section>

      {/* Global Leaderboard Section */}
      <section className="mt-8 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('quests.leaderboard_title')}</h3>
          <div className="h-[1px] flex-1 bg-slate-800/50" />
        </div>

        {globalRank !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500/10 to-primary/5 border border-amber-500/20 rounded-3xl p-5 relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 size-24 bg-amber-500/10 blur-2xl rounded-full" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="size-14 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)] group-hover:scale-110 transition-transform duration-500">
                 <Trophy size={32} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] mb-1">{t('quests.leaderboard_title')}</h4>
                <p className="text-xl font-black text-slate-100 tracking-tighter leading-tight">
                  {t('quests.leaderboard_rank', { rank: globalRank })}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase tracking-wide opacity-80">
                  {t('quests.leaderboard_desc')}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Consolidated Leaderboard List */}
        {(leaderboardTop.length > 0 || leaderboardNearby.length > 0) && (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden divide-y divide-slate-800/50">
            {/* Top 3 */}
            {leaderboardTop.map((player, idx) => (
              <div 
                key={`top-${idx}`}
                className={cn(
                  "flex items-center gap-4 px-5 py-3 transition-colors",
                  globalRank === player.rank ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "bg-transparent"
                )}
              >
                <div className="w-6 flex justify-center">
                  {player.rank === 1 ? <Trophy size={16} className="text-amber-400" /> :
                   player.rank === 2 ? <Trophy size={16} className="text-slate-300" /> :
                   <Trophy size={16} className="text-amber-700" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-[11px] font-black uppercase tracking-wide truncate",
                      globalRank === player.rank ? "text-white" : "text-slate-300"
                    )}>
                      {player.name}
                    </p>
                    <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                      {player.mct} {t('stats.hp_short').toLowerCase() === 'hp' ? 'pts' : 'ks'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn(
                    "text-[10px] font-black",
                    player.rank === 1 ? "text-amber-400" : 
                    player.rank === 2 ? "text-slate-300" : 
                    "text-amber-700"
                  )}>
                    #{player.rank}
                  </span>
                </div>
              </div>
            ))}

            {/* Gap Separator */}
            {leaderboardNearby.length > 0 && leaderboardNearby[0].rank > 4 && (
              <div className="py-2 flex justify-center bg-slate-950/20">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="size-1 bg-slate-800 rounded-full" />)}
                </div>
              </div>
            )}

            {/* Nearby Players (Filtered to exclude Top 3) */}
            {leaderboardNearby
              .filter(p => p.rank > 3)
              .map((player, idx) => (
              <div 
                key={`nearby-${idx}`}
                className={cn(
                  "flex items-center gap-4 px-5 py-3 transition-colors",
                  player.isMe ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "bg-transparent"
                )}
              >
                <span className={cn(
                  "text-[10px] font-black w-6 text-center",
                  player.isMe ? "text-amber-500" : "text-slate-600"
                )}>
                  #{player.rank}
                </span>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-[11px] font-bold uppercase tracking-wide truncate",
                      player.isMe ? "text-white" : "text-slate-400"
                    )}>
                      {player.name}
                    </p>
                    <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                      {player.mct} ks
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={cn(
                    "size-5 rounded-md flex items-center justify-center border",
                    player.isMe ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-800/30 border-white/5"
                  )}>
                    <Target size={12} className={player.isMe ? "text-amber-500" : "text-slate-600"} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
