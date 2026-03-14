import { useState, useEffect } from 'react'
import { Radar, Map as MapIcon, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { monsterDB } from './data/monsters'
import type { Monster } from './types'
import { cn } from './utils'

import { Header } from './components/Header'
import { StatsCard } from './components/StatsCard'
import { LatestDetection } from './components/LatestDetection'
import { RecentActivity } from './components/RecentActivity'
import { DailyQuests } from './components/DailyQuests'
import { ScannerModal } from './components/ScannerModal'
import { NewMonsterModal } from './components/NewMonsterModal'
import { Bestiary } from './components/Bestiary'
import { MonsterDetail } from './components/MonsterDetail'
import { NavBar } from './components/NavBar'
import { PlaceholderTab } from './components/PlaceholderTab'
import { WorldMap } from './components/WorldMap'
import { SetupProfileModal } from './components/SetupProfileModal'

function App() {
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [newMonster, setNewMonster] = useState<Monster | null>(null)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [activeTab, setActiveTab] = useState('home')
  const [caughtMonsters, setCaughtMonsters] = useState<Monster[]>([])
  const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem('monster_collector_player_name'))
  
  // HP systém: 100% za 4 hodiny (240 min)
  const [hpState, setHpState] = useState(() => {
    try {
      const saved = localStorage.getItem('monster_collector_hp')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.val === 'number' && typeof parsed.time === 'number' && !isNaN(parsed.val)) {
          return parsed
        }
      }
    } catch (e) { console.warn("Poškozený HP state v localStorage") }
    return { val: 100, time: Date.now() }
  })

  // Výpočet aktuálního HP s regenerací
  const REGEN_RATE_PER_MS = 100 / (4 * 60 * 60 * 1000) // 100% za 4h
  const getCurrentHP = () => {
    const elapsed = Date.now() - hpState.time
    const bonus = elapsed * REGEN_RATE_PER_MS
    return Math.min(100, Math.max(0, hpState.val + bonus))
  }

  const [currentHP, setCurrentHP] = useState(getCurrentHP())

  // Timer pro plynulý update progress baru (každých 10s pro úsporu, ale pro UI stačí)
  useEffect(() => {
    const timer = setInterval(() => setCurrentHP(getCurrentHP()), 10000)
    return () => clearInterval(timer)
  }, [hpState])

  const consumeHP = (amount: number) => {
    const freshHP = getCurrentHP()
    const newVal = Math.max(0, freshHP - amount)
    const newState = { val: newVal, time: Date.now() }
    setHpState(newState)
    setCurrentHP(newVal)
    localStorage.setItem('monster_collector_hp', JSON.stringify(newState))
  }

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

  // Save to LocalStorage – stackování povoleno (stejná příšera může být chycena vícekrát)
  const saveMonster = (monster: Monster) => {
    const updated = [monster, ...caughtMonsters]
    setCaughtMonsters(updated)
    localStorage.setItem('monster_collector_caught', JSON.stringify(updated))
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
      {!playerName && (
        <SetupProfileModal 
          onComplete={(name) => {
            setPlayerName(name)
            localStorage.setItem('monster_collector_player_name', name)
          }} 
        />
      )}
      
      {!selectedMonster && (
        <Header 
          title={activeTab === 'vault' ? "Bestiář" : activeTab === 'world' ? "Mapa světa" : activeTab === 'store' ? "Sektorový Obchod" : playerName || "Aether_Runner"} 
          showBack={activeTab !== 'home'} 
          onBack={() => setActiveTab('home')}
          playerName={playerName || 'Aether_Runner'}
        />
      )}
      
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
                  <StatsCard caughtCount={caughtMonsters.length} playerHP={currentHP} />
                  <LatestDetection lastCaught={lastCaught} onSelect={setSelectedMonster} />
                  <RecentActivity 
                    caughtMonsters={caughtMonsters} 
                    onSelect={setSelectedMonster}
                    onSeeAll={() => setActiveTab('vault')}
                  />
                  <DailyQuests />
                </motion.div>
              )}

              {activeTab === 'vault' && (
                <Bestiary key="bestiary" caughtMonsters={caughtMonsters} onSelect={setSelectedMonster} />
              )}

              {activeTab === 'world' && (
                <WorldMap key="world" onCatch={setNewMonster} playerHP={currentHP} onConsumeHP={consumeHP} />
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
