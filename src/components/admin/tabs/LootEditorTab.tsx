import { Dice5, Plus, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../../utils'

const ResourceIcon = ({ id, config, size = "md" }: { id: string, config: any, size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "size-6 text-sm" : size === "md" ? "size-10 text-xl" : "size-14 text-3xl";
  if (config.hasCustomIcon) {
    return (
      <img 
        src={`/resources/${id}.png?v=${Date.now()}`} 
        className={cn(sizeClass, "object-contain")} 
        alt={id}
      />
    );
  }
  return <div className={cn(sizeClass, "flex items-center justify-center")}>{config.icon}</div>;
}

export const LootEditorTab = ({ lootConfig, setLootConfig, resourceConfig }: any) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
       {Object.entries(lootConfig).map(([tableKey, entries]: [string, any]) => (
        <div key={tableKey} className="space-y-4">
          <h3 className="text-base font-black text-primary uppercase tracking-[4px] border-b border-primary/20 pb-2 flex items-center gap-3"><Dice5 size={18} /> {tableKey.replace('_', ' ')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry: any, eIdx: number) => (
              <div key={eIdx} className="bg-slate-900/50 border border-white/5 p-5 rounded-3xl space-y-4 relative group">
                 <div className="flex items-center gap-3">
                    <ResourceIcon id={entry.type} config={resourceConfig[entry.type] || {}} size="md" />
                    <select value={entry.type} onChange={(e) => { const newLoot = { ...lootConfig }; newLoot[tableKey][eIdx].type = e.target.value; setLootConfig(newLoot); }} className="bg-transparent border-none text-sm font-black uppercase text-white cursor-pointer focus:ring-0">
                      {Object.keys(resourceConfig).map(t => <option key={t} value={t} className="bg-slate-900">{resourceConfig[t]?.icon} {resourceConfig[t]?.label || t}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Váha Šance</label>
                      <input type="number" value={entry.weight} onChange={(e) => { const newLoot = { ...lootConfig }; newLoot[tableKey][eIdx].weight = parseInt(e.target.value); setLootConfig(newLoot); }} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Počet (Min-Max)</label>
                      <div className="flex items-center gap-1">
                         <input type="number" value={entry.min} onChange={(e) => { const newLoot = { ...lootConfig }; newLoot[tableKey][eIdx].min = parseInt(e.target.value); setLootConfig(newLoot); }} className="w-full bg-black border border-white/10 rounded-xl text-center text-xs py-2 text-white" />
                         <input type="number" value={entry.max} onChange={(e) => { const newLoot = { ...lootConfig }; newLoot[tableKey][eIdx].max = parseInt(e.target.value); setLootConfig(newLoot); }} className="w-full bg-black border border-white/10 rounded-xl text-center text-xs py-2 text-white" />
                      </div>
                    </div>
                 </div>
                 <button onClick={() => { const newLoot = { ...lootConfig }; newLoot[tableKey] = newLoot[tableKey].filter((_: any, i: number) => i !== eIdx); setLootConfig(newLoot); }} className="absolute top-4 right-4 text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => { const newLoot = { ...lootConfig }; newLoot[tableKey].push({ type: 'crystal', weight: 10, min: 1, max: 1 }); setLootConfig(newLoot); }} className="aspect-video rounded-3xl border-2 border-dashed border-white/5 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary/20 transition-all"><Plus size={24} /></button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
