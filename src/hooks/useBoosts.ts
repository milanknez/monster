import { useState } from 'react'
import type { Boost } from '../types'

export function useBoosts() {
  const [activeBoosts, setActiveBoosts] = useState<Boost[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_boosts')
      if (saved) {
        return (JSON.parse(saved) as Boost[]).filter(b => b.expiresAt > Date.now())
      }
    } catch { return [] }
    return []
  })

  const activateBoost = (boost: Boost, onCheckpointHP: () => void) => {
    onCheckpointHP() // Důležité: uložit HP s aktuálním rate než se změní na nový
    const updated = [boost, ...activeBoosts.filter(b => b.type !== boost.type || b.multiplier !== boost.multiplier)]
    setActiveBoosts(updated)
    localStorage.setItem('monster_collector_boosts', JSON.stringify(updated))
  }

  return {
    activeBoosts,
    activateBoost
  }
}
