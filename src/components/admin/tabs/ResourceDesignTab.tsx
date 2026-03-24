import { Upload, Plus, Trash2 } from 'lucide-react'
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

export const ResourceDesignTab = ({ resourceConfig, setResourceConfig, handleResourceImageUpload }: any) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
       {Object.entries(resourceConfig).map(([rid, conf]: [string, any]) => (
         <div key={rid} className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl space-y-4 relative group">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-lg relative cursor-pointer" style={{ backgroundColor: conf.color + '20' }} onClick={() => document.getElementById(`icon-upload-${rid}`)?.click()}>
                 <ResourceIcon id={rid} config={conf} size="lg" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
                    <Upload size={16} className="text-white" />
                 </div>
              </div>
              <input type="file" id={`icon-upload-${rid}`} className="hidden" accept="image/png" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleResourceImageUpload(rid, file);
              }} />
              <div className="flex-1">
                 <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{rid}</p>
                 <input value={conf.label} onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, label: e.target.value}})} className="w-full bg-transparent border-none text-white font-black uppercase p-0 focus:ring-0 text-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Barva (HEX)</label>
                <div className="flex items-center gap-2">
                   <input type="color" value={conf.color} onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, color: e.target.value}})} className="size-6 bg-transparent border-none p-0 cursor-pointer" />
                   <input value={conf.color} onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, color: e.target.value}})} className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Emoji</label>
                  <label className="flex items-center gap-1 cursor-pointer">
                     <input type="checkbox" checked={conf.hasCustomIcon} onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, hasCustomIcon: e.target.checked}})} className="size-2 rounded bg-black border-white/10" />
                     <span className="text-[10px] font-black text-slate-600 uppercase">Custom</span>
                  </label>
                </div>
                <input value={conf.icon} onChange={(e) => setResourceConfig({...resourceConfig, [rid]: {...conf, icon: e.target.value}})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-1.5 text-center text-xs text-white" />
              </div>
            </div>
         </div>
       ))}
       <button onClick={() => setResourceConfig({...resourceConfig, new_res: { label: 'Nový Item', color: '#ffffff', icon: '❓', hasCustomIcon: false }})} className="aspect-video rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-slate-600 hover:text-primary hover:border-primary/20 transition-all gap-2"><Plus size={32} /><span className="text-xs font-black uppercase tracking-widest">Přidat Definici</span></button>
    </motion.div>
  );
}
