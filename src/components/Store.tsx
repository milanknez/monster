import { Zap, Heart, Shield, Sparkles, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../utils'
import type { Boost } from '../types'

interface StoreProps {
  onActivateBoost: (boost: Boost) => void
  activeBoosts: Boost[]
}

const STORE_ITEMS = [
  {
    id: 'xp_1day',
    title: 'XP OVERLOAD',
    subtitle: 'VÝCVIKOVÝ MODUL',
    description: 'Dvojnásobné zkušenosti ze všech aktivit.',
    badge: '×2 XP',
    icon: Zap,
    type: 'xp_boost',
    multiplier: 2,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    gradient: 'from-blue-600/20 to-cyan-500/0'
  },
  {
    id: 'hp_50',
    title: 'REGEN ADRENALIN',
    subtitle: 'BIO-STIMULANT',
    description: 'Zrychlí regeneraci energie o 50%.',
    badge: '+50%',
    icon: TrendingUp,
    type: 'hp_regen',
    multiplier: 1.5,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    gradient: 'from-emerald-600/20 to-teal-500/0'
  },
  {
    id: 'hp_100',
    title: 'HYPER REGEN',
    subtitle: 'NANO-RESTORER',
    description: 'Okamžitá 2× rychlejší obnova energie.',
    badge: '×2 REGEN',
    icon: Heart,
    type: 'hp_regen',
    multiplier: 2.0,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/20',
    gradient: 'from-purple-600/20 to-fuchsia-500/0'
  },
  {
    id: 'hp_300',
    title: 'AETHER CORE',
    subtitle: 'JÁDRO ENERGIE',
    description: 'Maximální stimulace. 4× rychlejší regen.',
    badge: 'MAX HP',
    icon: Sparkles,
    type: 'hp_regen',
    multiplier: 4.0,
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    gradient: 'from-orange-600/20 to-red-500/0'
  }
]

export const Store = ({ onActivateBoost, activeBoosts }: StoreProps) => {
  const isBoostActive = (type: string, multiplier: number) => {
    return activeBoosts.some(b => b.type === type && b.multiplier === multiplier && b.expiresAt > Date.now())
  }

  const getRemainingTimePercent = (type: string, multiplier: number) => {
    const boost = activeBoosts.find(b => b.type === type && b.multiplier === multiplier && b.expiresAt > Date.now())
    if (!boost) return 0
    const duration = 24 * 60 * 60 * 1000
    const remaining = boost.expiresAt - Date.now()
    return (remaining / duration) * 100
  }

  return (
    <div className="pb-32 animate-in fade-in duration-500">
      {/* Header Sekce */}
      <div className="p-6 bg-primary/5 border-b border-primary/10 space-y-4">
        <div className="flex flex-col">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Logistická Podpora</p>
          <div className="flex items-center gap-3">
            <h2 className="text-slate-100 text-2xl font-black uppercase tracking-tighter italic">Sektorový Obchod</h2>
            <div className="bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase">Provozní</span>
            </div>
          </div>
        </div>
        <p className="text-slate-500 text-[10px] font-bold uppercase leading-relaxed max-w-[80%]">
          Všechny moduly jsou v této fázi dostupné bez poplatku za Aether kredity.
        </p>
      </div>

      {/* Grid s dlaždicemi */}
      <div className="grid grid-cols-2 gap-4 p-4 mt-2">
        {STORE_ITEMS.map((item, idx) => {
          const isActive = isBoostActive(item.type, item.multiplier)
          const timePercent = getRemainingTimePercent(item.type, item.multiplier)

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => !isActive && onActivateBoost({
                type: item.type as any,
                multiplier: item.multiplier,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000
              })}
              className={cn(
                "group relative aspect-[4/5] rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col",
                isActive ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
              )}
            >
              {/* Gradientní pozadí */}
              <div className={cn("absolute inset-0 z-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity", item.gradient)} />
              
              {/* Ikona a Badge nahoře */}
              <div className="relative z-10 p-4 flex justify-between items-start">
                <div className={cn("p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/5", item.colorClass)}>
                  <item.icon size={20} />
                </div>
                <div className={cn("px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-tighter", item.colorClass)}>
                  {item.badge}
                </div>
              </div>

              {/* Obsah dole */}
              <div className="relative z-10 mt-auto p-4 space-y-1">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.subtitle}</p>
                <h3 className="text-white text-sm font-black uppercase tracking-tight leading-none group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-[9px] text-slate-500 font-medium leading-tight line-clamp-2 mt-1">
                  {item.description}
                </p>

                {/* Status / Tlačítko */}
                <div className="pt-3">
                  {isActive ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[8px] font-black uppercase">
                        <span className="text-primary italic">Aktivní modul</span>
                        <span className="text-slate-500">24h</span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${timePercent}%` }}
                          className="h-full bg-primary shadow-[0_0_8px_#0db9f2]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-center group-hover:bg-primary group-hover:border-primary group-hover:text-slate-950 transition-all">
                      <span className="text-[9px] font-black uppercase tracking-widest">Aktivovat</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Animovaný glint efekt */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
            </motion.div>
          )
        })}
      </div>

      {/* Info Banner */}
      <div className="mx-4 mt-2 p-4 rounded-2xl bg-slate-900 border border-white/5 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
          <Shield size={18} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Bezpečnostní Protokol</p>
          <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
            Všechna vylepšení jsou vázána na lokální terminál. V případě resetu systému budou moduly deaktivovány.
          </p>
        </div>
      </div>
    </div>
  )
}
