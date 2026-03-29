import { Plus, Trash2, Sword, Shield, Heart, Sparkles, Zap, Info, Wand2, Loader2, Skull, Leaf } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../../utils'

export const MonsterEditorTab = ({ 
  monsterForm, setMonsterForm, 
  MONSTER_TYPES, MONSTER_RARITIES, TYPE_COLORS, TYPE_EMOJIS, RARITY_EMOJIS, RARITY_COLORS,
  ABILITY_TYPES,
  handleImageUpload, tempImageUrl, imgError, setImgError
}: any) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('krea_api_key') || '');
  const [showApiInput, setShowApiInput] = useState(false);
  const [promptOverride, setPromptOverride] = useState('');
  const [selectedModel, setSelectedModel] = useState('flux-1-dev');

  const MODELS = [
    { id: 'flux-1-dev', label: 'Flux HD', desc: 'Nejvyšší kvalita' },
    { id: 'flux-1-schnell', label: 'Flux Fast', desc: 'Rychlejší generování' },
    { id: 'nano-banana-pro', label: 'Realtime HD', desc: 'Rychlá a hezká' },
  ];

  const defaultPrompt = `Whimsical, stylized 3D character design of a legendary ${monsterForm.name}. Lore: ${monsterForm.description}. Type: ${monsterForm.type}, Rarity: ${monsterForm.rarity}. Pixar style, 8k, vibrant colors, cinematic lighting.`;

  const generateAIImage = async () => {
    if (!apiKey) {
      alert('Nejdřív vlož Krea.ai API Key!');
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
        alert('Obrázek vygenerován!');
        // Trigger reload by a trick or just clearing error
        setImgError(false);
      } else {
        const err = await res.text();
        alert('Chyba: ' + err);
      }
    } catch (e) {
      console.error(e);
      alert('Selhalo spojení s generátorem');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div key="monsters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 xl:grid-cols-2 gap-10">
       
       {/* Formulář */}
       <div className="space-y-8 bg-slate-900/50 p-8 rounded-3xl border border-white/5">
          <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                 <label className="text-xs font-black text-slate-500 uppercase">ID (např. 015)</label>
                <input value={monsterForm.id} onChange={(e) => setMonsterForm({...monsterForm, id: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary" />
             </div>
              <div className="col-span-2 space-y-2">
                 <label className="text-xs font-black text-slate-500 uppercase">Název příšerky</label>
                <input value={monsterForm.name} onChange={(e) => setMonsterForm({...monsterForm, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary" />
             </div>
          </div>
          
          <div className="space-y-2">
             <label className="text-xs font-black text-slate-500 uppercase">Popis (Lore)</label>
             <textarea value={monsterForm.description} onChange={(e) => setMonsterForm({...monsterForm, description: e.target.value})} rows={3} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-6 relative">
              <div className="space-y-2 relative">
                 <label className="text-xs font-black text-slate-500 uppercase">Typ elementu</label>
                <select value={monsterForm.type} onChange={(e) => setMonsterForm({...monsterForm, type: e.target.value})} className={cn("w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-bold", TYPE_COLORS[monsterForm.type]?.text || 'text-white')}>
                   {MONSTER_TYPES.map((t: string) => <option key={t} value={t} className="bg-slate-900">{TYPE_EMOJIS[t]} {t}</option>)}
                </select>
             </div>
              <div className="space-y-2 relative">
                 <label className="text-xs font-black text-slate-500 uppercase">Vzácnost</label>
                <select value={monsterForm.rarity} onChange={(e) => setMonsterForm({...monsterForm, rarity: e.target.value})} className={cn("w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-bold", RARITY_COLORS[monsterForm.rarity] || 'text-white')}>
                   {MONSTER_RARITIES.map((r: string) => <option key={r} value={r} className="bg-slate-900">{RARITY_EMOJIS[r]} {r}</option>)}
                </select>
             </div>
          </div>


          <div className="space-y-6">
              <h3 className="text-xs font-black text-primary uppercase tracking-[3px] border-b border-white/10 pb-2">Atributy</h3>
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
                 <h3 className="text-xs font-black text-primary uppercase tracking-[3px]">Schopnosti</h3>
                 <button onClick={() => setMonsterForm({...monsterForm, abilities: [...monsterForm.abilities, { name: '', description: '', type: 'attack', chance: 30, value: 1.5 }]})} className="text-[10px] font-black text-primary uppercase">+ Přidat</button>
             </div>
             {monsterForm.abilities.map((ab: any, idx: number) => (
                <div key={idx} className="space-y-3 p-4 bg-black/40 rounded-2xl border border-white/5 relative group">
                   <button onClick={() => setMonsterForm({...monsterForm, abilities: monsterForm.abilities.filter((_: any, i: number) => i !== idx)})} className="absolute top-2 right-2 text-slate-700 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                   <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="space-y-1">
                         <div className="flex items-center gap-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Typ</label>
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
                            {ABILITY_TYPES.find((t: any) => t.id === ab.type)?.desc || 'Bez popisu'}
                         </div>

                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Šance %</label>
                            <input type="number" value={ab.chance} onChange={(e) => { const newAbs = [...monsterForm.abilities]; newAbs[idx].chance = parseInt(e.target.value); setMonsterForm({...monsterForm, abilities: newAbs}); }} className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Síla</label>
                            <input type="number" step="0.1" value={ab.value} onChange={(e) => { const newAbs = [...monsterForm.abilities]; newAbs[idx].value = parseFloat(e.target.value); setMonsterForm({...monsterForm, abilities: newAbs}); }} className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white" />
                         </div>
                      </div>
                   </div>
                   <input placeholder="Název schopnosti" value={ab.name} onChange={(e) => { const newAbs = [...monsterForm.abilities]; newAbs[idx].name = e.target.value; setMonsterForm({...monsterForm, abilities: newAbs}); }} className="w-full bg-transparent border-b border-white/10 py-1 text-sm font-bold text-white focus:border-primary outline-none" />
                   <textarea placeholder="Efekt..." value={ab.description} onChange={(e) => { const newAbs = [...monsterForm.abilities]; newAbs[idx].description = e.target.value; setMonsterForm({...monsterForm, abilities: newAbs}); }} rows={2} className="w-full bg-transparent text-xs text-slate-400 focus:text-slate-200 outline-none resize-none" />
                </div>
             ))}
          </div>
       </div>

       {/* Preview Side */}
       <div className="space-y-10">
           <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-6 sticky top-10">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center">NÁHLED KARTY</h3>
             <div className="w-full max-w-[360px] mx-auto aspect-[4/5] rounded-[2rem] border-8 border-white/10 overflow-hidden relative shadow-2xl bg-black group transition-all duration-500">
                <div className={cn("absolute inset-0 opacity-40 transition-opacity", (TYPE_COLORS[monsterForm.type] || TYPE_COLORS.Default).bg)} />
                <div className="relative h-full flex flex-col p-8">
                   <div className="flex justify-between items-start mb-6">
                      <span className="text-xs font-black text-slate-500 tracking-wider">#{monsterForm.id}</span>
                      <span className={cn("text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border-2", (TYPE_COLORS[monsterForm.type] || TYPE_COLORS.Default).text, (TYPE_COLORS[monsterForm.type] || TYPE_COLORS.Default).border)}>
                         {monsterForm.type}
                      </span>
                   </div>
                   <div className="flex-1 flex flex-col items-center justify-center -mt-8">
                      <div className="size-64 flex items-center justify-center p-2 relative group-hover:scale-105 transition-transform duration-700 cursor-pointer" onClick={() => (document.getElementById('image-upload-hidden') as HTMLInputElement)?.click()}>
                         {(!imgError || tempImageUrl) ? (
                           <img src={tempImageUrl || `/monsters/${monsterForm.id}.png`} onError={() => !tempImageUrl && setImgError(true)} className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                         ) : (
                           <div className="size-48 bg-white/5 rounded-full border-2 border-white/10 flex flex-col items-center justify-center p-8 text-center text-slate-600 uppercase font-black text-xs"><Plus size={24} className="mb-2" /> Nahrát Obrázek</div>
                         )}
                      </div>
                   </div>
                   <div className="mt-4 space-y-2">
                      <h4 className="text-2xl font-black text-white italic tracking-tighter leading-tight">{monsterForm.name}</h4>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", RARITY_COLORS[monsterForm.rarity])}>{monsterForm.rarity}</p>
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
                 <button onClick={() => (document.getElementById('image-upload-hidden') as HTMLInputElement)?.click()} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Nahradit PNG (256x256)</button>
                 
                 <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="space-y-2">
                       <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-500 uppercase">AI Prompt</label>
                          <button onClick={() => setPromptOverride(defaultPrompt)} className="text-[9px] text-primary/60 hover:text-primary uppercase font-bold">Zrušit změny</button>
                       </div>
                       <textarea 
                         value={promptOverride || defaultPrompt} 
                         onChange={(e) => setPromptOverride(e.target.value)} 
                         rows={4} 
                         className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary resize-none"
                         placeholder="Zadej vlastní prompt pro AI..."
                       />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Výběr Modelu</label>
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
                         {isGenerating ? 'Generuji...' : 'Generovat přes Krea.ai'}
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
                         <button onClick={() => setShowApiInput(true)} className="w-full text-center text-[9px] text-slate-600 mt-1 uppercase font-bold hover:text-slate-400">Upravit API Key</button>
                       )}
                    </div>
                 </div>
              </div>
          </div>
       </div>
    </motion.div>
  )
}
