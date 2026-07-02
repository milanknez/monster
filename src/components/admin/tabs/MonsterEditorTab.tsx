import React, { useState } from 'react'
import { Plus, Trash2, Sword, Shield, Heart, Sparkles, Zap, Info, Wand2, Loader2, Skull, Leaf, ArrowLeft, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, getLoc, getMonsterColors, getMonsterTypeIcon, getMonsterRarityColor } from '../../../utils'
import { useTranslation } from 'react-i18next'

export const MonsterEditorTab = ({ 
  monsters, setMonsters,
  selectedMonsterId, setSelectedMonsterId,
  handleAddNewMonster,
  monsterForm, setMonsterForm, 
  MONSTER_TYPES, MONSTER_RARITIES, TYPE_COLORS, TYPE_EMOJIS, RARITY_EMOJIS, RARITY_COLORS,
  ABILITY_TYPES,
  handleImageUpload, tempImageUrl, imgError, setImgError
}: any) => {
  const { t, i18n } = useTranslation();
  const [activeLang, setActiveLang] = useState<'cz' | 'en' | 'sk'>('cz');
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('krea_api_key') || '');
  const [showApiInput, setShowApiInput] = useState(false);
  const [promptOverride, setPromptOverride] = useState('');
  const [selectedModel, setSelectedModel] = useState('flux-1-dev');

  // Search & Filter State for Grid View
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState('Vše');
  const [typeFilter, setTypeFilter] = useState('Vše');

  const MODELS = [
    { id: 'flux-1-dev', label: 'Flux HD', desc: 'Vysoká kvalita, delší čas' },
    { id: 'flux-1-schnell', label: 'Flux Fast', desc: 'Rychlá generace, standardní kvalita' },
    { id: 'nano-banana-pro', label: 'Realtime HD', desc: 'Okamžitý výsledek, kreativní styl' },
  ];

  const defaultPrompt = monsterForm ? `Whimsical, stylized 3D character design of a legendary ${typeof monsterForm.name === 'object' ? monsterForm.name.cz : monsterForm.name}. Lore: ${typeof monsterForm.description === 'object' ? monsterForm.description.cz : monsterForm.description}. Type: ${typeof monsterForm.type === 'object' ? monsterForm.type.cz : monsterForm.type}, Rarity: ${typeof monsterForm.rarity === 'object' ? monsterForm.rarity.cz : monsterForm.rarity}. Pixar style, 8k, vibrant colors, cinematic lighting.` : '';

  const generateAIImage = async () => {
    if (!monsterForm) return;
    if (!apiKey) {
      alert('Prosím vložte Krea API klíč');
      setShowApiInput(true);
      return;
    }
    localStorage.setItem('krea_api_key', apiKey);
    
    setIsGenerating(true);
    try {
      const prompt = promptOverride || defaultPrompt;
      
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: monsterForm.id, prompt, apiKey, model: selectedModel })
      });

      if (res.ok) {
        alert('Obrázek byl úspěšně vygenerován a uložen!');
        setImgError(false);
      } else {
        const err = await res.text();
        alert('Chyba při generování: ' + err);
      }
    } catch (e) {
      console.error(e);
      alert('Selhalo spojení s AI serverem.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Render Grid View of Monsters if none selected
  if (!selectedMonsterId || !monsterForm) {
    const filteredMonsters = monsters
      .filter((m: any) => rarityFilter === 'Vše' || getLoc(m.rarity, 'cz') === rarityFilter)
      .filter((m: any) => typeFilter === 'Vše' || getLoc(m.type, 'cz') === typeFilter)
      .filter((m: any) => getLoc(m.name, 'cz').toLowerCase().includes(searchQuery.toLowerCase()) || m.id.includes(searchQuery));

    return (
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-3.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Hledat příšeru podle názvu nebo ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-xs text-white focus:border-primary/50 outline-none"
              />
            </div>
            <button
              onClick={handleAddNewMonster}
              className="flex items-center gap-2 px-5 py-3 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              <Plus size={16} /> Vytvořit Příšeru
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex flex-wrap gap-1">
              {['Vše', ...MONSTER_RARITIES].map(r => {
                const isSelected = rarityFilter === r;
                let colorClass = "bg-white/5 border-white/5 text-slate-400 hover:text-white";
                if (isSelected) {
                  colorClass = r === 'Vše'
                    ? "bg-primary border-primary text-slate-950"
                    : cn(getMonsterRarityColor(r), "bg-white/10 border-current shadow-lg shadow-white/5");
                }
                return (
                  <button
                    key={r}
                    onClick={() => setRarityFilter(r)}
                    className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all", colorClass)}
                  >
                    {r === 'Vše' ? 'Všechny vzácnosti' : t(`rarities.${r}`)}
                  </button>
                )
              })}
            </div>

            <div className="w-[1px] h-4 bg-white/10 hidden md:block" />

            <div className="flex flex-wrap gap-1">
              {['Vše', ...MONSTER_TYPES].map(type => {
                const Icon = getMonsterTypeIcon(type);
                const colors = getMonsterColors(type);
                const isSelected = typeFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center gap-1.5",
                      isSelected
                        ? (type === 'Vše' ? "bg-primary border-primary text-slate-950" : cn(colors.bg, colors.border, colors.text))
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {Icon && <Icon size={12} />}
                    <span>{type === 'Vše' ? 'Všechny typy' : t(`monster_types.${type}`)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {filteredMonsters.map((m: any) => {
            const colors = getMonsterColors(m.type) || { text: 'text-white', border: 'border-white/10', bg: 'bg-slate-900' };
            const typeIcon = getMonsterTypeIcon(m.type);
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMonsterId(m.id)}
                className="bg-slate-900/60 border border-white/5 hover:border-primary/45 rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 group hover:shadow-[0_0_25px_rgba(13,185,242,0.05)] cursor-pointer hover:-translate-y-0.5 relative overflow-hidden"
              >
                {/* Background glow of element type */}
                <div className={cn("absolute -top-10 -right-10 size-16 rounded-full opacity-10 blur-xl transition-all group-hover:opacity-20", colors.bg)} />

                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="text-[9px] font-black text-slate-500 tracking-wider">#{m.id}</span>
                  <div className={cn("p-0.5 rounded bg-black/40 border border-white/10 shrink-0", colors.text)}>
                    {typeIcon && React.createElement(typeIcon, { size: 10 })}
                  </div>
                </div>

                <div className="aspect-square w-full max-w-[140px] mx-auto mb-2 flex items-center justify-center p-0.5 relative z-10">
                  <img
                    src={`/monsters/${m.id}.png`}
                    className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>

                <div className="relative z-10">
                  <h3 className="text-[10px] font-black text-white uppercase italic group-hover:text-primary transition-colors truncate">
                    {getLoc(m.name, 'cz')}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", getMonsterRarityColor(m.rarity))}>
                      {t(`rarities.${m.rarity}`)}
                    </span>
                  </div>

                  <div className="flex gap-1 mt-2 pt-2 border-t border-white/5 justify-between">
                    <div className="bg-red-500/10 border border-red-500/10 px-1 py-0.5 rounded text-[7px] font-black text-red-400 uppercase">H{m.stats.hp}</div>
                    <div className="bg-orange-500/10 border border-orange-500/10 px-1 py-0.5 rounded text-[7px] font-black text-orange-400 uppercase">A{m.stats.attack}</div>
                    <div className="bg-blue-500/10 border border-blue-500/10 px-1 py-0.5 rounded text-[7px] font-black text-blue-400 uppercase">D{m.stats.defense}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render Edit Form View if a monster is selected
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={() => setSelectedMonsterId(null)}
          className="flex items-center gap-2 text-xs font-black uppercase text-primary/80 hover:text-primary transition-all bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl border border-primary/20"
        >
          <ArrowLeft size={14} /> Zpět na seznam příšer
        </button>
      </div>

      <motion.div key="monsters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 xl:grid-cols-2 gap-10">
         
         {/* Formulář */}
         <div className="space-y-8 bg-slate-900/50 p-8 rounded-3xl border border-white/5">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4 mb-4">Základní Atributy</h2>
            {/* Language Switcher */}
            <div className="flex gap-2 p-1 bg-black/40 rounded-xl w-fit">
              <button onClick={() => setActiveLang('cz')} className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all", activeLang === 'cz' ? "bg-primary text-slate-950" : "text-slate-500 hover:text-white")}>🇨🇿 CZ</button>
              <button onClick={() => setActiveLang('sk')} className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all", activeLang === 'sk' ? "bg-primary text-slate-950" : "text-slate-500 hover:text-white")}>🇸🇰 SK</button>
              <button onClick={() => setActiveLang('en')} className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all", activeLang === 'en' ? "bg-primary text-slate-950" : "text-slate-500 hover:text-white")}>🇺🇸 EN</button>
            </div>
  
            <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-500 uppercase">ID / Identifikátor</label>
                  <input value={monsterForm.id} onChange={(e) => setMonsterForm({...monsterForm, id: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary" />
               </div>
                <div className="col-span-2 space-y-2">
                   <label className="text-xs font-black text-slate-500 uppercase">Název Příšery ({activeLang.toUpperCase()})</label>
                  <input 
                    value={typeof monsterForm.name === 'object' ? (monsterForm.name[activeLang] || '') : (activeLang === 'cz' ? monsterForm.name : '')} 
                    onChange={(e) => {
                      const currentName = typeof monsterForm.name === 'object' ? monsterForm.name : { cz: monsterForm.name, en: monsterForm.name, sk: monsterForm.name };
                      setMonsterForm({...monsterForm, name: {...currentName, [activeLang]: e.target.value}});
                    }} 
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary" 
                  />
                </div>
            </div>
            
            <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase">Příběh a Popis ({activeLang.toUpperCase()})</label>
               <textarea 
                 value={typeof monsterForm.description === 'object' ? (monsterForm.description[activeLang] || '') : (activeLang === 'cz' ? monsterForm.description : '')} 
                 onChange={(e) => {
                   const currentDesc = typeof monsterForm.description === 'object' ? monsterForm.description : { cz: monsterForm.description, en: monsterForm.description, sk: monsterForm.description };
                   setMonsterForm({...monsterForm, description: {...currentDesc, [activeLang]: e.target.value}});
                 }} 
                 rows={3} 
                 className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary resize-none" 
               />
            </div>
  
            <div className="grid grid-cols-2 gap-6 relative">
                <div className="space-y-2 relative">
                   <label className="text-xs font-black text-slate-500 uppercase">Elementární Typ</label>
                  <select 
                    value={monsterForm.type} 
                    onChange={(e) => setMonsterForm({...monsterForm, type: e.target.value})} 
                    className={cn("w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-bold", TYPE_COLORS[monsterForm.type]?.text || 'text-white')}
                  >
                     {MONSTER_TYPES.map((t: string) => <option key={t} value={t} className="bg-slate-900">{TYPE_EMOJIS[t]} {i18n.t(`monster_types.${t}`)}</option>)}
                  </select>
               </div>
                <div className="space-y-2 relative">
                   <label className="text-xs font-black text-slate-500 uppercase">Vzácnost Výskytu</label>
                  <select 
                    value={monsterForm.rarity} 
                    onChange={(e) => setMonsterForm({...monsterForm, rarity: e.target.value})} 
                    className={cn("w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-bold", RARITY_COLORS[monsterForm.rarity] || 'text-white')}
                  >
                     {MONSTER_RARITIES.map((r: string) => <option key={r} value={r} className="bg-slate-900">{RARITY_EMOJIS[r]} {i18n.t(`rarities.${r}`)}</option>)}
                  </select>
               </div>
            </div>
  
  
            <div className="space-y-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-[3px] border-b border-white/10 pb-2">Atributy a Staty</h3>
               {Object.entries(monsterForm.stats).map(([key, val]: any) => {
                   const maxVal = key === 'hp' ? 1400 : key === 'attack' ? 500 : 300;
                   return (
                    <div key={key} className="space-y-2">
                       <div className="flex justify-between text-[11px] font-black uppercase text-slate-400"><span>{key}</span><span className="text-white">{val}</span></div>
                      <input 
                        type="range" 
                        min="10" 
                        max={maxVal} 
                        value={val} 
                        onChange={(e) => setMonsterForm({...monsterForm, stats: {...monsterForm.stats, [key]: parseInt(e.target.value)}})} 
                        className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none transition-all" 
                      />
                   </div>
                )})}
            </div>
  
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <h3 className="text-xs font-black text-primary uppercase tracking-[3px]">Schopnosti (Abilities) ({activeLang.toUpperCase()})</h3>
                    <button onClick={() => setMonsterForm({...monsterForm, abilities: [...monsterForm.abilities, { name: {cz: '', en: ''}, description: {cz: '', en: ''}, type: 'attack', chance: 30, value: 1.5 }]})} className="text-[10px] font-black text-primary uppercase">Přidat Schopnost</button>
                </div>
               {monsterForm.abilities.map((ab: any, idx: number) => (
                  <div key={idx} className="space-y-3 p-4 bg-black/40 rounded-2xl border border-white/5 relative group">
                     <button onClick={() => setMonsterForm({...monsterForm, abilities: monsterForm.abilities.filter((_: any, i: number) => i !== idx)})} className="absolute top-2 right-2 text-slate-700 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                     <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="space-y-1">
                           <div className="flex items-center gap-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Typ Schopnosti</label>
                              {ab.type === 'attack' ? <Sword size={8} className="text-primary/60" /> : 
                                ab.type === 'defense' ? <Shield size={8} className="text-primary/60" /> : 
                                ab.type === 'heal' ? <Heart size={8} className="text-primary/60" /> : 
                                ab.type === 'regen' ? <Leaf size={8} className="text-emerald-500/60" /> : 
                                ab.type === 'curse' ? <Skull size={8} className="text-purple-500/60" /> : 
                                ab.type === 'extra' ? <Zap size={8} className="text-primary/60" /> : 
                                <Info size={8} className="text-primary/60" />}
                           </div>
  
                           <select value={ab.type || 'attack'} onChange={(e) => {
                              const newAbilities = [...monsterForm.abilities]; 
                              newAbilities[idx].type = e.target.value;
                              const typeData = ABILITY_TYPES.find((t: any) => t.id === e.target.value);
                              if (typeData) { newAbilities[idx].chance = typeData.defaultChance; newAbilities[idx].value = typeData.defaultVal; }
                              setMonsterForm({...monsterForm, abilities: newAbilities});
                           }} className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white">
                              {ABILITY_TYPES.map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}
                           </select>
                           <div className="text-[9px] text-primary/40 mt-1 uppercase font-black tracking-tighter italic">
                              {ABILITY_TYPES.find((t: any) => t.id === ab.type)?.desc || 'Žádný popis'}
                           </div>
  
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Šance (%)</label>
                              <input type="number" value={ab.chance} onChange={(e) => { const newAbs = [...monsterForm.abilities]; newAbs[idx].chance = parseInt(e.target.value); setMonsterForm({...monsterForm, abilities: newAbs}); }} className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Síla / Efekt</label>
                              <input type="number" step="0.1" value={ab.value} onChange={(e) => { const newAbs = [...monsterForm.abilities]; newAbs[idx].value = parseFloat(e.target.value); setMonsterForm({...monsterForm, abilities: newAbs}); }} className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white" />
                           </div>
                        </div>
                     </div>
                     <input 
                        placeholder={`Název schopnosti (${activeLang})`} 
                        value={typeof ab.name === 'object' ? ab.name[activeLang] : ab.name} 
                        onChange={(e) => { 
                          const newAbs = [...monsterForm.abilities]; 
                          if (typeof ab.name === 'object') {
                            newAbs[idx].name = {...ab.name, [activeLang]: e.target.value};
                          } else {
                            newAbs[idx].name = {[activeLang]: e.target.value, [activeLang === 'cz' ? 'en' : 'cz']: ab.name};
                          }
                          setMonsterForm({...monsterForm, abilities: newAbs}); 
                        }} 
                        className="w-full bg-transparent border-b border-white/10 py-1 text-sm font-bold text-white focus:border-primary outline-none" 
                      />
                      <textarea 
                        placeholder={`Popis efektu (${activeLang})...`} 
                        value={typeof ab.description === 'object' ? ab.description[activeLang] : ab.description} 
                        onChange={(e) => { 
                          const newAbs = [...monsterForm.abilities]; 
                          if (typeof ab.description === 'object') {
                            newAbs[idx].description = {...ab.description, [activeLang]: e.target.value};
                          } else {
                            newAbs[idx].description = {[activeLang]: e.target.value, [activeLang === 'cz' ? 'en' : 'cz']: ab.description};
                          }
                          setMonsterForm({...monsterForm, abilities: newAbs}); 
                        }} 
                        rows={2} 
                        className="w-full bg-transparent text-xs text-slate-400 focus:text-slate-200 outline-none resize-none" 
                      />
                  </div>
               ))}
            </div>
         </div>
  
         {/* Preview Side */}
         <div className="space-y-10">
             <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-6 sticky top-10">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center">Náhled Karty</h3>
               <div className="w-full max-w-[420px] mx-auto aspect-[4/5] rounded-[2rem] border-8 border-white/10 overflow-hidden relative shadow-2xl bg-black group transition-all duration-500">
                  <div className={cn("absolute inset-0 opacity-40 transition-opacity", (TYPE_COLORS[typeof monsterForm.type === 'object' ? monsterForm.type.cz : monsterForm.type] || TYPE_COLORS.Default).bg)} />
                  <div className="relative h-full flex flex-col p-8">
                     <div className="flex justify-between items-start mb-6">
                        <span className="text-xs font-black text-slate-500 tracking-wider">#{monsterForm.id}</span>
                        <span className={cn("text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border-2", (TYPE_COLORS[monsterForm.type] || TYPE_COLORS.Default).text, (TYPE_COLORS[monsterForm.type] || TYPE_COLORS.Default).border)}>
                           {t(`monster_types.${monsterForm.type}`)}
                        </span>
                     </div>
                     <div className="flex-1 flex flex-col items-center justify-center -mt-8">
                        <div className="w-full h-80 flex items-center justify-center p-2 relative group-hover:scale-105 transition-transform duration-700 cursor-pointer" onClick={() => (document.getElementById('image-upload-hidden') as HTMLInputElement)?.click()}>
                           {(!imgError || tempImageUrl) ? (
                             <img src={tempImageUrl || `/monsters/${monsterForm.id}.png`} onError={() => !tempImageUrl && setImgError(true)} className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                           ) : (
                             <div className="size-64 bg-white/5 rounded-full border-2 border-white/10 flex flex-col items-center justify-center p-8 text-center text-slate-600 uppercase font-black text-xs"><Plus size={24} className="mb-2" /> Nahrát obrázek</div>
                           )}
                        </div>
                     </div>
                     <div className="mt-4 space-y-2">
                        <h4 className="text-2xl font-black text-white italic tracking-tighter leading-tight">{typeof monsterForm.name === 'object' ? monsterForm.name[activeLang] : monsterForm.name}</h4>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", RARITY_COLORS[monsterForm.rarity])}>{t(`rarities.${monsterForm.rarity}`)}</p>
                        <div className="flex gap-2 pt-3">
                           <div className="bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[8px] font-black text-red-500 uppercase">HP {monsterForm.stats.hp}</div>
                           <div className="bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-[8px] font-black text-orange-500 uppercase">ATK {monsterForm.stats.attack}</div>
                           <div className="bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[8px] font-black text-blue-500 uppercase">DEF {monsterForm.stats.defense}</div>
                        </div>
                     </div>
                  </div>
               </div>
                <input type="file" id="image-upload-hidden" accept="image/png" className="hidden" onChange={handleImageUpload} />
                
                <div className="space-y-3">
                   <button onClick={() => (document.getElementById('image-upload-hidden') as HTMLInputElement)?.click()} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Nahrát jiný PNG obrázek</button>
                   
                   <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-500 uppercase">AI Image Prompt</label>
                            <button onClick={() => setPromptOverride(defaultPrompt)} className="text-[9px] text-primary/60 hover:text-primary uppercase font-bold">Obnovit výchozí</button>
                         </div>
                         <textarea 
                           value={promptOverride || defaultPrompt} 
                           onChange={(e) => setPromptOverride(e.target.value)} 
                           rows={4} 
                           className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary resize-none"
                           placeholder="Zadejte prompt pro generování obrázku..."
                         />
                      </div>
  
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Výběr AI Modelu</label>
                          <select 
                            value={selectedModel} 
                            onChange={(e) => setSelectedModel(e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] text-white focus:border-primary"
                          >
                            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label} – {m.desc}</option>)}
                          </select>
                      </div>
  
                      <div className="relative">
                         <button 
                           onClick={generateAIImage} 
                           disabled={isGenerating}
                           className={cn(
                             "w-full py-4 bg-primary/20 hover:bg-primary/30 border border-primary/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                             isGenerating && "opacity-50 cursor-not-allowed"
                           )}
                         >
                           {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} 
                           {isGenerating ? 'Generuji...' : 'Vygenerovat AI Obrázek'}
                         </button>
                         {!apiKey || showApiInput ? (
                             <div className="mt-2 space-y-2">
                                <input 
                                  type="password" 
                                  placeholder="Krea.ai API Key" 
                                  value={apiKey} 
                                  onChange={(e) => setApiKey(e.target.value)} 
                                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white" 
                                />
                                <button onClick={() => setShowApiInput(false)} className="text-[10px] text-slate-500 uppercase font-black">Skrýt klíč</button>
                             </div>
                         ) : (
                           <button onClick={() => setShowApiInput(true)} className="w-full text-center text-[9px] text-slate-600 mt-1 uppercase font-bold hover:text-slate-400">Změnit API Klíč</button>
                         )}
                      </div>
                   </div>
                </div>
            </div>
         </div>
      </motion.div>
    </div>
  );
};
