import React, { useState, useEffect } from 'react'
import {
  Save, Plus, Trash2, Download, Copy, ArrowLeft, ShieldAlert,
  Beaker, Gem, Droplets,
  Package, Dice5, ChevronRight, X, Settings2, Palette, Upload,
  Sword, Shield, Heart, Sparkles, Info, Check, Users
} from 'lucide-react'

import { motion, AnimatePresence } from 'framer-motion'
import { monsterDB } from '../../data/monsters'
import { RESOURCE_CONFIG as initialResources } from '../../data/resources'
import { cn, TYPE_COLORS, TYPE_ICONS } from '../../utils'
import { SYSTEM_SETTINGS } from '../../data/settings'
import { db } from '../../lib/firebase'
import { ref, onValue } from 'firebase/database'

// Tabs
import { MonsterEditorTab } from './tabs/MonsterEditorTab'
import { ResourceDesignTab } from './tabs/ResourceDesignTab'
import { UserManagementTab } from './tabs/UserManagementTab'

// --- Constants ---
const MONSTER_TYPES = ['Ohnivá', 'Vodní', 'Přírodní', 'Elektrická']
const MONSTER_RARITIES = ['Běžná', 'Vzácná', 'Epická', 'Legendární']



function Snowflake(props: any) {
  return <Droplets {...props} className={cn(props.className, "rotate-180")} />
}

const TYPE_EMOJIS: Record<string, string> = {
  'Ohnivá': '🔥', 'Vodní': '💧', 'Přírodní': '🌿', 'Elektrická': '⚡'
}

const RARITY_COLORS: Record<string, string> = {
  'Běžná': 'text-slate-400', 'Vzácná': 'text-blue-400', 'Epická': 'text-purple-400', 'Legendární': 'text-amber-400'
}

const RARITY_EMOJIS: Record<string, string> = {
  'Běžná': '⚪', 'Vzácná': '🔵', 'Epická': '🟣', 'Legendární': '✨'
}

const ABILITY_TYPES = [
  { id: 'attack', label: '⚔️ Útočná speciální', defaultChance: 65, defaultVal: 155, desc: 'Dmg 155%' },
  { id: 'defense', label: '🛡️ Obrana', defaultChance: 65, defaultVal: 60, desc: 'Snížení dmg 60%' },
  { id: 'heal', label: '❤️ Léčení (Instantní)', defaultChance: 65, defaultVal: 15, desc: '+15% HP hned' },
  { id: 'regen', label: '🌿 Regenerace (2 kola)', defaultChance: 65, defaultVal: 10, desc: '+10% HP / kolo' },
  { id: 'curse', label: '💀 Kletba (2 kola)', defaultChance: 50, defaultVal: 20, desc: '20% Atk DMG / kolo' },
  { id: 'extra', label: '⚡ Extra útok (%)', defaultChance: 50, defaultVal: 40, desc: '+40% DMG k základu' },
]

type EditorTab = 'monsters' | 'resources' | 'users' | 'settings';


interface SystemEditorProps {
  onBack: () => void;
}

// Helper pro barevný časový štítek
const renderTimeBadge = (timestamp: number) => {
  if (!timestamp) return <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[7px] font-black uppercase">Nikdy</span>;
  
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  let label = '';
  let colorClass = '';

  if (mins < 1) { label = 'ONLINE'; colorClass = 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'; }
  else if (mins < 60) { label = `-${mins}m`; colorClass = 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'; }
  else if (hours < 24) { label = `-${hours}h`; colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30'; }
  else if (days < 7) { label = `-${days}d`; colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30'; }
  else { label = `-${weeks}t`; colorClass = 'bg-red-500/20 text-red-500 border-red-500/30'; }

  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shadow-sm", colorClass)}>
      {label}
    </span>
  );
};

export const SystemEditor: React.FC<SystemEditorProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passInput, setPassInput] = useState('')
  const [activeTab, setActiveTab] = useState<EditorTab>('monsters')

  // Data States
  const [monsters, setMonsters] = useState(monsterDB)
  const [resourceConfig, setResourceConfig] = useState(initialResources)

  // Selection & UI States
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null)
  const [monsterForm, setMonsterForm] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarFilter, setSidebarFilter] = useState('Vše')
  const [elementFilter, setElementFilter] = useState('Vše')
  
  // Players State
  const [players, setPlayers] = useState<any[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  // Preview States
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false)
  const [jsonInput, setJsonInput] = useState('')

  // Global Note State
  const [globalNote, setGlobalNote] = useState(SYSTEM_SETTINGS.globalNote || '')
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)

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

  // Sync Players
  useEffect(() => {
    const playersRef = ref(db, 'players');
    const usersRef = ref(db, 'users');

    let playersMap: Record<string, any> = {};
    let usersMap: Record<string, any> = {};

    const mergeAndSet = () => {
      const allUids = Array.from(new Set([...Object.keys(playersMap), ...Object.keys(usersMap)]));
      const combined = allUids.map(id => {
        const pData = playersMap[id] || {};
        const uData = usersMap[id] || {};
        
        // Priority: Players node (live) -> Users node (backup) -> Fallbacks
        const finalLevel = pData.level !== undefined ? pData.level : (uData.currentLevel || uData.level || 1);
        const finalName = pData.name || uData.playerName || uData.name || 'Lovec';

        return {
          id,
          name: finalName,
          level: finalLevel,
          monsterCount: pData.monsterCount || uData.caughtMonsters?.length || 0,
          isOnline: !!pData.isOnline,
          lastActive: pData.lastActive || uData.updatedAt || 0,
          lat: pData.lat || uData.lat || 0,
          lng: pData.lng || uData.lng || 0,
          avatarStyle: pData.avatarStyle || uData.avatarStyle || 'bottts',
          avatarSeed: pData.avatarSeed || uData.avatarSeed || id,
          // We can still spread uData/pData but we keep our keys prioritized
          inventory: uData.inventory || [],
          caughtMonsters: uData.caughtMonsters || [],
          email: uData.email || pData.email || (uData.playerName?.includes('@') ? uData.playerName : (pData.name?.includes('@') ? pData.name : null))
        };
      }).sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

      setPlayers(combined);
    };

    const unsubPlayers = onValue(playersRef, (snapshot) => {
      playersMap = snapshot.val() || {};
      mergeAndSet();
    });

    const unsubUsers = onValue(usersRef, (snapshot) => {
      usersMap = snapshot.val() || {};
      mergeAndSet();
    });

    return () => {
      unsubPlayers();
      unsubUsers();
    };
  }, []);

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

    const varName = tab === 'resources' ? 'resourceConfig' : (tab === 'settings' ? 'SYSTEM_SETTINGS' : 'monsterDB');
    downloadJson(data, `${tab}.ts`, varName);
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

  const handleSaveGlobalNote = async () => {
    setIsSavingNote(true)
    try {
      await handleSaveConfig('settings', { globalNote })
    } catch (e) {
      alert('Chyba při ukládání poznámky.')
    } finally {
      setTimeout(() => setIsSavingNote(false), 1000)
    }
  }


  const openJsonEditor = () => {
    const data = activeTab === 'monsters' ? (selectedMonsterId ? monsterForm : monsters) : resourceConfig;
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
      } else if (activeTab === 'resources') setResourceConfig(parsed);
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
      <aside className="w-full md:w-[350px] border-r border-white/10 bg-slate-900 flex flex-col shrink-0">


        {/* TAB SWITCHER */}
        <div className="p-4 border-b border-white/5 grid grid-cols-5 gap-2">
          {[
            { id: 'monsters', icon: Settings2, label: 'Monstra' },
            { id: 'resources', icon: Palette, label: 'Předměty' },
            { id: 'users', icon: Users, label: 'Uživatelé' }
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
        ) : activeTab === 'users' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-sm uppercase tracking-widest text-primary">Seznam Hráčů</h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="text-[8px] font-black text-emerald-500">{players.filter(p => p.isOnline).length} ONLINE</span>
                </div>
              </div>
              <input type="text" placeholder="Hledat hráče..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-primary/50 outline-none" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {players
                .filter(p => 
                  p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.email?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(p => (
                  <button key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={cn("w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left group border", selectedPlayerId === p.id ? "bg-primary/20 border-primary/30" : "hover:bg-white/5 border-transparent")}>
                    <div className="size-8 rounded-lg bg-slate-800 border border-white/10 overflow-hidden shrink-0 relative">
                       <img src={`https://api.dicebear.com/7.x/${p.avatarStyle || 'bottts'}/svg?seed=${p.avatarSeed || p.id}`} className="w-full h-full" />
                       {p.isOnline && (
                         <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black truncate text-white uppercase group-hover:text-primary transition-colors">{p.name || 'Hráč'}</div>
                      <div className="text-[9px] font-medium text-slate-500 truncate group-hover:text-slate-400 transition-colors">
                        {p.email || (p.name?.includes('@') ? p.name : '')}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                         <span className="text-[8px] font-bold truncate opacity-50">ID: {p.id}</span>
                         <div className="flex items-center gap-1.5">
                            {renderTimeBadge(p.lastActive)}
                            <span className="text-[10px] font-black shrink-0 px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20 shadow-sm shadow-primary/5">Lv {p.level}</span>
                         </div>
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 opacity-50 grayscale">
            <div className="size-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center"><Settings2 size={32} /></div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] leading-relaxed">Konfigurace<br />globálních parametrů</p>
          </div>
        )}

        <button onClick={onBack} className="p-4 border-t border-white/5 flex items-center gap-2 text-slate-500 hover:text-white transition-colors uppercase text-[11px] font-black tracking-widest shrink-0"><ArrowLeft size={14} /> Zpět</button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-2 md:p-6">
        <div className="w-full space-y-10 pb-20">



          {/* TOP BAR ACTIONS */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                {activeTab === 'monsters' ? 'Editor Příšer' : (activeTab === 'users' ? 'Správa Uživatelů' : 'Resource Design')}
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[11px]">
                {activeTab === 'users' ? 'Monitoring a správa registrovaných hráčů' : 'Administrace herních datových struktur'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => activeTab === 'monsters' ? handleSaveMonster() : handleSaveConfig(activeTab, resourceConfig)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 border border-emerald-500/30 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:bg-emerald-500 shadow-xl shadow-emerald-500/10"
              >
                <Save size={16} /> Uložit Změny
              </button>
              <button onClick={openJsonEditor} className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                <Copy size={16} /> RAW JSON
              </button>
              <button onClick={() => {
                const data = activeTab === 'monsters' ? (selectedMonsterId ? monsterForm : monsters) : resourceConfig;
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
                const anchor = document.createElement('a'); anchor.setAttribute("href", dataStr); anchor.setAttribute("download", `${activeTab}.json`); anchor.click();
              }} className="flex items-center gap-2 px-5 py-3 bg-primary text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
                <Download size={16} /> Export
              </button>
            </div>
          </div>

          {/* GLOBAL NOTES SECTION - NOW FULL WIDTH BELOW HEADER */}
          <div className="w-full">
            <button
              onClick={() => setIsNoteOpen(!isNoteOpen)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
            >
              <ChevronRight size={14} className={cn("transition-transform", isNoteOpen && "rotate-90")} />
              {isNoteOpen ? 'Skrýt poznámky' : 'Zobrazit globální poznámky'}
            </button>

            <AnimatePresence>
              {isNoteOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl relative group border-t-primary/20">
                    <textarea
                      value={globalNote}
                      onChange={(e) => setGlobalNote(e.target.value)}
                      placeholder="Zde si můžete psát poznámky k balancování, TODO list nebo herní lore..."
                      className="w-full min-h-[320px] bg-transparent text-slate-300 font-mono text-[13px] outline-none resize-y p-2 placeholder:text-slate-600 custom-scrollbar leading-relaxed"
                    />

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600 uppercase italic">
                        <Info size={10} /> Poznámky jsou sdílené v settings.ts
                      </div>
                      <button
                        onClick={handleSaveGlobalNote}
                        disabled={isSavingNote}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                          isSavingNote ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {isSavingNote ? <><Check size={12} /> Uloženo</> : <><Save size={12} /> Uložit poznámku</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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


            {activeTab === 'resources' && (
              <ResourceDesignTab resourceConfig={resourceConfig} setResourceConfig={setResourceConfig} handleResourceImageUpload={handleResourceImageUpload} />
            )}

            {activeTab === 'users' && (
              <UserManagementTab 
                players={players} 
                selectedPlayerId={selectedPlayerId} 
                setSelectedPlayerId={setSelectedPlayerId} 
              />
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
