import React, { useState, useEffect } from 'react'
import { 
  Save, Plus, Trash2, Download, Copy, ArrowLeft, ShieldAlert, 
  Flame, Droplets, Leaf, Zap, Beaker, Gem, 
  Package, Dice5, ChevronRight, X, Settings2, Palette, Upload,
  Sword, Shield, Heart, Sparkles, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { monsterDB } from '../../data/monsters'
import { recipes as initialRecipes } from '../../data/recipes'
import { GEM_BONUSES as initialGems } from '../../data/gems'
import { LOOT_CONFIG as initialLoot } from '../../data/loot'
import { RESOURCE_CONFIG as initialResources } from '../../data/resources'
import { cn } from '../../utils'
import { TYPE_COLORS } from '../../utils'

// Tabs
import { MonsterEditorTab } from './tabs/MonsterEditorTab'
import { RecipeEditorTab } from './tabs/RecipeEditorTab'
import { ResourceDesignTab } from './tabs/ResourceDesignTab'
import { GemEditorTab } from './tabs/GemEditorTab'
import { LootEditorTab } from './tabs/LootEditorTab'

// --- Constants ---
const MONSTER_TYPES = ['Ohnivá', 'Vodní', 'Přírodní', 'Elektrická']
const MONSTER_RARITIES = ['Běžná', 'Vzácná', 'Epická', 'Legendární']

const TYPE_ICONS: Record<string, any> = {
  'Ohnivá': Flame,
  'Vodní': Droplets,
  'Přírodní': Leaf,
  'Elektrická': Zap
}

function Snowflake(props: any) {
  return <Droplets {...props} className={cn(props.className, "rotate-180")} />
}

const TYPE_EMOJIS: Record<string, string> = {
  'Ohnivá': '🔥', 'Vodní': '💧', 'Přírodní': '🌿', 'Elektrická': '⚡'
}

const RARITY_COLORS: Record<string, string> = {
  'Běžná': 'text-slate-400', 'Vzácná': 'text-purple-400', 'Epická': 'text-orange-400', 'Legendární': 'text-amber-400'
}

const RARITY_EMOJIS: Record<string, string> = {
  'Běžná': '⚪', 'Vzácná': '🟣', 'Epická': '🟠', 'Legendární': '✨'
}

const ABILITY_TYPES = [
  { id: 'attack', label: '⚔️ Útočná speciální', defaultChance: 30, defaultVal: 1.5, desc: 'Dmg 1.5x - 2x' },
  { id: 'defense', label: '🛡️ Obrana', defaultChance: 15, defaultVal: 0.25, desc: 'Snížení dmg 20-30%' },
  { id: 'buff', label: '✨ Buff', defaultChance: 15, defaultVal: 0.2, desc: '+20% Atk/Speed' },
  { id: 'heal', label: '❤️ Heal / Regen', defaultChance: 20, defaultVal: 0.15, desc: '+10-20% HP' },
  { id: 'extra', label: '⚡ Extra útok (%)', defaultChance: 20, defaultVal: 0.2, desc: '+X% DMG k základu' },
]

type EditorTab = 'monsters' | 'recipes' | 'gems' | 'loot' | 'resources';

interface SystemEditorProps {
  onBack: () => void;
}

export const SystemEditor: React.FC<SystemEditorProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passInput, setPassInput] = useState('')
  const [activeTab, setActiveTab] = useState<EditorTab>('monsters')
  
  // Data States
  const [monsters, setMonsters] = useState(monsterDB)
  const [recipes, setRecipes] = useState(initialRecipes)
  const [gemBonuses, setGemBonuses] = useState(initialGems)
  const [lootConfig, setLootConfig] = useState(initialLoot)
  const [resourceConfig, setResourceConfig] = useState(initialResources)
  
  // Selection & UI States
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null)
  const [monsterForm, setMonsterForm] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarFilter, setSidebarFilter] = useState('Vše')
  const [elementFilter, setElementFilter] = useState('Vše')
  
  // Preview States
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false)
  const [jsonInput, setJsonInput] = useState('')

  // Sync monsters list with DB (mock) or local update
  useEffect(() => {
    if (selectedMonsterId) {
      const m = monsters.find(m => m.id === selectedMonsterId)
      if (m) {
        setMonsterForm(JSON.parse(JSON.stringify(m)))
        setTempImageUrl(null)
        setImgError(false)
      }
    } else {
      setMonsterForm(null)
    }
  }, [selectedMonsterId, monsters])

  const handleAddNewMonster = () => {
     const newId = (Math.max(...monsters.map(m => parseInt(m.id))) + 1).toString().padStart(3, '0');
     const newMonster = {
       id: newId,
       name: 'Nová příšerka',
       description: 'Popis...',
       type: 'Ohnivá',
       rarity: 'Běžná',
       stats: { hp: 100, attack: 50, defense: 40, speed: 50 },
       abilities: []
     };
     setMonsters([...monsters, newMonster]);
     setSelectedMonsterId(newId);
  }

  const handleSaveMonster = async () => {
    if (!monsterForm) return;

    // Save image if changed
    if (tempImageUrl && !imgError) {
      try {
        const fileInput = document.getElementById('image-upload-hidden') as HTMLInputElement;
        const file = fileInput?.files?.[0];
        if (file) {
          await fetch(`/api/save-monster-image?id=${monsterForm.id}`, {
            method: 'POST',
            body: file
          });
        }
      } catch (err) {
        console.error('Monster image upload failed:', err);
      }
    }

    const newMonsters = monsters.map(m => m.id === monsterForm.id ? monsterForm : m);
    setMonsters(newMonsters);
    
    if (window.location.hostname === 'localhost') {
      try {
        const res = await fetch('/api/save-monster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: monsterForm.id, monster: monsterForm })
        });
        if (res.ok) {
          alert('Monstrum uloženo přímo do souboru.');
          return;
        }
      } catch (e) {
        console.error('API save failed:', e);
      }
    }
    
    downloadJson(newMonsters, 'monsters.ts', 'monsterDB');
  }

  const handleSaveConfig = async (tab: EditorTab, data: any) => {
    if (window.location.hostname === 'localhost') {
      try {
        const res = await fetch('/api/save-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: tab, data })
        });
        if (res.ok) {
          alert(`Konfigurace ${tab} uložena přímo do souboru.`);
          return;
        }
      } catch (e) {
        console.error('API save failed:', e);
      }
    }
    
    downloadJson(data, `${tab}.ts`, tab === 'recipes' ? 'recipes' : tab === 'gems' ? 'gemBonuses' : tab === 'resources' ? 'resourceConfig' : 'lootPools');
  }

  const downloadJson = (data: any, filename: string, varName: string) => {
    const content = `export const ${varName} = ${JSON.stringify(data, null, 2)};`;
    const dataStr = "data:text/typescript;charset=utf-8," + encodeURIComponent(content);
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", filename);
    anchor.click();
    alert(`Konfigurace ${filename} připravena k uložení. Nahraďte obsah v src/data/${filename}`);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && monsterForm) {
      const reader = new FileReader();
      reader.onloadend = () => { setTempImageUrl(reader.result as string); setImgError(false); };
      reader.readAsDataURL(file);
    }
  }

  const handleResourceImageUpload = async (id: string, file: File) => {
    try {
      const res = await fetch(`/api/save-resource-image?id=${id}`, { 
        method: 'POST', 
        body: file 
      });
      if (res.ok) {
        const newConfig = { ...resourceConfig, [id]: { ...resourceConfig[id], hasCustomIcon: true } };
        setResourceConfig(newConfig);
        await handleSaveConfig('resources', newConfig);
        alert('Ikonka nahrána a konfigurace aktualizována!');
      } else {
        throw new Error('Upload server error');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Chyba při nahrávání ikonky. Ujistěte se, že běží dev server.');
    }
  }

  const openJsonEditor = () => {
    const data = activeTab === 'monsters' ? (selectedMonsterId ? monsterForm : monsters) : activeTab === 'recipes' ? recipes : activeTab === 'gems' ? gemBonuses : activeTab === 'resources' ? resourceConfig : lootConfig;
    setJsonInput(JSON.stringify(data, null, 2));
    setIsJsonModalOpen(true);
  }

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (activeTab === 'monsters') {
        if (selectedMonsterId) {
          setMonsterForm(parsed);
          setMonsters(monsters.map(m => m.id === selectedMonsterId ? parsed : m));
        } else {
          setMonsters(parsed);
        }
      } else if (activeTab === 'recipes') setRecipes(parsed);
      else if (activeTab === 'gems') setGemBonuses(parsed);
      else if (activeTab === 'resources') setResourceConfig(parsed);
      else if (activeTab === 'loot') setLootConfig(parsed);
      setIsJsonModalOpen(false);
    } catch (e) {
      alert('Neplatný formát JSON!');
    }
  }

  if (!isAuthenticated && window.location.hostname !== 'localhost') {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20"><ShieldAlert className="text-red-500" size={32} /></div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">SECURE ZONE</h1>
          <input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-white font-black tracking-[0.5em] focus:border-primary/50" placeholder="••••" />
          <button onClick={() => passInput === 'bmxbmx' ? setIsAuthenticated(true) : alert('Nesprávný kód')} className="w-full py-4 bg-primary text-slate-950 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all">Autorizovat</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row overflow-hidden font-display">
      
      {/* Sidebar */}
      <aside className="w-full md:w-[420px] border-r border-white/10 bg-slate-900 flex flex-col shrink-0">
        
        {/* TAB SWITCHER */}
        <div className="p-4 border-b border-white/5 grid grid-cols-5 gap-2">
           {[
             { id: 'monsters', icon: Settings2, label: 'Monstra' },
             { id: 'recipes', icon: Beaker, label: 'Recepty' },
             { id: 'resources', icon: Palette, label: 'Ikonky' },
             { id: 'gems', icon: Gem, label: 'Gemy' },
             { id: 'loot', icon: Dice5, label: 'Loot' }
           ].map(t => (
             <button key={t.id} onClick={() => { setActiveTab(t.id as EditorTab); setSelectedMonsterId(null); }} className={cn("flex flex-col items-center gap-1 p-2 rounded-xl border transition-all", activeTab === t.id ? "bg-primary/20 border-primary text-primary" : "bg-black/40 border-white/5 text-slate-500 hover:text-slate-300")}>
               <t.icon size={16} />
               <span className="text-[8px] font-black uppercase tracking-widest leading-tight">{t.label}</span>
             </button>
           ))}
        </div>

        {activeTab === 'monsters' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                 <h2 className="font-black text-sm uppercase tracking-widest text-primary">Katalog</h2>
                <button onClick={handleAddNewMonster} className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary transition-all"><Plus size={18} /></button>
              </div>
              <div className="space-y-3">
                 <input type="text" placeholder="Hledat název..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-primary/50 outline-none" />
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                  {['Vše', ...MONSTER_RARITIES].map(r => {
                    const colorClass = r === 'Vše' ? (sidebarFilter === 'Vše' ? 'bg-primary border-primary text-slate-950 px-3' : 'bg-white/5 border-white/5 text-slate-500') : (sidebarFilter === r ? cn(RARITY_COLORS[r], "bg-white/10 border-current shadow-lg shadow-white/5") : "bg-white/5 border-white/5 text-slate-500 opacity-60 hover:opacity-100");
                    return (
                      <button 
                        key={r} 
                        onClick={() => setSidebarFilter(r)} 
                        className={cn("px-2 py-1 rounded-md text-[10px] font-black uppercase whitespace-nowrap border transition-all", colorClass)}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                  {['Vše', ...MONSTER_TYPES].map(type => {
                    const Icon = TYPE_ICONS[type];
                    const colors = TYPE_COLORS[type] || TYPE_COLORS.Default;
                    return (
                      <button key={type} onClick={() => setElementFilter(type)} className={cn("p-1.5 rounded-md border transition-all", elementFilter === type ? cn(colors.bg, colors.border, colors.text) : "bg-white/5 border-white/5 text-slate-600")}>
                        {Icon ? <Icon size={12} /> : <span className="text-[10px] font-black px-1">ALL</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 gap-2 content-start">
               {monsters
                .filter(m => sidebarFilter === 'Vše' || m.rarity === sidebarFilter)
                .filter(m => elementFilter === 'Vše' || m.type === elementFilter)
                .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(m => (
                  <button key={m.id} onClick={() => setSelectedMonsterId(m.id)} className={cn("relative aspect-square rounded-2xl transition-all border flex flex-col items-center justify-between p-2 overflow-hidden", selectedMonsterId === m.id ? "bg-primary border-primary shadow-[0_0_15px_rgba(13,185,242,0.4)]" : "bg-black/60 border-white/5 hover:border-white/20")}>
                    <div className={cn("absolute top-1 right-1 p-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 z-10", selectedMonsterId === m.id ? "text-slate-950" : (TYPE_COLORS[m.type]?.text || 'text-white'))}>
                      {TYPE_ICONS[m.type] && (() => { const Icon = TYPE_ICONS[m.type]; return <Icon size={8} />; })()}
                    </div>
                    <div className="flex-1 flex items-center justify-center w-full">
                       <img src={`/monsters/${m.id}.png`} className="w-full h-full object-contain filter drop-shadow-md" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                     <div className="absolute bottom-0 left-0 right-0 p-0.5 bg-black/80"><div className={cn("text-[8px] font-black truncate uppercase text-center", selectedMonsterId === m.id ? "text-primary" : (RARITY_COLORS[m.rarity] || 'text-white'))}>{m.name}</div></div>
                  </button>
                ))
               }
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 opacity-50 grayscale">
             <div className="size-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center"><Settings2 size={32} /></div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] leading-relaxed">Konfigurace<br/>globálních parametrů</p>
          </div>
        )}

        <button onClick={onBack} className="p-4 border-t border-white/5 flex items-center gap-2 text-slate-500 hover:text-white transition-colors uppercase text-[11px] font-black tracking-widest shrink-0"><ArrowLeft size={14} /> Zpět</button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
          
          {/* TOP BAR ACTIONS */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
             <div>
                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                   {activeTab === 'monsters' ? 'Editor Příšer' : activeTab === 'recipes' ? 'Laboratoř Receptů' : activeTab === 'gems' ? 'Správce Drahokamů' : activeTab === 'resources' ? 'Resource Design' : 'Loot Tabulky'}
                </h1>
                 <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[11px]">Administrace herních datových struktur</p>
             </div>
             <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => activeTab === 'monsters' ? handleSaveMonster() : handleSaveConfig(activeTab, activeTab === 'recipes' ? recipes : activeTab === 'gems' ? gemBonuses : activeTab === 'resources' ? resourceConfig : lootConfig)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 border border-emerald-500/30 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:bg-emerald-500 shadow-xl shadow-emerald-500/10"
                >
                   <Save size={16} /> Uložit Změny
                </button>
                <button onClick={openJsonEditor} className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                  <Copy size={16} /> RAW JSON
                </button>
                <button onClick={() => {
                  const data = activeTab === 'monsters' ? (selectedMonsterId ? monsterForm : monsters) : activeTab === 'recipes' ? recipes : activeTab === 'gems' ? gemBonuses : activeTab === 'resources' ? resourceConfig : lootConfig;
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
                  const anchor = document.createElement('a'); anchor.setAttribute("href", dataStr); anchor.setAttribute("download", `${activeTab}.json`); anchor.click();
                }} className="flex items-center gap-2 px-5 py-3 bg-primary text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
                  <Download size={16} /> Export
                </button>
             </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'monsters' && monsterForm && (
              <MonsterEditorTab 
                monsterForm={monsterForm} setMonsterForm={setMonsterForm} 
                MONSTER_TYPES={MONSTER_TYPES} MONSTER_RARITIES={MONSTER_RARITIES} 
                TYPE_COLORS={TYPE_COLORS} TYPE_EMOJIS={TYPE_EMOJIS}
                RARITY_EMOJIS={RARITY_EMOJIS} RARITY_COLORS={RARITY_COLORS}
                ABILITY_TYPES={ABILITY_TYPES}
                handleImageUpload={handleImageUpload} tempImageUrl={tempImageUrl} 
                imgError={imgError} setImgError={setImgError}
              />
            )}
            {activeTab === 'recipes' && (
              <RecipeEditorTab recipes={recipes} setRecipes={setRecipes} resourceConfig={resourceConfig} />
            )}
            {activeTab === 'gems' && (
              <GemEditorTab gemBonuses={gemBonuses} setGemBonuses={setGemBonuses} resourceConfig={resourceConfig} />
            )}
            {activeTab === 'resources' && (
              <ResourceDesignTab resourceConfig={resourceConfig} setResourceConfig={setResourceConfig} handleResourceImageUpload={handleResourceImageUpload} />
            )}
            {activeTab === 'loot' && (
              <LootEditorTab lootConfig={lootConfig} setLootConfig={setLootConfig} resourceConfig={resourceConfig} />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* JSON Editor Modal */}
      <AnimatePresence>
        {isJsonModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                 <h3 className="text-lg font-black text-white uppercase tracking-tight italic">RAW JSON EDITOR</h3>
                 <button onClick={() => setIsJsonModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex-1 p-6 bg-black/40"><textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="w-full h-full min-h-[400px] bg-transparent text-emerald-400 font-mono text-xs outline-none resize-none p-4 custom-scrollbar" spellCheck={false} /></div>
              <div className="p-6 border-t border-white/5 bg-slate-900/50 flex gap-3 justify-end"><button onClick={() => setIsJsonModalOpen(false)} className="px-6 py-3 text-xs font-black uppercase text-slate-500">Zrušit</button><button onClick={applyJsonChanges} className="px-8 py-3 bg-primary text-slate-950 rounded-xl text-xs font-black uppercase shadow-lg shadow-primary/10">Použít změny</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
