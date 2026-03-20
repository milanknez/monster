import { useState, useEffect, useRef } from 'react'
import { calculateLevel } from '../utils'

export function usePlayerXP(initialXP: number, addToast: (toast: any) => void) {
  const [totalXP, setTotalXP] = useState<number>(initialXP)
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null)
  const lastLevelRef = useRef<number>(calculateLevel(totalXP))

  // Sledování level upu
  useEffect(() => {
    const currentLevel = calculateLevel(totalXP)
    if (currentLevel > lastLevelRef.current) {
      setShowLevelUp(currentLevel)
      addToast({
        title: 'LEVEL UP!',
        message: `Dosáhl jsi úrovně ${currentLevel}!`,
        type: 'boost'
      })
    }
    lastLevelRef.current = currentLevel
  }, [totalXP, addToast])

  const addXP = (amount: number) => {
    setTotalXP(prev => {
      const newTotal = prev + amount
      localStorage.setItem('monster_collector_xp', newTotal.toString())
      return newTotal
    })
  }

  const handleClaimReward = (xp: number, activeBoosts: any[]) => {
    // Aplikujeme boost i na odměny z úkolů
    const xpBoost = activeBoosts
      .filter(b => b.type === 'xp_boost' && b.expiresAt > Date.now())
      .reduce((max, b) => Math.max(max, b.multiplier), 1.0)
    
    const xpGained = Math.round(xp * xpBoost)
    addXP(xpGained)

    addToast({
      title: 'Odměna získána',
      message: `Získal jsi +${xpGained} XP za splnění úkolu.`,
      type: 'xp'
    })
  }

  return {
    totalXP,
    showLevelUp,
    setShowLevelUp,
    addXP,
    handleClaimReward,
    currentLevel: calculateLevel(totalXP)
  }
}
