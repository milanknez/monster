import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Radar, Zap } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export const ScannerModal = ({ isOpen, onClose, onScan }: { isOpen: boolean; onClose: () => void; onScan: (ean: string) => void }) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualEan, setManualEan] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const html5QrCode = new Html5Qrcode("reader")
    let isMounted = true

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 2, // Sníženo pro Android WebView zamezení sekání
            qrbox: { width: 250, height: 100 }, // Širší pro čárové kódy
            aspectRatio: 1.0, 
            disableFlip: false // Může také šetřit paměť oproti pokusům o čtení zrcadlených
          },
          (decodedText) => {
            if (isMounted) {
              onScan(decodedText)
              onClose()
            }
          },
          () => {} // Ignore errors
        )
      } catch (err) {
        if (isMounted) {
          console.error("Kamera nebyla nalezena nebo schválena", err)
          setCameraError("Kamera není k dispozici")
        }
      }
    }

    startScanner()

    return () => {
      isMounted = false
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error("Chyba při vypínání", e))
      }
    }
  }, [isOpen, onScan, onClose])

  const handleManualScan = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      onScan(manualEan)
      onClose()
      setManualEan('')
    }, 1500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background-dark/95 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm bg-slate-900 border border-primary/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(13,185,242,0.2)]"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <div className="size-2 bg-red-500 rounded-full animate-pulse" />
              Skenování_Aktivní
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <Settings size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="aspect-square relative rounded-2xl overflow-hidden bg-slate-950 border border-white/5 mb-6 group">
            {/* Camera Viewport */}
            <div id="reader" className="w-full h-full object-cover [&>video]:object-cover" />
            
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-8 text-center z-20">
                <div className="p-4 rounded-full bg-red-500/10 mb-4">
                  <Radar size={32} className="text-red-500 opacity-50" />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{cameraError}</p>
                <p className="text-[10px] text-slate-600 mt-2">Povolte přístup ke kameře v prohlížeči nebo použijte manuální zadání.</p>
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/40 rounded-2xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                
                <motion.div 
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_#0db9f2]"
                />
              </div>
            </div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block">Senzor dat (Manuální EAN)</label>
                {cameraError && <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Offline</span>}
              </div>
              <input 
                type="text" 
                placeholder="Zadejte kód..."
                value={manualEan}
                onChange={(e) => setManualEan(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-colors"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
              />
            </div>
            
            <button 
              onClick={handleManualScan}
              disabled={isProcessing || !manualEan}
              className="w-full bg-primary hover:bg-primary/90 text-background-dark font-black py-4 rounded-xl shadow-[0_4px_15px_rgba(13,185,242,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="size-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                  <span className="uppercase font-black">Zpracování...</span>
                </>
              ) : (
                <>
                  <Zap size={20} className="fill-background-dark" />
                  <span className="uppercase tracking-tight">Vynutit detekci kódu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}