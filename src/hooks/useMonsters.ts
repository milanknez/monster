import { useState, useEffect, useCallback } from 'react'
import type { Monster, Mutation } from '../types'
import { monsterDB } from '../data/monsters'
import { RESOURCE_CONFIG } from '../data/resources'
import { getMonsterMaxHP, calculateLevel, getTotalXPForLevel, getLoc } from '../utils'

export function useMonsters(addToast: (toast: any) => void) {
  const [caughtMonsters, setCaughtMonsters] = useState<Monster[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_caught')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Ensure stats and HP exist on load
        return parsed.map((m: any) => {
          const dbData = monsterDB.find(d => String(d.id) === String(m.id));
          const level = m.level || 1;
          
          let currentXP = m.xp;
          if (m.totalXP !== undefined && currentXP === undefined) {
             // Migration from cumulative totalXP to relative xp
             const baseXP = getTotalXPForLevel(level);
             currentXP = Math.max(0, m.totalXP - baseXP);
          }

          const stats = m.stats || dbData?.stats || { hp: 100, attack: 10, defense: 10 };
          const max = getMonsterMaxHP({ ...m, stats, level, xp: currentXP || 0 });
          
          return {
            ...m,
            name: dbData?.name || m.name,
            type: dbData?.type || m.type,
            rarity: dbData?.rarity || m.rarity,
            stats,
            description: dbData?.description || m.description,
            abilities: dbData?.abilities || m.abilities || [],
            level,
            xp: currentXP || 0,
            currentHP: m.currentHP !== undefined ? Math.min(max, m.currentHP) : max
          }
        })
      }
      return []
    } catch { return [] }
  })

  // Passive & Offline Regeneration
  useEffect(() => {
    const applyRegen = () => {
      const now = Date.now();
      const lastStr = localStorage.getItem('monster_collector_regen_last');
      const last = lastStr ? Number(lastStr) : now;
      const diffMs = now - last;

      // If at least 5 seconds passed, we can apply some healing
      if (diffMs > 5000) {
        const minsPassed = diffMs / 60000;

        setCaughtMonsters(prev => {
          let hasHealed = false;
          const updated = prev.map(m => {
            const maxHP = getMonsterMaxHP(m);
            const current = m.currentHP ?? maxHP;

            if (current < maxHP) {
              hasHealed = true;
              // 10% of total maxHP per minute (full heal in 10 minutes)
              const healPerMin = maxHP * 0.1;
              const totalHeal = healPerMin * minsPassed;
              return {
                ...m,
                currentHP: Math.min(maxHP, current + totalHeal)
              };
            }
            return m;
          });
          return hasHealed ? updated : prev;
        });
        localStorage.setItem('monster_collector_regen_last', now.toString());
      } else if (!lastStr) {
        localStorage.setItem('monster_collector_regen_last', now.toString());
      }
    };

    // Run immediately on load to catch up
    applyRegen();

    // Set up more frequent interval for smoother visual feedback
    const interval = setInterval(applyRegen, 3000); // Check every 3 seconds for smooth UI
    return () => clearInterval(interval);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('monster_collector_caught', JSON.stringify(caughtMonsters))
  }, [caughtMonsters])

  const saveMonster = (monster: Monster, onGiveXP: (xp: number) => void, shouldGiveXP = true) => {
    const existingCount = caughtMonsters.filter(m => m.id === monster.id).length
    if (existingCount >= 3) {
      addToast({ title: 'Batoh je plný', message: `Už máš 3x ${getLoc(monster.name)}.`, type: 'info' })
      return false
    }

    const dbData = monsterDB.find(d => d.id === monster.id)
    const baseStats = monster.stats ? { ...monster.stats } : (dbData?.stats ? { ...dbData.stats } : { hp: 100, attack: 10, defense: 10 })
    const baseLevel = monster.level || 1

    const enriched: Monster = {
      ...monster,
      stats: baseStats,
      mutations: monster.mutations ? JSON.parse(JSON.stringify(monster.mutations)) : [],
      gems: monster.gems ? [...monster.gems] : [null, null, null],
      items: monster.items ? [...monster.items] : [null, null, null],
      level: baseLevel,
      caughtAt: monster.caughtAt || Date.now(),
      xp: monster.xp || 0,
    }

    const max = getMonsterMaxHP(enriched)
    enriched.currentHP = monster.currentHP !== undefined ? monster.currentHP : max

    setCaughtMonsters(prev => [enriched, ...prev])
    
    if (shouldGiveXP) {
      onGiveXP(150)
      addToast({
        title: 'Monstrum chyceno',
        message: `${getLoc(monster.name)} chycen!`,
        type: 'success'
      })
    } else {
      onGiveXP(0) // Trigger callback to show results without adding extra XP
    }
    return true;
  };

  const saveMultipleMonsters = useCallback((monsters: Monster[]) => {
    setCaughtMonsters(prev => {
      const updated = [...prev];
      monsters.forEach(monster => {
        const dbData = monsterDB.find(d => d.id === monster.id);
        const baseStats = dbData?.stats || monster.stats;
        const baseLevel = monster.level || 1;

        const enriched: Monster = {
          ...monster,
          stats: baseStats,
          level: baseLevel,
          caughtAt: monster.caughtAt || (Date.now() + Math.floor(Math.random() * 100000)),
          xp: monster.xp || 0,
        };

        const max = getMonsterMaxHP(enriched);
        enriched.currentHP = monster.currentHP !== undefined ? monster.currentHP : max;
        updated.unshift(enriched);
      });
      return updated;
    });
  }, []);

  const removeMonster = (id: string, caughtAt?: number) => {
    setCaughtMonsters(prev => {
      // Find correctly by ID and caughtAt
      const idx = prev.findIndex(m =>
        m.id === id && (caughtAt !== undefined ? (m as any).caughtAt === caughtAt : true)
      );
      if (idx === -1) return prev;
      const updated = [...prev]
      updated.splice(idx, 1)
      return updated
    })
  }

  const giveMonsterXP = useCallback((index: number, xpGain: number) => {
    setCaughtMonsters(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      const m = { ...updated[index] };

      const oldLevel = m.level;
      m.xp = (m.xp || 0) + xpGain;

      // Relative Level up logic
      let nextLevelReq = getTotalXPForLevel(m.level + 1) - getTotalXPForLevel(m.level);
      while (m.xp >= nextLevelReq) {
        m.xp -= nextLevelReq;
        m.level++;
        nextLevelReq = getTotalXPForLevel(m.level + 1) - getTotalXPForLevel(m.level);
      }

      if (m.level > oldLevel) {
        m.currentHP = getMonsterMaxHP(m); // Full heal on level up
        addToast({
          title: 'LEVEL UP!',
          message: `${getLoc(m.name)} postoupil na úroveň ${m.level}!`,
          type: 'success'
        });
      }

      updated[index] = m;
      return updated;
    });
  }, [addToast]);

  const updateMonsterHP = useCallback((monsterIdx: number, hpChange: number) => {
    setCaughtMonsters(prev => {
      const updated = [...prev];
      if (!updated[monsterIdx]) return prev;

      const m = { ...updated[monsterIdx] };
      const maxHP = getMonsterMaxHP(m);
      m.currentHP = Math.min(maxHP, Math.max(0, (m.currentHP || 0) + hpChange));

      updated[monsterIdx] = m;
      return updated;
    });
  }, []);

  const equipGem = useCallback((monsterIdx: number, gemIdx: number, gemType: string | null) => {
    setCaughtMonsters(prev => {
      const next = [...prev];
      if (!next[monsterIdx]) return prev;
      const m = { ...next[monsterIdx] };
      const gs = [...(m.gems || [null, null, null])];
      gs[gemIdx] = gemType || null;
      m.gems = gs;
      next[monsterIdx] = m;
      return next;
    });
  }, []);

  const updateMonsterStats = useCallback((
    monsterIdx: number, 
    stats: { hp?: number, atk?: number, def?: number, xp?: number }, 
    itemId?: string,
    slotIndex?: number,
    multiplier?: number
  ) => {
    setCaughtMonsters(prev => {
      const updated = [...prev];
      if (!updated[monsterIdx]) return prev;

      const m = { ...updated[monsterIdx] };
      const oldStats = m.stats || { hp: 100, attack: 10, defense: 10 };
      m.stats = {
        hp: oldStats.hp + (stats.hp || 0),
        attack: oldStats.attack + (stats.atk || 0),
        defense: oldStats.defense + (stats.def || 0)
      };

      if (stats.xp) {
        const oldLevel = m.level;
        m.xp = (m.xp || 0) + stats.xp;
        
        // Relative Level up logic
        let nextLevelReq = getTotalXPForLevel(m.level + 1) - getTotalXPForLevel(m.level);
        while (m.xp >= nextLevelReq) {
          m.xp -= nextLevelReq;
          m.level++;
          nextLevelReq = getTotalXPForLevel(m.level + 1) - getTotalXPForLevel(m.level);
        }

        if (m.level > oldLevel) {
          addToast({
            title: 'LEVEL UP!',
            message: `${getLoc(m.name)} postoupil na úroveň ${m.level}!`,
            type: 'success'
          });
        }
      }

      if (itemId) {
        // XP séra (xp_serum_1, xp_serum_2, xp_serum_3) jsou okamžitá stimulancia - přidají XP, ale nezabírají trvalý genomický slot
        if (itemId.startsWith('xp_serum_')) {
          updated[monsterIdx] = m;
          return updated;
        }

        const currentMutations = m.mutations || [];
        // Importované limity: max 15, odemykání po levelech
        const unlockedCount = (() => {
          const lvl = m.level || 1;
          let count = 0;
          if (lvl >= 1) count += 5;
          if (lvl >= 6) count += 4;
          if (lvl >= 12) count += 3;
          if (lvl >= 20) count += 2;
          if (lvl >= 28) count += 1;
          return count;
        })();

        if (currentMutations.length >= 15) {
          addToast({
            title: 'Genetický strop naplněn',
            message: `${getLoc(m.name)} již dosáhl maximální kapacity 15 mutací (100% buněčná nestabilita).`,
            type: 'error'
          });
          return prev;
        }

        if (currentMutations.length >= unlockedCount) {
          addToast({
            title: 'Genetické sloty plné',
            message: `Kapacita pro úroveň ${m.level} je vyčerpána (${currentMutations.length}/${unlockedCount}). Zvyš level pro odemčení dalšího patra.`,
            type: 'warning'
          });
          return prev;
        }

        const mutations = [...currentMutations];
        mutations.push({
          id: itemId,
          timestamp: Date.now(),
          slotIndex: slotIndex ?? currentMutations.length,
          multiplier: multiplier || 1.0
        });
        m.mutations = mutations;
      }

      updated[monsterIdx] = m;
      return updated;
    });
  }, [addToast]);

  const equipItem = useCallback((monsterIdx: number, itemIdx: number, itemType: string | null) => {
    setCaughtMonsters(prev => {
      const next = [...prev];
      if (!next[monsterIdx]) return prev;
      const m = { ...next[monsterIdx] };
      const items = [...(m.items || [null, null, null])];
      items[itemIdx] = itemType || null;
      m.items = items;
      next[monsterIdx] = m;
      return next;
    });
  }, []);

  const removeMonsterMutation = useCallback((monsterIdx: number, slotIndex: number): string | null => {
    let removedId: string | null = null;
    setCaughtMonsters(prev => {
      const next = [...prev];
      if (!next[monsterIdx]) return prev;
      const m = { ...next[monsterIdx] };
      const mutations = [...(m.mutations || [])];

      // Najít mutaci na daném slotIndexu (nebo na indexu pole)
      const mutIdx = mutations.findIndex((mut, idx) => (mut.slotIndex ?? idx) === slotIndex);
      if (mutIdx === -1) return prev;

      const removed = mutations[mutIdx];
      removedId = removed.id;
      const cfg = RESOURCE_CONFIG[removed.id];
      const mult = removed.multiplier || 1.0;

      if (cfg?.stats) {
        const oldStats = m.stats || { hp: 100, attack: 10, defense: 10 };
        m.stats = {
          hp: Math.max(10, oldStats.hp - Math.round((cfg.stats.hp || 0) * mult)),
          attack: Math.max(1, oldStats.attack - Math.round((cfg.stats.atk || 0) * mult)),
          defense: Math.max(1, oldStats.defense - Math.round((cfg.stats.def || 0) * mult))
        };
      }

      mutations.splice(mutIdx, 1);
      m.mutations = mutations;
      next[monsterIdx] = m;

      return next;
    });
    return removedId;
  }, []);

  const swapMonsterMutationSlots = useCallback((monsterIdx: number, fromSlot: number, toSlot: number, newMultiplier: number, oldMultiplier: number) => {
    setCaughtMonsters(prev => {
      const next = [...prev];
      if (!next[monsterIdx]) return prev;
      const m = { ...next[monsterIdx] };
      const mutations = [...(m.mutations || [])];

      const fromMutIdx = mutations.findIndex((mut, idx) => (mut.slotIndex ?? idx) === fromSlot);
      const toMutIdx = mutations.findIndex((mut, idx) => (mut.slotIndex ?? idx) === toSlot);

      if (fromMutIdx === -1) return prev;

      const fromMutItem = mutations[fromMutIdx];
      const cfg = RESOURCE_CONFIG[fromMutItem.id];

      // Pokud se mění násobič patra, přepočítat rozdíl ve statech
      if (cfg?.stats && newMultiplier !== oldMultiplier) {
        const oldStats = m.stats || { hp: 100, attack: 10, defense: 10 };
        const baseHp = cfg.stats.hp || 0;
        const baseAtk = cfg.stats.atk || 0;
        const baseDef = cfg.stats.def || 0;

        const hpDiff = Math.round(baseHp * newMultiplier) - Math.round(baseHp * oldMultiplier);
        const atkDiff = Math.round(baseAtk * newMultiplier) - Math.round(baseAtk * oldMultiplier);
        const defDiff = Math.round(baseDef * newMultiplier) - Math.round(baseDef * oldMultiplier);

        m.stats = {
          hp: Math.max(10, oldStats.hp + hpDiff),
          attack: Math.max(1, oldStats.attack + atkDiff),
          defense: Math.max(1, oldStats.defense + defDiff)
        };
      }

      const fromMut: Mutation = {
        ...fromMutItem,
        slotIndex: toSlot,
        multiplier: newMultiplier
      };
      mutations[fromMutIdx] = fromMut;

      if (toMutIdx !== -1) {
        const toMut: Mutation = {
          ...mutations[toMutIdx],
          slotIndex: fromSlot,
          multiplier: oldMultiplier
        };
        mutations[toMutIdx] = toMut;
      }

      m.mutations = mutations;
      next[monsterIdx] = m;

      addToast({
        title: 'Mutagen přemístěn',
        message: `Genetická esence byla přepojena do nového žilního patra (${newMultiplier}× efekt).`,
        type: 'success'
      });

      return next;
    });
  }, [addToast]);

  const importDirectMonster = useCallback((monster: Monster) => {
    setCaughtMonsters(prev => {
      const filtered = prev.filter(m => (m as any).caughtAt !== (monster as any).caughtAt && !(m.id === monster.id && (m.stats?.attack || 0) < 3000));
      const updated = [monster, ...filtered];
      localStorage.setItem('monster_collector_caught', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    caughtMonsters,
    setCaughtMonsters,
    importDirectMonster,
    saveMonster,
    saveMultipleMonsters,
    removeMonster,
    giveMonsterXP,
    updateMonsterHP,
    updateMonsterStats,
    equipGem,
    equipItem,
    removeMonsterMutation,
    swapMonsterMutationSlots
  };
}
