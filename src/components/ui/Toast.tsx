import { motion, AnimatePresence } from 'framer-motion'
import { Zap, CheckCircle2, TrendingUp, Sparkles, X } from 'lucide-react'
import { useEffect, forwardRef } from 'react'
import { cn } from '../../utils'

export interface ToastMessage {
  id: string
  title: string
  message: string
  type: 'xp' | 'success' | 'info' | 'boost'
  duration?: number
}

interface ToastProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export const ToastContainer = ({ toasts, onRemove }: ToastProps) => {
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-xs px-4 pointer-events-none flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}

const ToastItem = forwardRef<HTMLDivElement, { toast: ToastMessage, onRemove: (id: string) => void }>(
  ({ toast, onRemove }, ref) => {
    useEffect(() => {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration || 5000)
      return () => clearTimeout(timer)
    }, [toast, onRemove])

    const icons = {
      xp: <Zap size={18} className="text-primary fill-primary/20" />,
      success: <CheckCircle2 size={18} className="text-emerald-500" />,
      info: <TrendingUp size={18} className="text-blue-500" />,
      boost: <Sparkles size={18} className="text-yellow-400" />
    }

    const bgStyles = {
      xp: "bg-slate-900/90 border-primary/20 shadow-primary/10",
      success: "bg-slate-900/90 border-emerald-500/20 shadow-emerald-500/10",
      info: "bg-slate-900/90 border-blue-500/20 shadow-blue-500/10",
      boost: "bg-slate-900/90 border-yellow-400/20 shadow-yellow-400/10"
    }

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        className={cn(
          "pointer-events-auto flex items-center gap-3 p-3 rounded-2xl border backdrop-blur-md shadow-xl",
          bgStyles[toast.type]
        )}
      >
        <div className="shrink-0">
          {icons[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[10px] font-black text-slate-100 uppercase tracking-wider leading-none">{toast.title}</h4>
          <p className="text-[11px] text-slate-400 font-medium leading-normal mt-0.5">{toast.message}</p>
        </div>
        <button 
          onClick={() => onRemove(toast.id)}
          className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={14} />
        </button>
      </motion.div>
    )
  }
)

ToastItem.displayName = 'ToastItem'
