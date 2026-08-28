import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, Shield, Heart, Zap, Sparkles, RefreshCw, Play, Pause, 
  Activity, Award, Flame, Droplets, Leaf, Circle, ShieldAlert, ChevronLeft, Skull, Swords, Lock
} from 'lucide-react';
import { monsterDB } from '../../data/monsters';
import { RESOURCE_CONFIG } from '../../data/resources';
import { dungeonsDB, DungeonConfig } from '../../data/dungeons';
import type { Monster, Localized } from '../../types';
import { 
  cn, getLoc, triggerHaptic, getMonsterPower, getRarityTheme, 
  getMonsterColors, getMonsterTypeIcon, getMonsterMaxHP, getMonsterRole 
} from '../../utils';
import { useGameSound } from '../../data/sounds';
import { DungeonVictoryModal } from './dungeon/DungeonVictoryModal';
import { DungeonThreatList } from './dungeon/DungeonThreatList';
import { DungeonActionControls } from './dungeon/DungeonActionControls';
import {
  createDungeonLobby,
  joinDungeonLobby,
  joinOrCreateDungeonLobby,
  leaveDungeonLobby,
  updateLobbyPlayerMonster,
  setLobbyPlayerReady,
  startDungeonLobby,
  watchDungeonLobbies,
  getDungeonLobbies,
  watchSingleLobby,
  deleteDungeonLobby,
  setLobbyStatus,
  setPlayerAcceptance,
  setPlayerMonsterLock,
  resetLobbyToWaiting,
  saveLobbyFinalStats,
  updateLobbyPlayerPos,
  broadcastCombatEvent,
  clearCombatEvents,
  watchCombatEvents,
  PLAYER_UID
} from '../../lib/firebase';

interface DungeonPlayer {
  index: number;
  uid?: string;
  playerName?: string;
  monster: Monster;
  currentHP: number;
  maxHP: number;
  energy: number;
  cooldown: number; // 0 to 100
  threat: number;   // Threat points
  dps: number;
  totalDamage: number;
  totalHealing: number;
  isDead: boolean;
  stunTimer: number;    // Dizzy stun
  freezeTimer: number;  // Ice block freeze
  rootTimer: number;    // Rooted
  burnTimer: number;    // Dot burn
}

interface DungeonEnemy {
  index: number;
  monster: Monster;
  currentHP: number;
  maxHP: number;
  energy: number;
  shield: number;
  shieldMax: number;
  isBoss: boolean;
  isDead: boolean;
}

interface DamagePopup {
  id: number;
  value: number;
  isCrit: boolean;
  isHeal: boolean;
  isPlayerTarget: boolean;
  targetIndex?: number;
}

interface FlyingSpell {
  id: number;
  type: 'attack' | 'heal' | 'boss_attack';
  element?: string;
  startX: string;
  startY: string;
  endX: string;
  endY: string;
}

const MonsterPodium = ({ isPlayer, rarity, isAggro }: { isPlayer?: boolean, rarity?: any, isAggro?: boolean }) => {
  const r = (getLoc(rarity) || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let color = isPlayer ? 'rgba(13,185,242,0.8)' : 'rgba(239,68,68,0.8)';
  let bg = isPlayer ? 'bg-primary/20 border-primary' : 'bg-red-500/20 border-red-500';

  if (isAggro) {
    color = 'rgba(239,68,68,1)';
    bg = 'bg-red-600/35 border-red-500';
  } else if (r.includes('legend')) { 
    color = 'rgba(245,158,11,0.8)'; bg = 'bg-amber-500/20 border-amber-500'; 
  } else if (r.includes('epic') || r.includes('epick')) { 
    color = 'rgba(168,85,247,0.8)'; bg = 'bg-purple-500/20 border-purple-500'; 
  } else if (r.includes('vzacn') || r.includes('rare')) { 
    color = 'rgba(59,130,246,0.8)'; bg = 'bg-blue-500/20 border-blue-500'; 
  }

  return (
    <div className="absolute -bottom-4 flex items-center justify-center w-full pointer-events-none z-0">
      <div
        className={cn("absolute w-20 h-20 rounded-full border border-dashed opacity-45 blur-[1px]", bg)}
        style={{
          boxShadow: `0 0 20px ${color}`,
          transform: 'rotateX(76deg)'
        }}
      />
    </div>
  );
};

const generateRandomRaidName = () => {
  const adjs = [
    'Zmatený', 'Spící', 'Hladový', 'Opilý', 'Zuřivý', 'Legendární', 
    'Laggující', 'Kafíčkový', 'Ponožkový', 'Bramborový', 'Křupavý', 
    'Noobovský', 'Tryhard', 'Česnekový', 'Toxic', 'Sýrový', 'Pivní'
  ];
  const nouns = [
    'Cirkus', 'Klubík', 'Gang', 'Banda', 'Oddíl', 'Team', 
    'Squad', 'Pluk', 'Bratrstvo', 'Šílenci', 'Lovci', 'Chaos'
  ];
  const adj = adjs[Math.floor(Math.random() * adjs.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj} ${noun} ${num}`;
};

export const Dungeon = ({ onBack, caughtMonsters = [], initialDungeonId, onAddResource }: { onBack: () => void, caughtMonsters?: Monster[], initialDungeonId?: string | null, onAddResource?: (type: any, amount?: number) => void }) => {
  const { 
    playAttack, playHit, playCritical, playHeal, playSlash, 
    playVictory, playDefeat, playDeath, playSpell, playLevelUp,
    playClick, playLobbyMusic, stopLobbyMusic, playSelectionMusic, stopSelectionMusic,
    playMapMusic, stopMapMusic, playBattleMusic, stopBattleMusic, playEpicWarSynth
  } = useGameSound();

  // Selected configurable dungeon
  const [selectedDungeon, setSelectedDungeon] = useState<DungeonConfig | null>(() => {
    if (initialDungeonId) {
      return dungeonsDB.find(d => d.id === initialDungeonId) || dungeonsDB[0];
    }
    return dungeonsDB[0];
  });

  useEffect(() => {
    if (initialDungeonId) {
      const match = dungeonsDB.find(d => d.id === initialDungeonId);
      if (match) setSelectedDungeon(match);
    }
  }, [initialDungeonId]);

  // Vertical Exploration Map & Fighting States
  const [isFighting, setIsFighting] = useState<boolean>(false);
  const [isInLobby, setIsInLobby] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [partySlots, setPartySlots] = useState<(Monster | null)[]>([null, null, null, null]);
  const [lobbyMode, setLobbyMode] = useState<'solo' | 'multiplayer' | null>('multiplayer');
  const [multiplayerState, setMultiplayerState] = useState<'choice' | 'lobbies_list' | 'lobby_room' | 'solo_lobby'>('lobbies_list');
  const [activeLobbyCode, setActiveLobbyCode] = useState<string | null>(null);
  const [activeLobbyData, setActiveLobbyData] = useState<any | null>(null);
  const [availableLobbies, setAvailableLobbies] = useState<Record<string, any>>({});
  const [isRefreshingLobbies, setIsRefreshingLobbies] = useState<boolean>(false);
  const [lobbyCountdown, setLobbyCountdown] = useState<number>(120);
  const [confirmCountdown, setConfirmCountdown] = useState<number>(10);
  const [launchCountdown, setLaunchCountdown] = useState<number>(3);
  const launchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Vertical Exploration Map States
  const [completedWaves, setCompletedWaves] = useState<number[]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 300, y: 2300 });
  const [targetPos, setTargetPos] = useState({ x: 300, y: 2300 });

  const [battleLog, setBattleLog] = useState<{ id: string; text: string; type: 'info' | 'boss' | 'player' | 'heal' | 'death' }[]>([]);
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [flyingSpells, setFlyingSpells] = useState<FlyingSpell[]>([]);
  
  // Game states
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [enemies, setEnemies] = useState<DungeonEnemy[]>([]);
  const [players, setPlayers] = useState<DungeonPlayer[]>([]);
  const playerCount = Math.max(1, players.length);
  const [bossTargetIdx, setBossTargetIdx] = useState<number>(0);
  const [bossTargetUid, setBossTargetUid] = useState<string | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [dungeonTime, setDungeonTime] = useState<number>(0);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | null>(null);
  const [selectedLootPreview, setSelectedLootPreview] = useState<any | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionText, setTransitionText] = useState<string>('');

  const lastPosSyncRef = useRef<number>(0);
  const dungeonSessionStartTsRef = useRef<number>(Date.now() - 1000);
  const isStartingFightRef = useRef<boolean>(false);
  const hasStartedGameRef = useRef<boolean>(false);
  const targetPosRef = useRef(targetPos);
  const activeLobbyDataRef = useRef(activeLobbyData);
  const enemiesRef = useRef<DungeonEnemy[]>(enemies);
  const currentWaveRef = useRef<number>(currentWave);
  const playersRef = useRef<DungeonPlayer[]>(players);
  const selectedDungeonRef = useRef(selectedDungeon);

  useEffect(() => { isStartingFightRef.current = false; }, [currentWave]);
  useEffect(() => { currentWaveRef.current = currentWave; }, [currentWave]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { selectedDungeonRef.current = selectedDungeon; }, [selectedDungeon]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
  useEffect(() => { targetPosRef.current = targetPos; }, [targetPos]);
  useEffect(() => { activeLobbyDataRef.current = activeLobbyData; }, [activeLobbyData]);
  const [accumulatedLoot, setAccumulatedLoot] = useState<any[]>([]);
  const [lootRolls, setLootRolls] = useState<Record<number, { status: 'idle' | 'rolling' | 'won' | 'passed'; roll?: number; winnerName?: string }>>({});
  const [chestOpened, setChestOpened] = useState<boolean>(false);
  const [hpPotions, setHpPotions] = useState<number>(2);
  const [manaPotions, setManaPotions] = useState<number>(2);
  const [showItems, setShowItems] = useState<boolean>(false);
  const [showSkillsMenu, setShowSkillsMenu] = useState<boolean>(false);

  // Advanced Boss / Enemy Custom Attack states
  const [swoopEnemyIdx, setSwoopEnemyIdx] = useState<number | null>(null);
  const [bossEnraged, setBossEnraged] = useState<boolean>(false);
  const [bossEnrageCount, setBossEnrageCount] = useState<number>(0);
  const [activeExplosionIndices, setActiveExplosionIndices] = useState<number[]>([]);

  // Active attacking index for standard enemy lunge animations
  const [enemyAttackingIdx, setEnemyAttackingIdx] = useState<number | null>(null);

  // Boss HP Trailing state
  const [trailingBossHP, setTrailingBossHP] = useState<number>(10000);
  const bossEnemy = enemies.find(e => e.isBoss);
  const bossHP = bossEnemy ? bossEnemy.currentHP : 0;
  const bossMaxHP = bossEnemy ? bossEnemy.maxHP : 10000;

  useEffect(() => {
    let stopSynth: (() => void) | undefined;

    if (isFighting) {
      stopLobbyMusic();
      stopSelectionMusic();
      stopMapMusic();
      playBattleMusic();
    } else if (isInLobby) {
      stopBattleMusic();
      stopSelectionMusic();
      stopMapMusic();
      playLobbyMusic();
    } else {
      stopBattleMusic();
      stopLobbyMusic();
      stopSelectionMusic();
      playMapMusic();
    }

    return () => {
      stopBattleMusic();
      stopLobbyMusic();
      stopSelectionMusic();
      stopMapMusic();
    };
  }, [isFighting, isInLobby, playBattleMusic, stopBattleMusic, playLobbyMusic, stopLobbyMusic, playSelectionMusic, stopSelectionMusic, playMapMusic, stopMapMusic]);

  const loopIntervalRef = useRef<any>(null);
  const nextBossAttackRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const resumeAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
  }, []);

  // Procedural Map Grid Generator (10 columns, 40 rows)
  const mapGrid = useMemo(() => {
    if (!selectedDungeon) return [];
    
    const dungId = selectedDungeon.id;
    const rows = 40;
    const cols = 10;
    const grid: number[][] = [];

    // Seeded random helper for consistent decor placement
    let seed = dungId === 'lava_lair' ? 123 : (dungId === 'frost_temple' ? 456 : 789);
    const pseudoRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let y = 0; y < rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < cols; x++) {
        let cell = 0; // Default to wall (0)

        // Boss Arena (rows 4 to 12)
        if (y >= 4 && y <= 12) {
          const distToCenter = Math.hypot(x - 4.5, y - 8);
          if (distToCenter < 4.0) {
            cell = pseudoRandom() < 0.15 ? 3 : 1; // Floor with details
          } else if (distToCenter < 4.6) {
            cell = 2; // Moat (water/lava/ice hazard)
          } else {
            cell = 0; // Outer wall
          }
        }
        // Winding path connecting bottom to arena
        else {
          // Winding corridor path center coordinate calculation
          let centerX = 4.5;
          let pathWidth = 3.8;

          if (y >= 33) {
            centerX = 4.5; // Straight start at the bottom
          } else if (y >= 24) {
            // Curving to the left and back
            centerX = 4.5 - Math.sin((y - 24) * 0.35) * 1.8;
          } else if (y >= 14) {
            // Curving to the right and back
            centerX = 4.5 + Math.sin((y - 14) * 0.35) * 1.8;
          } else {
            centerX = 4.5; // Straight approach into boss arena
          }

          const distToCenter = Math.abs(x - centerX);
          if (distToCenter < pathWidth / 2) {
            cell = pseudoRandom() < 0.15 ? 3 : 1; // Floor pathway
          } else if (distToCenter < pathWidth / 2 + 0.6) {
            cell = 2; // Liquid borders (water/lava/ice)
          } else {
            cell = 0; // Hard walls
          }
        }

        row.push(cell);
      }
      grid.push(row);
    }
    return grid;
  }, [selectedDungeon]);

  const getTileStyle = (cellType: number, dungId: string, x: number, y: number) => {
    const isLava = dungId === 'lava_lair';
    const isFrost = dungId === 'frost_temple';

    let tileUrl = '';
    if (isLava) {
      if (cellType === 0) tileUrl = '/tiles/wall_lava.png';
      else if (cellType === 2) tileUrl = '/tiles/lava.png';
      else tileUrl = '/tiles/floor_lava.png';
    } else if (isFrost) {
      if (cellType === 0) tileUrl = '/tiles/wall_frost.png';
      else if (cellType === 2) tileUrl = '/tiles/ice.png';
      else tileUrl = '/tiles/floor_frost.png';
    } else {
      if (cellType === 0) tileUrl = '/tiles/wall_stone.png';
      else if (cellType === 2) tileUrl = '/tiles/water_stone.png';
      else tileUrl = '/tiles/floor_stone.png';
    }

    // Dynamic rotation and flipping for visual variation
    const rotations = [0, 90, 180, 270];
    const rotate = rotations[(x * 3 + y * 7) % 4];
    const scaleX = (x % 2 === 0) ? 1 : -1;
    const scaleY = (y % 2 === 0) ? 1 : -1;

    return {
      backgroundImage: `url(${tileUrl})`,
      backgroundSize: '100% 100%',
      transform: `rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`,
    };
  };

  // Filter Monsters by Rarity (memoized to avoid re-creating arrays on every render)
  const rareMonsters = useMemo(() => monsterDB.filter(
    (m) => (m.rarity?.toLowerCase() || '') === 'rare' || (m.rarity?.toLowerCase() || '') === 'vzácné' || (m.rarity?.toLowerCase() || '') === 'vzácná'
  ) as Monster[], []);
  const epicMonsters = useMemo(() => monsterDB.filter(
    (m) => (m.rarity?.toLowerCase() || '') === 'epic' || (m.rarity?.toLowerCase() || '') === 'epické'
  ) as Monster[], []);
  const legendaryMonsters = useMemo(() => monsterDB.filter(
    (m) => (m.rarity?.toLowerCase() || '') === 'legendary' || (m.rarity?.toLowerCase() || '') === 'legendární'
  ) as Monster[], []);

  // Helper to trigger physical attack lunge animation for enemies
  const triggerEnemyAttackAnimation = (idx: number) => {
    setEnemyAttackingIdx(idx);
    setTimeout(() => setEnemyAttackingIdx(null), 400);
  };

  // Load enemies for wave based on active selected dungeon config
  // Simple seeded pseudo-random number generator (mulberry32)
  const seededRng = (seed: number) => {
    let s = seed;
    return () => {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  const loadWaveEnemies = useCallback((waveNum: number, dungConfig: DungeonConfig, _seed?: number) => {
    let newEnemies: DungeonEnemy[] = [];
    const waveConfig = dungConfig.waves.find(w => w.waveIndex === waveNum);
    if (!waveConfig) return;

    const hp = waveConfig.baseHp;
    const shield = waveConfig.shield || 0;
    const level = waveConfig.level;
    const isBoss = waveNum === dungConfig.waves.length;

    const enemyMonster: Monster = {
      id: `dungeon_${dungConfig.id}_w${waveNum}`,
      name: waveConfig.enemyName,
      image: waveConfig.enemyImage,
      type: waveConfig.enemyType,
      rarity: isBoss ? 'legendary' : (waveNum === 1 ? 'rare' : 'epic'),
      level: level,
      description: typeof waveConfig.enemyName === 'object' ? getLoc(waveConfig.enemyName, 'cz') : waveConfig.enemyName,
      stats: {
        hp: hp,
        attack: Math.round(level * 15 + (isBoss ? 50 : 20)),
        defense: Math.round(level * 10 + (isBoss ? 30 : 10))
      }
    };

    if (isBoss) {
      newEnemies = [{
        index: 0,
        monster: enemyMonster,
        currentHP: hp,
        maxHP: hp,
        energy: 0,
        shield,
        shieldMax: shield,
        isBoss: true,
        isDead: false,
      }];
      setTrailingBossHP(hp);
      addLog(`⚔️ FINÁLNÍ VLNA: Boss ${getLoc(waveConfig.enemyName, 'cz')} se probudil z temnoty!`, 'info');
    } else {
      newEnemies = Array.from({ length: waveConfig.enemyCount }).map((_, idx) => ({
        index: idx,
        monster: enemyMonster,
        currentHP: hp,
        maxHP: hp,
        energy: 20,
        shield,
        shieldMax: shield,
        isBoss: false,
        isDead: false,
      }));
      addLog(`⚔️ VLNA ${waveNum}: Do cesty se vám postavili ${getLoc(waveConfig.enemyName, 'cz')} (${waveConfig.enemyCount}x)!`, 'info');
    }

    setEnemies(newEnemies);
    setBossTargetIdx(0);
    nextBossAttackRef.current = 0;
  }, []);

  // Start simulation based on active selected dungeon config and party slots
  const initSimulation = useCallback(() => {
    if (!selectedDungeon) return;

    // Filter out null slots to get selected monsters
    const selectedMonsters = partySlots.filter((m): m is Monster => m !== null);
    
    // Ensure full 4-player party simulation by filling missing party slots with NPC allies
    let finalParty = [...selectedMonsters];
    if (finalParty.length === 0) {
      const myLead = caughtMonsters?.[0] || epicMonsters[0];
      if (myLead) finalParty.push(myLead);
    }
    while (finalParty.length < 4 && epicMonsters.length > 0) {
      const npcTemplate = epicMonsters[(finalParty.length - 1) % epicMonsters.length];
      finalParty.push({
        ...npcTemplate,
        id: `${npcTemplate.id}_npc_${finalParty.length}`,
        name: { cz: `NPC Spoluhráč ${finalParty.length}`, en: `NPC Ally ${finalParty.length}`, sk: `NPC Spoluhráč ${finalParty.length}` }
      });
    }

    const recLevel = selectedDungeon.recommendedLevel;

    const initialPlayers: DungeonPlayer[] = finalParty.map((monster, idx) => {
      const monsterLvl = monster.level || recLevel;
      const baseHp = monster.stats?.hp || 100;
      const maxHP = Math.round(baseHp * 1.5 + (monsterLvl * 40) + 600);
      return {
        index: idx,
        playerName: idx === 0 ? 'VY' : (monster.name ? getLoc(monster.name, 'cz') : `NPC Spoluhráč ${idx}`),
        monster: { 
          ...(monster as any), 
          image: (monster as any).image || `/monsters/${monster.id}.png`,
          level: monsterLvl
        },
        currentHP: maxHP,
        maxHP,
        energy: 30,
        cooldown: Math.random() * 50,
        threat: 0,
        dps: 0,
        totalDamage: 0,
        totalHealing: 0,
        isDead: false,
        stunTimer: 0,
        freezeTimer: 0,
        rootTimer: 0,
        burnTimer: 0,
      };
    });

    setPlayers(initialPlayers);
    setCurrentWave(1);
    setIsTransitioning(false);
    setBattleResult(null);
    setDungeonTime(0);
    setPopups([]);
    setFlyingSpells([]);
    setAccumulatedLoot([]);
    setChestOpened(false);
    setHpPotions(2);
    setManaPotions(2);
    setShowItems(false);
    setShowSkillsMenu(false);
    setEnemyAttackingIdx(null);
    setSwoopEnemyIdx(null);
    setBossEnraged(false);
    setBossEnrageCount(0);
    setActiveExplosionIndices([]);
    setPlayerPos({ x: 300, y: 2300 });
    setTargetPos({ x: 300, y: 2300 });
    setCompletedWaves([]);
    setIsFighting(true);
    setIsPaused(false);
    loadWaveEnemies(1, selectedDungeon);
  }, [partySlots, caughtMonsters, epicMonsters, selectedDungeon, loadWaveEnemies]);

  // Initialize party slots and default to lobbies list once on mount
  useEffect(() => {
    const initialParty: (Monster | null)[] = [null, null, null, null];
    for (let i = 0; i < 4; i++) {
      if (caughtMonsters && caughtMonsters[i]) {
        initialParty[i] = caughtMonsters[i];
      }
    }
    setPartySlots(initialParty);
  }, [caughtMonsters]);

  const localPlayerName = useMemo(() => localStorage.getItem('monster_collector_player_name') || 'Lovec', []);

  // Listen to active lobbies list when choosing or viewing lobbies
  useEffect(() => {
    if (!selectedDungeon || !isInLobby || lobbyMode !== 'multiplayer' || multiplayerState !== 'lobbies_list') return;

    const unsubscribe = watchDungeonLobbies((lobbies) => {
      setAvailableLobbies(lobbies || {});
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedDungeon, isInLobby, lobbyMode, multiplayerState]);

  const handleRefreshLobbies = useCallback(async () => {
    triggerHaptic('light');
    setIsRefreshingLobbies(true);
    try {
      const freshLobbies = await getDungeonLobbies();
      setAvailableLobbies(freshLobbies || {});
    } catch (err) {
      console.error("Chyba při obnově raidů:", err);
    } finally {
      setNowTick(Date.now());
      setTimeout(() => setIsRefreshingLobbies(false), 500);
    }
  }, []);

  // Ticker for live countdowns in lobbies list
  useEffect(() => {
    if (!isInLobby || multiplayerState !== 'lobbies_list') return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isInLobby, multiplayerState]);

  // Listen to single lobby room changes
  useEffect(() => {
    if (!activeLobbyCode) return;

    const unsubscribe = watchSingleLobby(activeLobbyCode, (lobbyData) => {
      if (!lobbyData) {
        setActiveLobbyData(null);
        setActiveLobbyCode(null);
        setMultiplayerState('lobbies_list');
        return;
      }

      setActiveLobbyData(lobbyData);
      const isHost = lobbyData.hostUid === PLAYER_UID;
      const status = lobbyData.status;

      // 0. Reset to Waiting (Re-enter lobby room together)
      if (status === 'waiting' && hasStartedGameRef.current) {
        hasStartedGameRef.current = false;
        setIsFighting(false);
        setBattleResult(null);
        setIsInLobby(true);
        setLobbyMode('multiplayer');
        setMultiplayerState('lobby_room');
      }

      // 1. Confirming (Match Found / AFK Check) - Host advances if all accepted
      if (status === 'confirming') {
        const playersArr = Object.values(lobbyData.players || {}) as any[];
        const allAccepted = playersArr.every((p: any) => p.isAccepted === true);
        if (allAccepted && isHost) {
          setLobbyStatus(activeLobbyCode, 'sl'); // Switch to selecting
        }
      }

      // 2. Selecting (Monster Select & Lock-In) - Host advances if all locked
      if (status === 'selecting') {
        const playersArr = Object.values(lobbyData.players || {}) as any[];
        const allLocked = playersArr.every((p: any) => p.isLocked === true && p.monster !== null);
        if (allLocked && isHost) {
          setLobbyStatus(activeLobbyCode, 'go'); // Switch to starting
        }
      }

      // 3. Starting (3..2..1 Launch Countdown) - Host launches game after 3.2s
      if (status === 'starting' && isHost) {
        if (!launchTimerRef.current) {
          launchTimerRef.current = setTimeout(() => {
            startDungeonLobby(activeLobbyCode);
            launchTimerRef.current = null;
          }, 3200);
        }
      }

      // 4. Started - Trigger Combat for all clients ONCE
      if (status === 'started' && !hasStartedGameRef.current) {
        hasStartedGameRef.current = true;
        if (launchTimerRef.current) {
          clearTimeout(launchTimerRef.current);
          launchTimerRef.current = null;
        }
        const participants = Object.values(lobbyData.players || {}) as any[];
        participants.sort((a, b) => {
          if ((a.joinedAt || 0) !== (b.joinedAt || 0)) {
            return (a.joinedAt || 0) - (b.joinedAt || 0);
          }
          return (a.uid || '').localeCompare(b.uid || '');
        });

        const recLevel = selectedDungeon?.recommendedLevel || 10;
        const initialPlayers: DungeonPlayer[] = participants.map((player, idx) => {
          let monster = player.monster?.full || player.monster || epicMonsters[idx % epicMonsters.length];
          const dbMatch = monsterDB.find(m => m.id === monster.id || getLoc(m.name) === getLoc(monster.name));
          if (dbMatch) {
            monster = { ...dbMatch, ...monster, stats: { ...dbMatch.stats, ...(monster.stats || {}) } };
          }
          const monsterLvl = monster.level || recLevel;
          const baseHp = monster.stats?.hp || 1000;
          const maxHP = Math.round(baseHp * 1.5 + (monsterLvl * 40) + 600);

          return {
            index: idx,
            uid: player.uid || PLAYER_UID,
            playerName: player.name || 'Hráč',
            monster: {
              ...monster,
              image: monster.image || `/monsters/${monster.id}.png`,
              level: monsterLvl
            },
            currentHP: maxHP,
            maxHP,
            energy: 30,
            cooldown: Math.random() * 50,
            threat: 0,
            dps: 0,
            totalDamage: 0,
            totalHealing: 0,
            isDead: false,
            stunTimer: 0,
            freezeTimer: 0,
            rootTimer: 0,
            burnTimer: 0,
          };
        });

        setPlayers(initialPlayers);
        setCurrentWave(1);
        setIsTransitioning(false);
        setBattleResult(null);
        setDungeonTime(0);
        setPopups([]);
        setFlyingSpells([]);
        setAccumulatedLoot([]);
        setChestOpened(false);
        setHpPotions(2);
        setManaPotions(2);
        setShowItems(false);
        setShowSkillsMenu(false);
        setEnemyAttackingIdx(null);
        setSwoopEnemyIdx(null);
        setBossEnraged(false);
        setBossEnrageCount(0);
        setActiveExplosionIndices([]);
        setPlayerPos({ x: 300, y: 2300 });
        setTargetPos({ x: 300, y: 2300 });
        setCompletedWaves([]);
        setIsFighting(false);
        loadWaveEnemies(1, selectedDungeon!, lobbyData.enemySeed ?? undefined);
        setIsInLobby(false);
        setMultiplayerState('choice');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeLobbyCode, selectedDungeon, epicMonsters, loadWaveEnemies]);

  // Handle launch countdown (3.. 2.. 1..) tick
  useEffect(() => {
    if (!activeLobbyData || activeLobbyData.status !== 'starting') {
      setLaunchCountdown(3);
      return;
    }
    const interval = setInterval(() => {
      setLaunchCountdown((prev) => {
        const next = Math.max(0, prev - 1);
        if (next > 0) {
          playClick();
          triggerHaptic('light');
        } else {
          playLevelUp();
          triggerHaptic('medium');
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLobbyData?.status, playClick, playLevelUp]);

  // Handle AFK acceptance countdown (10s) tick
  useEffect(() => {
    if (!activeLobbyData || activeLobbyData.status !== 'confirming') {
      setConfirmCountdown(10);
      return;
    }
    const interval = setInterval(() => {
      setConfirmCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (activeLobbyCode && activeLobbyData.hostUid === PLAYER_UID) {
            resetLobbyToWaiting(activeLobbyCode);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLobbyData?.status, activeLobbyCode, activeLobbyData?.hostUid]);

  // Handle countdown timer inside active lobby room
  useEffect(() => {
    if (!activeLobbyCode || !activeLobbyData) return;

    const expiresAt = activeLobbyData.expiresAt || (Date.now() + 120000);

    const updateTimer = () => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setLobbyCountdown(remaining);

      // Auto-assign random monster from caughtMonsters if timer is expiring and I haven't selected one
      if (remaining <= 0 && activeLobbyData.status === 'waiting') {
        const myData = activeLobbyData.players?.[PLAYER_UID];
        if (myData && !myData.monster) {
          const pool = (caughtMonsters && caughtMonsters.length > 0) ? caughtMonsters : epicMonsters;
          if (pool && pool.length > 0) {
            const randomMonster = pool[Math.floor(Math.random() * pool.length)];
            const formatted = {
              name: getLoc(randomMonster.name),
              level: randomMonster.level || 1,
              rarity: randomMonster.rarity || 'Běžné',
              maxHP: randomMonster.stats?.hp || 1000
            };
            updateLobbyPlayerMonster(activeLobbyCode, PLAYER_UID, formatted);
            setLobbyPlayerReady(activeLobbyCode, PLAYER_UID, true);
          }
        }

        // Auto start if time expires (every 5-minute interval)
        startDungeonLobby(activeLobbyCode);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [activeLobbyCode, activeLobbyData, caughtMonsters, epicMonsters]);

  // Walk timer loop to move players on the map and check for collision triggers
  useEffect(() => {
    if (!selectedDungeon || isFighting || battleResult || isTransitioning) return;
    
    const interval = setInterval(() => {
      setPlayerPos((curr) => {
        const target = targetPosRef.current;
        const activeLobby = activeLobbyDataRef.current;

        const dx = target.x - curr.x;
        const dy = target.y - curr.y;
        const dist = Math.hypot(dx, dy);
        
        let nextX = curr.x;
        let nextY = curr.y;

        if (dist >= 4) {
          const speed = 10;
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;
          nextX = curr.x + vx;
          nextY = curr.y + vy;

          if (activeLobbyCode) {
            const now = Date.now();
            if (now - lastPosSyncRef.current > 200) {
              lastPosSyncRef.current = now;
              updateLobbyPlayerPos(activeLobbyCode, PLAYER_UID, { x: Math.round(nextX), y: Math.round(nextY) });
            }
          }
        } else if (activeLobbyCode && lastPosSyncRef.current !== 0) {
          lastPosSyncRef.current = 0;
          updateLobbyPlayerPos(activeLobbyCode, PLAYER_UID, { x: Math.round(curr.x), y: Math.round(curr.y) });
        }
        
        // Check proximity to the current wave spot
        const spotY = currentWave === 1 ? 1800 : (currentWave === 2 ? 1200 : 500);
        
        // Check if wave is not completed
        if (!completedWaves.includes(currentWave) && !isStartingFightRef.current) {
          if (activeLobby) {
            // MULTIPLAYER RAID ASSEMBLY CIRCLE CHECK (HOST ONLY TRIGGERS)
            const isHost = activeLobbyDataRef.current?.hostUid === PLAYER_UID;
            const allPlayers = Object.values(activeLobby.players || {}) as any[];
            const inZoneCount = allPlayers.filter((p: any) => {
              const pPos = p.uid === PLAYER_UID ? { x: nextX, y: nextY } : (p.pos || { x: 300, y: 2300 });
              return Math.hypot(pPos.x - 300, pPos.y - spotY) <= 130 || pPos.y <= spotY + 40;
            }).length;

            if (isHost && inZoneCount >= allPlayers.length && allPlayers.length > 0) {
              isStartingFightRef.current = true;
              setTargetPos({ x: 300, y: spotY + 30 });
              
              if (activeLobbyCode) {
                broadcastCombatEvent(activeLobbyCode, {
                  t: 'start_fight',
                  w: currentWave,
                  sy: spotY
                });
              }
              return { x: 300, y: spotY + 30 };
            }
          } else if (nextY <= spotY + 30) {
            // Singleplayer trigger
            isStartingFightRef.current = true;
            setTargetPos({ x: nextX, y: spotY + 30 });
            
            setIsPaused(true);
            setIsTransitioning(true);
            setTransitionText(currentWave === selectedDungeon.waves.length ? 'FINÁLNÍ VLNA: BOSS SE PROBOUZÍ!' : `VLNA ${currentWave}: BOJ O BRÁNU!`);
            playLevelUp();
            
            setTimeout(() => {
              setIsTransitioning(false);
              setIsFighting(true);
              setIsPaused(false);
            }, 2000);
            
            return { x: nextX, y: spotY + 30 };
          }
        }
        
        return { x: nextX, y: nextY };
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, [selectedDungeon, isFighting, battleResult, isTransitioning, currentWave, completedWaves, playLevelUp, activeLobbyCode]);

  const addLog = (text: string, type: 'info' | 'boss' | 'player' | 'heal' | 'death') => {
    setBattleLog((prev) => [{ id: Math.random().toString(), text, type }, ...prev].slice(0, 4));
  };

  const triggerShake = (color?: string) => {
    setScreenShake(true);
    if (color) {
      setFlashColor(color);
      setTimeout(() => setFlashColor(null), 100);
    }
    setTimeout(() => setScreenShake(false), 250);
  };

  const spawnSpellAnimation = (type: 'attack' | 'heal' | 'boss_attack', fromIdx: number, toIdx: number, element?: string, totalEnemyCount = 1) => {
    const id = Math.random();
    
    let startX = '50%';
    let startY = '25%';
    let endX = '50%';
    let endY = '25%';

    const playerWidth = 100 / playerCount;
    const playerPosOffset = (idx: number) => `${playerWidth * idx + playerWidth / 2}%`;

    const enemyWidth = 100 / totalEnemyCount;
    const enemyPosOffset = (idx: number) => `${enemyWidth * idx + enemyWidth / 2}%`;

    if (type === 'attack') {
      startX = playerPosOffset(fromIdx);
      startY = '75%';
      endX = enemyPosOffset(toIdx);
      endY = '28%';
    } else if (type === 'heal') {
      startX = playerPosOffset(fromIdx);
      startY = '75%';
      endX = playerPosOffset(toIdx);
      endY = '75%';
    } else if (type === 'boss_attack') {
      startX = enemyPosOffset(fromIdx);
      startY = '28%';
      endX = playerPosOffset(toIdx);
      endY = '75%';
    }

    setFlyingSpells((prev) => [...prev, { id, type, element, startX, startY, endX, endY }]);
    setTimeout(() => {
      setFlyingSpells((prev) => prev.filter((s) => s.id !== id));
    }, 600);
  };

  const addPopup = (val: number, isHeal: boolean, isPlayerTarget: boolean, targetIdx?: number, isCrit = false, totalEnemyCount = 1) => {
    const id = Date.now() + Math.random();
    setPopups((prev) => [...prev, { id, value: val, isCrit, isHeal, isPlayerTarget, targetIndex: targetIdx }]);
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1200);
  };

  // Roll Random Loot from RESOURCE_CONFIG (pouze běžné světové relikvie, NIKDY specifické boss itemy!)
  const rollLoot = useCallback((rarityFilter: 'common' | 'rare' | 'epic' | 'legendary', excludedIds: string[] = []) => {
    const items = Object.entries(RESOURCE_CONFIG).filter(([id, item]) => {
      const matchRarity = item.rarity === rarityFilter;
      const isRelic = item.category === 'relic';
      // Vyloučit specifické boss itemy (dropWeight === 0) a položky ze seznamu výjimek
      const notZeroWeight = item.dropWeight !== 0;
      const notExcluded = !excludedIds.includes(id);
      return isRelic && matchRarity && notZeroWeight && notExcluded;
    });
    if (items.length > 0) {
      const rolled = items[Math.floor(Math.random() * items.length)];
      return { id: rolled[0], config: rolled[1] };
    }
    return null;
  }, []);

  // Wave advancement handler (bez dropů mezi vlnami – vše padá z bosse!)
  const advanceWave = useCallback((nextWave: number, isFromSync = false) => {
    if (!selectedDungeon) return;

    if (activeLobbyCode && !isFromSync) {
      const isHost = activeLobbyDataRef.current?.hostUid === PLAYER_UID;
      if (isHost) {
        clearCombatEvents(activeLobbyCode);
        broadcastCombatEvent(activeLobbyCode, {
          t: 'adv_wave',
          nw: nextWave
        });
      }
    }

    setIsTransitioning(true);
    setIsPaused(true);
    setTransitionText(`VLNA ${nextWave - 1} VYČIŠTĚNA! Cesta k další vlně je volná.`);
    playLevelUp();

    setPlayers((prevPls) => prevPls.map((p) => {
      if (p.isDead) return p;
      return { 
        ...p, 
        currentHP: Math.min(p.maxHP, p.currentHP + Math.round(p.maxHP * 0.35)),
        stunTimer: 0,
        freezeTimer: 0,
        rootTimer: 0,
        burnTimer: 0
      };
    }));

    setCompletedWaves((prev) => [...prev, nextWave - 1]);

    setTimeout(() => {
      setCurrentWave(nextWave);
      loadWaveEnemies(nextWave, selectedDungeon);
      setIsTransitioning(false);
      setIsFighting(false); // return to exploration!
      setIsPaused(false);   // unpause walk timer!
    }, 2500);
  }, [loadWaveEnemies, playLevelUp, selectedDungeon, setIsFighting, setCompletedWaves, activeLobbyCode]);

  // Execute Victory and final Loot screen reading configurations
  const triggerVictory = useCallback((isFromSync = false, syncedLoot?: any[]) => {
    if (!selectedDungeon) return;

    setBattleResult('win');
    playVictory();
    setIsPaused(true);

    if (syncedLoot && Array.isArray(syncedLoot) && syncedLoot.length > 0) {
      setAccumulatedLoot(syncedLoot);
      return;
    }

    const isMultiplayer = Boolean(activeLobbyCode);
    const isHost = !isMultiplayer || activeLobbyDataRef.current?.hostUid === PLAYER_UID;

    // If we are a non-host client in multiplayer and did not receive loot yet, wait for host event
    if (isMultiplayer && !isHost && !isFromSync) {
      return;
    }

    const finalDrops: any[] = [];
    const lootConf = selectedDungeon.lootTable;

    // 1. Zpracování specifických boss itemů (s volitelným limitem např. max 2 itemy)
    if (lootConf.specificDrops && Array.isArray(lootConf.specificDrops)) {
      const rolledSpecific: any[] = [];

      // Nejprve projdeme všechny itemy a vyhodnotíme šance
      lootConf.specificDrops.forEach((specDrop) => {
        if (Math.random() <= specDrop.chance) {
          const resConfig = RESOURCE_CONFIG[specDrop.resourceId];
          if (resConfig) {
            const min = specDrop.minAmount || 1;
            const max = Math.max(min, specDrop.maxAmount || 1);
            const rolledAmount = Math.floor(min + Math.random() * (max - min + 1));
            
            for (let a = 0; a < rolledAmount; a++) {
              rolledSpecific.push({ id: specDrop.resourceId, config: resConfig });
            }
          }
        }
      });

      // Pokud padlo více než je limit maxSpecificDropsCount, náhodně vybereme přesně ten limit
      const maxSpecCount = lootConf.maxSpecificDropsCount;
      if (maxSpecCount && maxSpecCount > 0 && rolledSpecific.length > maxSpecCount) {
        // Zamíchat a oříznout na max
        const shuffled = [...rolledSpecific].sort(() => 0.5 - Math.random());
        finalDrops.push(...shuffled.slice(0, maxSpecCount));
      } else {
        finalDrops.push(...rolledSpecific);
      }
    }

    // 2. Zpracování náhodných bonusových dropů podle šancí vzácnosti (bez specifických boss itemů!)
    const randomCount = lootConf.randomDropsCount ?? 2;
    const dist = lootConf.rarityDistribution || { legendary: 0.2, epic: 0.4, rare: 0.4 };
    const bossItemIds = lootConf.specificDrops?.map(s => s.resourceId) || [];

    for (let i = 0; i < randomCount; i++) {
      const rollType = Math.random();
      let rolledItem = null;

      if (rollType < dist.legendary) {
        rolledItem = rollLoot('legendary', bossItemIds);
      } else if (rollType < dist.legendary + dist.epic) {
        rolledItem = rollLoot('epic', bossItemIds);
      } else {
        rolledItem = rollLoot('rare', bossItemIds);
      }

      if (rolledItem) {
        finalDrops.push(rolledItem);
      }
    }

    // Secret inventory expansion drops from Dungeon Boss (2% chance)
    if (Math.random() < 0.02) {
      const secretId = Math.random() < 0.65 ? 'backpack_pouch' : 'backpack_vault';
      const secretCfg = RESOURCE_CONFIG[secretId];
      if (secretCfg) {
        finalDrops.push({ id: secretId, config: secretCfg });
      }
    }

    // Pokud by nic nepadlo, garantujeme alespoň 1 rare item ze světa
    if (finalDrops.length === 0) {
      const fallback = rollLoot('rare', bossItemIds) || rollLoot('epic', bossItemIds);
      if (fallback) finalDrops.push(fallback);
    }

    setAccumulatedLoot(finalDrops);

    if (activeLobbyCode) {
      const isHost = activeLobbyDataRef.current?.hostUid === PLAYER_UID;
      if (isHost) {
        const totDmg = players.reduce((sum, p) => sum + p.totalDamage, 0);
        const psMap: Record<string, { totalDamage: number; totalHealing: number; dps: number }> = {};
        players.forEach(p => {
          if (p.uid) {
            psMap[p.uid] = {
              totalDamage: p.totalDamage,
              totalHealing: p.totalHealing,
              dps: dungeonTime > 0 ? Math.round(p.totalDamage / (dungeonTime / 10)) : 0
            };
          }
        });
        saveLobbyFinalStats(activeLobbyCode, totDmg, dungeonTime, psMap);
        broadcastCombatEvent(activeLobbyCode, {
          t: 'victory',
          loot: finalDrops
        });
      }
    }
  }, [playVictory, rollLoot, selectedDungeon, activeLobbyCode, activeLobbyData, players, dungeonTime]);

  // Manual player actions
  const handleUserBasicAttack = () => {
    if (isPaused || battleResult || isTransitioning || !selectedDungeon) return;
    const activePlayer = players.find(p => p.uid === PLAYER_UID) || players[0];
    if (!activePlayer || activePlayer.isDead || activePlayer.cooldown < 100 || activePlayer.stunTimer > 0 || activePlayer.freezeTimer > 0) return;

    const targetEnemy = enemies.find(e => !e.isDead);
    if (!targetEnemy) return;

    const isCrit = Math.random() < 0.15;
    const dmg = Math.round((activePlayer.monster.stats?.attack || 45) * (isCrit ? 1.6 : 1) * (0.95 + Math.random() * 0.15));

    if (activeLobbyCode) {
      broadcastCombatEvent(activeLobbyCode, {
        t: 'pa',
        au: PLAYER_UID,
        an: localPlayerName,
        ti: targetEnemy.index,
        d: dmg,
        c: isCrit
      });
      setPlayers(prev => prev.map(p => (p.uid ? p.uid === PLAYER_UID : p.index === activePlayer.index) ? { ...p, cooldown: 0 } : p));
      return;
    }

    // Singleplayer fallback
    spawnSpellAnimation('attack', 0, targetEnemy.index, undefined, enemies.length);
    playAttack();

    setTimeout(() => {
      setEnemies((currentEnems) => {
        const nextEnems = currentEnems.map((e) => {
          if (e.index === targetEnemy.index && !e.isDead) {
            let finalDmg = dmg;
            let nextShield = e.shield;
            if (e.shield > 0) {
              const absorbed = Math.min(e.shield, finalDmg);
              finalDmg -= absorbed;
              nextShield -= absorbed;
            }
            const nextHP = Math.max(0, e.currentHP - finalDmg);
            addPopup(dmg, false, false, e.index, isCrit, enemies.length);
            if (isCrit) playCritical(); else playHit();

            if (nextHP <= 0) {
              addLog(`💀 ${getLoc(e.monster.name, 'cz')} byl poražen!`, 'death');
              return { ...e, currentHP: 0, shield: 0, isDead: true };
            }
            return { ...e, currentHP: nextHP, shield: nextShield };
          }
          return e;
        });

        const allEnemiesDead = nextEnems.every((e) => e.isDead);
        if (allEnemiesDead) {
          const currW = currentWaveRef.current;
          const totalW = selectedDungeonRef.current?.waves.length || selectedDungeon.waves.length;
          if (currW < totalW) {
            advanceWave(currW + 1);
          } else {
            triggerVictory();
          }
        }
        return nextEnems;
      });
    }, 200);

    addLog(`⚔️ [VY] ${getLoc(activePlayer.monster.name, 'cz')} zaútočil na ${getLoc(targetEnemy.monster.name, 'cz')} za ${dmg} DMG.`, 'player');

    setPlayers(currentPlayers => currentPlayers.map(pl => 
      (pl.uid ? pl.uid === PLAYER_UID : pl.index === 0) 
        ? { ...pl, cooldown: 0, totalDamage: pl.totalDamage + dmg, threat: pl.threat + dmg * 0.9 }
        : pl
    ));
  };

  // User Agro / Taunt ability to pull enemy threat to yourself
  const handleUserTaunt = () => {
    if (isPaused || battleResult || isTransitioning || !selectedDungeon) return;
    const p = players.find(pl => pl.uid === PLAYER_UID) || players[0];
    if (!p || p.isDead || p.stunTimer > 0 || p.freezeTimer > 0) return;

    // Check energy cost (20 energy)
    if (p.energy < 20) return;

    // Find highest threat among players to surpass it
    const maxThreat = Math.max(...players.map(pl => pl.threat || 0), 100);
    const addedThreat = maxThreat + 500;

    if (activeLobbyCode) {
      broadcastCombatEvent(activeLobbyCode, {
        t: 'taunt',
        au: PLAYER_UID,
        an: localPlayerName,
        threat: addedThreat
      });
      return;
    }

    triggerShake('rgba(245, 158, 11, 0.4)');
    playSpell();
    addLog(`🛡️ [VY] ${getLoc(p.monster.name, 'cz')} použil PROVOKACI (AGRO) a strhl pozornost nepřátel!`, 'player');

    setPlayers(prevPls => prevPls.map(pl => 
      (pl.uid ? pl.uid === PLAYER_UID : pl.index === 0) 
        ? { ...pl, energy: pl.energy - 20, threat: pl.threat + addedThreat } 
        : pl
    ));
  };

  // Dynamic user execution of character's monster abilities
  const handleUserExecuteAbility = (abilityIndex: number) => {
    if (isPaused || battleResult || isTransitioning || !selectedDungeon) return;
    const p = players.find(pl => pl.uid === PLAYER_UID) || players[0];
    if (!p || p.isDead || p.stunTimer > 0 || p.freezeTimer > 0) return;

    const ability = p.monster.abilities?.[abilityIndex];
    if (!ability) return;

    const cost = ability.type === 'heal' || ability.type === 'regen' ? 30 : 40;
    if (p.energy < cost) return;

    const isHeal = ability.type === 'heal' || ability.type === 'regen';
    
    if (isHeal) {
      const livingPlayers = players.filter((pl) => !pl.isDead);

      if (livingPlayers.length > 0) {
        const totalGroupHeal = livingPlayers.reduce((sum, pl) => sum + Math.round(pl.maxHP * 0.25), 0);

        if (activeLobbyCode) {
          broadcastCombatEvent(activeLobbyCode, {
            t: 'ab',
            au: PLAYER_UID,
            an: localPlayerName,
            ab: ability.name,
            h: true,
            d: 0.25 // 25% maxHP heal to all party members
          });
          setShowSkillsMenu(false);
          return;
        }

        addLog(`✨ [VY] ${getLoc(p.monster.name, 'cz')} seslal PLOŠNÉ LÉČENÍ SKUPINY ${getLoc(ability.name, 'cz')} (+25% HP všem)!`, 'heal');
        playHeal();

        livingPlayers.forEach((pl) => {
          spawnSpellAnimation('heal', p.index, pl.index);
          const healAmount = Math.round(pl.maxHP * 0.25);
          
          setTimeout(() => {
            addPopup(healAmount, true, false, pl.index, true);
            setPlayers((prevPls) => prevPls.map((target) => {
              if (target.index === pl.index && !target.isDead) {
                return { ...target, currentHP: Math.min(target.maxHP, target.currentHP + healAmount) };
              }
              return target;
            }));
          }, 200);
        });

        setPlayers((prevPls) => prevPls.map((pl) => 
          (pl.uid ? pl.uid === PLAYER_UID : pl.index === 0) 
            ? { ...pl, energy: pl.energy - cost, totalHealing: pl.totalHealing + totalGroupHeal, threat: pl.threat + totalGroupHeal * 0.5 } 
            : pl
        ));
      }
    } else {
      const targetEnemy = enemies.find(e => !e.isDead);
      if (!targetEnemy) return;

      const dmg = Math.round((p.monster.stats?.attack || 45) * 4.2);

      if (activeLobbyCode) {
        broadcastCombatEvent(activeLobbyCode, {
          t: 'ab',
          au: PLAYER_UID,
          an: localPlayerName,
          ab: ability.name,
          h: false,
          ti: targetEnemy.index,
          d: dmg
        });
        setShowSkillsMenu(false);
        return;
      }

      // Singleplayer fallback
      addLog(`💥 [VY] ${getLoc(p.monster.name, 'cz')} použil ${getLoc(ability.name, 'cz')} za ${dmg} DMG!`, 'player');
      spawnSpellAnimation('attack', 0, targetEnemy.index, getLoc(p.monster.type, 'cz'), enemies.length);
      playSpell();

      setTimeout(() => {
        setEnemies((currentEnems) => {
          const nextEnems = currentEnems.map((e) => {
            if (e.index === targetEnemy.index && !e.isDead) {
              let finalDmg = dmg;
              let nextShield = e.shield;
              if (e.shield > 0) {
                const absorbed = Math.min(e.shield, finalDmg);
                finalDmg -= absorbed;
                nextShield -= absorbed;
              }
              const nextHP = Math.max(0, e.currentHP - finalDmg);
              addPopup(dmg, false, false, e.index, true, enemies.length);
              playCritical();

              if (nextHP <= 0) {
                addLog(`💀 ${getLoc(e.monster.name, 'cz')} byl zničen!`, 'death');
                return { ...e, currentHP: 0, shield: 0, isDead: true };
              }
              return { ...e, currentHP: nextHP, shield: nextShield };
            }
            return e;
          });

          const allEnemiesDead = nextEnems.every((e) => e.isDead);
          if (allEnemiesDead) {
            const currW = currentWaveRef.current;
            const totalW = selectedDungeonRef.current?.waves.length || selectedDungeon.waves.length;
            if (currW < totalW) {
              advanceWave(currW + 1);
            } else {
              triggerVictory();
            }
          }
          return nextEnems;
        });
      }, 200);

      setPlayers((prevPls) => prevPls.map((pl) => 
        pl.index === 0 
          ? { ...pl, energy: pl.energy - cost, totalDamage: pl.totalDamage + dmg, threat: pl.threat + dmg * 1.8 } 
          : pl
      ));
    }
    setShowSkillsMenu(false);
  };

  // Realtime Combat Event Synchronizer (Multiplayer Sync)
  useEffect(() => {
    if (!activeLobbyCode) return;

    const unsubscribe = watchCombatEvents(activeLobbyCode, dungeonSessionStartTsRef.current, (evt: any) => {
      if (!evt) return;

      const evtType = evt.t || evt.type;
      const attackerUid = evt.au || evt.attackerUid;
      const attackerName = evt.an || evt.attackerName;
      const targetEnemyIdx = evt.ti !== undefined ? evt.ti : evt.targetEnemyIndex;
      const dmgVal = evt.d !== undefined ? evt.d : (evt.dmgOrHeal || evt.dmg || 0);
      const isCrit = evt.c !== undefined ? evt.c : evt.isCrit;
      const isHeal = evt.h !== undefined ? evt.h : evt.isHeal;
      const abilityName = evt.ab || evt.abilityName;
      const targetUid = evt.tu || evt.targetUid;

      // 0. Synchronized Wave Fight Start
      if (evtType === 'start_fight') {
        const spotY = evt.sy || (evt.w === 1 ? 1800 : (evt.w === 2 ? 1200 : 500));
        isStartingFightRef.current = true;
        setPlayerPos({ x: 300, y: spotY + 30 });
        setTargetPos({ x: 300, y: spotY + 30 });
        setIsPaused(true);
        setIsTransitioning(true);
        setTransitionText(evt.w === selectedDungeonRef.current?.waves.length ? 'FINÁLNÍ VLNA: VŠICHNI SHROMÁŽDĚNI! BOSS SE PROBOUZÍ!' : `VLNA ${evt.w || 1}: SHROMAŽDIŠTĚ OBSAZENO! BOJ ZAČÍNÁ! ⚔️`);
        playLevelUp();

        setTimeout(() => {
          setIsTransitioning(false);
          setIsFighting(true);
          setIsPaused(false);
        }, 2000);
        return;
      }

      // 1. Synchronized Player Basic Attack
      if (evtType === 'pa' || evtType === 'player_attack') {
        const attackerP = playersRef.current.find(p => p.uid === attackerUid);
        const attackerIdx = attackerP ? attackerP.index : 0;
        spawnSpellAnimation('attack', attackerIdx, targetEnemyIdx, undefined, enemiesRef.current.length || 3);
        playAttack();

        setTimeout(() => {
          setEnemies((currentEnems) => {
            const nextEnems = currentEnems.map((e) => {
              if (e.index === targetEnemyIdx && !e.isDead) {
                let finalDmg = dmgVal;
                let nextShield = e.shield;
                if (e.shield > 0) {
                  const absorbed = Math.min(e.shield, finalDmg);
                  finalDmg -= absorbed;
                  nextShield -= absorbed;
                }
                const nextHP = Math.max(0, e.currentHP - finalDmg);
                addPopup(dmgVal, false, false, e.index, isCrit, currentEnems.length);
                if (isCrit) playCritical(); else playHit();

                if (nextHP <= 0) {
                  addLog(`💀 ${getLoc(e.monster.name, 'cz')} byl poražen!`, 'death');
                  return { ...e, currentHP: 0, shield: 0, isDead: true };
                }
                return { ...e, currentHP: nextHP, shield: nextShield };
              }
              return e;
            });

            const allEnemiesDead = nextEnems.every((e) => e.isDead);
            if (allEnemiesDead) {
              const isHost = activeLobbyDataRef.current?.hostUid === PLAYER_UID;
              if (isHost) {
                const currW = currentWaveRef.current;
                const totalW = selectedDungeonRef.current?.waves.length || 3;
                if (currW < totalW) {
                  advanceWave(currW + 1);
                } else {
                  triggerVictory();
                }
              }
            }
            return nextEnems;
          });
        }, 200);

        addLog(`⚔️ ${attackerName} zaútočil na nepřítele za ${dmgVal} DMG.`, 'player');

        setPlayers((prevPls) => prevPls.map((pl) => {
          if (pl.uid === attackerUid) {
            return { ...pl, cooldown: 0, totalDamage: pl.totalDamage + dmgVal, threat: pl.threat + dmgVal * 0.9 };
          }
          return pl;
        }));
      }

      // 2. Synchronized Player Ability (Heal or Damage)
      if (evtType === 'ab' || evtType === 'player_ability') {
        const attackerP = playersRef.current.find(p => p.uid === attackerUid);
        const attackerIdx = attackerP ? attackerP.index : 0;

        if (isHeal) {
          addLog(`✨ ${attackerName} seslal plošné léčení ${getLoc(abilityName, 'cz')} (+25% HP pro všechny)!`, 'heal');
          playHeal();

          setPlayers((prevPls) => {
            let totalHealed = 0;
            const updated = prevPls.map((pl) => {
              if (!pl.isDead) {
                spawnSpellAnimation('heal', attackerIdx, pl.index);
                const healPercent = (dmgVal && dmgVal < 1) ? dmgVal : 0.25;
                const healAmt = (dmgVal && dmgVal >= 1) ? Math.round(dmgVal) : Math.round(pl.maxHP * healPercent);
                totalHealed += healAmt;
                setTimeout(() => {
                  addPopup(healAmt, true, false, pl.index, true);
                }, 200);
                return { ...pl, currentHP: Math.min(pl.maxHP, pl.currentHP + healAmt) };
              }
              return pl;
            });

            return updated.map((pl) => {
              if (pl.uid === attackerUid) {
                return {
                  ...pl,
                  energy: Math.max(0, pl.energy - 30),
                  totalHealing: pl.totalHealing + totalHealed,
                  threat: pl.threat + totalHealed * 0.5
                };
              }
              return pl;
            });
          });
        } else {
          spawnSpellAnimation('attack', attackerIdx, targetEnemyIdx, undefined, enemiesRef.current.length || 3);
          playSpell();

          setTimeout(() => {
            setEnemies((currentEnems) => {
              const nextEnems = currentEnems.map((e) => {
                if (e.index === targetEnemyIdx && !e.isDead) {
                  let finalDmg = dmgVal;
                  let nextShield = e.shield;
                  if (e.shield > 0) {
                    const absorbed = Math.min(e.shield, finalDmg);
                    finalDmg -= absorbed;
                    nextShield -= absorbed;
                  }
                  const nextHP = Math.max(0, e.currentHP - finalDmg);
                  addPopup(dmgVal, false, false, e.index, true, currentEnems.length);
                  playCritical();
                  if (nextHP <= 0) addLog(`💀 ${getLoc(e.monster.name, 'cz')} byl zničen!`, 'death');
                  return { ...e, currentHP: nextHP, shield: nextShield, isDead: nextHP <= 0 };
                }
                return e;
              });

              const allEnemiesDead = nextEnems.every((e) => e.isDead);
              if (allEnemiesDead) {
                const isHost = activeLobbyDataRef.current?.hostUid === PLAYER_UID;
                if (isHost) {
                  const currW = currentWaveRef.current;
                  const totalW = selectedDungeonRef.current?.waves.length || 3;
                  if (currW < totalW) {
                    advanceWave(currW + 1);
                  } else {
                    triggerVictory();
                  }
                }
              }
              return nextEnems;
            });
          }, 200);

          addLog(`💥 ${attackerName} seslal ${getLoc(abilityName, 'cz')} za ${dmgVal} DMG!`, 'player');

          setPlayers((prevPls) => prevPls.map((pl) => {
            if (pl.uid === attackerUid) {
              return {
                ...pl,
                energy: Math.max(0, pl.energy - 40),
                totalDamage: pl.totalDamage + dmgVal,
                threat: pl.threat + dmgVal * 1.8
              };
            }
            return pl;
          }));
        }
      }

      // Synchronized Wave Advance
      if (evtType === 'adv_wave') {
        const nextWave = evt.nw || 2;
        advanceWave(nextWave, true);
      }

      // Synchronized Victory
      if (evtType === 'victory') {
        triggerVictory(true, evt.loot);
      }

      // Synchronized Defeat
      if (evtType === 'defeat') {
        setBattleResult('lose');
        playDefeat();
        setIsPaused(true);
      }

      // 3. Synchronized Taunt Event (Agro pull)
      if (evtType === 'taunt') {
        const addedThreat = evt.threat || 600;
        triggerShake('rgba(245, 158, 11, 0.4)');
        playSpell();
        addLog(`🛡️ ${attackerName} použil PROVOKACI (AGRO) a strhl pozornost nepřátel!`, 'player');

        setPlayers((prevPls) => {
          return prevPls.map((pl) => {
            if (pl.uid === attackerUid) {
              return {
                ...pl,
                energy: Math.max(0, pl.energy - 20),
                threat: pl.threat + addedThreat
              };
            }
            return pl;
          });
        });

        setBossTargetUid(attackerUid);
        const pIdx = players.findIndex(p => p.uid === attackerUid);
        if (pIdx !== -1) setBossTargetIdx(pIdx);
      }

      // 3. Synchronized Host Enemy Attack & Spells
      if (evtType === 'ea' || evtType === 'enemy_attack') {
        const enemyIdx = evt.ei !== undefined ? evt.ei : 0;
        const targetPlayerIdx = evt.ti !== undefined ? evt.ti : 0;
        const targetPlayerUid = evt.tu || null;
        const isSwoop = evt.sw || false;
        const isAoe = evt.aoe || false;
        const elementKey = evt.el || null;

        if (targetPlayerUid) {
          setBossTargetUid(targetPlayerUid);
          const foundIdx = players.findIndex(p => p.uid === targetPlayerUid);
          if (foundIdx !== -1) setBossTargetIdx(foundIdx);
        } else {
          setBossTargetIdx(targetPlayerIdx);
        }

        if (isAoe) {
          setActiveExplosionIndices([0, 1, 2, 3]);
          setTimeout(() => setActiveExplosionIndices([]), 850);
          triggerShake('rgba(239, 68, 68, 0.55)');
          playSpell();
          players.forEach((p) => {
            if (!p.isDead) {
              spawnSpellAnimation('boss_attack', enemyIdx, p.index, elementKey || undefined, enemies.length || 3);
            }
          });

          setTimeout(() => {
            setPlayers((prevPls) => prevPls.map((p) => {
              if (!p.isDead) {
                const nextHP = Math.max(0, p.currentHP - dmgVal);
                addPopup(dmgVal, false, true, p.index, true);
                if (isCrit) playCritical(); else playHit();
                if (nextHP <= 0) playDeath();

                return {
                  ...p,
                  currentHP: nextHP,
                  isDead: nextHP <= 0,
                  burnTimer: elementKey === 'fire' ? 4.0 : p.burnTimer,
                  freezeTimer: elementKey === 'water' ? 2.5 : p.freezeTimer,
                  rootTimer: elementKey === 'nature' ? 3.0 : p.rootTimer,
                  cooldown: elementKey === 'lightning' ? 0 : p.cooldown
                };
              }
              return p;
            }));
          }, 350);
        } else if (isSwoop) {
          setSwoopEnemyIdx(enemyIdx);
          playSlash();
          triggerShake('rgba(239, 68, 68, 0.2)');
          setTimeout(() => setSwoopEnemyIdx(null), 800);

          setTimeout(() => {
            setPlayers((prevPls) => prevPls.map((p) => {
              const isHit = targetPlayerUid ? p.uid === targetPlayerUid : p.index === targetPlayerIdx;
              if (isHit && !p.isDead) {
                const nextHP = Math.max(0, p.currentHP - dmgVal);
                addPopup(dmgVal, false, true, p.index, isCrit);
                triggerShake(isCrit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)');
                if (isCrit) playCritical(); else playHit();
                if (nextHP <= 0) playDeath();

                return {
                  ...p,
                  currentHP: nextHP,
                  isDead: nextHP <= 0
                };
              }
              return p;
            }));
          }, 350);
        } else {
          spawnSpellAnimation('boss_attack', enemyIdx, targetPlayerIdx, undefined, enemies.length || 3);
          triggerEnemyAttackAnimation(enemyIdx);
          if (isCrit) playSpell(); else playAttack();

          setTimeout(() => {
            setPlayers((prevPls) => prevPls.map((p) => {
              const isHit = targetPlayerUid ? p.uid === targetPlayerUid : p.index === targetPlayerIdx;
              if (isHit && !p.isDead) {
                const nextHP = Math.max(0, p.currentHP - dmgVal);
                addPopup(dmgVal, false, true, p.index, isCrit);
                triggerShake(isCrit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)');
                if (isCrit) playCritical(); else playHit();
                if (nextHP <= 0) playDeath();

                return {
                  ...p,
                  currentHP: nextHP,
                  isDead: nextHP <= 0
                };
              }
              return p;
            }));
          }, 350);
        }
      }

      // 4. Synchronized Boss Drain
      if (evtType === 'boss_drain') {
        const drainDmg = evt.d || 150;
        const enemyIdx = evt.ei !== undefined ? evt.ei : 0;
        const targetUid = evt.tu || null;
        const targetIdx = evt.ti !== undefined ? evt.ti : 0;
        spawnSpellAnimation('boss_attack', enemyIdx, targetIdx, 'water', enemies.length || 3);
        playSpell();

        setTimeout(() => {
          setPlayers((prevPls) => prevPls.map((p) => {
            const isTarget = targetUid ? p.uid === targetUid : p.index === targetIdx;
            if (isTarget && !p.isDead) {
              const nextHP = Math.max(0, p.currentHP - drainDmg);
              addPopup(drainDmg, false, true, p.index, true);
              playCritical();
              if (nextHP <= 0) playDeath();
              return { ...p, currentHP: nextHP, isDead: nextHP <= 0 };
            }
            return p;
          }));

          setEnemies((prevEnems) => prevEnems.map((e) => {
            if (e.index === enemyIdx) {
              return { ...e, currentHP: Math.min(e.maxHP, e.currentHP + drainDmg) };
            }
            return e;
          }));
        }, 400);
      }

      // 5. Synchronized Boss Enrage
      if (evtType === 'boss_enrage') {
        playSpell();
        setBossEnraged(true);
        setBossEnrageCount(2);
        triggerShake('rgba(239, 68, 68, 0.4)');
      }

      // 6. Synchronized Minion Summon
      if (evtType === 'sm') {
        const minionData = evt.m;
        const minionHp = evt.hp || 1200;
        if (minionData) {
          playSpell();
          triggerShake('rgba(168, 85, 247, 0.25)');
          setEnemies((prevEnems) => {
            if (prevEnems.length >= 3) return prevEnems;
            const nextIdx = prevEnems.length;
            const minionEnemy: DungeonEnemy = {
              index: nextIdx,
              monster: minionData as Monster,
              currentHP: minionHp,
              maxHP: minionHp,
              energy: 0,
              shield: 0,
              shieldMax: 0,
              isBoss: false,
              isDead: false,
            };
            return [...prevEnems, minionEnemy];
          });
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeLobbyCode]);

  // Main combat logic loops
  useEffect(() => {
    if (isPaused || battleResult || isTransitioning || enemiesRef.current.length === 0 || players.length === 0 || !selectedDungeon || !isFighting) {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
      return;
    }

    const intervalTime = 100;
    loopIntervalRef.current = setInterval(() => {
      setDungeonTime((t) => t + 1);

      setPlayers((currentPlayers) => {
        const allDead = currentPlayers.every((p) => p.isDead);
        if (allDead) {
          setBattleResult('lose');
          playDefeat();
          setIsPaused(true);

          if (activeLobbyCode) {
            const isHost = activeLobbyDataRef.current?.hostUid === PLAYER_UID;
            if (isHost) {
              const totDmg = currentPlayers.reduce((sum, p) => sum + p.totalDamage, 0);
              const psMap: Record<string, { totalDamage: number; totalHealing: number; dps: number }> = {};
              currentPlayers.forEach(p => {
                if (p.uid) {
                  psMap[p.uid] = {
                    totalDamage: p.totalDamage,
                    totalHealing: p.totalHealing,
                    dps: dungeonTime > 0 ? Math.round(p.totalDamage / (dungeonTime / 10)) : 0
                  };
                }
              });
              saveLobbyFinalStats(activeLobbyCode, totDmg, dungeonTime, psMap);
              broadcastCombatEvent(activeLobbyCode, {
                t: 'defeat'
              });
            }
          }
          return currentPlayers;
        }

        // 1. Enemies Attack Timer (In multiplayer, HOST is the single source of truth for enemy actions)
        const isMultiplayer = Boolean(activeLobbyCode);
        const isHost = !isMultiplayer || activeLobbyDataRef.current?.hostUid === PLAYER_UID;

        if (isHost) {
          nextBossAttackRef.current += 0.1;
          const bossAttackInterval = 1.0;

          if (nextBossAttackRef.current >= bossAttackInterval) {
            nextBossAttackRef.current = 0;
            const aliveEnemies = enemiesRef.current.filter((e) => !e.isDead);
            const alivePlayers = currentPlayers.filter((p) => !p.isDead);

            if (aliveEnemies.length > 0 && alivePlayers.length > 0) {
              const target = alivePlayers.reduce((prev, curr) => (curr.threat > prev.threat ? curr : prev), alivePlayers[0]);
              setBossTargetIdx(target.index);
              if (target.uid) setBossTargetUid(target.uid);

              aliveEnemies.forEach((enemy, eIdx) => {
                const rageMultiplier = (enemy.isBoss && bossEnraged) ? 1.5 : 1.0;
                const isSpecial = Math.random() < 0.25;
                const enemyAtk = enemy.monster.stats?.attack || (enemy.isBoss ? 450 : 260);
                let dmg = Math.round(enemyAtk * (isSpecial ? 2.0 : 1.2) * (0.9 + Math.random() * 0.25) * rageMultiplier);
                const targetDef = target.monster.stats?.defense || 20;
                const finalDmg = Math.max(80, dmg - Math.round(targetDef * 1.2));
                const isSwoop = Math.random() < 0.30;

                if (isMultiplayer) {
                  setTimeout(() => {
                    broadcastCombatEvent(activeLobbyCode!, {
                      t: 'ea',
                      ei: enemy.index,
                      ti: target.index,
                      tu: target.uid,
                      d: finalDmg,
                      c: isSpecial,
                      sw: isSwoop,
                      ts: Date.now() + eIdx * 10
                    });
                  }, eIdx * 250);
                  return;
                }

                if (isSwoop) {
                  addLog(`🛩️ ${getLoc(enemy.monster.name, 'cz')} zahájil NÁLET (střemhlavý útok)!`, 'boss');
                  setSwoopEnemyIdx(enemy.index);
                  playSlash();
                  triggerShake('rgba(239, 68, 68, 0.2)');

                  setTimeout(() => {
                    setSwoopEnemyIdx(null);
                  }, 800);

                  setTimeout(() => {
                    setPlayers((prevPls) => prevPls.map((p) => {
                      const isHit = (target.uid && p.uid ? p.uid === target.uid : p.index === target.index) || (enemy.isBoss && Math.abs(p.index - target.index) <= 1);
                      if (isHit && !p.isDead) {
                        const finalDmg = Math.max(30, Math.round(dmg * 0.9));
                        addPopup(finalDmg, false, true, p.index, true);
                        playHit();
                        return { 
                          ...p, 
                          currentHP: Math.max(0, p.currentHP - finalDmg),
                          isDead: p.currentHP - finalDmg <= 0,
                          threat: p.currentHP - finalDmg <= 0 ? 0 : Math.max(0, p.threat - finalDmg * 0.1)
                        };
                      }
                      return p;
                    }));
                  }, 400);
                } else {
                  spawnSpellAnimation('boss_attack', enemy.index, target.index, getLoc(enemy.monster.type, 'cz'), enemiesRef.current.length);
                  triggerEnemyAttackAnimation(enemy.index);
                  if (isSpecial) playSpell(); else playAttack();

                  setTimeout(() => {
                    setPlayers((prevPls) => {
                      return prevPls.map((p) => {
                        const isTargetPlayer = (target.uid && p.uid ? p.uid === target.uid : p.index === target.index);
                        if (isTargetPlayer && !p.isDead) {
                          const finalDmg = Math.max(25, dmg - Math.round((p.monster.stats?.defense || 10) * 1.1));
                          const nextHP = Math.max(0, p.currentHP - finalDmg);
                          
                          addPopup(finalDmg, false, true, p.index, isSpecial);
                          triggerShake(isSpecial ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)');
                          if (isSpecial) playCritical(); else playHit();
                          
                          if (nextHP <= 0) {
                            playDeath();
                            addLog(`☠️ ${getLoc(enemy.monster.name, 'cz')} porazil monstrum ${getLoc(p.monster.name, 'cz')}!`, 'death');
                            return { ...p, currentHP: 0, isDead: true, threat: 0 };
                          } else {
                            if (isSpecial) {
                              addLog(`🔥 ${getLoc(enemy.monster.name, 'cz')} seslal kritický úder na ${getLoc(p.monster.name, 'cz')} za ${finalDmg} DMG!`, 'boss');
                            } else {
                              addLog(`💥 ${getLoc(enemy.monster.name, 'cz')} zasáhl ${getLoc(p.monster.name, 'cz')} za ${finalDmg} DMG.`, 'boss');
                            }
                            return { ...p, currentHP: nextHP, threat: Math.max(0, p.threat - finalDmg * 0.1) };
                          }
                        }
                        return p;
                      });
                    });
                  }, 500);
                }

                // Decrement boss enrage counters
                if (enemy.isBoss && bossEnraged) {
                  setBossEnrageCount((c) => {
                    if (c - 1 <= 0) {
                      setBossEnraged(false);
                      addLog(`🌋 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} se uklidnil a zuřivost pominula.`, 'info');
                      return 0;
                    }
                    return c - 1;
                  });
                }
              });
            }
          }
        }

        // 2. Enemies Energy & Custom Spells Casting
        if (isHost) {
          setEnemies((currentEnemies) => {
            return currentEnemies.map((enemy) => {
              if (enemy.isDead) return enemy;
              const nextEnergy = enemy.energy + 1.5;
              if (nextEnergy >= 100) {
                const alivePls = currentPlayers.filter(p => !p.isDead);
                
                if (alivePls.length > 0) {
                  const targetPl = alivePls[Math.floor(Math.random() * alivePls.length)];
                  const spellRoll = Math.random();

                  if (enemy.isBoss) {
                    const element = (getLoc(enemy.monster.type, 'cz') || '').toLowerCase();

                    triggerEnemyAttackAnimation(enemy.index);

                    // 5 Special Boss Actions
                    if (spellRoll < 0.35) {
                      // Element-Specific AOE
                      let elKey = 'fire';
                      let baseDmg = 280;

                      if (element.includes('ohn') || element.includes('fire')) {
                        elKey = 'fire';
                        baseDmg = 280;
                        addLog(`🌋 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} VYVOLAL KATAKLYZMA (Ohnivý déšť na všechny)!`, 'boss');
                      } else if (element.includes('vod') || element.includes('water')) {
                        elKey = 'water';
                        baseDmg = 150;
                        addLog(`❄️ BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} SESLAL BLIZZARD (Plošné zmrazení skupiny)!`, 'boss');
                      } else if (element.includes('pří') || element.includes('nature') || element.includes('leaf')) {
                        elKey = 'nature';
                        baseDmg = 160;
                        addLog(`🌿 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} SESLAL ŠTĚPIVÉ KOŘENY (Znehybnění všech)!`, 'boss');
                      } else {
                        elKey = 'lightning';
                        baseDmg = 200;
                        addLog(`⚡ BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} SESLAL BLESKOVOU BOUŘI (Elektrické smažení)!`, 'boss');
                      }

                      if (isMultiplayer) {
                        broadcastCombatEvent(activeLobbyCode!, {
                          t: 'ea',
                          ei: enemy.index,
                          ti: 0,
                          d: baseDmg,
                          c: true,
                          sw: false,
                          aoe: true,
                          el: elKey
                        });
                      } else {
                        setActiveExplosionIndices([0, 1, 2, 3]);
                        setTimeout(() => setActiveExplosionIndices([]), 850);
                        triggerShake('rgba(239, 68, 68, 0.55)');
                        playSpell();
                        alivePls.forEach((p) => {
                          spawnSpellAnimation('boss_attack', enemy.index, p.index, elKey, currentEnemies.length);
                          setTimeout(() => {
                            setPlayers((prevPls) => prevPls.map((pl) => {
                              if (pl.index === p.index && !pl.isDead) {
                                const finalD = Math.round(baseDmg * (0.8 + Math.random() * 0.4));
                                addPopup(finalD, false, true, pl.index, true);
                                playHit();
                                return { 
                                  ...pl, 
                                  currentHP: Math.max(0, pl.currentHP - finalD),
                                  burnTimer: elKey === 'fire' ? 4.0 : pl.burnTimer,
                                  freezeTimer: elKey === 'water' ? 2.5 : pl.freezeTimer,
                                  rootTimer: elKey === 'nature' ? 3.0 : pl.rootTimer,
                                  cooldown: elKey === 'lightning' ? 0 : pl.cooldown
                                };
                              }
                              return pl;
                            }));
                          }, 500);
                        });
                      }
                    } else if (spellRoll < 0.55) {
                      // Shockwave AOE
                      addLog(`🌋 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} VYVOLAL ZEMNÍ RÁZOVOU VLNU (Plošný výbuch)!`, 'boss');
                      if (isMultiplayer) {
                        broadcastCombatEvent(activeLobbyCode!, {
                          t: 'ea',
                          ei: enemy.index,
                          ti: 0,
                          d: 220,
                          c: true,
                          sw: false,
                          aoe: true,
                          el: 'earth'
                        });
                      } else {
                        triggerShake('rgba(239, 68, 68, 0.65)');
                        playSpell();
                        setActiveExplosionIndices([0, 1, 2, 3]);
                        setTimeout(() => setActiveExplosionIndices([]), 850);

                        alivePls.forEach((p) => {
                          spawnSpellAnimation('boss_attack', enemy.index, p.index, undefined, currentEnemies.length);
                          setTimeout(() => {
                            setPlayers((prevPls) => prevPls.map((pl) => {
                              if (pl.index === p.index && !pl.isDead) {
                                const dmgVal = Math.round(220 * (0.85 + Math.random() * 0.3));
                                addPopup(dmgVal, false, true, pl.index, true);
                                playHit();
                                return { ...pl, currentHP: Math.max(0, pl.currentHP - dmgVal) };
                              }
                              return pl;
                            }));
                          }, 500);
                        });
                      }
                    } else if (spellRoll < 0.70) {
                      // Life Drain
                      const drain = Math.round(targetPl.maxHP * 0.18);
                      addLog(`🩸 BOSS ${getLoc(enemy.monster.name, 'cz')} vysál životy z ${getLoc(targetPl.monster.name, 'cz')}!`, 'boss');
                      if (isMultiplayer) {
                        broadcastCombatEvent(activeLobbyCode!, {
                          t: 'boss_drain',
                          ei: enemy.index,
                          tu: targetPl.uid,
                          ti: targetPl.index,
                          d: drain
                        });
                      } else {
                        spawnSpellAnimation('boss_attack', enemy.index, targetPl.index, 'water', currentEnemies.length);
                        playSpell();
                        setTimeout(() => {
                          setPlayers((prevPls) => prevPls.map((pl) => {
                            if (pl.index === targetPl.index && !pl.isDead) {
                              addPopup(drain, false, true, pl.index, true);
                              playCritical();
                              setEnemies((prevEnems) => prevEnems.map((e) => {
                                if (e.index === enemy.index) return { ...e, currentHP: Math.min(e.maxHP, e.currentHP + drain) };
                                return e;
                              }));
                              return { ...pl, currentHP: Math.max(0, pl.currentHP - drain) };
                            }
                            return pl;
                          }));
                        }, 500);
                      }
                    } else if (spellRoll < 0.80) {
                      // Boss Bojový vztek (Enrage) Buff
                      addLog(`🌋 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} PROPÁDÁ ZUŘIVOSTI (+50% DMG na příští 2 útoky)!`, 'boss');
                      if (isMultiplayer) {
                        broadcastCombatEvent(activeLobbyCode!, {
                          t: 'boss_enrage',
                          ei: enemy.index
                        });
                      } else {
                        playSpell();
                        setBossEnraged(true);
                        setBossEnrageCount(2);
                        triggerShake('rgba(239, 68, 68, 0.4)');
                      }
                    } else if (spellRoll < 0.90 && currentEnemies.length < 3) {
                      // Summon a rare helper minion to flank the boss!
                      const pool = rareMonsters.length > 0 ? rareMonsters : epicMonsters;
                      const m = pool[Math.floor(Math.random() * pool.length)];
                      addLog(`👿 BOSS ${getLoc(enemy.monster.name, 'cz')} VYVOLAL POMOCNÍKA ${getLoc(m.name, 'cz').toUpperCase()}!`, 'boss');

                      const minionMonsterData = {
                        ...(m as any),
                        name: {
                          cz: `Pomocník ${getLoc(m.name, 'cz')}`,
                          en: `Minion ${getLoc(m.name, 'en')}`,
                        },
                        image: (m as any).image || `/monsters/${m.id}.png`,
                        level: 10,
                      };

                      if (isMultiplayer) {
                        broadcastCombatEvent(activeLobbyCode!, {
                          t: 'sm',
                          m: minionMonsterData,
                          hp: 1200
                        });
                      } else {
                        playSpell();
                        triggerShake('rgba(168, 85, 247, 0.25)');
                        setTimeout(() => {
                          setEnemies((prevEnems) => {
                            if (prevEnems.length >= 3) return prevEnems;
                            const nextIdx = prevEnems.length;
                            const minionEnemy: DungeonEnemy = {
                              index: nextIdx,
                              monster: minionMonsterData as Monster,
                              currentHP: 1200,
                              maxHP: 1200,
                              energy: 0,
                              shield: 0,
                              shieldMax: 0,
                              isBoss: false,
                              isDead: false,
                            };
                            return [...prevEnems, minionEnemy];
                          });
                        }, 100);
                      }
                    }
                    }
                  }
                  return { ...enemy, energy: 0 };
                }
                return { ...enemy, energy: nextEnergy };
              });
            });
          }

        // 3. Update Players (automated basic attacks and AI abilities)
        return currentPlayers.map((p) => {
          if (p.isDead) return p;

          const nextStun = Math.max(0, p.stunTimer - 0.1);
          const nextFreeze = Math.max(0, p.freezeTimer - 0.1);
          const nextRoot = Math.max(0, p.rootTimer - 0.1);
          const nextBurn = Math.max(0, p.burnTimer - 0.1);

          let finalHP = p.currentHP;
          if (p.burnTimer > 0) {
            finalHP = Math.max(0, p.currentHP - 25);
          }

          if (finalHP <= 0 && p.currentHP > 0) {
            addLog(`☠️ ${getLoc(p.monster.name, 'cz')} uhořel v plamenech!`, 'death');
            playDeath();
            return { 
              ...p, 
              currentHP: 0, 
              isDead: true, 
              threat: 0,
              stunTimer: 0,
              freezeTimer: 0,
              rootTimer: 0,
              burnTimer: 0
            };
          }

          const isStunned = nextStun > 0;
          const isFrozen = nextFreeze > 0;
          const isRooted = nextRoot > 0;

          const nextEnergy = Math.min(100, p.energy + 1.2);
          let nextCd = p.cooldown + (isStunned || isFrozen ? 0 : 5.0);

          if (p.index === 0 || activeLobbyCode) {
            return {
              ...p,
              currentHP: finalHP,
              cooldown: Math.min(100, nextCd),
              energy: nextEnergy,
              stunTimer: nextStun,
              freezeTimer: nextFreeze,
              rootTimer: nextRoot,
              burnTimer: nextBurn
            };
          }

          let finalTotalHealing = p.totalHealing;
          let finalTotalDamage = p.totalDamage;
          let finalThreat = p.threat;

          if (nextCd >= 100 && !isStunned && !isFrozen) {
            nextCd = 0;
            const canCastAbility = nextEnergy >= 40 && p.monster.abilities && p.monster.abilities.length > 0;
            const useAbility = canCastAbility && Math.random() < 0.45;

            const targetEnemy = enemiesRef.current.find(e => !e.isDead);
            if (!targetEnemy) return p;

            if (useAbility && p.monster.abilities) {
              const ability = p.monster.abilities[Math.floor(Math.random() * p.monster.abilities.length)];
              const type = ability.type || 'attack';
              
              if (type === 'heal' || type === 'regen') {
                const injured = [...currentPlayers]
                  .filter((pl) => !pl.isDead)
                  .sort((a, b) => (a.currentHP / a.maxHP) - (b.currentHP / b.maxHP))[0];
                
                if (injured) {
                  const healAmount = Math.round(injured.maxHP * 0.28);
                  spawnSpellAnimation('heal', p.index, injured.index);
                  playHeal();

                  setTimeout(() => {
                    setPlayers((prevPls) => prevPls.map((pl) => {
                      if (pl.index === injured.index && !pl.isDead) {
                        addPopup(healAmount, true, false, injured.index);
                        return { ...pl, currentHP: Math.min(pl.maxHP, pl.currentHP + healAmount) };
                      }
                      return pl;
                    }));
                  }, 500);

                  addLog(`✨ ${getLoc(p.monster.name, 'cz')} použil ${getLoc(ability.name, 'cz')} na ${getLoc(injured.monster.name, 'cz')} (+${healAmount} HP)!`, 'heal');
                  finalTotalHealing += healAmount;
                  finalThreat += healAmount * 0.5;
                }
              } else {
                const isCrit = Math.random() < 0.25;
                const dmgBase = (p.monster.stats?.attack || 45) * 2.5;
                const dmg = Math.round(dmgBase * (isCrit ? 1.6 : 1) * (0.9 + Math.random() * 0.2));

                spawnSpellAnimation('attack', p.index, targetEnemy.index, getLoc(p.monster.type, 'cz'), enemiesRef.current.length);
                playSpell();

                setTimeout(() => {
                  setEnemies((currentEnems) => {
                    const nextEnems = currentEnems.map((e) => {
                      if (e.index === targetEnemy.index && !e.isDead) {
                        let finalDmg = dmg;
                        let nextShield = e.shield;
                        if (e.shield > 0) {
                          const absorbed = Math.min(e.shield, finalDmg);
                          finalDmg -= absorbed;
                          nextShield -= absorbed;
                        }
                        const nextHP = Math.max(0, e.currentHP - finalDmg);
                        addPopup(dmg, false, false, e.index, isCrit, enemiesRef.current.length);
                        if (isCrit) playCritical(); else playHit();

                        if (nextHP <= 0) {
                          addLog(`💀 ${getLoc(e.monster.name, 'cz')} byl zničen!`, 'death');
                          return { ...e, currentHP: 0, shield: 0, isDead: true };
                        }
                        return { ...e, currentHP: nextHP, shield: nextShield };
                      }
                      return e;
                    });

                    const allEnemiesDead = nextEnems.every((e) => e.isDead);
                    if (allEnemiesDead) {
                      setTimeout(() => {
                        const currW = currentWaveRef.current;
                        const totalW = selectedDungeonRef.current?.waves.length || selectedDungeon.waves.length;
                        if (currW < totalW) {
                          advanceWave(currW + 1);
                        } else {
                          triggerVictory();
                        }
                      }, 0);
                    }

                    return nextEnems;
                  });
                }, 500);

                addLog(`⚔️ ${getLoc(p.monster.name, 'cz')} seslal ${getLoc(ability.name, 'cz')} na ${getLoc(targetEnemy.monster.name, 'cz')} za ${dmg} DMG!`, 'player');
                finalTotalDamage += dmg;
                finalThreat += dmg * 1.2;
              }

              return { 
                ...p, 
                cooldown: 0, 
                energy: Math.max(0, nextEnergy - 40),
                totalDamage: finalTotalDamage,
                totalHealing: finalTotalHealing,
                threat: finalThreat,
                stunTimer: nextStun,
                freezeTimer: nextFreeze,
                rootTimer: nextRoot,
                burnTimer: nextBurn
              };
            } else {
              const isCrit = Math.random() < 0.1;
              const dmg = Math.round((p.monster.stats?.attack || 45) * (isCrit ? 1.5 : 1) * (0.9 + Math.random() * 0.2));
              
              spawnSpellAnimation('attack', p.index, targetEnemy.index, undefined, enemiesRef.current.length);
              playAttack();

              setTimeout(() => {
                setEnemies((currentEnems) => {
                  const nextEnems = currentEnems.map((e) => {
                    if (e.index === targetEnemy.index && !e.isDead) {
                      let finalDmg = dmg;
                      let nextShield = e.shield;
                      if (e.shield > 0) {
                        const absorbed = Math.min(e.shield, finalDmg);
                        finalDmg -= absorbed;
                        nextShield -= absorbed;
                      }
                      const nextHP = Math.max(0, e.currentHP - finalDmg);
                      addPopup(dmg, false, false, e.index, isCrit, enemiesRef.current.length);
                      if (isCrit) playCritical(); else playHit();

                      if (nextHP <= 0) {
                        addLog(`💀 ${getLoc(e.monster.name, 'cz')} byl zničen!`, 'death');
                        return { ...e, currentHP: 0, shield: 0, isDead: true };
                      }
                      return { ...e, currentHP: nextHP, shield: nextShield };
                    }
                    return e;
                  });

                  const allEnemiesDead = nextEnems.every((e) => e.isDead);
                  if (allEnemiesDead) {
                    setTimeout(() => {
                      const currW = currentWaveRef.current;
                      const totalW = selectedDungeonRef.current?.waves.length || selectedDungeon.waves.length;
                      if (currW < totalW) {
                        advanceWave(currW + 1);
                      } else {
                        triggerVictory();
                      }
                    }, 0);
                  }

                  return nextEnems;
                });
              }, 500);

              finalTotalDamage += dmg;
              finalThreat += dmg * 0.9;
              return { 
                ...p, 
                cooldown: 0, 
                energy: nextEnergy,
                totalDamage: finalTotalDamage,
                threat: finalThreat,
                stunTimer: nextStun,
                freezeTimer: nextFreeze,
                rootTimer: nextRoot,
                burnTimer: nextBurn
              };
            }
          }

          const decayedThreat = isRooted ? finalThreat : Math.max(0, finalThreat - 2.5);
          return { 
            ...p, 
            cooldown: nextCd, 
            energy: nextEnergy,
            threat: decayedThreat,
            currentHP: finalHP,
            totalHealing: finalTotalHealing,
            stunTimer: nextStun,
            freezeTimer: nextFreeze,
            rootTimer: nextRoot,
            burnTimer: nextBurn
          };
        });
      });
    }, intervalTime);

    return () => {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, [isPaused, currentWave, battleResult, isTransitioning, advanceWave, triggerVictory, bossEnraged, rareMonsters, epicMonsters, selectedDungeon, isFighting]);

  const handleBackClick = () => {
    if (selectedDungeon) {
      setIsFighting(false);
      setBattleResult(null);
      setIsPaused(true);
      setIsInLobby(true);
      setLobbyMode('multiplayer');
      setMultiplayerState('lobbies_list');
      setActiveLobbyCode(null);
      setActiveLobbyData(null);
    } else {
      onBack();
    }
  };

  const getElementColor = (type?: string | Localized<string>) => {
    const t = (typeof type === 'string' ? type : getLoc(type, 'cz') || '').toLowerCase();
    if (t.includes('ohn') || t.includes('fire')) return 'from-orange-500 to-red-600 shadow-orange-500/50';
    if (t.includes('vod') || t.includes('water')) return 'from-blue-500 to-indigo-600 shadow-blue-500/50';
    if (t.includes('pří') || t.includes('nature') || t.includes('leaf')) return 'from-emerald-500 to-green-600 shadow-emerald-500/50';
    return 'from-purple-500 to-indigo-600 shadow-purple-500/50';
  };

  const getSpellIcon = (type: string, element?: string) => {
    const t = (element || '').toLowerCase();
    if (type === 'heal') return <Heart size={20} className="text-emerald-400 fill-emerald-400 animate-pulse" />;
    if (t.includes('ohn') || t.includes('fire')) return <Flame size={22} className="text-orange-500 fill-orange-500 animate-bounce" />;
    if (t.includes('vod') || t.includes('water')) return <Droplets size={22} className="text-cyan-400 animate-pulse" />;
    if (t.includes('pří') || t.includes('nature') || t.includes('earth')) return <Leaf size={22} className="text-emerald-400 animate-bounce" />;
    if (type === 'boss_attack') return <Skull size={24} className="text-red-500 fill-red-950 animate-pulse" />;
    return <Sword size={20} className="text-white" />;
  };

  const formatTime = (ticks: number) => {
    const totalSecs = ticks / 10;
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDamageDealt = players.reduce((sum, p) => sum + p.totalDamage, 0);
  const mainPlayerStunned = players[0] && (players[0].stunTimer > 0 || players[0].freezeTimer > 0);

  // If no dungeon is selected, return directly to map
  if (!selectedDungeon) {
    onBack();
    return null;
  }

  // Dungeon Lobby / Mode Selection Screen
  if (selectedDungeon && isInLobby) {
    // 1. MODE CHOICE SCREEN (Solo vs Multiplayer)
    if (lobbyMode === null) {
      return (
        <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all animate-fade-in">
          <div className="absolute inset-0 z-0 opacity-30">
            <img src={selectedDungeon.backgroundImage} className="w-full h-full object-cover blur-sm brightness-[0.3]" />
            <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.9))" />
          </div>

          <div className="relative z-10 px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setSelectedDungeon(null);
                  setIsInLobby(false);
                  onBack();
                }}
                className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h2 className="text-[8px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-0.5">Dungeon Arena</h2>
                <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">VÝBĚR REŽIMU</h1>
              </div>
            </div>
          </div>

          <div className="flex-1 relative z-10 overflow-y-auto px-6 py-12 flex flex-col items-center justify-center gap-8 max-w-md mx-auto w-full">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-amber-400 tracking-wider uppercase">
                {getLoc(selectedDungeon.name, 'cz')}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Zvolte, zda chcete vstoupit do dungeonu sami s vlastní partou příšer, nebo hrát kooperativně s ostatními lovci online.
              </p>
            </div>

            <div className="w-full flex flex-col gap-4">
              {/* Solo option */}
              <button
                onClick={() => {
                  setLobbyMode('solo');
                  triggerHaptic('medium');
                }}
                className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 hover:from-slate-800/80 hover:to-slate-900/80 border border-white/5 hover:border-amber-500/30 rounded-3xl text-left transition-all duration-300 shadow-xl flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-1 pr-4">
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-500">Jedna osoba</span>
                  <h3 className="text-sm font-black text-white uppercase group-hover:text-amber-400 transition-colors">
                    Sólo Výprava 👤
                  </h3>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Vyberte až 4 vlastní příšery ze své sbírky a vyčistěte dungeon sami.
                  </p>
                </div>
                <ChevronLeft size={16} className="rotate-180 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
              </button>

              {/* Multiplayer option */}
              <button
                onClick={() => {
                  setLobbyMode('multiplayer');
                  setMultiplayerState('choice');
                  triggerHaptic('medium');
                }}
                className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 hover:from-slate-800/80 hover:to-slate-900/80 border border-white/5 hover:border-blue-500/30 rounded-3xl text-left transition-all duration-300 shadow-xl flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-1 pr-4">
                  <span className="text-[8px] font-black uppercase tracking-wider text-blue-400">Kooperace online</span>
                  <h3 className="text-sm font-black text-white uppercase group-hover:text-blue-400 transition-colors">
                    Multiplayer Lobby 👥
                  </h3>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Založte lobby nebo se připojte k ostatním online. Každý hráč ovládá 1 příšeru.
                  </p>
                </div>
                <ChevronLeft size={16} className="rotate-180 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. MULTIPLAYER SELECTION CHOICE
    if (lobbyMode === 'multiplayer' && multiplayerState === 'choice') {
      const handleHostLobby = async () => {
        const raidName = generateRandomRaidName();
        await createDungeonLobby(raidName, selectedDungeon.id, getLoc(selectedDungeon.name, 'cz'), PLAYER_UID, localPlayerName);
        setActiveLobbyCode(raidName);
        setMultiplayerState('lobby_room');
        triggerHaptic('heavy');
      };

      return (
        <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all animate-fade-in">
          <div className="absolute inset-0 z-0 opacity-30">
            <img src={selectedDungeon.backgroundImage} className="w-full h-full object-cover blur-sm brightness-[0.3]" />
            <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.9))" />
          </div>

          <div className="relative z-10 px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setSelectedDungeon(null);
                  setIsInLobby(false);
                  setLobbyMode(null);
                  triggerHaptic('light');
                  onBack();
                }}
                className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h2 className="text-[8px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-0.5">Dungeon Lobby</h2>
                <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">MULTIPLAYER</h1>
              </div>
            </div>
          </div>

          <div className="flex-1 relative z-10 overflow-y-auto px-6 py-12 flex flex-col items-center justify-center gap-6 max-w-md mx-auto w-full">
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-lg font-black text-blue-400 tracking-wider uppercase">
                COOPERATIVE DUNGEON
              </h2>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Založte novou místnost pro své přátele, nebo se připojte k již aktivním místnostem.
              </p>
            </div>

            <button
              onClick={handleHostLobby}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-blue-500/10 border-none"
            >
              👑 Založit Nové Lobby
            </button>

            <button
              onClick={() => {
                setMultiplayerState('lobbies_list');
                triggerHaptic('medium');
              }}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white border border-white/10 font-black text-xs uppercase tracking-widest rounded-2xl transition active:scale-95 cursor-pointer"
            >
              🔍 Najít Aktivní Lobby
            </button>
          </div>
        </div>
      );
    }

    // 3. MULTIPLAYER LOBBIES LIST
    if (lobbyMode === 'multiplayer' && multiplayerState === 'lobbies_list') {
      const activeLobbiesArray = Object.values(availableLobbies || {}).filter((l: any) => {
        if (!l || l.dungeonId !== selectedDungeon.id) return false;
        const playerKeys = Object.keys(l.players || {});
        if (playerKeys.length === 0) return false;
        if (l.status === 'waiting') {
          const expiresAt = l.expiresAt || (Date.now() + 120000);
          const remaining = Math.max(0, Math.round((expiresAt - nowTick) / 1000));
          if (remaining <= 0) return false;
        }
        return true;
      }).sort((a: any, b: any) => {
        if (a.status === 'waiting' && b.status !== 'waiting') return -1;
        if (a.status !== 'waiting' && b.status === 'waiting') return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      const generateRandomRaidName = () => {
        const adjs = [
          'Zmatený', 'Spící', 'Hladový', 'Opilý', 'Zuřivý', 'Legendární', 
          'Laggující', 'Kafíčkový', 'Ponožkový', 'Bramborový', 'Křupavý', 
          'Noobovský', 'Tryhard', 'Česnekový', 'Toxic', 'Sýrový', 'Pivní'
        ];
        const nouns = [
          'Cirkus', 'Klubík', 'Gang', 'Banda', 'Oddíl', 'Team', 
          'Squad', 'Pluk', 'Bratrstvo', 'Šílenci', 'Lovci', 'Chaos'
        ];
        const adj = adjs[Math.floor(Math.random() * adjs.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(10 + Math.random() * 90);
        return `${adj} ${noun} ${num}`;
      };

      const handleCreateNewLobby = async () => {
        hasStartedGameRef.current = false;
        const raidName = generateRandomRaidName();
        await createDungeonLobby(raidName, selectedDungeon.id, getLoc(selectedDungeon.name, 'cz'), PLAYER_UID, localPlayerName);
        setActiveLobbyCode(raidName);
        setMultiplayerState('lobby_room');
        triggerHaptic('heavy');
      };

      const handleJoinLobbyCode = async (lobbyId: string) => {
        hasStartedGameRef.current = false;
        const id = lobbyId.trim();
        if (!id) return;
        try {
          await joinDungeonLobby(id, PLAYER_UID, localPlayerName);
          setActiveLobbyCode(id);
          setMultiplayerState('lobby_room');
          triggerHaptic('heavy');
        } catch (err: any) {
          alert(err.message || 'Nelze se připojit k lobby!');
        }
      };

      return (
        <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all animate-fade-in">
          <div className="absolute inset-0 z-0 opacity-30">
            <img src={selectedDungeon.backgroundImage} className="w-full h-full object-cover blur-sm brightness-[0.3]" />
            <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.9))" />
          </div>

          <div className="relative z-10 px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setSelectedDungeon(null);
                  setIsInLobby(false);
                  setLobbyMode(null);
                  triggerHaptic('light');
                  onBack();
                }}
                className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h2 className="text-[8px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-0.5">
                  {getLoc(selectedDungeon.name, 'cz')}
                </h2>
                <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">AKTIVNÍ RAIDY</h1>
              </div>
            </div>
          </div>

          <div className="flex-1 relative z-10 overflow-y-auto px-6 py-6 flex flex-col gap-5 max-w-lg w-full mx-auto">
            {/* Create new lobby button at the top */}
            <button
              onClick={handleCreateNewLobby}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition active:scale-95 cursor-pointer shadow-lg shadow-amber-500/10 border-none flex items-center justify-center gap-2"
            >
              <span>👑</span> Vytvořit nový raid
            </button>

            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Dostupné raidy ({activeLobbiesArray.length})
                </h3>
                <button
                  onClick={handleRefreshLobbies}
                  disabled={isRefreshingLobbies}
                  className="p-1.5 px-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-white/10 transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Obnovit seznam raidů"
                >
                  <RefreshCw size={12} className={isRefreshingLobbies ? "animate-spin text-amber-400" : ""} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Obnovit</span>
                </button>
              </div>
              {activeLobbiesArray.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/30 border border-white/5 border-dashed rounded-3xl p-8 text-center min-h-[180px]">
                  <span className="text-2xl mb-2">📡</span>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Nebyly nalezeny žádné aktivní raidy. Vytvořte nový tlačítkem výše!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
                  {activeLobbiesArray.map((lobby: any) => {
                    const playersCount = Object.keys(lobby.players || {}).length;
                    const isStarted = lobby.status === 'started';
                    const expiresAt = lobby.expiresAt || (Date.now() + 120000);
                    const remaining = Math.max(0, Math.round((expiresAt - nowTick) / 1000));
                    const mins = Math.floor(remaining / 60);
                    const secs = (remaining % 60).toString().padStart(2, '0');

                    const startedAt = lobby.startedAt || lobby.createdAt || Date.now();
                    const elapsedSec = Math.max(0, Math.floor((nowTick - startedAt) / 1000));
                    const elapsedMins = Math.floor(elapsedSec / 60);
                    const elapsedSecsLeft = (elapsedSec % 60).toString().padStart(2, '0');

                    return (
                      <div 
                        key={lobby.id} 
                        onClick={() => {
                          if (!isStarted) handleJoinLobbyCode(lobby.id);
                        }}
                        className={cn(
                          "p-4 flex justify-between items-center transition",
                          isStarted 
                            ? "bg-slate-950/50 opacity-80 cursor-not-allowed border-l-2 border-l-red-500/60" 
                            : "hover:bg-slate-900/80 cursor-pointer group"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className={cn(
                              "text-xs font-black uppercase tracking-wide transition-colors",
                              isStarted ? "text-slate-400" : "text-white group-hover:text-amber-400"
                            )}>
                              {lobby.id}
                            </h4>
                            {isStarted && (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-[8px] uppercase tracking-wider flex items-center gap-1">
                                <Lock size={9} /> PROBÍHÁ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-slate-400 font-medium">
                            <span>Hostitel: <strong className="text-slate-200">{lobby.hostName}</strong></span>
                            {isStarted ? (
                              <span className="font-mono text-red-400/90">⏱️ Běží: <strong className="text-red-400">{elapsedMins}:{elapsedSecsLeft} min</strong></span>
                            ) : (
                              <span className="font-mono">⏳ Zbývá: <strong className="text-amber-400">{mins}:{secs}</strong></span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            {playersCount}/4 hráčů
                          </span>
                          {isStarted ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-slate-800/80 text-slate-500 font-black text-[9px] uppercase tracking-wider rounded-xl border border-white/5 flex items-center gap-1 cursor-not-allowed"
                            >
                              <Lock size={10} /> Zamčeno
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinLobbyCode(lobby.id);
                              }}
                              disabled={playersCount >= 4}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-xl transition active:scale-95 cursor-pointer border-none"
                            >
                              Vstoupit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 4. MULTIPLAYER LOBBY ROOM (LoL Style)
    if (lobbyMode === 'multiplayer' && multiplayerState === 'lobby_room') {
      if (!activeLobbyData) {
        return (
          <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col items-center justify-center text-white select-none">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Připojování k raidu...</p>
            </div>
          </div>
        );
      }

      const playersList = Object.values(activeLobbyData.players || {}).sort((a: any, b: any) => a.joinedAt - b.joinedAt) as any[];
      const myData = activeLobbyData.players[PLAYER_UID];
      const isHost = activeLobbyData.hostUid === PLAYER_UID;
      const status = activeLobbyData.status;
      const activeSlotsCount = playersList.length;
      const allPlayersHaveChosen = playersList.length > 0 && playersList.every((p: any) => p.monster !== null && (p.isLocked || p.isReady));

      const getMonsterRole = (monster: any) => {
        if (!monster) return null;
        const hp = monster.maxHP || monster.hp || 1000;
        if (hp >= 1300) return { label: 'TANK', icon: '🛡️', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
        if (hp <= 950) return { label: 'HEALER', icon: '💚', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
        return { label: 'DPS', icon: '⚔️', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      };

      const handleSelectMonsterLobby = (monster: Monster) => {
        if (myData?.isLocked) return;
        updateLobbyPlayerMonster(activeLobbyCode!, PLAYER_UID, monster);
        triggerHaptic('light');
      };

      const handleLockInMonster = () => {
        if (!myData?.monster) return;
        setPlayerMonsterLock(activeLobbyCode!, PLAYER_UID, !myData.isLocked);
        triggerHaptic('heavy');
      };

      const handleLeaveLobby = async () => {
        hasStartedGameRef.current = false;
        if (isHost) {
          await deleteDungeonLobby(activeLobbyCode!);
        } else {
          await leaveDungeonLobby(activeLobbyCode!, PLAYER_UID);
        }
        setActiveLobbyCode(null);
        setActiveLobbyData(null);
        setMultiplayerState('lobbies_list');
        triggerHaptic('light');
      };

      const handleStartMatchSearch = () => {
        setLobbyStatus(activeLobbyCode!, 'cf');
        triggerHaptic('heavy');
      };

      const handleAcceptMatch = () => {
        setPlayerAcceptance(activeLobbyCode!, PLAYER_UID, true);
        triggerHaptic('heavy');
      };

      const handleDeclineMatch = () => {
        resetLobbyToWaiting(activeLobbyCode!);
        triggerHaptic('medium');
      };

      return (
        <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all animate-fade-in">
          <div className="absolute inset-0 z-0 opacity-30">
            <img src={selectedDungeon.backgroundImage} className="w-full h-full object-cover blur-sm brightness-[0.3]" />
            <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.9))" />
          </div>

          {/* AFK MATCH FOUND MODAL */}
          {status === 'confirming' && (
            <div className="fixed inset-0 z-[9990] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-amber-500/20 flex flex-col items-center gap-5 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-amber-500 animate-pulse" />
                <span className="text-4xl animate-bounce">⚔️</span>
                <div>
                  <h2 className="text-sm font-black text-amber-400 uppercase tracking-widest">ZÁPAS NALEZEN!</h2>
                  <p className="text-[10px] text-slate-300 font-medium mt-1">Potvrďte účást v boji s týmem ({confirmCountdown}s)</p>
                </div>

                <div className="flex justify-center items-center gap-3 my-2">
                  {playersList.map((p: any) => (
                    <div 
                      key={p.uid} 
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300",
                        p.isAccepted 
                          ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                          : "bg-slate-800 border-white/20"
                      )}
                      title={p.name}
                    >
                      {p.isAccepted && <span className="text-[9px] font-black text-slate-950">✓</span>}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={handleDeclineMatch}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider transition border border-white/10 active:scale-95 cursor-pointer"
                  >
                    Odmítnout
                  </button>
                  <button
                    onClick={handleAcceptMatch}
                    disabled={myData?.isAccepted}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition border-none shadow-lg active:scale-95 cursor-pointer",
                      myData?.isAccepted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 shadow-amber-500/20"
                    )}
                  >
                    {myData?.isAccepted ? '✓ PŘIJATO' : 'PŘIJMOUT BOJ!'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3..2..1 LAUNCH COUNTDOWN OVERLAY */}
          {status === 'starting' && (
            <div className="fixed inset-0 z-[9995] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <span className="text-xs font-black text-amber-500 uppercase tracking-[0.5em]">Vstup do bojové arény</span>
                <h1 className="text-7xl font-black font-mono text-white tracking-widest animate-ping">
                  {launchCountdown > 0 ? launchCountdown : 'START!'}
                </h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Příprava bojové skupiny...</p>
              </motion.div>
            </div>
          )}

          {/* Header */}
          <div className="relative z-10 px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLeaveLobby}
                className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
                title="Zpět na mapu"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h2 className="text-[8px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-0.5">
                  {getLoc(selectedDungeon.name, 'cz')}
                </h2>
                <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">
                  {activeLobbyCode}
                </h1>
              </div>
            </div>

            {/* Countdown timer */}
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                {status === 'selecting' ? 'Čas na zámek' : 'Čas v lobby'}
              </span>
              <span className={cn(
                "text-sm font-mono font-black tracking-widest leading-none mt-0.5",
                lobbyCountdown <= 30 ? "text-red-400 animate-pulse" : "text-amber-400"
              )}>
                {Math.floor(lobbyCountdown / 60)}:{(lobbyCountdown % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="flex-1 relative z-10 overflow-y-auto px-6 py-4 flex flex-col gap-5 max-w-4xl w-full mx-auto">
            {/* Phase status banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-2xl flex items-center justify-center gap-2 backdrop-blur-md">
              <span className="animate-bounce">📡</span>
              <p className="text-[9px] text-blue-300 font-bold uppercase tracking-wider text-center">
                {status === 'selecting' 
                  ? 'Vyberte svou příšeru a klikněte na Zvolit 👾!' 
                  : 'Vyberte příšeru a klikněte na Zvolit 👾 před zahájením boje!'}
              </p>
            </div>

            {/* LoL Champ Select slots (horizontal cards) */}
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => {
                const player = playersList[idx];
                const isMySlot = player && player.uid === PLAYER_UID;
                const isPlayerHost = player && player.uid === activeLobbyData.hostUid;
                const role = player?.monster ? getMonsterRole(player.monster) : null;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "aspect-square rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 p-2 text-center",
                      player
                        ? player.isLocked
                          ? "bg-slate-900/90 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                          : "bg-slate-900/90 border-blue-500/40 shadow-lg"
                        : "bg-slate-950/40 border-white/5 border-dashed"
                    )}
                  >
                    {player && (
                      <>
                        {isPlayerHost && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-[6px] text-slate-950 font-black px-1 py-0.5 rounded uppercase tracking-wider z-20">
                            Hostitel
                          </span>
                        )}

                        {player.monster ? (
                          <>
                            <img 
                              src={`/monsters/${player.monster.id}.png`} 
                              className="w-10 h-10 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/96/cute-monster.png';
                              }}
                            />
                            <span className="text-[8px] font-black uppercase text-white truncate max-w-[90%] block mt-1 leading-none">
                              {getLoc(player.monster.name, 'cz')}
                            </span>
                            
                            {/* Role Badge */}
                            {role && (
                              <span className={cn("text-[6px] font-bold px-1 py-0.2 rounded border uppercase tracking-wider mt-0.5 flex items-center gap-0.5", role.color)}>
                                <span>{role.icon}</span> {role.label}
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="text-center text-slate-500 py-2">
                            <span className="text-xs block animate-pulse">⏳</span>
                            <span className="text-[6px] font-bold uppercase tracking-wider">Vybírá...</span>
                          </div>
                        )}

                        {/* Player name */}
                        <span className="absolute bottom-1 bg-black/60 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider text-slate-300 max-w-[90%] truncate">
                          {player.name} {isMySlot && '(Vy)'}
                        </span>

                        {/* Lock / Ready Badge */}
                        {player.isLocked ? (
                          <span className="absolute top-1 right-1 bg-emerald-500 text-slate-950 text-[6px] font-black px-1 py-0.5 rounded uppercase tracking-wider shadow">
                            ✓ ZAMČENO
                          </span>
                        ) : player.isReady && (
                          <span className="absolute top-1 right-1 bg-blue-500 text-slate-950 text-[6px] font-black px-1 py-0.5 rounded uppercase tracking-wider">
                            PŘIPRAVEN
                          </span>
                        )}
                      </>
                    )}

                    {!player && (
                      <div className="text-center text-slate-700">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Volno</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Owned Monsters Grid */}
            <div className="space-y-3 flex-1 flex flex-col min-h-[220px]">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between items-center">
                <span>Vyberte své monstrum ({caughtMonsters.length})</span>
                {myData?.isLocked && <span className="text-emerald-400 text-[9px] font-bold">✓ Příšera zamčena</span>}
              </h3>
              
              {caughtMonsters.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/30 border border-white/5 border-dashed rounded-3xl p-6 text-center">
                  <span className="text-xl mb-1">👾</span>
                  <p className="text-[9px] text-slate-400 font-medium max-w-xs mb-2">
                    Nemáte chycené žádné vlastní příšery. Můžete použít zkušebního hrdinu!
                  </p>
                  <button
                    onClick={() => {
                      if (epicMonsters.length > 0) {
                        handleSelectMonsterLobby(epicMonsters[0]);
                      }
                    }}
                    disabled={myData?.isLocked}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition active:scale-95 border-none disabled:opacity-50"
                  >
                    Vybrat zkušebního hrdinu ⚔️
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pb-2">
                  {[...caughtMonsters]
                    .sort((a, b) => getMonsterPower(b) - getMonsterPower(a))
                    .map((monster) => {
                      const isSelected = myData?.monster && myData.monster.caughtAt === monster.caughtAt && myData.monster.id === monster.id;
                      const power = getMonsterPower(monster);
                      const colors = getMonsterColors(monster.type);
                      const theme = getRarityTheme(monster.rarity);
                      const isRarityNonCommon = getLoc(monster.rarity, 'en').toLowerCase() !== 'common';

                      return (
                        <div
                          key={monster.caughtAt || monster.id}
                          onClick={() => !myData?.isLocked && handleSelectMonsterLobby(monster)}
                          className={cn(
                            "relative group aspect-square rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border-2 select-none",
                            theme.card,
                            isSelected 
                              ? myData?.isLocked
                                ? "ring-2 ring-emerald-400 border-emerald-500 scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10"
                                : "ring-2 ring-blue-400 border-blue-500 scale-[1.02] shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10" 
                              : "hover:border-white/20 hover:scale-[1.01]",
                            myData?.isLocked && !isSelected && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {/* Decorative Frame for Rare/Epic/Legendary */}
                          {isRarityNonCommon && (
                            <>
                              <div className={cn(
                                "absolute inset-0 pointer-events-none border-2 rounded-2xl z-30 opacity-60",
                                theme.decor
                              )} />
                              <div className={cn(
                                "absolute -inset-2 blur-xl opacity-20 z-0 pointer-events-none",
                                theme.glow
                              )} />
                            </>
                          )}

                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none" />

                          {/* Top Left: Level */}
                          <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center">
                            <div className="h-5 px-1.5 rounded-lg bg-slate-900/90 text-[8px] font-black flex items-center justify-center border border-white/20 shadow-lg leading-none text-primary uppercase">
                              LVL {monster.level || 1}
                            </div>
                          </div>

                          {/* Top Right: Power Score or Selected badge */}
                          <div className="absolute top-2 right-2 z-20 pointer-events-none flex items-center gap-1">
                            {isSelected ? (
                              <div className={cn(
                                "h-5 px-2 rounded-lg text-[8px] font-black flex items-center gap-1 shadow-lg text-slate-950 uppercase",
                                myData?.isLocked ? "bg-emerald-400" : "bg-blue-400"
                              )}>
                                {myData?.isLocked ? '✓ ZAMČENO' : '✓ ZVOLENO'}
                              </div>
                            ) : (
                              <div className="h-5 px-1.5 rounded-lg bg-black/75 text-[8px] font-mono font-black flex items-center gap-0.5 border border-white/10 shadow-lg text-amber-300">
                                ⚡ {power}
                              </div>
                            )}
                          </div>

                          {/* Monster Image */}
                          <img 
                            src={`/monsters/${monster.id}.png`} 
                            className={cn(
                              "absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 pointer-events-none",
                              isSelected ? "scale-110" : "group-hover:scale-105"
                            )}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/96/cute-monster.png';
                            }}
                          />

                          {/* Bottom Left: Element Icon badge & Role Badge */}
                          <div className="absolute bottom-11 left-2.5 z-20 pointer-events-none flex items-center gap-1">
                            <div className="p-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 flex items-center shadow-lg">
                              {(() => {
                                const Icon = getMonsterTypeIcon(monster.type);
                                return Icon ? <Icon size={12} className={colors.text} /> : null;
                              })()}
                            </div>
                            {(() => {
                              const role = getMonsterRole(monster);
                              return role ? (
                                <div className={cn("px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1 leading-none", role.color)}>
                                  <span>{role.icon}</span>
                                  <span>{role.label}</span>
                                </div>
                              ) : null;
                            })()}
                          </div>

                          {/* Bottom Info: Name & Rarity & HP */}
                          <div className="absolute bottom-2 left-2.5 right-2.5 z-20 pointer-events-none">
                            <p className="text-white text-xs font-black uppercase tracking-tight truncate leading-tight">
                              {getLoc(monster.name, 'cz')}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className={cn("text-[7px] font-black uppercase tracking-widest", theme.text)}>
                                {getLoc(monster.rarity, 'cz')}
                              </span>
                              <span className="text-[8px] font-mono font-bold text-rose-400 flex items-center gap-0.5">
                                <Heart size={9} className="text-rose-500 fill-rose-500" />
                                {getMonsterMaxHP(monster)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="p-5 bg-slate-950 border-t border-white/5 backdrop-blur-3xl relative z-10 flex gap-4 justify-center items-center">
            {/* Select Monster button */}
            <button
              onClick={handleLockInMonster}
              disabled={!myData?.monster}
              className={cn(
                "flex-1 max-w-xs py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 border border-solid text-center cursor-pointer shadow-lg flex items-center justify-center gap-2",
                myData?.isLocked
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 active:scale-95"
                  : myData?.monster
                    ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 border-amber-400 active:scale-95 shadow-amber-500/10"
                    : "bg-slate-900 border-white/5 text-slate-600 cursor-not-allowed"
              )}
            >
              {myData?.isLocked ? '✓ Zvoleno 👾' : 'Zvolit 👾'}
            </button>

            {/* Host start search / launch button */}
            {isHost && status === 'waiting' && (
              <button
                onClick={handleStartMatchSearch}
                disabled={!allPlayersHaveChosen}
                className={cn(
                  "flex-1 max-w-xs py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-none cursor-pointer shadow-lg",
                  allPlayersHaveChosen
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white active:scale-95 shadow-blue-500/20"
                    : "bg-slate-900 text-slate-500 border border-white/5 cursor-not-allowed"
                )}
                title={allPlayersHaveChosen ? "Začít boj" : "Čeká se na výběr příšer všemi hráči"}
              >
                Začít boj ⚔️
              </button>
            )}
          </div>
        </div>
      );
    }

    // 5. SOLO LOBBY SCREEN (Traditional lobby)
    if (lobbyMode === 'solo') {
      const activeSlotsCount = partySlots.filter(s => s !== null).length;
      
      // Autofill logic
      const handleAutofill = () => {
        const sorted = [...caughtMonsters].sort((a, b) => {
          const lvlDiff = (b.level || 1) - (a.level || 1);
          if (lvlDiff !== 0) return lvlDiff;
          return (b.stats?.hp || 0) - (a.stats?.hp || 0);
        });
        const filledParty: (Monster | null)[] = [null, null, null, null];
        for (let i = 0; i < 4; i++) {
          if (sorted[i]) {
            filledParty[i] = sorted[i];
          }
        }
        setPartySlots(filledParty);
        triggerHaptic('medium');
      };

      // Toggle monster in slots
      const handleSelectMonster = (monster: Monster) => {
        // Check if already in party
        const existingIdx = partySlots.findIndex(s => s && s.caughtAt === monster.caughtAt && s.id === monster.id);
        if (existingIdx !== -1) {
          // Remove from slot
          const nextSlots = [...partySlots];
          nextSlots[existingIdx] = null;
          setPartySlots(nextSlots);
          triggerHaptic('light');
          return;
        }

        // Add to first free slot
        const freeIdx = partySlots.findIndex(s => s === null);
        if (freeIdx !== -1) {
          const nextSlots = [...partySlots];
          nextSlots[freeIdx] = monster;
          setPartySlots(nextSlots);
          triggerHaptic('light');
        } else {
          triggerHaptic('heavy');
        }
      };

      const handleRemoveSlot = (slotIdx: number) => {
        const nextSlots = [...partySlots];
        nextSlots[slotIdx] = null;
        setPartySlots(nextSlots);
        triggerHaptic('light');
      };

      const handleStartDungeon = () => {
        if (activeSlotsCount === 0) return;
        initSimulation();
        setIsInLobby(false);
        triggerHaptic('heavy');
      };

      return (
        <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all animate-fade-in">
          {/* Lobby background */}
          <div className="absolute inset-0 z-0 opacity-30">
            <img src={selectedDungeon.backgroundImage} className="w-full h-full object-cover blur-sm brightness-[0.3]" />
            <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.9))" />
          </div>

          {/* Lobby Header */}
          <div className="relative z-10 px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setSelectedDungeon(null);
                  setIsInLobby(false);
                  setLobbyMode(null);
                  triggerHaptic('light');
                }}
                className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h2 className="text-[8px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-0.5">Dungeon Lobby</h2>
                <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">SÓLO PŘÍPRAVA</h1>
              </div>
            </div>

            <button
              onClick={handleAutofill}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-white/10 text-[9px] font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer"
            >
              ⚡ Automaticky doplnit
            </button>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 relative z-10 overflow-y-auto px-6 py-6 flex flex-col gap-6 max-w-4xl w-full mx-auto">
            {/* Dungeon Info Card */}
            <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-4 flex gap-4 items-center backdrop-blur-md">
              <img src={selectedDungeon.backgroundImage} className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
              <div className="space-y-1">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">{getLoc(selectedDungeon.name, 'cz')}</h2>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{getLoc(selectedDungeon.description, 'cz')}</p>
                <div className="flex gap-3 text-[9px] font-bold text-slate-500 pt-1">
                  <span className="text-amber-400">REC LEVEL: {selectedDungeon.recommendedLevel}+</span>
                  <span>•</span>
                  <span>VLNY: {selectedDungeon.waves.length}</span>
                </div>
              </div>
            </div>

            {/* Party Slots View */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Vaše Parta (Max 4)</h3>
              <div className="grid grid-cols-4 gap-3">
                {partySlots.map((monster, idx) => {
                  const isLeader = idx === 0;
                  return (
                    <div 
                      key={idx}
                      onClick={() => monster && handleRemoveSlot(idx)}
                      className={cn(
                        "aspect-square rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300",
                        monster 
                          ? "bg-slate-900/90 border-amber-500/40 cursor-pointer shadow-lg hover:border-amber-400 hover:scale-105 active:scale-95" 
                          : "bg-slate-950/40 border-white/5 border-dashed"
                      )}
                    >
                      {isLeader && (
                        <span className="absolute top-1 left-1 bg-amber-500 text-[6px] text-slate-950 font-black px-1 py-0.5 rounded uppercase tracking-wider z-20">
                          Vůdce
                        </span>
                      )}

                      {monster ? (
                        <>
                          <img 
                            src={`/monsters/${monster.id}.png`} 
                            className="w-12 h-12 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/96/cute-monster.png';
                            }}
                          />
                          <span className="text-[8px] font-black uppercase text-white truncate max-w-[90%] block mt-1 leading-none">
                            {getLoc(monster.name, 'cz')}
                          </span>
                          <span className="text-[7px] text-slate-400 font-mono mt-0.5 block leading-none">
                            Lvl {monster.level || 1}
                          </span>
                        </>
                      ) : (
                        <div className="text-center text-slate-600">
                          <span className="text-sm block mb-1">➕</span>
                          <span className="text-[7px] font-bold uppercase tracking-wider">Slot {idx + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collection Grid */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Vaše Sbírka Příšer ({caughtMonsters.length})
              </h3>
              
              {caughtMonsters.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-slate-900/30 border border-white/5 border-dashed rounded-3xl p-8 text-center">
                  <span className="text-2xl mb-2">👾</span>
                  <p className="text-[10px] text-slate-400 font-medium max-w-xs mb-3">
                    Nemáte chycené žádné vlastní příšery. Můžete použít zkušební hrdiny pro vstup do dungeonu!
                  </p>
                  <button
                    onClick={() => {
                      const testParty = epicMonsters.slice(0, 4);
                      const party: (Monster | null)[] = [null, null, null, null];
                      testParty.forEach((m, i) => { party[i] = m; });
                      setPartySlots(party);
                      triggerHaptic('medium');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-xl transition active:scale-95"
                  >
                    Doplnit zkušební hrdiny ⚔️
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pb-2">
                  {[...caughtMonsters]
                    .sort((a, b) => getMonsterPower(b) - getMonsterPower(a))
                    .map((monster) => {
                      const slotIdx = partySlots.findIndex(s => s && s.caughtAt === monster.caughtAt && s.id === monster.id);
                      const isSelected = slotIdx !== -1;
                      const power = getMonsterPower(monster);
                      const colors = getMonsterColors(monster.type);
                      const theme = getRarityTheme(monster.rarity);
                      const isRarityNonCommon = getLoc(monster.rarity, 'en').toLowerCase() !== 'common';

                      return (
                        <div
                          key={monster.caughtAt || monster.id}
                          onClick={() => handleSelectMonster(monster)}
                          className={cn(
                            "relative group aspect-square rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border-2 select-none",
                            theme.card,
                            isSelected 
                              ? "ring-2 ring-amber-400 border-amber-500 scale-[1.02] shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10" 
                              : "hover:border-white/20 hover:scale-[1.01]"
                          )}
                        >
                          {/* Decorative Frame for Rare/Epic/Legendary */}
                          {isRarityNonCommon && (
                            <>
                              <div className={cn(
                                "absolute inset-0 pointer-events-none border-2 rounded-2xl z-30 opacity-60",
                                theme.decor
                              )} />
                              <div className={cn(
                                "absolute -inset-2 blur-xl opacity-20 z-0 pointer-events-none",
                                theme.glow
                              )} />
                            </>
                          )}

                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 pointer-events-none" />

                          {/* Top Left: Level */}
                          <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center">
                            <div className="h-5 px-1.5 rounded-lg bg-slate-900/90 text-[8px] font-black flex items-center justify-center border border-white/20 shadow-lg leading-none text-primary uppercase">
                              LVL {monster.level || 1}
                            </div>
                          </div>

                          {/* Top Right: Power Score or Slot badge */}
                          <div className="absolute top-2 right-2 z-20 pointer-events-none flex items-center gap-1">
                            {isSelected ? (
                              <div className="h-5 px-2 rounded-lg bg-amber-400 text-[8px] font-black flex items-center gap-1 shadow-lg text-slate-950 uppercase">
                                SLOT {slotIdx + 1} ✓
                              </div>
                            ) : (
                              <div className="h-5 px-1.5 rounded-lg bg-black/75 text-[8px] font-mono font-black flex items-center gap-0.5 border border-white/10 shadow-lg text-amber-300">
                                ⚡ {power}
                              </div>
                            )}
                          </div>

                          {/* Monster Image */}
                          <img 
                            src={`/monsters/${monster.id}.png`} 
                            className={cn(
                              "absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 pointer-events-none",
                              isSelected ? "scale-110" : "group-hover:scale-105"
                            )}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/96/cute-monster.png';
                            }}
                          />

                          {/* Bottom Left: Element Icon badge & Role Badge */}
                          <div className="absolute bottom-11 left-2.5 z-20 pointer-events-none flex items-center gap-1">
                            <div className="p-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 flex items-center shadow-lg">
                              {(() => {
                                const Icon = getMonsterTypeIcon(monster.type);
                                return Icon ? <Icon size={12} className={colors.text} /> : null;
                              })()}
                            </div>
                            {(() => {
                              const role = getMonsterRole(monster);
                              return role ? (
                                <div className={cn("px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1 leading-none", role.color)}>
                                  <span>{role.icon}</span>
                                  <span>{role.label}</span>
                                </div>
                              ) : null;
                            })()}
                          </div>

                          {/* Bottom Info: Name & Rarity & HP */}
                          <div className="absolute bottom-2 left-2.5 right-2.5 z-20 pointer-events-none">
                            <p className="text-white text-xs font-black uppercase tracking-tight truncate leading-tight">
                              {getLoc(monster.name, 'cz')}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className={cn("text-[7px] font-black uppercase tracking-widest", theme.text)}>
                                {getLoc(monster.rarity, 'cz')}
                              </span>
                              <span className="text-[8px] font-mono font-bold text-rose-400 flex items-center gap-0.5">
                                <Heart size={9} className="text-rose-500 fill-rose-500" />
                                {getMonsterMaxHP(monster)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Start Game Action Bar */}
          <div className="p-5 bg-slate-950 border-t border-white/5 backdrop-blur-3xl relative z-10 flex flex-col items-center">
            <button
              onClick={handleStartDungeon}
              disabled={activeSlotsCount === 0}
              className={cn(
                "w-full max-w-md py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
                activeSlotsCount > 0
                  ? "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 active:scale-[0.98] shadow-lg shadow-amber-500/10 cursor-pointer"
                  : "bg-slate-900 border border-white/5 text-slate-600 cursor-not-allowed"
              )}
            >
              Vstoupit do dungeonu ⚔️ ({activeSlotsCount}/4)
            </button>
          </div>
        </div>
      );
    }
  }

  // If a dungeon is selected, but active combat is NOT fighting yet (and no victory/loss overlay active)
  if (selectedDungeon && !isFighting && !battleResult) {
    const cameraY = Math.max(0, Math.min(1800, playerPos.y - 250));
    
    // Theme configurations based on selected dungeon
    const dungeonId = selectedDungeon.id;
    const isLava = dungeonId === 'lava_lair';
    const isFrost = dungeonId === 'frost_temple';

    const mapBg = isLava
      ? 'linear-gradient(180deg, #160404 0%, #090202 25%, #1f0505 50%, #0d0202 75%, #180303 100%)'
      : (isFrost
        ? 'linear-gradient(180deg, #050e18 0%, #02070d 25%, #081726 50%, #030a12 75%, #06111f 100%)'
        : 'linear-gradient(180deg, #040407 0%, #07070d 25%, #050508 50%, #08080f 75%, #030305 100%)');

    const wallStyleLeft = isLava
      ? 'from-red-950 via-stone-950 to-transparent border-r-2 border-red-900/30'
      : (isFrost
        ? 'from-sky-950 via-slate-950 to-transparent border-r-2 border-sky-900/30'
        : 'from-stone-900 via-stone-950 to-transparent border-r-2 border-stone-800');

    const wallStyleRight = isLava
      ? 'from-red-950 via-stone-950 to-transparent border-l-2 border-red-900/30'
      : (isFrost
        ? 'from-sky-950 via-slate-950 to-transparent border-l-2 border-sky-900/30'
        : 'from-stone-900 via-stone-950 to-transparent border-l-2 border-stone-800');

    const wispColor = isLava
      ? 'bg-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.35)]'
      : (isFrost
        ? 'bg-cyan-300/25 shadow-[0_0_6px_rgba(125,211,252,0.3)]'
        : 'bg-emerald-500/20');

    const mossClass = isLava
      ? 'bg-red-950/80 border-red-900/40 shadow-[0_0_8px_#b91c1c]'
      : (isFrost
        ? 'bg-sky-950/40 border-sky-900/20 shadow-[0_0_6px_#0284c7]'
        : 'bg-[#4c5c4e] border-stone-700');

    const flameClass = isLava
      ? 'from-red-600 via-orange-500 to-yellow-400 shadow-[0_0_15px_#f97316]'
      : (isFrost
        ? 'from-cyan-600 via-sky-400 to-blue-300 shadow-[0_0_12px_#0ea5e9]'
        : 'from-lime-600 via-green-500 to-emerald-400 shadow-[0_0_12px_#22c55e]');

    const spotTheme = (isCleared: boolean, isActive: boolean) => {
      if (isCleared) {
        return 'border-emerald-500/25 bg-emerald-950/5 text-emerald-500';
      }
      if (isActive) {
        return isLava
          ? 'border-orange-500 bg-orange-950/20 text-orange-400 shadow-[0_0_20px_#f97316]'
          : (isFrost
            ? 'border-cyan-500 bg-cyan-950/20 text-cyan-400 shadow-[0_0_20px_#06b6d4]'
            : 'border-emerald-500 bg-emerald-950/20 text-emerald-400 shadow-[0_0_20px_#10b981]');
      }
      return 'border-stone-850 bg-stone-950/60 text-stone-700';
    };

    const runicTextClass = (isCleared: boolean, isActive: boolean) => {
      if (isCleared) return 'text-emerald-500';
      if (isActive) return isLava ? 'text-orange-400 animate-pulse' : (isFrost ? 'text-cyan-300 animate-pulse' : 'text-emerald-300 animate-pulse');
      return 'text-stone-700';
    };

    const targetIndicatorBorder = isLava
      ? 'border-2 border-orange-500/60 bg-orange-500/10'
      : (isFrost
        ? 'border-2 border-cyan-500/60 bg-cyan-500/10'
        : 'border-2 border-emerald-500/60 bg-emerald-500/10');

    const ringGlowStyle = isLava
      ? 'bg-orange-500/10 border-2 border-orange-500 shadow-[0_0_10px_#f97316]'
      : (isFrost
        ? 'bg-cyan-500/10 border-2 border-cyan-500 shadow-[0_0_10px_#06b6d4]'
        : 'bg-emerald-500/10 border-2 border-emerald-500 shadow-[0_0_10px_#10b981]');

    const fogColor = isLava
      ? 'rgba(28,8,6,0.35)'
      : (isFrost
        ? 'rgba(6,16,28,0.35)'
        : 'rgba(10,24,14,0.35)');

    const leftDecos = isLava
      ? ['🌋', '🔥', '🌋', '🔥']
      : (isFrost
        ? ['❄️', '💎', '❄️', '💎']
        : ['🕸️', '🦴', '🕸️', '🦴']);

    const rightDecos = isLava
      ? ['🔥', '🌋', '🔥', '🌋']
      : (isFrost
        ? ['💎', '❄️', '💎', '❄️']
        : ['🦴', '🕸️', '🦴', '🕸️']);

    const spots = [
      { waveIndex: 1, y: 1800, label: isLava ? 'Sopečný kráter' : (isFrost ? 'Ledový portál' : 'Ztracená brána'), icon: isLava ? '🔥' : (isFrost ? '❄️' : '☠') },
      { waveIndex: 2, y: 1200, label: isLava ? 'Oltář popela' : (isFrost ? 'Mrazivý monolit' : 'Oltář zatracení'), icon: isLava ? '🌋' : (isFrost ? '💎' : '☩') },
      { waveIndex: 3, y: 500, label: isLava ? 'Lávový trůn (Boss)' : (isFrost ? 'Srdce chrámu (Boss)' : 'Citadela pohromy (Boss)'), icon: isLava ? '👿' : (isFrost ? '👑' : '⚔') }
    ];
    const torchesY = [2150, 1950, 1650, 1450, 1350, 1050, 850, 650, 350];
    
    // Drifting spirits / embers / snow crystals
    const spirits = [
      { id: 1, x: 280, yStart: 2100, yEnd: 1400, delay: 0 },
      { id: 2, x: 410, yStart: 1700, yEnd: 1000, delay: 1.2 },
      { id: 3, x: 190, yStart: 1300, yEnd: 600, delay: 0.6 },
      { id: 4, x: 370, yStart: 900, yEnd: 200, delay: 2.0 }
    ];

    return (
      <div 
        onMouseDown={resumeAudio}
        className="fixed inset-0 z-[9000] bg-slate-950 flex flex-col pt-safe overflow-hidden text-white font-sans"
      >
        {/* Warcraft 3 Stone Bezel Header */}
        <div className="relative z-40 px-6 py-3.5 bg-stone-900 border-b-4 border-stone-700 flex justify-between items-center shrink-0 shadow-[0_4px_25px_rgba(0,0,0,0.9)]">
          {/* Rivets decoration */}
          <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-amber-600/80 rounded-full border border-stone-500 shadow" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-600/80 rounded-full border border-stone-500 shadow" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 bg-amber-600/80 rounded-full border border-stone-500 shadow" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-amber-600/80 rounded-full border border-stone-500 shadow" />

          <div className="flex items-center gap-3">
            <button 
              onClick={handleBackClick}
              className="p-2 bg-stone-800 border-2 border-stone-600 text-[#e9c062] hover:text-white rounded-lg active:scale-95 transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <span className="text-[8px] font-black text-[#e9c062] uppercase tracking-[0.35em] block leading-none mb-1">Mise: Tažení Pohromy</span>
              <h1 className="text-xs font-black uppercase text-slate-100 tracking-widest leading-none">
                {getLoc(selectedDungeon.name, 'cz')}
              </h1>
            </div>
          </div>

          <div className="bg-stone-950 border-2 border-stone-700 px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border border-emerald-400" />
            ZÓNA {currentWave} / {selectedDungeon.waves.length}
          </div>
        </div>

        {/* Exploration viewport */}
        <div className="flex-1 w-full max-w-[600px] mx-auto relative overflow-hidden bg-stone-950 border-x-4 border-stone-850">
          
          {/* Warcraft 3 Classic Green Unholy Fog of War centered on player */}
          <div 
            className="absolute inset-0 z-30 pointer-events-none transition-all duration-300"
            style={{
              background: `radial-gradient(circle 300px at ${playerPos.x}px ${playerPos.y - cameraY}px, rgba(0,0,0,0) 0%, ${fogColor} 50%, rgba(4,10,6,0.35) 75%, rgba(2,4,2,0.55) 100%)`
            }}
          />

          {/* Map canvas container */}
          <div 
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;
              // Bounded walkable path bounds (x = 135 to 465, y = 450 to 2320)
              const boundedX = Math.max(135, Math.min(465, clickX));
              const boundedY = Math.max(450, Math.min(2320, clickY));
              const target = { x: Math.round(boundedX), y: Math.round(boundedY) };
              setTargetPos(target);
              if (activeLobbyCode) {
                updateLobbyPlayerPos(activeLobbyCode, PLAYER_UID, target);
              }
            }}
            className="absolute top-0 left-0 w-full h-[2400px] cursor-pointer bg-slate-950"
            style={{ 
              transform: `translateY(${-cameraY}px)`, 
              transition: 'transform 0.18s ease-out'
            }}
          >
            {/* 2D Tile Map Grid Background */}
            <div className="grid grid-cols-10 w-full h-[2400px] absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
              {mapGrid.map((row, y) =>
                row.map((cellType, x) => (
                  <div 
                    key={`${x}-${y}`} 
                    className="w-[60px] h-[60px] bg-cover bg-center transition-opacity duration-300" 
                    style={getTileStyle(cellType, selectedDungeon.id, x, y)}
                  />
                ))
              )}
            </div>

            {/* Glowing Golden & Runic Dungeon Path Overlay */}
            <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
              {/* Central glowing magic walkway beam */}
              <div 
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-[280px] top-[300px] bottom-[50px] rounded-full blur-2xl opacity-20",
                  isLava 
                    ? "bg-gradient-to-b from-red-600 via-orange-500 to-amber-600" 
                    : (isFrost 
                      ? "bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-600" 
                      : "bg-gradient-to-b from-emerald-500 via-teal-600 to-amber-500")
                )}
              />

              {/* Runic path edge line left */}
              <div 
                className={cn(
                  "absolute left-[140px] top-[320px] bottom-[80px] w-1 border-r border-dashed opacity-40 shadow-lg",
                  isLava ? "border-orange-500 shadow-orange-500/50" : (isFrost ? "border-cyan-400 shadow-cyan-400/50" : "border-emerald-400 shadow-emerald-400/50")
                )}
              />
              {/* Runic path edge line right */}
              <div 
                className={cn(
                  "absolute right-[140px] top-[320px] bottom-[80px] w-1 border-l border-dashed opacity-40 shadow-lg",
                  isLava ? "border-orange-500 shadow-orange-500/50" : (isFrost ? "border-cyan-400 shadow-cyan-400/50" : "border-emerald-400 shadow-emerald-400/50")
                )}
              />
            </div>

            {/* Slow Drifting Unholy spirits / Embers / Magic Orbs */}
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

            {/* High Quality Gothic Stone Pillars & Braziers along the path */}
            {torchesY.map((yVal, idx) => (
              <div key={`pillar-${idx}`} className="absolute inset-x-0 h-0 pointer-events-none z-15" style={{ top: yVal }}>
                {/* Left Pillar & Torch Glow */}
                <div className="absolute left-[78px] -translate-y-1/2 flex items-center">
                  <div className="relative w-6 h-12 bg-gradient-to-r from-stone-950 via-stone-850 to-stone-900 border-2 border-stone-600 rounded-md shadow-[4px_4px_12px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between py-1">
                    <div className={cn("w-full h-1.5 border-b border-stone-600 rounded-t", mossClass)} />
                    <div className="text-[7px] opacity-70">⚜️</div>
                    <div className="w-full h-1.5 border-t border-stone-700 rounded-b" />
                  </div>
                  {/* Iron Bracket Torch Holder */}
                  <div className="relative -ml-1 flex items-center">
                    <div className="w-5 h-2.5 bg-stone-950 border border-stone-700 rounded-sm shadow-md" />
                    {/* Torch Fire & Radial Light Beam */}
                    <div className="relative">
                      <div className={cn("absolute -top-6 -left-4 w-12 h-12 rounded-full blur-lg opacity-40 pointer-events-none", isLava ? "bg-orange-500" : (isFrost ? "bg-cyan-400" : "bg-emerald-400"))} />
                      <motion.div 
                        animate={{ scale: [1, 1.4, 0.95, 1.3, 1], y: [0, -4, -1, -5, 0], rotate: [-2, 3, -3, 2, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2 + (idx % 3) * 0.2, ease: 'easeInOut' }}
                        className={cn("absolute -top-4 -left-1.5 w-4 h-5 rounded-full blur-[1px] bg-gradient-to-t shadow-2xl", flameClass)}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Pillar & Torch Glow */}
                <div className="absolute right-[78px] -translate-y-1/2 flex items-center flex-row-reverse">
                  <div className="relative w-6 h-12 bg-gradient-to-l from-stone-950 via-stone-850 to-stone-900 border-2 border-stone-600 rounded-md shadow-[-4px_4px_12px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between py-1">
                    <div className={cn("w-full h-1.5 border-b border-stone-600 rounded-t", mossClass)} />
                    <div className="text-[7px] opacity-70">⚜️</div>
                    <div className="w-full h-1.5 border-t border-stone-700 rounded-b" />
                  </div>
                  {/* Iron Bracket Torch Holder */}
                  <div className="relative -mr-1 flex items-center flex-row-reverse">
                    <div className="w-5 h-2.5 bg-stone-950 border border-stone-700 rounded-sm shadow-md" />
                    {/* Torch Fire & Radial Light Beam */}
                    <div className="relative">
                      <div className={cn("absolute -top-6 -right-4 w-12 h-12 rounded-full blur-lg opacity-40 pointer-events-none", isLava ? "bg-orange-500" : (isFrost ? "bg-cyan-400" : "bg-emerald-400"))} />
                      <motion.div 
                        animate={{ scale: [1.3, 0.95, 1.4, 1, 1.3], y: [-4, -1, -5, 0, -3], rotate: [2, -3, 3, -2, 0] }}
                        transition={{ repeat: Infinity, duration: 1.3 + (idx % 3) * 0.2, ease: 'easeInOut' }}
                        className={cn("absolute -top-4 -right-1.5 w-4 h-5 rounded-full blur-[1px] bg-gradient-to-t shadow-2xl", flameClass)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Demonic Gate Spots (Necropolis Summon Circles) */}
            {spots.map((spot) => {
              const isCleared = completedWaves.includes(spot.waveIndex);
              const isActive = currentWave === spot.waveIndex;
              return (
                <div key={spot.waveIndex} className="absolute inset-x-0 h-0 pointer-events-none" style={{ top: spot.y }}>
                  {/* Golden Assembly Circle (Multiplayer Raid Zone) */}
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
                        {/* Outer expanding ripple ring */}
                        <motion.div 
                          animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.2, 0.6, 0.2] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          className="absolute inset-0 rounded-full border-2 border-amber-400/60 bg-amber-500/10 shadow-[0_0_40px_rgba(245,158,11,0.3)]"
                        />

                        {/* Rotating dashed magic circle */}
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                          className="absolute w-56 h-28 rounded-full border border-dashed border-amber-300/80 shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]"
                        />

                        {/* Center Crown & Swords Glow Badge */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!allReady) return;
                            setTargetPos({ x: 300, y: spotY + 30 });
                            setIsPaused(true);
                            setIsTransitioning(true);
                            setTransitionText(currentWave === selectedDungeon.waves.length ? 'FINÁLNÍ VLNA: VŠICHNI SHROMÁŽDĚNI! BOSS SE PROBOUZÍ!' : `VLNA ${currentWave}: SHROMAŽDIŠTĚ OBSAZENO! BOJ ZAČÍNÁ! ⚔️`);
                            playLevelUp();
                            setTimeout(() => {
                              setIsTransitioning(false);
                              setIsFighting(true);
                              setIsPaused(false);
                            }, 1500);
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

                  {/* Glowing runic summoning pentagram */}
                  <div 
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-18 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all duration-500",
                      spotTheme(isCleared, isActive)
                    )}
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1">
                      {spot.icon} {spot.label} {spot.icon}
                    </span>
                    <span className={cn(
                      "text-[7px] font-black tracking-widest mt-1",
                      runicTextClass(isCleared, isActive)
                    )}>
                      {isCleared ? '✓ PEČEŤ ZNEŠKODNĚNA' : (isActive ? 'VYVOLÁNÍ BITVY ⚔️' : 'UZAMČENO')}
                    </span>
                  </div>

                  {!isCleared && (
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full mb-12 flex gap-4 items-end">
                      <motion.div 
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                        className="flex flex-col items-center"
                      >
                        {/* Unit pedestal */}
                        <div className="w-12 h-12 bg-stone-900 border-2 border-stone-600 rounded-lg flex items-center justify-center overflow-hidden shadow-lg relative">
                          <span className="text-xl relative z-10">{spot.waveIndex === 3 ? '👺' : '👾'}</span>
                          <div className="absolute bottom-0 inset-x-0 h-2 bg-red-950/60 border-t border-red-500/20 text-[6px] font-black text-red-400 text-center leading-none">Lv {selectedDungeon.waves[spot.waveIndex - 1]?.level}</div>
                        </div>
                      </motion.div>
                      {selectedDungeon.waves[spot.waveIndex - 1]?.enemyCount > 1 && (
                        <motion.div 
                          animate={{ y: [-4, 1, -4] }}
                          transition={{ repeat: Infinity, duration: 2.0, ease: 'easeInOut' }}
                          className="flex flex-col items-center"
                        >
                          <div className="w-12 h-12 bg-stone-900 border-2 border-stone-600 rounded-lg flex items-center justify-center overflow-hidden shadow-lg relative">
                            <span className="text-xl relative z-10">👾</span>
                            <div className="absolute bottom-0 inset-x-0 h-2 bg-red-950/60 border-t border-red-500/20 text-[6px] font-black text-red-400 text-center leading-none">Lv {selectedDungeon.waves[spot.waveIndex - 1]?.level}</div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Target click indicator */}
            {Math.hypot(targetPos.x - playerPos.x, targetPos.y - playerPos.y) > 10 && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 1.25, opacity: 0 }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className={cn("absolute w-8 h-4 rounded-full pointer-events-none", targetIndicatorBorder)}
                style={{ left: targetPos.x - 16, top: targetPos.y - 8, transform: 'rotateX(60deg)' }}
              />
            )}

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
                    <div className="absolute -inset-1 bg-amber-500/20 rounded-full blur-[3px] w-10 h-5 top-8" style={{ transform: 'rotateX(75deg)' }} />
                    <img 
                      src={p.monster ? (p.monster.image || `/monsters/${p.monster.id}.png`) : '/monsters/01.png'} 
                      className="w-10 h-10 object-contain drop-shadow-md"
                      alt={p.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/monsters/01.png';
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Companion 2 (Singleplayer Right flank) */}
            {!activeLobbyData && players[2] && (
              <div 
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none"
                style={{ left: playerPos.x + 45, top: playerPos.y + 40 }}
              >
                <div className="absolute -inset-1 bg-black/65 rounded-full blur-[2px] w-8 h-4 top-6" style={{ transform: 'rotateX(75deg)' }} />
                <img 
                  src={players[2].monster.image} 
                  className="w-8 h-8 object-contain" 
                  alt="Companion 2"
                />
              </div>
            )}

            {/* Companion 3 (Singleplayer Rear center) */}
            {!activeLobbyData && players[3] && (
              <div 
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none"
                style={{ left: playerPos.x, top: playerPos.y + 70 }}
              >
                <div className="absolute -inset-1 bg-black/65 rounded-full blur-[2px] w-8 h-4 top-6" style={{ transform: 'rotateX(75deg)' }} />
                <img 
                  src={players[3].monster.image} 
                  className="w-8 h-8 object-contain" 
                  alt="Companion 3"
                />
              </div>
            )}

            {/* Active primary player monster */}
            <div 
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: playerPos.x, top: playerPos.y }}
            >
              {/* Warcraft 3 selection circle ring (Green glowing plate) */}
              <div 
                className={cn("absolute -inset-3 rounded-full blur-[2px] w-12 h-6 top-8 animate-pulse shadow-md", ringGlowStyle)}
                style={{ transform: 'rotateX(75deg)' }} 
              />
              <img 
                src={players[0]?.monster.image} 
                className="w-10 h-10 object-contain relative z-10 animate-bounce"
                style={{ animationDuration: '1.4s' }}
                alt="Active Player"
              />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[6px] font-black uppercase text-[#e9c062] bg-stone-900 px-1 rounded border-2 border-stone-600 tracking-wider whitespace-nowrap leading-none py-0.5 shadow-lg shadow-black/80">
                VY
              </div>
            </div>

          </div>
        </div>

        {/* Warcraft 3 Classic Command Card Status HUD */}
        <div className="relative z-40 bg-stone-900 border-t-4 border-stone-700 py-3.5 px-6 shrink-0 shadow-[0_-4px_25px_rgba(0,0,0,0.9)] flex items-center justify-between gap-6">
          {/* Gold corner rivets */}
          <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-amber-600/80 rounded-full border border-stone-500" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-600/80 rounded-full border border-stone-500" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 bg-amber-600/80 rounded-full border border-stone-500" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-amber-600/80 rounded-full border border-stone-500" />

          {/* Left: Player Portrait & Health stats */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-black border-2 border-[#b58f43] rounded-lg overflow-hidden relative shrink-0 shadow-md">
              <img src={players[0]?.monster.image} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 bg-[#b58f43] text-stone-950 font-black text-[8px] px-1 rounded-tl leading-none py-0.5">Lv {players[0]?.monster.level}</div>
            </div>
            <div className="text-left space-y-1 min-w-0">
              <span className="text-[10px] font-black uppercase text-[#e9c062] truncate block leading-none">{getLoc(players[0]?.monster.name, 'cz')}</span>
              {/* HP Bar */}
              <div className="w-24 h-2.5 bg-black border border-stone-600 rounded relative overflow-hidden">
                <div className="h-full bg-emerald-600 border-r border-emerald-400" style={{ width: `${(players[0]?.currentHP / players[0]?.maxHP) * 100}%` }} />
                <span className="absolute inset-0 text-[7px] font-black text-center leading-none mt-0.5 text-slate-100">{players[0]?.currentHP} / {players[0]?.maxHP}</span>
              </div>
              {/* Energy Bar */}
              <div className="w-24 h-2.5 bg-black border border-stone-600 rounded relative overflow-hidden">
                <div className="h-full bg-blue-600 border-r border-blue-400" style={{ width: `${players[0]?.energy}%` }} />
                <span className="absolute inset-0 text-[7px] font-black text-center leading-none mt-0.5 text-slate-100">{Math.round(players[0]?.energy || 0)} MP</span>
              </div>
            </div>
          </div>

          {/* Center: Command Status prompt */}
          <div className="hidden sm:block flex-1 text-center font-mono text-[9px] text-[#e9c062]/80 uppercase tracking-wider leading-relaxed">
            Klikněte do jeskyně pro přesun hrdinů.<br />
            Vyčistěte všechny brány k přivolání Bosse.
          </div>



        </div>

        {/* Wave transitioning alert overlay */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/92 backdrop-blur-md pointer-events-none"
            >
              <motion.div 
                initial={{ scale: 0.85, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.85, opacity: 0 }} 
                className="text-center space-y-4"
              >
                <div className="text-emerald-500 text-4xl animate-bounce">⚔️</div>
                <h2 className="text-2xl font-black italic text-[#e9c062] uppercase tracking-tighter leading-none filter drop-shadow-[0_0_15px_rgba(233,192,98,0.4)]">
                  {transitionText}
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em]">
                  Bitva začíná...
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Active Combat Layout
  return (
    <div 
      onMouseDown={resumeAudio}
      className={cn(
        "fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all",
        screenShake && "animate-[shake_0.25s_ease-in-out_infinite]"
      )}
    >
      {/* Background and cave overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.img 
          src={selectedDungeon.backgroundImage} 
          animate={isTransitioning ? {
            scale: [1.05, 1.18, 1.05],
            y: [0, 20, 0],
          } : {}}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 saturate-[1.2] contrast-[1.1] brightness-[0.7]" 
          alt="dungeon background" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/85" />
        <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.6)_100%)" />
        
        {/* Hit flash */}
        <AnimatePresence>
          {flashColor && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 0.55 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 z-50 pointer-events-none" 
              style={{ backgroundColor: flashColor }} 
            />
          )}
        </AnimatePresence>
      </div>

      {/* Header bar */}
      <div className="relative z-10 px-6 py-3 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBackClick}
            className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 className="text-[8px] font-black text-red-500 uppercase tracking-[0.4em] leading-none mb-0.5">Dungeon Arena</h2>
            <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">
              {getLoc(selectedDungeon.name, 'cz').toUpperCase()}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 px-3 py-1 rounded-xl border border-white/5">
          <div className="text-[9px] font-black bg-gradient-to-r from-red-500 to-rose-600 px-2 py-0.5 rounded text-white tracking-wider">
            {currentWave === selectedDungeon.waves.length ? 'FINÁLNÍ BOSS (3/3)' : `VLNA ${currentWave}/${selectedDungeon.waves.length}`}
          </div>
          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
            <Activity size={12} className="text-red-500 animate-pulse" />
            <span className="text-[11px] font-black tracking-widest text-red-400 font-mono">
              {formatTime(dungeonTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="flex-1 relative z-10 flex flex-col justify-between overflow-hidden">
        
        {/* Spells flight animations layer */}
        <div className="absolute inset-0 pointer-events-none z-[80] overflow-hidden">
          <AnimatePresence>
            {flyingSpells.map((spell) => (
              <motion.div
                key={spell.id}
                initial={{ left: spell.startX, top: spell.startY, scale: 0.3, opacity: 0 }}
                animate={{ left: spell.endX, top: spell.endY, scale: [0.3, 1.4, 1.0], opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-2 rounded-full bg-slate-900/60 border border-white/20 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              >
                {getSpellIcon(spell.type, spell.element)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Floating popups layer */}
        <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
          <AnimatePresence>
            {popups.map((p) => {
              let style: React.CSSProperties = {};
              if (p.isPlayerTarget && p.targetIndex !== undefined) {
                const leftPercent = 12.5 + (p.targetIndex / playerCount) * 75;
                style = { left: `${leftPercent}%`, bottom: '150px' };
              } else if (p.targetIndex !== undefined) {
                const leftPercent = 100 / enemies.length * p.targetIndex + (100 / enemies.length) / 2;
                style = { left: `${leftPercent}%`, top: '24%' };
              }

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15, scale: 0.3 }}
                  animate={{ opacity: 1, y: -70, scale: p.isCrit ? 1.6 : 1.1 }}
                  exit={{ opacity: 0, y: -110, scale: 2 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className={cn(
                    "absolute font-black italic drop-shadow-[0_4px_12px_rgba(0,0,0,1)] transform -translate-x-1/2 flex items-center gap-1 whitespace-nowrap",
                    p.isHeal ? "text-emerald-400 text-3xl" : p.isCrit ? "text-amber-400 text-4xl" : "text-rose-500 text-3xl"
                  )}
                  style={style}
                >
                  {p.isHeal ? '+' : '-'}{p.value}
                  {p.isCrit && <Sparkles size={16} className="text-amber-300 ml-0.5 animate-pulse" />}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* TOP AREA: ENEMIES */}
        <div className="w-full flex flex-col items-center pt-3 px-4 relative z-10">
          
          {/* Active target warning banner */}
          {(() => {
            const targetedPlayer = bossTargetUid ? players.find(p => p.uid === bossTargetUid) : players[bossTargetIdx];
            if (!targetedPlayer || targetedPlayer.isDead) return null;
            return (
              <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/30 px-3 py-0.5 rounded-full text-[8px] font-black uppercase text-red-400 tracking-wider mb-2 animate-pulse">
                <ShieldAlert size={10} className="animate-bounce" />
                NEPŘÁTELÉ ÚTOČÍ NA: {targetedPlayer.playerName || getLoc(targetedPlayer.monster.name, 'cz')}
              </div>
            );
          })()}

          {/* WoW Boss HP Bar: Keep always visible during Wave 3 */}
          {currentWave === selectedDungeon.waves.length && bossEnemy && (
            <div className="w-full max-w-[260px] bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-amber-500/25 rounded-2xl p-2.5 backdrop-blur-xl relative flex flex-col items-center shadow-lg mb-2">
              <div className="flex justify-between items-center w-full mb-1 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[7px] font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 px-1 rounded uppercase tracking-wider">BOSS</span>
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    {getLoc(bossEnemy.monster.name, 'cz')}
                  </span>
                  {bossEnraged && (
                    <span className="text-[6px] font-black bg-red-600 text-white px-1 rounded animate-pulse tracking-wide uppercase">VZTEK ({bossEnrageCount})</span>
                  )}
                </div>
                <span className="text-[8px] font-black text-amber-500">LVL {bossEnemy.monster.level}</span>
              </div>

              {/* HP Bar */}
              <div className="h-5 w-full bg-slate-950 rounded-lg overflow-hidden border border-amber-500/30 p-[1.5px] relative">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(trailingBossHP / bossMaxHP) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 bg-amber-400/40 rounded-sm"
                />
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(bossHP / bossMaxHP) * 100}%` }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-rose-500 to-red-500 rounded-sm"
                />
                <div className="absolute inset-0 flex items-center justify-between px-2.5 z-20 select-none">
                  <span className="text-[10px] font-black text-white font-mono drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.9)] bg-black/40 px-1.5 py-0.5 rounded">
                    {bossHP.toLocaleString()} / {bossMaxHP.toLocaleString()} HP
                  </span>
                  <span className="text-[10px] font-black text-amber-300 font-mono drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.9)] bg-black/40 px-1.5 py-0.5 rounded">
                    {Math.round((bossHP / bossMaxHP) * 100)}%
                  </span>
                </div>
              </div>

              {/* Boss Shield */}
              {bossEnemy.shield > 0 && (
                <div className="h-1.5 w-full bg-black/80 rounded-full overflow-hidden border border-cyan-500/20 p-[0.5px] mt-1 relative">
                  <motion.div
                    animate={{ width: `${(bossEnemy.shield / bossEnemy.shieldMax) * 100}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Render Enemies: single center boss if no minions, otherwise row grid */}
          {currentWave === selectedDungeon.waves.length && enemies.length === 1 && bossEnemy ? (
            <div className="w-full flex flex-col items-center">
              {/* Boss Podium & Figure */}
              <div className="relative h-32 w-32 flex items-center justify-center">
                <MonsterPodium rarity="legendary" isPlayer={false} />
                <motion.img 
                  src={bossEnemy.monster.image || `/dungeon/wave${currentWave}.png`} 
                  animate={swoopEnemyIdx === 0 ? {
                    y: [8, 300, 8],
                    scale: [1, 1.25, 1],
                  } : enemyAttackingIdx === 0 ? {
                    y: [8, 25, 8],
                    scale: 1.15,
                  } : {
                    y: [8, -5, 8],
                    x: [0, 4, -4, 0],
                    scale: [1, 1.04, 0.98, 1],
                  }}
                  transition={(swoopEnemyIdx === 0) ? {
                    duration: 0.8,
                    ease: "easeIn"
                  } : (enemyAttackingIdx === 0) ? {
                    duration: 0.4,
                    ease: "easeInOut"
                  } : {
                    repeat: Infinity,
                    duration: 4.5,
                    ease: "easeInOut"
                  }}
                  style={bossEnraged ? {
                    filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.8)) saturate(1.4)'
                  } : {}}
                  className="w-28 h-28 object-contain filter drop-shadow-2xl rounded-2xl relative z-10" 
                />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg flex justify-center gap-8">
              {enemies.map((enemy) => {
                const isDead = enemy.isDead;
                const hpPct = (enemy.currentHP / enemy.maxHP) * 100;
                return (
                  <div key={enemy.index} className={cn("flex flex-col items-center transition-all duration-300", isDead ? "opacity-20 scale-90" : "")}>
                    
                    <div className={cn(
                      "w-28 bg-slate-900/80 border border-white/5 p-1.5 rounded-xl backdrop-blur-md flex flex-col gap-1 text-[8px] font-bold",
                      enemy.isBoss && "w-36 border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/95"
                    )}>
                      <div className="flex justify-between text-white truncate max-w-full items-center">
                        <span className="flex items-center gap-1">
                          {enemy.isBoss && <span className="text-[5px] bg-amber-500 text-slate-950 px-0.5 rounded font-black">BOSS</span>}
                          <span className="truncate max-w-[80px]">{getLoc(enemy.monster.name, 'cz')}</span>
                        </span>
                      </div>
                      
                      <div className="h-3.5 w-full bg-black/80 rounded-full overflow-hidden relative border border-white/10">
                        <motion.div 
                          className={cn("h-full bg-gradient-to-r from-red-500 to-rose-400", enemy.isBoss && "from-red-600 via-rose-500 to-red-500")}
                          animate={{ width: `${hpPct}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-[7px] font-mono text-white font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] z-10">
                          {enemy.currentHP} / {enemy.maxHP}
                        </div>
                      </div>

                      {enemy.shield > 0 && (
                        <div className="h-1 w-full bg-cyan-950/60 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-cyan-400"
                            animate={{ width: `${(enemy.shield / enemy.shieldMax) * 100}%` }}
                          />
                        </div>
                      )}

                      <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          animate={{ width: `${enemy.energy}%` }}
                        />
                      </div>
                    </div>

                    <div className={cn("relative h-20 w-20 flex items-center justify-center mt-1", enemy.isBoss && "h-28 w-28")}>
                      <MonsterPodium rarity={enemy.isBoss ? "legendary" : enemy.monster.rarity} isPlayer={false} />
                      <motion.img 
                        src={enemy.monster.image} 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (enemy.isBoss) {
                            target.src = 'https://img.icons8.com/color/96/skull.png';
                          } else {
                            target.src = 'https://img.icons8.com/color/96/bat.png';
                          }
                        }}
                        className={cn("w-full h-full object-contain filter drop-shadow-md rounded-2xl z-10", enemy.isBoss ? "h-24" : "h-16")}
                        animate={swoopEnemyIdx === enemy.index ? {
                          y: [0, 260, 0],
                          scale: [1, 1.25, 1],
                        } : enemyAttackingIdx === enemy.index ? {
                          y: [0, 18, 0],
                          scale: 1.15,
                        } : {
                          y: [0, -6, 0],
                          x: [0, 2, -2, 0],
                        }}
                        transition={(swoopEnemyIdx === enemy.index) ? {
                          duration: 0.8,
                          ease: "easeIn"
                        } : (enemyAttackingIdx === enemy.index) ? {
                          duration: 0.4,
                          ease: "easeInOut"
                        } : {
                          repeat: Infinity,
                          duration: 3 + enemy.index * 0.5,
                          ease: "easeInOut"
                        }}
                        style={enemy.isBoss && bossEnraged ? {
                          filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.8)) saturate(1.4)'
                        } : {}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>



        {/* Floating DPS / Logs Summary */}
        <div className="absolute top-1/2 -translate-y-1/2 right-3 z-20 bg-slate-950/90 border border-white/10 p-2.5 rounded-2xl text-[8px] font-mono space-y-1.5 backdrop-blur-md min-w-[160px] shadow-2xl">
          <div className="text-[9px] font-black uppercase text-slate-300 border-b border-white/10 pb-1 flex justify-between items-center">
            <span className="flex items-center gap-1 font-sans">
              <span>📊</span>
              <span>Žebříček DMG</span>
            </span>
            <span className="text-[7px] text-slate-500 font-mono">celkem</span>
          </div>
          {(() => {
            const maxGroupHP = Math.max(...players.map(p => p.maxHP || p.monster?.stats?.hp || 0), 1);
            const sortedPlayers = [...players].sort((a, b) => {
              const diffDmg = (b.totalDamage || 0) - (a.totalDamage || 0);
              if (diffDmg !== 0) return diffDmg;
              return (b.totalHealing || 0) - (a.totalHealing || 0);
            });

            return sortedPlayers.map((p, idx) => {
              const hasHealAbility = p.monster?.abilities?.some((a: any) => a.type === 'heal' || a.type === 'regen');
              const playerHP = p.maxHP || p.monster?.stats?.hp || 0;
              const isTank = !hasHealAbility && playerHP === maxGroupHP && playerHP > 0;
              const roleIcon = hasHealAbility ? '💚' : isTank ? '🛡️' : '⚔️';
              const isTargeted = (bossTargetUid && p.uid ? p.uid === bossTargetUid : p.index === bossTargetIdx) && !p.isDead;
              const isMe = p.uid ? p.uid === PLAYER_UID : p.index === 0;
              const dps = dungeonTime > 0 ? Math.round(p.totalDamage / (dungeonTime / 10)) : 0;
              const rankColor = idx === 0 ? 'text-amber-400 font-black' : idx === 1 ? 'text-slate-300 font-bold' : 'text-amber-700 font-bold';

              return (
                <div key={p.uid || p.index} className={cn("flex justify-between gap-2 items-center py-0.5", p.isDead && "opacity-60")}>
                  <span className={cn("truncate max-w-[100px] flex items-center gap-1", isTargeted && "text-red-400 font-bold", isMe && "text-amber-300 font-bold")}>
                    <span className={cn("text-[8px] font-mono shrink-0", rankColor)}>#{idx + 1}</span>
                    <span className="text-[9px] shrink-0">{p.isDead ? '💀' : roleIcon}</span>
                    {isTargeted ? '🎯 ' : ''}
                    <span className="truncate">{p.playerName || getLoc(p.monster?.name, 'cz') || `Hráč ${p.index + 1}`}</span>
                    {isMe && <span className="text-[7px] text-amber-400/80 font-mono shrink-0">(VY)</span>}
                  </span>
                  <div className="text-right font-mono shrink-0 flex flex-col items-end leading-none">
                    <span className={cn("text-[9px] font-bold", idx === 0 ? "text-amber-400" : "text-slate-200")}>
                      {p.totalDamage || 0}
                    </span>
                    {dps > 0 && (
                      <span className="text-[7px] text-slate-500">
                        {dps}/s
                      </span>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Transitional Banner Overlay */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
            >
              <div className="text-center space-y-3 p-6 rounded-3xl bg-slate-900/90 border border-amber-500/20 shadow-2xl">
                <Swords size={36} className="text-amber-400 mx-auto animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-widest text-amber-300">
                  {transitionText}
                </h2>
                <p className="text-[9px] font-bold text-slate-400">
                  Přeživší hráči byli vyléčeni o +35% HP
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM AREA: PLAYERS GRID */}
        <div className="w-full px-4 pb-6 mt-auto">
          <div className="grid grid-cols-4 gap-2.5">
            {players.map((p, idx) => {
              const hpPercent = (p.currentHP / p.maxHP) * 100;
              const isTargeted = (bossTargetUid && p.uid ? p.uid === bossTargetUid : idx === bossTargetIdx) && !p.isDead;
              const isMainPlayer = p.uid ? p.uid === PLAYER_UID : p.index === 0;

              return (
                <motion.div 
                  key={p.index}
                  animate={isTransitioning && !p.isDead ? {
                    y: [0, -25, 0, -20, 0],
                    scale: isMainPlayer ? [1.07, 1.12, 1.07, 1.12, 1.07] : [1, 1.05, 1, 1.05, 1],
                  } : {}}
                  transition={isTransitioning ? {
                    duration: 2.5,
                    ease: "easeInOut",
                    times: [0, 0.25, 0.5, 0.75, 1],
                    delay: p.index * 0.15
                  } : {}}
                  className={cn(
                    "bg-slate-950/20 backdrop-blur-sm rounded-3xl p-3 flex flex-col justify-between overflow-hidden transition-all duration-300 border-none relative",
                    isMainPlayer ? "scale-[1.07] border border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.15)] z-10" : "",
                    p.isDead ? "opacity-20 grayscale" : 
                    isTargeted ? "bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.25)] scale-[1.05] z-10" : ""
                  )}
                >
                  {/* Fiery Explosions Overlay (Výbuchy) */}
                  <AnimatePresence>
                    {activeExplosionIndices.includes(p.index) && !p.isDead && (
                      <motion.div
                        initial={{ scale: 0.1, opacity: 0 }}
                        animate={{ scale: [0.1, 1.7, 1.2], opacity: [0, 1, 1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 bg-gradient-to-b from-red-600/40 via-orange-500/25 to-transparent flex items-center justify-center z-[45] rounded-3xl pointer-events-none"
                      >
                        <span className="text-4xl animate-bounce drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">💥</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active Crow-Control / Stun / Freeze visual overlays */}
                  {p.freezeTimer > 0 && (
                    <div className="absolute inset-0 bg-sky-500/35 backdrop-blur-[1px] flex flex-col items-center justify-center z-40 rounded-3xl">
                      <span className="text-[12px] font-black uppercase text-cyan-200 animate-pulse tracking-wide drop-shadow-md">Zmrazen ❄️</span>
                      <span className="text-[8px] text-cyan-300 font-mono mt-0.5">{p.freezeTimer.toFixed(1)}s</span>
                    </div>
                  )}

                  {p.stunTimer > 0 && p.freezeTimer <= 0 && (
                    <div className="absolute inset-0 bg-amber-500/25 backdrop-blur-[1px] flex flex-col items-center justify-center z-40 rounded-3xl">
                      <span className="text-[12px] font-black uppercase text-yellow-300 animate-bounce tracking-wide drop-shadow-md">Ochromen 💫</span>
                      <span className="text-[8px] text-yellow-200 font-mono mt-0.5">{p.stunTimer.toFixed(1)}s</span>
                    </div>
                  )}

                  {p.rootTimer > 0 && (
                    <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-emerald-950/90 to-transparent flex items-center justify-center z-30 pointer-events-none">
                      <span className="text-[7px] font-black uppercase tracking-wider text-emerald-400 animate-pulse">Kořeny 🌿</span>
                    </div>
                  )}

                  {p.burnTimer > 0 && (
                    <div className="absolute top-2 right-2 z-30 bg-red-600/80 p-0.5 rounded-full animate-bounce shadow">
                      <Flame size={12} className="text-orange-300 fill-orange-400" />
                    </div>
                  )}

                  {/* Aggro / Threat indicator border */}
                  {isTargeted && (
                    <div className="absolute inset-0 border-2 border-red-500/80 animate-pulse rounded-3xl pointer-events-none" />
                  )}

                  {/* Player Slot Info */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase text-amber-300 truncate max-w-[85px] leading-tight">
                        {isMainPlayer ? 'HRÁČ (VY)' : p.playerName || 'NPC Spoluhráč'}
                      </span>
                      <span className="text-[7px] text-slate-400 truncate max-w-[75px] leading-none mt-0.5">
                        {getLoc(p.monster.name, 'cz')}
                      </span>
                    </div>
                    <span className="text-[7px] font-black text-red-500 font-mono shrink-0 ml-1">Lv {p.monster.level}</span>
                  </div>

                  {/* HP Bar */}
                  <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden p-[1px] mt-1 relative border border-white/5">
                    <motion.div 
                      className={cn("h-full rounded-full transition-all duration-300 bg-gradient-to-r", p.isDead ? "from-slate-700 to-slate-800" : "from-emerald-500 to-teal-400")}
                      style={{ width: `${hpPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[7px] font-black text-white font-mono">
                        {p.currentHP}/{p.maxHP}
                      </span>
                    </div>
                  </div>

                  {/* Energy/Mana Bar */}
                  <div className="h-1 w-full bg-black/80 rounded-full overflow-hidden p-[0.5px] mt-1">
                    <motion.div 
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${p.energy}%` }}
                    />
                  </div>

                  {/* Monster Podium & Figure */}
                  <div className="relative h-16 w-full flex items-center justify-center my-1 z-0">
                    <MonsterPodium isPlayer rarity={p.monster.rarity} isAggro={isTargeted} />
                    <img 
                      src={`/monsters/${p.monster.id}.png`} 
                      className="h-14 object-contain z-10" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/96/cute-monster.png';
                      }}
                    />
                  </div>

                  {/* Cooldown bar */}
                  <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-100"
                      style={{ width: `${p.isDead ? 0 : p.cooldown}%` }}
                    />
                  </div>

                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dungeon Action Controls (Attack, Skills Popover, Taunt, Backpack) */}
      <DungeonActionControls
        isFighting={isFighting}
        isPaused={isPaused}
        isTransitioning={isTransitioning}
        players={players}
        playerUid={PLAYER_UID}
        hpPotions={hpPotions}
        manaPotions={manaPotions}
        showItems={showItems}
        setShowItems={setShowItems}
        showSkillsMenu={showSkillsMenu}
        setShowSkillsMenu={setShowSkillsMenu}
        onBasicAttack={handleUserBasicAttack}
        onTaunt={handleUserTaunt}
        onExecuteAbility={handleUserExecuteAbility}
        onUseHpPotion={() => {
          if (hpPotions <= 0) return;
          setHpPotions(p => p - 1);
          setPlayers((prevPls) => prevPls.map((pl) => {
            const isMe = pl.uid ? pl.uid === PLAYER_UID : pl.index === 0;
            if (isMe) {
              const healed = Math.min(pl.maxHP, pl.currentHP + 400);
              addPopup(400, true, true, pl.index);
              playHeal();
              addLog(`🧪 Použili jste léčivý lektvar (+400 HP)!`, 'heal');
              return { ...pl, currentHP: healed };
            }
            return pl;
          }));
          setShowItems(false);
        }}
        onUseManaPotion={() => {
          if (manaPotions <= 0) return;
          setManaPotions(p => p - 1);
          setPlayers((prevPls) => prevPls.map((pl) => {
            const isMe = pl.uid ? pl.uid === PLAYER_UID : pl.index === 0;
            if (isMe) {
              const energy = Math.min(100, pl.energy + 50);
              addPopup(50, true, true, pl.index);
              playHeal();
              addLog(`🧪 Použili jste lektvar many (+50 Energie)!`, 'heal');
              return { ...pl, energy };
            }
            return pl;
          }));
          setShowItems(false);
        }}
      />

      {/* Victory / Defeat Modal with Interactive Loot Roll & Stats */}
      <DungeonVictoryModal
        battleResult={battleResult}
        dungeonTime={dungeonTime}
        players={players}
        accumulatedLoot={accumulatedLoot}
        syncedStats={activeLobbyData?.stats || null}
        activeLobbyCode={activeLobbyCode}
        playerName={localPlayerName}
        onRestart={() => {
          if (activeLobbyCode) {
            resetLobbyToWaiting(activeLobbyCode);
          } else {
            initSimulation();
          }
        }}
        onBack={handleBackClick}
        onAddResource={onAddResource}
      />

      {/* Loot Item Detail Preview Modal */}
      <AnimatePresence>
        {selectedLootPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedLootPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedLootPreview(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5"
              >
                ✕
              </button>

              <div className="size-16 mx-auto rounded-2xl border-2 border-amber-500/40 bg-slate-950 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                {selectedLootPreview.config.icon}
              </div>

              <div>
                <h3 className="text-base font-black uppercase text-amber-300 tracking-wider">
                  {getLoc(selectedLootPreview.config.label, 'cz')}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 mt-1 inline-block">
                  {selectedLootPreview.config.rarity || 'common'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950/50 p-3 rounded-xl border border-white/5">
                {getLoc(selectedLootPreview.config.description, 'cz') || 'Vzácná složka nalezená v útrobách dungeonu.'}
              </p>

              {selectedLootPreview.config.stats && (
                <div className="flex justify-center gap-2 font-mono text-xs">
                  {selectedLootPreview.config.stats.hp && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">+{selectedLootPreview.config.stats.hp} HP</span>}
                  {selectedLootPreview.config.stats.atk && <span className="text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">+{selectedLootPreview.config.stats.atk} ATK</span>}
                  {selectedLootPreview.config.stats.def && <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">+{selectedLootPreview.config.stats.def} DEF</span>}
                </div>
              )}

              <button
                onClick={() => setSelectedLootPreview(null)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition"
              >
                Rozumím
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
