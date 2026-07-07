import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { cn, getLoc } from '../../utils';

interface LeaderboardPlayer {
  id: string;
  name: string;
  mct: number;
  rank: number;
  isMe?: boolean;
  avatarStyle?: string;
  avatarSeed?: string;
  isBlocked?: boolean;
}

interface LeaderboardProps {
  userUid: string;
  localPlayerName?: string | null;
  localMonsterCount?: number;
}

export const Leaderboard = ({ userUid, localPlayerName, localMonsterCount }: LeaderboardProps) => {
  const { t, i18n } = useTranslation();
  const [allPlayers, setAllPlayers] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardNearby, setLeaderboardNearby] = useState<LeaderboardPlayer[]>([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isLoading, setIsLoading] = useState(true);

  const getSpeciesLabel = (count: number) => {
    if (i18n.language.startsWith('cs') || i18n.language.startsWith('cz')) {
      if (count === 1) return 'druh';
      if (count >= 2 && count <= 4) return 'druhy';
      return 'druhů';
    } else if (i18n.language.startsWith('sk')) {
      if (count === 1) return 'druh';
      if (count >= 2 && count <= 4) return 'druhy';
      return 'druhov';
    } else {
      return 'species';
    }
  };

  const getLoadMoreLabel = () => {
    if (i18n.language.startsWith('cs') || i18n.language.startsWith('cz')) {
      return 'Načíst další';
    } else if (i18n.language.startsWith('sk')) {
      return 'Načítať ďalšie';
    } else {
      return 'Load more';
    }
  };

  useEffect(() => {
    if (!userUid) return;
    setIsLoading(true);
    
    const usersRef = ref(db, 'users');
    const playersNodeRef = ref(db, 'players');
    const presenceRef = ref(db, 'presence');

    Promise.all([
      get(usersRef),
      get(playersNodeRef),
      get(presenceRef)
    ]).then(([usersSnap, playersNodeSnap, presenceSnap]) => {
      const usersData = usersSnap.val() || {};
      const playersNodeData = playersNodeSnap.val() || {};
      const presenceData = presenceSnap.val() || {};
      
      const allUids = Array.from(new Set([
        ...Object.keys(usersData), 
        ...Object.keys(playersNodeData),
        ...Object.keys(presenceData),
        userUid
      ]));
      
      const players = allUids
        .map(id => {
          const u = usersData[id] || {};
          const p = playersNodeData[id] || {};
          const pr = presenceData[id] || {};
          const merged = { ...p, ...u, ...pr };
          
          const rawName = merged.playerName || merged.name || merged.nam || merged.n || id;
          let name = getLoc(rawName, i18n.language);
          
          let mct = 0;
          if (merged.caughtMonsters) {
            const monstersList = Array.isArray(merged.caughtMonsters)
              ? merged.caughtMonsters
              : Object.values(merged.caughtMonsters);
            mct = new Set(monstersList.filter((m: any) => m && m.id).map((m: any) => m.id)).size;
          } else {
            mct = typeof merged.mct === 'number' ? merged.mct : 
                  typeof merged.monsterCount === 'number' ? merged.monsterCount : 
                  typeof merged.mc === 'number' ? merged.mc : 0;
          }

          let avatarStyle = merged.avatarStyle || merged.avs;
          let avatarSeed = merged.avatarSeed || merged.avd;
          let isBlocked = !!merged.blo;

          if (id === userUid) {
            if (localPlayerName) {
              name = localPlayerName;
            }
            if (typeof localMonsterCount === 'number') {
              mct = localMonsterCount;
            }
          }

          if (!name) {
            name = 'Neznámý lovec';
          }

          return {
            id,
            name,
            mct,
            avatarStyle,
            avatarSeed,
            isBlocked
          };
        })
        .filter(p => (p.name !== 'Neznámý lovec' || p.id === userUid) && !p.isBlocked)
        .sort((a, b) => b.mct - a.mct);
      
      // Get all players
      const mappedPlayers = players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        mct: p.mct,
        rank: idx + 1,
        isMe: p.id === userUid,
        avatarStyle: p.avatarStyle,
        avatarSeed: p.avatarSeed
      }));
      setAllPlayers(mappedPlayers);

      const myIdx = players.findIndex(p => p.id === userUid);
      if (myIdx !== -1) {
        // Get 3 above and 3 below
        const start = Math.max(0, myIdx - 2);
        const end = Math.min(players.length, myIdx + 3);
        const nearby = players.slice(start, end).map((p, idx) => ({
          id: p.id,
          name: p.name,
          mct: p.mct,
          rank: start + idx + 1,
          isMe: p.id === userUid,
          avatarStyle: p.avatarStyle,
          avatarSeed: p.avatarSeed
        }));
        setLeaderboardNearby(nearby);
      } else {
        setLeaderboardNearby([]);
      }
      setIsLoading(false);
    }).catch(err => {
      setIsLoading(false);
    });
  }, [userUid]);

  if (isLoading && allPlayers.length === 0) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const displayedTop = allPlayers.slice(0, visibleCount);
  const isMeVisible = displayedTop.some(p => p.isMe);
  const filteredNearby = leaderboardNearby.filter(p => p.rank > visibleCount);

  return (
    <section className="mt-8 px-5 pb-8 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('quests.leaderboard_title')}</h3>
        <div className="h-[1px] flex-1 bg-slate-800/50" />
      </div>

      <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden divide-y divide-slate-800/50">
        {/* Top Players */}
        {displayedTop.map((player, idx) => (
          <div 
            key={`top-${idx}`}
            className={cn(
              "flex items-center gap-4 px-5 py-3 transition-colors",
              player.isMe ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "bg-transparent"
            )}
          >
            {/* Avatar on the left */}
            <div className="size-6 rounded-full overflow-hidden bg-slate-800 border border-slate-700/50 shrink-0">
              <img 
                src={`https://api.dicebear.com/7.x/${player.avatarStyle || 'bottts'}/svg?seed=${encodeURIComponent(player.avatarSeed || player.id)}`} 
                className="w-full h-full object-cover" 
                alt="Avatar" 
              />
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

            {/* Cup (Trophy) and Rank on the right */}
            <div className="flex items-center gap-1.5 shrink-0">
              {player.rank === 1 ? <Trophy size={16} className="text-amber-400" /> :
               player.rank === 2 ? <Trophy size={16} className="text-slate-300" /> :
               player.rank === 3 ? <Trophy size={16} className="text-amber-700" /> : null}
              <span className={cn(
                "text-[10px] font-black",
                player.rank === 1 ? "text-amber-400" : 
                player.rank === 2 ? "text-slate-300" : 
                player.rank === 3 ? "text-amber-700" : 
                player.isMe ? "text-amber-500" : "text-slate-600"
              )}>
                #{player.rank}
              </span>
            </div>
          </div>
        ))}

        {/* Load More Button */}
        {allPlayers.length > visibleCount && (
          <button 
            type="button"
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="w-full py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white bg-slate-950/20 hover:bg-slate-950/40 transition-colors cursor-pointer"
          >
            {getLoadMoreLabel()}
          </button>
        )}

        {/* Gap Separator */}
        {!isMeVisible && filteredNearby.length > 0 && filteredNearby[0].rank > visibleCount + 1 && (
          <div className="py-2 flex justify-center bg-slate-950/20">
            <div className="flex gap-1">
              {[1, 2, 3].map(i => <div key={i} className="size-1 bg-slate-800 rounded-full" />)}
            </div>
          </div>
        )}

        {/* Nearby Players */}
        {!isMeVisible && filteredNearby
          .map((player, idx) => (
          <div 
            key={`nearby-${idx}`}
            className={cn(
              "flex items-center gap-4 px-5 py-3 transition-colors",
              player.isMe ? "bg-amber-500/10 border-l-2 border-l-amber-500" : "bg-transparent"
            )}
          >
            {/* Avatar on the left */}
            <div className="size-6 rounded-full overflow-hidden bg-slate-800 border border-slate-700/50 shrink-0">
              <img 
                src={`https://api.dicebear.com/7.x/${player.avatarStyle || 'bottts'}/svg?seed=${encodeURIComponent(player.avatarSeed || player.id)}`} 
                className="w-full h-full object-cover" 
                alt="Avatar" 
              />
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
