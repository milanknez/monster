import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Plus, Trash2, Download, Copy, ArrowLeft, ShieldAlert } from 'lucide-react'
import { monsterDB } from '../data/monsters'
import { cn, TYPE_COLORS } from '../utils'
import type { Monster } from '../types'

const MONSTER_TYPES = ['Ohnivá', 'Vodní', 'Přírodní', 'Elektrická', 'Temná', 'Světelná']
const MONSTER_RARITIES = ['Běžná', 'Neobvyklá', 'Vzácná', 'Epická', 'Legendární']

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

  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [formData.id])

  useEffect(() => {
    if (selectedId) {
      const m = monsters.find(m => m.id === selectedId)
      if (m) setFormData({ ...m })
    }
  }, [selectedId, monsters])

  const handleSaveToState = () => {
    setMonsters(prev => {
      const exists = prev.find(m => m.id === formData.id)
      if (exists) {
        return prev.map(m => m.id === formData.id ? { ...formData } : m)
      }
      return [...prev, { ...formData }]
    })
    setSelectedId(formData.id)
    alert('Změny byly uloženy do lokálního seznamu v editoru!')
  }

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
      {/* Sidebar - Seznam */}
      <aside className="w-full md:w-72 border-r border-white/10 bg-slate-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-black text-sm uppercase tracking-widest text-primary">Katalog</h2>
          <button 
            onClick={() => { setSelectedId(null); setFormData({ id: '000', name: 'Nová příšerka', description: '', type: 'Přírodní', rarity: 'Běžná', stats: { hp: 50, attack: 50, defense: 50 }, abilities: [{ name: '', description: '' }, { name: '', description: '' }] }) }}
            className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-all text-primary"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {monsters.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                selectedId === m.id ? "bg-primary text-slate-950 font-bold" : "hover:bg-white/5"
              )}
            >
              <span className="text-[10px] font-black opacity-40">{m.id}</span>
              <span className="text-sm truncate">{m.name}</span>
            </button>
          ))}
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
            <button onClick={copyToClipboard} className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
              <Copy size={16} /> JSON
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

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Typ elementu</label>
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary"
                >
                  {MONSTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Vzácnost</label>
                <select 
                  value={formData.rarity} 
                  onChange={(e) => setFormData({...formData, rarity: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary"
                >
                  {MONSTER_RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
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
              
              {/* Zjednodušený náhled karty */}
              <div className="w-full max-w-[280px] mx-auto aspect-[4/5] rounded-3xl border-4 border-white/10 overflow-hidden relative shadow-2xl bg-black group">
                <div className={cn("absolute inset-0 opacity-40 transition-opacity", (TYPE_COLORS[formData.type] || TYPE_COLORS.Default).bg)} />
                <div className="relative h-full flex flex-col p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-black text-slate-500">#{formData.id}</span>
                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", (TYPE_COLORS[formData.type] || TYPE_COLORS.Default).text, (TYPE_COLORS[formData.type] || TYPE_COLORS.Default).border)}>
                      {formData.type}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center -mt-4">
                    <div className="size-40 rounded-full flex items-center justify-center p-4 relative">
                       {!imgError ? (
                         <img 
                            src={`/monsters/${formData.id}.png`} 
                            onError={() => setImgError(true)}
                            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                         />
                       ) : (
                         <div className="size-full bg-white/5 rounded-full border border-white/10 flex flex-col items-center justify-center p-6 text-center">
                            <Plus size={24} className="text-slate-700 mb-2" />
                            <span className="text-[8px] text-slate-600 font-bold uppercase">Chybí obrázek /monsters/{formData.id}.png</span>
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-1">
                    <h4 className="text-xl font-black text-white italic leading-tight">{formData.name}</h4>
                    <p className="text-[8px] text-slate-500 font-black uppercase">{formData.rarity}</p>
                    <div className="flex gap-2 pt-2">
                      <div className="bg-red-500/10 border border-red-500/20 px-2 rounded-full overflow-hidden">
                        <span className="text-[7px] font-black text-red-500">HP {formData.stats.hp}</span>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/20 px-2 rounded-full overflow-hidden">
                        <span className="text-[7px] font-black text-orange-500">ATK {formData.stats.attack}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-4">
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
    </div>
  )
}
