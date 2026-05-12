import { Zap, Heart, Shield, Sparkles, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils'
import type { Boost } from '../../types'

interface StoreProps {
  onActivateBoost: (boost: Boost, item?: any) => void
  activeBoosts: Boost[]
  maxSlots: number
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
    gradient: 'from-blue-600/20 to-cyan-500/0',
    price: '20 Kč',
    disabled: false
  },
  {
    id: 'xp15x',
    title: 'XP ENHANCER',
    subtitle: 'KOGNITIVNÍ MODUL',
    description: 'Zisk 1.5× více zkušeností.',
    badge: '×1.5 XP',
    icon: Zap,
    type: 'xp_boost',
    multiplier: 1.5,
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-400/10',
    borderClass: 'border-cyan-400/20',
    gradient: 'from-cyan-600/20 to-blue-500/0',
    price: '30 Kč',
    disabled: false
  },
  {
    id: 'hp50',
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
    gradient: 'from-emerald-600/20 to-teal-500/0',
    price: '20 Kč',
    disabled: false
  },
  {
    id: 'hp100',
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
    gradient: 'from-purple-600/20 to-fuchsia-500/0',
    price: '35 Kč',
    disabled: false
  },
  {
    id: 'hp300',
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
    gradient: 'from-orange-600/20 to-red-500/0',
    price: null,
    disabled: true
  },
  {
    id: 'premiumultra',
    title: 'ULTRA CORE',
    subtitle: 'PREMIUM MODUL',
    description: 'Ultimátní balíček všech vylepšení v jednom.',
    badge: 'ULTRA',
    icon: Shield,
    type: 'xp_boost',
    multiplier: 5,
    colorClass: 'text-yellow-400',
    bgClass: 'bg-yellow-400/10',
    borderClass: 'border-yellow-400/20',
    gradient: 'from-yellow-600/20 to-amber-500/0',
    price: '99 Kč', // Placeholder because it's disabled, but setting typical price
    disabled: true
  },
  {
    id: 'inv20',
    title: 'PROSTOR',
    subtitle: 'LOVECKÝ BATOH',
    description: 'Trvale zvětší kapacitu batohu na 20 slotů.',
    badge: '20 MÍST',
    icon: Zap, // Using Zap because ShoppingBag requires importing
    type: 'inventory_upgrade',
    multiplier: 20,
    colorClass: 'text-stone-400',
    bgClass: 'bg-stone-500/10',
    borderClass: 'border-stone-500/20',
    gradient: 'from-stone-600/20 to-neutral-500/0',
    price: '40 Kč',
    disabled: false
  },
  {
    id: 'inv24',
    title: 'EXPANZE',
    subtitle: 'EXPEDIČNÍ BATOH',
    description: 'Trvale zvětší kapacitu batohu na 24 slotů.',
    badge: '24 MÍST',
    icon: TrendingUp, // Using TrendingUp
    type: 'inventory_upgrade',
    multiplier: 24,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    gradient: 'from-amber-600/20 to-orange-500/0',
    price: '60 Kč',
    disabled: false
  }
]

export const Store = ({ onActivateBoost, activeBoosts, maxSlots }: StoreProps) => {
  const { t } = useTranslation();

  const LOCALIZED_STORE_ITEMS = STORE_ITEMS.map(item => {
    const keyMap: Record<string, string> = {
      'xp_1day': 'xp_overload',
      'xp15x': 'xp_enhancer',
      'hp50': 'regen_adrenalin',
      'hp100': 'hyper_regen',
      'hp300': 'aether_core',
      'premiumultra': 'ultra_core',
      'inv20': 'backpack_20',
      'inv24': 'backpack_24'
    };
    const key = keyMap[item.id];
    if (key) {
      return {
        ...item,
        title: t(`store.items.${key}.title`),
        subtitle: t(`store.items.${key}.subtitle`),
        description: t(`store.items.${key}.desc`)
      };
    }
    return item;
  });

  const isBoostActive = (type: string, multiplier: number) => {
    if (type === 'inventory_upgrade') return maxSlots >= multiplier;
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
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">{t('store.support')}</p>
          <div className="flex items-center gap-3">
            <h2 className="text-slate-100 text-2xl font-black uppercase tracking-tighter italic">{t('store.title')}</h2>
          </div>
        </div>
        
        {/* IAP Debug Info - visible only when needed or temporarily for testing */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg w-fit">
          <div className="size-1.5 rounded-full bg-slate-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-500 uppercase">
             {t('store.status_iap')}: {(window as any).purchaseService?.getStatus() || t('common.loading')}
          </span>
        </div>
      </div>

      {/* Grid s dlaždicemi */}
      <div className="grid grid-cols-2 gap-4 p-4 mt-2">
        {LOCALIZED_STORE_ITEMS.sort((a, b) => (a.disabled === b.disabled ? 0 : a.disabled ? 1 : -1)).map((item, idx) => {
          const isActive = isBoostActive(item.type, item.multiplier)
          const timePercent = getRemainingTimePercent(item.type, item.multiplier)
          
          // Try to get real price from store
          const realPrice = (window as any).purchaseService?.getProductPrice(item.id);
          const displayPrice = realPrice || item.price;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => !isActive && !item.disabled && onActivateBoost({
                type: item.type as any,
                multiplier: item.multiplier,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000
              }, { ...item, price: displayPrice })}
              className={cn(
                "group relative aspect-[4/4.5] rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col",
                isActive ? "border-primary bg-primary/5 ring-1 ring-primary/20" : 
                item.disabled ? "border-slate-800 bg-slate-900/20 opacity-50 grayscale cursor-not-allowed" :
                "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
              )}
            >
              {/* Gradientní pozadí */}
              <div className={cn("absolute inset-0 z-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity", !item.disabled && item.gradient)} />
              
              {/* Ikona a Badge nahoře */}
              <div className="relative z-10 p-3 flex justify-between items-start">
                <div className={cn("p-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/5", item.disabled ? "text-slate-600" : item.colorClass)}>
                  <item.icon size={18} />
                </div>
                <div className={cn("px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-tighter", item.disabled ? "text-slate-600" : item.colorClass)}>
                  {item.disabled ? 'LOCK' : item.badge}
                </div>
              </div>

              {/* Centrální Vizualizace - Jednotný styl s ikonou */}
              <div className="relative flex-1 flex items-center justify-center p-2 min-h-0">
                {!item.disabled && <div className={cn("absolute inset-0 m-auto size-16 blur-2xl opacity-20 rounded-full", item.colorClass.replace('text', 'bg'))} />}
                <div className={cn("relative z-10 size-14 rounded-2xl border border-white/10 bg-black/40 flex items-center justify-center backdrop-blur-sm transition-colors", !item.disabled && "group-hover:border-white/20", item.disabled ? "text-slate-700" : item.colorClass)}>
                  <item.icon size={32} strokeWidth={1.5} className={cn("opacity-80", !item.disabled && "drop-shadow-[0_0_10px_currentColor]")} />
                </div>
              </div>

              {/* Obsah dole */}
              <div className="relative z-10 mt-auto p-3 pt-0 space-y-0.5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.subtitle}</p>
                <h3 className={cn("text-[13px] font-black uppercase tracking-tight leading-none transition-colors", item.disabled ? "text-slate-600" : "text-white group-hover:text-primary")}>{item.title}</h3>
                <p className="text-[9px] text-slate-500 font-medium leading-[1.1] line-clamp-2">
                  {item.disabled ? t('store.calibration_msg') : item.description}
                </p>

                {/* Status / Tlačítko */}
                <div className="pt-2">
                  {isActive ? (
                    item.type === 'inventory_upgrade' ? (
                      <div className="w-full py-1 rounded-lg border text-center transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center justify-center gap-2">
                        <CheckCircle2 size={10} />
                        <span className="text-[8px] font-black uppercase tracking-[0.15em]">{t('store.purchased')}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[7px] font-black uppercase">
                          <span className="text-primary italic">{t('store.active_module')}</span>
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
                    )
                  ) : (
                    <div className={cn(
                      "w-full py-1 rounded-lg border text-center transition-all flex items-center justify-center gap-2",
                      item.disabled ? "bg-slate-900 border-slate-800 text-slate-700" :
                      item.price 
                        ? "bg-yellow-400/10 border-yellow-400/30 group-hover:bg-yellow-400 group-hover:border-yellow-400 group-hover:text-slate-950" 
                        : "bg-white/[0.03] border-white/10 group-hover:bg-primary group-hover:border-primary group-hover:text-slate-950"
                    )}>
                      <span className="text-[8px] font-black uppercase tracking-[0.15em]">
                        {item.disabled ? t('store.out_of_service') : displayPrice ? t('store.buy_for', { price: displayPrice }) : t('store.activate')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Animovaný glint efekt */}
              {!item.disabled && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />}
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
          <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{t('store.safety_protocol')}</p>
          <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
            {t('store.safety_desc')}
          </p>
        </div>
      </div>
    </div>
  )
}
