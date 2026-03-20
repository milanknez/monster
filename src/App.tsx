import { useState, useRef, useCallback, useEffect } from 'react'
import { Sparkles, Trophy, ShoppingBag, Bluetooth, SignalHigh, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { monsterDB } from './data/monsters'
import type { Monster, Boost } from './types'
import { cn } from './utils'

import { Header } from './components/ui/Header'
import { StatsCard } from './components/ui/StatsCard'
import { LatestDetection } from './components/dashboard/LatestDetection'
import { RecentActivity } from './components/dashboard/RecentActivity'
import { DailyQuests } from './components/dashboard/DailyQuests'
import { NewMonsterModal } from './components/modals/NewMonsterModal'
import { Bestiary } from './components/bestiary/Bestiary'
import { Inventory } from './components/inventory/Inventory'
import { MonsterDetail } from './components/bestiary/MonsterDetail'
import { NavBar } from './components/ui/NavBar'
import { PlaceholderTab } from './components/ui/PlaceholderTab'
import { WorldMap, type WorldMapHandle } from './components/map/WorldMap'
import { SetupProfileModal } from './components/modals/SetupProfileModal'
import { TradeSelectionModal } from './components/modals/TradeSelectionModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { Store } from './components/bestiary/Store'
import { MonsterEditor } from './components/bestiary/MonsterEditor'
import { GooglePayModal } from './components/modals/GooglePayModal'
import { ToastContainer } from './components/ui/Toast'

// Hooks
import { useToasts } from './hooks/useToasts'
import { useBoosts } from './hooks/useBoosts'
import { usePlayerXP } from './hooks/usePlayerXP'
import { usePlayerHP } from './hooks/usePlayerHP'
import { useMonsters } from './hooks/useMonsters'
import { useP2PTrade } from './hooks/useP2PTrade'
import { useInventory } from './hooks/useInventory'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const worldMapRef = useRef<WorldMapHandle>(null)
  
  const [newMonster, setNewMonster] = useState<Monster | null>(null)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [payingItem, setPayingItem] = useState<{ boost: Boost, title: string, price: string } | null>(null)

  const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem('monster_collector_player_name'))
  const [avatarStyle, setAvatarStyle] = useState(() => localStorage.getItem('monster_collector_avatar_style') || 'avataaars')
  const [avatarSeed, setAvatarSeed] = useState(() => localStorage.getItem('monster_collector_avatar_seed') || 'seed')
  
  const [isEditorMode, setIsEditorMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('editor') === '1'
  })

  // --- HOOKS ---
  const { toasts, addToast, removeToast } = useToasts()
  const { activeBoosts, activateBoost: baseActivateBoost } = useBoosts()
  const { inventory, addResource } = useInventory()
  
  const { 
    totalXP, 
    showLevelUp, 
    setShowLevelUp, 
    addXP, 
    handleClaimReward, 
    currentLevel 
  } = usePlayerXP(
    (() => {
      try {
        const saved = localStorage.getItem('monster_collector_xp')
        if (saved !== null) return parseInt(saved)
        const caught = localStorage.getItem('monster_collector_caught')
        if (caught) return JSON.parse(caught).length * 250
      } catch { return 0 }
      return 0
    })(),
    addToast
  )

  const { 
    currentHP, 
    consumeHP, 
    checkpointHP 
  } = usePlayerHP(
    (() => {
      try {
        const saved = localStorage.getItem('monster_collector_hp')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (typeof parsed.val === 'number' && typeof parsed.time === 'number' && !isNaN(parsed.val)) {
            return parsed
          }
        }
      } catch (e) { }
      return { val: 100, time: Date.now() }
    })(),
    activeBoosts
  )

  const { caughtMonsters, saveMonster, removeMonster } = useMonsters(addToast)
  const { p2pTrade, setP2pTrade, handleCompleteTrade } = useP2PTrade(playerName, addToast)

  const activateBoost = (boost: Boost, item?: any) => {
    if (item?.price && !payingItem) {
      setPayingItem({ boost, title: item.title, price: item.price })
      return
    }
    baseActivateBoost(boost, checkpointHP)
  }

  const [dailyDistance, setDailyDistance] = useState(() => {
    try {
      const saved = localStorage.getItem('monster_collector_distance')
      if (saved) {
        const { dist, date } = JSON.parse(saved)
        if (date === new Date().toDateString()) return dist
      }
    } catch { }
    return 0
  })

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

  // --- SIDE EFFECTS ---
  useEffect(() => {
    handleCompleteTrade((myMonster, theirMonster) => {
      const dbM = monsterDB.find(m => m.id === theirMonster.id) || monsterDB[0];
      saveMonster({ ...dbM, level: theirMonster.level, image: `/monsters/${dbM.id}.png` } as Monster, (xp) => addXP(xp), false);
      removeMonster(myMonster.id, myMonster.level);
      addToast({ title: 'Výměna dokončena!', message: `Získal jsi ${dbM.name}!`, type: 'boost' });
    });
  }, [p2pTrade?.confirmedByMe, p2pTrade?.confirmedByThem, handleCompleteTrade, saveMonster, removeMonster, addXP, addToast]);

  useEffect(() => {
    (window as any).triggerLevelUp = (lvl?: number) => setShowLevelUp(lvl || currentLevel + 1);
    (window as any).simulateP2P_IncomingRequest = (name = 'Tester') => setP2pTrade({ step: 'INCOMING_REQ', partnerName: name });
    (window as any).simulateP2P_PartnerAccepted = () => setP2pTrade(prev => prev ? { ...prev, step: 'SELECTING' } : null);
    (window as any).simulateP2P_PartnerOffered = (id = '001', lvl = 5) => {
      const dbM = monsterDB.find(m => m.id === id) || monsterDB[0];
      setP2pTrade(prev => prev ? { 
         ...prev, 
         theirMonster: { id, level: lvl, name: dbM.name },
         step: prev.myMonster ? 'CONFIRMING' : 'WAITING_OFFER'
      } : null);
    };
    (window as any).simulateP2P_PartnerConfirmed = () => setP2pTrade(prev => prev ? { ...prev, confirmedByThem: true } : null);
    (window as any).addTestMonster = (id = '001', level = 5) => {
      const dbM = monsterDB.find(m => m.id === id) || monsterDB[0];
      saveMonster({ ...dbM, level, image: `/monsters/${dbM.id}.png` } as Monster, (xp) => addXP(xp));
    };

    return () => { 
      delete (window as any).triggerLevelUp;
      delete (window as any).simulateP2P_IncomingRequest;
      delete (window as any).simulateP2P_PartnerAccepted;
      delete (window as any).simulateP2P_PartnerOffered;
      delete (window as any).simulateP2P_PartnerConfirmed;
      delete (window as any).addTestMonster;
    };
  }, [currentLevel, setP2pTrade, saveMonster, addXP, setShowLevelUp]);

  const lastCaught = caughtMonsters[0] || null

  const StoreButton = () => (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveTab('store')}
      className="mx-4 mb-6 p-4 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
      <div className="flex items-center gap-4 relative z-10">
        <div className="size-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-[0_0_15px_rgba(13,185,242,0.2)]">
          <ShoppingBag size={24} />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest opacity-80">Sektorový Obchod</p>
          <h3 className="text-lg font-black text-white uppercase italic leading-tight">Získat Boosty</h3>
        </div>
      </div>
      <div className="size-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors relative z-10">
        <Sparkles size={16} className="group-hover:animate-spin-slow" />
      </div>
    </motion.button>
  )

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

  const handleGather = (type: any, amount: number) => {
    addResource(type, amount)
    addToast({
      title: 'Surovina získána',
      message: `${amount}x ${type} přidáno do inventáře`,
      type: 'boost'
    })
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
          title={activeTab === 'vault' ? "Bestiář" : activeTab === 'inventory' ? "Inventář" : activeTab === 'world' ? "Mapa světa" : activeTab === 'store' ? "Sektorový Obchod" : playerName || "Aether_Runner"} 
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
                  <StoreButton />
                  <LatestDetection lastCaught={lastCaught} onSelect={setSelectedMonster} />
                  <RecentActivity 
                    caughtMonsters={caughtMonsters} 
                    onSelect={setSelectedMonster}
                    onSeeAll={() => setActiveTab('vault')}
                  />
                  <DailyQuests 
                    caughtMonsters={caughtMonsters} 
                    dailyDistance={dailyDistance}
                    onClaimReward={(xp) => handleClaimReward(xp, activeBoosts)}
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

              {activeTab === 'inventory' && (
                <Inventory 
                  key="inventory" 
                  activeBoosts={activeBoosts}
                  inventory={inventory}
                />
              )}

               {activeTab === 'world' && (
                  <WorldMap 
                    ref={worldMapRef}
                    key="world" 
                    onCatch={(m) => {
                      if (saveMonster(m, (xp) => addXP(xp))) {
                        setNewMonster(null)
                      }
                    }} 
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
                    playerLevel={currentLevel}
                    onGather={handleGather}
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
              localStorage.clear();
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
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-sm bg-slate-900 border border-blue-500/30 rounded-3xl p-8 text-center shadow-2xl">
                <Bluetooth size={48} className="text-blue-500 animate-pulse mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase mb-2">Žádost odesána</h3>
                <p className="text-sm text-slate-400">Čekám na přijetí od hráče <strong className="text-blue-400">{p2pTrade.partnerName}</strong>...</p>
                <button onClick={() => setP2pTrade(null)} className="mt-8 px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase w-full">Zrušit</button>
              </motion.div>
            )}

            {p2pTrade.step === 'INCOMING_REQ' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-sm bg-slate-900 border border-purple-500/30 rounded-3xl p-8 text-center shadow-2xl">
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
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-sm bg-slate-900 border border-blue-500/30 rounded-3xl p-8 text-center shadow-2xl">
                <RefreshCw size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase mb-2">Čekání na nabídku</h3>
                <p className="text-sm text-slate-400">Hráč <strong className="text-blue-400">{p2pTrade.partnerName}</strong> vybírá příšeru...</p>
                <button onClick={() => setP2pTrade(null)} className="mt-8 px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase w-full">Zrušit</button>
              </motion.div>
            )}

            {p2pTrade.step === 'CONFIRMING' && p2pTrade.myMonster && p2pTrade.theirMonster && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-sm bg-slate-900 border border-orange-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden">
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
        onRemove={removeToast} 
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

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-4 bg-white text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-white/10"
                  onClick={() => setShowLevelUp(null)}
                >
                  Pokračovat
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

export default App
