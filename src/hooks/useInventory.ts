import { useState, useEffect, useCallback } from 'react'
import type { ResourceType, InventoryItem } from '../types'

const MAX_SLOTS = 20
const MAX_STACK = 20

export function useInventory() {
  const [inventory, setInventory] = useState<(InventoryItem | null)[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_inventory_v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
      // Migrate from old format (V1 was object-based or small array)
      const old = localStorage.getItem('monster_collector_inventory')
      if (old) {
        const parsedOld = JSON.parse(old)
        // Basic migration if it was a simple list of types
        // For simplicity, starting fresh or assuming it's an empty 20 slots
      }
    } catch (e) { }
    return Array(MAX_SLOTS).fill(null)
  })

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('monster_collector_inventory_v2', JSON.stringify(inventory))
  }, [inventory])

  const getItemCount = useCallback((type: ResourceType) => {
    return inventory.reduce((acc, slot) => {
      if (slot?.type === type) return acc + slot.count
      return acc
    }, 0)
  }, [inventory])

  const addResource = useCallback((type: ResourceType, amount: number = 1) => {
    setInventory(prev => {
      let remaining = amount
      const next = [...prev]
      
      // 1. Fill existing same-type stacks first
      for (let i = 0; i < next.length && remaining > 0; i++) {
        const slot = next[i]
        if (slot?.type === type && slot.count < MAX_STACK) {
          const space = MAX_STACK - slot.count
          const toAdd = Math.min(space, remaining)
          next[i] = { type, count: slot.count + toAdd }
          remaining -= toAdd
        }
      }

      // 2. Fill empty slots
      for (let i = 0; i < next.length && remaining > 0; i++) {
        if (!next[i]) {
          const toAdd = Math.min(MAX_STACK, remaining)
          next[i] = { type, count: toAdd }
          remaining -= toAdd
        }
      }
      
      return next
    })
  }, [])

  const consumeResources = useCallback((needed: { type: ResourceType, count: number }[]) => {
    let canDo = true
    setInventory(prev => {
      // Pre-check
      const counts: Record<string, number> = {}
      prev.forEach(slot => {
        if (slot) counts[slot.type] = (counts[slot.type] || 0) + slot.count
      })
      
      const hasEnough = needed.every(n => (counts[n.type] || 0) >= n.count)
      if (!hasEnough) {
        canDo = false
        return prev
      }

      // Execute consumption
      const next = [...prev]
      needed.forEach(n => {
        let toRemove = n.count
        // Go through slots and subtract
        for (let i = 0; i < next.length && toRemove > 0; i++) {
          const slot = next[i]
          if (slot?.type === n.type) {
            if (slot.count > toRemove) {
              next[i] = { ...slot, count: slot.count - toRemove }
              toRemove = 0
            } else {
              toRemove -= slot.count
              next[i] = null
            }
          }
        }
      })
      return next
    })
    return canDo
  }, [])

  const swapItems = useCallback((fromIdx: number, toIdx: number) => {
    setInventory(prev => {
      const next = [...prev]
      const temp = next[fromIdx]
      next[fromIdx] = next[toIdx]
      next[toIdx] = temp
      return next
    })
  }, [])

  const hasResources = useCallback((needed: { type: ResourceType, count: number }[]) => {
    return needed.every(n => getItemCount(n.type) >= n.count)
  }, [getItemCount])

  return {
    inventory,
    addResource,
    consumeResources,
    getItemCount,
    hasResources,
    swapItems
  }
}
