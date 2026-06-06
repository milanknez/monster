import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { cn } from '../../utils';

interface LeaderboardPlayer {
  name: string;
  mct: number;
  rank: number;
  isMe?: boolean;
}

interface LeaderboardProps {
  userUid: string;
}

export const Leaderboard = ({ userUid }: LeaderboardProps) => {
  const { t, i18n } = useTranslation();
  const [leaderboardTop, setLeaderboardTop] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardNearby, setLeaderboardNearby] = useState<LeaderboardPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getSpeciesLabel = (count: number) => {
    if (i18n.language === 'cs') {
      if (count === 1) return 'druh';
      if (count >= 2 && count <= 4) return 'druhy';
      return 'druhů';
    } else if (i18n.language === 'sk') {
      if (count === 1) return 'druh';
      if (count >= 2 && count <= 4) return 'druhy';
      return 'druhov';
    } else {
      return 'species';
    }
  };

  useEffect(() => {
    if (!userUid) return;
    const usersRef = ref(db, 'users');
    const playersNodeRef = ref(db, 'players');
    
    const handleData = (usersSnap: any, playersNodeSnap: any) => {
      const usersData = usersSnap.val() || {};
      const playersNodeData = playersNodeSnap.val() || {};
      
      const allUids = Array.from(new Set([...Object.keys(usersData), ...Object.keys(playersNodeData)]));
      
      const players = allUids
        .map(id => {
          const u = usersData[id] || {};
          const p = playersNodeData[id] || {};
          const merged = { ...p, ...u };
          
          return {
            id,
            name: merged.playerName || merged.name || merged.nam || merged.n || 'Neznámý lovec',
            mct: Array.isArray(merged.caughtMonsters) ? new Set(merged.caughtMonsters.map((m: any) => m.id)).size : 
                 (typeof merged.mct === 'number' ? merged.mct : 
                 typeof merged.monsterCount === 'number' ? merged.monsterCount : 
                 typeof merged.mc === 'number' ? merged.mc : 0)
          };
        })
        .filter(p => (p.name !== 'Neznámý lovec' && p.mct > 0) || p.id === userUid)
        .sort((a, b) => b.mct - a.mct);
      
      // Get Top 3
      const top3 = players.slice(0, 3).map((p, idx) => ({
        name: p.name,
        mct: p.mct,
        rank: idx + 1,
        isMe: p.id === userUid
      }));
      setLeaderboardTop(top3);

      const myIdx = players.findIndex(p => p.id === userUid);
      if (myIdx !== -1) {
        // Get 3 above and 3 below
        const start = Math.max(0, myIdx - 2);
        const end = Math.min(players.length, myIdx + 3);
        const nearby = players.slice(start, end).map((p, idx) => ({
          name: p.name,
          mct: p.mct,
          rank: start + idx + 1,
          isMe: p.id === userUid
        }));
        setLeaderboardNearby(nearby);
      } else {
        setLeaderboardNearby([]);
      }
      setIsLoading(false);
    };

    let lastUsersSnap: any = null;
    let lastPlayersSnap: any = null;

    const unsub1 = onValue(usersRef, (snap) => {
      lastUsersSnap = snap;
      if (lastPlayersSnap !== null) handleData(lastUsersSnap, lastPlayersSnap);
    });

    const unsub2 = onValue(playersNodeRef, (snap) => {
      lastPlayersSnap = snap;
      if (lastUsersSnap !== null) handleData(lastUsersSnap, lastPlayersSnap);
    });

    // Initial fetch
    get(usersRef).then(uSnap => {
      lastUsersSnap = uSnap;
      get(playersNodeRef).then(pSnap => {
        lastPlayersSnap = pSnap;
        handleData(uSnap, pSnap);
      });
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [userUid]);

  if (isLoading && leaderboardTop.length === 0) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <section className="mt-8 px-5 pb-8 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('quests.leaderboard_title')}</h3>
        <div className="h-[1px] flex-1 bg-slate-800/50" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden divide-y divide-slate-800/50">
        {/* Top 3 */}
        {leaderboardTop.map((player, idx) => (
          <div 
            key={`top-${idx}`}
            className={cn(
              "flex items-center gap-4 px-5 py-3 transition-colors",
              player.isMe ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "bg-transparent"
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
                  player.isMe ? "text-white" : "text-slate-300"
                )}>
                  {player.name}
                </p>
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                  {player.mct} {getSpeciesLabel(player.mct)}
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

        {/* Nearby Players */}
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
            <div className="w-6 flex justify-center shrink-0">
              <div className={cn(
                "size-5 rounded-md flex items-center justify-center border",
                player.isMe ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-800/30 border-white/5"
              )}>
                <Target size={12} className={player.isMe ? "text-amber-500" : "text-slate-600"} />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-[11px] font-bold uppercase tracking-wide truncate",
                  player.isMe ? "text-white" : "text-slate-400"
                )}>
                  {player.name}
                </p>
                <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                  {player.mct} {getSpeciesLabel(player.mct)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn(
                "text-[10px] font-black",
                player.isMe ? "text-amber-500" : "text-slate-600"
              )}>
                #{player.rank}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
