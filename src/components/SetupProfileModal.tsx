import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User } from 'lucide-react';

export const SetupProfileModal = ({ onComplete }: { onComplete: (name: string) => void }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length >= 3) {
      onComplete(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900 border border-primary/30 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(13,185,242,0.15)] relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        
        <form onSubmit={handleSubmit} className="p-8 relative z-10">
          <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/30 mx-auto">
            <User size={32} className="text-primary" />
          </div>

          <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter text-center mb-2">
            Vítejte lovče
          </h2>
          <p className="text-sm text-slate-400 font-medium text-center mb-8 px-2">
            Před spuštěním skeneru je nutné kalibrovat databázi na vaše jméno.
          </p>

          <div className="space-y-6">
            <div className="relative">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-2 text-center">
                Identifikace
              </label>
              <input 
                type="text" 
                placeholder="Zadejte jméno..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={15}
                className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-xl px-4 py-4 text-center text-lg text-slate-100 font-bold placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-colors"
                autoFocus
              />
            </div>
            
            <button 
              type="submit"
              disabled={name.trim().length < 3}
              className="w-full bg-primary hover:bg-primary/90 text-background-dark font-black py-4 rounded-xl shadow-[0_4px_15px_rgba(13,185,242,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <Zap size={20} className="fill-background-dark" />
              <span className="uppercase tracking-tight">Potvrdit jméno</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
