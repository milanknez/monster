import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Trash2, Check, X, Sparkles } from 'lucide-react';
import { cn } from '../../utils';

export interface ReferralEntry {
  uid: string;
  name: string;
  level: number;
  totalXP?: number;
  hatchClaimed: boolean;
  status?: string;
  email?: string;
}

interface ReferralListProps {
  referrals: ReferralEntry[];
  onHatch: (invitedUid: string) => void;
  onDelete: (invitedId: string) => void;
}

// --- Sub-component for individual Referral Item ---
const ReferralItem = ({ 
  refEntry, 
  onHatch, 
  onDelete, 
  isConfirming, 
  setConfirmDeleteId 
}: { 
  refEntry: ReferralEntry, 
  onHatch: (uid: string) => void, 
  onDelete: (uid: string) => void,
  isConfirming: boolean,
  setConfirmDeleteId: (id: string | null) => void
}) => {
  const isInvited = (refEntry.status === 'invited' || !refEntry.uid || refEntry.uid.includes('@')) && refEntry.level === 0;
  
  // Granular progress towards Lv. 3 (1050 XP) or fallback to level-based
  const progress = isInvited ? 0 : (
    refEntry.totalXP 
      ? Math.min((refEntry.totalXP / 1050) * 100, 100)
      : Math.min(((refEntry.level || 1) / 3) * 100, 100)
  );
  const isReady = !isInvited && refEntry.level >= 3 && !refEntry.hatchClaimed;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 transition-all",
        isReady 
          ? "bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/10" 
          : "bg-slate-900/50 border-slate-800 hover:border-slate-700",
        isInvited && "grayscale opacity-60"
      )}
    >
      {/* Trash Icon */}
      {!isConfirming && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDeleteId(refEntry.uid);
          }}
          className="absolute top-1 right-1 p-1 text-slate-600 hover:text-red-400 transition-colors z-20"
        >
          <Trash2 size={12} />
        </button>
      )}

      {/* Confirmation Overlay */}
      <AnimatePresence>
        {isConfirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 rounded-2xl flex flex-col items-center justify-center z-30 p-1"
          >
            <p className="text-[8px] font-black text-slate-400 mb-2 uppercase">Smazat?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  onDelete(refEntry.uid);
                  setConfirmDeleteId(null);
                }}
                className="size-7 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
              >
                <Check size={14} strokeWidth={3} />
              </button>
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="size-7 bg-slate-800 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-all"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative mb-2">
        <div className="flex items-center justify-center transition-all bg-slate-950/30 rounded-2xl p-1 border border-white/5 shadow-inner">
          {refEntry.hatchClaimed ? (
            <div className="size-14 bg-slate-800 rounded-2xl flex items-center justify-center border border-white/5">
              <Trophy size={24} className="text-amber-400" />
            </div>
          ) : (
            <div className="size-14 relative flex items-center justify-center">
              {isInvited ? (
                <img src="/eggs/egg_whole.png" className="w-full h-full object-contain grayscale opacity-40 scale-75" alt="Invite" />
              ) : (
                <img 
                  src={refEntry.level >= 3 ? "/eggs/egg_hatched.png" : (refEntry.level >= 2 ? "/eggs/egg_cracked.png" : "/eggs/egg_whole.png")} 
                  className={cn(
                    "w-full h-full object-contain transition-transform duration-500",
                    refEntry.level >= 3 && "animate-bounce",
                    refEntry.level === 2 && "animate-egg-hop",
                    refEntry.level === 1 && "animate-egg-shake"
                  )} 
                  alt="Egg" 
                />
              )}
            </div>
          )}
        </div>
        {isReady && !refEntry.hatchClaimed && (
           <div className="absolute -top-1 -right-1">
              <Sparkles size={11} className="text-purple-400 animate-bounce" />
           </div>
        )}
      </div>

      <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter truncate w-full text-center px-1">
        {(refEntry?.name || refEntry?.email || 'Vajíčko')?.split('@')[0]?.split(' (')[0]}
      </span>
      
      {/* Level & Bar */}
      <div className="mt-1 w-full px-2 flex flex-col items-center gap-1">
        <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000",
              isReady ? "bg-purple-500" : isInvited ? "bg-slate-700" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap bg-slate-950/50 px-2 py-0.5 rounded-full border border-white/5">
          LV. {refEntry.level}
        </span>
      </div>

      {/* Click to Hatch overlay for ready ones */}
      {isReady && !refEntry.hatchClaimed && (
         <button 
          onClick={() => onHatch(refEntry.uid)}
          className="absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-2xl"
         >
           <div className="absolute bottom-0 left-0 right-0 py-1 bg-purple-500 text-[8px] font-black text-white uppercase text-center leading-none">
              Líhni!
           </div>
         </button>
      )}
    </motion.div>
  );
};

export const ReferralList = ({ referrals, onHatch, onDelete }: ReferralListProps) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (referrals.length === 0) {
    return (
      <div className="p-6 text-center bg-slate-900/40 border border-slate-800 rounded-2xl border-dashed">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">
          Zatím žádní pozvaní přátelé.<br/>Pozvi někoho a získej vajíčko!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {referrals.map((refEntry) => (
        <ReferralItem 
          key={refEntry.uid}
          refEntry={refEntry}
          onHatch={onHatch}
          onDelete={onDelete}
          isConfirming={confirmDeleteId === refEntry.uid}
          setConfirmDeleteId={setConfirmDeleteId}
        />
      ))}
    </div>
  );
};
