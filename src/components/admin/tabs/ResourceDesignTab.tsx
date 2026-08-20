import { Upload, Plus, Trash2, Search, Filter, Image as ImageIcon, Smile } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, getLoc, RARITY_COLORS, RARITY_MAP } from '../../../utils'
import { useTranslation } from 'react-i18next'
import { ResourceCategory, ItemRarity } from '../../../types'
import { ResourceIcon } from '../../ui/ResourceIcon'

export const ResourceDesignTab = ({ resourceConfig, setResourceConfig, handleResourceImageUpload }: any) => {
  const { t, i18n } = useTranslation();

  const CATEGORIES: { id: ResourceCategory | 'all', label: string }[] = [
    { id: 'all', label: 'Vše' },
    { id: 'material', label: 'Materiály' },
    { id: 'consumable', label: 'Spotřební' },
    { id: 'gem', label: 'Drahokamy' },
    { id: 'relic', label: 'Relikvie' },
  ];

  const RARITIES: { id: string; label: string; color: string }[] = [
    { id: 'common', label: 'Běžná', color: 'text-slate-400 border-slate-500/30' },
    { id: 'rare', label: 'Vzácná', color: 'text-blue-400 border-blue-500/30' },
    { id: 'epic', label: 'Epická', color: 'text-purple-400 border-purple-500/30' },
    { id: 'legendary', label: 'Legendární', color: 'text-amber-400 border-amber-500/30' },
  ];

  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<ResourceCategory | 'all'>('all');
  const [activeRarity, setActiveRarity] = useState<string>('all');
  const [availableImages, setAvailableImages] = useState<string[]>([]);

  const [activeLang, setActiveLang] = useState<'cz' | 'en' | 'sk'>('cz');
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/list-resources')
      .then(res => res.json())
      .then(data => setAvailableImages(data))
      .catch(e => console.error('Failed to list resources', e));

    // Close picker on outside click
    const handleClickOutside = () => setOpenPickerId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    return Object.entries(resourceConfig)
      .filter(([id, conf]: [string, any]) => {
        const labelStr = typeof conf.label === 'object' ? (conf.label[i18n.language] || conf.label['cz'] || '') : (conf.label || '');
        const matchesSearch = labelStr.toLowerCase().includes(search.toLowerCase()) || id.toLowerCase().includes(search.toLowerCase());
        const matchesCat = activeCat === 'all' || conf.category === activeCat;
        
        // Zjistíme normalizovanou vzácnost položky (common, rare, epic, legendary)
        const rawRarity = conf.rarity || 'common';
        const itemRarityKey = RARITY_MAP[rawRarity] || (typeof rawRarity === 'string' ? rawRarity.toLowerCase() : 'common');
        
        const matchesRar = activeRarity === 'all' || itemRarityKey === activeRarity;
        return matchesSearch && matchesCat && matchesRar;
      });
  }, [resourceConfig, search, activeCat, activeRarity, i18n.language]);

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
            {['cz', 'en', 'sk'].map(lang => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang as any)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeLang === lang ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                {lang}
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
                key={rar.id}
                onClick={() => setActiveRarity(rar.id)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  activeRarity === rar.id 
                    ? `${rar.color} bg-white/10 shadow-lg font-black` 
                    : "border-transparent text-white/40 hover:text-white"
                )}
              >
                {rar.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat předmět..."
            className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary/50 outline-none"
          />
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-4 px-4 pb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-2">
        <div className="w-12 shrink-0 text-center">IKONA</div>
        <div className="w-48 shrink-0">NÁZEV</div>
        <div className="w-48 shrink-0">KATEGORIE</div>
        <div className="w-40 shrink-0 text-center">VZHLED</div>
        <div className="w-40 shrink-0 text-center">BONUSY</div>
        <div className="flex-1">LORE / POPIS</div>
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
              <input type="file" id={`icon-upload-${rid}`} className="hidden" accept="image/png" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await handleResourceImageUpload(rid, file);
                  // Refresh list after upload
                  fetch('/api/list-resources').then(r => r.json()).then(setAvailableImages);
                }
              }} />

              <div className="flex flex-col w-full xl:w-48 shrink-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 mb-0.5">{rid}</p>
                <input
                  value={typeof conf.label === 'object' ? (conf.label[activeLang] || '') : (activeLang === 'cz' ? conf.label : '')}
                  onChange={(e) => {
                    const currentLabel = typeof conf.label === 'object' ? conf.label : { cz: conf.label, en: conf.label, sk: conf.label };
                    setResourceConfig({ ...resourceConfig, [rid]: { ...conf, label: { ...currentLabel, [activeLang]: e.target.value } } });
                  }}
                  className="w-full bg-transparent border border-transparent hover:border-white/5 text-white font-black uppercase px-2 py-1 focus:ring-0 text-xs leading-tight rounded-lg focus:bg-white/5 transition-colors"
                  placeholder={`Název (${activeLang.toUpperCase()})...`}
                />
              </div>

              <div className="flex gap-2 w-full xl:w-48 shrink-0">
                <select
                  value={conf.category || 'material'}
                  onChange={(e) => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, category: e.target.value as ResourceCategory } })}
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-[10px] text-white focus:border-primary outline-none hover:bg-black/60 transition-colors"
                >
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                </select>

                <select
                  value={RARITY_MAP[conf.rarity] || conf.rarity || 'common'}
                  onChange={(e) => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, rarity: e.target.value as ItemRarity } })}
                  className={cn(
                    "flex-1 bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-[10px] font-bold focus:border-primary outline-none hover:bg-black/60 transition-colors",
                    RARITY_COLORS[RARITY_MAP[conf.rarity] || conf.rarity || 'common']
                  )}
                >
                  {RARITIES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1 w-full xl:w-48 shrink-0 bg-black/30 rounded-2xl p-2 border border-white/5 hover:bg-black/50 transition-all">
                <div className="flex bg-black/60 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, hasCustomIcon: false } })}
                    className={cn("flex-1 px-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1", !conf.hasCustomIcon ? "bg-primary text-slate-950" : "text-slate-500 hover:text-white")}
                  >
                    <Smile size={10} /> Emoji Ikonka
                  </button>
                  <button
                    onClick={() => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, hasCustomIcon: true } })}
                    className={cn("flex-1 px-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1", conf.hasCustomIcon ? "bg-primary text-slate-950" : "text-slate-500 hover:text-white")}
                  >
                    <ImageIcon size={10} /> PNG Obrázek
                  </button>
                </div>

                <div className="flex items-center gap-1.5 px-1 py-0.5 mt-0.5">
                  {!conf.hasCustomIcon ? (
                    <div className="flex items-center flex-1 gap-1.5">
                      <input
                        value={conf.icon}
                        onChange={(e) => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, icon: e.target.value } })}
                        className="w-8 bg-black/40 border border-white/10 rounded-lg text-center text-sm py-1"
                        placeholder="📦"
                      />
                      <input
                        type="color"
                        value={conf.color}
                        onChange={(e) => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, color: e.target.value } })}
                        className="size-7 bg-transparent border-none p-0 cursor-pointer overflow-hidden rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col w-full gap-1.5">
                      <div className="flex items-center gap-2 relative">
                        {/* Custom Dropdown for PNG selection with previews */}
                        <div className="flex-1 relative" onClick={(e) => e.stopPropagation()}>
                          <div
                            onClick={() => setOpenPickerId(openPickerId === rid ? null : rid)}
                            className={cn(
                              "w-full bg-black/40 border rounded-lg px-2 py-1.5 text-[9px] font-bold flex items-center justify-between cursor-pointer hover:bg-black/60 transition-colors",
                              openPickerId === rid ? "border-primary text-primary" : "border-white/10 text-emerald-400"
                            )}
                          >
                            <span>{conf.customIcon || rid}</span>
                            <ImageIcon size={10} className="opacity-40" />
                          </div>

                          {/* Dropdown Menu (Grid 8 cols, Smaller icons) */}
                          <AnimatePresence>
                            {openPickerId === rid && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                className="absolute bottom-full mb-2 left-0 w-[280px] max-h-72 overflow-y-auto bg-slate-900 border border-white/10 rounded-[1.2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[200] p-2 custom-scrollbar backdrop-blur-xl origin-bottom-left"
                              >
                                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Galerie Dostupných Ikon</p>
                                <div className="grid grid-cols-8 gap-1">
                                  {[rid, ...availableImages.filter(img => img !== rid)].map(img => (
                                    <button
                                      key={img}
                                      onClick={() => {
                                        setResourceConfig({ ...resourceConfig, [rid]: { ...conf, customIcon: img === rid ? undefined : img } });
                                        setOpenPickerId(null);
                                      }}
                                      title={`${img}.png`}
                                      className={cn(
                                        "aspect-square rounded-md transition-all border flex items-center justify-center relative overflow-hidden group/item",
                                        (conf.customIcon || rid) === img
                                          ? "bg-primary/20 border-primary shadow-lg shadow-primary/10"
                                          : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60"
                                      )}
                                    >
                                      <img src={`/resources/${img}.png`} className="w-full h-full object-contain p-0.5 group-hover/item:scale-110 transition-transform" />
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => document.getElementById(`icon-upload-${rid}`)?.click()}
                          className="text-[7px] font-black uppercase text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <Upload size={8} /> Nahrát jiný PNG
                        </button>
                        <input
                          type="color"
                          value={conf.color}
                          onChange={(e) => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, color: e.target.value } })}
                          className="size-5 bg-transparent border-none p-0 cursor-pointer overflow-hidden rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {conf.category === 'material' ? (
                <div className="flex items-center justify-center w-full xl:w-40 shrink-0 bg-black/10 rounded-xl p-1 border border-white/5 opacity-50">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Surovina (Materiál)</p>
                </div>
              ) : (
                <div className="flex gap-0.5 w-full xl:w-40 shrink-0 bg-black/30 rounded-xl p-1 border border-white/5 hover:bg-black/50 transition-colors">
                  <div className="flex flex-col justify-center px-0.5 border-r border-white/5 pr-1 mr-0.5">
                    <button
                      onClick={() => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, statsType: conf.statsType === 'perc' ? 'flat' : 'perc' } })}
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
                    value={typeof conf.description === 'object' ? (conf.description[activeLang] || '') : (activeLang === 'cz' ? conf.description : '')}
                    onChange={(e) => {
                      const currentDesc = typeof conf.description === 'object' ? conf.description : { cz: conf.description, en: conf.description, sk: conf.description };
                      setResourceConfig({ ...resourceConfig, [rid]: { ...conf, description: { ...currentDesc, [activeLang]: e.target.value } } });
                    }}
                    placeholder={`Lore / Popis (${activeLang.toUpperCase()})...`}
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
                    <span className="text-[8px] font-black text-purple-400/70 uppercase tracking-widest pl-1 shrink-0">Speciální Efekt</span>
                    <select
                      value={conf.specialEffect || 'none'}
                      onChange={(e) => setResourceConfig({ ...resourceConfig, [rid]: { ...conf, specialEffect: e.target.value as any } })}
                      className="bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] text-white focus:ring-0 outline-none w-28"
                    >
                      <option value="none">Žádný efekt</option>
                      <option value="xp_boost">XP Boost (+%)</option>
                      <option value="hp_regen">Regenerace HP</option>
                    </select>

                    {conf.specialEffect && conf.specialEffect !== 'none' && (
                      <div className="flex items-center bg-black/40 rounded border border-white/10 overflow-hidden ml-auto">
                        <span className="text-[8px] text-slate-500 px-1.5 bg-white/5 uppercase font-bold py-1">Minut</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={conf.effectDuration ?? 15}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                            setResourceConfig({ ...resourceConfig, [rid]: { ...conf, effectDuration: val } });
                          }}
                          className="bg-white/5 border-none text-[9px] w-8 p-0 py-0.5 text-center text-purple-400 font-bold focus:ring-0"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5 w-full">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 shrink-0">Receptura</span>
                  {(conf.recipe || []).map((req: any, reqIdx: number) => (
                    <div key={reqIdx} className="flex items-center bg-black/40 rounded flex-shrink-0 border border-white/10 overflow-hidden">
                      <select
                        value={req.type}
                        onChange={(e) => {
                          const newRecipe = [...(conf.recipe || [])];
                          newRecipe[reqIdx].type = e.target.value;
                          setResourceConfig({ ...resourceConfig, [rid]: { ...conf, recipe: newRecipe } });
                        }}
                        className="bg-transparent border-none text-[9px] py-0.5 px-1 w-[80px] truncate text-white focus:ring-0 cursor-pointer"
                      >
                        {Object.keys(resourceConfig).map(t => <option key={t} value={t} className="bg-slate-900">{resourceConfig[t]?.icon} {getLoc(resourceConfig[t]?.label, i18n.language) || t}</option>)}
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
                          setResourceConfig({ ...resourceConfig, [rid]: { ...conf, recipe: newRecipe } });
                        }}
                        className="bg-white/5 border-none text-[9px] w-6 p-0 py-0.5 text-center text-primary font-black focus:ring-0"
                      />
                      <button
                        onClick={() => {
                          const newRecipe = [...(conf.recipe || [])];
                          newRecipe.splice(reqIdx, 1);
                          setResourceConfig({ ...resourceConfig, [rid]: { ...conf, recipe: newRecipe } });
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
                      setResourceConfig({ ...resourceConfig, [rid]: { ...conf, recipe: newRecipe } });
                    }}
                    className="text-[8px] font-black uppercase text-primary hover:bg-primary/10 px-2 py-1 rounded transition-all border border-primary/20 bg-primary/5"
                  >
                    + Ingredience
                  </button>

                  {conf.recipe && conf.recipe.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto bg-black/40 border border-white/10 rounded px-1.5 py-0.5">
                      <span className="text-[8px] text-emerald-500/70 uppercase font-black">Výsledek (ks)</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={conf.recipeAmount || 1}
                        onChange={e => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 1;
                          setResourceConfig({ ...resourceConfig, [rid]: { ...conf, recipeAmount: val } });
                        }}
                        className="w-5 bg-transparent border-none text-center text-[10px] font-black p-0 text-emerald-400 focus:ring-0"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5 w-full">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1 shrink-0">Drop Nastavení</span>
                  <div className="flex items-center bg-black/40 rounded border border-white/10 overflow-hidden">
                    <span className="text-[8px] text-slate-500 px-1.5 bg-white/5 uppercase font-bold py-1">Váha</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={conf.dropWeight ?? 10}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                        setResourceConfig({ ...resourceConfig, [rid]: { ...conf, dropWeight: val } });
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
                        setResourceConfig({ ...resourceConfig, [rid]: { ...conf, dropMin: val } });
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
                        setResourceConfig({ ...resourceConfig, [rid]: { ...conf, dropMax: val } });
                      }}
                      className="bg-white/5 border-none text-[9px] w-6 p-0 py-0.5 text-center text-white font-bold focus:ring-0"
                    />
                  </div>
                  <p className="text-[8px] text-slate-600 italic ml-2">Nastavte šanci na nalezení při průzkumu mapy</p>
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
                label: { cz: 'Nový Předmět', en: 'New Item', sk: 'Nový Predmet' },
                color: '#ffffff',
                icon: '📦',
                hasCustomIcon: false,
                category: 'relic',
                rarity: 'Běžná',
                description: { cz: '', en: '', sk: '' },
                stats: { hp: 0, atk: 0, def: 0 }
              }
            });
          }}
          className="w-full h-16 rounded-[1.5rem] border-2 border-dashed border-white/5 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all gap-3 mt-2 group"
        >
          <div className="size-8 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[3px]">Přidat nový předmět</span>
        </button>
      </motion.div>
    </div>
  );
};


