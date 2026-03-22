import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield as ShieldIcon, Zap, Sparkles, X, Wand2, FlaskConical, Trophy, Package, ChevronRight, Smile, RefreshCw, Star, Heart, Aperture, ArrowUpRight, ArrowDownLeft, Flame } from 'lucide-react';
import type { Monster } from '../../types';
import { cn, GEM_BONUSES, getMonsterMaxHP, TYPE_MATCHUP, ADVANTAGE_MULT, WEAKNESS_MULT } from '../../utils';

interface DamagePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  isCrit: boolean;
  isEffective: boolean;
  isWeak: boolean;
  isHeal?: boolean;
}

interface LootItem {
  id: string;
  type: string;
  count: number;
  collected: boolean;
}

const getFinalStats = (m: Monster) => {
  const stats = {
    atk: m.stats?.attack || 10,
    def: m.stats?.defense || 10,
    hp: m.stats?.hp || 100
  };

  const levelBonus = (val: number) => Math.floor(val * (m.level - 1) * 0.1);
  
  const getGemBonus = (baseVal: number, type: string) => {
    if (!m.gems) return 0;
    const targetPrefix = type === 'atk' ? 'gem_red' : type === 'def' ? 'gem_white' : 'gem_green';
    return m.gems.reduce((total, gemId) => {
      if (gemId?.startsWith(targetPrefix)) {
        const g = GEM_BONUSES[gemId];
        if (g) return total + (g.isPerc ? Math.floor(baseVal * (g.value / 100)) : g.value);
      }
      return total;
    }, 0);
  };

  const bonuses = {
    atk: levelBonus(stats.atk) + getGemBonus(stats.atk, 'atk'),
    def: levelBonus(stats.def) + getGemBonus(stats.def, 'def'),
    hp: levelBonus(stats.hp) + getGemBonus(stats.hp, 'hp')
  };

  return { base: stats, bonuses, total: {
    atk: stats.atk + bonuses.atk,
    def: stats.def + bonuses.def,
    hp: stats.hp + bonuses.hp
  }};
};

export const Battle = ({
  playerMonster,
  enemyMonster,
  opponentName,
  incomingEmote,
  pvpRole,
  incomingAttack,
  inventory,
  onSendEmote,
  onSendAttack,
  onUseItem,
  onWin,
  onLose,
  onBack,
  onCatch,
  onCatchFail
}: {
  playerMonster: Monster,
  enemyMonster: Monster,
  opponentName?: string,
  incomingEmote?: string | null,
  pvpRole?: 'challenger' | 'defender',
  incomingAttack?: { dmg: number, isCrit: boolean, isSkill: boolean, isEffective: boolean, isWeak: boolean, timestamp: number } | null,
  inventory?: { type: string, count: number }[],
  onSendEmote?: (emote: string) => void,
  onSendAttack?: (attackData: { dmg: number, isCrit: boolean, isSkill: boolean, isEffective: boolean, isWeak: boolean }) => void,
  onUseItem?: (type: string) => void,
  onWin: (xp: number, loot: { type: any, count: number }[]) => void,
  onLose: () => void,
  onBack: () => void,
  onCatch?: (monster: Monster) => void,
  onCatchFail?: () => void
}) => {
  const [playerHP, setPlayerHP] = useState<number>(playerMonster.currentHP !== undefined ? playerMonster.currentHP : getMonsterMaxHP(playerMonster));
  const [enemyHP, setEnemyHP] = useState<number>(enemyMonster.stats?.hp || 100);
  const [playerEnergy, setPlayerEnergy] = useState<number>(20);
  
  const [turn, setTurn] = useState<'player' | 'enemy'>(pvpRole ? (pvpRole === 'challenger' ? 'player' : 'enemy') : 'player');
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [winXP, setWinXP] = useState<number>(0);
  
  // Status effects: { type: 'burn' | 'slow' | 'paralyze', duration: number }
  const [enemyEffects, setEnemyEffects] = useState<{ type: 'burn' | 'slow' | 'paralyze', duration: number }[]>([]);
  const [playerEffects, setPlayerEffects] = useState<{ type: 'burn' | 'slow' | 'paralyze', duration: number }[]>([]);
  const [showEmotes, setShowEmotes] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(40);
  const [autoAttackTrigger, setAutoAttackTrigger] = useState<number>(0);
  
  // Interaction states
  const [showLoot, setShowLoot] = useState(false);
  const [isChestOpened, setIsChestOpened] = useState(false);
  const [loot, setLoot] = useState<LootItem[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 3));
  };
  
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'win' | 'lose'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit' | 'win' | 'lose'>('idle');
  const [screenShake, setScreenShake] = useState(false);
  const [catchAnim, setCatchAnim] = useState(false);
  
  const playerMaxHP = getMonsterMaxHP(playerMonster);
  const enemyMaxHP = getMonsterMaxHP(enemyMonster);

  const getAbilityEnergyCost = (type?: string) => {
    switch(type) {
       case 'attack': return 50;  // Special Attack
       case 'extra': return 20;   // Extra Attack (Spam)
       case 'heal': return 40;    // Heal / Regen
       case 'defense': return 30; // Shield
       case 'buff': return 30;    // Buff
       default: return 40;
    }
  }

  const generateLoot = () => {
    const types = ['crystal', 'herb', 'mineral', 'energy'];
    const count = Math.floor(Math.random() * 2) + 1;
    const newLoot: LootItem[] = [];
    for(let i=0; i<count; i++) {
      newLoot.push({
        id: Math.random().toString(),
        type: types[Math.floor(Math.random() * types.length)],
        count: Math.floor(Math.random() * 3) + 1,
        collected: false
      });
    }
    setLoot(newLoot);
  };

  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
  };

  const addPopup = (val: number, isEnemy: boolean, isCrit: boolean = false, isEffective: boolean = false, isWeak: boolean = false, isHeal: boolean = false) => {
    const id = Date.now() + Math.random();
    setPopups(prev => [...prev, { 
      id, 
      value: val, 
      x: isEnemy ? 60 : -60, 
      y: isEnemy ? -40 : -40,
      isCrit,
      isEffective,
      isWeak,
      isHeal
    }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  const calculateDamage = useCallback((attacker: Monster, defender: Monster, isSkill = false, abilityIdx: number = -1) => {
    const atkStats = getFinalStats(attacker);
    const defStats = getFinalStats(defender);
    
    let atk = atkStats.total.atk;
    const def = defStats.total.def;

    let skillMult = 1.0;
    const ability = isSkill && abilityIdx >= 0 ? attacker.abilities?.[abilityIdx] : null;

    if (isSkill) {
      if (ability) {
        if (ability.type === 'attack') skillMult = ability.value || 1.5;
        else if (ability.type === 'extra') skillMult = 1.0 + (ability.value || 0.2);
        else skillMult = 1.25; // fallback
      } else {
        skillMult = 1.25;
      }
    } else {
      skillMult = 0.8; // normal attack base
    }

    const critChance = isSkill ? 0.35 : 0.1;
    const isCrit = Math.random() < critChance;
    
    // Type Multiplier (30% chance to activate)
    let typeMult = 1;
    let isEffective = false;
    let isWeak = false;
    
    const match = TYPE_MATCHUP[attacker.type];
    if (match && Math.random() < 0.3) {
      if (match.strong === defender.type) {
        typeMult = ADVANTAGE_MULT;
        isEffective = true;
      } else if (match.weak === defender.type) {
        typeMult = WEAKNESS_MULT;
        isWeak = true;
      }
    }

    const baseDamage = Math.round((atk * skillMult - def * 0.45) * (0.9 + Math.random() * 0.2));
    let dmg = Math.max(Math.floor(atk * 0.1), baseDamage);
    
    dmg = Math.round(dmg * typeMult);

    // Apply SLOW debuff (if attacker has it)
    const attackerEffects = attacker === playerMonster ? playerEffects : enemyEffects;
    if (attackerEffects.some(e => e.type === 'slow')) {
      dmg = Math.round(dmg * 0.7);
    }

    if (isCrit) dmg = Math.round(dmg * 1.8);
    if (defender === playerMonster && isShieldActive) dmg = Math.round(dmg * 0.4);
    
    return { dmg, isCrit, isEffective, isWeak };
  }, [playerMonster, isShieldActive, playerEffects, enemyEffects]);

  const estimateDamage = useCallback((attacker: Monster, defender: Monster, isSkill = false, abilityIdx: number = -1) => {
    const atkStats = getFinalStats(attacker);
    const defStats = getFinalStats(defender);
    
    const atk = atkStats.total.atk;
    const def = defStats.total.def;

    let skillMult = isSkill ? 1.25 : 0.8;
    const ability = isSkill && abilityIdx >= 0 ? attacker.abilities?.[abilityIdx] : null;

    if (ability) {
      if (ability.type === 'attack') skillMult = ability.value || 1.5;
      else if (ability.type === 'extra') skillMult = 1.0 + (ability.value || 0.2);
    }

    const baseDamage = Math.round((atk * skillMult - def * 0.45));
    let dmg = Math.max(Math.floor(atk * 0.1), baseDamage);
    
    if (defender === playerMonster && isShieldActive) dmg = Math.round(dmg * 0.4);
    
    return dmg;
  }, [playerMonster, isShieldActive]);

  const executeAttack = (abilityIdx: number = -1) => {
    if (turn !== 'player' || playerAnim !== 'idle' || enemyHP <= 0) return;
    
    // Dynamic cost based on type (Option B)
    const isSkill = abilityIdx >= 0;
    const abilityData = isSkill ? playerMonster.abilities?.[abilityIdx] : null;
    const energyCost = isSkill ? getAbilityEnergyCost(abilityData?.type) : 0;
    if (isSkill && playerEnergy < energyCost) return;

    setPlayerAnim('attack');
    if (isSkill) setPlayerEnergy((prev: number) => Math.max(0, prev - energyCost));
    else setPlayerEnergy((prev: number) => Math.min(100, prev + 25));

    setTimeout(() => {
      // Check PARALYZE
      if (playerEffects.some(e => e.type === 'paralyze') && Math.random() < 0.6) {
         addLog(`Jsi paralyzován a nemůžeš útočit!`);
         setPlayerAnim('idle');
         setPlayerEffects((prev: { type: 'burn' | 'slow' | 'paralyze', duration: number }[]) => prev.map(e => e.type === 'paralyze' ? { ...e, duration: e.duration - 1 } : e).filter(e => e.duration > 0));
         setTurn('enemy');
         return;
      }

      // Apply BURN damage to player if active
      if (playerEffects.some(e => e.type === 'burn')) {
        const burnDmg = Math.round(playerMaxHP * 0.05);
        setPlayerHP((prev: number) => Math.max(0, prev - burnDmg));
        addPopup(burnDmg, false);
        addLog(`${playerMonster.name} trpí popáleninami! (-${burnDmg})`);
      }

      // Support for special ability logic
      const ability = abilityIdx >= 0 ? playerMonster.abilities?.[abilityIdx] : null;
      let dmg = 0;
      let isCrit = false;
      let isEffective = false;
      let isWeak = false;

      // Check CHANCE (%) from the ability data
      const successChance = (ability?.chance || 100) / 100;
      const isSuccess = Math.random() < successChance;

      if (ability && !isSuccess) {
          addLog(`${ability.name} se nepodařil! (Smůla)`);
          // Note: The energy is still spent, but the effect triggers only on success.
      } else if (ability && ability.type === 'heal') {
          const healPct = ability.value || 0.15;
          const healAmt = Math.round(playerMaxHP * healPct);
          setPlayerHP((prev: number) => Math.min(playerMaxHP, prev + healAmt));
          addPopup(healAmt, false, false, false, false, true);
          addLog(`${playerMonster.name} použil ${ability.name} a vyléčil se!`);
      } else if (ability && ability.type === 'defense') {
          setIsShieldActive(true);
          addLog(`${playerMonster.name} použil ${ability.name} a posílil obranu!`);
      } else if (ability && ability.type === 'buff') {
          setPlayerEffects((prev: any[]) => [...prev.filter(e => e.type !== 'slow'), { type: 'slow', duration: -1 }]); // reusing slow for negative, but here we'd need a real buff system
          addLog(`${playerMonster.name} se nabudil! (Buff)`);
          // For now let's just do extra energy or something simple
          setPlayerEnergy((prev: number) => Math.min(100, prev + 30));
      } else {
          // Normal attack or successful attack skill
          const res = calculateDamage(playerMonster, enemyMonster, abilityIdx >= 0 && isSuccess, abilityIdx);
          dmg = res.dmg; isCrit = res.isCrit; isEffective = res.isEffective; isWeak = res.isWeak;
          
          if (ability && isSuccess) addLog(`${playerMonster.name} použil ${ability.name}!`);
      }
      
      if (pvpRole && onSendAttack) {
         onSendAttack({ dmg, isCrit, isSkill, isEffective, isWeak });
         setTurn('enemy'); 
      }

      if (dmg > 0) {
        setEnemyHP((prev: number) => Math.max(0, prev - dmg));
        setEnemyAnim('hit');
        
        // Elemental Effects
        if (isEffective) {
           if (playerMonster.type === 'Ohnivá') {
              setEnemyEffects((prev: any[]) => [...prev.filter(e => e.type !== 'burn'), { type: 'burn', duration: 2 }]);
              addLog(`${playerMonster.name} zapálil soupeře!`);
           } else if (playerMonster.type === 'Přírodní') {
              const healAmt = Math.round(dmg * 0.1); 
              setPlayerHP((prev: number) => Math.min(playerMaxHP, prev + healAmt));
              addPopup(healAmt, false, false, false, false, true);
           } else if (playerMonster.type === 'Vodní') {
              setEnemyEffects((prev: any[]) => [...prev.filter(e => e.type !== 'slow'), { type: 'slow', duration: 2 }]);
              addLog(`${playerMonster.name} zpomalil soupeře!`);
           } else if (playerMonster.type === 'Elektrická') {
              setEnemyEffects((prev: any[]) => [...prev.filter(e => e.type !== 'paralyze'), { type: 'paralyze', duration: 1 }]);
              addLog(`${playerMonster.name} paralyzoval soupeře!`);
           }
        }

        addPopup(dmg, true, isCrit, isEffective, isWeak);
        triggerShake();
      }

      // Tick down player effects
      setPlayerEffects((prev: any[]) => prev.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0));

      setTimeout(() => {
        setEnemyAnim('idle');
        setPlayerAnim('idle');
        if (enemyHP - dmg <= 0) {
          setEnemyAnim('lose');
          setPlayerAnim('win');
          const finalXP = 80 + enemyMonster.level * 15; // Balanced XP: Level 5 = 155 XP
          setWinXP(finalXP);
          generateLoot();
          setTimeout(() => setShowLoot(true), 1200);
        } else {
          setTurn('enemy');
        }
      }, 400);
    }, 400);
  };

  const executeCatch = () => {
    if (turn !== 'player' || playerAnim !== 'idle') return;
    setPlayerAnim('attack'); // throwing animation
    setCatchAnim(true);
    
    setTimeout(() => {
      // Chance scales from 1% (full HP) to 90% (~0% HP)
      const hpPercentage = enemyHP / enemyMaxHP;
      const catchChance = 0.9 - (hpPercentage * 0.89);
      const isSuccess = Math.random() < catchChance;

      setPlayerAnim('idle');
      
      if (isSuccess) {
        setEnemyAnim('lose'); // Shrink down into ball logic
        setTimeout(() => {
           setCatchAnim(false);
           if (onCatch) onCatch(enemyMonster);
        }, 800);
      } else {
        setCatchAnim(false);
        addPopup(0, true); // display a 0 or miss
        setEnemyAnim('hit'); // shake enemy to show failure
        if (onCatchFail) onCatchFail();
        setTimeout(() => {
          setEnemyAnim('idle');
          setTurn('enemy');
        }, 500);
      }
    }, 600);
  };

  useEffect(() => {
    if (turn === 'enemy' && enemyHP > 0 && playerHP > 0) {
      if (pvpRole) return; // In PvP, we wait for incomingAttack instead of auto-attacking!
      const timer = setTimeout(() => {
        setEnemyAnim('attack');
        setTimeout(() => {
          // Check PARALYZE
          if (enemyEffects.some(e => e.type === 'paralyze') && Math.random() < 0.6) {
             addLog(`Soupeř je paralyzován a nemůže útočit!`);
             setEnemyEffects(prev => prev.map(e => e.type === 'paralyze' ? { ...e, duration: e.duration - 1 } : e).filter(e => e.duration > 0));
             setTurn('player');
             return;
          }

          // Apply BURN
          if (enemyEffects.some(e => e.type === 'burn')) {
             const burnDmg = Math.round(enemyMaxHP * 0.05);
             setEnemyHP(prev => Math.max(0, prev - burnDmg));
             addPopup(burnDmg, true);
             addLog(`Oheň spaluje soupeře! (-${burnDmg})`);
          }
          
          const { dmg, isCrit, isEffective, isWeak } = calculateDamage(enemyMonster, playerMonster);
          
          if (isEffective) {
             if (enemyMonster.type === 'Ohnivá') setPlayerEffects(prev => [...prev.filter(e => e.type !== 'burn'), { type: 'burn', duration: 2 }]);
             else if (enemyMonster.type === 'Přírodní') setEnemyHP(prev => Math.min(enemyMaxHP, prev + Math.round(dmg * 0.1)));
             else if (enemyMonster.type === 'Vodní') setPlayerEffects(prev => [...prev.filter(e => e.type !== 'slow'), { type: 'slow', duration: 2 }]);
             else if (enemyMonster.type === 'Elektrická') setPlayerEffects(prev => [...prev.filter(e => e.type !== 'paralyze'), { type: 'paralyze', duration: 1 }]);
          }

          setPlayerHP(prev => Math.max(0, prev - dmg));
          setPlayerAnim('hit');
          addPopup(dmg, false, isCrit, isEffective, isWeak);
          triggerShake();
          if (isShieldActive) setIsShieldActive(false);

          // Tick down effects
          setEnemyEffects(prev => prev.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0));

          setTimeout(() => {
            setEnemyAnim('idle');
            setPlayerAnim('idle');
            if (playerHP - dmg <= 0) {
              setPlayerAnim('lose');
              setTimeout(onLose, 1200);
            } else {
              setTurn('player');
            }
          }, 400);
        }, 400);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, enemyHP, playerHP, calculateDamage, enemyMonster, playerMonster, onLose, isShieldActive, pvpRole, enemyEffects, playerEffects, enemyMaxHP]);

  // PvP Timer Loop & AutoAttack
  useEffect(() => {
     if (autoAttackTrigger > 0) {
        executeAttack(-1);
     }
  }, [autoAttackTrigger]);

  useEffect(() => {
    if (pvpRole && enemyHP > 0 && playerHP > 0) {
      setTimeLeft(40);
      let timer: any;
      if (turn === 'player') {
        timer = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setAutoAttackTrigger(Date.now());
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      return () => { if (timer) clearInterval(timer); };
    }
  }, [turn, pvpRole, enemyHP, playerHP]);

  // Handle incoming PvP attacks
  const lastAttackTime = useRef<number>(0);
  useEffect(() => {
     if (incomingAttack && pvpRole && incomingAttack.timestamp !== lastAttackTime.current) {
        lastAttackTime.current = incomingAttack.timestamp;
        
        setTurn('enemy'); // Just conceptually lock if not already
        setEnemyAnim('attack');
        
        setTimeout(() => {
           const { dmg, isCrit, isEffective, isWeak } = incomingAttack;
           setPlayerHP(prev => Math.max(0, prev - dmg));
           setPlayerAnim('hit');
           addPopup(dmg, false, isCrit, isEffective, isWeak);
           triggerShake();
           if (isShieldActive) setIsShieldActive(false);

           setTimeout(() => {
             setPlayerAnim('idle');
             setEnemyAnim('idle');
             if (playerHP - incomingAttack.dmg <= 0) {
               setPlayerAnim('lose');
               setTimeout(onLose, 1200);
             } else {
               setTurn('player'); // Give turn back to local player
             }
           }, 400);
        }, 400);
     }
  }, [incomingAttack, pvpRole, playerHP, isShieldActive, onLose]);

  const handleCollectLoot = (id: string) => {
    setLoot(prev => prev.map(item => item.id === id ? { ...item, collected: true } : item));
  };

  const allLootCollected = loot.length > 0 && loot.every(l => l.collected);

  return (
    <motion.div 
      animate={screenShake ? { x: [-5, 5, -5, 5, 0], y: [2, -2, 2, -2, 0] } : {}}
      className="fixed inset-0 z-[2000] bg-background-dark flex flex-col pt-safe overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(13,185,242,0.1),transparent)] pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-[5000] px-6 pt-4 pb-3 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl">
        <button onClick={onBack} className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 z-50">
          <X size={18} />
        </button>
        {onSendEmote && (
          <div className="absolute top-4 right-14 flex flex-col items-end z-[5000]">
            <button onClick={() => setShowEmotes(p => !p)} className="p-2 rounded-full bg-slate-800 text-yellow-500 hover:text-yellow-400 transition-colors shadow-lg">
              <Smile size={18} />
            </button>
            <AnimatePresence>
              {showEmotes && (
                 <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} style={{ transformOrigin: 'top right' }} className="mt-2 flex gap-2 bg-slate-900 border border-white/20 p-2 rounded-2xl shadow-2xl backdrop-blur-md">
                   {['🤬', '🖕', '💩', '🤣'].map(emoji => (
                     <button key={emoji} onClick={() => { onSendEmote(emoji); setShowEmotes(false); }} className="size-12 flex items-center justify-center bg-slate-800 rounded-xl text-2xl hover:bg-slate-700 active:scale-90 transition-all">
                        {emoji}
                     </button>
                   ))}
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="flex flex-col gap-1">
           <h2 className="text-[10px] font-black text-white uppercase tracking-[0.4em] opacity-30">Aeternum Arena</h2>
           {logs[0] && (
             <motion.p key={logs[0]} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[9px] font-black text-primary uppercase italic">
                {logs[0]}
             </motion.p>
           )}
        </div>
      </div>

      {/* Battle Field */}
      <div className="flex-1 relative flex flex-col justify-between p-6">
         <AnimatePresence>
           {catchAnim && (
             <motion.div
               initial={{ left: '25%', top: '70%', scale: 0.1, rotate: 0 }}
               animate={{ left: '70%', top: '30%', scale: 2, rotate: 720 }}
               exit={{ scale: [2, 3, 0], opacity: [1, 1, 0] }}
               transition={{ duration: 0.6, ease: "circOut", exit: { duration: 0.4 } }}
               className="absolute z-[400] text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,1)]"
             >
               <Aperture size={64} strokeWidth={1.5} />
             </motion.div>
           )}
         </AnimatePresence>
        {/* Enemy UI and image same as before... */}
        <div className="flex flex-col items-center self-end w-full max-w-[260px] relative">
          <div className={cn("w-full bg-slate-900/90 p-4 rounded-3xl border shadow-2xl relative mb-4 z-10 scale-90", opponentName ? "border-red-500/50" : "border-white/10")}>
            <div className="flex flex-col mb-2">
              {opponentName ? (
                <>
                   <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1"><Sword size={10} /> {opponentName}</span>
                   <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{enemyMonster.name} LVL {enemyMonster.level}</span>
                </>
              ) : (
                <span className="text-[11px] font-black text-white uppercase tracking-wider">{enemyMonster.name} LVL {enemyMonster.level}</span>
              )}
            </div>
            <div className="flex gap-1.5 mb-2 ml-1">
              {enemyEffects.map((e, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className={cn(
                    "size-6 rounded-lg flex items-center justify-center border shadow-lg",
                    e.type === 'burn' ? "bg-red-500/20 border-red-500/30 text-red-400" :
                    e.type === 'slow' ? "bg-blue-500/20 border-blue-500/30 text-blue-400" :
                    "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                  )}
                >
                   {e.type === 'burn' ? <Flame size={12} fill="currentColor" /> : e.type === 'slow' ? <RefreshCw size={12} className="animate-spin-slow" /> : <Zap size={12} fill="currentColor" />}
                   <span className="text-[8px] font-black ml-0.5">{e.duration}</span>
                </motion.div>
              ))}
            </div>
            <div className="h-4 w-full bg-black/40 rounded-full border border-white/10 overflow-hidden relative shadow-inner p-0.5">
              <motion.div animate={{ width: `${(enemyHP / enemyMaxHP) * 100}%` }} className={cn("h-full rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]")} />
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-[8px] font-black text-white drop-shadow-md">{Math.round(enemyHP)} / {getFinalStats(enemyMonster).total.hp} HP</span>
              </div>
            </div>
            {/* Enemy Stats Row */}
            <div className="flex gap-4 mt-2 px-1">
               {(() => {
                 const s = getFinalStats(enemyMonster);
                 return (
                   <>
                     <div className="flex items-center gap-1">
                        <Sword size={10} className="text-red-400" />
                        <span className="text-[10px] font-black text-white">{s.base.atk}<span className="text-red-400">+{s.bonuses.atk}</span></span>
                     </div>
                     <div className="flex items-center gap-1">
                        <ShieldIcon size={10} className="text-blue-400" />
                        <span className="text-[10px] font-black text-white">{s.base.def}<span className="text-blue-400">+{s.bonuses.def}</span></span>
                     </div>
                   </>
                 )
               })()}
            </div>
          </div>
          <div className="relative flex justify-center items-center">
             <AnimatePresence>
                {incomingEmote && (
                   <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 2 }} exit={{ opacity: 0, scale: 0 }} className="absolute z-[300] text-6xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] pointer-events-none">
                     {incomingEmote}
                   </motion.div>
                )}
             </AnimatePresence>
             <AnimatePresence>
                {popups.filter(p => p.x > 0).map(p => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, y: 0, scale: 0.5 }} 
                    animate={{ opacity: 1, y: -40, scale: p.isCrit ? 1.4 : 1 }} 
                    exit={{ opacity: 0 }} 
                    className={cn(
                      "absolute z-[400] font-black italic flex items-center gap-1 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] pointer-events-none",
                      p.isHeal ? "text-emerald-400" : p.isCrit ? "text-amber-500 text-6xl" : "text-5xl text-red-500"
                    )}
                  >
                    {p.isHeal ? <Heart size={20} className="fill-emerald-400" /> : p.isEffective && <ArrowUpRight size={24} className="text-emerald-400 stroke-[4]" />}
                    {p.isHeal ? '+' : '-'}{p.value}
                  </motion.div>
                ))}
             </AnimatePresence>
             <motion.img 
               animate={enemyAnim === 'attack' ? { x: [-100, 0] } : enemyAnim === 'hit' ? { x: [0, 10, -10, 0] } : { y: [0, -5, 0] }}
               src={enemyMonster.image || `/monsters/${enemyMonster.id}.png`} 
               className={cn("w-32 h-32 object-contain mix-blend-screen", enemyAnim === 'lose' && "opacity-0")} 
             />
          </div>
        </div>

        {/* Player UI same as before... */}
        <div className="flex flex-col items-center self-start w-full max-w-[280px] relative">
          <div className="relative flex justify-center items-center">
             <AnimatePresence>
               {popups.filter(p => p.x < 0).map(p => (
                 <motion.div 
                   key={p.id} 
                   initial={{ opacity: 0, y: 0, scale: 0.5 }} 
                   animate={{ opacity: 1, y: -40, scale: p.isCrit ? 1.4 : 1 }} 
                   exit={{ opacity: 0 }} 
                   className={cn(
                     "absolute z-[400] font-black italic flex items-center gap-1 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] pointer-events-none",
                     p.isHeal ? "text-emerald-400" : p.isCrit ? "text-amber-500 text-6xl" : "text-5xl text-red-500"
                   )}
                 >
                   {p.isHeal ? <Heart size={20} className="fill-emerald-400" /> : p.isEffective && <ArrowUpRight size={24} className="text-emerald-400 stroke-[4]" />}
                   {p.isHeal ? '+' : '-'}{p.value}
                 </motion.div>
               ))}
             </AnimatePresence>
             <AnimatePresence>
               {isShieldActive && (
                 <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }} 
                   animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4], rotate: 360 }} 
                   exit={{ scale: 1.5, opacity: 0 }}
                   transition={{ 
                     opacity: { repeat: Infinity, duration: 2 },
                     rotate: { repeat: Infinity, duration: 8, ease: "linear" },
                     scale: { repeat: Infinity, duration: 2.5 }
                   }}
                   className="absolute size-56 rounded-full border-2 border-blue-400/30 bg-[radial-gradient(circle,rgba(59,130,246,0.2)_0%,transparent_70%)] shadow-[0_0_60px_rgba(59,130,246,0.4)] z-30 pointer-events-none"
                 />
               )}
             </AnimatePresence>
             <motion.img 
               animate={playerAnim === 'attack' ? { x: [0, 100, 0] } : playerAnim === 'win' ? { y: [-20, 0, -20, 0] } : { y: [0, -5, 0] }}
               src={playerMonster.image || `/monsters/${playerMonster.id}.png`} 
               className="w-40 h-40 object-contain drop-shadow-2xl relative z-20" 
             />
          </div>
          <div className="w-full bg-slate-900/90 p-5 rounded-[2.5rem] border border-primary/30 shadow-2xl mt-4 relative z-10">
            <div className="h-3 bg-black/60 rounded-full overflow-hidden mb-2 border border-white/5 p-0.5 relative">
              <motion.div animate={{ width: `${(playerHP / playerMaxHP) * 100}%` }} className={cn("h-full rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]")} />
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-[9px] font-black text-white drop-shadow-md">{Math.round(playerHP)} / {playerMaxHP} HP</span>
              </div>
            </div>
            <div className="h-1.5 bg-black/80 rounded-full overflow-hidden flex border border-white/5">
               <motion.div animate={{ width: `${playerEnergy}%` }} className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            </div>
            {/* Player Stats Row */}
            <div className="flex gap-4 mt-3 px-1">
               {(() => {
                 const s = getFinalStats(playerMonster);
                 return (
                   <>
                     <div className="flex items-center gap-1">
                        <Sword size={10} className="text-red-400" />
                        <span className="text-[10px] font-black text-white">{s.base.atk}<span className="text-red-400">+{s.bonuses.atk}</span></span>
                     </div>
                     <div className="flex items-center gap-1">
                        <ShieldIcon size={10} className="text-blue-400" />
                        <span className="text-[10px] font-black text-white">{s.base.def}<span className="text-blue-400">+{s.bonuses.def}</span></span>
                     </div>
                   </>
                 )
               })()}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Container Same as before... */}
      <div className="p-6 bg-black/80 border-t border-white/10 backdrop-blur-3xl pb-10 relative z-20">
        {pvpRole && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-white/10 py-1 px-4 rounded-xl shadow-2xl flex items-center justify-center min-w-[160px]">
            <span className={cn("text-[10px] font-black uppercase tracking-widest", turn === 'player' ? "text-red-500 animate-pulse" : "text-slate-500")}>
              {turn === 'player' ? `Tvůj tah (${timeLeft}s)` : "Soupeřův tah..."}
            </span>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
           {/* ATTACK */}
           <motion.button whileTap={{ scale: 0.95 }} onClick={() => executeAttack(-1)} disabled={turn !== 'player' || playerAnim !== 'idle'} className={cn("col-span-1 h-20 rounded-[1.8rem] flex flex-col items-center justify-center gap-1 border-b-4 border-black/30 transition-all shadow-2xl relative", turn === 'player' ? "bg-red-600" : "bg-slate-800 opacity-50")}>
             <Sword size={20} className="relative z-10" />
             <div className="flex flex-col items-center">
               <span className="text-[10px] font-black uppercase tracking-wider relative z-10 leading-tight">Útok</span>
               <span className="text-[10px] font-black text-white/70 leading-none">~{estimateDamage(playerMonster, enemyMonster, false)} dmg</span>
             </div>
            </motion.button>
            {/* SKILLS CONSOLIDATED */}
            <div className="relative col-span-1">
              <AnimatePresence>
                {showSkills && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.9 }} 
                    className="absolute bottom-[90px] left-0 w-56 bg-slate-900/95 backdrop-blur-xl p-3 rounded-2xl border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.3)] z-[5000] space-y-2"
                  >
                    <h4 className="text-[10px] font-black text-purple-400 mb-2 uppercase text-center tracking-widest">Speciální Schopnosti</h4>
                    <div className="flex flex-col gap-2">
                       {playerMonster.abilities?.map((ab, idx) => {
                          const cost = getAbilityEnergyCost(ab.type);
                          const isAffordable = playerEnergy >= cost;
                          const isSpecial = ab.type === 'attack';
                          
                          return (
                            <button 
                               key={idx}
                               onClick={() => { executeAttack(idx); setShowSkills(false); }} 
                               disabled={!isAffordable}
                               className={cn(
                                 "flex flex-col p-3 rounded-xl border transition-all text-left relative overflow-hidden group",
                                 isAffordable 
                                   ? isSpecial 
                                     ? "bg-purple-600/20 border-purple-500/40 hover:bg-purple-600/30 active:scale-95" 
                                     : "bg-blue-600/20 border-blue-500/40 hover:bg-blue-600/30 active:scale-95"
                                   : "bg-slate-800/40 border-white/5 opacity-50 cursor-not-allowed"
                               )}
                             >
                                <div className="flex items-center justify-between mb-1">
                                   <div className="flex items-center gap-1.5">
                                      {isSpecial ? <Zap size={10} className="text-purple-400" /> : <Sparkles size={10} className="text-blue-400" />}
                                      <span className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{ab.name || `Skill ${idx + 1}`}</span>
                                   </div>
                                   <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md", isSpecial ? "text-purple-300 bg-purple-500/20" : "text-blue-300 bg-blue-500/20")}>
                                      {cost}⚡
                                   </span>
                                </div>
                                <p className="text-[8px] text-slate-400 font-bold leading-tight line-clamp-2">~{estimateDamage(playerMonster, enemyMonster, true, idx)} dmg • {ab.description}</p>
                             </button>
                          )
                       })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={() => setShowSkills(p => !p)} 
                disabled={turn !== 'player' || playerAnim !== 'idle'} 
                className={cn("w-full h-20 rounded-[1.8rem] flex flex-col items-center justify-center gap-1 border-b-4 border-black/30 transition-all shadow-2xl relative", turn === 'player' ? "bg-purple-600 shadow-purple-500/20" : "bg-slate-800 opacity-50")}
              >
                <Sparkles size={22} className={cn("transition-transform duration-500", showSkills ? "scale-125 rotate-12" : "")} />
                <span className="text-[9px] font-black uppercase tracking-wider">Skill</span>
              </motion.button>
            </div>
           {/* ITEMS */}
           <div className="relative col-span-1">
              <AnimatePresence>
                {showItems && (
                   <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-[90px] right-0 w-48 bg-slate-900 p-3 rounded-2xl border border-white/10 shadow-2xl z-[5000]">
                     <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase text-center">Tvé Věci</h4>
                     <div className="flex flex-col gap-2">
                        {inventory?.filter((i: any) => i?.type === 'hp_potion' || i?.type === 'energy_drink').map((item: any) => (
                           <button key={item?.type} onClick={() => { if (onUseItem && item?.type) onUseItem(item.type); setShowItems(false); setTurn('enemy'); if(pvpRole && onSendAttack) onSendAttack({ dmg: 0, isCrit: false, isSkill: false, isEffective: false, isWeak: false }); }} className="flex items-center justify-between p-2 bg-slate-800 rounded-xl active:scale-95 transition-all">
                              <span className="text-xs uppercase font-bold text-white max-w-[80px] truncate">{item?.type?.replace('_', ' ')}</span>
                              <span className="text-[10px] font-black text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">{item?.count}x</span>
                           </button>
                        ))}
                        {(!inventory || inventory.filter((i: any) => i?.type === 'hp_potion' || i?.type === 'energy_drink').length === 0) && (
                           <p className="text-[10px] text-slate-500 text-center italic py-2">Máš prázdnou lékárničku.</p>
                        )}
                     </div>
                   </motion.div>
                )}
              </AnimatePresence>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowItems(p => !p)} disabled={turn !== 'player' || playerAnim !== 'idle'} className={cn("w-full h-20 rounded-[1.8rem] flex flex-col items-center justify-center gap-1 border-b-4 border-black/30 transition-all shadow-2xl", turn === 'player' ? "bg-blue-600" : "bg-slate-800 opacity-50")}>
                <Package size={22} />
                <span className="text-[9px] font-black uppercase tracking-wider">Batoh</span>
              </motion.button>
           </div>
           
           {/* CATCH - Only in PvE! (Replaces Shield, moving Shield out or removing it for now. Actually, let's keep Shield and make grid 4 to 5 or just replace Shield for PvE) */}
           {!pvpRole ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={executeCatch} disabled={turn !== 'player' || playerAnim !== 'idle'} className={cn("col-span-1 h-20 rounded-[1.8rem] flex flex-col items-center justify-center gap-1 border-b-4 border-black/30 transition-all shadow-2xl relative overflow-hidden", turn === 'player' ? "bg-amber-600" : "bg-slate-800 opacity-50")}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none" />
                <Star size={20} className="relative z-10" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider relative z-10 leading-tight">Chytit</span>
                  <span className="text-[10px] font-black text-amber-200/90 leading-none">{Math.max(1, Math.round((0.9 - ((enemyHP / enemyMaxHP) * 0.89)) * 100))}% šance</span>
                  {/* Debug: ~{estimateDamage(playerMonster, enemyMonster, false, -1)} dmg */}
                </div>
              </motion.button>
           ) : (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { if(turn === 'player') { setIsShieldActive(true); setPlayerEnergy(prev => Math.min(100, prev + 10)); setTurn('enemy'); if(pvpRole && onSendAttack) onSendAttack({ dmg: 0, isCrit: false, isSkill: false, isEffective: false, isWeak: false }); } }} disabled={turn !== 'player' || playerAnim !== 'idle' || isShieldActive} className={cn("col-span-1 h-20 rounded-[1.8rem] flex flex-col items-center justify-center gap-1 border-b-4 border-black/30 transition-all shadow-2xl", turn === 'player' && !isShieldActive ? "bg-emerald-600" : "bg-slate-800 opacity-50")}>
                <ShieldIcon size={22} />
                <span className="text-[9px] font-black uppercase tracking-wider">Štít</span>
              </motion.button>
           )}
        </div>
      </div>

      {/* WIN LOOT MODAL */}
      <AnimatePresence>
        {showLoot && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-slate-900 border-2 border-primary/40 rounded-[3rem] p-8 text-center shadow-3xl">
              <Trophy size={48} className="text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-black text-white uppercase italic mb-2 tracking-tighter">VÍTĚZSTVÍ!</h2>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-8">Získal jsi zaslouženou kořist</p>

              <div className="relative mb-12 flex flex-col items-center">
                {!isChestOpened ? (
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsChestOpened(true)}
                    className="cursor-pointer group relative"
                  >
                    <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/40 transition-colors" />
                    <Package size={80} className="text-primary relative z-10 drop-shadow-[0_0_20px_#0db9f2]" />
                    <p className="mt-4 text-[10px] font-black text-primary animate-pulse uppercase tracking-widest">Klikni pro otevření</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 w-full px-4">
                    <AnimatePresence>
                      {loot.map((item) => !item.collected && (
                        <motion.div
                          key={item.id}
                          initial={{ scale: 0, y: 50, rotate: Math.random() * 20 - 10 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 1.5, opacity: 0, y: -50 }}
                          onClick={() => handleCollectLoot(item.id)}
                          className="bg-slate-800/80 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-slate-700 transition-colors relative"
                        >
                          <div className="absolute -top-2 -right-2 bg-primary text-background-dark text-[10px] font-black size-6 rounded-full flex items-center justify-center shadow-lg">
                            {item.count}
                          </div>
                          <span className="text-[10px] font-black text-white uppercase tracking-tighter">{item.type}</span>
                          <Sparkles size={16} className="text-primary mx-auto mt-2" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {allLootCollected && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2 py-4">
                         <p className="text-emerald-500 font-black uppercase text-[10px] mb-4">Vše posláno do inventáře! ✓</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {allLootCollected && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onWin(winXP, loot.map(l => ({ type: l.type, count: l.count })))}
                  className="w-full py-4 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Pokračovat <ChevronRight size={18} />
                </motion.button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
