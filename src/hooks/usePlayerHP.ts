import { useState, useEffect, useCallback, useRef } from 'react'
import type { Boost } from '../types'

// HP systém: 100% za 4 hodiny (240 min)
// TEST: 100% za 10 minut základ (pro demo)
const BASE_REGEN_RATE = 100 / (10 * 60 * 1000) 

export function usePlayerHP(initialHPState: { val: number, time: number }, activeBoosts: Boost[]) {
  const [hpState, setHpState] = useState(initialHPState)

  const getCurrentHP = useCallback(() => {
    // Najdeme nejvyšší HP boost
    const hpBoost = activeBoosts
      .filter(b => b.type === 'hp_regen' && b.expiresAt > Date.now())
      .reduce((max, b) => Math.max(max, b.multiplier), 1.0)

    const elapsed = Date.now() - hpState.time
    const bonus = elapsed * (BASE_REGEN_RATE * hpBoost)
    return Math.min(100, Math.max(0, hpState.val + bonus))
  }, [hpState, activeBoosts])

  const [currentHP, setCurrentHP] = useState(getCurrentHP())

  // Uložení aktuálního stavu HP (checkpoint) před změnou parametrů (např. při aktivaci boostu)
  const checkpointHP = useCallback(() => {
    const freshHP = getCurrentHP()
    const newState = { val: freshHP, time: Date.now() }
    setHpState(newState)
    setCurrentHP(freshHP)
    localStorage.setItem('monster_collector_hp', JSON.stringify(newState))
    return freshHP
  }, [getCurrentHP])

  const consumeHP = useCallback((amount: number) => {
    const freshHP = getCurrentHP()
    const newVal = Math.max(0, freshHP - amount)
    const newState = { val: newVal, time: Date.now() }
    setHpState(newState)
    setCurrentHP(newVal)
    localStorage.setItem('monster_collector_hp', JSON.stringify(newState))
  }, [getCurrentHP])

  // Timer pro plynulý update progress baru (každou vteřinu)
  useEffect(() => {
    const timer = setInterval(() => setCurrentHP(getCurrentHP()), 1000)
    return () => clearInterval(timer)
  }, [getCurrentHP])

  return {
    currentHP,
    consumeHP,
    checkpointHP
  }
}
