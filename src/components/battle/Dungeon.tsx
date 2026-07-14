import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, Shield, Heart, Zap, Sparkles, RefreshCw, Play, Pause, 
  Activity, Award, Flame, Droplets, Leaf, Circle, ShieldAlert, ChevronLeft, Skull, Swords
} from 'lucide-react';
import { monsterDB } from '../../data/monsters';
import { RESOURCE_CONFIG } from '../../data/resources';
import { dungeonsDB, DungeonConfig } from '../../data/dungeons';
import type { Monster, Localized } from '../../types';
import { cn, getLoc, triggerHaptic } from '../../utils';
import { useGameSound } from '../../data/sounds';

interface DungeonPlayer {
  index: number;
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

export const Dungeon = ({ onBack }: { onBack: () => void }) => {
  const playerCount = 4;
  
  const { 
    playAttack, playHit, playCritical, playHeal, playSlash, 
    playVictory, playDefeat, playDeath, playSpell, playLevelUp 
  } = useGameSound();

  // Selected configurable dungeon
  const [selectedDungeon, setSelectedDungeon] = useState<DungeonConfig | null>(null);

  // Vertical Exploration Map States
  const [isFighting, setIsFighting] = useState<boolean>(false);
  const [completedWaves, setCompletedWaves] = useState<number[]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 300, y: 2300 });
  const [targetPos, setTargetPos] = useState({ x: 300, y: 2300 });

  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [battleLog, setBattleLog] = useState<{ id: string; text: string; type: 'info' | 'boss' | 'player' | 'heal' | 'death' }[]>([]);
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [flyingSpells, setFlyingSpells] = useState<FlyingSpell[]>([]);
  
  // Game states
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [enemies, setEnemies] = useState<DungeonEnemy[]>([]);
  const [players, setPlayers] = useState<DungeonPlayer[]>([]);
  const [bossTargetIdx, setBossTargetIdx] = useState<number>(0);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [dungeonTime, setDungeonTime] = useState<number>(0);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionText, setTransitionText] = useState<string>('');

  // WoW Loot & Potion states
  const [accumulatedLoot, setAccumulatedLoot] = useState<any[]>([]);
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
    if (bossEnemy) {
      const timer = setTimeout(() => {
        setTrailingBossHP(bossHP);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [bossHP, bossEnemy]);

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

  // Filter Monsters by Rarity
  const rareMonsters = monsterDB.filter(
    (m) => (m.rarity?.toLowerCase() || '') === 'rare' || (m.rarity?.toLowerCase() || '') === 'vzácné' || (m.rarity?.toLowerCase() || '') === 'vzácná'
  );
  const epicMonsters = monsterDB.filter(
    (m) => (m.rarity?.toLowerCase() || '') === 'epic' || (m.rarity?.toLowerCase() || '') === 'epické'
  );
  const legendaryMonsters = monsterDB.filter(
    (m) => (m.rarity?.toLowerCase() || '') === 'legendary' || (m.rarity?.toLowerCase() || '') === 'legendární'
  );

  // Helper to trigger physical attack lunge animation for enemies
  const triggerEnemyAttackAnimation = (idx: number) => {
    setEnemyAttackingIdx(idx);
    setTimeout(() => setEnemyAttackingIdx(null), 400);
  };

  // Load enemies for wave based on active selected dungeon config
  const loadWaveEnemies = useCallback((waveNum: number, dungConfig: DungeonConfig) => {
    let newEnemies: DungeonEnemy[] = [];
    const waveConfig = dungConfig.waves.find(w => w.waveIndex === waveNum);
    if (!waveConfig) return;

    const hp = waveConfig.baseHp;
    const shield = waveConfig.shield || 0;
    const level = waveConfig.level;

    let pool: any[] = [];
    if (waveConfig.enemyRarityPool === 'rare') {
      pool = rareMonsters.length > 0 ? rareMonsters : epicMonsters;
    } else if (waveConfig.enemyRarityPool === 'epic') {
      pool = epicMonsters.length > 0 ? epicMonsters : rareMonsters;
    } else {
      pool = legendaryMonsters.length > 0 ? legendaryMonsters : epicMonsters;
    }

    if (pool.length === 0) return;

    const isBoss = waveNum === dungConfig.waves.length;

    if (isBoss) {
      const m = pool[Math.floor(Math.random() * pool.length)];
      newEnemies = [{
        index: 0,
        monster: { 
          ...(m as any), 
          image: (m as any).image || `/monsters/${m.id}.png`, 
          level 
        } as Monster,
        currentHP: hp,
        maxHP: hp,
        energy: 0,
        shield,
        shieldMax: shield,
        isBoss: true,
        isDead: false,
      }];
      setTrailingBossHP(hp);
      addLog(`⚔️ FINÁLNÍ VLNA: Legendární Boss ${getLoc(m.name, 'cz')} se probudil z temnoty!`, 'info');
    } else {
      if (waveConfig.cloneSameMonster) {
        const m = pool[Math.floor(Math.random() * pool.length)];
        newEnemies = Array.from({ length: waveConfig.enemyCount }).map((_, idx) => {
          return {
            index: idx,
            monster: { 
              ...(m as any), 
              image: (m as any).image || `/monsters/${m.id}.png`, 
              level 
            } as Monster,
            currentHP: hp,
            maxHP: hp,
            energy: 20 + Math.random() * 20,
            shield,
            shieldMax: shield,
            isBoss: false,
            isDead: false,
          };
        });
        addLog(`⚔️ VLNA ${waveNum}: Do cesty se vám postavili vzácní ${getLoc(m.name, 'cz')}!`, 'info');
      } else {
        newEnemies = Array.from({ length: waveConfig.enemyCount }).map((_, idx) => {
          const m = pool[Math.floor(Math.random() * pool.length)];
          return {
            index: idx,
            monster: { 
              ...(m as any), 
              image: (m as any).image || `/monsters/${m.id}.png`, 
              level 
            } as Monster,
            currentHP: hp,
            maxHP: hp,
            energy: 20 + Math.random() * 20,
            shield,
            shieldMax: shield,
            isBoss: false,
            isDead: false,
          };
        });
        addLog(`⚔️ VLNA ${waveNum}: Do cesty se vám postavila skupina nepřátel!`, 'info');
      }
    }

    setEnemies(newEnemies);
    setBossTargetIdx(0);
    nextBossAttackRef.current = 0;
  }, [rareMonsters, epicMonsters, legendaryMonsters]);

  // Start simulation based on active selected dungeon config
  const initSimulation = useCallback(() => {
    if (!selectedDungeon) return;
    if (epicMonsters.length < 4) return;

    const shuffled = [...epicMonsters].sort(() => 0.5 - Math.random());
    const recLevel = selectedDungeon.recommendedLevel;

    const initialPlayers: DungeonPlayer[] = Array.from({ length: playerCount }).map((_, idx) => {
      const monster = shuffled[idx % shuffled.length];
      const maxHP = (monster.stats?.hp || 100) * 10 + (recLevel * 30) + 300;
      return {
        index: idx,
        monster: { 
          ...(monster as any), 
          image: (monster as any).image || `/monsters/${monster.id}.png`,
          level: recLevel 
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
    loadWaveEnemies(1, selectedDungeon);
  }, [playerCount, epicMonsters, selectedDungeon, loadWaveEnemies]);

  // Auto trigger simulation when a dungeon is selected
  useEffect(() => {
    if (selectedDungeon) {
      initSimulation();
    }
  }, [selectedDungeon]);

  // Walk timer loop to move players on the map and check for collision triggers
  useEffect(() => {
    if (!selectedDungeon || isFighting || battleResult || isTransitioning) return;
    
    const interval = setInterval(() => {
      setPlayerPos((curr) => {
        const dx = targetPos.x - curr.x;
        const dy = targetPos.y - curr.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) return curr;
        
        const speed = 10;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        const nextX = curr.x + vx;
        const nextY = curr.y + vy;
        
        // Check proximity to the current wave spot
        const spotY = currentWave === 1 ? 1800 : (currentWave === 2 ? 1200 : 500);
        
        // If they step into the active wave zone and it's not completed
        if (!completedWaves.includes(currentWave) && nextY <= spotY + 30) {
          // Trigger fight! Stop player
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
        
        return { x: nextX, y: nextY };
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, [selectedDungeon, isFighting, battleResult, isTransitioning, targetPos, currentWave, completedWaves, playLevelUp]);

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

  // Roll Random Loot from RESOURCE_CONFIG
  const rollLoot = useCallback((rarityFilter: 'common' | 'rare' | 'epic' | 'legendary') => {
    const items = Object.entries(RESOURCE_CONFIG).filter(([_, item]) => {
      return item.category === 'relic' && item.rarity === rarityFilter;
    });
    if (items.length > 0) {
      const rolled = items[Math.floor(Math.random() * items.length)];
      return { id: rolled[0], config: rolled[1] };
    }
    return null;
  }, []);

  // Wave advancement handler utilizing configurable loot tables
  const advanceWave = useCallback((nextWave: number) => {
    if (!selectedDungeon) return;
    setIsTransitioning(true);
    setIsPaused(true);
    setTransitionText(`VLNA ${nextWave - 1} VYČIŠTĚNA! Cesta dál je volná.`);
    playLevelUp();

    const waveDrop = selectedDungeon.lootTable.waveDrops[nextWave - 1];
    if (waveDrop && Math.random() < waveDrop.chance) {
      const rolled = rollLoot(waveDrop.rarity);
      if (rolled) {
        setAccumulatedLoot((prev) => [...prev, rolled]);
        addLog(`✨ Nalezena kořist: ${getLoc(rolled.config.label, 'cz')} (${(rolled.config.rarity || 'common').toUpperCase()})!`, 'info');
      }
    }

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
    }, 2500);
  }, [loadWaveEnemies, playLevelUp, rollLoot, selectedDungeon, setIsFighting, setCompletedWaves]);

  // Execute Victory and final Loot screen reading configurations
  const triggerVictory = useCallback(() => {
    if (!selectedDungeon) return;
    setBattleResult('win');
    playVictory();
    setIsPaused(true);

    const finalDrops: any[] = [];
    const rollType = Math.random();
    const dist = selectedDungeon.lootTable.bossDrops.rarityDistribution;
    let rolledItem = null;

    if (rollType < dist.legendary) {
      rolledItem = rollLoot('legendary');
    } else if (rollType < dist.legendary + dist.epic) {
      rolledItem = rollLoot('epic');
    } else {
      rolledItem = rollLoot('rare');
    }

    if (rolledItem) {
      finalDrops.push(rolledItem);
    }

    setAccumulatedLoot((prev) => [...prev, ...finalDrops]);
  }, [playVictory, rollLoot, selectedDungeon]);

  // Manual player actions (Player 0)
  const handleUserBasicAttack = () => {
    if (isPaused || battleResult || isTransitioning || !selectedDungeon) return;
    const activePlayer = players[0];
    if (!activePlayer || activePlayer.isDead || activePlayer.cooldown < 100 || activePlayer.stunTimer > 0 || activePlayer.freezeTimer > 0) return;

    setPlayers((currentPlayers) => {
      const p = currentPlayers[0];
      const targetEnemy = enemies.find(e => !e.isDead);
      if (!targetEnemy) return currentPlayers;

      const isCrit = Math.random() < 0.15;
      const dmg = Math.round((p.monster.stats?.attack || 45) * (isCrit ? 1.6 : 1) * (0.95 + Math.random() * 0.15));

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
            if (currentWave < selectedDungeon.waves.length) {
              advanceWave(currentWave + 1);
            } else {
              triggerVictory();
            }
          }
          return nextEnems;
        });
      }, 500);

      addLog(`⚔️ [VY] ${getLoc(p.monster.name, 'cz')} zaútočil na ${getLoc(targetEnemy.monster.name, 'cz')} za ${dmg} DMG.`, 'player');

      return currentPlayers.map(pl => 
        pl.index === 0 
          ? { ...pl, cooldown: 0, totalDamage: pl.totalDamage + dmg, threat: pl.threat + dmg * 0.9 }
          : pl
      );
    });
  };

  // Dynamic user execution of character's monster abilities
  const handleUserExecuteAbility = (abilityIndex: number) => {
    if (isPaused || battleResult || isTransitioning || !selectedDungeon) return;
    const p = players[0];
    if (!p || p.isDead || p.stunTimer > 0 || p.freezeTimer > 0) return;

    const ability = p.monster.abilities?.[abilityIndex];
    if (!ability) return;

    const cost = ability.type === 'heal' || ability.type === 'regen' ? 30 : 40;
    if (p.energy < cost) return;

    const isHeal = ability.type === 'heal' || ability.type === 'regen';
    
    if (isHeal) {
      const injured = [...players]
        .filter((pl) => !pl.isDead)
        .sort((a, b) => (a.currentHP / a.maxHP) - (b.currentHP / b.maxHP))[0];

      if (injured) {
        const healAmount = Math.round(injured.maxHP * 0.35);
        addLog(`✨ [VY] ${getLoc(p.monster.name, 'cz')} použil ${getLoc(ability.name, 'cz')} na ${getLoc(injured.monster.name, 'cz')} (+${healAmount} HP)!`, 'heal');
        spawnSpellAnimation('heal', 0, injured.index);
        playHeal();

        setTimeout(() => {
          setPlayers((prevPls) => prevPls.map((pl) => {
            if (pl.index === injured.index && !pl.isDead) {
              addPopup(healAmount, true, false, injured.index, true);
              return { ...pl, currentHP: Math.min(pl.maxHP, pl.currentHP + healAmount) };
            }
            return pl;
          }));
        }, 500);

        setPlayers((prevPls) => prevPls.map((pl) => 
          pl.index === 0 
            ? { ...pl, energy: pl.energy - cost, totalHealing: pl.totalHealing + healAmount, threat: pl.threat + healAmount * 0.75 } 
            : pl
        ));
      }
    } else {
      const targetEnemy = enemies.find(e => !e.isDead);
      if (!targetEnemy) return;

      const dmg = Math.round((p.monster.stats?.attack || 45) * 4.2);
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
            if (currentWave < selectedDungeon.waves.length) {
              advanceWave(currentWave + 1);
            } else {
              triggerVictory();
            }
          }
          return nextEnems;
        });
      }, 500);

      setPlayers((prevPls) => prevPls.map((pl) => 
        pl.index === 0 
          ? { ...pl, energy: pl.energy - cost, totalDamage: pl.totalDamage + dmg, threat: pl.threat + dmg * 1.8 } 
          : pl
      ));
    }

    setShowSkillsMenu(false);
  };

  // Main combat logic loops
  useEffect(() => {
    if (isPaused || battleResult || isTransitioning || enemies.length === 0 || players.length === 0 || !selectedDungeon || !isFighting) {
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
          return currentPlayers;
        }

        // 1. Enemies Attack Timer
        nextBossAttackRef.current += 0.1;
        const bossAttackInterval = 2.0;

        if (nextBossAttackRef.current >= bossAttackInterval) {
          nextBossAttackRef.current = 0;
          
          const aliveEnemies = enemies.filter((e) => !e.isDead);
          const alivePlayers = currentPlayers.filter((p) => !p.isDead);

          if (aliveEnemies.length > 0 && alivePlayers.length > 0) {
            const target = alivePlayers.reduce((prev, curr) => (curr.threat > prev.threat ? curr : prev), alivePlayers[0]);
            setBossTargetIdx(target.index);

            aliveEnemies.forEach((enemy) => {
              // Apply +50% damage if boss is enraged
              const rageMultiplier = (enemy.isBoss && bossEnraged) ? 1.5 : 1.0;
              const isSpecial = Math.random() < 0.25;
              let dmg = Math.round((enemy.monster.stats?.attack || 45) * (isSpecial ? 2.2 : 1.3) * (0.85 + Math.random() * 0.3) * rageMultiplier);

              // 30% chance for a physical Swoop/Airstrike (nálet) attack instead of simple projectile!
              const isSwoop = Math.random() < 0.30;

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
                    const isHit = p.index === target.index || (enemy.isBoss && Math.abs(p.index - target.index) <= 1);
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
                spawnSpellAnimation('boss_attack', enemy.index, target.index, getLoc(enemy.monster.type, 'cz'), enemies.length);
                triggerEnemyAttackAnimation(enemy.index);
                if (isSpecial) playSpell(); else playAttack();

                setTimeout(() => {
                  setPlayers((prevPls) => {
                    return prevPls.map((p) => {
                      if (p.index === target.index && !p.isDead) {
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

        // 2. Enemies Energy & Custom Spells Casting
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
                    // Element-Specific AOE with fiery explosion overlays on players!
                    setActiveExplosionIndices([0, 1, 2, 3]);
                    setTimeout(() => setActiveExplosionIndices([]), 850);

                    if (element.includes('ohn') || element.includes('fire')) {
                      addLog(`🌋 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} VYVOLAL KATAKLYZMA (Ohnivý déšť na všechny)!`, 'boss');
                      triggerShake('rgba(239, 68, 68, 0.55)');
                      playSpell();
                      alivePls.forEach((p) => {
                        spawnSpellAnimation('boss_attack', enemy.index, p.index, 'fire', currentEnemies.length);
                        setTimeout(() => {
                          setPlayers((prevPls) => prevPls.map((pl) => {
                            if (pl.index === p.index && !pl.isDead) {
                              const baseDmg = Math.round(180 * (0.8 + Math.random() * 0.4));
                              addPopup(baseDmg, false, true, pl.index, true);
                              playHit();
                              return { ...pl, currentHP: Math.max(0, pl.currentHP - baseDmg), burnTimer: 4.0 };
                            }
                            return pl;
                          }));
                        }, 500);
                      });
                    } else if (element.includes('vod') || element.includes('water')) {
                      addLog(`❄️ BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} SESLAL BLIZZARD (Plošné zmrazení skupiny)!`, 'boss');
                      triggerShake('rgba(14, 165, 233, 0.45)');
                      playSpell();
                      alivePls.forEach((p) => {
                        spawnSpellAnimation('boss_attack', enemy.index, p.index, 'water', currentEnemies.length);
                        setTimeout(() => {
                          setPlayers((prevPls) => prevPls.map((pl) => {
                            if (pl.index === p.index && !pl.isDead) {
                              const baseDmg = Math.round(150 * (0.8 + Math.random() * 0.3));
                              addPopup(baseDmg, false, true, pl.index, true);
                              playHit();
                              return { ...pl, currentHP: Math.max(0, pl.currentHP - baseDmg), freezeTimer: 2.5 };
                            }
                            return pl;
                          }));
                        }, 500);
                      });
                    } else if (element.includes('pří') || element.includes('nature') || element.includes('leaf')) {
                      addLog(`🌿 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} SESLAL ŠTĚPIVÉ KOŘENY (Znehybnění všech)!`, 'boss');
                      triggerShake('rgba(16, 185, 129, 0.4)');
                      playSpell();
                      alivePls.forEach((p) => {
                        spawnSpellAnimation('boss_attack', enemy.index, p.index, 'nature', currentEnemies.length);
                        setTimeout(() => {
                          setPlayers((prevPls) => prevPls.map((pl) => {
                            if (pl.index === p.index && !pl.isDead) {
                              const baseDmg = Math.round(160 * (0.8 + Math.random() * 0.3));
                              addPopup(baseDmg, false, true, pl.index, true);
                              playHit();
                              return { ...pl, currentHP: Math.max(0, pl.currentHP - baseDmg), rootTimer: 3.0 };
                            }
                            return pl;
                          }));
                        }, 500);
                      });
                    } else {
                      addLog(`⚡ BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} SESLAL BLESKOVOU BOUŘI (Elektrické smažení)!`, 'boss');
                      triggerShake('rgba(234, 179, 8, 0.5)');
                      playSpell();
                      alivePls.forEach((p) => {
                        spawnSpellAnimation('boss_attack', enemy.index, p.index, 'lightning', currentEnemies.length);
                        setTimeout(() => {
                          setPlayers((prevPls) => prevPls.map((pl) => {
                            if (pl.index === p.index && !pl.isDead) {
                              const baseDmg = Math.round(200 * (0.8 + Math.random() * 0.4));
                              addPopup(baseDmg, false, true, pl.index, true);
                              playCritical();
                              return { ...pl, currentHP: Math.max(0, pl.currentHP - baseDmg), cooldown: 0 };
                            }
                            return pl;
                          }));
                        }, 500);
                      });
                    }
                  } else if (spellRoll < 0.55) {
                    // Shockwave AOE slam with explosions overlay on all players!
                    addLog(`🌋 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} VYVOLAL ZEMNÍ RÁZOVOU VLNU (Plošný výbuch)!`, 'boss');
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
                  } else if (spellRoll < 0.70) {
                    // Life Drain
                    addLog(`🩸 BOSS ${getLoc(enemy.monster.name, 'cz')} vysál životy z ${getLoc(targetPl.monster.name, 'cz')}!`, 'boss');
                    spawnSpellAnimation('boss_attack', enemy.index, targetPl.index, 'water', currentEnemies.length);
                    playSpell();
                    setTimeout(() => {
                      setPlayers((prevPls) => prevPls.map((pl) => {
                        if (pl.index === targetPl.index && !pl.isDead) {
                          const drain = Math.round(targetPl.maxHP * 0.18);
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
                  } else if (spellRoll < 0.80) {
                    // Boss Bojový vztek (Enrage) Buff
                    addLog(`🌋 BOSS ${getLoc(enemy.monster.name, 'cz').toUpperCase()} PROPÁDÁ ZUŘIVOSTI (+50% DMG na příští 2 útoky)!`, 'boss');
                    playSpell();
                    setBossEnraged(true);
                    setBossEnrageCount(2);
                    triggerShake('rgba(239, 68, 68, 0.4)');
                  } else if (spellRoll < 0.90 && currentEnemies.length < 3) {
                    // Summon a rare helper minion to flank the boss!
                    const pool = rareMonsters.length > 0 ? rareMonsters : epicMonsters;
                    const m = pool[Math.floor(Math.random() * pool.length)];
                    addLog(`👿 BOSS ${getLoc(enemy.monster.name, 'cz')} VYVOLAL POMOCNÍKA ${getLoc(m.name, 'cz').toUpperCase()}!`, 'boss');
                    playSpell();
                    triggerShake('rgba(168, 85, 247, 0.25)');

                    setTimeout(() => {
                      setEnemies((prevEnems) => {
                        if (prevEnems.length >= 3) return prevEnems;
                        const nextIdx = prevEnems.length;
                        const minionEnemy: DungeonEnemy = {
                          index: nextIdx,
                          monster: {
                            ...(m as any),
                            name: {
                              cz: `Pomocník ${getLoc(m.name, 'cz')}`,
                              en: `Minion ${getLoc(m.name, 'en')}`,
                            },
                            image: (m as any).image || `/monsters/${m.id}.png`,
                            level: 10,
                          } as Monster,
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
                  } else {
                    // Boss Ochranný kokon shield + heal
                    addLog(`🛡️ BOSS ${getLoc(enemy.monster.name, 'cz')} si vykouzlil léčivý kokon (+1500 štít & vyléčení)!`, 'boss');
                    playHeal();
                    setTimeout(() => {
                      setEnemies((prevEnems) => prevEnems.map((e) => {
                        if (e.index === enemy.index) {
                          return { 
                            ...e, 
                            shield: Math.min(e.shieldMax, e.shield + 1500), 
                            currentHP: Math.min(e.maxHP, e.currentHP + 800) 
                          };
                        }
                        return e;
                      }));
                      addPopup(800, true, false, enemy.index, true);
                    }, 400);
                  }
                } else {
                  // Trash Enemy standard spells
                  triggerEnemyAttackAnimation(enemy.index);

                  if (spellRoll < 0.25) {
                    addLog(`❄️ ${getLoc(enemy.monster.name, 'cz')} zmrazil ${getLoc(targetPl.monster.name, 'cz')} do ledové kostky!`, 'boss');
                    spawnSpellAnimation('boss_attack', enemy.index, targetPl.index, 'water', currentEnemies.length);
                    playSpell();
                    setTimeout(() => {
                      addPopup(140, false, true, targetPl.index, true);
                      playHit();
                      setPlayers((prevPls) => prevPls.map((pl) => {
                        if (pl.index === targetPl.index) return { ...pl, currentHP: Math.max(0, pl.currentHP - 140), freezeTimer: 2.5 };
                        return pl;
                      }));
                    }, 500);
                  } else if (spellRoll < 0.50) {
                    addLog(`🔥 ${getLoc(enemy.monster.name, 'cz')} zapálil ${getLoc(targetPl.monster.name, 'cz')}!`, 'boss');
                    spawnSpellAnimation('boss_attack', enemy.index, targetPl.index, 'fire', currentEnemies.length);
                    playSpell();
                    setTimeout(() => {
                      addPopup(180, false, true, targetPl.index, true);
                      playCritical();
                      setPlayers((prevPls) => prevPls.map((pl) => {
                        if (pl.index === targetPl.index) return { ...pl, currentHP: Math.max(0, pl.currentHP - 180), burnTimer: 4.0 };
                        return pl;
                      }));
                    }, 500);
                  } else if (spellRoll < 0.75) {
                    addLog(`⚡ ${getLoc(enemy.monster.name, 'cz')} omráčil ${getLoc(targetPl.monster.name, 'cz')}!`, 'boss');
                    spawnSpellAnimation('boss_attack', enemy.index, targetPl.index, undefined, currentEnemies.length);
                    playAttack();
                    setTimeout(() => {
                      addPopup(220, false, true, targetPl.index, true);
                      playHit();
                      setPlayers((prevPls) => prevPls.map((pl) => {
                        if (pl.index === targetPl.index) return { ...pl, currentHP: Math.max(0, pl.currentHP - 220), stunTimer: 2.0 };
                        return pl;
                      }));
                    }, 500);
                  } else {
                    addLog(`🌿 ${getLoc(enemy.monster.name, 'cz')} chytil ${getLoc(targetPl.monster.name, 'cz')} do kořenů!`, 'boss');
                    spawnSpellAnimation('boss_attack', enemy.index, targetPl.index, 'nature', currentEnemies.length);
                    playSpell();
                    setTimeout(() => {
                      addPopup(120, false, true, targetPl.index);
                      playHit();
                      setPlayers((prevPls) => prevPls.map((pl) => {
                        if (pl.index === targetPl.index) return { ...pl, currentHP: Math.max(0, pl.currentHP - 120), rootTimer: 3.0 };
                        return pl;
                      }));
                    }, 500);
                  }
                }
              }
              return { ...enemy, energy: 0 };
            }
            return { ...enemy, energy: nextEnergy };
          });
        });

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
          let nextCd = p.cooldown + (isStunned || isFrozen ? 0 : 5.5);

          if (p.index === 0) {
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

            const targetEnemy = enemies.find(e => !e.isDead);
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

                spawnSpellAnimation('attack', p.index, targetEnemy.index, getLoc(p.monster.type, 'cz'), enemies.length);
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
                        addPopup(dmg, false, false, e.index, isCrit, enemies.length);
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
                      if (currentWave < selectedDungeon.waves.length) {
                        advanceWave(currentWave + 1);
                      } else {
                        triggerVictory();
                      }
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
              
              spawnSpellAnimation('attack', p.index, targetEnemy.index, undefined, enemies.length);
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
                        addLog(`💀 ${getLoc(e.monster.name, 'cz')} byl zničen!`, 'death');
                        return { ...e, currentHP: 0, shield: 0, isDead: true };
                      }
                      return { ...e, currentHP: nextHP, shield: nextShield };
                    }
                    return e;
                  });

                  const allEnemiesDead = nextEnems.every((e) => e.isDead);
                  if (allEnemiesDead) {
                    if (currentWave < selectedDungeon.waves.length) {
                      advanceWave(currentWave + 1);
                    } else {
                      triggerVictory();
                    }
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
  }, [isPaused, enemies, players, currentWave, battleResult, isTransitioning, advanceWave, triggerVictory, bossEnraged, rareMonsters, epicMonsters, selectedDungeon, isFighting]);

  const handleBackClick = () => {
    if (battleResult) {
      setSelectedDungeon(null);
      setIsFighting(false);
      setBattleResult(null);
      setIsPaused(true);
    } else if (isFighting) {
      setIsFighting(false);
      setIsPaused(true);
    } else if (selectedDungeon) {
      setSelectedDungeon(null);
      setIsPaused(true);
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

  // If no dungeon is currently selected, display the Dungeon Selection Screen
  if (!selectedDungeon) {
    return (
      <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none text-white transition-all">
        {/* Selection Screen background */}
        <div className="absolute inset-0 z-0 opacity-40">
          <img src="/dark_cave_bg.png" className="w-full h-full object-cover blur-sm brightness-[0.4]" />
          <div className="absolute inset-0 bg-radial-gradient(circle_at_center,transparent,rgba(0,0,0,0.85))" />
        </div>

        {/* Selection Header */}
        <div className="relative z-10 px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 rounded-full bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h2 className="text-[8px] font-black text-amber-500 uppercase tracking-[0.4em] leading-none mb-0.5">Dungeon Arena</h2>
              <h1 className="text-xs font-black uppercase text-white tracking-widest leading-none">VÝBĚR DUNGEONU</h1>
            </div>
          </div>
        </div>

        {/* Selection Grid */}
        <div className="flex-1 relative z-10 overflow-y-auto px-6 py-6 flex flex-col items-center justify-center">
          <div className="text-center max-w-md mb-8">
            <h3 className="text-lg font-black text-amber-400 tracking-wider uppercase mb-1">
              VSTUPTE DO BRÁNY SOUBOJŮ
            </h3>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Vyberte si jeden z tajemných dungeonů. Každý má své unikátní vlny strážců, legendárního bosse a speciální stoly pro roll kořisti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
            {dungeonsDB.map((dung) => (
              <motion.div
                key={dung.id}
                whileHover={{ scale: 1.03 }}
                className="bg-slate-900/80 border border-white/5 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-xl shadow-2xl relative overflow-hidden group min-h-[220px]"
              >
                {/* Background preview */}
                <div className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity pointer-events-none">
                  <img src={dung.backgroundImage} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                </div>

                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">
                      REC LEVEL {dung.recommendedLevel}+
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      {dung.waves.length} Vlny
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                      {getLoc(dung.name, 'cz')}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-medium mt-1 leading-normal">
                      {getLoc(dung.description, 'cz')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedDungeon(dung);
                    triggerHaptic('medium');
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition active:scale-95 cursor-pointer mt-4 shadow-lg shadow-amber-500/10 border-none"
                >
                  Vstoupit do boje ⚔️
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
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
              background: `radial-gradient(circle 210px at ${playerPos.x}px ${playerPos.y - cameraY}px, rgba(0,0,0,0) 0%, ${fogColor} 45%, rgba(4,10,6,0.85) 75%, rgba(2,4,2,0.98) 100%)`
            }}
          />

          {/* Map canvas container */}
          <div 
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;
              // Bounded walkable path width (x = 135 to 465)
              const boundedX = Math.max(135, Math.min(465, clickX));
              setTargetPos({ x: boundedX, y: clickY });
            }}
            className="absolute top-0 left-0 w-full h-[2400px] cursor-pointer"
            style={{ 
              transform: `translateY(${-cameraY}px)`, 
              transition: 'transform 0.18s ease-out',
              background: mapBg
            }}
          >
            {/* Rocky Cavern Borders (Spooky Warcraft 3 blighted textures) */}
            <div className={cn("absolute inset-y-0 left-0 w-24 bg-gradient-to-r pointer-events-none", wallStyleLeft)}>
              <div className="absolute top-[400px] left-6 text-xs opacity-25">{leftDecos[0]}</div>
              <div className="absolute top-[900px] left-8 text-xs opacity-25">{leftDecos[1]}</div>
              <div className="absolute top-[1400px] left-4 text-xs opacity-25">{leftDecos[2]}</div>
              <div className="absolute top-[1900px] left-7 text-xs opacity-25">{leftDecos[3]}</div>
            </div>
            <div className={cn("absolute inset-y-0 right-0 w-24 bg-gradient-to-l pointer-events-none", wallStyleRight)}>
              <div className="absolute top-[600px] right-7 text-xs opacity-25">{rightDecos[0]}</div>
              <div className="absolute top-[1100px] right-4 text-xs opacity-25">{rightDecos[1]}</div>
              <div className="absolute top-[1600px] right-8 text-xs opacity-25">{rightDecos[2]}</div>
              <div className="absolute top-[2100px] right-5 text-xs opacity-25">{rightDecos[3]}</div>
            </div>

            {/* Central Mossy Path Slab Overlay */}
            <div className="absolute inset-y-0 left-24 right-24 bg-stone-950/45 border-x border-stone-850 pointer-events-none" />

            {/* Slow Drifting Unholy spirits */}
            {spirits.map((s) => (
              <motion.div
                key={s.id}
                initial={{ x: s.x, y: s.yStart, opacity: 0, scale: 0.8 }}
                animate={{ 
                  y: [s.yStart, s.yEnd],
                  x: [s.x, s.x + 20, s.x - 20, s.x],
                  opacity: [0, 0.4, 0.4, 0],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 9 + Math.random() * 2, 
                  delay: s.delay,
                  ease: 'easeInOut' 
                }}
                className={cn("absolute w-3.5 h-3.5 rounded-full blur-[2.5px] pointer-events-none z-10", wispColor)}
              />
            ))}

            {/* Warcraft 3 Low-Poly Style Stone Pillars along the path */}
            {torchesY.map((yVal, idx) => (
              <div key={`pillar-${idx}`} className="absolute inset-x-0 h-0 pointer-events-none" style={{ top: yVal }}>
                {/* Left Pillar */}
                <div className="absolute left-[88px] -translate-y-1/2 w-4 h-9 bg-stone-800 border border-stone-600 rounded shadow-[3px_3px_6px_rgba(0,0,0,0.8)]">
                  <div className={cn("w-full h-1.5 border-b border-stone-700", mossClass)} /> {/* Moss top */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-stone-700 border border-stone-500" />
                </div>
                {/* Right Pillar */}
                <div className="absolute right-[88px] -translate-y-1/2 w-4 h-9 bg-stone-800 border border-stone-600 rounded shadow-[-3px_3px_6px_rgba(0,0,0,0.8)]">
                  <div className={cn("w-full h-1.5 border-b border-stone-700", mossClass)} />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-stone-700 border border-stone-500" />
                </div>
              </div>
            ))}

            {/* Unholy Green Torches held by Iron Brackets */}
            {torchesY.map((yVal, idx) => (
              <div key={`torch-${idx}`} className="absolute inset-x-0 h-0 pointer-events-none" style={{ top: yVal - 16 }}>
                {/* Left Torch */}
                <div className="absolute left-[76px] -translate-y-1/2 flex items-center">
                  <div className="w-4 h-3 bg-stone-900 border border-stone-700 rounded-sm" /> {/* Iron Bracket */}
                  <div className="w-2.5 h-1.5 bg-stone-600 rounded-full -translate-x-1" />
                  <motion.div 
                    animate={{ scale: [1, 1.35, 1], y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.1 + Math.random(), ease: 'easeInOut' }}
                    className={cn("absolute -top-3 left-[18px] w-3 h-3.5 rounded-full blur-[1.5px]", flameClass)}
                  />
                </div>
                {/* Right Torch */}
                <div className="absolute right-[76px] -translate-y-1/2 flex items-center flex-row-reverse">
                  <div className="w-4 h-3 bg-stone-900 border border-stone-700 rounded-sm" />
                  <div className="w-2.5 h-1.5 bg-stone-600 rounded-full translate-x-1" />
                  <motion.div 
                    animate={{ scale: [1.35, 1, 1.35], y: [-3, 0, -3] }}
                    transition={{ repeat: Infinity, duration: 1.1 + Math.random(), ease: 'easeInOut' }}
                    className={cn("absolute -top-3 right-[18px] w-3 h-3.5 rounded-full blur-[1.5px]", flameClass)}
                  />
                </div>
              </div>
            ))}

            {/* Demonic Gate Spots (Necropolis Summon Circles) */}
            {spots.map((spot) => {
              const isCleared = completedWaves.includes(spot.waveIndex);
              const isActive = currentWave === spot.waveIndex;
              return (
                <div key={spot.waveIndex} className="absolute inset-x-0 h-0 pointer-events-none" style={{ top: spot.y }}>
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

            {/* Companion 1 (Left flank) */}
            {players[1] && (
              <div 
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none"
                style={{ left: playerPos.x - 45, top: playerPos.y + 40 }}
              >
                <div className="absolute -inset-1 bg-black/65 rounded-full blur-[2px] w-8 h-4 top-6" style={{ transform: 'rotateX(75deg)' }} />
                <img 
                  src={players[1].monster.image} 
                  className="w-8 h-8 object-contain" 
                  alt="Companion 1"
                />
              </div>
            )}

            {/* Companion 2 (Right flank) */}
            {players[2] && (
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

            {/* Companion 3 (Rear center) */}
            {players[3] && (
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

          {/* Right: WC3 Command Grid buttons */}
          <div className="grid grid-cols-3 gap-1.5 shrink-0">
            <button 
              onClick={() => {
                setTargetPos(playerPos);
                triggerHaptic('light');
              }}
              className="w-12 h-11 bg-stone-950/90 border-2 border-stone-700 hover:border-[#e9c062] rounded flex flex-col items-center justify-center text-[#e9c062] hover:text-white transition active:scale-95 cursor-pointer shadow-md"
            >
              <span className="text-[8px] font-black uppercase tracking-wider block">STOP</span>
              <span className="text-[5px] font-black text-slate-500 block leading-none mt-0.5">[ S ]</span>
            </button>
            <button 
              onClick={() => {
                const spotY = currentWave === 1 ? 1800 : (currentWave === 2 ? 1200 : 500);
                setPlayerPos({ x: playerPos.x, y: spotY + 30 });
                setTargetPos({ x: playerPos.x, y: spotY + 30 });
                triggerHaptic('medium');
              }}
              className="w-12 h-11 bg-stone-950/90 border-2 border-stone-700 hover:border-emerald-500 rounded flex flex-col items-center justify-center text-emerald-400 hover:text-white transition active:scale-95 cursor-pointer shadow-md animate-pulse"
            >
              <span className="text-[8px] font-black uppercase tracking-wider block text-emerald-400">BOJ</span>
              <span className="text-[5px] font-black text-slate-500 block leading-none mt-0.5">[ F ]</span>
            </button>
            <button 
              onClick={() => {
                handleBackClick();
                triggerHaptic('light');
              }}
              className="w-12 h-11 bg-stone-950/90 border-2 border-stone-700 hover:border-red-500 rounded flex flex-col items-center justify-center text-red-400 hover:text-white transition active:scale-95 cursor-pointer shadow-md"
            >
              <span className="text-[8px] font-black uppercase tracking-wider block">ÚTĚK</span>
              <span className="text-[5px] font-black text-slate-500 block leading-none mt-0.5">[ Q ]</span>
            </button>
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
          {players[bossTargetIdx] && !players[bossTargetIdx].isDead && (
            <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/30 px-3 py-0.5 rounded-full text-[8px] font-black uppercase text-red-400 tracking-wider mb-2 animate-pulse">
              <ShieldAlert size={10} className="animate-bounce" />
              NEPŘÁTELÉ ÚTOČÍ NA: {getLoc(players[bossTargetIdx].monster.name, 'cz')}
            </div>
          )}

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
              <div className="h-4.5 w-full bg-slate-950 rounded-md overflow-hidden border border-amber-500/20 p-[1.5px] relative">
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
                <div className="absolute inset-0 flex items-center justify-between px-2.5 z-10 select-none">
                  <span className="text-[9px] font-black text-white font-mono drop-shadow">
                    {bossHP.toLocaleString()} / {bossMaxHP.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-black text-amber-300 font-mono drop-shadow">
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
              <div className="relative h-28 w-28 flex items-center justify-center">
                <MonsterPodium rarity="legendary" isPlayer={false} />
                <motion.img 
                  src={`/monsters/${bossEnemy.monster.id}.png`} 
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
                  className="size-24 object-contain mix-blend-screen drop-shadow-2xl relative z-10" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/96/dragon.png';
                  }}
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
                      
                      <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden relative">
                        <motion.div 
                          className={cn("h-full bg-gradient-to-r from-red-500 to-rose-400", enemy.isBoss && "from-red-600 via-rose-500 to-red-500")}
                          animate={{ width: `${hpPct}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-[6px] font-mono text-white">
                          {enemy.currentHP}/{enemy.maxHP}
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
                        src={`/monsters/${enemy.monster.id}.png`} 
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
                        className={cn("h-16 object-contain z-10", enemy.isBoss && "h-24")} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://img.icons8.com/color/96/cute-monster.png';
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* MID AREA: GAME CONTROLS (Floating play/pause/reset) */}
        <div className="absolute top-1/2 left-4 z-20 flex flex-col gap-2.5">
          <button
            onClick={() => {
              setIsPaused(!isPaused);
              triggerHaptic('medium');
            }}
            className={cn(
              "p-2.5 rounded-full backdrop-blur-xl border flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer",
              isPaused 
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                : "bg-amber-500/20 border-amber-500/50 text-amber-400"
            )}
            title={isPaused ? 'Spustit' : 'Pozastavit'}
          >
            {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
          </button>
          <button
            onClick={() => {
              initSimulation();
              triggerHaptic('light');
            }}
            className="p-2.5 rounded-full bg-slate-900/60 border border-white/10 backdrop-blur-xl text-slate-300 flex items-center justify-center shadow-lg transition active:scale-90 cursor-pointer"
            title="Restart"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Floating DPS / Logs Summary */}
        <div className="absolute top-1/2 right-4 z-20 bg-slate-950/80 border border-white/5 p-2 rounded-xl text-[8px] font-mono space-y-1 backdrop-blur-md max-w-[130px]">
          <div className="text-[9px] font-black uppercase text-slate-400 border-b border-white/5 pb-0.5">Threat list:</div>
          {players.map((p, idx) => (
            <div key={p.index} className="flex justify-between gap-2">
              <span className={cn("truncate max-w-[70px]", idx === bossTargetIdx && !p.isDead && "text-red-400 font-bold")}>
                {idx === bossTargetIdx && !p.isDead ? '🎯 ' : ''}{getLoc(p.monster.name, 'cz')}
              </span>
              <span className="text-amber-400">{Math.round(p.threat)}</span>
            </div>
          ))}
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
              const isTargeted = idx === bossTargetIdx && !p.isDead;
              const isMainPlayer = p.index === 0;

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
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-white truncate max-w-[70px]">
                      {getLoc(p.monster.name, 'cz')}
                      {isMainPlayer && ' (VY)'}
                    </span>
                    <span className="text-[7px] font-black text-red-500 font-mono">Lv {p.monster.level}</span>
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

      {/* WoW-style Bottom Combat Action Bar & Inventory */}
      <div className="p-4 bg-slate-950/85 border-t border-white/5 backdrop-blur-3xl relative z-[9100] flex flex-col items-center gap-3">
        <div className="grid grid-cols-3 gap-3 w-full max-w-md">
          
          {/* Basic Attack */}
          <button
            onClick={handleUserBasicAttack}
            disabled={players[0]?.isDead || players[0]?.cooldown < 100 || isPaused || isTransitioning || mainPlayerStunned}
            className={cn(
              "h-14 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl",
              players[0] && players[0].cooldown >= 100 && !players[0].isDead && !isPaused && !isTransitioning && !mainPlayerStunned
                ? "bg-red-500/10 border-red-500/40 text-red-400 active:scale-95 cursor-pointer shadow-[0_4px_0_rgba(239,68,68,0.2)]"
                : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500 cursor-not-allowed"
            )}
          >
            <Sword size={18} />
            <span className="text-[8px] font-black uppercase mt-1">Útok (100% CD)</span>
          </button>

          {/* Dynamic Skills Selector Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSkillsMenu(!showSkillsMenu);
                setShowItems(false);
              }}
              disabled={players[0]?.isDead || isPaused || isTransitioning || mainPlayerStunned}
              className={cn(
                "w-full h-14 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl",
                players[0] && !players[0].isDead && !isPaused && !isTransitioning && !mainPlayerStunned
                  ? "bg-purple-500/10 border-purple-500/40 text-purple-400 active:scale-95 cursor-pointer shadow-[0_4px_0_rgba(168,85,247,0.2)]"
                  : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500 cursor-not-allowed"
              )}
            >
              <Sparkles size={18} />
              <span className="text-[8px] font-black uppercase mt-1">Schopnosti</span>
            </button>

            {/* Dynamic Skills Dropdown Menu */}
            <AnimatePresence>
              {showSkillsMenu && players[0] && players[0].monster.abilities && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-52 bg-slate-900 border border-white/10 p-3 rounded-2xl shadow-2xl z-[9999] space-y-2"
                >
                  <h4 className="text-[9px] font-black text-purple-400 uppercase text-center tracking-widest opacity-60">
                    Schopnosti monstra
                  </h4>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {players[0].monster.abilities.map((ab, idx) => {
                      const isHeal = ab.type === 'heal' || ab.type === 'regen';
                      const cost = isHeal ? 30 : 40;
                      const hasEnergy = players[0].energy >= cost;

                      return (
                        <button
                          key={idx}
                          disabled={!hasEnergy}
                          onClick={() => handleUserExecuteAbility(idx)}
                          className={cn(
                            "w-full flex justify-between items-center p-2 rounded-xl text-[9px] font-bold text-white transition text-left border",
                            isHeal ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/15" : "bg-red-500/5 hover:bg-red-500/10 border-red-500/15",
                            !hasEnergy && "opacity-45 cursor-not-allowed"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="truncate max-w-[110px]">{getLoc(ab.name, 'cz')}</span>
                            <span className="text-[6px] text-slate-400 font-normal truncate max-w-[110px] italic">
                              {getLoc(ab.description, 'cz')}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[8px] px-1.5 py-0.5 rounded font-mono shrink-0",
                            hasEnergy ? "text-purple-300 bg-purple-500/20" : "text-slate-500 bg-slate-800"
                          )}>
                            {cost}⚡
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Backpack (Potions) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowItems(!showItems);
                setShowSkillsMenu(false);
              }}
              disabled={players[0]?.isDead || isPaused || isTransitioning}
              className={cn(
                "w-full h-14 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl",
                players[0] && !players[0].isDead && !isPaused && !isTransitioning
                  ? "bg-blue-500/10 border-blue-500/40 text-blue-400 active:scale-95 cursor-pointer shadow-[0_4px_0_rgba(59,130,246,0.2)]"
                  : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500 cursor-not-allowed"
              )}
            >
              <span className="text-lg">🎒</span>
              <span className="text-[8px] font-black uppercase mt-1">Batoh</span>
            </button>

            {/* Inventory Popover */}
            <AnimatePresence>
              {showItems && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-16 right-0 w-44 bg-slate-900 border border-white/10 p-3 rounded-2xl shadow-2xl z-[9999] space-y-2"
                >
                  <h4 className="text-[9px] font-black text-blue-400 uppercase text-center tracking-widest opacity-60">Lektvary</h4>
                  
                  {/* HP Potion */}
                  <button
                    onClick={() => {
                      if (hpPotions <= 0) return;
                      setHpPotions(p => p - 1);
                      setPlayers((prevPls) => prevPls.map((pl) => {
                        if (pl.index === 0) {
                          const healed = Math.min(pl.maxHP, pl.currentHP + 400);
                          addPopup(400, true, true, 0);
                          playHeal();
                          addLog(`🧪 Použili jste léčivý lektvar (+400 HP)!`, 'heal');
                          return { ...pl, currentHP: healed };
                        }
                        return pl;
                      }));
                      setShowItems(false);
                    }}
                    disabled={hpPotions <= 0}
                    className="w-full flex justify-between items-center p-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-bold text-white transition"
                  >
                    <span className="flex items-center gap-1">🧪 HP Lektvar</span>
                    <span className="text-[8px] bg-emerald-500/20 px-1.5 py-0.5 rounded">{hpPotions}x</span>
                  </button>

                  {/* Mana Potion */}
                  <button
                    onClick={() => {
                      if (manaPotions <= 0) return;
                      setManaPotions(p => p - 1);
                      setPlayers((prevPls) => prevPls.map((pl) => {
                        if (pl.index === 0) {
                          const energy = Math.min(100, pl.energy + 50);
                          addPopup(50, true, true, 0);
                          playHeal();
                          addLog(`🧪 Použili jste lektvar many (+50 Energie)!`, 'heal');
                          return { ...pl, energy };
                        }
                        return pl;
                      }));
                      setShowItems(false);
                    }}
                    disabled={manaPotions <= 0}
                    className="w-full flex justify-between items-center p-2 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-xl text-[9px] font-bold text-white transition"
                  >
                    <span className="flex items-center gap-1">🧪 Mana Lektvar</span>
                    <span className="text-[8px] bg-blue-500/20 px-1.5 py-0.5 rounded">{manaPotions}x</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* End Game Modal with WoW Loot Chest Opening */}
      <AnimatePresence>
        {battleResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 z-[9999] flex flex-col items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 p-5 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl relative overflow-hidden my-auto"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-30%,rgba(0,255,100,0.12),transparent)] pointer-events-none" />

              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                  Dungeon Dokončen
                </span>
                <h2 className={cn(
                  "text-2xl font-black uppercase tracking-wider mt-0.5",
                  battleResult === 'win' ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]" : "text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                )}>
                  {battleResult === 'win' ? 'VÍTĚZSTVÍ!' : 'PORÁŽKA!'}
                </h2>
              </div>

              {battleResult === 'win' && !chestOpened ? (
                <div className="py-6 flex flex-col items-center gap-4">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.08, 1],
                      rotate: [-2, 2, -2, 2, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    onClick={() => {
                      setChestOpened(true);
                      triggerHaptic('heavy');
                    }}
                    className="size-24 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/20 border border-amber-300/40 relative cursor-pointer group active:scale-95 transition-all"
                  >
                    <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_70%)] animate-pulse" />
                    <span className="text-4xl group-hover:scale-110 transition-transform">🎁</span>
                  </motion.div>
                  <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest animate-pulse">
                    Klikni pro otevření truhly s kořistí!
                  </p>
                </div>
              ) : (
                <>
                  {battleResult === 'win' && accumulatedLoot.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1">
                        <Award size={10} /> Získaná Kořist (Loot):
                      </span>
                      <div className="border border-amber-500/20 bg-slate-950/80 rounded-2xl overflow-hidden shadow-inner">
                        <div className="grid grid-cols-6 bg-slate-900/60 px-3 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">
                          <span className="col-span-3 text-left">Předmět / Rarita</span>
                          <span className="col-span-2 text-right">Hod (Roll)</span>
                          <span className="col-span-1 text-right">Kořist</span>
                        </div>
                        <div className="divide-y divide-white/5">
                          {accumulatedLoot.map((loot, idx) => {
                            const rarityColor = 
                              loot.config.rarity === 'legendary' ? 'text-amber-400 font-black' :
                              loot.config.rarity === 'epic' ? 'text-purple-400 font-bold' :
                              loot.config.rarity === 'rare' ? 'text-blue-400 font-bold' :
                              'text-slate-300';
                            
                            // Generate a virtual dice roll 70-100 to simulate a WoW need/greed group roll
                            const rollValue = Math.floor(70 + Math.random() * 30);

                            return (
                              <div key={idx} className="grid grid-cols-6 items-center px-3 py-2 text-[10px] bg-slate-900/10 hover:bg-slate-900/25 transition">
                                <div className="col-span-3 flex items-center gap-2">
                                  <div className={cn(
                                    "size-8 rounded-lg flex items-center justify-center border text-base bg-black/40",
                                    loot.config.rarity === 'legendary' ? 'border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]' :
                                    loot.config.rarity === 'epic' ? 'border-purple-500/40' :
                                    loot.config.rarity === 'rare' ? 'border-blue-500/40' : 'border-white/5'
                                  )}>
                                    {loot.config.icon}
                                  </div>
                                  <div className="truncate text-left">
                                    <span className={cn("block truncate text-[11px] leading-tight", rarityColor)}>
                                      {getLoc(loot.config.label, 'cz')}
                                    </span>
                                    <span className="text-[6px] text-slate-500 font-semibold uppercase tracking-wider block">
                                      {loot.config.rarity}
                                    </span>
                                  </div>
                                </div>
                                <div className="col-span-2 text-right pr-2">
                                  <span className="font-mono text-slate-400 text-[10px]">Hod: </span>
                                  <span className="font-mono text-emerald-400 font-black text-[11px]">{rollValue}</span>
                                </div>
                                <div className="col-span-1 text-right">
                                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">VZATO</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] font-bold text-slate-300 leading-normal px-2">
                    {battleResult === 'win' 
                      ? 'Vaše skupina vyčistila celý dungeon v čase ' + formatTime(dungeonTime) + '!'
                      : 'Monstra vás porazila v čase ' + formatTime(dungeonTime) + '.'}
                  </p>

                  <div className="bg-slate-950/80 rounded-2xl border border-white/5 overflow-hidden text-left">
                    <div className="grid grid-cols-4 bg-slate-900/60 px-3 py-1.5 text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-white/5">
                      <span>Monstrum</span>
                      <span className="text-right">DMG (%)</span>
                      <span className="text-right">DPS</span>
                      <span className="text-right text-emerald-400">Léčení</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {players.map((p, idx) => {
                        const dmgPct = totalDamageDealt > 0 ? Math.round((p.totalDamage / totalDamageDealt) * 100) : 0;
                        const dpsVal = dungeonTime > 0 ? Math.round(p.totalDamage / (dungeonTime / 10)) : 0;
                        return (
                          <div key={p.index} className="grid grid-cols-4 px-3 py-2 text-[10px] font-bold items-center font-mono">
                            <span className="truncate font-sans pr-1 text-slate-300">
                              #{idx + 1} {getLoc(p.monster.name, 'cz')}{p.index === 0 && ' (VY)'}
                            </span>
                            <span className="text-right text-purple-300">
                              {p.totalDamage} <span className="text-[8px] text-slate-500">({dmgPct}%)</span>
                            </span>
                            <span className="text-right text-amber-400">
                              {dpsVal}/s
                            </span>
                            <span className={cn("text-right", p.totalHealing > 0 ? "text-emerald-400" : "text-slate-600")}>
                              {p.totalHealing > 0 ? `+${p.totalHealing}` : '0'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-slate-900/40 px-3 py-2 text-[10px] font-bold border-t border-white/5 flex justify-between font-mono">
                      <span className="font-sans text-slate-400">Celková skupina:</span>
                      <span className="text-white">{totalDamageDealt} DMG</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={initSimulation}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                >
                  Zkusit Znovu
                </button>
                <button
                  onClick={handleBackClick}
                  className="flex-1 py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
                >
                  Zpět
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
