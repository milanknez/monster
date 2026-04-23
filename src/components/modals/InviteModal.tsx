import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Mail, CheckCircle2, QrCode, Send, ExternalLink } from 'lucide-react';
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
  const [showQR, setShowQR] = useState(false);
  
  const inviteLink = `${APP_CONFIG.PROD_URL}/landing/invite.html?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Monster Collector',
          text: 'Pojď se mnou lovit příšery v reálném světě! Zaregistruj se přes můj odkaz a získej bonus:',
          url: inviteLink,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    
    setIsInviting(true);
    try {
      await inviteByEmail(referralCode, email);
      
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

            <div className="p-8 pt-10 text-center relative z-10">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="size-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                    {showQR ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteLink)}&bgcolor=0f172a&color=0db9f2`} 
                        alt="QR Code"
                        className="size-16 rounded-lg"
                      />
                    ) : (
                      <QrCode size={40} className="text-primary" />
                    )}
                  </div>
                  <button 
                    onClick={() => setShowQR(!showQR)}
                    className="absolute -bottom-2 -right-2 size-8 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-primary shadow-lg hover:bg-slate-700 transition-colors"
                  >
                    {showQR ? <Mail size={14} /> : <QrCode size={14} />}
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter mb-2 italic">
                Pozvi Přátele
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6 leading-relaxed px-4">
                Získej <span className="text-primary italic">Vzácné vajíčko</span> za každého kámoše (Lv. 3)
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={handleShare}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-950/50 border border-white/5 rounded-2xl hover:bg-slate-950 transition-all active:scale-95 group"
                >
                  <div className="size-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <Share2 size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-300">Sdílet</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-950/50 border border-white/5 rounded-2xl hover:bg-slate-950 transition-all active:scale-95 group"
                >
                  <div className="size-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-300">{copied ? 'Zkopírováno' : 'Kopírovat'}</span>
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[8px] uppercase font-black text-slate-700 tracking-[0.3em] bg-slate-900 px-4 italic">
                  Nebo poslat emailem
                </div>
              </div>

              <form onSubmit={handleInvite} className="space-y-3">
                 <div className="relative group">
                    <input
                      type="email"
                      placeholder="Email kamaráda"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-12 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all group-hover:bg-slate-950/80"
                      required
                    />
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                 </div>
                 
                 <button
                   type="submit"
                   disabled={isInviting || !email}
                   className="w-full h-14 flex items-center justify-center gap-2 bg-primary text-background-dark rounded-2xl font-black uppercase tracking-tight shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                 >
                   {isInviting ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                         <Mail size={18} />
                      </motion.div>
                   ) : (
                      <>
                         <Send size={16} />
                         <span className="text-sm">Odeslat pozvánku</span>
                      </>
                   )}
                 </button>
              </form>
            </div>
            
            <div className="p-4 bg-slate-950/30 border-t border-white/5 text-center">
               <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2">
                 Tvůj kód: <span className="text-slate-400 font-black tracking-normal">{referralCode.slice(-6).toUpperCase()}</span>
               </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
