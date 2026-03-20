import { useState, useEffect, useRef, useCallback } from 'react'
import { Radar, Map as MapIcon, ShoppingBag, Sparkles, Trophy, Bluetooth, SignalHigh, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { monsterDB } from './data/monsters'
import type { Monster } from './types'
import { cn, calculateLevel } from './utils'

import { Header } from './components/Header'
import { StatsCard } from './components/StatsCard'
import { LatestDetection } from './components/LatestDetection'
import { RecentActivity } from './components/RecentActivity'
import { DailyQuests } from './components/DailyQuests'
import { NewMonsterModal } from './components/NewMonsterModal'
import { Bestiary } from './components/Bestiary'
import { MonsterDetail } from './components/MonsterDetail'
import { NavBar } from './components/NavBar'
import { PlaceholderTab } from './components/PlaceholderTab'
import { WorldMap, type WorldMapHandle } from './components/WorldMap'
import { SetupProfileModal } from './components/SetupProfileModal'
import { TradeSelectionModal } from './components/TradeSelectionModal'
import { SettingsModal } from './components/SettingsModal'
import { Store } from './components/Store'
import { MonsterEditor } from './components/MonsterEditor'
import { GooglePayModal } from './components/GooglePayModal'
import { ToastContainer, type ToastMessage } from './components/Toast'
import type { Boost } from './types'
import { sendTradeSignal, watchTradeSignals, clearTradeSignal, PLAYER_UID } from './lib/firebase'

function App() {
  const [newMonster, setNewMonster] = useState<Monster | null>(null)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [payingItem, setPayingItem] = useState<{ boost: Boost, title: string, price: string } | null>(null)

  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [activeTab, setActiveTab] = useState('home')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const worldMapRef = useRef<WorldMapHandle>(null)
  const [caughtMonsters, setCaughtMonsters] = useState<Monster[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_caught')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
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

    // Nové simulační funkce pro P2P Trade Modaly:
    (window as any).simulateP2P_IncomingRequest = (fromName = 'Tester') => {
      setP2pTrade({ step: 'INCOMING_REQ', partnerName: fromName });
      console.log(`[P2P TEST] Příchozí trade request od ${fromName}`);
    };
    
    (window as any).simulateP2P_PartnerAccepted = () => {
      setP2pTrade(prev => prev ? { ...prev, step: 'SELECTING' } : null);
      console.log(`[P2P TEST] Partner přijal žádost, vybíráme příšery.`);
    };

    (window as any).simulateP2P_PartnerOffered = (monId = '001', level = 5) => {
      const dbM = monsterDB.find(m => m.id === monId) || monsterDB[0];
      setP2pTrade(prev => prev ? { 
         ...prev, 
         theirMonster: { id: monId, level, name: dbM.name },
         step: prev.myMonster ? 'CONFIRMING' : 'WAITING_OFFER'
      } : null);
      console.log(`[P2P TEST] Partner nabízí: ${dbM.name} (LVL ${level})`);
    };

    (window as any).simulateP2P_PartnerConfirmed = () => {
      setP2pTrade(prev => prev ? { ...prev, confirmedByThem: true } : null);
      console.log(`[P2P TEST] Partner potvrdil výměnu!`);
    };

    (window as any).addTestMonster = (id = '001', level = 5) => {
      const dbM = monsterDB.find(m => m.id === id) || monsterDB[0];
      saveMonster({ ...dbM, level, image: `/monsters/${dbM.id}.png` });
      console.log(`[TEST] Přidáno: ${dbM.name} (LVL ${level})`);
    };

    return () => { 
      delete (window as any).triggerLevelUp;
      delete (window as any).simulateTradeOffer;
      delete (window as any).simulateP2P_IncomingRequest;
      delete (window as any).simulateP2P_PartnerAccepted;
      delete (window as any).simulateP2P_PartnerOffered;
      delete (window as any).simulateP2P_PartnerConfirmed;
    };
  }, [totalXP])

  type P2PTradeState = {
    step: 'REQUESTING' | 'INCOMING_REQ' | 'SELECTING' | 'WAITING_OFFER' | 'CONFIRMING';
    partnerName: string;
    partnerUid?: string;
    myMonster?: Monster;
    theirMonster?: { id: string, level: number, name: string };
    confirmedByMe?: boolean;
    confirmedByThem?: boolean;
  };
  const [p2pTrade, setP2pTrade] = useState<P2PTradeState | null>(null);

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
  const saveMonster = (monster: Monster, shouldGiveXP = true) => {
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
    
    if (shouldGiveXP) {
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
    }

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
  
  // --- FIREBASE P2P TRADE BRIDGE ---
  useEffect(() => {
    if (!playerName) return;

    // Sledování příchozích signálů
    const unsubscribe = watchTradeSignals((signal) => {
      const { type, fromUid, fromName, data } = signal;
      
      setP2pTrade(prev => {
        // 1. Žádost o výměnu (Milan -> Ghost)
        if (type === 'TRQ') {
           if (prev && prev.step !== 'INCOMING_REQ') return prev; // Už v něčem jsme
           return { step: 'INCOMING_REQ', partnerName: fromName, partnerUid: fromUid };
        }

        if (!prev || prev.partnerUid !== fromUid) return prev;

        // 2. Přijetí žádosti (Ghost -> Milan)
        if (type === 'TAC' && prev.step === 'REQUESTING') {
           return { ...prev, step: 'SELECTING' };
        }

        // 3. Nabídka příšery (Ghost -> Milan / Milan -> Ghost)
        if (type === 'TOF' && (prev.step === 'WAITING_OFFER' || prev.step === 'SELECTING' || prev.step === 'REQUESTING')) {
           const [monId, monLvl] = data.split(':');
           const dbM = monsterDB.find(m => m.id === monId) || monsterDB[0];
           const newState: P2PTradeState = { 
              ...prev, 
              theirMonster: { id: monId, level: parseInt(monLvl), name: dbM.name } 
           };
           // Pokud JÁ už mám vybráno, jdeme na potvrzení. 
           // Pokud JÁ ještě nemám vybráno, zůstávám v SELECTING (abych mohl vybrat).
           if (newState.myMonster) newState.step = 'CONFIRMING';
           else newState.step = 'SELECTING';
           return newState;
        }

        // 4. Potvrzení (Finální stisknutí tlačítka)
        if (type === 'TCF' && prev.step === 'CONFIRMING') {
           return { ...prev, confirmedByThem: true };
        }

        // 5. Zrušení
        if (type === 'CNL') {
           addToast({ title: 'Výměna zrušena', message: `${fromName} zrušil proces.`, type: 'xp' });
           return null;
        }

        return prev;
      });
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [playerName]);

  // Odesílání signálů při změně lokálního stavu
  useEffect(() => {
    if (!p2pTrade || !p2pTrade.partnerUid) return;

    const signalType = 
      p2pTrade.step === 'REQUESTING' ? 'TRQ' :
      p2pTrade.step === 'SELECTING' ? 'TAC' :
      ((p2pTrade.step === 'CONFIRMING' || p2pTrade.step === 'WAITING_OFFER') && p2pTrade.myMonster && !p2pTrade.confirmedByMe) ? 'TOF' : 
      p2pTrade.confirmedByMe ? 'TCF' : null;

    if (signalType) {
       let data = '';
       if (signalType === 'TOF' && p2pTrade.myMonster) {
          data = `${p2pTrade.myMonster.id}:${p2pTrade.myMonster.level}`;
       }
       
       sendTradeSignal(p2pTrade.partnerUid, {
          type: signalType,
          fromName: playerName,
          data
       });
    }
  }, [p2pTrade?.step, p2pTrade?.myMonster, p2pTrade?.confirmedByMe]);

  useEffect(() => {
    if (!p2pTrade) {
       // Pokud jsme manuálně zavřeli okno, můžeme poslat signál zrušení (volitelné)
       // clearTradeSignal(); // Vyčistíme naši schránku
       return;
    }
    if (p2pTrade.step === 'CONFIRMING' && p2pTrade.confirmedByMe && p2pTrade.confirmedByThem) {
      const { myMonster, theirMonster } = p2pTrade;
      if (myMonster && theirMonster) {
        const dbM = monsterDB.find(m => m.id === theirMonster.id) || monsterDB[0];
        saveMonster({ ...dbM, level: theirMonster.level, image: `/monsters/${dbM.id}.png` }, false);
        removeMonster(myMonster.id, myMonster.level);
        addToast({ title: 'Výměna dokončena!', message: `Získal jsi ${dbM.name}!`, type: 'boost' });
        // Počkej chvíli a vymaž signály
        setTimeout(() => {
          clearTradeSignal();
          setP2pTrade(null);
        }, 1500);
      }
    }
  }, [p2pTrade?.confirmedByMe, p2pTrade?.confirmedByThem]);



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
                    onStartTrade={(name, uid) => {
                      if (uid) {
                        setP2pTrade({ step: 'REQUESTING', partnerName: name || 'Hráč', partnerUid: uid });
                      }
                    }}
                    playerHP={currentHP} 
                    onConsumeHP={consumeHP} 
                    onDistanceUpdate={handleMove}
                    isInteractionBlocked={!!newMonster || !!selectedMonster}
                    caughtMonsters={caughtMonsters}
                    playerName={playerName || 'Aether_Runner'}
                    avatarStyle={avatarStyle}
                    avatarSeed={avatarSeed}
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

        {/* P2P Trade Modals */}
        {p2pTrade && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background-dark/95 backdrop-blur-md" />
            
            {p2pTrade.step === 'REQUESTING' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-sm bg-slate-900 border border-blue-500/30 rounded-3xl p-8 text-center shadow-2xl">
                <Bluetooth size={48} className="text-blue-500 animate-pulse mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase mb-2">Žádost odesána</h3>
                <p className="text-sm text-slate-400">Čekám na přijetí od hráče <strong className="text-blue-400">{p2pTrade.partnerName}</strong>...</p>
                <button onClick={() => setP2pTrade(null)} className="mt-8 px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase w-full">Zrušit</button>
              </motion.div>
            )}

            {p2pTrade.step === 'INCOMING_REQ' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-sm bg-slate-900 border border-purple-500/30 rounded-3xl p-8 text-center shadow-2xl">
                <SignalHigh size={48} className="text-purple-500 animate-bounce mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase mb-2">Výměna</h3>
                <p className="text-sm text-slate-400">Hráč <strong className="text-purple-400">{p2pTrade.partnerName}</strong> ti nabízí výměnu příšer!</p>
                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={() => setP2pTrade({ ...p2pTrade, step: 'SELECTING' })} className="px-4 py-3 rounded-xl bg-purple-600 text-white font-black uppercase shadow-lg">Přijmout</button>
                  <button onClick={() => setP2pTrade(null)} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold uppercase">Odmítnout</button>
                </div>
              </motion.div>
            )}

            {p2pTrade.step === 'WAITING_OFFER' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-sm bg-slate-900 border border-blue-500/30 rounded-3xl p-8 text-center shadow-2xl">
                <RefreshCw size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase mb-2">Čekání na nabídku</h3>
                <p className="text-sm text-slate-400">Hráč <strong className="text-blue-400">{p2pTrade.partnerName}</strong> vybírá příšeru...</p>
                <button onClick={() => setP2pTrade(null)} className="mt-8 px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase w-full">Zrušit</button>
              </motion.div>
            )}

            {p2pTrade.step === 'CONFIRMING' && p2pTrade.myMonster && p2pTrade.theirMonster && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-sm bg-slate-900 border border-orange-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-xl font-black text-center text-white uppercase mb-6">Potvrdit Výměnu</h3>
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div className="flex-1 text-center bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">Dáváš</p>
                    <img src={`/monsters/${p2pTrade.myMonster.id}.png`} className="w-16 h-16 object-contain mx-auto mix-blend-screen mb-1" alt="" />
                    <p className="text-xs font-bold text-white uppercase">{p2pTrade.myMonster.name}</p>
                    <p className="text-[10px] text-slate-400">LVL {p2pTrade.myMonster.level}</p>
                  </div>
                  <RefreshCw size={24} className="text-slate-500 shrink-0" />
                  <div className="flex-1 text-center bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                    <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-2">Dostaneš</p>
                    <img src={`/monsters/${p2pTrade.theirMonster.id}.png`} className="w-16 h-16 object-contain mx-auto mix-blend-screen mb-1" alt="" />
                    <p className="text-xs font-bold text-white uppercase">{p2pTrade.theirMonster.name}</p>
                    <p className="text-[10px] text-slate-400">LVL {p2pTrade.theirMonster.level}</p>
                  </div>
                </div>
                
                {p2pTrade.confirmedByMe ? (
                  <div className="w-full text-center py-4 rounded-xl bg-orange-500/20 border border-orange-500/30">
                    <p className="text-xs font-black text-orange-400 uppercase tracking-widest animate-pulse">Čekání na druhého hráče...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setP2pTrade({ ...p2pTrade, confirmedByMe: true })} className="px-4 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95">Dokončit</button>
                    <button onClick={() => setP2pTrade(null)} className="px-4 py-4 rounded-xl bg-slate-800 text-slate-400 font-bold uppercase transition-transform active:scale-95">Zrušit</button>
                  </div>
                )}
              </motion.div>
            )}

            {p2pTrade.step === 'SELECTING' && (
              <div className="relative w-full max-w-lg z-50">
                <TradeSelectionModal 
                  caughtMonsters={caughtMonsters}
                  onClose={() => setP2pTrade(null)}
                  onSelect={(myMonster) => {
                    setP2pTrade({
                       ...p2pTrade,
                       step: p2pTrade.theirMonster ? 'CONFIRMING' : 'WAITING_OFFER',
                       myMonster
                    });
                  }}
                />
              </div>
            )}
          </div>
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
