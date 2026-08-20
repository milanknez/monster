import React from 'react';
import { motion } from 'framer-motion';
import { cn, getLoc } from '../../../utils';
import type { DungeonConfig } from '../../../data/dungeons';
import type { DungeonPlayer } from './types';

interface DungeonMapCanvasProps {
  selectedDungeon: DungeonConfig;
  currentWave: number;
  completedWaves: number[];
  playerPos: { x: number; y: number };
  targetPos: { x: number; y: number };
  setTargetPos: (pos: { x: number; y: number }) => void;
  activeLobbyCode: string | null;
  activeLobbyData: any;
  players: DungeonPlayer[];
  PLAYER_UID: string;
  updateLobbyPlayerPos: (lobbyCode: string, uid: string, pos: { x: number; y: number }) => void;
  onRallyTriggered: (spotY: number) => void;
}

export const DungeonMapCanvas: React.FC<DungeonMapCanvasProps> = ({
  selectedDungeon,
  currentWave,
  completedWaves,
  playerPos,
  targetPos,
  setTargetPos,
  activeLobbyCode,
  activeLobbyData,
  players,
  PLAYER_UID,
  updateLobbyPlayerPos,
  onRallyTriggered,
}) => {
  const cameraY = Math.max(0, Math.min(1800, playerPos.y - 250));
  const dungeonId = selectedDungeon.id;
  const isLava = dungeonId === 'lava_lair';
  const isFrost = dungeonId === 'frost_temple';

  // Path Waypoint Spots
  const spots = [
    { waveIndex: 1, y: 1800, label: isLava ? 'Brána spalujícího hněvu' : (isFrost ? 'Vstupní mrazivá brána' : 'Nekropolitická brána'), icon: '⛩️' },
    { waveIndex: 2, y: 1200, label: isLava ? 'Oltář popela' : (isFrost ? 'Mrazivý monolit' : 'Oltář zatracení'), icon: isLava ? '🌋' : (isFrost ? '💎' : '☩') },
    { waveIndex: 3, y: 500, label: isLava ? 'Lávový trůn (Boss)' : (isFrost ? 'Srdce chrámu (Boss)' : 'Citadela pohromy (Boss)'), icon: isLava ? '👿' : (isFrost ? '👑' : '⚔') }
  ];

  const torchesY = [2150, 1950, 1650, 1450, 1350, 1050, 850, 650, 350];

  // Rich Decorative Map Props & Objects Generator
  const propsObjects = React.useMemo(() => {
    const items: { id: string; x: number; y: number; icon: string; size: string; shadow?: string }[] = [];
    const lavaIcons = ['🪨', '💀', '☠️', '🦴', '🌋', '🔥', '⚔️', '🗡️', '⛓️', '🩸', '📦', '🛢️', '👑'];
    const frostIcons = ['🧊', '💎', '🪨', '💀', '☠️', '🦴', '❄️', '🛡️', '📦', '🏺', '🗝️'];
    const stoneIcons = ['🪨', '💀', '☠️', '🦴', '🌿', '🍄', '🏺', '📦', '🛢️', '⛓️', '🕯️', '🪙', '🗡️', '🛡️', '🗝️'];
    const pool = isLava ? lavaIcons : (isFrost ? frostIcons : stoneIcons);

    for (let y = 250; y < 2350; y += 90) {
      // Left side props
      const leftX = 40 + (y % 7) * 9;
      items.push({
        id: `prop-l-${y}`,
        x: leftX,
        y: y + ((leftX * 3) % 35),
        icon: pool[(Math.floor(y / 90)) % pool.length],
        size: y % 3 === 0 ? 'text-2xl' : (y % 2 === 0 ? 'text-xl' : 'text-base'),
      });
      // Right side props
      const rightX = 480 + (y % 5) * 9;
      items.push({
        id: `prop-r-${y}`,
        x: rightX,
        y: y + ((rightX * 2) % 40),
        icon: pool[(Math.floor(y / 90) + 3) % pool.length],
        size: y % 4 === 0 ? 'text-2xl' : (y % 2 === 0 ? 'text-xl' : 'text-base'),
      });
      // Path edges & decorative item clusters (skeletons, skulls, chests, barrels, rocks)
      if (y % 150 === 0) {
        const edgeLeftIcon = (y / 150) % 3 === 0 ? '☠️' : ((y / 150) % 3 === 1 ? '🦴' : '🪨');
        const edgeRightIcon = (y / 150) % 4 === 0 ? '📦' : ((y / 150) % 4 === 1 ? '💀' : '🛢️');
        items.push({
          id: `prop-c-${y}`,
          x: 140 + (y % 4) * 14,
          y: y + 15,
          icon: edgeLeftIcon,
          size: 'text-lg',
        });
        items.push({
          id: `prop-c2-${y}`,
          x: 430 - (y % 3) * 14,
          y: y + 35,
          icon: edgeRightIcon,
          size: 'text-lg',
        });
      }
    }
    return items;
  }, [isLava, isFrost]);

  const spirits = [
    { id: 1, x: 280, yStart: 2100, yEnd: 1400, delay: 0 },
    { id: 2, x: 410, yStart: 1700, yEnd: 1000, delay: 1.2 },
    { id: 3, x: 190, yStart: 1300, yEnd: 600, delay: 0.6 },
    { id: 4, x: 370, yStart: 900, yEnd: 200, delay: 2.0 }
  ];

  const wispColor = isLava
    ? 'bg-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.5)]'
    : (isFrost
      ? 'bg-cyan-300/35 shadow-[0_0_10px_rgba(125,211,252,0.4)]'
      : 'bg-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.4)]');

  const flameClass = isLava
    ? 'from-red-600 via-orange-500 to-yellow-400 shadow-[0_0_18px_#f97316]'
    : (isFrost
      ? 'from-cyan-600 via-sky-400 to-blue-300 shadow-[0_0_15px_#0ea5e9]'
      : 'from-lime-600 via-green-500 to-emerald-400 shadow-[0_0_15px_#22c55e]');

  const fogColor = isLava
    ? 'rgba(28,8,6,0.35)'
    : (isFrost
      ? 'rgba(6,16,28,0.35)'
      : 'rgba(10,24,14,0.35)');

  return (
    <div 
      className="flex-1 w-full max-w-[600px] mx-auto relative overflow-hidden bg-stone-950 border-x-4 border-stone-850"
      style={{ perspective: '900px' }}
    >
      {/* Fog of War Radial Lighting centered on player */}
      <div 
        className="absolute inset-0 z-30 pointer-events-none transition-all duration-300"
        style={{
          background: `radial-gradient(circle 360px at ${playerPos.x}px ${playerPos.y - cameraY}px, rgba(0,0,0,0) 0%, ${fogColor} 55%, rgba(4,10,6,0.6) 80%, rgba(2,4,2,0.85) 100%)`
        }}
      />

      {/* Map Canvas 2.5D / Pseudo 3D Isometric viewport container */}
      <div 
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          const boundedX = Math.max(135, Math.min(465, clickX));
          const boundedY = Math.max(450, Math.min(2320, clickY));
          const target = { x: Math.round(boundedX), y: Math.round(boundedY) };
          setTargetPos(target);
          triggerHaptic('light');
          if (activeLobbyCode) {
            updateLobbyPlayerPos(activeLobbyCode, PLAYER_UID, target);
          }
        }}
        className="absolute top-0 left-0 w-full h-[2400px] cursor-pointer bg-slate-950 origin-top"
        style={{ 
          transform: `translateY(${-cameraY}px) rotateX(48deg) scale(1.15)`, 
          transformStyle: 'preserve-3d',
          transition: 'transform 0.18s ease-out'
        }}
      >
        {/* Dynamic Glowing Magic Path Overlay */}
        <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
          <div 
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-[300px] top-[300px] bottom-[50px] rounded-full blur-2xl opacity-25",
              isLava 
                ? "bg-gradient-to-b from-red-600 via-orange-500 to-amber-600" 
                : (isFrost 
                  ? "bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-600" 
                  : "bg-gradient-to-b from-emerald-500 via-teal-600 to-amber-500")
            )}
          />
          {/* Path Edge Runic Lines */}
          <div className={cn("absolute left-[135px] top-[320px] bottom-[80px] w-1 border-r border-dashed opacity-50 shadow-lg", isLava ? "border-orange-500 shadow-orange-500/50" : (isFrost ? "border-cyan-400 shadow-cyan-400/50" : "border-emerald-400 shadow-emerald-400/50"))} />
          <div className={cn("absolute right-[135px] top-[320px] bottom-[80px] w-1 border-l border-dashed opacity-50 shadow-lg", isLava ? "border-orange-500 shadow-orange-500/50" : (isFrost ? "border-cyan-400 shadow-cyan-400/50" : "border-emerald-400 shadow-emerald-400/50"))} />
        </div>

        {/* Ambient Wisps */}
        {spirits.map((s) => (
          <motion.div
            key={s.id}
            initial={{ x: s.x, y: s.yStart, opacity: 0, scale: 0.8 }}
            animate={{ 
              y: [s.yStart, s.yEnd],
              x: [s.x, s.x + 35, s.x - 35, s.x],
              opacity: [0, 0.7, 0.7, 0],
              scale: [0.8, 1.6, 0.8]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 8 + Math.random() * 3, 
              delay: s.delay,
              ease: 'easeInOut' 
            }}
            className={cn("absolute w-5 h-5 rounded-full blur-[2px] pointer-events-none z-10", wispColor)}
          />
        ))}

        {/* Rich Map Decorative Objects Layer (Boulders, Fossils, Plants, Chests) */}
        {propsObjects.map((obj) => (
          <div
            key={obj.id}
            className="absolute pointer-events-none z-10 flex flex-col items-center justify-center filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]"
            style={{ 
              left: obj.x, 
              top: obj.y, 
              transform: 'rotateX(-48deg)' 
            }}
          >
            <span className={cn(obj.size, "select-none opacity-90 transition-transform hover:scale-110")}>
              {obj.icon}
            </span>
          </div>
        ))}

        {/* Stone Pillars and Glowing Braziers */}
        {torchesY.map((yVal, idx) => (
          <div key={`pillar-${idx}`} className="absolute inset-x-0 h-0 pointer-events-none z-15" style={{ top: yVal }}>
            <div className="absolute left-[75px] -translate-y-1/2 flex items-center">
              <div className="relative w-6 h-12 bg-gradient-to-r from-stone-950 via-stone-850 to-stone-900 border-2 border-stone-600 rounded-md shadow-[4px_4px_12px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between py-1">
                <div className="w-full h-1.5 border-b border-stone-600 rounded-t bg-stone-700/50" />
                <div className="text-[7px] opacity-70">⚜️</div>
                <div className="w-full h-1.5 border-t border-stone-700 rounded-b" />
              </div>
              <div className="relative -ml-1 flex items-center">
                <div className="w-5 h-2.5 bg-stone-950 border border-stone-700 rounded-sm shadow-md" />
                <div className="relative">
                  <div className={cn("absolute -top-6 -left-4 w-12 h-12 rounded-full blur-lg opacity-40 pointer-events-none", isLava ? "bg-orange-500" : (isFrost ? "bg-cyan-400" : "bg-emerald-400"))} />
                  <motion.div 
                    animate={{ scale: [1, 1.4, 0.95, 1.3, 1], y: [0, -4, -1, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2 + (idx % 3) * 0.2, ease: 'easeInOut' }}
                    className={cn("absolute -top-4 -left-1.5 w-4 h-5 rounded-full blur-[1px] bg-gradient-to-t shadow-2xl", flameClass)}
                  />
                </div>
              </div>
            </div>

            <div className="absolute right-[75px] -translate-y-1/2 flex items-center flex-row-reverse">
              <div className="relative w-6 h-12 bg-gradient-to-l from-stone-950 via-stone-850 to-stone-900 border-2 border-stone-600 rounded-md shadow-[-4px_4px_12px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between py-1">
                <div className="w-full h-1.5 border-b border-stone-600 rounded-t bg-stone-700/50" />
                <div className="text-[7px] opacity-70">⚜️</div>
                <div className="w-full h-1.5 border-t border-stone-700 rounded-b" />
              </div>
              <div className="relative -mr-1 flex items-center flex-row-reverse">
                <div className="w-5 h-2.5 bg-stone-950 border border-stone-700 rounded-sm shadow-md" />
                <div className="relative">
                  <div className={cn("absolute -top-6 -right-4 w-12 h-12 rounded-full blur-lg opacity-40 pointer-events-none", isLava ? "bg-orange-500" : (isFrost ? "bg-cyan-400" : "bg-emerald-400"))} />
                  <motion.div 
                    animate={{ scale: [1.3, 0.95, 1.4, 1, 1.3], y: [-4, -1, -5, 0, -3] }}
                    transition={{ repeat: Infinity, duration: 1.3 + (idx % 3) * 0.2, ease: 'easeInOut' }}
                    className={cn("absolute -top-4 -right-1.5 w-4 h-5 rounded-full blur-[1px] bg-gradient-to-t shadow-2xl", flameClass)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Rally Spots / Waypoint Gates */}
        {spots.map((spot) => {
          const isCleared = completedWaves.includes(spot.waveIndex);
          const isActive = currentWave === spot.waveIndex;
          return (
            <div key={spot.waveIndex} className="absolute inset-x-0 h-0 pointer-events-none" style={{ top: spot.y }}>
              {isActive && !isCleared && activeLobbyData && (() => {
                const allLobbyPlayers = Object.values(activeLobbyData.players || {}) as any[];
                const totalPlayersCount = allLobbyPlayers.length;
                const spotY = currentWave === 1 ? 1800 : (currentWave === 2 ? 1200 : 500);
                const arrivedCount = allLobbyPlayers.filter((p: any) => {
                  const pPos = p.uid === PLAYER_UID ? playerPos : (p.pos || { x: 300, y: 2300 });
                  return Math.hypot(pPos.x - 300, pPos.y - spotY) <= 130 || pPos.y <= spotY + 40;
                }).length;
                const allReady = totalPlayersCount > 0 && arrivedCount >= totalPlayersCount;

                return (
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 pointer-events-none z-20 flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.2, 0.6, 0.2] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full border-2 border-amber-400/60 bg-amber-500/10 shadow-[0_0_40px_rgba(245,158,11,0.3)]"
                    />

                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                      className="absolute w-56 h-28 rounded-full border border-dashed border-amber-300/80 shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]"
                    />

                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!allReady) return;
                        onRallyTriggered(spotY);
                      }}
                      className={cn(
                        "relative z-30 flex items-center justify-center gap-1.5 bg-slate-950/90 px-4 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition pointer-events-auto",
                        allReady 
                          ? "border-amber-400/70 shadow-amber-500/30 animate-bounce cursor-pointer hover:scale-105 active:scale-95 text-amber-300" 
                          : "border-slate-700/60 shadow-black/50 opacity-80 cursor-not-allowed text-slate-400"
                      )}
                    >
                      <span className="text-xs">{allReady ? '👑' : '⏳'}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {allReady 
                          ? 'SHROMAŽDIŠTĚ (Zahájit Boj ⚔️)' 
                          : `ČEKÁNÍ NA HRÁČE (${arrivedCount}/${totalPlayersCount})`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div 
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-18 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all duration-500",
                  isCleared ? 'border-emerald-500/25 bg-emerald-950/5 text-emerald-500' : (isActive ? 'border-amber-500 bg-amber-950/20 text-amber-400 shadow-[0_0_20px_#f59e0b]' : 'border-stone-850 bg-stone-950/60 text-stone-700')
                )}
              >
                <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1">
                  {spot.icon} {spot.label} {spot.icon}
                </span>
                <span className="text-[7px] font-black tracking-widest mt-1 text-slate-400">
                  {isCleared ? '✓ PEČEŤ ZNEŠKODNĚNA' : (isActive ? 'VYVOLÁNÍ BITVY ⚔️' : 'UZAMČENO')}
                </span>
              </div>
            </div>
          );
        })}

        {/* Realtime Multiplayer Teammates on Map */}
        {activeLobbyData && Object.values(activeLobbyData.players || {}).map((p: any) => {
          if (p.uid === PLAYER_UID) return null;
          const pPos = p.pos || { x: 300, y: 2300 };
          return (
            <div 
              key={p.uid}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 linear pointer-events-none z-30 flex flex-col items-center"
              style={{ left: pPos.x, top: pPos.y }}
            >
              <span className="bg-black/80 text-amber-300 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider mb-1 border border-amber-500/30 shadow-lg">
                {p.name}
              </span>
              <div className="relative">
                <img 
                  src={p.monster ? `/monsters/${p.monster.id}.png` : 'https://img.icons8.com/color/96/cute-monster.png'} 
                  className="w-10 h-10 object-contain drop-shadow-md"
                  alt={p.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/96/cute-monster.png';
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Active main player monster */}
        <div 
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 linear pointer-events-none z-40 flex flex-col items-center"
          style={{ left: playerPos.x, top: playerPos.y, transform: 'rotateX(-48deg)' }}
        >
          <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider mb-1 shadow-lg shadow-amber-500/30">
            {players[0]?.playerName || getLoc(players[0]?.monster.name || 'Hrdina', 'cz')} (VY)
          </span>
          <div className="relative">
            <motion.div 
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-12 h-12"
            >
              <img 
                src={players[0]?.monster.image} 
                className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" 
                alt="Main Monster"
              />
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
};
