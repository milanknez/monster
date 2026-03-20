import { useState, useEffect, useCallback } from 'react'
import type { ResourceType, InventoryItem } from '../types'

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_inventory')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('monster_collector_inventory', JSON.stringify(inventory))
  }, [inventory])

  const getItemCount = useCallback((type: ResourceType) => {
    const item = inventory.find(i => i.type === type)
    return item ? item.count : 0
  }, [inventory])

  const addResource = useCallback((type: ResourceType, amount: number = 1) => {
    setInventory(prev => {
      const idx = prev.findIndex(i => i.type === type)
      if (idx !== -1) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], count: updated[idx].count + amount }
        return updated
      }
      return [...prev, { type, count: amount }]
    })
  }, [])

  const consumeResource = useCallback((type: ResourceType, amount: number = 1) => {
    let success = false
    setInventory(prev => {
      const idx = prev.findIndex(i => i.type === type)
      if (idx !== -1 && prev[idx].count >= amount) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], count: updated[idx].count - amount }
        success = true
        return updated
      }
      return prev
    })
    return success
  }, [])

  const hasResources = useCallback((needed: { type: ResourceType, count: number }[]) => {
    return needed.every(n => getItemCount(n.type) >= n.count)
  }, [getItemCount])

  return {
    inventory,
    addResource,
    consumeResource,
    getItemCount,
    hasResources
  }
}
