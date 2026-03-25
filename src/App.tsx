import { useState, useRef, useCallback, useEffect } from 'react'
import { Sparkles, Trophy, ShoppingBag, Bluetooth, SignalHigh, RefreshCw, Sword } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { monsterDB } from './data/monsters'
import type { Monster, Boost, Recipe, ResourceType } from './types'
import { cn } from './utils'
import { RESOURCE_CONFIG } from './components/map/mapUtils'

import { Header } from './components/ui/Header'
import { StatsCard } from './components/ui/StatsCard'
import { LatestDetection } from './components/dashboard/LatestDetection'
import { RecentActivity } from './components/dashboard/RecentActivity'
import { DailyQuests } from './components/dashboard/DailyQuests'
import { NewMonsterModal } from './components/modals/NewMonsterModal'
import { Bestiary } from './components/bestiary/Bestiary'
import { Inventory } from './components/inventory/Inventory'
import { Laboratory } from './components/codex/Codex'
import { MonsterDetail } from './components/bestiary/MonsterDetail'
import { Battle } from './components/battle/Battle'
import { NavBar } from './components/ui/NavBar'
import { PlaceholderTab } from './components/ui/PlaceholderTab'
import { WorldMap, type WorldMapHandle } from './components/map/WorldMap'
import { SetupProfileModal } from './components/modals/SetupProfileModal'
import { TradeSelectionModal } from './components/modals/TradeSelectionModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { Store } from './components/bestiary/Store'
import { SystemEditor } from './components/admin/SystemEditor'
import { GooglePayModal } from './components/modals/GooglePayModal'
import { DuelSelectionModal } from './components/modals/DuelSelectionModal'
import { ToastContainer } from './components/ui/Toast'

// Hooks
import { useToasts } from './hooks/useToasts'
import { useBoosts } from './hooks/useBoosts'
import { usePlayerXP } from './hooks/usePlayerXP'
import { usePlayerHP } from './hooks/usePlayerHP'
import { useMonsters } from './hooks/useMonsters'
import { useP2PTrade } from './hooks/useP2PTrade'
import { useInventory } from './hooks/useInventory'
import { useP2PDuel } from './hooks/useP2PDuel'
import { sendTradeSignal } from './lib/firebase'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const worldMapRef = useRef<WorldMapHandle>(null)

  const [newMonster, setNewMonster] = useState<Monster | null>(null)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [wildEncounter, setWildEncounter] = useState<Monster | null>(null)
  const [activeBattle, setActiveBattle] = useState<{ enemy: Monster, playerIdx: number, opponentName?: string, opponentUid?: string, pvpRole?: 'challenger' | 'defender' } | null>(null)
  const [payingItem, setPayingItem] = useState<{ boost: Boost, title: string, price: string } | null>(null)

  // Duel selection state
  const [duelPendingChallenge, setDuelPendingChallenge] = useState<{ uid: string, name: string } | null>(null)
  const [isDuelAcceptingPicker, setIsDuelAcceptingPicker] = useState(false)

  const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem('monster_collector_player_name'))
  const [avatarStyle, setAvatarStyle] = useState(() => localStorage.getItem('monster_collector_avatar_style') || 'avataaars')
  const [avatarSeed, setAvatarSeed] = useState(() => localStorage.getItem('monster_collector_avatar_seed') || 'seed')

  const [isEditorMode, setIsEditorMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('editor') === '1'
  })

  // --- HOOKS ---
  const { toasts, addToast, removeToast } = useToasts()
  const { activeBoosts, activateBoost: baseActivateBoost } = useBoosts()
  const { inventory, addResource, consumeResources, swapItems, discardItem } = useInventory()
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
    checkpointHP,
    healHP
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


  const { caughtMonsters, saveMonster, removeMonster, giveMonsterXP, updateMonsterHP, equipGem } = useMonsters(addToast);

  // Synchronize selectedMonster with caughtMonsters (for regeneration & updates)
  useEffect(() => {
    if (selectedMonster) {
      const updated = caughtMonsters.find(m => 
        (m as any).caughtAt === (selectedMonster as any).caughtAt && m.id === selectedMonster.id
      );
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedMonster)) {
        setSelectedMonster(updated);
      }
    }
  }, [caughtMonsters, selectedMonster]);

  const { p2pTrade, setP2pTrade, handleCompleteTrade } = useP2PTrade(playerName, addToast)
  const activeMonster = caughtMonsters[0] || null
  const { duel, setDuel, sendChallenge, notifyAccept, pickMyFighter, rejectChallenge, cancelChallenge, sendEmote, incomingEmote, incomingAttack, incomingExit } = useP2PDuel(playerName, activeMonster, addToast, activeBattle?.opponentUid)
  
  // Handle opponent exiting battle
  useEffect(() => {
    if (incomingExit && activeBattle) {
      setActiveBattle(null);
      addToast({ title: 'Soupeř opustil duel', message: `${incomingExit} zbaběle utekl!`, type: 'info' });
    }
  }, [incomingExit, activeBattle]);

  // DEV TOOLS & CHEATS
  useEffect(() => {
    (window as any).addGems = () => {
      const items = [
        { type: 'gem_red_1', count: 5 },
        { type: 'gem_red_4', count: 2 },
        { type: 'gem_green_1', count: 5 },
        { type: 'gem_green_4', count: 2 },
        { type: 'gem_white_1', count: 5 },
        { type: 'gem_white_4', count: 3 },
        { type: 'mineral', count: 50 },
        { type: 'super_mineral', count: 20 },
        { type: 'magic_crystal', count: 20 },
        { type: 'crystal', count: 100 },
        { type: 'hp_potion', count: 20 },
      ];
      items.forEach(item => addResource(item.type as any, item.count));
      addToast({ title: '📦 Dev balíček doručen!', message: 'Inventář byl naplněn gemy a surovinami.', type: 'success' });
    };

    (window as any).giveXP = (amt = 1000) => {
      giveMonsterXP(0, amt);
    };

    (window as any).addMonster = (mId: string, lvl = 5) => {
      const base = monsterDB.find(m => m.id === mId) || monsterDB[0];
      const monsterToSave = { 
        ...base, 
        level: lvl, 
        caughtAt: Date.now(), 
        totalXP: 0, 
        currentHP: base.stats?.hp || 100,
        image: `/monsters/${base.id}.png`,
        gems: [null, null, null]
      };
      saveMonster(monsterToSave as any, () => {});
      addToast({ title: '🧬 Monstrum přidáno!', message: `${base.name} (Lv.${lvl}) se připojilo k tobě!`, type: 'success' });
    };

    (window as any).forceWildEncounter = () => {
       const wildEnemy: Monster = {
         id: 'obsidian_golem',
         level: 7,
         caughtAt: 0,
         totalXP: 0,
         name: 'Obsidiánový Golem',
         rarity: 'epic',
         type: 'Kamenná',
         image: '',
         description: 'Testovací boss pro odchyt.',
         stats: { hp: 150, attack: 45, defense: 30 }
       };
       setWildEncounter(wildEnemy);
       addToast({ title: 'Simulace!', message: 'Byl vyvolán divoký golem k otestování chytání.', type: 'info' });
    };

    (window as any).healMe = () => {
       healHP(999);
       if (caughtMonsters.length > 0) {
         updateMonsterHP(0, 999);
       }
       if (selectedMonster) {
         const idx = caughtMonsters.findIndex(m => 
           (m as any).caughtAt === (selectedMonster as any).caughtAt && m.id === selectedMonster.id
         );
         if (idx !== -1 && idx !== 0) {
            updateMonsterHP(idx, 999);
         }
       }
       addToast({ title: 'Vyléčen!', message: 'Plná energie pro tebe i tvého parťáka.', type: 'success' });
    };

    return () => {
      delete (window as any).addGems;
      delete (window as any).giveXP;
      delete (window as any).addMonster;
      delete (window as any).forceWildEncounter;
      delete (window as any).healMe;
    };
  }, [addResource, giveMonsterXP, saveMonster, addToast, caughtMonsters, healHP, updateMonsterHP, selectedMonster]);

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

  // --- ACTIONS ---
  const handleCraft = (recipe: Recipe) => {
    const success = consumeResources(recipe.requirements);
    if (success) {
      addResource(recipe.result.id as any, recipe.result.amount);
      addToast({
        title: 'Crafting dokončen!',
        message: `Předmět ${recipe.name} byl přidán do tvého inventáře.`,
        type: 'success'
      });
    } else {
      addToast({ title: 'Chyba', message: 'Nedostatek surovin!', type: 'error' });
    }
  };

  const handleUseItem = (type: any) => {
    const success = consumeResources([{ type, count: 1 }]);
    if (!success) {
      addToast({ title: 'Chyba', message: 'Tento předmět už nemáš!', type: 'info' });
      return;
    }

    switch (type) {
      case 'xp_booster':
        activateBoost({ type: 'xp_boost', multiplier: 2, expiresAt: Date.now() + 30 * 60 * 1000 });
        addToast({ title: 'Boost aktivován!', message: 'Získáváš 2x XP po dobu 30 minut.', type: 'boost' });
        break;
      case 'hp_potion':
        healHP(50);
        if (caughtMonsters.length > 0) updateMonsterHP(0, 50);
        activateBoost({ type: 'hp_regen', multiplier: 2, expiresAt: Date.now() + 15 * 60 * 1000 });
        addToast({ title: 'Lékárnička použita!', message: 'Okamžitě vyléčeno 50 HP (ty i monstrum) a zvýšena regenerace.', type: 'success' });
        break;
      case 'energy_drink':
        addToast({ title: 'Energy Drink!', message: 'Cítíš se skvěle! Tvoje energie byla plně obnovena.', type: 'info' });
        break;
    }
  };

  const handleStartBattle = (enemy: Monster, opponentName?: string, opponentUid?: string, mySelectedMonster?: Monster, pvpRole?: 'challenger' | 'defender') => {
    if (caughtMonsters.length === 0) {
      addToast({ title: 'Nemáš monstrum', message: 'Musíš si nejdříve chytit své první monstrum!', type: 'info' });
      return;
    }

    let pIdx = -1;
    if (mySelectedMonster) {
      // Find the exact monster player picked based on ID and level
      pIdx = caughtMonsters.findIndex(m => m.id === mySelectedMonster.id && m.level === mySelectedMonster.level);
      if (pIdx === -1) pIdx = caughtMonsters.findIndex(m => m.id === mySelectedMonster.id); // fallback
    }

    if (pIdx === -1) {
      pIdx = caughtMonsters.findIndex(m => (m.currentHP === undefined || m.currentHP > 0)); // fallback to first alive
    }

    if (pIdx === -1) {
      addToast({ title: 'Mrtvá monstra', message: 'Všechna tvá monstra jsou unavená. Musíš je vylečit!', type: 'error' });
      return;
    }
    setActiveBattle({ enemy, playerIdx: pIdx, opponentName, opponentUid, pvpRole });
  };

  const handleBattleWin = (xp: number, loot: { type: any, count: number }[]) => {
    if (!activeBattle) return;

    // 1. Award XP to the monster that fought
    giveMonsterXP(activeBattle.playerIdx, xp);

    // 2. Add loot collected from the interactive modal
    loot.forEach(l => {
      addResource(l.type, l.count);
    });

    // 3. Award some global XP to player
    addXP(25);

    setActiveBattle(null);

    // Group loot for nicer toast display
    const groupedLoot = loot.reduce((acc: Record<string, number>, item) => {
      acc[item.type] = (acc[item.type] || 0) + item.count;
      return acc;
    }, {});

    const lootMsg = Object.entries(groupedLoot).map(([type, count]) => {
      const label = RESOURCE_CONFIG[type as any]?.label || type;
      return `${count}x ${label}`;
    }).join(', ');

    if (activeBattle.pvpRole) {
      addToast({
        title: 'Vítězství!',
        message: `Porazil jsi soupeře! Tvůj parťák získal ${xp} XP a kořist: ${lootMsg || 'nic'}.`,
        type: 'success'
      });
    }
  };

  const handleGather = (type: ResourceType, amount: number) => {
    addResource(type, amount)
    addToast({
      title: 'Surovina získána',
      message: `${amount}x ${type} přidáno do inventáře`,
      type: 'boost'
    })
  }

  // --- SIDE EFFECTS ---
  useEffect(() => {
    if (duel?.step === 'READY' && duel.opponentMonster) {
      handleStartBattle(duel.opponentMonster, duel.partnerName, duel.partnerUid, duel.myMonster, duel.role);
      setDuel(null);
    }
  }, [duel?.step, duel?.opponentMonster, duel?.myMonster, duel?.role, handleStartBattle, setDuel]);

  useEffect(() => {
    if (p2pTrade?.step === 'CONFIRMING' && p2pTrade.confirmedByMe && p2pTrade.confirmedByThem) {
      handleCompleteTrade((myMonster, theirMonster) => {
        const dbM = monsterDB.find(m => m.id === theirMonster.id) || monsterDB[0];
        removeMonster(myMonster.id, (myMonster as any).caughtAt);
        saveMonster({ ...dbM, level: theirMonster.level, image: `/monsters/${dbM.id}.png` } as Monster, (xp) => addXP(xp), false);
        addToast({ title: 'Výměna dokončena!', message: `Získal jsi ${dbM.name}!`, type: 'success' });
        // Immediately clear state to prevent double execution
        setP2pTrade(null);
      });
    }
  }, [p2pTrade?.confirmedByMe, p2pTrade?.confirmedByThem, p2pTrade?.step, handleCompleteTrade, saveMonster, removeMonster, addXP, addToast, setP2pTrade]);

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
    (window as any).simulateGather = (type: any = 'crystal', amount: number = 5) => {
      handleGather(type, amount);
    };
    (window as any).simulateBattle = (id = '001') => {
      const dbM = monsterDB.find(m => m.id === id) || monsterDB[0];
      if (caughtMonsters.length === 0) {
        saveMonster({ ...dbM, level: 5, image: `/monsters/${dbM.id}.png` } as Monster, (xp) => addXP(xp));
      }
      setTimeout(() => {
        handleStartBattle({ ...dbM, level: 5, image: `/monsters/${dbM.id}.png` } as Monster);
      }, 100);
    };

    return () => {
      delete (window as any).triggerLevelUp;
      delete (window as any).simulateP2P_IncomingRequest;
      delete (window as any).simulateP2P_PartnerAccepted;
      delete (window as any).simulateP2P_PartnerOffered;
      delete (window as any).simulateP2P_PartnerConfirmed;
      delete (window as any).addTestMonster;
      delete (window as any).simulateGather;
      delete (window as any).simulateBattle;
    };
  }, [currentLevel, setP2pTrade, saveMonster, addXP, setShowLevelUp, handleGather, handleStartBattle, caughtMonsters]);

  const lastCaught = caughtMonsters[0] || null

  const StoreButton = () => (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveTab('store')}
      className="w-full mb-6 p-4 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
      <div className="flex items-center gap-4 relative z-10">
        <div className="size-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-[0_0_15px_rgba(13,185,242,0.2)]">
          <ShoppingBag size={24} />
        </div>
        <div className="text-left w-full">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest opacity-80">Sektorový Obchod</p>
          <h3 className=" text-lg font-black text-white uppercase italic leading-tight">Aktivovat Boosty & XP</h3>
        </div>
      </div>
      <div className="size-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors relative z-10">
        <Sparkles size={16} className="group-hover:animate-spin-slow" />
      </div>
    </motion.button>
  )

  if (isEditorMode) {
    return (
      <SystemEditor onBack={() => {
        window.history.pushState({}, '', window.location.pathname);
        setIsEditorMode(false);
      }} />
    )
  }

  return (
    <div className="min-h-screen font-display pb-32">
      <AnimatePresence>
        {activeBattle && (
          <Battle
            key="battle-overlay"
            playerMonster={caughtMonsters[activeBattle.playerIdx]}
            enemyMonster={activeBattle.enemy}
            opponentName={activeBattle.opponentName}
            pvpRole={activeBattle.pvpRole}
            incomingEmote={incomingEmote}
            incomingAttack={incomingAttack}
            inventory={inventory.filter(i => i !== null) as any}
            onUseItem={(type) => {
               if (type === 'hp_potion') {
                  healHP(50);
                  if (caughtMonsters.length > 0) updateMonsterHP(activeBattle.playerIdx, 50);
                  addToast({ title: 'Lékárnička použita v boji!', message: 'Léčí tě i monstrum (50 HP).', type: 'success' });
                  consumeResources([{ type: 'hp_potion', count: 1 }]);
               } else if (type === 'energy_drink') {
                  addToast({ title: 'Energy Drink v boji!', message: 'Tvoje energie byla posílena o 60%!', type: 'success' });
                  consumeResources([{ type: 'energy_drink', count: 1 }]);
               }
            }}
            onSendEmote={(emote) => {
              if (activeBattle.opponentUid) {
                sendTradeSignal(activeBattle.opponentUid, { type: 'DEM', fromName: playerName || 'Neznámý', data: emote });
              }
            }}
            onSendAttack={(attackData) => {
              if (activeBattle.opponentUid) {
                sendTradeSignal(activeBattle.opponentUid, { type: 'DAT', fromName: playerName || 'Neznámý', data: JSON.stringify(attackData) });
              }
            }}
            onWin={handleBattleWin}
            onLose={(xp) => {
              updateMonsterHP(activeBattle.playerIdx, -999);
              if (!activeBattle.pvpRole) {
                // Přidání XP pro prohru v PVE
                giveMonsterXP(activeBattle.playerIdx, xp);
                addToast({ title: 'Těsná prohra', message: `Tvé monstrum se sice vyčerpalo, ale získává ${xp} XP za zkušenosti ze zápasu!`, type: 'info' });
              } else {
                addToast({ title: 'Prohra', message: 'Tvé monstrum bylo poraženo v duelu.', type: 'error' });
              }
              setActiveBattle(null);
              setActiveTab('home');
            }}
            onCatch={(monster) => {
               saveMonster({ ...monster, currentHP: undefined, totalXP: 0 }, (xp) => {
                 setNewMonster(monster);
                 addXP(xp);
               });
               setActiveBattle(null);
            }}
            onCatchFail={() => {
               addToast({ title: 'Uniklo to!', message: 'Monstrum se vysmeklo. Zkus mu ubrat více HP!', type: 'info' });
            }}
            onBack={() => {
              if (activeBattle.opponentUid) {
                sendTradeSignal(activeBattle.opponentUid, { type: 'DCN', fromName: playerName || 'Neznámý', data: '' });
              }
              setActiveBattle(null);
            }}
          />
        )}
      </AnimatePresence>

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
          title={
            activeTab === 'vault' ? "Bestiář" :
              activeTab === 'inventory' ? "Inventář" :
                activeTab === 'world' ? "Mapa světa" :
                  activeTab === 'store' ? "Obchod" :
                    activeTab === 'codex' ? "Laboratoř" :
                      playerName || "Runner"
          }
          showBack={activeTab !== 'home'}
          onBack={() => {
            if (activeTab === 'codex') setActiveTab('inventory')
            else setActiveTab('home')
          }}
          playerName={playerName || 'Runner'}
          avatarStyle={avatarStyle}
          avatarSeed={avatarSeed}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onLocationClick={activeTab === 'world' ? () => worldMapRef.current?.centerOnPlayer() : undefined}
        />
      )}

      <main className="mx-auto relative w-full max-w-md md:max-w-lg">
        <AnimatePresence mode="popLayout">
          {selectedMonster ? (
            <MonsterDetail
              key="detail"
              monster={selectedMonster}
              onBack={() => setSelectedMonster(null)}
              inventory={inventory}
              onUsePotion={(type: string) => {
                const idx = caughtMonsters.findIndex(m => (m as any).caughtAt === (selectedMonster as any).caughtAt);
                if (idx !== -1) {
                   if (type === 'hp_potion') {
                      updateMonsterHP(idx, 100); 
                      consumeResources([{ type: 'hp_potion', count: 1 }]);
                      addToast({ title: 'Monster uzdraveno', message: 'Lektvar fungoval skvěle!', type: 'success' });
                   }
                }
              }}
              onEquipGem={(gemIdx, type) => {
                const idx = caughtMonsters.findIndex(m => (m as any).caughtAt === (selectedMonster as any).caughtAt);
                if (idx !== -1) {
                   const oldGem = caughtMonsters[idx].gems?.[gemIdx];
                   
                   equipGem(idx, gemIdx, type);
                   // Update visual state
                   const newGems = [...(caughtMonsters[idx].gems || [null, null, null])];
                   newGems[gemIdx] = type;
                   const updated = { ...caughtMonsters[idx], gems: newGems };
                   setSelectedMonster(updated);

                   if (type) consumeResources([{ type: type as any, count: 1 }]);
                   if (oldGem) addResource(oldGem as any, 1);
                   
                   addToast({ 
                      title: type ? 'Drahokam zasazen' : 'Drahokam vyjmut', 
                      message: type ? 'Staty monstra byly posíleny!' : 'Staty se vrátily do normálu.',
                      type: 'success' 
                   });
                }
              }}
              onRelease={() => {
                const idx = caughtMonsters.findIndex(m => 
                  ((m as any).caughtAt === (selectedMonster as any).caughtAt) && 
                  (m.id === selectedMonster.id)
                );
                if (idx !== -1) {
                  removeMonster(selectedMonster.id, (selectedMonster as any).caughtAt);
                  setSelectedMonster(null);
                  addToast({ title: 'Vypuštěno', message: `${selectedMonster.name} bylo propuštěno zpět do divočiny.`, type: 'info' });
                } else {
                   // Fallback if caughtAt is missing for some reason
                   const fallbackIdx = caughtMonsters.findIndex(m => m.id === selectedMonster.id);
                   if (fallbackIdx !== -1) {
                      removeMonster(selectedMonster.id);
                      setSelectedMonster(null);
                      addToast({ title: 'Vypuštěno', message: `${selectedMonster.name} bylo propuštěno.`, type: 'info' });
                   }
                }
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

              {activeTab === 'codex' && (
              <motion.div
                key="codex"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Laboratory
                  inventory={inventory}
                  onCraft={handleCraft}
                />
              </motion.div>
            )}

              {activeTab === 'inventory' && (
                <Inventory
                  key="inventory"
                  activeBoosts={activeBoosts}
                  inventory={inventory}
                  onOpenCodex={() => setActiveTab('codex')}
                  onSwap={swapItems}
                  onUseItem={handleUseItem}
                  onDiscard={discardItem}
                />
              )}

              {activeTab === 'world' && (
                <WorldMap
                  ref={worldMapRef}
                  key="world"
                  onCatch={(m) => {
                    if (caughtMonsters.length === 0) {
                      saveMonster(m, (xp) => {
                        addXP(xp);
                        setNewMonster(m);
                      });
                    } else {
                      setWildEncounter(m);
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
                  isInteractionBlocked={!!newMonster || !!selectedMonster || !!activeBattle}
                  caughtMonsters={caughtMonsters}
                  playerName={playerName || 'Aether_Runner'}
                  avatarStyle={avatarStyle}
                  avatarSeed={avatarSeed}
                  playerLevel={currentLevel}
                  activeMonster={caughtMonsters[0] || null}
                  onGather={handleGather}
                  onStartDuel={(name, uid) => {
                    if (uid) sendChallenge(uid, name || 'Runner');
                  }}
                  addToast={addToast}
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

      <NavBar active={activeTab === 'codex' ? 'inventory' : activeTab} onTabChange={(tab) => {
        setSelectedMonster(null)
        setActiveTab(tab)
      }} />

      <AnimatePresence>
        {newMonster && (
          <NewMonsterModal
            monster={newMonster}
            onClose={() => setNewMonster(null)}
            onAdd={() => setNewMonster(null)}
            isXPBoosted={activeBoosts.some(b => b.type === 'xp_boost' && b.expiresAt > Date.now())}
            isStackFull={caughtMonsters.filter(m => m.id === newMonster.id).length >= 3}
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

        {/* Duel Modals */}
         {wildEncounter && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <DuelSelectionModal
                caughtMonsters={caughtMonsters}
                opponent={wildEncounter}
                title="Výběr pro bitvu"
                description="Zvolte svého šampiona pro divoký střet. Pamatujte, že k boji je potřeba alespoň 80% životů!"
                onClose={() => setWildEncounter(null)}
                onSelect={(m) => {
                  setWildEncounter(null);
                  handleStartBattle(wildEncounter, undefined, undefined, m);
                }}
              />
          </div>
        )}

        {duel && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            {duel.step === 'WAITING_ACCEPT' && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center">
                <Sword size={48} className="text-red-500 animate-pulse mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase">Výzva odeslána</h3>
                <p className="text-sm text-slate-400 mt-2">Čekám na přijetí od hráče <strong className="text-red-400">{duel.partnerName}</strong>...</p>
                <button onClick={cancelChallenge} className="mt-8 w-full py-3 bg-slate-800 text-slate-400 font-bold rounded-xl uppercase">Zrušit</button>
              </motion.div>
            )}

            {duel.step === 'INCOMING' && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-slate-900 border border-red-500/50 rounded-3xl p-8 text-center shadow-2xl">
                <Sword size={48} className="text-red-500 animate-bounce mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase">Vyzván na Souboj!</h3>
                <p className="text-sm text-slate-400 mt-2">Hráč <strong className="text-red-400">{duel.partnerName}</strong> tě vyzývá na duel!</p>
                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={() => {
                    notifyAccept();
                  }} className="py-4 bg-red-600 text-white font-black rounded-xl uppercase text-xs">PŘIJMOUT</button>
                  <button onClick={rejectChallenge} className="py-4 bg-slate-800 text-slate-400 font-black rounded-xl uppercase text-xs">ODMITNOUT</button>
                </div>
              </motion.div>
            )}

            {duel.step === 'PICKING' && (
              <DuelSelectionModal
                caughtMonsters={caughtMonsters}
                opponent={duel.opponentMonster}
                onClose={cancelChallenge}
                onSelect={(m) => pickMyFighter(m)}
              />
            )}

            {duel.step === 'WAITING_OPPONENT_PICK' && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center">
                <RefreshCw size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase italic">Čekám na soupeře...</h3>
                <p className="text-sm text-slate-400 mt-2">Už máš vybráno, teď se rozhoduje <strong className="text-red-400">{duel.partnerName}</strong>.</p>
              </motion.div>
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
      
      {/* New Monster Celebration Modal */}
      <AnimatePresence>
        {newMonster && (
          <NewMonsterModal 
            monster={newMonster} 
            onClose={() => setNewMonster(null)}
            onAdd={(m) => {
              // We've already saved it in handleBattleWin or onCatch
              setNewMonster(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
