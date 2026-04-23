import { useState, useRef, useCallback, useEffect } from 'react'
import { Sparkles, Trophy, ShoppingBag, Bluetooth, SignalHigh, RefreshCw, Sword, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TutorialOverlay, BATTLE_TUTORIAL_STEPS, HOME_TUTORIAL_STEPS, WORLD_TUTORIAL_STEPS, COLLECTION_TUTORIAL_STEPS, INVENTORY_TUTORIAL_STEPS, CODEX_TUTORIAL_STEPS } from './components/battle/TutorialOverlay'
import { monsterDB } from './data/monsters'
import type { Monster, Boost, Recipe, ResourceType } from './types'
import { cn, getTotalXPForLevel, calculateLevel, calculateBoostMultiplier } from './utils'
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
import { pickLevel, pickMonster } from './components/map/mapUtils'
import { Store } from './components/bestiary/Store'
import { SystemEditor } from './components/admin/SystemEditor'
import { GooglePayModal } from './components/modals/GooglePayModal'
import { DuelSelectionModal } from './components/modals/DuelSelectionModal'
import { ToastContainer } from './components/ui/Toast'
import { DebugBar } from './components/ui/DebugBar'

// Hooks
import { useToasts } from './hooks/useToasts'
import { useBoosts } from './hooks/useBoosts'
import { usePlayerXP } from './hooks/usePlayerXP'
import { usePlayerHP } from './hooks/usePlayerHP'
import { useMonsters } from './hooks/useMonsters'
import { useP2PTrade } from './hooks/useP2PTrade'
import { useInventory } from './hooks/useInventory'
import { useP2PDuel } from './hooks/useP2PDuel'
import { App as CapApp } from '@capacitor/app';
import {
  auth,
  db,
  update,
  ref,
  onAuthStateChanged,
  saveUserBackup,
  loadUserBackup,
  registerReferral,
  logout,
  signInWithGoogle,
  syncPlayerToFirebase,
  sendTradeSignal,
  PLAYER_UID,
  syncReferralProgress,
  checkEmailInvitation,
  watchReferrals,
  claimReferralReward,
  deleteReferral
} from './lib/firebase'
import { User as FirebaseUser } from 'firebase/auth'

import { InviteModal } from './components/modals/InviteModal'
import { ReferralList, type ReferralEntry } from './components/referrals/ReferralList'
import { SoundProvider } from './context/SoundContext'
import { initNotifications, scheduleTestNotification } from './lib/notifications'

function AppContent() {
  const [activeTab, setActiveTab] = useState('home')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const worldMapRef = useRef<WorldMapHandle>(null)

  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userUid, setUserUid] = useState<string>(PLAYER_UID)
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])

  const [newMonster, setNewMonster] = useState<Monster | null>(null)
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)
  const [wildEncounter, setWildEncounter] = useState<{ monster: Monster, spawnId?: string, rarity?: string } | null>(null)
  const [activeBattle, setActiveBattle] = useState<{ enemy: Monster, playerIdx: number, opponentName?: string, opponentUid?: string, pvpRole?: 'challenger' | 'defender', spawnId?: string } | null>(null)
  const [payingItem, setPayingItem] = useState<{ id: string, boost: Boost, title: string, price: string } | null>(null)
  const [isSpeedLimitDisabled, setIsSpeedLimitDisabled] = useState(() => localStorage.getItem('monster_debug_no_speed') === 'true')
  const [currentPosition, setCurrentPosition] = useState<{ lat: number, lng: number } | null>(() => {
    const saved = localStorage.getItem('monster_last_pos');
    return saved ? JSON.parse(saved) : null;
  });

  // Duel selection state
  const [duelPendingChallenge, setDuelPendingChallenge] = useState<{ uid: string, name: string } | null>(null)
  const [isDuelAcceptingPicker, setIsDuelAcceptingPicker] = useState(false)

  const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem('monster_collector_player_name'))
  const [playerEmail, setPlayerEmail] = useState<string | null>(() => localStorage.getItem('monster_collector_player_email'))
  const [avatarStyle, setAvatarStyle] = useState(() => localStorage.getItem('monster_collector_avatar_style') || 'avataaars')
  const [avatarSeed, setAvatarSeed] = useState(() => localStorage.getItem('monster_collector_avatar_seed') || 'seed')
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const s = localStorage.getItem('monster_collector_last_sync');
    return s ? parseInt(s) : null;
  })

  const [isEditorMode, setIsEditorMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('editor') === '1'
  })

  const [isDebugMode, setIsDebugMode] = useState(false)
  const [curTutorialStep, setCurTutorialStep] = useState(0)
  const [tutorialType, setTutorialType] = useState<'home' | 'world' | 'collection' | 'inventory' | 'codex' | null>(null)
  const [avatarClickCount, setAvatarClickCount] = useState(0)
  const [lastAvatarClick, setLastAvatarClick] = useState(0)
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [unlockedQuests, setUnlockedQuests] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('monster_collector_unlocked_quests');
      if (saved) {
        const { ids } = JSON.parse(saved);
        return ids;
      }
    } catch { }
    return [1, 2, 3]; // Základní úkoly
  });
  const [isBatterySaver, setIsBatterySaver] = useState(() => localStorage.getItem('monster_battery_saver') === 'true')
  const [mapTheme, setMapTheme] = useState<'day' | 'night'>(() => (localStorage.getItem('monster_map_theme') as any) || 'night')
  const [isMapAutoTheme, setIsMapAutoTheme] = useState(() => localStorage.getItem('monster_map_auto_theme') === 'true') // Default false

  const handleAvatarClick = () => {
    setIsSettingsOpen(true);
  };

  const handleCheat = (cheatId: string) => {
    if (cheatId?.startsWith('addMonster:')) {
      const id = cheatId.split(':')[1];
      (window as any).addMonster?.(id);
    } else if (cheatId === 'healMe') {
      (window as any).healMe?.();
    } else if (cheatId === 'addGems') {
      (window as any).addGems?.();
    } else if (cheatId === 'giveXP') {
      (window as any).giveXP?.(5000);
    } else if (cheatId === 'playerXP200') {
      const newXP = totalXP + 200;
      addXP(200);
      if (userUid) {
        update(ref(db, `users/${userUid}`), { currentLevel: calculateLevel(newXP), totalXP: newXP });
      }
      addToast({ title: 'XP Gained', message: 'Získal jsi +200 XP a data byla synchronizována.', type: 'xp' });
    } else if (cheatId?.startsWith('spawn:')) {
      const rarity = cheatId.split(':')[1] as any;
      setActiveTab('world');
      setTimeout(() => {
        if ((window as any).spawnCustomMonster) {
          const seed = 'debug_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
          // Použijeme pickMonster, který správně filtruje rarity (Běžná, Epická...)
          const mId = (pickMonster as any)(seed, rarity);
          const finalLvl = (pickLevel as any)(seed, rarity);

          (window as any).spawnCustomMonster(mId, finalLvl, rarity);
        } else {
          addToast({ title: 'Spawn selhal', message: 'Ujisti se, že jsi na mapě!', type: 'error' });
        }
      }, 500);
    } else if (cheatId === 'spawnMapMonster') {
      setActiveTab('world');
      // Wait a bit for the map to mount and set the window function
      setTimeout(() => {
        if ((window as any).spawnMapMonster) {
          (window as any).spawnMapMonster();
        } else {
          addToast({ title: 'Spawn selhal', message: 'Ujisti se, že jsi na mapě a máš GPS signál!', type: 'error' });
        }
      }, 500);
    } else if (cheatId === 'triggerLevelUp') {
      (window as any).triggerLevelUp?.();
    } else if (cheatId === 'addPotions') {
      addResource('hp_potion', 10);
      addResource('mana_potion', 10);
      addToast({ title: 'Alchymie!', message: 'Získal jsi 10x HP a 10x Mana lektvar.', type: 'success' });
    } else if (cheatId === 'addTestMonster') {
      (window as any).addTestMonster?.('084', 10);
    } else if (cheatId === 'toggleSpeedLimit') {
      const newVal = !isSpeedLimitDisabled;
      setIsSpeedLimitDisabled(newVal);
      localStorage.setItem('monster_debug_no_speed', newVal.toString());
      addToast({ title: 'Rychlostní limit', message: newVal ? 'VYPNUT! Můžeš chytat i v raketě. 🚀' : 'ZAPNUT! Bezpečnost především. 🛡️', type: newVal ? 'success' : 'info' });
    } else if (cheatId === 'debugIAP') {
      if ((window as any).debugIAP) (window as any).debugIAP();
    }
  };

  // --- HOOKS ---
  const { toasts, addToast, removeToast } = useToasts()
  const { activeBoosts, activateBoost: baseActivateBoost } = useBoosts()
  const { inventory, maxSlots, upgradeCapacity, addResource, consumeResources, swapItems, discardItem } = useInventory()
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
        if (caught) return JSON.parse(caught).length * 150
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


  const { caughtMonsters, saveMonster, removeMonster, giveMonsterXP, updateMonsterHP, updateMonsterStats, equipGem, equipItem } = useMonsters(addToast);

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

  const { p2pTrade, setP2pTrade, handleCompleteTrade } = useP2PTrade(playerName, addToast, userUid)
  const activeMonster = caughtMonsters[0] || null
  const { duel, setDuel, sendChallenge, notifyAccept, pickMyFighter, rejectChallenge, cancelChallenge, sendEmote, incomingEmote, incomingAttack, incomingExit } = useP2PDuel(playerName, activeMonster, addToast, userUid, activeBattle?.opponentUid)

  // Handle Referral from URL (Web & Deep Links)
  useEffect(() => {
    // 1. Handle Web URL params
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode && refCode !== userUid) {
      localStorage.setItem('pending_referral', refCode);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // 2. Handle Native Deep Links
    const handleDeepLink = (event: any) => {
      try {
        const url = new URL(event.url);
        const ref = url.searchParams.get('ref');
        if (ref && ref !== userUid) {
          localStorage.setItem('pending_referral', ref);
          setReferredBy(ref);
          addToast({ 
            title: 'Pozvánka přijata!', 
            message: 'Díky za využití odkazu. Odměnu získáš na 3. úrovni.', 
            type: 'success' 
          });
        }
      } catch (e) {
        console.error('Deep link error:', e);
      }
    };

    CapApp.addListener('appUrlOpen', handleDeepLink);
    
    return () => {
      CapApp.removeAllListeners();
    };
  }, [userUid]);

  // --- FIREBASE AUTH & SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserUid(firebaseUser.uid);

        // Online Backup Recovery
        const backup = await loadUserBackup(firebaseUser.uid);
        if (backup && !playerName) {
          // Restore data if user is logging in on a new device
          setPlayerName(backup.playerName);
          setAvatarStyle(backup.avatarStyle);
          setAvatarSeed(backup.avatarSeed);
          if (backup.referredBy) setReferredBy(backup.referredBy);
          // Note: hooks like usePlayerXP/useMonsters also need to be synced
          // For now, we update localStorage so hooks pick it up on reload or next sync
          localStorage.setItem('monster_collector_player_name', backup.playerName);
          localStorage.setItem('monster_collector_avatar_style', backup.avatarStyle);
          localStorage.setItem('monster_collector_avatar_seed', backup.avatarSeed);
          if (backup.totalXP) localStorage.setItem('monster_collector_xp', backup.totalXP.toString());
          if (backup.caughtMonsters) localStorage.setItem('monster_collector_caught', JSON.stringify(backup.caughtMonsters));
          if (backup.inventory) localStorage.setItem('monster_collector_inventory', JSON.stringify(backup.inventory));

          window.location.reload(); // Quickest way to let all hooks re-initialize with new data
        } else if (!backup && !playerName && firebaseUser.email) {
          // New user! Check if they were invited by email
          const referrerUidMatch = await checkEmailInvitation(firebaseUser.email);
          if (referrerUidMatch) {
            registerReferral(referrerUidMatch, firebaseUser.uid, firebaseUser.displayName || 'Nový lovec', firebaseUser.email);
            addToast({
              title: 'Odměna za pozvánku',
              message: 'Paráda! Byl jsi pozván přítelem. Dosáhni 3. úrovně pro společnou odměnu.',
              type: 'xp'
            });
          }
        }
      } else {
        setUser(null);
        setUserUid(PLAYER_UID);
      }
    });
    return () => unsubscribe();
  }, [playerName]);

  useEffect(() => {
    if (user && userUid) {
      const interval = setInterval(async () => {
        const now = Date.now();
        await saveUserBackup(userUid, {
          playerName,
          avatarStyle,
          avatarSeed,
          totalXP,
          currentLevel,
          caughtMonsters,
          inventory,
          referredBy,
          lastSync: now
        });
        setLastSync(now);
        localStorage.setItem('monster_collector_last_sync', now.toString());
      }, 60000); // Back up every minute
      return () => clearInterval(interval);
    }
  }, [user, userUid, playerName, avatarStyle, avatarSeed, totalXP, currentLevel, caughtMonsters, inventory]);

  // Automatická synchronizace progressu k referrerovi (Milanovi)
  useEffect(() => {
    if (userUid && referredBy && totalXP > 0) {
      syncReferralProgress(userUid, currentLevel, totalXP, referredBy);
    }
  }, [totalXP, currentLevel, userUid, referredBy]);

  // Initialize notifications (Local & Push)
  useEffect(() => {
    if (userUid) {
      initNotifications(userUid);

      // Initialize IAP Store
      import('./lib/purchases').then(m => {
        const service = m.purchaseService;
        service.init();

        // Nastavíme globální handler pro vyřízení "zbloudilých" plateb (např. po restartu)
        service.setRecoveryHandler({
          onSuccess: (result) => {
            console.log('IAP Global Fulfillment Recovery:', result);
            if (result && typeof result === 'object' && (result as any).type) {
              activateBoost(result as Boost);
            } else if (typeof result === 'string') {
              if (result === 'inv20') upgradeCapacity(20);
              else if (result === 'inv24') upgradeCapacity(24);
            }
          },
          onError: (err) => {
            console.warn('IAP Global Error:', err);
          }
        });
      });
    }
  }, [userUid]);

  // Watch Referrals
  useEffect(() => {
    if (!userUid) return;
    const unsubscribe = watchReferrals(userUid, (data) => {
      const list: ReferralEntry[] = Object.entries(data).map(([uid, val]: [string, any]) => ({
        uid,
        ...val,
        level: 1 // We'll update this in the next effect
      }));
      setReferrals(list);
    });
    return () => unsubscribe();
  }, [userUid]);

  // --- DEBUG TOOLS ---
  useEffect(() => {
    (window as any).addMonster = (id: string) => {
      const found = monsterDB.find(m => m.id === id);
      if (found) {
        // Create a copy with full HP
        const copy: any = { ...found, caughtAt: Date.now(), currentHP: (found.stats?.hp || 100) * 10 };
        saveMonster(copy, (xp) => addXP(xp));
        addToast({ title: 'Debug', message: `Příšera ${found.name} (ID: ${id}) přidána!`, type: 'xp' });
        console.log(`✅ Příšera ${found.name} přidána do sbírky.`);
      } else {
        console.error(`❌ Příšera s ID ${id} neexistuje v databázi.`);
      }
    };
  }, [saveMonster, addToast, addXP]);

  // Sync Referral Levels (Real-time check of invited friends)
  useEffect(() => {
    if (referrals.length === 0) return;
    const interval = setInterval(async () => {
      const updatedReferrals = await Promise.all(referrals.map(async (refEntry) => {
        // Fetch invited player level from players/UID
        const playerRef = (await loadUserBackup(refEntry.uid)); // reuse helper or make new
        return { ...refEntry, level: playerRef?.level || 1 };
      }));
      // Only update if something changed
      if (JSON.stringify(updatedReferrals) !== JSON.stringify(referrals)) {
        setReferrals(updatedReferrals);
      }
    }, 30000);
    return () => interval && clearInterval(interval);
  }, [referrals]);

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
        { type: 'loot_11', count: 5 }, // Prastarý Artefakt
        { type: 'loot_6', count: 10 }, // Stabilizovaná DNA
        { type: 'loot_1', count: 20 }, // Sérum z krunýře
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
        xp: 0,
        currentHP: base.stats?.hp || 100,
        image: `/monsters/${base.id}.png`,
        gems: [null, null, null]
      };
      saveMonster(monsterToSave as any, () => { });
      addToast({ title: '🧬 Monstrum přidáno!', message: `${base.name} (Lv.${lvl}) se připojilo k tobě!`, type: 'success' });
    };

    (window as any).forceWildEncounter = () => {
      const wildEnemy: Monster = {
        id: 'obsidian_golem',
        level: 7,
        caughtAt: 0,
        xp: 0,
        name: 'Obsidiánový Golem',
        rarity: 'epic',
        type: 'Přírodní',
        image: '',
        description: 'Testovací boss pro odchyt.',
        stats: { hp: 150, attack: 45, defense: 30 }
      };
      setWildEncounter({ monster: wildEnemy });
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

    (window as any).givePlayerXP = (amt = 200) => {
      addXP(amt);
    };
    
    return () => {
      delete (window as any).addGems;
      delete (window as any).giveXP;
      delete (window as any).addMonster;
      delete (window as any).forceWildEncounter;
      delete (window as any).healMe;
      delete (window as any).givePlayerXP;
    };
  }, [addResource, giveMonsterXP, saveMonster, addToast, caughtMonsters, healHP, updateMonsterHP, selectedMonster]);

  const activateBoost = (boost: Boost, item?: any) => {
    if (item?.price && !payingItem) {
      setPayingItem({ id: item.id, boost, title: item.title, price: item.price })
      return
    }
    if ((boost.type as string) === 'inventory_upgrade') {
      upgradeCapacity(boost.multiplier);
      addToast({ title: 'Batoh Vylepšen!', message: `Kapacita batohu byla zvýšena na ${boost.multiplier} slotů!`, type: 'success' });
      setPayingItem(null);
      return;
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

  const [dailyStats, setDailyStats] = useState(() => {
    try {
      const saved = localStorage.getItem('monster_collector_daily_stats')
      if (saved) {
        const { duels, epics, legendaries, date } = JSON.parse(saved)
        if (date === new Date().toDateString()) return { duels: duels || 0, epics: epics || 0, legendaries: legendaries || 0 }
      }
    } catch { }
    return { duels: 0, epics: 0, legendaries: 0 }
  })

  const updateDailyStat = useCallback((type: 'duels' | 'epics' | 'legendaries') => {
    setDailyStats(prev => {
      const next = { ...prev, [type]: prev[type] + 1 }
      localStorage.setItem('monster_collector_daily_stats', JSON.stringify({
        ...next,
        date: new Date().toDateString()
      }))
      return next
    })
  }, [])

  // Push notifikace pro nové úkoly
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const todayDateStr = today.toDateString();

    const currentUnlocked = [1, 2, 3];
    const monstersTodayCount = caughtMonsters.filter(m => m.caughtAt && m.caughtAt >= todayTimestamp).length;

    if (currentLevel >= 4) currentUnlocked.push(4); // Vyzývatel
    if (currentLevel >= 4 && monstersTodayCount >= 5) currentUnlocked.push(5); // Lovec epiků
    if (currentLevel >= 6 && dailyStats.epics >= 3) currentUnlocked.push(6); // Legendární přemožitel

    const newUnlocks = currentUnlocked.filter(id => !unlockedQuests.includes(id));
    if (newUnlocks.length > 0) {
      newUnlocks.forEach(id => {
        const questNames: any = {
          4: 'Souboj s hráčem',
          5: 'Lovec epiků (+3 Epické)',
          6: 'Legendární přemožitel'
        };
        addToast({
          title: 'Nový úkol k dispozici! 📜',
          message: `Byl odemčen denní protokol: ${questNames[id] || 'Neznámý'}`,
          type: 'xp'
        });
      });
      setUnlockedQuests(currentUnlocked);
      localStorage.setItem('monster_collector_unlocked_quests', JSON.stringify({
        date: todayDateStr,
        ids: currentUnlocked
      }));
    }
  }, [currentLevel, dailyStats, caughtMonsters, unlockedQuests, addToast]);

  // --- TUTORIAL TRIGGERS ---
  useEffect(() => {
    // 1. Based on specific tab visibility AND profile completion
    if (!playerName) return; // Wait for name setup

    if (activeTab === 'home' && !localStorage.getItem('monster_tutorial_home_done') && !tutorialType) {
      setTutorialType('home');
      setCurTutorialStep(0);
    } else if (activeTab === 'world' && !localStorage.getItem('monster_tutorial_world_done') && !tutorialType) {
      setTutorialType('world');
      setCurTutorialStep(0);
    } else if (activeTab === 'inventory' && !localStorage.getItem('monster_tutorial_inventory_done') && !tutorialType) {
      setTutorialType('inventory');
      setCurTutorialStep(0);
    } else if ((activeTab === 'vault' || activeTab === 'codex') && !localStorage.getItem('monster_tutorial_collection_done') && !tutorialType) {
      setTutorialType('collection');
      setCurTutorialStep(0);
    }
  }, [activeTab, tutorialType, playerName]);

  const handleMove = useCallback((lat: number, lng: number, distance: number) => {
    setCurrentPosition({ lat, lng });
    localStorage.setItem('monster_last_pos', JSON.stringify({ lat, lng }));
    addXP(Math.round(distance / 10));
    const today = new Date().toDateString();
    setDailyDistance((prev: number) => {
      const newVal = prev + distance
      localStorage.setItem('monster_collector_distance', JSON.stringify({
        dist: newVal,
        date: today
      }))
      return newVal
    })

    // Also reset daily stats if day changed (fallback)
    setDailyStats(prev => {
      const saved = localStorage.getItem('monster_collector_daily_stats')
      if (saved) {
        const { date } = JSON.parse(saved)
        if (date !== today) return { duels: 0, epics: 0, legendaries: 0 }
      }
      return prev
    })
  }, [])

  // --- ACTIONS ---
  const handleWorldCatch = useCallback((m: Monster, spawnId?: string) => {
    if (caughtMonsters.length === 0) {
      saveMonster(m, (xp) => {
        addXP(xp);
        setNewMonster(m);
      });
    } else {
      setWildEncounter({ monster: m, spawnId });
    }
  }, [caughtMonsters.length, saveMonster, addXP]);

  const handleStartTradeAction = useCallback((name: string | undefined, uid: string | undefined) => {
    if (uid) {
      setP2pTrade({ step: 'REQUESTING', partnerName: name || 'Hráč', partnerUid: uid });
    }
  }, []);

  const handleStartDuelAction = useCallback((name: string | undefined, uid: string | undefined) => {
    if (uid) sendChallenge(uid, name || 'Runner');
  }, [sendChallenge]);


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

    const cfg = RESOURCE_CONFIG[type];
    if (!cfg) return;

    // Apply immediate stat heals
    if (cfg.stats?.hp) {
      const amount = cfg.statsType === 'perc' ? 100 : cfg.stats.hp; // Since max HP is 100 (for player)
      healHP(amount);
      if (caughtMonsters.length > 0) updateMonsterHP(0, amount);
      addToast({ title: `${cfg.label} použit`, message: `Vyléčeno ${cfg.statsType === 'perc' ? cfg.stats.hp + '%' : amount} HP.`, type: 'success' });
    }
    if (cfg.stats?.energy) {
      addToast({ title: `${cfg.label} použit`, message: 'Energie (Mana) byla doplněna.', type: 'info' });
    }

    // Apply special effects
    if (cfg.specialEffect && cfg.specialEffect !== 'none') {
      const mins = cfg.effectDuration || 15;
      if (cfg.specialEffect === 'xp_boost') {
        activateBoost({ type: 'xp_boost', multiplier: 2, expiresAt: Date.now() + mins * 60 * 1000 });
        addToast({ title: 'XP Boost aktivován!', message: `Získáváš 2x XP po dobu ${mins} minut.`, type: 'boost' });
      } else if (cfg.specialEffect === 'hp_regen') {
        activateBoost({ type: 'hp_regen', multiplier: 2, expiresAt: Date.now() + mins * 60 * 1000 });
        addToast({ title: 'HP Regen aktivován!', message: `Tvoje regenerace zdraví je posílena na ${mins} minut.`, type: 'success' });
      }
    }
  };

  const handleStartBattle = (enemy: Monster, opponentName?: string, opponentUid?: string, mySelectedMonster?: Monster, pvpRole?: 'challenger' | 'defender', spawnId?: string) => {
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
    setActiveBattle({ enemy, playerIdx: pIdx, opponentName, opponentUid, pvpRole, spawnId });
  };

  const handleBattleWin = (xp: number, loot: { type: any, count: number }[]) => {
    if (!activeBattle) return;

    if (activeBattle.spawnId) {
      (window as any).markMonsterAsCaught?.(activeBattle.spawnId);
    }

    // 1. Award XP to the monster that fought
    giveMonsterXP(activeBattle.playerIdx, xp);

    // 2. Add loot collected from the interactive modal
    loot.forEach(l => {
      addResource(l.type, l.count);
    });

    // 3. Award global XP to player
    addXP(xp);

    setActiveBattle(null);
    setActiveTab('world');

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
    (window as any).triggerLevelUp = (lvl?: number) => {
      const targetLevel = lvl || currentLevel + 1;
      const neededXP = getTotalXPForLevel(targetLevel);
      const diff = neededXP - totalXP;
      if (diff > 0) addXP(diff);
      setShowLevelUp(targetLevel);
    };
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
    <div className={cn("min-h-screen font-display flex flex-col", activeTab !== 'world' && "pb-32")}>
      <AnimatePresence>
        {isDebugMode && (
          <DebugBar
            key="debug-bar"
            onClose={() => setIsDebugMode(false)}
            onCheat={handleCheat}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeBattle && (
          <Battle
            key="battle-overlay"
            playerMonster={caughtMonsters[activeBattle.playerIdx]}
            enemyMonster={activeBattle.enemy}
            isAlreadyCaught={caughtMonsters.some(m => m.id === activeBattle?.enemy.id)}
            opponentName={activeBattle.opponentName}
            pvpRole={activeBattle.pvpRole}
            incomingEmote={incomingEmote}
            incomingAttack={incomingAttack}
            inventory={inventory.filter(i => i !== null) as any}
            isInventoryFull={inventory.every(i => i !== null)}
            xpMultiplier={calculateBoostMultiplier(activeBoosts, 'xp_boost')}
            isTutorial={!localStorage.getItem('monster_tutorial_done')}
            onUseItem={(type) => {
              const cfg = RESOURCE_CONFIG[type];
              if (!cfg) return;
              consumeResources([{ type: type as any, count: 1 }]);

              if (cfg.stats?.hp && caughtMonsters.length > 0) {
                const amount = cfg.statsType === 'perc' ? 100 : cfg.stats.hp;
                updateMonsterHP(activeBattle.playerIdx, amount);
              }

              if (cfg.specialEffect && cfg.specialEffect !== 'none') {
                const mins = cfg.effectDuration || 15;
                if (cfg.specialEffect === 'xp_boost') {
                  activateBoost({ type: 'xp_boost', multiplier: 2, expiresAt: Date.now() + mins * 60 * 1000 });
                } else if (cfg.specialEffect === 'hp_regen') {
                  activateBoost({ type: 'hp_regen', multiplier: 2, expiresAt: Date.now() + mins * 60 * 1000 });
                }
              }
            }}
            onSendEmote={(emote) => {
              if (activeBattle.opponentUid) {
                sendTradeSignal(userUid, activeBattle.opponentUid, { type: 'DEM', fromName: playerName || 'Neznámý', data: emote });
              }
            }}
            onSendAttack={(attackData) => {
              if (activeBattle.opponentUid) {
                sendTradeSignal(userUid, activeBattle.opponentUid, { type: 'DAT', fromName: playerName || 'Neznámý', data: JSON.stringify(attackData) });
              }
            }}
            onWin={(xp, loot) => {
              localStorage.setItem('monster_tutorial_done', 'true');
              if (activeBattle?.spawnId) {
                (window as any).markMonsterAsCaught?.(activeBattle.spawnId);
              }
              if (wildEncounter?.rarity === 'Epická') updateDailyStat('epics');
              if (wildEncounter?.rarity === 'Legendární') updateDailyStat('legendaries');
              handleBattleWin(xp, loot);
            }}
            onLose={(xp) => {
              updateMonsterHP(activeBattle.playerIdx, -999);
              if (!activeBattle.pvpRole) {
                // Přidání XP pro prohru v PVE
                giveMonsterXP(activeBattle.playerIdx, xp);
                addXP(xp); // Now also give to player!
                addToast({ title: 'Těsná prohra', message: `Získal jsi ${xp} XP za zkušenosti ze zápasu!`, type: 'info' });
              } else {
                addToast({ title: 'Prohra', message: 'Tvé monstrum bylo poraženo v duelu.', type: 'error' });
              }
              setActiveBattle(null);
              setActiveTab('world');
            }}
            onCatch={(monster, xp, spawnId) => {
              localStorage.setItem('monster_tutorial_done', 'true');
              if (activeBattle?.spawnId || spawnId) {
                (window as any).markMonsterAsCaught?.(activeBattle?.spawnId || spawnId);
              }
              // 1. Award XP to the monster that fought
              giveMonsterXP(activeBattle.playerIdx, xp);

              // 2. Add the new monster to the collection
              saveMonster({
                ...monster,
                currentHP: undefined,
                xp: 0,
                lat: currentPosition?.lat,
                lng: currentPosition?.lng,
                caughtAt: Date.now()
              }, () => {
                setNewMonster(monster);
                // 3. Award XP to the player 
                addXP(xp);
              }, false);
              setActiveBattle(null);
              setActiveTab('world');
            }}
            onCatchFail={() => {
              addToast({ title: 'Uniklo to!', message: 'Monstrum se vysmeklo. Zkus mu ubrat více HP!', type: 'info' });
            }}
            onBack={() => {
              if (activeBattle?.spawnId) {
                (window as any).markMonsterAsCaught?.(activeBattle.spawnId);
              }
              if (activeBattle?.opponentUid) {
                sendTradeSignal(userUid, activeBattle.opponentUid, { type: 'DCN', fromName: playerName || 'Neznámý', data: '' });
              }
              setActiveBattle(null);
              setActiveTab('world');
            }}
          />
        )}
      </AnimatePresence>

      {!playerName && (
        <SetupProfileModal
          onComplete={handleProfileComplete}
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
          onAvatarClick={handleAvatarClick}
          onLocationClick={activeTab === 'world' ? () => worldMapRef.current?.centerOnPlayer() : undefined}
          onCodexClick={activeTab === 'inventory' ? () => setActiveTab('codex') : undefined}
          caughtCount={new Set(caughtMonsters.map(m => m.id)).size}
        />
      )}

      <main className="mx-auto relative w-full max-w-md md:max-w-lg">
        <AnimatePresence mode="popLayout">
          {selectedMonster ? (
            <MonsterDetail
              key="detail"
              monster={selectedMonster}
              canRelease={caughtMonsters.length > 1}
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
              onEquipItem={(itemIdx, type) => {
                const idx = caughtMonsters.findIndex(m => (m as any).caughtAt === (selectedMonster as any).caughtAt);
                if (idx !== -1) {
                  const oldItem = caughtMonsters[idx].items?.[itemIdx];
                  equipItem(idx, itemIdx, type);
                  const newItems = [...(caughtMonsters[idx].items || [null, null, null])];
                  newItems[itemIdx] = type;
                  const updated = { ...caughtMonsters[idx], items: newItems };
                  setSelectedMonster(updated);
                  if (type) consumeResources([{ type: type as any, count: 1 }]);
                  if (oldItem) addResource(oldItem as any, 1);
                  addToast({
                    title: type ? 'Relikvie osazena' : 'Relikvie odebrána',
                    message: type ? 'Předmět posílil tvé monstrum!' : 'Předmět byl vrácen do batohu.',
                    type: 'success'
                  });
                }
              }}
              onPermanentlyUpgrade={(itemType: string, stats: any) => {
                const idx = caughtMonsters.findIndex(m => (m as any).caughtAt === (selectedMonster as any).caughtAt);
                if (idx !== -1) {
                  updateMonsterStats(idx, stats, itemType);
                  consumeResources([{ type: itemType as any, count: 1 }]);

                  addToast({
                    title: 'Genetická Mutace!',
                    message: `${selectedMonster.name} prošel úspěšnou evolucí genů.`,
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
                    xpMultiplier={calculateBoostMultiplier(activeBoosts, 'xp_boost')}
                    hpMultiplier={calculateBoostMultiplier(activeBoosts, 'hp_regen')}
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
                    playerLevel={currentLevel}
                    dailyStats={dailyStats}
                    onClaimReward={(xp) => handleClaimReward(xp, activeBoosts)}
                    isXPBoosted={activeBoosts.some(b => b.type === 'xp_boost' && b.expiresAt > Date.now())}
                    referrals={referrals}
                    onInvite={() => setIsInviteModalOpen(true)}
                    onHatch={handleHatchReferral}
                    onDelete={handleDeleteReferral}
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
                  onCatch={handleWorldCatch}
                  onStartTrade={handleStartTradeAction}
                  playerHP={currentHP}
                  onConsumeHP={consumeHP}
                  onDistanceUpdate={handleMove}
                  isInteractionBlocked={!!newMonster || !!selectedMonster || !!activeBattle || !!wildEncounter}
                  caughtMonsters={caughtMonsters}
                  initialPosition={currentPosition}
                  playerName={playerName || 'Aether_Runner'}
                  playerUid={userUid}
                  avatarStyle={avatarStyle}
                  avatarSeed={avatarSeed}
                  playerLevel={currentLevel}
                  activeMonster={caughtMonsters[0] || null}
                  onGather={handleGather}
                  onStartDuel={handleStartDuelAction}
                  addToast={addToast}
                  ignoreSpeedLimit={isSpeedLimitDisabled}
                  isBatterySaver={isBatterySaver}
                  mapTheme={isMapAutoTheme ? 'auto' : mapTheme}
                  email={user?.email || playerEmail}
                />
              )}

              {activeTab === 'store' && (
                <Store
                  key="store"
                  onActivateBoost={(boost, item) => {
                    if (item && item.price) {
                      setPayingItem({ id: item.id, boost, title: item.title, price: item.price });
                    } else {
                      activateBoost(boost);
                    }
                  }}
                  activeBoosts={activeBoosts}
                  maxSlots={maxSlots}
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
            xpMultiplier={calculateBoostMultiplier(activeBoosts, 'xp_boost')}
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
            googleEmail={user?.email}
            playerEmail={playerEmail}
            isGoogleLinked={!!user}
            onUpdateEmail={(email) => {
              setPlayerEmail(email)
              localStorage.setItem('monster_collector_player_email', email)
            }}
            onLogout={() => logout()}
            caughtCount={new Set(caughtMonsters.map(m => m.id)).size}
            totalMonsters={monsterDB.length}
            lastSync={lastSync}
            isBatterySaver={isBatterySaver}
            onToggleBatterySaver={() => {
              const newVal = !isBatterySaver;
              setIsBatterySaver(newVal);
              localStorage.setItem('monster_battery_saver', String(newVal));
            }}
            isDebugMode={isDebugMode}
            onToggleDebug={() => {
              const newVal = !isDebugMode;
              setIsDebugMode(newVal);
              addToast({
                title: 'Debug Mode',
                message: newVal ? 'Admin rozhraní aktivováno!' : 'Admin rozhraní skryto.',
                type: 'success'
              });
            }}
            mapTheme={mapTheme}
            isMapAutoTheme={isMapAutoTheme}
            onUpdateMapTheme={(theme, auto) => {
              setMapTheme(theme);
              setIsMapAutoTheme(auto);
              localStorage.setItem('monster_map_theme', theme);
              localStorage.setItem('monster_map_auto_theme', auto.toString());
            }}
            onLogin={async () => {
              try {
                const user = await signInWithGoogle();
                if (user) {
                  addToast({ title: 'Přihlášeno!', message: `Vítej zpět, ${user.displayName || 'lovče'}!`, type: 'success' });
                }
              } catch (err: any) {
                console.error("Firebase Login Error:", err);
                let msg = 'Zkus to prosím znovu.';
                if (err.code === 'auth/popup-blocked') msg = 'Prohlížeč zablokoval vyskakovací okno.';
                if (err.code === 'auth/popup-closed-by-user') msg = 'Okno přihlášení bylo zavřeno před dokončením.';
                if (err.code === 'auth/unauthorized-domain') msg = 'Tato doména není ve Firebase povolená.';
                if (err.code === 'auth/operation-not-allowed') msg = 'Metoda Google není ve Firebase povolená.';

                addToast({
                  title: 'Chyba přihlášení',
                  message: `[${err.code || 'error'}]: ${msg}`,
                  type: 'error'
                });
              }
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
              opponent={wildEncounter.monster}
              title="Výběr pro bitvu"
              description="Zvolte svého šampiona pro divoký střet. Pamatujte, že k boji je potřeba alespoň 80% životů!"
              onClose={() => setWildEncounter(null)}
              onSelect={(m) => {
                const monsterToFight = wildEncounter.monster;
                const sid = wildEncounter.spawnId;
                setWildEncounter(null);
                handleStartBattle(monsterToFight, undefined, undefined, m, undefined, sid);
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
        onConfirm={(result) => {
          if (payingItem) {
            if (result && typeof result === 'object' && result.type) {
              activateBoost(result as Boost);
            } else if (result && typeof result === 'string') {
              if (result === 'inv20') upgradeCapacity(20);
              else if (result === 'inv24') upgradeCapacity(24);
            } else {
              activateBoost(payingItem.boost);
            }
            setPayingItem(null);
          }
        }}
        item={payingItem || { id: '', title: '', price: '' }}
        userEmail={playerEmail}
      />

      <AnimatePresence>
        {tutorialType && (
          <TutorialOverlay
            step={curTutorialStep}
            steps={
              tutorialType === 'home' ? HOME_TUTORIAL_STEPS :
                tutorialType === 'world' ? WORLD_TUTORIAL_STEPS :
                  tutorialType === 'collection' ? COLLECTION_TUTORIAL_STEPS :
                    tutorialType === 'inventory' ? INVENTORY_TUTORIAL_STEPS :
                      tutorialType === 'codex' ? CODEX_TUTORIAL_STEPS :
                        []
            }
            onNext={() => {
              const mapping: any = {
                home: HOME_TUTORIAL_STEPS,
                world: WORLD_TUTORIAL_STEPS,
                collection: COLLECTION_TUTORIAL_STEPS,
                inventory: INVENTORY_TUTORIAL_STEPS,
                codex: CODEX_TUTORIAL_STEPS
              };
              const steps = mapping[tutorialType as any] || [];
              if (curTutorialStep < steps.length - 1) {
                setCurTutorialStep(p => p + 1);
              } else {
                localStorage.setItem(`monster_tutorial_${tutorialType}_done`, 'true');
                setTutorialType(null);
                setCurTutorialStep(0);
              }
            }}
          />
        )}
      </AnimatePresence>

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
            isXPBoosted={activeBoosts.some(b => b.type === 'xp_boost' && b.expiresAt > Date.now())}
            xpMultiplier={calculateBoostMultiplier(activeBoosts, 'xp_boost')}
            onAdd={(m) => {
              // We've already saved it in handleBattleWin or onCatch
              setNewMonster(null);
            }}
          />
        )}
      </AnimatePresence>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        referralCode={userUid}
      />
    </div>
  )

  async function handleProfileComplete(name: string, email?: string, referralCode?: string) {
    setPlayerName(name)
    localStorage.setItem('monster_collector_player_name', name)
    if (email) {
      setPlayerEmail(email)
      localStorage.setItem('monster_collector_player_email', email)
    }

    if (referralCode && userUid) {
      await registerReferral(referralCode, userUid, name, email);
      addToast({ title: 'Pozvánka uložena!', message: 'Odměnu získáš až budeš na Lv. 3!', type: 'success' });
    } else if (email && userUid) {
      // Zkusíme automaticky dohledat pozvánku podle emailu
      const autoReferrer = await checkEmailInvitation(email);
      if (autoReferrer && autoReferrer !== userUid) {
        await registerReferral(autoReferrer, userUid, name, email);
        addToast({ title: 'Pozvánka spárována!', message: 'Našli jsme tvé dřívější pozvání přes email.', type: 'success' });
      }
    }
  }

  async function handleHatchReferral(invitedUid: string) {
    try {
      if (!userUid) return;
      await claimReferralReward(userUid, invitedUid);

      const rarePool = monsterDB.filter(m => {
        const r = (m.rarity || '').toLowerCase();
        return r === 'vzácná' || r === 'rare';
      });
      const randomMonster = rarePool[Math.floor(Math.random() * rarePool.length)];

      if (randomMonster) {
        const monsterWithMeta: Monster = {
          ...randomMonster,
          level: 1,
          image: '', // Visuals are handled by ID
          currentHP: undefined,
          xp: 0,
          abilities: (randomMonster.abilities || []).map((a: any) => ({
            ...a,
            type: a.type as any
          }))
        };
        saveMonster(monsterWithMeta, (xp) => {
          setNewMonster(monsterWithMeta);
          addXP(xp);
        });
        addToast({ title: 'Vajíčko vylíhnuto!', message: `Získal jsi vzácného ${randomMonster.name}!`, type: 'success' });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDeleteReferral(invitedId: string) {
    if (!userUid) return;
    try {
      await deleteReferral(userUid, invitedId);
      addToast({ title: 'Pozvánka smazána', message: 'Tento záznam byl odstraněn.', type: 'xp' });
    } catch (err) {
      console.error(err);
    }
  }
}

export default function App() {
  return (
    <SoundProvider>
      <AppContent />
    </SoundProvider>
  )
}
