import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Plus, Trash2, Download, Copy, ArrowLeft, ShieldAlert, Flame, Droplets, Leaf, Zap, Moon, Sun } from 'lucide-react'
import { monsterDB } from '../../data/monsters'
import { cn, TYPE_COLORS } from '../../utils'
import type { Monster } from '../../types'

const MONSTER_TYPES = ['Ohnivá', 'Vodní', 'Přírodní', 'Elektrická']
const MONSTER_RARITIES = ['Běžná', 'Vzácná', 'Epická', 'Legendární']
const RARITY_COLORS: Record<string, string> = {
  'Běžná': 'text-slate-400',
  'Vzácná': 'text-purple-400',
  'Epická': 'text-orange-400',
  'Legendární': 'text-amber-400'
}

const TYPE_ICONS: Record<string, any> = {
  'Ohnivá': Flame,
  'Vodní': Droplets,
  'Přírodní': Leaf,
  'Elektrická': Zap
}

const TYPE_EMOJIS: Record<string, string> = {
  'Ohnivá': '🔥',
  'Vodní': '💧',
  'Přírodní': '🌿',
  'Elektrická': '⚡',
  'Default': '👾'
}

export const MonsterEditor = ({ onBack }: { onBack: () => void }) => {
  const [monsters, setMonsters] = useState<any[]>(monsterDB)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    description: '',
    type: 'Přírodní',
    rarity: 'Běžná',
    stats: { hp: 50, attack: 50, defense: 50 },
    abilities: [
      { name: '', description: '' },
      { name: '', description: '' }
    ]
  })

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passInput, setPassInput] = useState('')
  const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false)
  const [isRaritySelectOpen, setIsRaritySelectOpen] = useState(false)
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [sidebarFilter, setSidebarFilter] = useState('Vše')
  const [elementFilter, setElementFilter] = useState('Vše')
  const [searchQuery, setSearchQuery] = useState('')
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)

  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
    setTempImageUrl(null) // Reset temporary image when changing monster
  }, [formData.id])

  useEffect(() => {
    if (selectedId) {
      const m = monsters.find(m => m.id === selectedId)
      if (m) setFormData({ ...m })
    }
  }, [selectedId, monsters])

  const handleSaveToState = async () => {
    // 1. Update state for immediate UI feedback
    setMonsters(prev => {
      const exists = prev.find(m => m.id === formData.id)
      if (exists) {
        return prev.map(m => m.id === formData.id ? { ...formData } : m)
      }
      return [...prev, { ...formData }]
    })
    setSelectedId(formData.id)

    // 2. Persist to disk via our new dev API
    try {
      const response = await fetch('/api/save-monster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          monster: formData
        })
      });

      if (response.ok) {
        alert('Změny byly úspěšně uloženy do souborů projektu!');
      } else {
        const errText = await response.text();
        alert('Chyba při ukládání do souboru: ' + errText);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Nepovedlo se spojit s ukládacím serverem. Změny jsou pouze v paměti editoru.');
    }
  }

  const handleAddNew = () => {
    const maxId = monsters.reduce((max, m) => {
      const idNum = parseInt(m.id);
      return isNaN(idNum) ? max : Math.max(max, idNum);
    }, 0);
    const nextId = (maxId + 1).toString().padStart(3, '0');
    
    setSelectedId(null);
    setFormData({ 
      id: nextId, 
      name: 'Nová příšerka', 
      description: '', 
      type: 'Přírodní', 
      rarity: 'Běžná', 
      stats: { hp: 50, attack: 50, defense: 50 }, 
      abilities: [
        { name: '', description: '' }, 
        { name: '', description: '' }
      ] 
    });
  };

  const handleStatChange = (stat: string, val: number) => {
    setFormData((prev: any) => ({
      ...prev,
      stats: { ...prev.stats, [stat]: val }
    }))
  }

  const handleAbilityChange = (idx: number, field: string, val: string) => {
    const newAbilities = [...formData.abilities]
    newAbilities[idx] = { ...newAbilities[idx], [field]: val }
    setFormData((prev: any) => ({ ...prev, abilities: newAbilities }))
  }

  const downloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `${formData.id || 'new'}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && formData.id) {
      // 1. Show immediate preview
      const url = URL.createObjectURL(file)
      setTempImageUrl(url)
      setImgError(false)

      // 2. Persist to disk
      try {
        const response = await fetch(`/api/save-monster-image?id=${formData.id}`, {
          method: 'POST',
          body: file
        });

        if (response.ok) {
          alert('Obrázek byl úspěšně uložen do složky public/monsters!');
          // Refresh the preview URL to the newly saved file after a short delay
          // so we don't rely only on the blob URL
          setTimeout(() => setTempImageUrl(`/monsters/${formData.id}.png?v=${Date.now()}`), 500);
        } else {
          alert('Chyba při ukládání obrázku na server.');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        alert('Nepovedlo se spojit s ukládacím serverem pro obrázky.');
      }
    }
  }

  const openJsonEditor = () => {
    setJsonInput(JSON.stringify(formData, null, 2));
    setIsJsonModalOpen(true);
  };

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setFormData(parsed);
      setIsJsonModalOpen(false);
    } catch (e) {
      alert('Neplatný formát JSON!');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(formData, null, 2))
    alert('JSON zkopírován do schránky!')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <ShieldAlert className="text-red-500" size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">SECURE ZONE</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Zadej přístupový kód pro editor</p>
          </div>
          <input 
            type="password" 
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-white font-black tracking-[0.5em] focus:border-primary/50 transition-colors"
            placeholder="••••"
          />
          <button 
            onClick={() => passInput === 'bmxbmx' ? setIsAuthenticated(true) : alert('Nesprávný kód')}
            className="w-full py-4 bg-primary text-slate-950 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            Autorizovat
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row overflow-hidden font-display">
      {/* Sidebar - Seznam (Rozšířeno) */}
      <aside className="w-full md:w-96 border-r border-white/10 bg-slate-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-sm uppercase tracking-widest text-primary">Katalog</h2>
            <button 
              onClick={handleAddNew}
              className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-all text-primary"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <div className="space-y-3">
            <input 
              type="text"
              placeholder="Hledat název..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white focus:border-primary/50 outline-none"
            />
            
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {['Vše', ...MONSTER_RARITIES].map(r => {
                const isActive = sidebarFilter === r
                const themes: Record<string, { active: string, inactive: string }> = {
                  'Vše': { active: 'bg-primary border-primary text-slate-950 shadow-primary/30', inactive: 'border-white/5 text-slate-500 hover:border-primary/30' },
                  'Běžná': { active: 'bg-slate-500 border-slate-400 text-white shadow-slate-500/30', inactive: 'border-white/5 text-slate-500 hover:border-slate-400/30' },
                  'Vzácná': { active: 'bg-purple-500 border-purple-400 text-white shadow-purple-500/30', inactive: 'border-white/5 text-purple-400/40 hover:border-purple-400/60' },
                  'Epická': { active: 'bg-orange-500 border-orange-400 text-white shadow-orange-500/30', inactive: 'border-white/5 text-orange-400/40 hover:border-orange-400/60' },
                  'Legendární': { active: 'bg-amber-500 border-amber-400 text-white shadow-amber-500/30', inactive: 'border-white/5 text-amber-400/40 hover:border-amber-400/60' }
                }
                
                return (
                  <button
                    key={r}
                    onClick={() => setSidebarFilter(r)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap transition-all border",
                      isActive 
                        ? themes[r].active + " shadow-[0_0_10px]" 
                        : themes[r].inactive + " bg-white/5"
                    )}
                  >
                    {r}
                  </button>
                )
              })}
            </div>

            {/* Element Filter Row */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {['Vše', ...MONSTER_TYPES].map(type => {
                const isActive = elementFilter === type
                const Icon = TYPE_ICONS[type]
                const colors = TYPE_COLORS[type] || TYPE_COLORS.Default
                
                return (
                  <button
                    key={type}
                    onClick={() => setElementFilter(type)}
                    className={cn(
                      "p-1.5 rounded-md transition-all border flex items-center gap-1.5",
                      isActive 
                        ? cn(colors.bg, colors.border, colors.text, "shadow-[0_0_8px_rgba(0,0,0,0.2)]")
                        : "bg-white/5 border-white/5 text-slate-600 hover:border-white/20"
                    )}
                    title={type}
                  >
                    {Icon ? <Icon size={12} /> : <span className="text-[9px] font-black px-1">ALL</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 gap-2 content-start">
          {monsters
            .filter(m => sidebarFilter === 'Vše' || m.rarity === sidebarFilter)
            .filter(m => elementFilter === 'Vše' || m.type === elementFilter)
            .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={cn(
                "relative aspect-square rounded-2xl transition-all group overflow-hidden border flex flex-col items-center justify-between p-3",
                selectedId === m.id 
                  ? "bg-primary border-primary shadow-[0_0_15px_rgba(13,185,242,0.4)]" 
                  : "bg-black/60 border-white/5 hover:border-white/20 hover:bg-black/80"
              )}
            >
              {/* Element Icon Badge (Top Right) */}
              <div className={cn(
                "absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 z-10",
                selectedId === m.id ? "text-slate-950" : (TYPE_COLORS[m.type]?.text || 'text-white')
              )}>
                {TYPE_ICONS[m.type] && (() => {
                  const Icon = TYPE_ICONS[m.type];
                  return <Icon size={12} />;
                })()}
              </div>

              {/* ID Badge (Center Top) */}
              <div className={cn(
                "absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-black px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 z-20",
                selectedId === m.id ? "bg-black/20 text-slate-900" : "bg-black/40 text-slate-500"
              )}>
                #{m.id}
              </div>

              {/* Monster Image */}
              <div className="flex-1 flex items-center justify-center w-full">
                <img 
                  src={(selectedId === m.id && tempImageUrl) ? tempImageUrl : `/monsters/${m.id}.png`} 
                  alt=""
                  className="w-full h-full object-contain filter drop-shadow-lg"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>

              {/* Name Overlay */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 p-1.5 text-center bg-gradient-to-t via-black/40 to-transparent",
                selectedId === m.id ? "from-black/60" : "from-black/80"
              )}>
                <div className={cn(
                  "text-[8px] font-black truncate tracking-tight uppercase",
                  selectedId === m.id ? "text-slate-950" : (RARITY_COLORS[m.rarity] || 'text-white')
                )}>
                  {m.name}
                </div>
              </div>
            </button>
          ))}
          {monsters.filter(m => sidebarFilter === 'Vše' || m.rarity === sidebarFilter).filter(m => elementFilter === 'Vše' || m.type === elementFilter).filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <div className="col-span-3 py-10 text-center">
              <p className="text-[9px] text-slate-600 uppercase font-black">Žádné výsledky</p>
            </div>
          )}
        </div>
        <button 
          onClick={onBack}
          className="p-4 border-t border-white/5 flex items-center gap-2 text-slate-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest"
        >
          <ArrowLeft size={14} /> Zpět do aplikace
        </button>
      </aside>

      {/* Hlavní editor */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Editor Příšerek</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Administrace katalogu exemplářů</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleSaveToState} className="flex items-center gap-2 px-5 py-3 bg-emerald-600 border border-emerald-500/30 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-500/10">
              <Save size={16} /> Uložit změny
            </button>
            <button onClick={openJsonEditor} className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
              <Plus size={16} className="rotate-45" /> RAW JSON
            </button>
            <button onClick={copyToClipboard} className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
              <Copy size={16} /> Kopírovat
            </button>
            <button onClick={downloadJson} className="flex items-center gap-2 px-5 py-3 bg-primary text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20">
              <Download size={16} /> Stáhnout JSON
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* Formulář */}
          <div className="space-y-8 bg-slate-900/50 p-8 rounded-3xl border border-white/5">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">ID (např. 015)</label>
                <input 
                  value={formData.id} 
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Název příšerky</label>
                <input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Popis (Lore)</label>
              <textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-6 relative">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase">Typ elementu</label>
                <div className="relative">
                  <button 
                    onClick={() => setIsTypeSelectOpen(!isTypeSelectOpen)}
                    className={cn(
                      "w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none font-bold flex items-center gap-3 text-left transition-all",
                      TYPE_COLORS[formData.type]?.text || 'text-white'
                    )}
                  >
                    {(() => {
                      const Icon = TYPE_ICONS[formData.type];
                      return Icon ? <Icon size={16} /> : null;
                    })()}
                    <span className="flex-1">{formData.type}</span>
                    <div className={cn("size-1.5 rounded-full bg-current transition-transform duration-300", isTypeSelectOpen ? "rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                    {isTypeSelectOpen && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setIsTypeSelectOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[101] p-1"
                        >
                          {MONSTER_TYPES.map(t => {
                            const Icon = TYPE_ICONS[t];
                            const colors = TYPE_COLORS[t];
                            return (
                              <button
                                key={t}
                                onClick={() => {
                                  setFormData({...formData, type: t});
                                  setIsTypeSelectOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold hover:bg-white/10",
                                  colors.text,
                                  formData.type === t ? "bg-white/5" : ""
                                )}
                              >
                                {Icon && <Icon size={16} />}
                                {t}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase">Vzácnost</label>
                <div className="relative">
                  <button 
                    onClick={() => setIsRaritySelectOpen(!isRaritySelectOpen)}
                    className={cn(
                      "w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none font-bold flex items-center justify-between transition-all",
                      RARITY_COLORS[formData.rarity] || 'text-white'
                    )}
                  >
                    <span>{formData.rarity}</span>
                    <div className={cn("size-1.5 rounded-full bg-current transition-transform duration-300", isRaritySelectOpen ? "rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                    {isRaritySelectOpen && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setIsRaritySelectOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[101] p-1"
                        >
                          {MONSTER_RARITIES.map(r => (
                            <button
                              key={r}
                              onClick={() => {
                                setFormData({...formData, rarity: r});
                                setIsRaritySelectOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-bold hover:bg-white/10",
                                RARITY_COLORS[r],
                                formData.rarity === r ? "bg-white/5" : ""
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[3px] border-b border-white/10 pb-2">Atributy</h3>
              {Object.entries(formData.stats).map(([key, val]: any) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>{key}</span>
                    <span className="text-white">{val}</span>
                  </div>
                  <input 
                    type="range" min="10" max="250" 
                    value={val} 
                    onChange={(e) => handleStatChange(key, parseInt(e.target.value))}
                    className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[3px] border-b border-white/10 pb-2">Schopnosti</h3>
              {formData.abilities.map((ab: any, idx: number) => (
                <div key={idx} className="space-y-3 p-4 bg-black/40 rounded-2xl border border-white/5">
                  <input 
                    placeholder="Název schopnosti"
                    value={ab.name} 
                    onChange={(e) => handleAbilityChange(idx, 'name', e.target.value)}
                    className="w-full bg-transparent border-b border-white/10 py-1 text-sm font-bold text-white focus:border-primary outline-none"
                  />
                  <textarea 
                    placeholder="Popis schopnosti..."
                    value={ab.description} 
                    onChange={(e) => handleAbilityChange(idx, 'description', e.target.value)}
                    rows={2}
                    className="w-full bg-transparent text-xs text-slate-400 focus:text-slate-200 outline-none resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview a Instrukce */}
          <div className="space-y-10">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Náhled karty</h3>
              
              {/* Zjednodušený náhled karty (Zvětšeno 1.5x) */}
              <div className="w-full max-w-[420px] mx-auto aspect-[4/5] rounded-[2.5rem] border-8 border-white/10 overflow-hidden relative shadow-2xl bg-black group transition-all duration-500">
                <div className={cn("absolute inset-0 opacity-40 transition-opacity", (TYPE_COLORS[formData.type] || TYPE_COLORS.Default).bg)} />
                <div className="relative h-full flex flex-col p-8">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-black text-slate-500 tracking-wider">#{formData.id}</span>
                    <span className={cn("text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border-2", (TYPE_COLORS[formData.type] || TYPE_COLORS.Default).text, (TYPE_COLORS[formData.type] || TYPE_COLORS.Default).border)}>
                      {formData.type}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center -mt-8">
                    <div 
                      className="size-80 flex items-center justify-center p-2 relative group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                       {(!imgError || tempImageUrl) ? (
                         <img 
                            src={tempImageUrl || `/monsters/${formData.id}.png`} 
                            onError={() => !tempImageUrl && setImgError(true)}
                            className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] filter contrast-125 saturate-110" 
                         />
                       ) : (
                         <div className="size-56 bg-white/5 rounded-full border-2 border-white/10 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
                            <Plus size={32} className="text-slate-700 mb-3" />
                            <span className="text-xs text-slate-600 font-bold uppercase leading-relaxed">Klikni pro nahrání obrázku</span>
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <h4 className="text-3xl font-black text-white italic tracking-tighter leading-tight">{formData.name}</h4>
                    <p className="text-xs text-primary font-black uppercase tracking-widest">{formData.rarity}</p>
                    <div className="flex gap-3 pt-3">
                      <div className="bg-red-500/10 border-2 border-red-500/20 px-3 py-0.5 rounded-full overflow-hidden">
                        <span className="text-xs font-black text-red-500 uppercase tracking-tighter">HP {formData.stats.hp}</span>
                      </div>
                      <div className="bg-orange-500/10 border-2 border-orange-500/20 px-3 py-0.5 rounded-full overflow-hidden">
                        <span className="text-xs font-black text-orange-500 uppercase tracking-tighter">ATK {formData.stats.attack}</span>
                      </div>
                      <div className="bg-blue-500/10 border-2 border-blue-500/20 px-3 py-0.5 rounded-full overflow-hidden">
                        <span className="text-xs font-black text-blue-500 uppercase tracking-tighter">DEF {formData.stats.defense}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-4">
              <h3 className="font-black text-primary uppercase tracking-widest text-sm">Práce s obrázkem</h3>
              <input 
                type="file" 
                id="image-upload" 
                accept="image/png" 
                className="hidden" 
                onChange={handleImageUpload}
              />
              <button 
                onClick={() => document.getElementById('image-upload')?.click()}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mb-4"
              >
                Nahrát testovací PNG
              </button>
              
              <h3 className="font-black text-primary uppercase tracking-widest text-sm">Jak přidat příšerku do hry?</h3>
              <ol className="text-xs text-slate-400 space-y-4 list-decimal ml-4">
                <li className="pl-2"><span className="text-white font-bold">Stáhni JSON:</span> Klikni na tlačítko výše a ulož soubor.</li>
                <li className="pl-2"><span className="text-white font-bold">Ulož do projektu:</span> Soubor přesuň do složky <code className="bg-black/50 px-1.5 py-0.5 rounded text-blue-400">src/data/monsters/{formData.id}.json</code>.</li>
                <li className="pl-2"><span className="text-white font-bold">Zaregistruj v DB:</span> Otevři soubor <code className="bg-black/50 px-1.5 py-0.5 rounded text-blue-400">src/data/monsters.ts</code>, importuj nový JSON a přidej ho do pole <code className="text-green-400">monsterDB</code>.</li>
                <li className="pl-2"><span className="text-white font-bold">Přidej obrázek:</span> Nahraj PNG obrázek (256x256+) do složky <code className="bg-black/50 px-1.5 py-0.5 rounded text-blue-400">public/monsters/{formData.id}.png</code>.</li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* JSON Editor Modal */}
      <AnimatePresence>
        {isJsonModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                    <Copy size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">RAW JSON Editor</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Přímá editace datové struktury</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsJsonModalOpen(false)}
                  className="size-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                >
                  <Plus size={24} className="rotate-45 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 p-6 relative bg-black/40">
                <textarea 
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full h-full min-h-[400px] bg-transparent text-emerald-400 font-mono text-xs leading-relaxed outline-none resize-none border-none p-4 custom-scrollbar"
                  spellCheck={false}
                />
              </div>

              <div className="p-6 border-t border-white/5 bg-slate-900/50 flex gap-3 justify-end">
                <button 
                  onClick={() => setIsJsonModalOpen(false)}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                >
                  Zrušit
                </button>
                <button 
                  onClick={applyJsonChanges}
                  className="px-8 py-3 bg-primary text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10"
                >
                  Použít změny
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
