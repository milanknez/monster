import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Mail, CheckCircle2, QrCode, Send } from 'lucide-react';
import { useState } from 'react';
import { inviteByEmail } from '../../lib/firebase';
import { APP_CONFIG } from '../../config';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
}

export const InviteModal = ({ isOpen, onClose, referralCode }: InviteModalProps) => {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const inviteLink = `${APP_CONFIG.INVITE_BASE_URL}?ref=${referralCode}`;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    
    setIsInviting(true);
    try {
      // 1. Zapsat k uživateli pro tracking
      await inviteByEmail(referralCode, email);
      
      // 2. Otevřít mailového klienta k opravdovému odeslání
      const subject = encodeURIComponent('Monster Collector - Pozvánka');
      const body = encodeURIComponent(`Ahoj,\n\npojď se mnou lovit příšery v reálném světě! Zaregistruj se přes můj odkaz a získej bonus do začátku:\n\n${inviteLink}\n\nTěším se na lovu!`);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

      setEmail('');
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background-dark/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-sm bg-slate-900 border border-primary/30 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors z-[30]"
            >
              <X size={24} />
            </button>

            <div className="p-8 pt-12 text-center relative z-10">
              <div className="size-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-lg shadow-primary/5">
                <QrCode size={40} className="text-primary" />
              </div>

              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter mb-2 italic">
                Pozvi Přátele
              </h2>
              <p className="text-xs text-slate-400 font-medium mb-8 leading-relaxed px-4">
                Zadej email kamaráda a pošli mu pozvánku. Jakmile dosáhne 3. úrovně, získáš <span className="text-primary font-bold italic">Monster Egg</span>!
              </p>

              <form onSubmit={handleInvite} className="space-y-3">
                 <div className="relative group">
                    <input
                      type="email"
                      placeholder="Email kamaráda"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-12 py-5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all group-hover:bg-slate-950/80"
                      required
                    />
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                 </div>
                 
                 <button
                   type="submit"
                   disabled={isInviting || !email}
                   className="w-full h-16 flex items-center justify-center gap-2 bg-primary text-background-dark rounded-2xl font-black uppercase tracking-tight shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                 >
                   {isInviting ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                         <Mail size={18} />
                      </motion.div>
                   ) : (
                      <>
                         {copied ? <CheckCircle2 size={18} /> : <Send size={18} />}
                         <span>{copied ? 'Uloženo / Otevřít Email' : 'Poslat Pozvánku'}</span>
                      </>
                   )}
                 </button>
              </form>
            </div>
            
            <div className="p-4 bg-slate-950/30 border-t border-white/5 text-center">
               <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Předvyplníme šablonu do tvého emailu</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
