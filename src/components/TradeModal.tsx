import { motion } from 'framer-motion';
import { X, Share2, RefreshCw } from 'lucide-react';
import type { Monster } from '../types';

export const TradeModal = ({ monster, onClose }: { monster: Monster; onClose: () => void }) => {
  // Zakódujeme data tak, aby byla co nejkratší pro QR kód
  // Formát: MSTR_TRD|id|level|name
  const tradeData = `MSTR_TRD|${monster.id}|${monster.level}|${monster.name}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tradeData)}&bgcolor=1e293b&color=0db9f2`;

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
              <RefreshCw size={18} className="text-primary animate-spin-slow" />
              <h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter">Výměna_Aktivní</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          <div className="bg-white p-4 rounded-3xl mb-6 shadow-[0_0_30px_rgba(13,185,242,0.1)] relative group">
            <img 
              src={qrUrl} 
              alt="Trade QR" 
              className="size-56 object-contain" 
            />
            <div className="absolute inset-0 border-4 border-slate-900/10 rounded-3xl pointer-events-none" />
          </div>

          <div className="space-y-2 mb-8">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Nabízený exemplář</p>
            <h4 className="text-2xl font-black text-slate-100 tracking-tighter uppercase italic">
              {monster.name} <span className="text-primary/60 ml-1">LVL {monster.level}</span>
            </h4>
            <p className="text-xs text-slate-500 font-bold leading-relaxed px-4">
              Ukažte tento kód druhému lovci. Po naskenování získá kopii této příšerky do své databáze.
            </p>
          </div>

          <div className="w-full h-px bg-slate-800 mb-6" />

          <button 
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            Zrušit režim výměny
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
