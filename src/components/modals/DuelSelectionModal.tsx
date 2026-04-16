import { motion } from 'framer-motion';
import { X, Sword, Heart, Flame, Droplets, Leaf, Zap, Skull } from 'lucide-react';
import { cn, getMonsterMaxHP, TYPE_COLORS, getTotalXPForLevel } from '../../utils';
import type { Monster } from '../../types';
import { RESOURCE_CONFIG } from '../../data/resources';

export const DuelSelectionModal = ({ 
  caughtMonsters, 
  onSelect, 
  onClose,
  opponent,
  title = "Vyber si bojovníka",
  description
}: { 
  caughtMonsters: Monster[], 
  onSelect: (m: Monster) => void, 
  onClose: () => void,
  opponent?: Monster,
  title?: string,
  description?: string
}) => {
  // Seřadit podle nejsilnějšího (lvl * útok nebo prostě lvl)
  const sorted = [...caughtMonsters].sort((a, b) => (b.level || 0) - (a.level || 0));

  const TypeIcon = ({ type, size = 16, className = "" }: { type: string, size?: number, className?: string }) => {
    switch (type) {
      case 'Ohnivá': return <Flame size={size} className={cn("text-red-500", className)} />;
      case 'Vodní': return <Droplets size={size} className={cn("text-blue-400", className)} />;
      case 'Přírodní': return <Leaf size={size} className={cn("text-green-400", className)} />;
      case 'Elektrická': return <Zap size={size} className={cn("text-yellow-400", className)} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex flex-col bg-background-dark/95 backdrop-blur-xl">
      <div className="p-8 border-b border-red-500/20 flex justify-between items-center bg-red-950/20">
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{title}</h3>
          <p className="text-[10px] text-red-500 font-bold uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
            <Sword size={12} /> Příprava na souboj
          </p>
        </div>
        <button onClick={onClose} className="p-3 bg-red-900/40 rounded-2xl text-red-400 border border-red-500/20 hover:scale-110 active:scale-95 transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Opponent Section */}
        {opponent && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-950/10 border-2 border-red-500/20 rounded-[2.5rem] p-6 relative overflow-hidden group shadow-2xl shadow-red-900/20"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Skull size={120} className="text-red-500 rotate-12" />
            </div>
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="size-24 bg-black/60 rounded-[1.8rem] p-4 border border-red-500/30 flex items-center justify-center relative shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                <img 
                  src={opponent.image} 
                  className="w-full h-full object-contain relative z-10 brightness-0 opacity-80" 
                  alt="Opponent Silhouette" 
                />
                {/* Type icon in the corner of the silhouette */}
                <div className="absolute bottom-1 right-1 size-7 bg-black/80 rounded-lg flex items-center justify-center border border-white/10 shadow-lg">
                  <TypeIcon type={opponent.type} size={14} />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-red-500 text-background-dark text-[10px] font-black uppercase tracking-widest italic">Nepřítel</span>
                </div>
                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">Neznámý Soupeř</h4>
                <div className="flex items-center gap-3">
                  <div className="h-7 px-3 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <span className="text-[11px] font-black text-red-500 uppercase tracking-widest leading-none">LVL {opponent.level}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                    <TypeIcon type={opponent.type} size={12} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{opponent.type}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          <div className="px-1 flex items-center justify-between mb-4">
            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tvá Aktivní Monstra</h5>
            <div className="h-px flex-1 bg-white/5 ml-4" />
          </div>

          <div className="grid grid-cols-2 gap-4 p-1">
            {sorted.length > 0 ? (
              sorted.map((monster: any, idx) => {
                const maxHP = getMonsterMaxHP(monster);
                const currentHP = monster.currentHP ?? maxHP;
                const hpPercent = Math.round((currentHP / maxHP) * 100);
                const isDisabled = hpPercent < 80;
                const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default']
                
                return (
                  <motion.div
                    key={`${monster.id}-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => !isDisabled && onSelect(monster)}
                    className={cn(
                      "group relative aspect-square rounded-[2rem] overflow-hidden border transition-all duration-300 shadow-xl",
                      isDisabled 
                        ? "opacity-50 grayscale border-slate-800 bg-slate-900/40 pointer-events-none" 
                        : "cursor-pointer active:scale-95",
                      !isDisabled && (
                        monster.rarity === 'Vzácná' ? "border-blue-500/40 bg-blue-500/10 shadow-blue-500/10 hover:border-blue-500/60" :
                        monster.rarity === 'Epická' ? "border-purple-500/40 bg-purple-500/10 shadow-purple-500/10 hover:border-purple-500/60" :
                        monster.rarity === 'Legendární' ? "border-amber-500/40 bg-amber-500/10 shadow-amber-500/10 hover:border-amber-500/60" :
                        colors.border + " " + colors.bg + " hover:border-white/20"
                      )
                    )}
                  >
                    {/* Decorative Frame for Rare/Epic/Legendary */}
                    {!isDisabled && (monster.rarity === 'Vzácná' || monster.rarity === 'Epická' || monster.rarity === 'Legendární') && (
                      <div className="absolute inset-0 pointer-events-none z-30">
                        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                          <div key={corner} className={cn(
                            "absolute size-4 border-2",
                            corner.includes('top') ? "top-0" : "bottom-0",
                            corner.includes('left') ? "left-0" : "right-0",
                            monster.rarity === 'Vzácná' ? "border-blue-400" : monster.rarity === 'Epická' ? "border-purple-400" : "border-amber-400",
                            corner === 'top-left' && "border-r-0 border-b-0 rounded-tl-[2rem]",
                            corner === 'top-right' && "border-l-0 border-b-0 rounded-tr-[2rem]",
                            corner === 'bottom-left' && "border-r-0 border-t-0 rounded-bl-[2rem]",
                            corner === 'bottom-right' && "border-l-0 border-t-0 rounded-br-[2rem]"
                          )} />
                        ))}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none" />
                    
                    {/* Level Badge & Gems */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col items-center">
                      <div className="h-6 px-2 rounded-lg bg-slate-950/80 text-[10px] font-black flex items-center justify-center border border-white/10 shadow-lg text-white uppercase italic tracking-tighter">
                        LVL {monster.level}
                      </div>

                      {/* Jewel Sockets */}
                      <div className="flex flex-row gap-0.5 mt-1.5 bg-slate-900/40 p-1 px-1.5 rounded-full backdrop-blur-sm border border-white/5 shadow-lg">
                        {[0, 1, 2].map((i) => {
                          const gemId = monster.gems?.[i];
                          const gemConfig = gemId ? RESOURCE_CONFIG[gemId] : null;

                          return (
                            <div
                              key={i}
                              className={cn(
                                "size-[0.45rem] rotate-45 border transition-all duration-500",
                                gemId
                                  ? "shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                  : "bg-slate-900 border-white/10"
                              )}
                              style={{
                                backgroundColor: gemConfig?.color || (gemId ? '#fff' : 'transparent'),
                                borderColor: gemId ? 'rgba(255,255,255,0.6)' : undefined
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* HP Indicator */}
                    <div className="absolute top-3 right-3 z-20">
                      <div className={cn(
                        "h-6 px-2 rounded-lg bg-slate-950/80 border text-[9px] font-black flex items-center gap-1 shadow-lg",
                        hpPercent > 90 ? "border-emerald-500/30 text-emerald-500" : "border-orange-500/30 text-orange-400"
                      )}>
                        <Heart size={10} className="fill-current" />
                        <span>{hpPercent}%</span>
                      </div>
                    </div>

                    {/* Monster Image */}
                    <img 
                      src={monster.image} 
                      className="absolute inset-0 w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-110" 
                      alt={monster.name}
                    />

                    {/* Name and Type */}
                    <div className="absolute bottom-5 left-3 right-3 z-20">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded bg-black/40 backdrop-blur-sm border border-white/5">
                          <TypeIcon type={monster.type} size={12} />
                        </div>
                        <p className="text-white text-[10px] font-black uppercase tracking-tight truncate drop-shadow-md">{monster.name}</p>
                      </div>
                    </div>

                     <div className="absolute bottom-2 left-3 right-3 h-1 bg-black/40 rounded-full border border-white/5 overflow-hidden z-20">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ 
                             width: (() => {
                               const currentLvlXP = getTotalXPForLevel(monster.level);
                               const nextLvlXP = getTotalXPForLevel(monster.level + 1);
                               const totalNeeded = nextLvlXP - currentLvlXP;
                               const perc = Math.max(0, Math.min(100, ((monster.xp || 0) / totalNeeded) * 100));
                               return `${perc}%`;
                             })()
                           }}
                           className={cn(
                            "h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]",
                            monster.rarity === 'Legendární' ? "bg-amber-500" : 
                            monster.rarity === 'Epická' ? "bg-purple-500" : 
                            monster.rarity === 'Vzácná' ? "bg-blue-500" : "bg-primary"
                          )}
                       />
                    </div>

                    {/* Disabled Overlay */}
                    {isDisabled && (
                      <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[2px] z-40 flex items-center justify-center p-4 text-center">
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-black/80 px-3 py-1.5 rounded-full border border-red-500/30 shadow-2xl">Málo životů</p>
                      </div>
                    )}
                    
                    {/* Sword overlay on hover if not disabled */}
                    {!isDisabled && (
                      <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/10 transition-colors z-20 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <motion.div 
                          initial={{ scale: 0.5, opacity: 0 }}
                          whileHover={{ scale: 1, opacity: 1 }}
                          className="size-14 bg-red-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl border-b-4 border-black/20"
                        >
                          <Sword size={24} />
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                )
              })
            ) : (
              <div className="col-span-2 py-20 flex flex-col items-center justify-center text-center">
                <Sword size={64} className="text-slate-800 mb-6 animate-pulse" />
                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] max-w-[200px]">Nemáš žádné příšerky schopné boje</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-8 bg-slate-950/80 border-t border-white/5">
        <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-[0.2em] leading-relaxed opacity-60">
          {description || "Zvolte svého šampiona, který se utká s nepřítelem. Pamatujte, že k boji je potřeba alespoň 80% životů!"}
        </p>
      </div>
    </div>
  )
}

DuelSelectionModal.displayName = 'DuelSelectionModal'

