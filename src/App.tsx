import { useState, useEffect } from 'react'
import { 
  Settings, 
  Bolt, 
  Radar, 
  LayoutGrid, 
  PawPrint, 
  Map as MapIcon, 
  ShoppingBag,
  Zap,
  Target,
  Trophy,
  Activity,
  CheckCircle2,
  Timer,
  BookOpen,
  Search,
  Lock,
  ArrowLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { monsterDB } from './data/monsters'
import { Html5Qrcode } from 'html5-qrcode'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Types ---

interface Monster {
  id: string;
  name: string;
  rarity: string;
  level: number;
  type: string;
  image: string;
  description: string;
  abilities?: { name: string; description: string; icon?: string }[];
}

const TYPE_COLORS: Record<string, { text: string, bg: string, border: string }> = {
  'Ohnivá': { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  'Vodní': { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  'Přírodní': { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  'Elektrická': { text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  'Default': { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' }
}

// --- Components ---

const Header = ({ title = "Aether_Runner", showBack = false, onBack }: { title?: string, showBack?: boolean, onBack?: () => void }) => (
  <header className="flex items-center justify-between p-4 border-b border-primary/20 bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
    <div className="flex items-center gap-3">
      {showBack ? (
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft size={24} className="text-slate-100" />
        </button>
      ) : (
        <div className="size-11 rounded-full border-2 border-primary overflow-hidden bg-slate-800 p-0.5">
          <div 
            className="w-full h-full rounded-full bg-cover bg-center" 
            style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=AetherRunner')` }} 
          />
        </div>
      )}
      <div>
        <h1 className={cn("font-black tracking-wider text-slate-100 uppercase", showBack ? "text-lg" : "text-sm")}>{title}</h1>
        {!showBack && (
          <div className="flex items-center gap-1">
            <Zap size={12} className="text-primary fill-primary" />
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Elitní Průzkumník</span>
          </div>
        )}
      </div>
    </div>
    <div className="flex gap-2">
      {!showBack && (
        <button className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all border border-primary/20 active:scale-90">
          <Settings size={20} className="text-primary" />
        </button>
      )}
    </div>
  </header>
)

const StatsCard = ({ caughtCount }: { caughtCount: number }) => (
  <section className="p-4">
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden group"
    >
      <div className="absolute -right-4 -top-4 size-24 bg-primary/10 blur-3xl rounded-full" />
      
      <div className="flex justify-between items-end mb-6 relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">Úroveň synchronizace</span>
          <h2 className="text-5xl font-black text-slate-100 tracking-tighter">LVL 24</h2>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Celkem chyceno</span>
          <p className="text-2xl font-black text-slate-100 tracking-tighter">{(1250 + caughtCount).toLocaleString('cs-CZ')}</p>
        </div>
      </div>
      
      <div className="space-y-3 relative z-10">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
          <span className="text-primary/80">XP k úrovni 25</span>
          <span className="text-slate-400">6 500 / 10 000</span>
        </div>
        <div className="h-3 w-full bg-slate-900/50 rounded-full overflow-hidden border border-primary/20 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '65%' }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full shadow-[0_0_15px_rgba(13,185,242,0.5)]" 
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn("h-1 w-6 rounded-full", i <= 3 ? "bg-primary" : "bg-primary/20")} />
            ))}
          </div>
          <div className="text-[10px] text-primary font-black tracking-[0.2em]">65.0% SYNC RATE</div>
        </div>
      </div>
    </motion.div>
  </section>
)

const LatestDetection = ({ lastCaught, onSelect }: { lastCaught: Monster | null, onSelect: (m: Monster) => void }) => (
  <section className="px-4 py-2">
    <div className="flex justify-between items-center mb-3 px-1">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Poslední detekce</h3>
      <button className="text-[10px] font-bold text-primary hover:underline uppercase">Historie</button>
    </div>
    
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      onClick={() => lastCaught && onSelect(lastCaught)}
      className="relative overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-primary/40 transition-colors group cursor-pointer"
    >
      <div className="flex items-center p-4 gap-5">
        <div className="size-20 bg-slate-950 rounded-xl border border-primary/20 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:border-primary/50 transition-colors p-2">
          <div className="absolute inset-0 bg-primary/5 animate-pulse" />
          <motion.img 
            whileHover={{ scale: 1.1, rotate: 5 }}
            src={lastCaught ? lastCaught.image : "/monsters/001.png"} 
            alt="Příšerka" 
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_8px_rgba(13,185,242,0.5)]"
          />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-black text-lg text-slate-100 tracking-tight uppercase">
              {lastCaught ? lastCaught.name.replace(' ', '_') : "IGNIS_DRACON"}
            </h4>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter",
              lastCaught ? (TYPE_COLORS[lastCaught.type]?.bg || "bg-primary") : "bg-red-500",
              lastCaught ? (TYPE_COLORS[lastCaught.type]?.text || "text-background-dark") : "text-white"
            )}>
              {lastCaught ? lastCaught.rarity : "VZÁCNÝ"} EXEMPLÁŘ
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {lastCaught ? "Právě detekováno" : "Detekováno před 2h"} • Sektor 7-G
          </p>
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-1">
              <Activity size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-slate-400">{lastCaught ? lastCaught.level * 5 : 85} ATK</span>
            </div>
            <div className="flex items-center gap-1">
              <Bolt size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-slate-400">{lastCaught ? lastCaught.type.toUpperCase() : "OHEŇ"}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  </section>
)

const RecentActivity = ({ caughtMonsters }: { caughtMonsters: Monster[] }) => {
  // If no caught monsters, show some "placeholder" tiles to satisfy "historie a dlaždice"
  const displayList = caughtMonsters.length > 0 
    ? caughtMonsters.slice(0, 4) 
    : monsterDB.slice(0, 3).map(m => ({ ...m, image: `/monsters/${m.id}.png`, placeholder: true }));

  return (
    <section className="px-4 py-4">
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Nedávná aktivita (Dlaždice)</h3>
        <button className="text-[10px] font-bold text-primary hover:underline uppercase">Archiv</button>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {displayList.map((m, idx) => (
          <motion.div 
            key={m.id + idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "shrink-0 size-24 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden group hover:border-primary/30 transition-colors",
              'placeholder' in m && "opacity-40 grayscale"
            )}
          >
            <img src={m.image} className="size-full object-contain relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]" />
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-1 right-1 size-1.5 rounded-full bg-primary/30" />
          </motion.div>
        ))}
        {caughtMonsters.length === 0 && (
          <div className="shrink-0 size-24 bg-slate-900/20 border border-slate-800/50 border-dashed rounded-2xl flex flex-col items-center justify-center p-3 opacity-30">
            <Sparkles size={16} className="text-slate-500 mb-1" />
            <span className="text-[8px] font-bold uppercase text-slate-500">Čeká na sken</span>
          </div>
        )}
      </div>
    </section>
  )
}

const DailyQuests = () => {
  const quests = [
    { id: 1, title: 'Průzkum města', desc: 'Ujdi dnes 2.0 km', progress: 1.2, total: 2.0, icon: MapIcon, color: 'text-primary', bg: 'bg-primary/10' },
    { id: 2, title: 'Efektivní lovec', desc: 'Chyť 5 příšerek', progress: 5, total: 5, icon: Target, color: 'text-green-500', bg: 'bg-green-500/10', completed: true },
    { id: 3, title: 'Datové spojení', desc: 'Navštiv 3 signální věže', progress: 0, total: 3, icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  return (
    <section className="p-4 mb-32">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Denní protokoly</h3>
        <div className="flex items-center gap-1 text-[10px] text-primary font-black uppercase">
          <Timer size={12} />
          <span>RESETOVÁNÍ ZA 04:12:09</span>
        </div>
      </div>
      <div className="space-y-3">
        {quests.map((quest, idx) => (
          <motion.div 
            key={quest.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
            className={cn(
              "flex items-center p-4 bg-slate-900/40 border border-slate-800 rounded-2xl transition-all hover:bg-slate-900/60",
              quest.completed && "border-green-500/30 bg-green-500/5"
            )}
          >
            <div className={cn("p-2.5 rounded-xl mr-4", quest.bg)}>
              <quest.icon size={20} className={quest.color} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-100">{quest.title}</p>
              <p className="text-[11px] text-slate-500 font-medium">{quest.desc}</p>
            </div>
            <div className="text-right">
              {quest.completed ? (
                <CheckCircle2 size={24} className="text-green-500" />
              ) : (
                <>
                  <p className={cn("text-xs font-black", quest.color)}>{quest.progress}/{quest.total}</p>
                  <div className="w-16 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", quest.completed ? "bg-green-500" : quest.color.replace('text', 'bg'))} 
                      style={{ width: `${(quest.progress / quest.total) * 100}%` }} 
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}


const ScannerModal = ({ isOpen, onClose, onScan }: { isOpen: boolean; onClose: () => void; onScan: (ean: string) => void }) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualEan, setManualEan] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const html5QrCode = new Html5Qrcode("reader")
    let isMounted = true

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (isMounted) {
              onScan(decodedText)
              onClose()
            }
          },
          () => {} // Ignore errors
        )
      } catch (err) {
        if (isMounted) {
          console.error("Kamera nebyla nalezena nebo schválena", err)
          setCameraError("Kamera není k dispozici")
        }
      }
    }

    startScanner()

    return () => {
      isMounted = false
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error("Chyba při vypínání", e))
      }
    }
  }, [isOpen, onScan, onClose])

  const handleManualScan = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      onScan(manualEan)
      onClose()
      setManualEan('')
    }, 1500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background-dark/95 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm bg-slate-900 border border-primary/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(13,185,242,0.2)]"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <div className="size-2 bg-red-500 rounded-full animate-pulse" />
              Skenování_Aktivní
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <Settings size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="aspect-square relative rounded-2xl overflow-hidden bg-slate-950 border border-white/5 mb-6 group">
            {/* Camera Viewport */}
            <div id="reader" className="w-full h-full object-cover [&>video]:object-cover" />
            
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-8 text-center z-20">
                <div className="p-4 rounded-full bg-red-500/10 mb-4">
                  <Radar size={32} className="text-red-500 opacity-50" />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{cameraError}</p>
                <p className="text-[10px] text-slate-600 mt-2">Povolte přístup ke kameře v prohlížeči nebo použijte manuální zadání.</p>
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/40 rounded-2xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                
                <motion.div 
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_#0db9f2]"
                />
              </div>
            </div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block">Senzor dat (Manuální EAN)</label>
                {cameraError && <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Offline</span>}
              </div>
              <input 
                type="text" 
                placeholder="Zadejte kód..."
                value={manualEan}
                onChange={(e) => setManualEan(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-colors"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
              />
            </div>
            
            <button 
              onClick={handleManualScan}
              disabled={isProcessing || !manualEan}
              className="w-full bg-primary hover:bg-primary/90 text-background-dark font-black py-4 rounded-xl shadow-[0_4px_15px_rgba(13,185,242,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="size-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                  <span className="uppercase font-black">Zpracování...</span>
                </>
              ) : (
                <>
                  <Zap size={20} className="fill-background-dark" />
                  <span className="uppercase tracking-tight">Vynutit detekci kódu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const NewMonsterModal = ({ monster, onClose, onAdd }: { monster: Monster | null; onClose: () => void; onAdd: (m: Monster) => void }) => {
  if (!monster) return null
  const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default']

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background-dark/95 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        className={cn(
          "relative w-full max-w-sm bg-slate-900 border-4 rounded-3xl overflow-hidden shadow-[0_0_70px_rgba(0,0,0,0.5)]",
          colors.border.replace('border-', 'border-opacity-50 border-')
        )}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-b from-transparent to-black", colors.bg.replace('bg-', 'bg-'))} />
        
        <div className="p-8 text-center relative z-10">
          <motion.div 
            animate={{ y: [-10, 10] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
            className="size-48 mx-auto mb-6 bg-slate-950 rounded-full border-4 border-white/5 flex items-center justify-center shadow-[0_0_40px_rgba(13,185,242,0.1)] relative p-4"
          >
            <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", colors.bg)} />
            <img src={monster.image} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          </motion.div>

          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block", colors.bg, colors.text)}>
            NOVÝ EXEMPLÁŘ ZAJIŠTĚN
          </span>
          <h2 className="text-4xl font-black text-slate-100 tracking-tighter mb-2">{monster.name}</h2>
          <p className="text-xs text-slate-400 mb-6 px-4 line-clamp-2">{monster.description}</p>
          
          <div className="flex justify-center gap-4 mb-8">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Vzácnost</p>
              <p className={cn("font-black", colors.text)}>{monster.rarity}</p>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Typ</p>
              <p className="font-black text-slate-100">{monster.type}</p>
            </div>
          </div>

          <button 
            onClick={() => onAdd(monster)}
            className="w-full bg-slate-100 hover:bg-white text-background-dark font-black py-4 rounded-2xl transition-all active:scale-95 shadow-xl uppercase tracking-tighter"
          >
            Přidat do sbírky
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const Bestiary = ({ caughtMonsters, onSelect }: { caughtMonsters: Monster[], onSelect: (m: Monster) => void }) => {
  const [filter, setFilter] = useState('Vše')
  const rarities = ['Vše', 'Běžná', 'Vzácná', 'Epická', 'Legendární']

  const filteredDB = monsterDB
    .filter(m => filter === 'Vše' || m.rarity === filter)
    .sort((a, b) => {
      const isACaught = caughtMonsters.some(cm => cm.id === a.id);
      const isBCaught = caughtMonsters.some(cm => cm.id === b.id);
      if (isACaught && !isBCaught) return -1;
      if (!isACaught && isBCaught) return 1;
      return 0; // Keep original order (by ID) if both caught or both locked
    });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32"
    >
      <div className="flex flex-col gap-3 p-6 bg-primary/5 border-b border-primary/10">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Globální Hodnocení</p>
            <p className="text-slate-100 text-2xl font-black uppercase tracking-tighter">Sběratel Úr. {Math.floor(caughtMonsters.length / 5) + 1}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-100 text-sm font-black uppercase">
              {caughtMonsters.length} / {monsterDB.length} 
              <span className="text-primary/60 ml-1">Objeveno</span>
            </p>
          </div>
        </div>
        <div className="relative h-3 w-full rounded-full bg-slate-800/50 border border-primary/20 p-0.5 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(caughtMonsters.length / monsterDB.length) * 100}%` }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_10px_#0db9f2]"
          />
        </div>
        <div className="flex justify-between">
          <p className="text-primary text-[10px] font-black uppercase">{Math.round((caughtMonsters.length / monsterDB.length) * 100)}% Kompletní</p>
          <p className="text-slate-500 text-[10px] font-black uppercase">Další milník: {caughtMonsters.length + (5 - (caughtMonsters.length % 5))}</p>
        </div>
      </div>

      <div className="sticky top-16 z-30 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
        <div className="flex px-4 gap-6 overflow-x-auto no-scrollbar scroll-smooth py-4">
          {rarities.map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={cn(
                "whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all relative pb-2",
                filter === r ? "text-primary" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {r}
              {filter === r && (
                <motion.div layoutId="filter-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_#0db9f2]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4">
        {filteredDB.map(m => {
          const isCaught = caughtMonsters.some(cm => cm.id === m.id)
          const colors = TYPE_COLORS[m.type] || TYPE_COLORS['Default']
          
          return (
            <motion.div 
              key={m.id}
              whileHover={isCaught ? { scale: 1.02, y: -4 } : {}}
              whileTap={isCaught ? { scale: 0.98 } : {}}
              onClick={() => isCaught && onSelect(caughtMonsters.find(cm => cm.id === m.id) || { ...m, level: 1, image: `/monsters/${m.id}.png` } as Monster)}
              className={cn(
                "group relative aspect-square rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer",
                isCaught ? colors.border : "border-slate-800 bg-slate-900/40 grayscale"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              
              {isCaught ? (
                <>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10 z-20">
                    <span className={cn("text-[9px] font-black uppercase", colors.text)}>{m.type}</span>
                  </div>
                  <img 
                    src={`/monsters/${m.id}.png`} 
                    className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute bottom-3 left-3 right-3 z-20">
                    <p className="text-white text-sm font-black uppercase tracking-tight line-clamp-1">{m.name}</p>
                    <div className="flex gap-1 mt-1.5">
                      <div className={cn("h-1 w-8 rounded-full", colors.bg.replace('/10', ''))}></div>
                      <div className="h-1 w-4 rounded-full bg-white/20"></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center size-full gap-2 opacity-50">
                  <Lock size={32} className="text-slate-600" />
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Neznámý</p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

const MonsterDetail = ({ monster, onBack, onUpgrade }: { monster: Monster; onBack: () => void; onUpgrade?: () => void }) => {
  const colors = TYPE_COLORS[monster.type] || TYPE_COLORS['Default']
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="w-full min-h-screen bg-background-dark pb-32 pt-4 px-2"
    >
      {/* Magic Card Layout - Full Width */}
      <div className={cn(
        "w-full rounded-[2.5rem] p-3 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 overflow-hidden relative",
        monster.type === 'Ohnivá' ? "border-[#4a1a1a] bg-[#2a0a0a]" :
        monster.type === 'Vodní' ? "border-[#1a2a4a] bg-[#0a1a2a]" :
        monster.type === 'Přírodní' ? "border-[#1a3a1a] bg-[#0a2a0a]" :
        "border-[#3a2a1a] bg-[#2a1a0a]"
      )}>
        {/* Holographic Overlays */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.4)_45%,rgba(255,255,255,0.4)_50%,transparent_55%)] animate-shimmer" />

        {/* Card Content */}
        <div className="relative z-10 flex flex-col gap-3">
          
          {/* Header Area */}
          <div className="flex justify-between items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3 shadow-inner">
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 transition-colors"
              >
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter drop-shadow-md">
                {monster.name}
              </h2>
            </div>
            <div className={cn("size-10 rounded-full flex items-center justify-center border-2 shadow-lg", colors.bg, colors.border)}>
               <Bolt size={20} className={colors.text} />
            </div>
          </div>

          {/* Large Visual Area */}
          <div className="relative aspect-square w-full bg-black/60 rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl">
            <div className={cn("absolute inset-0 opacity-40", 
              monster.type === 'Ohnivá' ? "bg-[radial-gradient(circle_at_center,_#ff4444_0%,_transparent_70%)]" :
              monster.type === 'Vodní' ? "bg-[radial-gradient(circle_at_center,_#0db9f2_0%,_transparent_70%)]" :
              "bg-[radial-gradient(circle_at_center,_#a3e635_0%,_transparent_70%)]"
            )} />
            <motion.img 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              src={monster.image} 
              className="w-full h-full object-contain relative z-10 p-8 drop-shadow-[0_30px_50px_rgba(0,0,0,1)]" 
            />
          </div>

          {/* Type/Level Bar */}
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Typ příšerky</span>
              <span className="text-sm font-black text-slate-200 uppercase">{monster.type} // {monster.rarity}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Úroveň</span>
              <p className="text-lg font-black text-primary italic leading-none">LVL {monster.level}</p>
            </div>
          </div>

          {/* The "Scroll" Text Area */}
          <div className="bg-slate-950/60 backdrop-blur-lg rounded-[1.5rem] border-2 border-white/5 p-5 text-slate-100 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
             {/* Subtle Texture Overlay */}
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
             
             {/* Schopnosti */}
             <div className="relative z-10">
               <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 border-b border-primary/20 pb-1 flex items-center gap-2">
                 <Zap size={10} />
                 Schopnosti karty
               </h3>
               <div className="space-y-4">
                 {monster.abilities && monster.abilities.length > 0 ? (
                   monster.abilities.map((ability, idx) => (
                     <div key={idx} className="flex gap-4 group">
                        <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-lg transition-transform group-hover:scale-110", colors.bg)}>
                           <Zap size={16} className={colors.text} />
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase text-white leading-tight mb-0.5 tracking-tight">{ability.name}</p>
                          <p className="text-[11px] leading-snug text-slate-400 font-bold">{ability.description}</p>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="py-2 text-center border border-dashed border-white/10 rounded-xl">
                     <p className="text-xs italic text-slate-500 font-bold uppercase tracking-widest">Bez speciálních schopností</p>
                   </div>
                 )}
               </div>
             </div>

             {/* Příběh / Historie */}
             <div className="relative z-10 pt-2 border-t border-white/5">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                 <LayoutGrid size={10} />
                 Původ a historie
               </h3>
               <p className="text-sm text-slate-300 italic leading-relaxed font-bold tracking-tight">
                 "{monster.description || "O této příšerce zatím kolují jen legendy v zapomenutých sektorech..."}"
               </p>
             </div>
          </div>

          {/* Bottom Indicators */}
          <div className="flex justify-around items-center pt-2 pb-1">
             {[
               { k: 'ÚTOK', v: monster.level * 5, c: 'text-primary' },
               { k: 'RYCHLOST', v: monster.level * 3, c: 'text-secondary' },
               { k: 'ENERGIE', v: 100 - (monster.level * 2), c: 'text-purple-400' }
             ].map(s => (
               <div key={s.k} className="text-center px-4">
                 <p className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">{s.k}</p>
                 <p className={cn("text-lg font-black", s.c)}>{s.v}</p>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <button 
        onClick={onBack}
        className="w-full mt-6 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-3"
      >
        <ArrowLeft size={18} />
        Zasunout kartu do balíčku
      </button>

    </motion.div>
  )
}

const NavBar = ({ active, onTabChange }: { active: string; onTabChange: (id: string) => void }) => {
  const navItems = [
    { id: 'home', label: 'Domů', icon: LayoutGrid },
    { id: 'vault', label: 'Bestiář', icon: BookOpen },
    { id: 'world', label: 'Svět', icon: MapIcon },
    { id: 'store', label: 'Obchod', icon: ShoppingBag },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800/50 bg-background-dark/95 backdrop-blur-xl px-4 pb-8 pt-3 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto px-4">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all relative px-2",
              active === item.id ? "text-primary" : "text-slate-500"
            )}
          >
            {active === item.id && (
              <motion.div 
                layoutId="nav-active"
                className="absolute -top-3 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_#0db9f2]"
              />
            )}
            <item.icon size={22} strokeWidth={active === item.id ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

const PlaceholderTab = ({ name, icon: Icon }: { name: string, icon: any }) => (
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

function App() {
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [newMonster, setNewMonster] = useState<Monster | null>(null)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [activeTab, setActiveTab] = useState('home')
  const [caughtMonsters, setCaughtMonsters] = useState<Monster[]>([])

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('monster_collector_caught')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Monster[]
        // Enrich with current DB data to reflect changes in JSONs
        const enriched = parsed.map(caught => {
          const dbData = monsterDB.find(m => m.id === caught.id)
          if (dbData) {
            return {
              ...caught,
              name: dbData.name,
              description: dbData.description,
              abilities: (dbData as any).abilities,
              type: dbData.type,
              rarity: dbData.rarity
            }
          }
          return caught
        })
        setCaughtMonsters(enriched)
      } catch (e) {
        console.error("Failed to parse caught monsters", e)
      }
    }
  }, [])

  // Save to LocalStorage
  const saveMonster = (monster: Monster) => {
    const updated = [...caughtMonsters]
    if (!updated.some(m => m.id === monster.id)) {
      updated.unshift(monster)
      setCaughtMonsters(updated)
      localStorage.setItem('monster_collector_caught', JSON.stringify(updated))
    }
    setNewMonster(null)
  }

  const handleScan = (ean: string) => {
    if (!ean) return;

    // Deterministic seed from EAN string
    let hash = 0;
    for (let i = 0; i < ean.length; i++) {
        const char = ean.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    const seed = Math.abs(hash);
    
    const monsterId = ean.padStart(3, '0');
    let foundMonster = monsterDB.find(m => m.id === monsterId);
    
    if (!foundMonster) {
      const monsterIndex = seed % monsterDB.length;
      foundMonster = monsterDB[monsterIndex];
    }
    
    const level = (seed % 25) + 1;
    
    setNewMonster({
      ...foundMonster,
      level,
      image: `/monsters/${foundMonster.id}.png`
    });
  }

  const lastCaught = caughtMonsters[0] || null

  return (
    <div className="min-h-screen font-display pb-32">
      <Header 
        title={selectedMonster ? "" : activeTab === 'vault' ? "Bestiář" : activeTab === 'world' ? "Mapa světa" : activeTab === 'store' ? "Sektorový Obchod" : "Aether_Runner"} 
        showBack={!selectedMonster && activeTab !== 'home'} 
        onBack={() => setActiveTab('home')}
      />
      
      <main className={cn("mx-auto transition-all duration-300", selectedMonster ? "w-full max-w-none" : "max-w-md")}>
        <AnimatePresence mode="wait">
          {selectedMonster ? (
            <MonsterDetail 
              key="detail" 
              monster={selectedMonster} 
              onBack={() => setSelectedMonster(null)} 
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <StatsCard caughtCount={caughtMonsters.length} />
                  <LatestDetection lastCaught={lastCaught} onSelect={setSelectedMonster} />
                  <RecentActivity caughtMonsters={caughtMonsters} />
                  <DailyQuests />
                </motion.div>
              )}

              {activeTab === 'vault' && (
                <Bestiary key="bestiary" caughtMonsters={caughtMonsters} onSelect={setSelectedMonster} />
              )}

              {activeTab === 'world' && (
                <PlaceholderTab key="world" name="Svět" icon={MapIcon} />
              )}

              {activeTab === 'store' && (
                <PlaceholderTab key="store" name="Obchod" icon={ShoppingBag} />
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {!selectedMonster && activeTab === 'home' && (
        <div className="fixed bottom-[88px] left-0 right-0 p-4 px-6 z-40 max-w-md mx-auto">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsScannerOpen(true)}
            className="w-full bg-primary hover:bg-primary/90 text-background-dark font-black text-lg py-4 rounded-2xl shadow-[0_10px_30px_rgba(13,185,242,0.4)] flex items-center justify-center gap-3 transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            <Radar size={24} className="animate-pulse" />
            <span className="tracking-tight uppercase">Spustit skenování</span>
          </motion.button>
        </div>
      )}

      <NavBar active={activeTab} onTabChange={(tab) => {
        setSelectedMonster(null)
        setActiveTab(tab)
      }} />
      
      <AnimatePresence>
        {isScannerOpen && (
          <ScannerModal 
            isOpen={isScannerOpen} 
            onClose={() => setIsScannerOpen(false)} 
            onScan={handleScan}
          />
        )}
        {newMonster && (
          <NewMonsterModal 
            monster={newMonster} 
            onClose={() => setNewMonster(null)} 
            onAdd={saveMonster}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
