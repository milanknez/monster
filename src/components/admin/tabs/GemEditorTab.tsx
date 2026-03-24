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

export const GemEditorTab = ({ gemBonuses, setGemBonuses, resourceConfig }: any) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {Object.entries(gemBonuses).map(([gid, bonus]: [string, any]) => (
           <div key={gid} className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                 <ResourceIcon id={gid} config={resourceConfig[gid] || {}} size="md" />
                 <div>
                    <h4 className="text-sm font-black text-white uppercase">{resourceConfig[gid]?.label || gid}</h4>
                    <p className="text-[11px] text-slate-500 font-bold uppercase">{gid}</p>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Hodnota</label>
                    <input type="number" value={bonus.value} onChange={(e) => setGemBonuses((prev: any) => ({ ...prev, [gid]: { ...prev[gid], value: parseInt(e.target.value) } }))} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Bonus Typ</label>
                    <button onClick={() => setGemBonuses((prev: any) => ({ ...prev, [gid]: { ...prev[gid], isPerc: !prev[gid].isPerc } }))} className={cn("w-full py-2 rounded-xl text-xs font-black uppercase border transition-all", bonus.isPerc ? "bg-primary/20 border-primary text-primary" : "bg-black border-white/10 text-slate-500")}>
                      {bonus.isPerc ? 'Procenta %' : 'Základ +'}
                    </button>
                 </div>
              </div>
           </div>
         ))}
    </motion.div>
  );
}
