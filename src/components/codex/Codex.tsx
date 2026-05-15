import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, Sparkles, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { InventoryItem, Recipe, ResourceType } from '../../types';
import { cn, getLoc } from '../../utils';
import { RESOURCE_CONFIG } from '../map/mapUtils';
import { ResourceIcon } from '../ui/ResourceIcon';

import { useGameSound } from '../../data/sounds';

export const Laboratory = ({
  inventory,
  onCraft
}: {
  inventory: (InventoryItem | null)[],
  onCraft: (recipe: Recipe) => void
}) => {
  const { t, i18n } = useTranslation();
  const { playLabStart, playLabComplete } = useGameSound();
  const [craftingRecipeId, setCraftingRecipeId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'potions' | 'gems' | 'relics'>('all');

  const getItemCount = (type: ResourceType) => {
    return inventory.reduce((acc, slot) => {
      if (slot?.type === type) return acc + slot.count;
      return acc;
    }, 0);
  };

  const startCrafting = (recipe: Recipe) => {
    setCraftingRecipeId(recipe.id);
    setProgress(0);
    playLabStart();

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
        playLabComplete();
        setCraftingRecipeId(null);
        setProgress(0);
      }
    }, interval);
  };

  const filteredRecipes = Object.entries(RESOURCE_CONFIG)
    .filter(([id, config]) => config.recipe && config.recipe.length > 0)
    .map(([id, config]) => ({
      id,
      name: getLoc(config.label, i18n.language) || id,
      description: getLoc(config.description, i18n.language) || '',
      requirements: config.recipe! as any,
      result: { type: 'item' as const, id, amount: config.recipeAmount || 1 }
    }))
    .filter(recipe => {
      if (activeCategory === 'all') return true;
      if (activeCategory === 'potions') return recipe.id.includes('potion') || recipe.id.includes('booster') || recipe.id.includes('drink');
      if (activeCategory === 'gems') return recipe.id.includes('gem');
      if (activeCategory === 'relics') return recipe.id.includes('loot') || RESOURCE_CONFIG[recipe.id]?.category === 'relic';
      return true;
    });

  return (
    <div className="px-4">
      {/* Premium Header */}
      <div className="py-6 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 size-32 bg-secondary/10 blur-[60px] -z-10" />
        <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary mb-3">
          <Beaker size={24} />
        </div>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t('laboratory.title')}</h2>
        <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest opacity-80">{t('laboratory.subtitle')}</p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {(['all', 'potions', 'gems', 'relics'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
              activeCategory === cat
                ? "bg-secondary border-secondary text-white shadow-lg shadow-secondary/20"
                : "bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10"
            )}
          >
            {t(`laboratory.categories.${cat}`)}
          </button>
        ))}
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-2 gap-3 pb-8">
        <AnimatePresence mode="popLayout">
          {filteredRecipes.map((recipe, idx) => {
            const hasSpace = inventory.some(slot => slot === null);
            const materialsMet = recipe.requirements.every((req: any) => getItemCount(req.type) >= req.count);
            const ready = materialsMet && hasSpace && !craftingRecipeId;
            const active = craftingRecipeId === recipe.id;
            const config = RESOURCE_CONFIG[recipe.result.id];
            const rarity = config?.rarity || 'Běžná';
            
            return (
              <motion.div
                layout
                key={recipe.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "col-span-1 group relative rounded-[2rem] border transition-all duration-300 flex flex-col overflow-hidden",
                  active ? "ring-2 ring-secondary shadow-[0_0_20px_rgba(13,185,242,0.3)]" : "",
                  ready || active
                    ? "bg-slate-900 border-secondary/30"
                    : "bg-slate-900/40 border-white/5 opacity-80",
                  rarity === 'legendary' ? "border-amber-500/50" :
                  rarity === 'epic' ? "border-purple-500/50" :
                  rarity === 'rare' ? "border-blue-500/50" : ""
                )}
              >
                {/* Card Content */}
                <div className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={cn(
                      "size-11 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-lg overflow-hidden",
                      rarity === 'legendary' ? "border-amber-500 bg-amber-500/10 shadow-amber-500/5" :
                      rarity === 'epic' ? "border-purple-500 bg-purple-500/10 shadow-purple-500/5" :
                      rarity === 'rare' ? "border-blue-500 bg-blue-500/10 shadow-blue-500/5" :
                      "bg-slate-800 border-white/10"
                    )}>
                      <ResourceIcon id={recipe.result.id} config={RESOURCE_CONFIG[recipe.result.id] as any} size="md" className="w-full h-full" />
                    </div>
                    {ready && !active && (
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] mt-1.5" />
                    )}
                  </div>

                  <h3 className="text-[11px] font-black text-white uppercase italic leading-tight mb-1">
                    {recipe.name}
                  </h3>
                  
                  <p className="text-[9px] text-slate-500 font-bold mb-3 line-clamp-2 leading-tight h-7">
                    {recipe.description}
                  </p>

                  {/* Mini-Hints for Materials */}
                  {!active && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {recipe.requirements.map((req: any) => {
                        const count = getItemCount(req.type);
                        const ok = count >= req.count;
                        return (
                          <div key={req.type} className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded-lg border border-white/5">
                            <span className="text-[9px] opacity-80">{RESOURCE_CONFIG[req.type]?.icon}</span>
                            <span className={cn("text-[9px] font-black", ok ? "text-emerald-500" : "text-red-500")}>
                              {count < req.count ? count : req.count}/{req.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Crafting Overlay */}
                  {active && (
                    <div className="mt-auto mb-2">
                      <div className="flex justify-between items-end mb-1">
                        <p className="text-[8px] font-black text-secondary uppercase tracking-widest animate-pulse">{t('laboratory.working')}</p>
                        <p className="text-[9px] font-black text-white italic">{Math.floor(progress)}%</p>
                      </div>
                      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          className="h-full bg-gradient-to-r from-secondary to-orange-500"
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!active && (
                    <button
                      disabled={!ready}
                      onClick={() => ready && startCrafting(recipe)}
                      className={cn(
                        "mt-auto w-full py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-lg",
                        ready 
                          ? "bg-gradient-to-r from-secondary to-blue-600 text-white shadow-secondary/10"
                          : "bg-slate-800 text-slate-600 cursor-not-allowed"
                      )}
                    >
                      {!hasSpace ? (
                        <><AlertCircle size={12} /> {t('laboratory.full')}</>
                      ) : materialsMet ? (
                        <><Zap size={12} /> {t('laboratory.craft')}</>
                      ) : (
                        <><AlertCircle size={12} /> {t('laboratory.missing')}</>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
