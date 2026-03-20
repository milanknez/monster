import { useState, useEffect } from 'react'
import type { Monster } from '../types'
import { monsterDB } from '../data/monsters'

export function useMonsters(addToast: (toast: any) => void) {
  const [caughtMonsters, setCaughtMonsters] = useState<Monster[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_caught')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  // Load and Enrich from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('monster_collector_caught')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Monster[]
        const enriched = parsed.map(caught => {
          const dbData = monsterDB.find(m => m.id === caught.id)
          if (dbData) {
            return {
              ...caught,
              name: dbData.name,
              description: dbData.description,
              abilities: (dbData as any).abilities,
              type: dbData.type,
              rarity: dbData.rarity
            }
          }
          return caught
        })
        setCaughtMonsters(enriched)
      } catch (e) {
        console.error("Failed to parse caught monsters", e)
      }
    }
  }, [])

  const saveMonster = (monster: Monster, onGiveXP: (xp: number) => void, shouldGiveXP = true) => {
    let success = false
    setCaughtMonsters(prev => {
      const existingCount = prev.filter(m => m.id === monster.id).length
      if (existingCount >= 3) {
        alert(`Už máš 3x tento druh (${monster.name}). Více jich neuneseš!`)
        return prev
      }
      const enriched = { ...monster, caughtAt: monster.caughtAt || Date.now() }
      const updated = [enriched, ...prev]
      localStorage.setItem('monster_collector_caught', JSON.stringify(updated))
      success = true
      return updated
    })
    
    if (success && shouldGiveXP) {
      onGiveXP(250)
      addToast({
        title: 'Monstrum chyceno',
        message: `${monster.name} chycen!`,
        type: 'xp'
      })
    }
    return success
  }

  const removeMonster = (id: string, level: number) => {
    setCaughtMonsters(prev => {
      const index = prev.findIndex(m => m.id === id && m.level === level)
      if (index !== -1) {
        const updated = [...prev]
        updated.splice(index, 1)
        localStorage.setItem('monster_collector_caught', JSON.stringify(updated))
        return updated
      }
      return prev
    })
  }

  return {
    caughtMonsters,
    saveMonster,
    removeMonster
  }
}
