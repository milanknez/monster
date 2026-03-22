import { useState, useCallback } from 'react'
import type { ToastMessage } from '../components/ui/Toast'

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => {
      // Prevent exact duplicate toasts showing up at the same time
      const isDuplicate = prev.some(t => t.title === toast.title && t.message === toast.message);
      if (isDuplicate) return prev;
      return [...prev, { ...toast, id }];
    })
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toasts,
    addToast,
    removeToast
  }
}
