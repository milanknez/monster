import { useState, useEffect, useCallback } from 'react'
import type { Monster } from '../types'
import { monsterDB } from '../data/monsters'

export function useMonsters(addToast: (toast: any) => void) {
  const [caughtMonsters, setCaughtMonsters] = useState<Monster[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_caught')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Ensure stats and HP exist on load
        return parsed.map((m: any) => ({
          ...m,
          totalXP: m.totalXP || 0,
          currentHP: m.currentHP !== undefined ? m.currentHP : (m.stats?.hp || 100)
        }))
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
            const maxHP = m.stats?.hp || 100;
            const current = m.currentHP ?? maxHP;
            
            if (current < maxHP) {
              hasHealed = true;
              // 2% of maxHP per minute (full heal in 50 minutes)
              const healPerMin = maxHP * 0.02;
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
    const interval = setInterval(applyRegen, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('monster_collector_caught', JSON.stringify(caughtMonsters))
  }, [caughtMonsters])

  const saveMonster = (monster: Monster, onGiveXP: (xp: number) => void, shouldGiveXP = true) => {
    let success = false
    setCaughtMonsters(prev => {
      const existingCount = prev.filter(m => m.id === monster.id).length
      if (existingCount >= 3) {
        addToast({ title: 'Batoh je plný', message: `Už máš 3x ${monster.name}.`, type: 'info' })
        return prev
      }
      
      const dbData = monsterDB.find(d => d.id === monster.id)
      const enriched: Monster = { 
        ...monster, 
        caughtAt: monster.caughtAt || Date.now(),
        totalXP: monster.totalXP || 0,
        currentHP: monster.currentHP !== undefined ? monster.currentHP : (dbData?.stats?.hp || 100),
        stats: dbData?.stats || monster.stats
      }
      
      const updated = [enriched, ...prev]
      success = true
      return updated
    })
    
    if (success && shouldGiveXP) {
      onGiveXP(250)
      addToast({
        title: 'Monstrum chyceno',
        message: `${monster.name} chycen!`,
        type: 'success'
      })
    }
    return success
  }

  const removeMonster = (id: string, index: number) => {
    setCaughtMonsters(prev => {
      const updated = [...prev]
      updated.splice(index, 1)
      return updated
    })
  }

  const giveMonsterXP = useCallback((monsterIdx: number, xp: number) => {
    setCaughtMonsters(prev => {
      const updated = [...prev]
      const m = { ...updated[monsterIdx] }
      
      const oldLevel = m.level
      m.totalXP = (m.totalXP || 0) + xp
      
      // Leveling: XP needed = lvl * 200
      // 1 -> 2: 200 XP
      // 2 -> 3: 400 XP
      // This is a simple formula for now
      let nextLvlXP = m.level * 250
      while (m.totalXP >= nextLvlXP) {
        m.totalXP -= nextLvlXP
        m.level++
        nextLvlXP = m.level * 250
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
      const maxHP = m.stats?.hp || 100
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

  return {
    caughtMonsters,
    saveMonster,
    removeMonster,
    giveMonsterXP,
    updateMonsterHP,
    equipGem
  }
}
