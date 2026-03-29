import { useState, useEffect, useCallback } from 'react'
import type { ResourceType, InventoryItem } from '../types'

const MAX_SLOTS = 16
const MAX_STACK = 20

export function useInventory() {
  const [maxSlots, setMaxSlots] = useState(() => {
    return parseInt(localStorage.getItem('monster_collector_inv_capacity') || '16')
  })

  // Watch for external capacity changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'monster_collector_inv_capacity' && e.newValue) {
        setMaxSlots(parseInt(e.newValue))
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const [inventory, setInventory] = useState<(InventoryItem | null)[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_inventory_v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Check current capacity directly from storage to be sync
        const currentCap = parseInt(localStorage.getItem('monster_collector_inv_capacity') || '16')
        if (Array.isArray(parsed)) {
          const arr = parsed.slice(0, currentCap)
          while(arr.length < currentCap) arr.push(null)
          return arr
        }
      }
      const old = localStorage.getItem('monster_collector_inventory')
      if (old) {
        // migration logic
      }
    } catch (e) { }
    const initialCap = parseInt(localStorage.getItem('monster_collector_inv_capacity') || '16')
    return Array(initialCap).fill(null)
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
      const fIdx = Number(fromIdx);
      const tIdx = Number(toIdx);
      const fromItem = next[fIdx]
      const toItem = next[tIdx]

      if (fromItem && toItem && String(fromItem.type) === String(toItem.type) && fIdx !== tIdx) {
        // Merge identical items
        const total = Number(fromItem.count) + Number(toItem.count);
        if (total <= MAX_STACK) {
          next[tIdx] = { ...toItem, count: total };
          next[fIdx] = null;
        } else {
          next[tIdx] = { ...toItem, count: MAX_STACK };
          next[fIdx] = { ...fromItem, count: total - MAX_STACK };
        }
      } else {
        // Standard swap if different items or moving to empty slot
        next[fIdx] = toItem
        next[tIdx] = fromItem
      }
      
      return next
    })
  }, [])

  const discardItem = useCallback((idx: number) => {
    setInventory(prev => {
      const next = [...prev]
      next[idx] = null
      return next
    })
  }, [])

  const hasResources = useCallback((needed: { type: ResourceType, count: number }[]) => {
    return needed.every(n => getItemCount(n.type) >= n.count)
  }, [getItemCount])

  const upgradeCapacity = useCallback((newSize: number) => {
    setMaxSlots(newSize)
    localStorage.setItem('monster_collector_inv_capacity', newSize.toString())
    setInventory(prev => {
      const next = [...prev]
      while(next.length < newSize) next.push(null)
      return next
    })
  }, [])

  return {
    inventory,
    maxSlots,
    upgradeCapacity,
    addResource,
    consumeResources,
    getItemCount,
    hasResources,
    swapItems,
    discardItem
  }
}
