import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, X, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { cn, getLoc } from '../../utils';
import { monsterDB } from '../../data/monsters';

interface LeaderboardPlayer {
  id: string;
  name: string;
  mct: number;
  rank: number;
  isMe?: boolean;
  avatarStyle?: string;
  avatarSeed?: string;
  isBlocked?: boolean;
  isOnline?: boolean;
  rarities?: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  caughtList?: {
    id: string;
    name: any;
    rarity: any;
    type: any;
  }[];
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
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardPlayer | null>(null);

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
          let rarities = { common: 0, rare: 0, epic: 0, legendary: 0 };
          let caughtList: { id: string; name: any; rarity: any; type: any }[] = [];
          if (merged.caughtMonsters) {
            const monstersList = Array.isArray(merged.caughtMonsters)
              ? merged.caughtMonsters
              : Object.values(merged.caughtMonsters);
            const uniqueIds = Array.from(new Set(monstersList.filter((m: any) => m && m.id).map((m: any) => m.id)));
            mct = uniqueIds.length;

            uniqueIds.forEach(mId => {
              const dbM = monsterDB.find(m => m.id === mId);
              if (dbM) {
                const r = getLoc(dbM.rarity, 'en').toLowerCase();
                if (r === 'legendary') rarities.legendary++;
                else if (r === 'epic') rarities.epic++;
                else if (r === 'rare') rarities.rare++;
                else rarities.common++;

                caughtList.push({
                  id: dbM.id,
                  name: dbM.name,
                  rarity: dbM.rarity,
                  type: dbM.type
                });
              }
            });
          } else {
            mct = typeof merged.mct === 'number' ? merged.mct : 
                  typeof merged.monsterCount === 'number' ? merged.monsterCount : 
                  typeof merged.mc === 'number' ? merged.mc : 0;
          }

          let avatarStyle = merged.avatarStyle || merged.avs;
          let avatarSeed = merged.avatarSeed || merged.avd;
          let isBlocked = !!merged.blo;
          const lastActive = merged.lastActive || merged.lastSeen || merged.la || 0;
          const isOnline = id === userUid || (lastActive > 0 && (Date.now() - lastActive) < 300000);

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
            isBlocked,
            rarities,
            isOnline,
            caughtList
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
        avatarSeed: p.avatarSeed,
        rarities: p.rarities,
        isOnline: p.isOnline,
        caughtList: p.caughtList
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
          avatarSeed: p.avatarSeed,
          rarities: p.rarities,
          isOnline: p.isOnline,
          caughtList: p.caughtList
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
            onClick={() => setSelectedPlayer(player)}
            className={cn(
              "flex items-center gap-4 px-5 py-3 transition-colors cursor-pointer hover:bg-white/[0.02]",
              player.isMe ? "bg-amber-500/10 border-l-2 border-l-amber-500 hover:bg-amber-500/15" : "bg-transparent"
            )}
          >
            {/* Avatar on the left */}
            <div className="relative shrink-0">
              <div className="size-6 rounded-full overflow-hidden bg-slate-800 border border-slate-700/50">
                <img 
                  src={`https://api.dicebear.com/7.x/${player.avatarStyle || 'bottts'}/svg?seed=${encodeURIComponent(player.avatarSeed || player.id)}`} 
                  className="w-full h-full object-cover" 
                  alt="Avatar" 
                />
              </div>
              {player.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-500 border border-slate-950 rounded-full shadow-[0_0_6px_#10b981]" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col">
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
                {/* Rarity Breakdown */}
                {player.rarities && (player.rarities.rare > 0 || player.rarities.epic > 0 || player.rarities.legendary > 0) && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {player.rarities.legendary > 0 && (
                      <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded-md flex items-center gap-0.5 scale-90 origin-left">
                        <span className="size-1 rounded-full bg-amber-400" />
                        {player.rarities.legendary} L
                      </span>
                    )}
                    {player.rarities.epic > 0 && (
                      <span className="text-[8px] font-black bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1 py-0.2 rounded-md flex items-center gap-0.5 scale-90 origin-left">
                        <span className="size-1 rounded-full bg-purple-400" />
                        {player.rarities.epic} E
                      </span>
                    )}
                    {player.rarities.rare > 0 && (
                      <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.2 rounded-md flex items-center gap-0.5 scale-90 origin-left">
                        <span className="size-1 rounded-full bg-blue-400" />
                        {player.rarities.rare} R
                      </span>
                    )}
                  </div>
                )}
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
            onClick={() => setSelectedPlayer(player)}
            className={cn(
              "flex items-center gap-4 px-5 py-3 transition-colors cursor-pointer hover:bg-white/[0.02]",
              player.isMe ? "bg-amber-500/10 border-l-2 border-l-amber-500 hover:bg-amber-500/15" : "bg-transparent"
            )}
          >
            {/* Avatar on the left */}
            <div className="relative shrink-0">
              <div className="size-6 rounded-full overflow-hidden bg-slate-800 border border-slate-700/50">
                <img 
                  src={`https://api.dicebear.com/7.x/${player.avatarStyle || 'bottts'}/svg?seed=${encodeURIComponent(player.avatarSeed || player.id)}`} 
                  className="w-full h-full object-cover" 
                  alt="Avatar" 
                />
              </div>
              {player.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-500 border border-slate-950 rounded-full shadow-[0_0_6px_#10b981]" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col">
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
                {/* Rarity Breakdown */}
                {player.rarities && (player.rarities.rare > 0 || player.rarities.epic > 0 || player.rarities.legendary > 0) && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {player.rarities.legendary > 0 && (
                      <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded-md flex items-center gap-0.5 scale-90 origin-left">
                        <span className="size-1 rounded-full bg-amber-400" />
                        {player.rarities.legendary} L
                      </span>
                    )}
                    {player.rarities.epic > 0 && (
                      <span className="text-[8px] font-black bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1 py-0.2 rounded-md flex items-center gap-0.5 scale-90 origin-left">
                        <span className="size-1 rounded-full bg-purple-400" />
                        {player.rarities.epic} E
                      </span>
                    )}
                    {player.rarities.rare > 0 && (
                      <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.2 rounded-md flex items-center gap-0.5 scale-90 origin-left">
                        <span className="size-1 rounded-full bg-blue-400" />
                        {player.rarities.rare} R
                      </span>
                    )}
                  </div>
                )}
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

      {/* Player Detail Bottom Sheet */}
      <AnimatePresence>
        {selectedPlayer && (
          <div 
            className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedPlayer(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl flex flex-col max-h-[75vh]"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6 shrink-0" />

              {/* Header Profile */}
              <div className="flex items-center gap-4 mb-6 shrink-0">
                <div className="relative size-16 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/50 shadow-inner">
                  <img 
                    src={`https://api.dicebear.com/7.x/${selectedPlayer.avatarStyle || 'bottts'}/svg?seed=${encodeURIComponent(selectedPlayer.avatarSeed || selectedPlayer.id)}`} 
                    className="w-full h-full object-cover" 
                    alt="Avatar" 
                  />
                  {selectedPlayer.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border border-slate-900 rounded-full shadow-[0_0_8px_#10b981]" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white uppercase italic leading-none tracking-tight">
                    {selectedPlayer.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">
                      #{selectedPlayer.rank} lovec
                    </span>
                    <div className="size-1 rounded-full bg-white/10" />
                    <span className="text-[10px] font-bold text-slate-400">
                      {selectedPlayer.mct} {getSpeciesLabel(selectedPlayer.mct)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="size-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Caught Monsters List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Chycené příšery ({selectedPlayer.caughtList?.length || 0})</h4>
                
                {selectedPlayer.caughtList && selectedPlayer.caughtList.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[...selectedPlayer.caughtList]
                      .sort((a, b) => {
                        const getRarityWeight = (rar: string) => {
                          const w = getLoc(rar, 'en').toLowerCase();
                          if (w === 'legendary') return 4;
                          if (w === 'epic') return 3;
                          if (w === 'rare') return 2;
                          return 1;
                        };
                        return getRarityWeight(b.rarity) - getRarityWeight(a.rarity);
                      })
                      .map(m => {
                        const r = getLoc(m.rarity, 'en').toLowerCase();
                        const isLegendary = r === 'legendary';
                        const isEpic = r === 'epic';
                        const isRare = r === 'rare';
                        
                        const borderColors = isLegendary ? 'border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/5' :
                                             isEpic ? 'border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/5' :
                                             isRare ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/5' :
                                             'border-slate-800 bg-slate-950/20';

                        const textColors = isLegendary ? 'text-amber-400' :
                                           isEpic ? 'text-purple-400' :
                                           isRare ? 'text-blue-400' :
                                           'text-slate-400';

                        return (
                          <div 
                            key={m.id}
                            className={cn(
                              "aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 text-center relative overflow-hidden group hover:bg-white/[0.02] transition-colors",
                              borderColors
                            )}
                          >
                            <img 
                              src={`/monsters/${m.id}.png`} 
                              className="size-10 object-contain drop-shadow-md mb-1 relative z-10" 
                              alt={getLoc(m.name, i18n.language)} 
                            />
                            <p className="text-[8px] font-black text-white uppercase truncate w-full relative z-10 leading-none">{getLoc(m.name, i18n.language)}</p>
                            <p className={cn("text-[7px] font-black uppercase tracking-tighter mt-0.5 relative z-10", textColors)}>
                              {t(`rarities.${r}`)}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                    <p className="text-xs italic text-slate-600 font-bold uppercase tracking-widest px-8">
                      Zatím žádné chycené příšery
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
