import { useState, useEffect, useCallback } from 'react'
import type { Monster } from '../types'
import { monsterDB } from '../data/monsters'
import { getMonsterMaxHP, calculateLevel, getTotalXPForLevel } from '../utils'

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

          const max = getMonsterMaxHP({ ...m, level, xp: currentXP || 0 });
          
          return {
            ...m,
            name: dbData?.name || m.name,
            type: dbData?.type || m.type,
            rarity: dbData?.rarity || m.rarity,
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
      addToast({ title: 'Batoh je plný', message: `Už máš 3x ${monster.name}.`, type: 'info' })
      return false
    }

    const dbData = monsterDB.find(d => d.id === monster.id)
    const baseStats = dbData?.stats || monster.stats
    const baseLevel = monster.level || 1

    const enriched: Monster = {
      ...monster,
      stats: baseStats,
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
        message: `${monster.name} chycen!`,
        type: 'success'
      })
    } else {
      onGiveXP(0) // Trigger callback to show results without adding extra XP
    }
    return true
  }

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

  const giveMonsterXP = useCallback((monsterIdx: number, xpGain: number) => {
    setCaughtMonsters(prev => {
      const updated = [...prev]
      if (!updated[monsterIdx]) return prev
      const m = { ...updated[monsterIdx] }

      const oldLevel = m.level
      m.xp = (m.xp || 0) + xpGain

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
          message: `${m.name} postoupil na úroveň ${m.level}!`,
          type: 'success'
        })
      }

      updated[monsterIdx] = m
      return updated
    })
  }, [addToast])

  const updateMonsterHP = useCallback((monsterIdx: number, hpChange: number) => {
    setCaughtMonsters(prev => {
      const updated = [...prev]
      if (!updated[monsterIdx]) return prev

      const m = { ...updated[monsterIdx] }
      const maxHP = getMonsterMaxHP(m);
      m.currentHP = Math.min(maxHP, Math.max(0, (m.currentHP || 0) + hpChange))

      updated[monsterIdx] = m
      return updated
    })
  }, [])

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

  const updateMonsterStats = useCallback((monsterIdx: number, stats: { hp?: number, atk?: number, def?: number }) => {
    setCaughtMonsters(prev => {
      const updated = [...prev]
      if (!updated[monsterIdx]) return prev

      const m = { ...updated[monsterIdx] }
      const oldStats = m.stats || { hp: 100, attack: 10, defense: 10 };
      m.stats = {
        hp: oldStats.hp + (stats.hp || 0),
        attack: oldStats.attack + (stats.atk || 0),
        defense: oldStats.defense + (stats.def || 0)
      }

      updated[monsterIdx] = m
      return updated
    })
  }, [])

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

  return {
    caughtMonsters,
    saveMonster,
    removeMonster,
    giveMonsterXP,
    updateMonsterHP,
    updateMonsterStats,
    equipGem,
    equipItem
  }
}
