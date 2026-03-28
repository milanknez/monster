import { Upload, Plus, Trash2, Search, Filter } from 'lucide-react'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../../utils'
import { ResourceCategory, ItemRarity } from '../../../types'
import { ResourceIcon } from '../../ui/ResourceIcon'

const CATEGORIES: { id: ResourceCategory | 'all', label: string }[] = [
  { id: 'all', label: 'Vše' },
  { id: 'material', label: 'Suroviny' },
  { id: 'consumable', label: 'Lektvary' },
  { id: 'gem', label: 'Gemy' },
  { id: 'relic', label: 'Relikvie' },
];

const RARITIES: ItemRarity[] = ['Běžná', 'Vzácná', 'Epická', 'Legendární'];

const RARITY_COLORS: Record<ItemRarity, string> = {
  'Běžná': 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  'Vzácná': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Epická': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Legendární': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

export const ResourceDesignTab = ({ resourceConfig, setResourceConfig, handleResourceImageUpload }: any) => {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<ResourceCategory | 'all'>('all');
  const [activeRarity, setActiveRarity] = useState<ItemRarity | 'all'>('all');

  const filteredItems = useMemo(() => {
    return Object.entries(resourceConfig)
      .filter(([id, conf]: [string, any]) => {
        const matchesSearch = conf.label.toLowerCase().includes(search.toLowerCase()) || id.toLowerCase().includes(search.toLowerCase());
        const matchesCat = activeCat === 'all' || conf.category === activeCat;
        const matchesRar = activeRarity === 'all' || conf.rarity === activeRarity;
        return matchesSearch && matchesCat && matchesRar;
      });
  }, [resourceConfig, search, activeCat, activeRarity]);

  return (
    <div className="space-y-8">
      {/* ToolBar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/80 p-6 rounded-[2rem] border border-white/5 backdrop-blur-md sticky top-0 z-20">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <div className="flex bg-black/40 rounded-2xl p-1 gap-1 shrink-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeCat === cat.id ? "bg-primary text-slate-950 shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex bg-black/40 rounded-2xl p-1 gap-1 shrink-0">
            <button
              onClick={() => setActiveRarity('all')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeRarity === 'all' ? "bg-slate-500 text-white shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              Vše
            </button>
            {RARITIES.map(rar => (
              <button
                key={rar}
                onClick={() => setActiveRarity(rar)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeRarity === rar 
                    ? RARITY_COLORS[rar]?.split(' ')[0] + ' bg-white/10 shadow-lg border border-white/10' 
                    : "text-white/40 hover:text-white"
                )}
              >
                {rar}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat item..." 
            className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary/50 outline-none" 
          />
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-4 px-4 pb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-2">
        <div className="w-12 shrink-0 text-center">Ikona</div>
        <div className="w-48 shrink-0">ID & Název</div>
        <div className="w-48 shrink-0">Typ a Vzácnost</div>
        <div className="w-40 shrink-0 text-center">Vzhled</div>
        <div className="w-40 shrink-0 text-center">Bonusy</div>
        <div className="flex-1">Lore & Popis</div>
        <div className="w-8 shrink-0"></div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map(([rid, conf]: [string, any]) => (
            <motion.div 
              key={rid} 
              layout
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="flex flex-col xl:flex-row items-start xl:items-center gap-4 bg-slate-900/50 border border-white/5 p-3 rounded-[1.5rem] relative group hover:bg-slate-800/80 transition-all w-full shadow-sm hover:shadow-lg"
            >
              <div 
                className="size-12 shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg relative cursor-pointer overflow-hidden border border-white/10" 
                style={{ backgroundColor: conf.color + '20' }} 
                onClick={() => document.getElementById(`icon-upload-${rid}`)?.click()}
              >
                <ResourceIcon id={rid} config={conf} size="md" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
                  <Upload size={14} className="text-white" />
                </div>
              </div>
              <input type="file" id={`icon-upload-${rid}`} className="hidden" accept="image/png" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleResourceImageUpload(rid, file);
              }} />

              <div className="flex flex-col w-full xl:w-48 shrink-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 mb-0.5">{rid}</p>
                <input 
                  value={conf.label} 
                  onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, label: e.target.value}})} 
                  className="w-full bg-transparent border border-transparent hover:border-white/5 text-white font-black uppercase px-2 py-1 focus:ring-0 text-xs leading-tight rounded-lg focus:bg-white/5 transition-colors" 
                />
              </div>

              <div className="flex gap-2 w-full xl:w-48 shrink-0">
                <select 
                  value={conf.category || 'material'} 
                  onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, category: e.target.value as ResourceCategory}})}
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-[10px] text-white focus:border-primary outline-none hover:bg-black/60 transition-colors"
                >
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                </select>
                
                <select 
                  value={conf.rarity || 'Běžná'} 
                  onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, rarity: e.target.value as ItemRarity}})}
                  className={cn(
                    "flex-1 bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-[10px] font-bold focus:border-primary outline-none hover:bg-black/60 transition-colors",
                    RARITY_COLORS[conf.rarity as ItemRarity || 'Běžná']?.split(' ')[0]
                  )}
                >
                  {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between gap-1 w-full xl:w-40 shrink-0 bg-black/30 rounded-xl p-1 border border-white/5 hover:bg-black/50 transition-colors">
                <input 
                  type="color" 
                  value={conf.color} 
                  onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, color: e.target.value}})} 
                  className="size-7 bg-transparent border-none p-0 cursor-pointer overflow-hidden rounded-lg shrink-0" 
                />
                <input 
                  value={conf.icon} 
                  onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, icon: e.target.value}})} 
                  className="w-8 bg-transparent border-none text-center text-xs text-white px-0 py-1" 
                />
                <label className="flex items-center gap-1 cursor-pointer pr-2 hover:bg-white/5 p-1 rounded-lg transition-colors">
                  <input 
                    type="checkbox" 
                    checked={conf.hasCustomIcon} 
                    onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, hasCustomIcon: e.target.checked}})} 
                    className="size-3.5 rounded border-white/10 bg-black accent-primary" 
                  />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">PNG</span>
                </label>
              </div>

              {conf.category === 'material' ? (
                <div className="flex items-center justify-center w-full xl:w-40 shrink-0 bg-black/10 rounded-xl p-1 border border-white/5 opacity-50">
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Surovina</p>
                </div>
              ) : (
                <div className="flex gap-0.5 w-full xl:w-40 shrink-0 bg-black/30 rounded-xl p-1 border border-white/5 hover:bg-black/50 transition-colors">
                  <div className="flex flex-col justify-center px-0.5 border-r border-white/5 pr-1 mr-0.5">
                    <button 
                      onClick={() => setResourceConfig({...resourceConfig, [rid]: {...conf, statsType: conf.statsType === 'perc' ? 'flat' : 'perc'}})}
                      className={cn("w-6 h-full flex items-center justify-center rounded transition-colors text-xs font-black", conf.statsType === 'perc' ? "bg-primary/20 text-primary" : "bg-white/5 text-white")}
                    >
                      {conf.statsType === 'perc' ? '%' : '+'}
                    </button>
                  </div>
                  {[
                    { key: 'hp', label: 'HP', color: 'text-red-500' },
                    { key: 'atk', label: 'ATK', color: 'text-orange-500' },
                    { key: 'def', label: 'DEF', color: 'text-blue-500' },
                    { key: 'energy', label: 'MANA', color: 'text-cyan-400' }
                  ].map(stat => (
                    <div key={stat.key} className="flex flex-col items-center justify-center flex-1 py-0.5 hover:bg-white/5 rounded-lg transition-colors">
                      <label className={cn("text-[7px] font-black uppercase mb-0 tracking-wider", stat.color)}>{stat.label}</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={conf.stats?.[stat.key] || 0} 
                        onChange={(e) => {
                          const valStr = e.target.value.replace(/[^0-9-]/g, '');
                          const val = valStr === '' || valStr === '-' ? 0 : parseInt(valStr);
                          setResourceConfig({
                            ...resourceConfig, 
                            [rid]: {
                              ...conf, 
                              stats: { ...(conf.stats || {}), [stat.key]: isNaN(val) ? 0 : val }
                            }
                          });
                        }} 
                        className={cn(
                          "w-full bg-transparent border-none px-0 py-0 text-center text-[10px] font-bold focus:ring-0 z-10 transition-colors",
                          (conf.stats?.[stat.key] || 0) === 0 ? "text-slate-600" : "text-white"
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 w-full xl:w-auto xl:flex-1">
                <div className="flex items-center gap-3 w-full">
                  <input 
                    value={conf.description || ''} 
                    onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, description: e.target.value}})} 
                    placeholder="Zadejte lore/popisek..."
                    className="flex-1 bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-400 focus:border-white/20 hover:bg-black/50 transition-all font-medium h-[34px]" 
                  />
                  <button 
                    onClick={() => {
                      const newConfig = { ...resourceConfig };
                      delete newConfig[rid];
                      setResourceConfig(newConfig);
                    }}
                    className="text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all p-2 rounded-xl shrink-0 border border-transparent hover:border-red-500/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {conf.category === 'consumable' && (
                  <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-purple-500/10 w-full">
                    <span className="text-[8px] font-black text-purple-400/70 uppercase tracking-widest pl-1 shrink-0">Efekt:</span>
                    <select
                      value={conf.specialEffect || 'none'}
                      onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, specialEffect: e.target.value as any}})}
                      className="bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] text-white focus:ring-0 outline-none w-28"
                    >
                      <option value="none">Žádný</option>
                      <option value="xp_boost">2x Zkušenosti (XP)</option>
                      <option value="hp_regen">Regenerace HP</option>
                    </select>
                    
                    {conf.specialEffect && conf.specialEffect !== 'none' && (
                      <div className="flex items-center bg-black/40 rounded border border-white/10 overflow-hidden ml-auto">
                        <span className="text-[8px] text-slate-500 px-1.5 bg-white/5 uppercase font-bold py-1">Minuty</span>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={conf.effectDuration ?? 15} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                            setResourceConfig({...resourceConfig, [rid]: {...conf, effectDuration: val}});
                          }}
                          className="bg-white/5 border-none text-[9px] w-8 p-0 py-0.5 text-center text-purple-400 font-bold focus:ring-0"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5 w-full">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 shrink-0">Recept:</span>
                  {(conf.recipe || []).map((req: any, reqIdx: number) => (
                    <div key={reqIdx} className="flex items-center bg-black/40 rounded flex-shrink-0 border border-white/10 overflow-hidden">
                      <select 
                        value={req.type} 
                        onChange={(e) => {
                          const newRecipe = [...(conf.recipe || [])];
                          newRecipe[reqIdx].type = e.target.value;
                          setResourceConfig({...resourceConfig, [rid]: {...conf, recipe: newRecipe}});
                        }}
                        className="bg-transparent border-none text-[9px] py-0.5 px-1 w-[80px] truncate text-white focus:ring-0 cursor-pointer"
                      >
                         {Object.keys(resourceConfig).map(t => <option key={t} value={t} className="bg-slate-900">{resourceConfig[t]?.icon} {resourceConfig[t]?.label || t}</option>)}
                      </select>
                      <span className="text-[9px] text-slate-500 px-1 bg-white/5">x</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={req.count} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 1;
                          const newRecipe = [...(conf.recipe || [])];
                          newRecipe[reqIdx].count = val;
                          setResourceConfig({...resourceConfig, [rid]: {...conf, recipe: newRecipe}});
                        }}
                        className="bg-white/5 border-none text-[9px] w-6 p-0 py-0.5 text-center text-primary font-black focus:ring-0"
                      />
                      <button 
                        onClick={() => {
                          const newRecipe = [...(conf.recipe || [])];
                          newRecipe.splice(reqIdx, 1);
                          setResourceConfig({...resourceConfig, [rid]: {...conf, recipe: newRecipe}});
                        }} 
                        className="px-1.5 py-1 hover:bg-red-500/20 hover:text-red-500 text-slate-600 transition-colors"
                      >
                         <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                       const newRecipe = [...(conf.recipe || []), { type: 'crystal', count: 1 }];
                       setResourceConfig({...resourceConfig, [rid]: {...conf, recipe: newRecipe}});
                    }}
                    className="text-[8px] font-black uppercase text-primary hover:bg-primary/10 px-2 py-1 rounded transition-all border border-primary/20 bg-primary/5"
                  >
                    + Přísada
                  </button>

                  {conf.recipe && conf.recipe.length > 0 && (
                     <div className="flex items-center gap-1.5 ml-auto bg-black/40 border border-white/10 rounded px-1.5 py-0.5">
                        <span className="text-[8px] text-emerald-500/70 uppercase font-black">Vyrobí se:</span>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={conf.recipeAmount || 1}
                          onChange={e => {
                             const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 1;
                             setResourceConfig({...resourceConfig, [rid]: {...conf, recipeAmount: val}});
                          }}
                          className="w-5 bg-transparent border-none text-center text-[10px] font-black p-0 text-emerald-400 focus:ring-0"
                        />
                     </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5 w-full">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 shrink-0">Drop:</span>
                  <div className="flex items-center bg-black/40 rounded border border-white/10 overflow-hidden">
                    <span className="text-[8px] text-slate-500 px-1.5 bg-white/5 uppercase font-bold py-1">Váha</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={conf.dropWeight ?? 10} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                        setResourceConfig({...resourceConfig, [rid]: {...conf, dropWeight: val}});
                      }}
                      className="bg-white/5 border-none text-[9px] w-8 p-0 py-0.5 text-center text-amber-400 font-black focus:ring-0"
                      placeholder="10"
                    />
                  </div>
                  <div className="flex items-center bg-black/40 rounded border border-white/10 overflow-hidden ml-1">
                    <span className="text-[8px] text-slate-500 px-1.5 bg-white/5 uppercase font-bold py-1">Min/Max ks</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={conf.dropMin ?? 1} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 1;
                        setResourceConfig({...resourceConfig, [rid]: {...conf, dropMin: val}});
                      }}
                      className="bg-white/5 border-none text-[9px] w-6 p-0 py-0.5 text-center text-white font-bold focus:ring-0"
                    />
                    <span className="text-[8px] text-slate-600 px-0.5 bg-white/5">-</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={conf.dropMax ?? 1} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 1;
                        setResourceConfig({...resourceConfig, [rid]: {...conf, dropMax: val}});
                      }}
                      className="bg-white/5 border-none text-[9px] w-6 p-0 py-0.5 text-center text-white font-bold focus:ring-0"
                    />
                  </div>
                  <p className="text-[8px] text-slate-600 italic ml-2">(S jakou pravděpodobností padá mezi předměty stejné vzácnosti)</p>
                </div>
              </div>

            </motion.div>
          ))}
        </AnimatePresence>

        <button 
          onClick={() => {
            const id = `new_item_${Date.now()}`;
            setResourceConfig({
              ...resourceConfig, 
              [id]: { 
                label: 'Nový Předmět', 
                color: '#ffffff', 
                icon: '📦', 
                hasCustomIcon: false, 
                category: 'relic',
                rarity: 'Běžná',
                description: '', 
                stats: { hp: 0, atk: 0, def: 0 } 
              }
            });
          }} 
          className="w-full h-16 rounded-[1.5rem] border-2 border-dashed border-white/5 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all gap-3 mt-2 group"
        >
          <div className="size-8 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[3px]">Přidat Nový Předmět</span>
        </button>
      </motion.div>
    </div>
  );
}


