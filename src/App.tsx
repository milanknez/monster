import { useState, useEffect, useRef, useCallback } from 'react'
import { Radar, Map as MapIcon, ShoppingBag, Sparkles, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { monsterDB } from './data/monsters'
import type { Monster } from './types'
import { cn, calculateLevel } from './utils'

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
import { WorldMap, type WorldMapHandle } from './components/WorldMap'
import { SetupProfileModal } from './components/SetupProfileModal'
import { TradeModal } from './components/TradeModal'
import { TradeSelectionModal } from './components/TradeSelectionModal'
import { SettingsModal } from './components/SettingsModal'
import { Store } from './components/Store'
import { MonsterEditor } from './components/MonsterEditor'
import { GooglePayModal } from './components/GooglePayModal'
import { ToastContainer, type ToastMessage } from './components/Toast'
import type { Boost } from './types'

function App() {
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [newMonster, setNewMonster] = useState<Monster | null>(null)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [tradingMonster, setTradingMonster] = useState<Monster | null>(null)
  const [tradeConfirmation, setTradeConfirmation] = useState<{ monster: Monster, received: { id: string, level: number, name: string } } | null>(null)
  const [pendingOffer, setPendingOffer] = useState<{ id: string, level: number, name: string } | null>(null)
  const [payingItem, setPayingItem] = useState<{ boost: Boost, title: string, price: string } | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [activeTab, setActiveTab] = useState('home')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const worldMapRef = useRef<WorldMapHandle>(null)
  const [caughtMonsters, setCaughtMonsters] = useState<Monster[]>([])
  const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem('monster_collector_player_name'))
  const [avatarStyle, setAvatarStyle] = useState(() => localStorage.getItem('monster_collector_avatar_style') || 'avataaars')
  const [avatarSeed, setAvatarSeed] = useState(() => localStorage.getItem('monster_collector_avatar_seed') || 'seed')
  
  // Režim editoru (vstup přes ?editor=1)
  const [isEditorMode, setIsEditorMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('editor') === '1'
  })
  // Aktivní boosty
  const [activeBoosts, setActiveBoosts] = useState<Boost[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_boosts')
      if (saved) {
        return (JSON.parse(saved) as Boost[]).filter(b => b.expiresAt > Date.now())
      }
    } catch { return [] }
    return []
  })
  // Vzdálenost: metry nachozené dnes (s resetem o půlnoci)
  const [dailyDistance, setDailyDistance] = useState(() => {
    try {
      const saved = localStorage.getItem('monster_collector_distance')
      if (saved) {
        const { dist, date } = JSON.parse(saved)
        if (date === new Date().toDateString()) return dist
      }
    } catch (e) { console.error("Chyba při načítání vzdálenosti") }
    return 0
  })
  // XP state s migrací
  const [totalXP, setTotalXP] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_xp')
      if (saved !== null) return parseInt(saved)
      const caught = localStorage.getItem('monster_collector_caught')
      if (caught) return JSON.parse(caught).length * 250
    } catch { return 0 }
    return 0
  })

  const [showLevelUp, setShowLevelUp] = useState<number | null>(null)
  const lastLevelRef = useRef<number>(calculateLevel(totalXP))

  // Sledování level upu
  useEffect(() => {
    const currentLevel = calculateLevel(totalXP)
    if (currentLevel > lastLevelRef.current) {
      setShowLevelUp(currentLevel)
      addToast({
        title: 'LEVEL UP!',
        message: `Dosáhl jsi úrovně ${currentLevel}!`,
        type: 'boost'
      })
    }
    lastLevelRef.current = currentLevel
  }, [totalXP])

  // Exponování pro testování přes konzoli
  useEffect(() => {
    (window as any).triggerLevelUp = (lvl?: number) => {
      setShowLevelUp(lvl || calculateLevel(totalXP) + 1)
    };
    return () => { delete (window as any).triggerLevelUp };
  }, [totalXP])

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

  // Výpočet aktuálního HP s regenerací (TEST: 100% za 10 minut základ)
  const BASE_REGEN_RATE = 100 / (10 * 60 * 1000) 
  
  const getCurrentHP = useCallback(() => {
    // Najdeme nejvyšší HP boost
    const hpBoost = activeBoosts
      .filter(b => b.type === 'hp_regen' && b.expiresAt > Date.now())
      .reduce((max, b) => Math.max(max, b.multiplier), 1.0)

    const elapsed = Date.now() - hpState.time
    const bonus = elapsed * (BASE_REGEN_RATE * hpBoost)
    return Math.min(100, Math.max(0, hpState.val + bonus))
  }, [hpState, activeBoosts])

  const [currentHP, setCurrentHP] = useState(getCurrentHP())

  // Uložení aktuálního stavu HP (checkpoint) před změnou parametrů
  const checkpointHP = () => {
    const freshHP = getCurrentHP()
    const newState = { val: freshHP, time: Date.now() }
    setHpState(newState)
    setCurrentHP(freshHP)
    localStorage.setItem('monster_collector_hp', JSON.stringify(newState))
    return freshHP
  }

  const activateBoost = (boost: Boost, item?: any) => {
    // Pokud je položka placená a ještě jsme ji "nezaplatili" (v této transakci)
    if (item?.price && !payingItem) {
      setPayingItem({ boost, title: item.title, price: item.price })
      return
    }

    checkpointHP() // Důležité: uložit HP s aktuálním rate než se změní na nový
    const updated = [boost, ...activeBoosts.filter(b => b.type !== boost.type || b.multiplier !== boost.multiplier)]
    setActiveBoosts(updated)
    localStorage.setItem('monster_collector_boosts', JSON.stringify(updated))
  }

  // Timer pro plynulý update progress baru (každou vteřinu)
  useEffect(() => {
    const timer = setInterval(() => setCurrentHP(getCurrentHP()), 1000)
    return () => clearInterval(timer)
  }, [hpState, activeBoosts])

  const consumeHP = useCallback((amount: number) => {
    const freshHP = getCurrentHP()
    const newVal = Math.max(0, freshHP - amount)
    const newState = { val: newVal, time: Date.now() }
    setHpState(newState)
    setCurrentHP(newVal)
    localStorage.setItem('monster_collector_hp', JSON.stringify(newState))
  }, [getCurrentHP])

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const handleMove = useCallback((meters: number) => {
    setDailyDistance((prev: number) => {
      const newVal = prev + meters
      localStorage.setItem('monster_collector_distance', JSON.stringify({
        dist: newVal,
        date: new Date().toDateString()
      }))
      return newVal
    })
  }, [])

  const handleClaimReward = (xp: number) => {
    // Aplikujeme boost i na odměny z úkolů
    const xpBoost = activeBoosts
      .filter(b => b.type === 'xp_boost' && b.expiresAt > Date.now())
      .reduce((max, b) => Math.max(max, b.multiplier), 1.0)
    
    const xpGained = Math.round(xp * xpBoost)
    const newTotalXP = totalXP + xpGained
    setTotalXP(newTotalXP)
    localStorage.setItem('monster_collector_xp', newTotalXP.toString())

    addToast({
      title: 'Odměna získána',
      message: `Získal jsi +${xpGained} XP za splnění úkolu.`,
      type: 'xp'
    })
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

  // Save to LocalStorage – limit 3x stejný druh
  const saveMonster = (monster: Monster) => {
    setCaughtMonsters(prev => {
      const existingCount = prev.filter(m => m.id === monster.id).length
      if (existingCount >= 3) {
        alert(`Už máš 3x tento druh (${monster.name}). Více jich neuneseš!`)
        setNewMonster(null)
        return prev
      }
      const enriched = { ...monster, caughtAt: monster.caughtAt || Date.now() }
      const updated = [enriched, ...prev]
      localStorage.setItem('monster_collector_caught', JSON.stringify(updated))
      return updated
    })
    
    // XP Boost výpočet
    const xpBoost = activeBoosts
      .filter(b => b.type === 'xp_boost' && b.expiresAt > Date.now())
      .reduce((max, b) => Math.max(max, b.multiplier), 1.0)
    
    const xpGained = Math.round(250 * xpBoost)
    setTotalXP(prev => {
      const newTotal = prev + xpGained
      localStorage.setItem('monster_collector_xp', newTotal.toString())
      return newTotal
    })

    addToast({
      title: 'Monstrum chyceno',
      message: `${monster.name} chycen! +${xpGained} XP`,
      type: 'xp'
    })

    setNewMonster(null)
  }

  const removeMonster = (id: string, level: number) => {
    setCaughtMonsters(prev => {
      const index = prev.findIndex(m => m.id === id && m.level === level)
      if (index !== -1) {
        const updated = [...prev]
        updated.splice(index, 1)
        localStorage.setItem('monster_collector_caught', JSON.stringify(updated))
        return updated
      }
      return prev
    })
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

  if (isEditorMode) {
    return (
      <MonsterEditor onBack={() => {
        const url = new URL(window.location.href)
        url.searchParams.delete('editor')
        window.history.pushState({}, '', url)
        setIsEditorMode(false)
      }} />
    )
  }

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
          avatarStyle={avatarStyle}
          avatarSeed={avatarSeed}
          onQrClick={activeTab === 'vault' ? () => setIsScannerOpen(true) : undefined}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onLocationClick={activeTab === 'world' ? () => worldMapRef.current?.centerOnPlayer() : undefined}
        />
      )}
      
      <main className={cn("mx-auto relative", selectedMonster ? "w-full max-w-none" : "max-w-md")}>
        <AnimatePresence mode="popLayout">
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
            <motion.div
              key="tabs-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {activeTab === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <StatsCard 
                    caughtCount={caughtMonsters.length} 
                    playerHP={currentHP} 
                    playerXP={totalXP}
                    isXPBoosted={activeBoosts.some(b => b.type === 'xp_boost' && b.expiresAt > Date.now())}
                    isHPBoosted={activeBoosts.some(b => b.type === 'hp_regen' && b.expiresAt > Date.now())}
                  />
                  <LatestDetection lastCaught={lastCaught} onSelect={setSelectedMonster} />
                  <RecentActivity 
                    caughtMonsters={caughtMonsters} 
                    onSelect={setSelectedMonster}
                    onSeeAll={() => setActiveTab('vault')}
                  />
                  <DailyQuests 
                    caughtMonsters={caughtMonsters} 
                    dailyDistance={dailyDistance}
                    onClaimReward={handleClaimReward}
                    isXPBoosted={activeBoosts.some(b => b.type === 'xp_boost' && b.expiresAt > Date.now())}
                  />
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
                    ref={worldMapRef}
                    key="world" 
                    onCatch={setNewMonster} 
                    onStartTrade={() => setIsScannerOpen(true)}
                    playerHP={currentHP} 
                    onConsumeHP={consumeHP} 
                    onDistanceUpdate={handleMove}
                    isInteractionBlocked={!!newMonster || !!selectedMonster}
                    caughtMonsters={caughtMonsters}
                    playerName={playerName || 'Aether_Runner'}
                    avatarStyle={avatarStyle}
                    playerLevel={calculateLevel(totalXP)}
                  />
              )}

              {activeTab === 'store' && (
                <Store 
                  key="store" 
                  onActivateBoost={activateBoost} 
                  activeBoosts={activeBoosts} 
                />
              )}
            </motion.div>
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
            isXPBoosted={activeBoosts.some(b => b.type === 'xp_boost' && b.expiresAt > Date.now())}
            isStackFull={caughtMonsters.filter(m => m.id === newMonster.id).length >= 3}
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
        {isSettingsOpen && (
          <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            playerName={playerName || 'Runner'}
            onUpdateName={(name) => {
              setPlayerName(name)
              localStorage.setItem('monster_collector_player_name', name)
            }}
            onResetProgress={() => {
              localStorage.removeItem('monster_collector_caught')
              localStorage.removeItem('monster_collector_distance')
              localStorage.removeItem('monster_collector_hp')
              localStorage.removeItem('monster_collector_player_name')
              localStorage.removeItem('monster_collector_avatar_style')
              localStorage.removeItem('monster_collector_avatar_seed')
              localStorage.removeItem('monster_collector_boosts')
              localStorage.removeItem('monster_collector_xp')
              window.location.reload()
            }}
            avatarStyle={avatarStyle}
            avatarSeed={avatarSeed}
            onUpdateAvatar={(style, seed) => {
              setAvatarStyle(style)
              setAvatarSeed(seed)
              localStorage.setItem('monster_collector_avatar_style', style)
              localStorage.setItem('monster_collector_avatar_seed', seed)
            }}
          />
        )}
      </AnimatePresence>

      <GooglePayModal 
        isOpen={!!payingItem}
        onClose={() => setPayingItem(null)}
        onConfirm={() => {
          if (payingItem) {
            activateBoost(payingItem.boost)
            setPayingItem(null)
          }
        }}
        item={{
          title: payingItem?.title || '',
          price: payingItem?.price || ''
        }}
      />

      <ToastContainer 
        toasts={toasts} 
        onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} 
      />

      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-background-dark/80 backdrop-blur-xl p-6"
            onClick={() => setShowLevelUp(null)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50, rotate: -10 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 rounded-[40px] p-8 text-center overflow-hidden"
            >
              {/* Animated background elements */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 180, 270, 360],
                  opacity: [0.1, 0.3, 0.1]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 size-full flex items-center justify-center"
              >
                <div className="w-[150%] aspect-square bg-primary/20 blur-[100px] rounded-full" />
              </motion.div>

              <div className="relative z-10 flex flex-col items-center">
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="size-24 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_#0db9f2] mb-6"
                >
                  <Trophy size={48} className="text-background-dark" />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-primary font-black uppercase tracking-[0.4em] text-xs mb-2"
                >
                  Nová Úroveň Dosažena
                </motion.p>
                
                <motion.h2
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-7xl font-black text-white tracking-tighter mb-4"
                >
                  LVL {showLevelUp}
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex gap-2 mb-8"
                >
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    >
                      <Sparkles className="text-yellow-400" size={20} />
                    </motion.div>
                  ))}
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-4 bg-white text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-white/10"
                  onClick={() => setShowLevelUp(null)}
                >
                  Pokračovat
                </motion.button>
              </div>

              {/* Confetti Effect */}
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={`confetti-${i}`}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    scale: 0,
                    rotate: 0,
                    opacity: 1 
                  }}
                  animate={{ 
                    x: (Math.random() - 0.5) * 600, 
                    y: (Math.random() - 0.5) * 600,
                    scale: Math.random() * 1.5 + 0.5,
                    rotate: Math.random() * 360,
                    opacity: 0
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2, 
                    delay: 0.5 + Math.random() * 0.2,
                    ease: "easeOut"
                  }}
                  className="absolute left-1/2 top-1/2 w-2 h-2 pointer-events-none"
                  style={{ 
                    backgroundColor: ['#0db9f2', '#facc15', '#f87171', '#4ade80', '#a78bfa'][Math.floor(Math.random() * 5)],
                    borderRadius: Math.random() > 0.5 ? '50%' : '2px'
                  }}
                />
              ))}

              {/* Particle effects simplified with framer motion */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    scale: 0,
                    opacity: 1 
                  }}
                  animate={{ 
                    x: (Math.random() - 0.5) * 400, 
                    y: (Math.random() - 0.5) * 400,
                    scale: Math.random() * 2,
                    opacity: 0
                  }}
                  transition={{ 
                    duration: 1.5, 
                    delay: 0.5 + Math.random() * 0.5,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                  className="absolute left-1/2 top-1/3 size-2 bg-primary rounded-full blur-[1px] pointer-events-none"
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
