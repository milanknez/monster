import { Plus, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../../utils'

import { ResourceIcon } from '../../ui/ResourceIcon'

export const RecipeEditorTab = ({ recipes, setRecipes, resourceConfig }: any) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {recipes.map((recipe: any, rIdx: number) => (
          <div key={rIdx} className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4 flex-1">
                <div className="relative group/res cursor-pointer">
                  <ResourceIcon id={recipe.result.id} config={resourceConfig[recipe.result.id] || {}} size="lg" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/res:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
                     <select 
                       value={recipe.result.id} 
                       onChange={(e) => { const newRecs = [...recipes]; newRecs[rIdx].result.id = e.target.value; setRecipes(newRecs); }}
                       className="absolute inset-0 opacity-0 cursor-pointer"
                     >
                       {Object.keys(resourceConfig).map(t => <option key={t} value={t}>{resourceConfig[t]?.icon} {resourceConfig[t]?.label || t}</option>)}
                     </select>
                     <Plus size={16} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <input 
                      value={recipe.name} 
                      onChange={(e) => { const newRecs = [...recipes]; newRecs[rIdx].name = e.target.value; setRecipes(newRecs); }} 
                      className="bg-transparent border-none text-white font-black uppercase tracking-tight focus:ring-0 p-0 text-sm w-full" 
                    />
                    <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-lg px-2 py-0.5">
                       <span className="text-[10px] font-black text-primary uppercase">x</span>
                       <input 
                         type="number" 
                         value={recipe.result.amount} 
                         onChange={(e) => { const newRecs = [...recipes]; newRecs[rIdx].result.amount = parseInt(e.target.value); setRecipes(newRecs); }}
                         className="w-8 bg-transparent border-none text-[10px] p-0 focus:ring-0 text-primary font-black text-center"
                       />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">ID:</p>
                    <input 
                      value={recipe.id} 
                      onChange={(e) => { const newRecs = [...recipes]; newRecs[rIdx].id = e.target.value; setRecipes(newRecs); }}
                      className="bg-transparent border-none text-[10px] text-slate-500 font-bold p-0 focus:ring-0 text-right uppercase"
                    />
                  </div>
                </div>
              </div>
              <button onClick={() => setRecipes(recipes.filter((_: any, i: number) => i !== rIdx))} className="size-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20"><Trash2 size={14} /></button>
            </div>
            <textarea value={recipe.description} onChange={(e) => { const newRecs = [...recipes]; newRecs[rIdx].description = e.target.value; setRecipes(newRecs); }} className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm text-slate-400" rows={2} />
            <div className="space-y-2">
               <div className="flex justify-between items-center"><h4 className="text-[10px] font-black text-slate-500 uppercase">Požadavky</h4><button onClick={() => { const newRecs = [...recipes]; newRecs[rIdx].requirements.push({ type: 'crystal', count: 1 }); setRecipes(newRecs); }} className="text-[10px] font-black text-primary uppercase">+ Přidat</button></div>
               <div className="flex flex-wrap gap-2">
                 {recipe.requirements.map((req: any, reqIdx: number) => (
                   <div key={reqIdx} className="flex items-center gap-2 bg-black/60 border border-white/5 px-2 py-1 rounded-xl">
                     <ResourceIcon id={req.type} config={resourceConfig[req.type] || {}} size="sm" />
                     <select value={req.type} onChange={(e) => { const newRecs = [...recipes]; newRecs[rIdx].requirements[reqIdx].type = e.target.value; setRecipes(newRecs); }} className="bg-transparent border-none text-[10px] p-0 focus:ring-0 text-white cursor-pointer">
                       {Object.keys(resourceConfig).map(t => <option key={t} value={t} className="bg-slate-900">{resourceConfig[t]?.icon} {resourceConfig[t]?.label || t}</option>)}
                     </select>
                     <input type="number" value={req.count} onChange={(e) => { const newRecs = [...recipes]; newRecs[rIdx].requirements[reqIdx].count = parseInt(e.target.value); setRecipes(newRecs); }} className="w-8 bg-transparent border-none text-[10px] p-0 text-right focus:ring-0 text-primary font-black" />
                     <button onClick={() => { const newRecs = [...recipes]; newRecs[rIdx].requirements = newRecs[rIdx].requirements.filter((_: any, i: number) => i !== reqIdx); setRecipes(newRecs); }}><X size={10} className="text-slate-600" /></button>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        ))}
        <button onClick={() => setRecipes([...recipes, { id: 'new_recipe', name: 'Nový Recept', description: '', requirements: [], result: { type: 'item', id: 'xp_booster', amount: 1 } }])} className="aspect-video rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-slate-600 hover:border-primary/20 hover:text-primary transition-all gap-2"><Plus size={32} /><span className="text-xs font-black uppercase tracking-widest">Nový Recept</span></button>
    </motion.div>
  );
}
