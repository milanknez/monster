import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, CheckCircle2, QrCode } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_CONFIG } from '../../config';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
}

export const InviteModal = ({ isOpen, onClose, referralCode }: InviteModalProps) => {
  const [copied, setCopied] = useState(false);
  
  const { i18n, t } = useTranslation();
  const rawLang = i18n.language.split('-')[0] || 'cs';
  const currentLang = rawLang === 'cz' ? 'cs' : rawLang;

  const inviteLink = APP_CONFIG.INVITE_BASE_URL.includes('play.google.com')
    ? `${APP_CONFIG.INVITE_BASE_URL}&referrer=ref%3D${referralCode}%26lang%3D${currentLang}`
    : APP_CONFIG.INVITE_BASE_URL.includes('?')
    ? `${APP_CONFIG.INVITE_BASE_URL}&ref=${referralCode}&lang=${currentLang}`
    : `${APP_CONFIG.INVITE_BASE_URL}?ref=${referralCode}&lang=${currentLang}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Monster Collector',
      text: currentLang === 'en' 
        ? 'Come hunt monsters with me in the real world! Register through my link and get a bonus:' 
        : currentLang === 'sk'
        ? 'Poď loviť príšery so mnou v reálnom svete! Zaregistruj sa cez môj odkaz a získaj bonus:'
        : 'Pojď se mnou lovit příšery v reálném světě! Zaregistruj se přes můj odkaz a získej bonus:',
      url: inviteLink,
    };

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share(shareData);
      } catch (err) {
        console.log('Native share failed', err);
      }
    } else if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Web share failed', err);
      }
    } else {
      handleCopy();
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
                  <div className="size-28 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5 p-2">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteLink)}&bgcolor=0f172a&color=0db9f2`} 
                      alt="QR Code"
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter mb-2 italic">
                Pozvi Přátele
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6 leading-relaxed px-4">
                Získej <span className="text-primary italic">Vzácné vajíčko</span> za každého kámoše (Lv. 3)
              </p>

              <div className="grid grid-cols-2 gap-3">
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
