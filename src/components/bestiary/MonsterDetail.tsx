import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bolt, Zap, LayoutGrid, RefreshCw, Flame, Droplets, Leaf, Moon, Sun, Clock, Package, Plus, Heart, Sword, Shield, Trash2, X } from 'lucide-react';
import { cn, TYPE_COLORS, GEM_BONUSES } from '../../utils';
import { RESOURCE_CONFIG } from '../../components/map/mapUtils';
import type { Monster } from '../../types';

const RARITY_COLORS: Record<string, string> = {
  'Běžná': 'text-slate-400',
  'Vzácná': 'text-purple-400',
  'Epická': 'text-orange-400',
  'Legendární': 'text-amber-400'
}

export const MonsterDetail = forwardRef<HTMLDivElement, { monster: Monster; onBack: () => void; onUpgrade?: () => void; inventory?: any[]; onUsePotion?: (type: string) => void; onEquipGem?: (idx: number, gemType: string | null) => void; onRelease?: () => void }>(
  ({ monster, onBack, onUpgrade, inventory, onUsePotion, onEquipGem, onRelease }, ref) => {
    const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
    const [confirmRelease, setConfirmRelease] = useState(false);
    if (!monster) return null;
    const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default']
    
    // Při otevření detailu nascrollovat nahoru
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

    const TypeIcon = () => {
      switch (monster.type) {
        case 'Ohnivá': return <Flame size={20} className="text-red-500" />;
        case 'Vodní': return <Droplets size={20} className="text-blue-400" />;
        case 'Přírodní': return <Leaf size={20} className="text-green-400" />;
        case 'Elektrická': return <Zap size={20} className="text-yellow-400" />;
        case 'Temná': return <Moon size={20} className="text-purple-500" />;
        case 'Světelná': return <Sun size={20} className="text-cyan-400" />;
        default: return <Bolt size={20} className="text-yellow-400" />;
      }
    };

    const TypeIconLarge = () => {
      const props = { size: 180, className: "opacity-[0.05] absolute -top-10 -right-10 rotate-12 pointer-events-none" };
      switch (monster.type) {
        case 'Ohnivá': return <Flame {...props} className={cn(props.className, "text-red-500")} />;
        case 'Vodní': return <Droplets {...props} className={cn(props.className, "text-blue-500")} />;
        case 'Přírodní': return <Leaf {...props} className={cn(props.className, "text-green-500")} />;
        case 'Elektrická': return <Zap {...props} className={cn(props.className, "text-yellow-500")} />;
        case 'Temná': return <Moon {...props} className={cn(props.className, "text-purple-500")} />;
        case 'Světelná': return <Sun {...props} className={cn(props.className, "text-cyan-500")} />;
        default: return <Bolt {...props} className={cn(props.className, "text-yellow-500")} />;
      }
    };

    return (
      <motion.div 
        ref={ref}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 100 || info.velocity.x > 500) {
            onBack();
          }
        }}
        className="w-full min-h-screen bg-background-dark pb-32"
      >
        {/* Magic Card Layout - Full Width */}
        <div className={cn(
          "w-full rounded-b-[2.5rem] p-3 pt-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-t-0 overflow-hidden relative",
          monster.type === 'Ohnivá' ? "border-[#4a1a1a] bg-[#2a0a0a]" :
          monster.type === 'Vodní' ? "border-[#1a2a4a] bg-[#0a1a2a]" :
          monster.type === 'Přírodní' ? "border-[#1a3a1a] bg-[#0a2a0a]" :
          "border-[#3a2a1a] bg-[#2a1a0a]"
        )}>
          {/* Holographic Overlays */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-[2.5rem]">
            <div className="absolute inset-0 w-[200%] h-full opacity-20 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.6)_45%,rgba(255,255,255,0.6)_50%,transparent_55%)] animate-shimmer transform-gpu" />
          </div>

          {/* Background Type Icon */}
          <TypeIconLarge />

          {/* Card Content */}
          <div className="relative z-10 flex flex-col gap-3">
            
            {/* Header Area */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-inner">
              <button 
                onClick={onBack}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 transition-colors shrink-0"
              >
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter drop-shadow-md truncate flex-1">
                {monster.name}
              </h2>
              <div className={cn("size-10 rounded-xl flex items-center justify-center border shadow-lg", colors.bg, colors.border)}>
                <TypeIcon />
              </div>
            </div>

            {/* Large Visual Area */}
            <div className="relative aspect-square w-full bg-black/60 rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl">
              <div className={cn("absolute inset-0 opacity-40", 
                monster.type === 'Ohnivá' ? "bg-[radial-gradient(circle_at_center,_#ff4444_0%,_transparent_70%)]" :
                monster.type === 'Vodní' ? "bg-[radial-gradient(circle_at_center,_#0db9f2_0%,_transparent_70%)]" :
                "bg-[radial-gradient(circle_at_center,_#a3e635_0%,_transparent_70%)]"
              )} />
              <motion.img 
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                src={monster.image} 
                className="w-full h-full object-contain relative z-10 p-8 drop-shadow-[0_30px_50px_rgba(0,0,0,1)]" 
              />
            </div>

            {/* Type/Level Bar */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Typ a Vzácnost</span>
                <div className="flex items-center gap-1.5 mt-1">
                   <div className="size-5 rounded-md bg-white/5 flex items-center justify-center">
                      {(() => {
                        const Icon = () => {
                          switch (monster.type) {
                            case 'Ohnivá': return <Flame size={12} className="text-red-500" />;
                            case 'Vodní': return <Droplets size={12} className="text-blue-400" />;
                            case 'Přírodní': return <Leaf size={12} className="text-green-400" />;
                            case 'Elektrická': return <Zap size={12} className="text-yellow-400" />;
                            case 'Temná': return <Moon size={12} className="text-purple-500" />;
                            case 'Světelná': return <Sun size={12} className="text-cyan-400" />;
                            default: return <Bolt size={12} className="text-yellow-400" />;
                          }
                        };
                        return <Icon />;
                      })()}
                   </div>
                   <span className="text-xs font-black text-slate-200 uppercase tracking-tight">{monster.type}</span>
                   <span className="text-slate-700 font-bold px-0.5">//</span>
                   <span className={cn("text-xs font-black uppercase tracking-tight", RARITY_COLORS[monster.rarity])}>{monster.rarity}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Úroveň</span>
                <p className="text-lg font-black text-primary italic leading-none">LVL {monster.level}</p>
              </div>
            </div>

            {/* HP & XP Bars */}
            <div className="space-y-3 px-1">
              {/* HP BAR */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-end px-1">
                  <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <Heart size={10} className="text-emerald-500" fill="currentColor" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Zdraví (HP)</span>
                  </div>
                    {((monster.currentHP ?? (monster.stats?.hp || 100)) < (monster.stats?.hp || 100)) && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase mt-1">
                        <Clock size={10} className="text-primary/70" />
                        <span>Plné zdraví za <span className="text-white">{(() => {
                          const max = monster.stats?.hp || 100;
                          const cur = monster.currentHP ?? max;
                          const minLeft = Math.ceil((max - cur) / (max / 150));
                          const h = Math.floor(minLeft / 60);
                          const m = minLeft % 60;
                          return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()}</span></span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-white tabular-nums">{Math.round(monster.currentHP ?? (monster.stats?.hp || 100))} / {monster.stats?.hp || 100}</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((monster.currentHP ?? (monster.stats?.hp || 100)) / (monster.stats?.hp || 100)) * 100}%` }}
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" 
                  />
                </div>
              </div>


              {/* HEALING SECTION */}
              {((monster.currentHP ?? (monster.stats?.hp || 100)) < (monster.stats?.hp || 100)) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                       <Package size={14} className="text-emerald-500" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">Rychlé Léčení</span>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {inventory?.filter(i => i?.type === 'hp_potion' && i?.count > 0).map(item => (
                      <motion.button
                        key={item?.type}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => item?.type && onUsePotion?.(item.type)}
                        className="flex-shrink-0 px-4 py-2 bg-emerald-600 rounded-xl flex items-center gap-3 border-b-2 border-black/20"
                      >
                        <div className="size-6 bg-white/20 rounded-lg flex items-center justify-center">
                          <Plus size={14} className="text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-white leading-none uppercase">Lektvar HP</p>
                          <p className="text-[8px] font-bold text-emerald-200 mt-0.5">{item?.count} ks v batohu</p>
                        </div>
                      </motion.button>
                    ))}
                    {(!inventory || inventory.filter(i => i?.type === 'hp_potion' && i?.count > 0).length === 0) && (
                      <p className="text-[9px] text-slate-500 font-bold uppercase italic p-2 w-full text-center">Nemáš žádné léčivé lektvary</p>
                    )}
                  </div>
                </motion.div>
              )}
              <div className="space-y-1.5">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest">Zkušenosti (XP)</span>
                  <span className="text-[10px] font-black text-white tabular-nums">{Math.round(monster.totalXP || 0)} / {monster.level * 250}</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((monster.totalXP || 0) / (monster.level * 250)) * 100}%` }}
                    className="h-full bg-primary rounded-full shadow-[0_0_10px_#0db9f2]" 
                  />
                </div>
              </div>
            </div>

            {/* The "Scroll" Text Area */}
            <div className="bg-slate-950/60 backdrop-blur-lg rounded-[1.5rem] border-2 border-white/5 p-5 text-slate-100 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
               {/* Subtle Texture Overlay */}
               <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
               
                {/* Stats & Gems Grid: NEW COMPACT & UNIVERSAL */}
                <div className="relative z-10 space-y-6 px-1">
                  
                  {/* Inline Stats */}
                  <div className="flex items-center justify-between gap-4 py-2">
                    {[
                      { label: 'Útok', val: monster.stats?.attack || 10, icon: <Sword size={10} />, type: 'gem_red' },
                      { label: 'Obrana', val: monster.stats?.defense || 10, icon: <Shield size={10} />, type: 'gem_white' },
                      { label: 'Zdraví', val: monster.stats?.hp || 100, icon: <Heart size={10} />, type: 'gem_green' }
                    ].map((s, i) => {
                      const levelBonus = Math.floor(s.val * (monster.level - 1) * 0.15);
                      const gemBonus = (monster.gems || []).reduce((acc, gid) => {
                        if (gid?.startsWith(s.type)) {
                          const g = GEM_BONUSES[gid];
                          if (g) return acc + (g.isPerc ? Math.floor(s.val * (g.value / 100)) : g.value);
                        }
                        return acc;
                      }, 0);
                      const totalBonus = levelBonus + gemBonus;
                      
                      return (
                        <div key={i} className="flex flex-col items-center flex-1">
                           <div className="flex items-center gap-1.5 opacity-40 mb-1">
                              {s.icon} <span className="text-[8px] font-black uppercase tracking-widest">{s.label}</span>
                           </div>
                           <div className="flex items-baseline gap-0.5">
                              <span className="text-sm font-black text-white italic">{s.val}</span>
                              <span className="text-[10px] font-black text-emerald-400">+{totalBonus}</span>
                           </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Universal Square Gem Sockets */}
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                    <div className="flex items-center justify-between mb-3 px-1">
                       <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Drahokamy (Sockety)</h3>
                       <p className="text-[8px] text-slate-500 font-bold">Libovolná kombinace</p>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      {Array.from({ length: 3 }).map((_, idx) => {
                        const currentGem = monster.gems?.[idx];
                        const icon = currentGem ? RESOURCE_CONFIG[currentGem]?.icon : null;
                        const isPicking = activeSlotIdx === idx;
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setActiveSlotIdx(idx)}
                            className={cn(
                              "size-20 aspect-square rounded-2xl border-2 flex items-center justify-center relative transition-all active:scale-95 cursor-pointer group",
                              currentGem 
                                ? "bg-slate-800 border-white/20 shadow-xl" 
                                : "bg-black/40 border-dashed border-white/10 hover:border-white/30",
                              isPicking && "ring-4 ring-amber-500/50 border-amber-500/60"
                            )}
                          >
                            {currentGem ? (
                              <>
                                <span className="text-4xl drop-shadow-md">{icon}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onEquipGem?.(idx, null); }}
                                  className="absolute -top-2 -right-2 size-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 text-white transition-transform active:scale-75 z-20"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </>
                            ) : (
                              <Plus size={20} className="text-white/20" />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Custom Fluid Gem Picker */}
                    <AnimatePresence>
                       {activeSlotIdx !== null && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                             <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 p-3 relative shadow-2xl">
                                <button 
                                  onClick={() => setActiveSlotIdx(null)}
                                  className="absolute top-2 right-2 text-slate-500 hover:text-white"
                                >
                                  <X size={14} />
                                </button>
                                
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1 italic">
                                   Slot {activeSlotIdx + 1}: Vyber si vylepšení
                                </p>
                                
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                   {inventory?.filter(i => i?.type.startsWith('gem_') && i?.count > 0).map(i => (
                                      <motion.button
                                        key={i?.type}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => { onEquipGem?.(activeSlotIdx, i?.type || null); setActiveSlotIdx(null); }}
                                        className="flex-shrink-0 size-16 bg-slate-800 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 active:bg-slate-700 transition-colors shadow-lg group relative"
                                      >
                                         <span className="text-2xl group-hover:scale-125 transition-transform">{RESOURCE_CONFIG[i?.type || '']?.icon}</span>
                                         <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1 rounded-sm">{i?.count}x</span>
                                      </motion.button>
                                   ))}
                                   {(!inventory || inventory.filter(i => i?.type.startsWith('gem_') && i?.count > 0).length === 0) && (
                                      <div className="w-full text-center py-4 flex flex-col items-center gap-2">
                                         <div className="text-3xl opacity-30">🧪</div>
                                         <p className="text-[10px] text-slate-500 font-bold uppercase italic">Nemáš žádné drahokamy v batohu</p>
                                         <button 
                                           onClick={() => setActiveSlotIdx(null)}
                                           className="px-4 py-1.5 bg-slate-800 rounded-full text-[9px] font-black text-white uppercase tracking-widest mt-1"
                                         >
                                            Zavřít
                                         </button>
                                      </div>
                                   )}
                                </div>
                             </div>
                          </motion.div>
                       )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full mt-2" />

                {/* Schopnosti */}
                <div className="relative z-10 mt-2">
                 <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 border-b border-primary/20 pb-1 flex items-center gap-2">
                   <Zap size={10} />
                   Schopnosti karty
                 </h3>
                 <div className="space-y-4">
                   {monster.abilities && monster.abilities.length > 0 ? (
                     monster.abilities.map((ability, idx) => (
                       <div key={idx} className="flex gap-4 group">
                          <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-lg transition-transform group-hover:scale-110", colors.bg)}>
                             <Zap size={16} className={colors.text} />
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase text-white leading-tight mb-0.5 tracking-tight">{ability.name}</p>
                            <p className="text-[11px] leading-snug text-slate-400 font-bold">{ability.description}</p>
                          </div>
```
                       </div>
                     ))
                   ) : (
                     <div className="py-2 text-center border border-dashed border-white/10 rounded-xl">
                       <p className="text-xs italic text-slate-500 font-bold uppercase tracking-widest">Bez speciálních schopností</p>
                     </div>
                   )}
                 </div>
               </div>

               {/* Příběh / Historie */}
               <div className="relative z-10 pt-2 border-t border-white/5">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                   <LayoutGrid size={10} />
                   Původ a historie
                 </h3>
                 <p className="text-sm text-slate-300 italic leading-relaxed font-bold tracking-tight">
                   "{monster.description || "O této příšerce zatím kolují jen legendy v zapomenutých sektorech..."}"
                 </p>
               </div>
             </div> {/* Closes Stats & Gems Grid: NEW COMPACT & UNIVERSAL */}
           </div> {/* Closes The "Scroll" Text Area */}
        </div> {/* Closes Card Layout */}

        {/* Footer Actions */}
        <div className="px-4 mt-8 mb-8 pb-16">
          {!confirmRelease ? (
            <button 
              onClick={() => setConfirmRelease(true)}
              className="w-full group relative py-4 rounded-[1.5rem] overflow-hidden transition-all active:scale-95 border-2 border-red-500/30 bg-red-950/20 shadow-[0_5px_20px_rgba(239,68,68,0.1)]"
            >
              <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
              <div className="relative z-10 flex items-center justify-center gap-2">
                <Trash2 size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-black text-red-500 uppercase tracking-widest drop-shadow-md">Pustit do divočiny</span>
              </div>
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
              <div className="bg-red-950/40 border border-red-500/30 p-4 rounded-3xl text-center">
                 <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 animate-pulse">Opravdu chceš toto monstrum propustit?</p>
                 <p className="text-[9px] font-bold text-red-300 opacity-60 uppercase">Akci nelze vrátit zpět</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onRelease && onRelease()}
                  className="py-4 bg-red-600 rounded-2xl text-xs font-black text-white uppercase tracking-widest shadow-xl active:scale-95"
                >
                  Ano, pustit
                </button>
                <button 
                  onClick={() => setConfirmRelease(false)}
                  className="py-4 bg-slate-800 rounded-2xl text-xs font-black text-slate-300 uppercase tracking-widest active:scale-95"
                >
                  Ne, nechat
                </button>
              </div>
            </motion.div>
          )}
          
          <button 
            onClick={onBack}
            className="w-full mt-4 group relative py-3 rounded-xl overflow-hidden transition-all active:scale-95 border border-white/10 bg-white/5"
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Zpět k ostatním</span>
            </div>
          </button>
        </div>

      </motion.div>
    )
  }
)

MonsterDetail.displayName = 'MonsterDetail'
