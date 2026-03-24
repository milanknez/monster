import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, Shield as ShieldIcon, Zap, Sparkles, X, Wand2, 
  FlaskConical, Trophy, Package, ChevronRight, Smile, 
  RefreshCw, Star, Heart, Aperture, ArrowUpRight, 
  ArrowDownLeft, Flame, Wind, Droplets, Leaf, Circle, 
  Hourglass 
} from 'lucide-react';
import type { Monster, LootTableEntry } from '../../types';
import { cn, GEM_BONUSES, getMonsterMaxHP, TYPE_MATCHUP, ADVANTAGE_MULT, WEAKNESS_MULT } from '../../utils';
import { LOOT_CONFIG } from '../../data/loot';

import { LootModal, type LootItem } from './LootModal';

// --- Types ---
interface DamagePopup {
  id: number;
  value: number;
  isCrit: boolean;
  isEffective: boolean;
  isWeak: boolean;
  isHeal?: boolean;
  isPlayerSide?: boolean;
}

interface StatusEffect {
  type: 'burn' | 'slow' | 'paralyze';
  duration: number;
}

// --- Internal UI Components ---

const HealthBar = ({ current, max, label, colorClass, shadowColor }: { current: number, max: number, label: string, colorClass: string, shadowColor: string }) => (
  <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 relative">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${Math.max(0, Math.min(100, (current / max) * 100))}%` }} 
      className={cn("h-full rounded-full transition-all duration-500", colorClass)}
      style={{ boxShadow: `0 0 15px ${shadowColor}` }}
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[8px] font-black text-white drop-shadow-md uppercase tracking-tighter">
        {Math.round(current)} / {max} {label}
      </span>
    </div>
  </div>
);

const MonsterPodium = ({ isPlayer }: { isPlayer?: boolean }) => (
  <div className="absolute -bottom-6 flex items-center justify-center w-full pointer-events-none">
    <div 
      className={cn(
        "absolute w-40 h-40 rounded-full border-2 blur-[1.5px] opacity-30",
        isPlayer ? "bg-primary/20 border-primary" : "bg-red-500/20 border-red-500"
      )} 
      style={{ 
        boxShadow: `0 0 40px ${isPlayer ? 'rgba(13,185,242,0.8)' : 'rgba(239,68,68,0.8)'}`,
        transform: 'rotateX(78deg)' 
      }}
    />
    <div className="absolute w-32 h-32 flex items-center justify-center" style={{ transform: 'rotateX(78deg)', transformStyle: 'preserve-3d' }}>
      <motion.div 
        animate={{ rotateZ: isPlayer ? -360 : 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className={cn("absolute inset-0 border-2 border-dashed rounded-full opacity-40", isPlayer ? "border-primary/60" : "border-red-400/60")}
      />
      <motion.div 
        animate={{ rotateZ: isPlayer ? 360 : -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className={cn("absolute inset-4 border border-dotted rounded-full opacity-30", isPlayer ? "border-primary/40" : "border-red-400/40")}
      />
    </div>
  </div>
);

const PopupLayer = ({ popups }: { popups: DamagePopup[] }) => (
  <div className="absolute top-0 w-full flex flex-col items-center pointer-events-none z-[400]">
    <AnimatePresence mode="popLayout">
      {popups.map(p => (
        <motion.div 
          key={p.id} 
          initial={{ opacity: 0, y: 30, scale: 0.2 }} 
          animate={{ opacity: 1, y: -100, scale: p.isCrit ? [0.2, 2.2, 1.8] : [0.2, 1.4, 1.1] }} 
          exit={{ opacity: 0, scale: 2.5, y: -150 }} 
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn(
            "absolute font-black italic flex items-center gap-1 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] whitespace-nowrap",
            p.isHeal ? "text-emerald-400 text-5xl" : p.isCrit ? "text-amber-500 text-7xl" : p.isPlayerSide ? "text-6xl text-red-500" : "text-5xl text-red-400"
          )}
        >
          {p.isHeal ? <Heart size={28} className="fill-emerald-400" /> : (p.isEffective ? <ArrowUpRight size={32} className="text-emerald-400 stroke-[5]" /> : (p.isWeak && <ArrowDownLeft size={32} className="text-red-400 stroke-[5]" />))}
          <span className="drop-shadow-[0_0_10px_rgba(0,0,0,1)]">{p.isHeal ? '+' : '-'}{p.value}</span>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const TypeIcon = ({ type }: { type: string }) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('ohn') || t.includes('fire')) return <Flame className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" size={14} />;
  if (t.includes('vod') || t.includes('wat')) return <Droplets className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" size={14} />;
  if (t.includes('ele') || t.includes('elektr') || t.includes('zap')) return <Zap className="text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" size={14} />;
  if (t.includes('pří') || t.includes('pri') || t.includes('nat') || t.includes('leaf') || t.includes('travn')) return <Leaf className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" size={14} />;
  return <Circle className="text-slate-500" size={14} />;
};

const EffectBadges = ({ effects }: { effects: StatusEffect[] }) => (
  <div className="flex gap-2">
    {effects.map((e, i) => (
      <motion.div key={i} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase shadow-lg border backdrop-blur-md",
        e.type === 'burn' ? "bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-orange-500/10" :
        e.type === 'slow' ? "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-blue-500/10" :
        "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-yellow-500/10"
      )}>
        {e.type === 'burn' ? <Flame size={12} className="animate-pulse" /> : 
         e.type === 'slow' ? <Wind size={12} className="animate-bounce" /> : 
         <Zap size={12} className="animate-pulse" />}
        <span>{e.duration}</span>
      </motion.div>
    ))}
  </div>
);

// --- Helpers ---
const getFinalStats = (m: Monster) => {
  const stats = { atk: m.stats?.attack || 10, def: m.stats?.defense || 10, hp: m.stats?.hp || 100 };
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
  const leveling = { 
    atk: levelBonus(stats.atk), 
    def: levelBonus(stats.def), 
    hp: levelBonus(stats.hp) 
  };
  const gems = {
    atk: getGemBonus(stats.atk, 'atk'),
    def: getGemBonus(stats.def, 'def'),
    hp: getGemBonus(stats.hp, 'hp')
  };
  const total = { 
    atk: stats.atk + leveling.atk + gems.atk, 
    def: stats.def + leveling.def + gems.def, 
    hp: stats.hp + leveling.hp + gems.hp 
  };
  return { base: stats, leveling, gems, total };
};

// --- Main Component ---
export const Battle = ({
  playerMonster, enemyMonster, opponentName, incomingEmote, pvpRole, 
  incomingAttack, inventory, onSendEmote, onSendAttack, onUseItem, 
  onWin, onLose, onBack, onCatch, onCatchFail
}: {
  playerMonster: Monster, enemyMonster: Monster, opponentName?: string, 
  incomingEmote?: string | null, pvpRole?: 'challenger' | 'defender',
  incomingAttack?: { dmg: number, isCrit: boolean, isSkill: boolean, isEffective: boolean, isWeak: boolean, isShield?: boolean, timestamp: number } | null,
  inventory?: { type: string, count: number }[],
  onSendEmote?: (emote: string) => void,
  onSendAttack?: (attackData: { dmg: number, isCrit: boolean, isSkill: boolean, isEffective: boolean, isWeak: boolean, isShield?: boolean }) => void,
  onUseItem?: (type: string) => void,
  onWin: (xp: number, loot: any[]) => void, onLose: () => void, onBack: () => void,
  onCatch?: (monster: Monster) => void, onCatchFail?: () => void
}) => {
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'win' | 'lose'>('idle');
  const [enemyAnim, setEnemyAnim] = useState<'idle' | 'attack' | 'hit' | 'win' | 'lose'>('idle');
  const [screenShake, setScreenShake] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [catchAnim, setCatchAnim] = useState(false);
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const [showEmotes, setShowEmotes] = useState(false);
  const [outgoingEmote, setOutgoingEmote] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showLoot, setShowLoot] = useState(false);
  const [isChestOpened, setIsChestOpened] = useState(false);
  const [loot, setLoot] = useState<LootItem[]>([]);
  const [turn, setTurn] = useState<'player' | 'enemy'>(pvpRole ? (pvpRole === 'challenger' ? 'player' : 'enemy') : 'player');
  const [turnTime, setTurnTime] = useState(50);

  // --- Turn Timer ---
  useEffect(() => {
    if (showLoot || playerAnim !== 'idle' || enemyAnim !== 'idle') return;
    const timer = setInterval(() => {
      setTurnTime(prev => {
        if (prev <= 1) {
          if (prev === 1) {
            addLog("Čas vypršel!");
            setTurn(t => t === 'player' ? 'enemy' : 'player');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showLoot, turn, playerAnim, enemyAnim]);

  useEffect(() => {
    setTurnTime(pvpRole ? 50 : 30);
  }, [turn, pvpRole]);

  const playerMaxHP = getMonsterMaxHP(playerMonster);
  const enemyMaxHP = getMonsterMaxHP(enemyMonster);
  const [playerHP, setPlayerHP] = useState<number>(playerMonster.currentHP ?? playerMaxHP);
  const [enemyHP, setEnemyHP] = useState<number>(enemyMonster.stats?.hp || 100);
  const [playerEnergy, setPlayerEnergy] = useState<number>(20);
  const [shieldTurns, setShieldTurns] = useState(0);
  const [enemyShieldTurns, setEnemyShieldTurns] = useState(0);
  const [enemyEffects, setEnemyEffects] = useState<StatusEffect[]>([]);
  const [playerEffects, setPlayerEffects] = useState<StatusEffect[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [winXP, setWinXP] = useState<number>(0);

  const addLog = (msg: string) => setLogs(p => [msg, ...p].slice(0, 3));
  const triggerShake = (isHeavy = false) => { setScreenShake(true); if (isHeavy) { setShowFlash(true); setTimeout(() => setShowFlash(false), 80); } setTimeout(() => setScreenShake(false), 300); };
  const addPopup = (val: number, isEnemySide: boolean, extras: any = {}) => { 
    const p = { id: Date.now() + Math.random(), value: val, isPlayerSide: !isEnemySide, ...extras }; 
    setPopups(prev => [...prev, p]); 
    setTimeout(() => setPopups(prev => prev.filter(item => item.id !== p.id)), 1200); 
  };

  const npcAttackTriggeredRef = useRef(false);
  useEffect(() => {
    if (turn === 'player') npcAttackTriggeredRef.current = false;
  }, [turn]);

  const handleSendEmote = (emote: string) => {
    setOutgoingEmote(emote);
    onSendEmote?.(emote);
    setShowEmotes(false);
    setTimeout(() => setOutgoingEmote(null), 2500);
  };

  const calculateDamage = useCallback((attacker: Monster, defender: Monster, isSkill = false, abilityIdx: number = -1) => {
    const s = getFinalStats(attacker), d = getFinalStats(defender);
    let mult = isSkill ? (attacker.abilities?.[abilityIdx]?.value ?? 1.25) : 0.8;
    const isCrit = Math.random() < (isSkill ? 0.35 : 0.1);
    let typeMult = 1, isEffective = false, isWeak = false;
    const match = TYPE_MATCHUP[attacker.type];
    if (match) {
      if (match.strong === defender.type) { typeMult = ADVANTAGE_MULT; isEffective = true; }
      else if (match.weak === defender.type) { typeMult = WEAKNESS_MULT; isWeak = true; }
    }
    const base = Math.round((s.total.atk * mult - d.total.def * 0.45) * (0.9 + Math.random() * 0.2));
    let dmg = Math.max(Math.floor(s.total.atk * 0.1), base) * typeMult;
    
    // Use latest effects if available
    const attackerEffects = attacker === playerMonster ? playerEffects : enemyEffects;
    if (attackerEffects.some(e => e.type === 'slow')) dmg *= 0.7;
    if (isCrit) dmg *= 1.8;
    if (defender === playerMonster && shieldTurns > 0) dmg *= 0.4;
    if (attacker === playerMonster && enemyShieldTurns > 0) dmg *= 0.4;
    return { dmg: Math.round(dmg), isCrit, isEffective, isWeak };
  }, [playerMonster, shieldTurns, enemyShieldTurns, playerEffects, enemyEffects]);

  const estimateDamage = useCallback((attacker: Monster, defender: Monster, isSkill = false, abilityIdx: number = -1) => {
    const s = getFinalStats(attacker), d = getFinalStats(defender);
    let mult = isSkill ? (attacker.abilities?.[abilityIdx]?.value ?? 1.25) : 0.8;
    const base = Math.round((s.total.atk * mult - d.total.def * 0.45));
    let dmg = Math.max(Math.floor(s.total.atk * 0.1), base);
    if (defender === playerMonster && shieldTurns > 0) dmg *= 0.4;
    if (attacker === playerMonster && enemyShieldTurns > 0) dmg *= 0.4;
    return Math.round(dmg);
  }, [playerMonster, shieldTurns, enemyShieldTurns]);

  const executeAttack = (abilityIdx: number = -1) => {
    if (turn !== 'player' || playerAnim !== 'idle' || enemyHP <= 0) return;
    const isSkill = abilityIdx >= 0;
    const ability = isSkill ? playerMonster.abilities?.[abilityIdx] : null;
    const cost = isSkill ? (ability?.type === 'attack' ? 50 : 30) : 0;
    if (isSkill && playerEnergy < cost) return;
    setShowSkills(false);
    setShowItems(false);
    setPlayerAnim('attack');
    if (isSkill) setPlayerEnergy(p => Math.max(0, p - cost)); else setPlayerEnergy(p => Math.min(100, p + 25));
    setTimeout(() => {
      if (playerEffects.some(e => e.type === 'burn')) { const bd = Math.round(playerMaxHP * 0.05); setPlayerHP(p => Math.max(0, p - bd)); addPopup(bd, false); }
      const res = calculateDamage(playerMonster, enemyMonster, isSkill, abilityIdx);
      let dmg = res.dmg;
      if (ability && Math.random() > (ability.chance || 100) / 100) { addLog(`${ability.name} selhal!`); dmg = 0; }
      else if (ability?.type === 'heal') { const heal = Math.round(playerMaxHP * (ability.value || 0.15)); setPlayerHP(p => Math.min(playerMaxHP, p + heal)); addPopup(heal, false, { isHeal: true }); dmg = 0; }
      else if (ability?.type === 'defense') { setShieldTurns(2); dmg = 0; }
      if (dmg > 0) { 
        setEnemyHP(p => Math.max(0, p - dmg)); 
        setEnemyAnim('hit'); 
        addPopup(dmg, true, res); 
        triggerShake(res.isCrit || isSkill);
        
        if (res.isEffective && Math.random() < 0.6) {
           if (playerMonster.type === 'Ohnivá') { setEnemyEffects(p => [...p, { type: 'burn', duration: 2 }]); addLog("Nepřítel byl zapálen!"); }
           else if (playerMonster.type === 'Vodní') { setEnemyEffects(p => [...p, { type: 'slow', duration: 2 }]); addLog("Nepřítel byl zpomalen!"); }
           else if (playerMonster.type === 'Elektrická') { setEnemyEffects(p => [...p, { type: 'paralyze', duration: 1 }]); addLog("Nepřítel byl ochromen!"); }
        }
      }
      setPlayerEffects(p => p.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration > 0));
      if (pvpRole && onSendAttack) onSendAttack({ ...res, isSkill });
      setTimeout(() => {
        setEnemyAnim('idle'); setPlayerAnim('idle');
        if (enemyHP - dmg <= 0) { 
          setEnemyAnim('lose'); 
          setPlayerAnim('win'); 
          setWinXP(80 + enemyMonster.level * 15); 
          
          // GENERATE LOOT FROM CONFIG
          const generatedLoot: any[] = [];
          const numDrops = Math.floor(Math.random() * 2) + 1; // 1-2 items
          
          for (let i = 0; i < numDrops; i++) {
            const table: LootTableEntry[] = LOOT_CONFIG.battle_win;
            const totalWeight = table.reduce((sum: number, e: LootTableEntry) => sum + e.weight, 0);
            let r = Math.random() * totalWeight;
            let picked = table[0];
            for (const entry of table) {
              if (r < entry.weight) { picked = entry; break; }
              r -= entry.weight;
            }
            const count = Math.floor(Math.random() * (picked.max - picked.min + 1)) + picked.min;
            generatedLoot.push({ 
              id: Math.random().toString(), 
              type: picked.type, 
              count, 
              collected: false 
            });
          }
          
          // Rare bonus chance (10%)
          if (Math.random() < 0.1) {
            const rareTable: LootTableEntry[] = LOOT_CONFIG.rare_bonus;
            const picked = rareTable[Math.floor(Math.random() * rareTable.length)];
            generatedLoot.push({ id: 'rare_'+Math.random(), type: picked.type, count: 1, collected: false });
          }

          setLoot(generatedLoot);
          setTimeout(() => setShowLoot(true), 1200); 
        }
        else setTurn('enemy');
      }, 400);
    }, 400);
  };

  const executeCatch = () => {
    if (turn !== 'player' || playerAnim !== 'idle' || enemyHP <= 0) return;
    setTurn('enemy'); setCatchAnim(true);
    setTimeout(() => {
       const hpRatio = enemyHP / enemyMaxHP;
       const chance = Math.min(0.95, 0.95 * Math.pow(1 - hpRatio, 2.6));
       const success = Math.random() < chance;
       if (success) { 
          setEnemyAnim('win');
          setTimeout(() => onCatch?.(enemyMonster), 1000); 
       } else { 
          setCatchAnim(false); 
          onCatchFail?.(); 
          setLogs(p => ["Chycení selhalo!", ...p].slice(0, 3)); 
       }
    }, 1500);
  };

  useEffect(() => {
    if (turn === 'enemy' && enemyHP > 0 && playerHP > 0 && !pvpRole && !npcAttackTriggeredRef.current) {
      npcAttackTriggeredRef.current = true;
      const timer = setTimeout(() => {
        if (enemyEffects.some(e => e.type === 'paralyze')) {
           addLog(`${enemyMonster.name} je ochromen a nemůže útočit!`);
           setEnemyEffects(p => p.map(e => e.type === 'paralyze' ? { ...e, duration: e.duration - 1 } : e).filter(e => e.duration > 0));
           setTurn('player');
           return;
        }

        setEnemyAnim('attack');
        setTimeout(() => {
          if (enemyEffects.some(e => e.type === 'burn')) { const bd = Math.round(enemyMaxHP * 0.05); setEnemyHP(p => Math.max(0, p - bd)); addPopup(bd, true); }
          const res = calculateDamage(enemyMonster, playerMonster);
          setPlayerHP(p => Math.max(0, p - res.dmg)); setPlayerAnim('hit'); addPopup(res.dmg, false, res); triggerShake(res.isCrit); if (shieldTurns > 0) setShieldTurns(p => p - 1);
          setEnemyEffects(p => p.map(e => e.type !== 'paralyze' ? { ...e, duration: e.duration - 1 } : e).filter(e => e.duration > 0));
          if (enemyShieldTurns > 0) setEnemyShieldTurns(p => p - 1);
          setTimeout(() => {
            setEnemyAnim('idle'); setPlayerAnim('idle'); if (playerHP - res.dmg <= 0) { setPlayerAnim('lose'); setTimeout(onLose, 1200); } else setTurn('player');
          }, 400);
        }, 400);
      }, 1500); // Shorter delay for better flow
      return () => clearTimeout(timer);
    }
  }, [turn, pvpRole]); // SIGNIFICANTLY REDUCED DEPENDENCIES to prevent cancellation by passive regen


  const lastAttackTime = useRef<number>(0);
  useEffect(() => {
     if (incomingAttack && pvpRole && incomingAttack.timestamp !== lastAttackTime.current) {
        lastAttackTime.current = incomingAttack.timestamp;
        if (incomingAttack.isShield) {
          setEnemyShieldTurns(2); setLogs(p => ["Nepřítel aktivoval štít!", ...p]);
          setTimeout(() => setTurn('player'), 1200); return;
        }
        setTurn('enemy'); setEnemyAnim('attack');
        setTimeout(() => {
           setPlayerHP(p => Math.max(0, p - incomingAttack.dmg)); setPlayerAnim('hit'); addPopup(incomingAttack.dmg, false, incomingAttack); 
           if (shieldTurns > 0) setShieldTurns(p => p - 1);
           if (enemyShieldTurns > 0) setEnemyShieldTurns(p => p - 1);
           setTimeout(() => { setPlayerAnim('idle'); setEnemyAnim('idle'); if (playerHP - incomingAttack.dmg <= 0) { setPlayerAnim('lose'); setTimeout(onLose, 1200); } else setTurn('player'); }, 400);
        }, 400);
     }
  }, [incomingAttack, pvpRole, playerHP, shieldTurns, enemyShieldTurns, onLose]);

  return (
    <motion.div animate={screenShake ? { x: [-3, 3, -3, 3, 0], y: [1, -1, 1, -1, 0] } : {}} className="fixed inset-0 z-[9000] bg-slate-950 flex flex-col pt-safe overflow-hidden select-none">
      {/* ARENA BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <img src="/battle_arena_background_1774157568210.png" className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105 saturate-[1.6] contrast-[1.2] brightness-[0.8]" alt="arena" />
         <div className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-transparent to-slate-950/95" />
         <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(transparent_0%,rgba(13,185,242,0.08)_100%)] border-t border-primary/10 perspective-[1000px]">
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(13,185,242,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(13,185,242,0.4) 1px, transparent 1px)', backgroundSize: '60px 60px', transform: 'rotateX(60deg) translateY(-20%)', transformOrigin: 'top' }} />
         </div>
          <AnimatePresence>{showFlash && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white z-[50]" />}</AnimatePresence>
         <div className="absolute inset-0 z-10 opacity-30">
            {[...Array(20)].map((_, i) => (
              <motion.div key={i} initial={{ x: Math.random() * 100 + '%', y: Math.random() * 80 + 20 + '%', opacity: Math.random() * 0.5 + 0.2 }} animate={{ y: [null, '-=15%'], opacity: [null, 0, 0.4, 0] }} transition={{ duration: Math.random() * 4 + 4, repeat: Infinity }} className="absolute size-1.5 bg-primary rounded-full blur-[1.5px]" />
            ))}
          </div>
       </div>
       
       {/* Header */}
       <div className="relative z-[5000] px-6 pt-3 pb-2 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex justify-between items-center">
         <div className="flex flex-col">
           <h2 className="text-[8px] font-black text-white uppercase tracking-[0.4em] opacity-40 leading-none mb-1">Aeternum Arena</h2>
           {logs[0] && <motion.p key={logs[0]} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[9px] font-black text-primary uppercase italic truncate max-w-[150px]">{logs[0]}</motion.p>}
         </div>

         <div className="flex gap-2">
           {onSendEmote && (
              <div className="relative">
                <button onClick={() => setShowEmotes(!showEmotes)} className="p-1.5 rounded-full bg-slate-800/80 text-yellow-500 border border-white/5 active:scale-90"><Smile size={16} /></button>
                <AnimatePresence>{showEmotes && <motion.div initial={{ opacity: 0, scale: 0.8, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0 }} className="absolute top-12 right-0 flex gap-2 bg-slate-900/95 border border-white/20 p-2.5 rounded-2xl shadow-3xl backdrop-blur-xl z-[7000]">{['🤬', '🖕', '💩', '🤣', '🔥', '💎', '💀', '⚡'].map(e => <button key={e} onClick={() => handleSendEmote(e)} className="size-11 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl text-2xl transition-all active:scale-90">{e}</button>)}</motion.div>}</AnimatePresence>
              </div>
           )}
           <button onClick={onBack} className="p-1.5 rounded-full bg-slate-800/80 text-slate-400 border border-white/5"><X size={16} /></button>
        </div>
      </div>

      {/* Battle Scene */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden perspective-[1200px]">
         <AnimatePresence>{catchAnim && <motion.div initial={{ left: '50%', top: '80%', scale: 0.1 }} animate={{ left: '70%', top: '22%', scale: 2.2, rotate: 1440 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.8 }} className="absolute z-[400] text-amber-500 drop-shadow-[0_0_30px_#f59e0b]"><Aperture size={60} /></motion.div>}</AnimatePresence>
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><h1 className="text-[200px] font-black italic text-white/40 tracking-tighter">VS</h1></motion.div>

         {/* ENEMY (TOP RIGHT) */}
         <div className="absolute top-[6%] right-[6%] flex flex-col items-end w-full max-w-[180px] z-20">
            <div className="w-full bg-slate-900/70 backdrop-blur-xl p-2.5 rounded-xl border border-red-500/10 shadow-2xl mb-4 transform -rotate-1">
               <div className="flex justify-between items-center mb-1">
                 <div className="flex items-center gap-1.5"><TypeIcon type={enemyMonster.type} /><span className="text-[10px] font-black text-white uppercase truncate">{enemyMonster.name}</span></div>
                 <span className="text-[8px] font-black text-red-500">Lv {enemyMonster.level}</span>
               </div>
               <HealthBar current={enemyHP} max={enemyMaxHP} label="HP" colorClass="bg-gradient-to-r from-red-600 to-rose-400" shadowColor="rgba(239,68,68,0.4)" />
               <div className="flex justify-between items-center mt-1.5 px-0.5">
                  <div className="flex gap-2">
                     <div className="flex items-center gap-1">
                        <Sword size={8} className="text-red-400" />
                        <span className="text-[9px] font-black text-white italic">
                           {getFinalStats(enemyMonster).total.atk}
                           <span className="text-[7px] text-slate-400 ml-1 font-normal not-italic">
                             ({getFinalStats(enemyMonster).base.atk}+{getFinalStats(enemyMonster).leveling.atk}+{getFinalStats(enemyMonster).gems.atk})
                           </span>
                        </span>
                     </div>
                     <div className="flex items-center gap-1">
                        <ShieldIcon size={8} className="text-blue-400" />
                        <span className="text-[9px] font-black text-white italic">
                           {getFinalStats(enemyMonster).total.def}
                           <span className="text-[7px] text-slate-400 ml-1 font-normal not-italic">
                             ({getFinalStats(enemyMonster).base.def}+{getFinalStats(enemyMonster).leveling.def}+{getFinalStats(enemyMonster).gems.def})
                           </span>
                        </span>
                     </div>
                  </div>
                   <EffectBadges effects={enemyEffects} />
                </div>
                {/* Timer for Enemy turn */}
                {turn === 'enemy' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="absolute -left-16 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                        <Hourglass size={20} className={cn(turnTime <= 10 ? "text-red-500" : "text-amber-400")} />
                      </motion.div>
                      {turnTime <= 10 && <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-red-500/30 rounded-full blur-lg" />}
                    </div>
                    <span className={cn("text-lg font-black tabular-nums tracking-tighter", turnTime <= 10 ? "text-red-500 animate-pulse" : "text-white")}>
                       {turnTime}s
                    </span>
                  </motion.div>
                )}
             </div>
            <motion.div 
              style={{ rotateX: '15deg', rotateY: '-15deg', transformStyle: 'preserve-3d', transformOrigin: 'bottom' }} 
              animate={enemyAnim === 'attack' ? { z: [0, 80, 0], y: [0, 50, 0], x: [0, -30, 0] } : enemyAnim === 'hit' ? { rotateZ: [0, 8, -8, 0], x: [0, 15, -15, 0] } : { y: [0, -4, 0] }} 
              className="relative flex justify-center items-end h-28 w-28"
            >
               <AnimatePresence>{incomingEmote && <motion.div initial={{ opacity: 0, scale: 0, y: 0 }} animate={{ opacity: 1, scale: 1, y: -80 }} exit={{ opacity: 0, scale: 0 }} className="absolute z-[400] bg-white text-3xl p-2 rounded-2xl shadow-3xl border-2 border-slate-200">{incomingEmote}</motion.div>}</AnimatePresence>
               <div className="absolute bottom-4 w-full flex justify-center"><MonsterPodium /></div>
               <AnimatePresence>{enemyShieldTurns > 0 && <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [1, 1.15, 1.05], opacity: [0.6, 0.8, 0.6], rotate: 360 }} exit={{ scale: 1.5, opacity: 0 }} transition={{ duration: 3, repeat: Infinity }} className="absolute size-32 rounded-full border-4 border-red-500/50 bg-[radial-gradient(circle,rgba(239,68,68,0.3)_0%,transparent_70%)] z-10 shadow-[0_0_50px_rgba(239,68,68,0.5)] flex items-center justify-center translate-y-4"><div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-ping opacity-20" /></motion.div>}</AnimatePresence>
               <img src={enemyMonster.image || `/monsters/${enemyMonster.id}.png`} className={cn("w-24 h-24 object-contain mix-blend-screen drop-shadow-2xl relative z-10 translate-y-2", enemyAnim === 'lose' && "opacity-0")} />
               <PopupLayer popups={popups.filter(p => !p.isPlayerSide)} />
            </motion.div>
         </div>

         {/* PLAYER (BOTTOM LEFT) */}
         <div className="absolute bottom-[18%] left-[6%] flex flex-col items-start w-full max-w-[220px] z-30">
            <motion.div 
               style={{ rotateX: '-15deg', rotateY: '15deg', transformStyle: 'preserve-3d', transformOrigin: 'bottom' }} 
               animate={playerAnim === 'attack' ? { z: [0, 180, 0], y: [0, -100, 0], x: [0, 40, 0] } : playerAnim === 'hit' ? { rotateZ: [0, -10, 10, 0], x: [0, -20, 20, 0] } : playerAnim === 'win' ? { y: [-15, 0, -15, 0], scale: [1, 1.05, 1] } : { y: [0, -6, 0] }} 
               className="relative flex justify-center items-end h-36 w-36 mb-4"
            >
               <AnimatePresence>{outgoingEmote && <motion.div initial={{ opacity: 0, scale: 0, y: 0 }} animate={{ opacity: 1, scale: 1, y: -100 }} exit={{ opacity: 0, scale: 0 }} className="absolute z-[400] bg-slate-900 text-3xl p-2 rounded-2xl shadow-3xl border-2 border-primary/40">{outgoingEmote}</motion.div>}</AnimatePresence>
               <div className="absolute bottom-6 w-full flex justify-center"><MonsterPodium isPlayer /></div>
               <AnimatePresence>{shieldTurns > 0 && <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [1, 1.15, 1.05], opacity: [0.6, 0.8, 0.6], rotate: 360 }} exit={{ scale: 1.5, opacity: 0 }} transition={{ duration: 3, repeat: Infinity }} className="absolute size-48 rounded-full border-4 border-primary/50 bg-[radial-gradient(circle,rgba(59,130,246,0.3)_0%,transparent_70%)] z-10 shadow-[0_0_50px_rgba(59,130,246,0.5)] flex items-center justify-center translate-y-4"><div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping opacity-20" /></motion.div>}</AnimatePresence>
               <img src={playerMonster.image || `/monsters/${playerMonster.id}.png`} className="w-32 h-32 object-contain drop-shadow-2xl relative z-20 translate-y-2" />
               <PopupLayer popups={popups.filter(p => p.isPlayerSide)} />
            </motion.div>
            <div className="w-full bg-slate-900/80 backdrop-blur-xl p-3 rounded-xl border border-primary/30 shadow-2xl space-y-1.5 transform rotate-1">
               <div className="flex justify-between items-center whitespace-nowrap overflow-visible">
                  <div className="flex items-center gap-1.5 min-w-0"><TypeIcon type={playerMonster.type} /><span className="text-[12px] font-black text-white uppercase truncate">{playerMonster.name}</span></div>
                  <span className="text-[8px] font-black text-primary ml-2 shrink-0">Lv {playerMonster.level}</span>
               </div>
               <HealthBar current={playerHP} max={playerMaxHP} label="HP" colorClass="bg-gradient-to-r from-emerald-500 to-teal-400" shadowColor="rgba(52,211,153,0.4)" />
               <div className="h-1 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-[0.5px] mb-1"><motion.div animate={{ width: `${playerEnergy}%` }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" /></div>
               
               <div className="flex justify-between items-center px-0.5">
                  <div className="flex gap-3">
                     <div className="flex items-center gap-1">
                        <Sword size={10} className="text-red-400" />
                        <span className="text-[10px] font-black text-white italic tracking-tighter">
                           {getFinalStats(playerMonster).total.atk}
                           <span className="text-[7px] text-slate-400 ml-1 font-normal not-italic tracking-normal">
                             ({getFinalStats(playerMonster).base.atk}+{getFinalStats(playerMonster).leveling.atk}+{getFinalStats(playerMonster).gems.atk})
                           </span>
                        </span>
                     </div>
                     <div className="flex items-center gap-1">
                        <ShieldIcon size={10} className="text-blue-400" />
                        <span className="text-[10px] font-black text-white italic tracking-tighter">
                           {getFinalStats(playerMonster).total.def}
                           <span className="text-[7px] text-slate-400 ml-1 font-normal not-italic tracking-normal">
                             ({getFinalStats(playerMonster).base.def}+{getFinalStats(playerMonster).leveling.def}+{getFinalStats(playerMonster).gems.def})
                           </span>
                        </span>
                     </div>
                  </div>
                   <EffectBadges effects={playerEffects} />
                </div>
                {/* Timer for Player turn */}
                {turn === 'player' && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                        <Hourglass size={20} className={cn(turnTime <= 10 ? "text-red-500" : "text-amber-400")} />
                      </motion.div>
                      {turnTime <= 10 && <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-red-500/30 rounded-full blur-lg" />}
                    </div>
                    <span className={cn("text-lg font-black tabular-nums tracking-tighter", turnTime <= 10 ? "text-red-500 animate-pulse" : "text-white")}>
                       {turnTime}s
                    </span>
                  </motion.div>
                )}
             </div>
          </div>
      </div>

      {/* CONTROL PANEL */}
       <div className="p-4 bg-slate-950/60 border-t border-white/5 backdrop-blur-3xl pb-4 relative z-[9100]">
        <div className="grid grid-cols-4 gap-3">
           {/* Attack */}
           <motion.button 
             whileTap={{ scale: 0.94, y: 4 }} 
             onClick={() => executeAttack(-1)} 
             disabled={turn !== 'player' || playerAnim !== 'idle'} 
             className={cn(
               "col-span-1 h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl relative z-[7001]", 
               turn === 'player' ? "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_8px_0_rgba(239,68,68,0.2)] active:shadow-none translate-y-[-2px] active:translate-y-[0px]" : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500"
             )}
           >
             <Sword size={20} />
              <div className="flex flex-col items-center leading-none mt-1 gap-0.5">
                 <span className="text-[9px] font-black uppercase tracking-wider">Útok</span>
                 <span className="text-[8px] font-bold opacity-60">~ {estimateDamage(playerMonster, enemyMonster)} DMG</span>
              </div>
           </motion.button>

            {/* Skill */}
            <div className="relative col-span-1 z-[7001]">
              <AnimatePresence>{showSkills && <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-[80px] left-0 w-80 bg-slate-900 backdrop-blur-3xl p-4 rounded-2xl border border-purple-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] space-y-2.5"><h4 className="text-[11px] font-black text-purple-400 mb-1.5 uppercase text-center tracking-[0.2em] opacity-80">Nabídka Schopností</h4><div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">{playerMonster.abilities?.map((ab, idx) => { 
                const cost = ab.type === 'attack' ? 50 : 30; 
                const estDmg = estimateDamage(playerMonster, enemyMonster, true, idx);
                const isHeal = ab.type === 'heal';
                const healVal = isHeal ? Math.round(playerMaxHP * (ab.value || 0.15)) : 0;
                
                const type = ab.type?.toLowerCase() || 'attack';
                const typeConfigs: Record<string, { icon: any, color: string, border: string }> = {
                  'attack': { icon: <Sword size={16} strokeWidth={2.5} />, color: '#ef4444', border: 'border-l-red-500' },
                  'extra': { icon: <Sparkles size={16} strokeWidth={2.5} />, color: '#fbbf24', border: 'border-l-amber-400' },
                  'defense': { icon: <ShieldIcon size={16} strokeWidth={2.5} />, color: '#3b82f6', border: 'border-l-blue-400' },
                  'heal': { icon: <Heart size={16} strokeWidth={2.5} />, color: '#10b981', border: 'border-l-emerald-400' },
                  'buff': { icon: <Zap size={16} strokeWidth={2.5} />, color: '#a855f7', border: 'border-l-purple-400' }
                };
                const config = typeConfigs[type] || typeConfigs['attack'];

                return (
                  <button key={idx} onClick={() => { executeAttack(idx); setShowSkills(false); }} disabled={playerEnergy < cost} className={cn("flex items-center justify-between p-3 rounded-xl border border-white/5 border-l-4 transition-all text-left", config.border, playerEnergy >= cost ? "bg-purple-600/15 hover:bg-purple-600/25 shadow-lg" : "opacity-50 grayscale-[0.5]")}>
                    <div className="flex-1 min-w-0 pr-3 py-1">
                      <div className="flex items-center gap-2 mb-1">
                         <span style={{ color: config.color, filter: `drop-shadow(0 0 5px ${config.color}66)` }}>{config.icon}</span>
                         <span className="text-[12px] font-black text-white uppercase tracking-tight truncate flex-1">{ab.name}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] leading-tight text-white/95">
                           <span className="inline-block text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/20 px-2 py-0.5 rounded-md mr-2">
                             {isHeal ? `+${healVal} HP` : `~${estDmg} DMG`}
                           </span>
                           <span className="text-slate-200 font-bold italic">{ab.description}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 bg-black/20 p-1.5 rounded-lg border border-white/5 min-w-[50px]">
                       <span className="text-[11px] font-black text-purple-300 tabular-nums">{cost}⚡</span>
                       <span className="text-[7px] font-black text-purple-500/60 uppercase tracking-tighter">Energie</span>
                    </div>
                  </button>
                ) 
              })}</div></motion.div>}</AnimatePresence>
              <motion.button 
                whileTap={{ scale: 0.94, y: 4 }} 
                onClick={() => { setShowSkills(!showSkills); setShowItems(false); }} 
                disabled={turn !== 'player' || playerAnim !== 'idle'} 
                className={cn(
                  "w-full h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl translate-y-[-2px] active:translate-y-[0px] relative z-[7001]", 
                  turn === 'player' ? "bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-[0_8px_0_rgba(168,85,247,0.2)] active:shadow-none" : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500"
                )}
              >
                <Sparkles size={20} />
                <span className="text-[9px] font-black uppercase mt-1">Skill</span>
              </motion.button>
            </div>
            <div className="relative col-span-1 z-[7001]">
              <AnimatePresence>
                {showItems && (
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-[80px] right-0 w-52 bg-slate-900/98 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl shadow-3xl z-[9999] space-y-3">
                    <h4 className="text-[10px] font-black text-blue-400 mb-1 uppercase text-center tracking-widest opacity-60">Batoh</h4>
                    <div className="flex flex-col gap-2.5">
                      {(inventory?.filter(i => ['hp_potion', 'energy_drink'].includes(i.type)).length || 0) === 0 ? (
                        <p className="text-[9px] text-slate-500 font-bold uppercase py-4 text-center">Žádné lektvary k dispozici</p>
                      ) : (
                        inventory?.filter(i => ['hp_potion', 'energy_drink'].includes(i.type)).map(i => (
                          <button key={i.type} onClick={() => { 
                             if (i.type === 'energy_drink') { setPlayerEnergy(p => Math.min(100, p + 60)); addPopup(60, false, { isHeal: true }); }
                             if (i.type === 'hp_potion') { 
                               const h = Math.round(playerMaxHP * 0.5); 
                               setPlayerHP(p => Math.min(playerMaxHP, p + h)); 
                               addPopup(h, false, { isHeal: true }); 
                             }
                             onUseItem?.(i.type); 
                             setShowItems(false); 
                             setShowSkills(false); 
                             setTurn('enemy'); 
                          }} className="flex justify-between items-center p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[10px] font-bold text-white uppercase hover:bg-blue-500/10 transition-colors">
                            <span>{i.type.replace('_', ' ')}</span>
                            <span className="text-[9px] text-blue-300 bg-blue-500/20 px-2.5 py-0.5 rounded-lg">{i.count}x</span>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button 
                whileTap={{ scale: 0.94, y: 4 }} 
                onClick={() => { setShowItems(!showItems); setShowSkills(false); }} 
                disabled={turn !== 'player' || playerAnim !== 'idle'} 
                className={cn(
                  "w-full h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl translate-y-[-2px] active:translate-y-[0px] relative z-[7001]", 
                  turn === 'player' ? "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_8px_0_rgba(59,130,246,0.2)] active:shadow-none" : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500"
                )}
              >
                <Package size={20} />
                <span className="text-[9px] font-black uppercase mt-1">Inven.</span>
              </motion.button>
           </div>

           {/* Special (Catch or Shield) */}
           {!pvpRole ? (
              <motion.button 
                whileTap={{ scale: 0.94, y: 4 }} 
                onClick={executeCatch} 
                disabled={turn !== 'player' || playerAnim !== 'idle'} 
                className={cn(
                  "col-span-1 h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl relative z-[7001]", 
                  turn === 'player' ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_8px_0_rgba(245,158,11,0.2)] active:shadow-none translate-y-[-2px] active:translate-y-[0px]" : "bg-slate-900/40 border-white/5 opacity-40 text-slate-500"
                )}
              >
                <div className="relative">
                  <Aperture size={20} className="text-amber-400 animate-spin-slow drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                  <div className="absolute inset-0 animate-ping bg-amber-500/20 rounded-full scale-110" />
                </div>
                <div className="flex flex-col items-center leading-none mt-1 gap-0.5">
                   <span className="text-[9px] font-black uppercase tracking-wider">Chytit</span>
                   <span className="text-[8px] font-bold opacity-60">{Math.max(1, Math.round(Math.min(0.95, 0.95 * Math.pow(1 - (enemyHP / enemyMaxHP), 2.6)) * 100))}%</span>
                </div>
              </motion.button>
           ) : (
              <motion.button 
                whileTap={{ scale: 0.94, y: 4 }} 
                onClick={() => { if(turn === 'player') { setShieldTurns(2); setPlayerEnergy(p => Math.min(100, p + 10)); setTurn('enemy'); if(pvpRole && onSendAttack) onSendAttack({ dmg: 0, isCrit: false, isSkill: false, isEffective: false, isWeak: false, isShield: true }); } }} 
                disabled={turn !== 'player' || playerAnim !== 'idle' || shieldTurns > 0} 
                className={cn(
                  "col-span-1 h-16 rounded-xl flex flex-col items-center justify-center border transition-all shadow-xl relative z-[7001]", 
                  turn === 'player' && shieldTurns === 0 ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_8px_0_rgba(16,185,129,0.2)] active:shadow-none translate-y-[-2px] active:translate-y-[0px]" : "bg-slate-900/40 border-white/5 opacity-30 text-slate-500"
                )}
              >
                <ShieldIcon size={20} />
                <div className="flex flex-col items-center leading-none mt-1 gap-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider">Štít</span>
                  <span className="text-[8px] font-bold opacity-60">
                    {shieldTurns > 0 ? `${shieldTurns} T` : "-60% DMG"}
                  </span>
                </div>
              </motion.button>
           )}
        </div>
      </div>

      {/* WIN MODAL */}
      <LootModal 
        isOpen={showLoot}
        loot={loot}
        winXP={winXP}
        isChestOpened={isChestOpened}
        onOpenChest={() => setIsChestOpened(true)}
        onCollect={(id) => setLoot(p => p.map(x => x.id === id ? { ...x, collected: true } : x))}
        onComplete={() => onWin(winXP, loot)}
      />
    </motion.div>
  );
};

export default Battle;
