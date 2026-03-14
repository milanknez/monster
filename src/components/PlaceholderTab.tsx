import { motion } from 'framer-motion';

export const PlaceholderTab = ({ name, icon: Icon }: { name: string, icon: any }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8"
  >
    <div className="p-6 rounded-full bg-primary/5 mb-6 border border-primary/20">
      <Icon size={48} className="text-primary animate-pulse" />
    </div>
    <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter mb-2">{name}</h2>
    <p className="text-slate-500 text-sm max-w-[200px]">Tento sektor je momentálně mimo dosah vašeho signálu. Pokračujte v průzkumu.</p>
  </motion.div>
)