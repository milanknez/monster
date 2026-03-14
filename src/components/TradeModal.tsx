import { motion } from 'framer-motion';
import { X, Share2, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { Monster } from '../types';

type TradeMode = 'OFFER' | 'CONFIRM';

export const TradeModal = ({ 
  monster, 
  onClose, 
  mode = 'OFFER',
  receivedMonster 
}: { 
  monster: Monster; 
  onClose: () => void;
  mode?: TradeMode;
  receivedMonster?: { id: string, level: number, name: string }
}) => {
  // Formát pro OFFER: MSTR_OFF|id|level
  // Formát pro CONFIRM: MSTR_CNF|given_id|given_lvl|received_id|received_lvl
  const tradeData = mode === 'OFFER' 
    ? `MSTR_OFF|${monster.id}|${monster.level}`
    : `MSTR_CNF|${monster.id}|${monster.level}|${receivedMonster?.id}|${receivedMonster?.level}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tradeData)}&bgcolor=1e293b&color=${mode === 'OFFER' ? '0db9f2' : 'a3e635'}`;

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background-dark/95 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-sm bg-slate-900 border border-primary/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(13,185,242,0.2)]"
      >
        <div className="p-8 text-center flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-6">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className={mode === 'OFFER' ? "text-primary animate-spin-slow" : "text-green-500"} />
              <h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter">
                {mode === 'OFFER' ? 'Výměna_Aktivní' : 'Výměna_Potvrzení'}
              </h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          <div className={mode === 'OFFER' ? "bg-white p-4 rounded-3xl mb-6 shadow-[0_0_30px_rgba(13,185,242,0.1)] relative group" : "bg-white p-4 rounded-3xl mb-6 shadow-[0_0_30px_rgba(163,230,53,0.1)] relative group"}>
            <img 
              src={qrUrl} 
              alt="Trade QR" 
              className="size-56 object-contain" 
            />
            <div className="absolute inset-0 border-4 border-slate-900/10 rounded-3xl pointer-events-none" />
          </div>

          <div className="space-y-2 mb-8">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
              {mode === 'OFFER' ? 'Nabízený exemplář' : 'Protihodnota potvrzena'}
            </p>
            <h4 className="text-2xl font-black text-slate-100 tracking-tighter uppercase italic">
              {monster.name} <span className="text-primary/60 ml-1">LVL {monster.level}</span>
            </h4>
            <p className="text-xs text-slate-500 font-bold leading-relaxed px-4">
              {mode === 'OFFER' 
                ? 'Ukažte tento kód druhému lovci. Po naskenování bude moci vybrat svou příšeru k výměně.'
                : 'Druhý lovec musí naskenovat tento kód pro dokončení transakce. Poté mu bude připsána tvoje příšera.'
              }
            </p>
          </div>

          {mode === 'CONFIRM' && (
             <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 mb-6 flex items-center gap-3 w-full">
               <CheckCircle2 size={24} className="text-green-500 shrink-0" />
               <p className="text-[10px] text-left text-green-500/80 font-bold uppercase leading-tight">
                 Tvoje příšera byla stažena z databáze a nahrazena novým vzorkem.
               </p>
             </div>
          )}

          <button 
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            {mode === 'OFFER' ? <Share2 size={16} /> : <X size={16} />}
            {mode === 'OFFER' ? 'Zrušit režim výměny' : 'Zavřít a dokončit'}
          </button>
        </div>
        
        {/* Dekorativní prvky */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <RefreshCw size={80} className="rotate-12" />
        </div>
      </motion.div>
    </div>
  )
}
