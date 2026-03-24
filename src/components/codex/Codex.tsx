import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, Sparkles, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { recipes } from '../../data/recipes';
import type { InventoryItem, Recipe, ResourceType } from '../../types';
import { cn } from '../../utils';
import { RESOURCE_CONFIG } from '../map/mapUtils';

export const Laboratory = ({
  inventory,
  onCraft
}: {
  inventory: (InventoryItem | null)[],
  onCraft: (recipe: Recipe) => void
}) => {
  const [craftingRecipeId, setCraftingRecipeId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const getItemCount = (type: ResourceType) => {
    return inventory.reduce((acc, slot) => {
      if (slot?.type === type) return acc + slot.count;
      return acc;
    }, 0);
  };

  const startCrafting = (recipe: Recipe) => {
    setCraftingRecipeId(recipe.id);
    setProgress(0);

    const duration = 3000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = (currentStep / steps) * 100;
      setProgress(newProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        onCraft(recipe);
        setCraftingRecipeId(null);
        setProgress(0);
      }
    }, interval);
  };

  return (
    <div className="pb-16 px-6">
      {/* Premium Header */}
      <div className="py-8 text-center relative">
        <div className="absolute top-0 left-1/2 -underline-1/2 size-40 bg-secondary/10 blur-[80px] -z-10" />
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary mb-4">
          <Beaker size={32} />
        </div>
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Laboratoř</h2>
        <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest opacity-80">Syntéza drahokamů a lektvarů</p>
      </div>

      <div className="space-y-8">
        {recipes.map((recipe, idx) => {
          const hasSpace = inventory.some(slot => slot === null);
          const materialsMet = recipe.requirements.every(req => getItemCount(req.type) >= req.count);
          const ready = materialsMet && hasSpace && !craftingRecipeId;
          const active = craftingRecipeId === recipe.id;

          return (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "group relative p-6 rounded-[2.5rem] border transition-all duration-500",
                active ? "ring-2 ring-secondary ring-offset-4 ring-offset-background-dark scale-[1.02]" : "",
                ready || active
                  ? "bg-slate-900 border-secondary/40 shadow-2xl shadow-secondary/10"
                  : "bg-slate-900/40 border-white/5 opacity-70 grayscale-[0.3]"
              )}
            >
              <div className="absolute -top-4 left-6 px-4 py-1.5 rounded-full bg-slate-950 border border-secondary/40 flex items-center gap-2">
                {active ? <RefreshCw size={12} className="text-secondary animate-spin" /> : <Sparkles size={12} className="text-secondary" />}
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
                  {active ? "Vyrábím..." : "Recept"}
                </span>
              </div>

              {/* Title & Stats */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-white uppercase italic">{recipe.name}</h3>
                  <p className="text-[11px] text-slate-400 font-bold leading-relaxed pr-8">{recipe.description}</p>
                </div>
                <div className="size-20 rounded-3xl bg-secondary/10 border border-secondary/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 relative overflow-hidden shrink-0">
                  <div className={cn("size-14 flex items-center justify-center", active ? "animate-bounce" : "animate-pulse-slow")}>
                    {RESOURCE_CONFIG[recipe.result.id]?.hasCustomIcon ? (
                      <img src={`resources/${recipe.result.id}.png`} className="w-full h-full object-contain filter drop-shadow-md" />
                    ) : (
                      <span className="text-5xl drop-shadow-md">
                        {recipe.result.id === 'xp_booster' || recipe.result.id === 'xp_boost' ? '🧪' : (recipe.result.id === 'hp_potion' || recipe.result.id === 'hp_regen') ? '❤️' : (RESOURCE_CONFIG[recipe.result.id]?.icon || '🎒')}
                      </span>
                    )}
                  </div>
                  {active && (
                    <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center">
                      <span className="text-xs font-black text-white">{Math.floor(progress)}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/5 w-full mb-8" />

              {/* Requirements Grid */}
              {!active && (
                <div className="space-y-4 mb-8">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary" /> Potřebné materiály
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {recipe.requirements.map(req => {
                      const count = getItemCount(req.type);
                      const ok = count >= req.count;
                      const config = RESOURCE_CONFIG[req.type];

                      return (
                        <div key={req.type} className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all truncate min-w-[140px]",
                          ok ? "bg-emerald-500/5 border-emerald-500/20" : "bg-black/40 border-white/5"
                        )}>
                          <div className="size-12 bg-slate-800 rounded-xl flex items-center justify-center text-3xl shadow-inner relative overflow-hidden">
                            {config?.hasCustomIcon ? (
                              <img src={`resources/${req.type}.png`} className="w-full h-full object-contain p-1" />
                            ) : (
                              <span>{config?.icon}</span>
                            )}
                          </div>

                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase leading-none">{config.label}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <p className={cn("text-sm font-black italic", ok ? "text-emerald-500" : "text-red-500")}>
                                {count}
                              </p>
                              <span className="text-[10px] text-slate-700">/ {req.count}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Progress Bar for Active Recipe */}
              {active && (
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Alchymie v procesu...</p>
                    <p className="text-xs font-black text-white italic">{Math.floor(progress)}%</p>
                  </div>
                  <div className="h-4 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-secondary to-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <motion.button
                whileHover={ready ? { scale: 1.02, translateY: -2 } : {}}
                whileTap={ready ? { scale: 0.98 } : {}}
                disabled={!ready || active}
                onClick={() => ready && startCrafting(recipe)}
                className={cn(
                  "w-full py-5 rounded-[1.5rem] font-black uppercase text-sm tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:translate-y-1 shadow-xl",
                  active
                    ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                    : ready
                      ? "bg-gradient-to-r from-secondary to-orange-500 text-white shadow-secondary/30"
                      : "bg-slate-800 text-slate-600 cursor-not-allowed grayscale"
                )}
              >
                {active ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> PROBÍHÁ VÝROBA
                  </>
                ) : ready ? (
                  <>
                    <Beaker size={18} /> VYROBIT TEĎ
                  </>
                ) : !hasSpace ? (
                  <>
                    <AlertCircle size={18} /> PLNÝ INVENTÁŘ
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} /> NEDOSTATEK MATERIÁLŮ
                  </>
                )}
              </motion.button>
            </motion.div>
          )
        })}
      </div>


    </div>
  )
}
