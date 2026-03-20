import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, CreditCard, ShieldCheck, Fingerprint } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils'

interface GooglePayModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  item: {
    title: string
    price: string
  }
}

export const GooglePayModal = ({ isOpen, onClose, onConfirm, item }: GooglePayModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handlePay = () => {
    setIsProcessing(true)
    // Simulace síťového požadavku
    setTimeout(() => {
      setIsProcessing(false)
      setIsSuccess(true)
      // Po úspěchu zavřeme a potvrdíme
      setTimeout(() => {
        onConfirm()
        onClose()
      }, 1500)
    }, 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isProcessing ? onClose : undefined}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-[32px] overflow-hidden"
          >
            <div className="p-6 pb-10 space-y-6 max-w-md mx-auto">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="size-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <div className="size-4 bg-white rounded-sm rotate-45" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-sm leading-none">Google Play</h3>
                    <p className="text-slate-500 text-[10px] font-medium">Potvrzení transakce</p>
                  </div>
                </div>
                {!isProcessing && !isSuccess && (
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                )}
              </div>

              {isSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="size-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20"
                  >
                    <Check size={32} strokeWidth={3} />
                  </motion.div>
                  <div className="text-center">
                    <h4 className="text-slate-900 font-black text-xl uppercase italic">Platba hotova</h4>
                    <p className="text-slate-500 text-sm font-medium">Modul byl úspěšně aktivován.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Item Details */}
                  <div className="flex justify-between items-start py-2">
                    <div className="space-y-1">
                      <h4 className="text-slate-900 font-black text-lg uppercase tracking-tight">{item.title}</h4>
                      <p className="text-slate-500 text-xs font-medium">Monster Collector (In-app nákup)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900 font-black text-xl italic">{item.price}</p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">vč. DPH</p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                    <div className="size-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                      <CreditCard size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-bold text-sm">Visa •••• 1234</p>
                      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">milan.knez@gmail.com</p>
                    </div>
                    <div className="text-[10px] font-black text-primary uppercase">Změnit</div>
                  </div>

                  {/* Security Info */}
                  <div className="flex items-center gap-2 px-1">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <p className="text-[10px] text-slate-400 font-medium">
                      Zabezpečeno šifrováním Google Play. Vaše údaje jsou v bezpečí.
                    </p>
                  </div>

                  {/* Action Button */}
                  <button
                    disabled={isProcessing}
                    onClick={handlePay}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 relative overflow-hidden",
                      isProcessing ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white active:scale-95"
                    )}
                  >
                    {isProcessing ? (
                      <>
                        <div className="size-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                        <span>Zpracovávám...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint size={20} />
                        <span>Koupit jedním klepnutím</span>
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-[9px] text-slate-400 font-medium leading-relaxed px-4">
                    Klepnutím vyjadřujete souhlas se Smluvními podmínkami Google Play a Monster Collector Store.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
