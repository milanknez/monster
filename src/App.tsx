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
import { TradeModal } from './components/TradeModal'
import { TradeSelectionModal } from './components/TradeSelectionModal'

function App() {
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [newMonster, setNewMonster] = useState<Monster | null>(null)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [tradingMonster, setTradingMonster] = useState<Monster | null>(null)
  const [tradeConfirmation, setTradeConfirmation] = useState<{ monster: Monster, received: { id: string, level: number, name: string } } | null>(null)
  const [pendingOffer, setPendingOffer] = useState<{ id: string, level: number, name: string } | null>(null)
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

  // Výpočet aktuálního HP s regenerací (TEST: 100% za 10 minut)
  const REGEN_RATE_PER_MS = 100 / (10 * 60 * 1000) 
  const getCurrentHP = () => {
    const elapsed = Date.now() - hpState.time
    const bonus = elapsed * REGEN_RATE_PER_MS
    return Math.min(100, Math.max(0, hpState.val + bonus))
  }

  const [currentHP, setCurrentHP] = useState(getCurrentHP())

  // Timer pro plynulý update progress baru (každou vteřinu)
  useEffect(() => {
    const timer = setInterval(() => setCurrentHP(getCurrentHP()), 1000)
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

  const removeMonster = (id: string, level: number) => {
    const index = caughtMonsters.findIndex(m => m.id === id && m.level === level)
    if (index !== -1) {
      const updated = [...caughtMonsters]
      updated.splice(index, 1)
      setCaughtMonsters(updated)
      localStorage.setItem('monster_collector_caught', JSON.stringify(updated))
    }
  }

  const handleScan = (ean: string) => {
    if (!ean) return;

    // --- REŽIM VÝMĚNY (HANDSHAKE) ---
    
    // 1. Přijetí nabídky (Hráč B skenuje Hráče A)
    if (ean.startsWith('MSTR_OFF|')) {
      const [, id, level] = ean.split('|');
      const dbMonster = monsterDB.find(m => m.id === id);
      if (dbMonster) {
        setPendingOffer({ id, level: parseInt(level), name: dbMonster.name });
        setIsScannerOpen(false);
        return;
      }
    }

    // 2. Potvrzení výměny (Hráč A skenuje Hráče B)
    if (ean.startsWith('MSTR_CNF|')) {
      const [, givenId, givenLvl, receivedId, receivedLvl] = ean.split('|');
      
      // Hráč A ověří, že to co Hráč B posílá jako "received" je opravdu to, co Hráč A nabízel
      // Pro testování budeme důvěřovat a prostě provedeme swap
      const dbGiven = monsterDB.find(m => m.id === givenId);
      if (dbGiven) {
        // 1. Odeber moji kartu, kterou jsem nabízel
        removeMonster(receivedId, parseInt(receivedLvl));
        // 2. Přidej kartu, kterou mi dává druhý hráč
        saveMonster({ ...dbGiven, level: parseInt(givenLvl), image: `/monsters/${givenId}.png` });
        
        setIsScannerOpen(false);
        alert(`Výměna dokončena! Získal jsi ${dbGiven.name} LVL ${givenLvl}.`);
        return;
      }
    }

    // --- KLASICKÉ SKENOVÁNÍ ---
    // Rozpoznání Trade kódu (starý formát - pro zpětnou kompatibilitu)
    if (ean.startsWith('MSTR_TRD|')) {
      const parts = ean.split('|');
      const [, id, level] = parts;
      const dbMonster = monsterDB.find(m => m.id === id);
      if (dbMonster) {
        setNewMonster({
          ...dbMonster,
          level: parseInt(level) || 1,
          image: `/monsters/${id}.png`
        });
        return;
      }
    }

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
          onQrClick={activeTab === 'vault' ? () => setIsScannerOpen(true) : undefined}
        />
      )}
      
      <main className={cn("mx-auto transition-all duration-300", selectedMonster ? "w-full max-w-none" : "max-w-md")}>
        <AnimatePresence mode="wait">
          {selectedMonster ? (
            <MonsterDetail 
              key="detail" 
              monster={selectedMonster} 
              onBack={() => setSelectedMonster(null)} 
              onTrade={() => {
                setTradingMonster(selectedMonster)
                setSelectedMonster(null)
              }}
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
                <Bestiary 
                  key="bestiary" 
                  caughtMonsters={caughtMonsters} 
                  onSelect={setSelectedMonster}
                />
              )}

              {activeTab === 'world' && (
                <WorldMap 
                  key="world" 
                  onCatch={setNewMonster} 
                  playerHP={currentHP} 
                  onConsumeHP={consumeHP} 
                  isInteractionBlocked={!!newMonster || !!selectedMonster}
                />
              )}

              {activeTab === 'store' && (
                <PlaceholderTab key="store" name="Obchod" icon={ShoppingBag} />
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {activeTab === 'home' && false && (
        <div className="fixed bottom-[88px] left-0 right-0 p-4 px-6 z-40 max-w-md mx-auto">
          {/* Tlačítko skeneru na dashboardu zrušeno, je teď v Bestiáři */}
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
        {tradingMonster && (
          <TradeModal 
            monster={tradingMonster} 
            onClose={() => setTradingMonster(null)} 
            mode="OFFER"
          />
        )}
        {tradeConfirmation && (
          <TradeModal 
            monster={tradeConfirmation.monster} 
            receivedMonster={tradeConfirmation.received}
            onClose={() => setTradeConfirmation(null)} 
            mode="CONFIRM"
          />
        )}
        {pendingOffer && (
          <TradeSelectionModal 
            caughtMonsters={caughtMonsters}
            offeringMonster={pendingOffer}
            onClose={() => setPendingOffer(null)}
            onSelect={(myMonster) => {
              // Hráč B vybral svoji kartu:
              // 1. Ulož kartu, kterou mu dával Hráč A
              const offeredByA = monsterDB.find(m => m.id === pendingOffer.id);
              if (offeredByA) {
                saveMonster({ ...offeredByA, level: pendingOffer.level, image: `/monsters/${offeredByA.id}.png` });
              }
              // 2. Odeber svoji vybranou kartu
              removeMonster(myMonster.id, myMonster.level);
              // 3. Ukaž potvrzovací QR kód pro Hráče A
              setTradeConfirmation({
                monster: myMonster,
                received: pendingOffer
              });
              setPendingOffer(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
