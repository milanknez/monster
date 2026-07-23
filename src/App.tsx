import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Trophy, ShoppingBag, Bluetooth, SignalHigh, RefreshCw, Sword, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TutorialOverlay, BATTLE_TUTORIAL_STEPS, HOME_TUTORIAL_STEPS, WORLD_TUTORIAL_STEPS, COLLECTION_TUTORIAL_STEPS, INVENTORY_TUTORIAL_STEPS, CODEX_TUTORIAL_STEPS } from './components/battle/TutorialOverlay'
import { monsterDB } from './data/monsters'
import type { Monster, Boost, Recipe, ResourceType } from './types'
import { cn, getTotalXPForLevel, calculateLevel, calculateBoostMultiplier, getLoc } from './utils'
import { RESOURCE_CONFIG } from './components/map/mapUtils'

import { Header } from './components/ui/Header'
import { StatsCard } from './components/ui/StatsCard'
import { LatestDetection } from './components/dashboard/LatestDetection'
import { RecentActivity } from './components/dashboard/RecentActivity'
import { DailyQuests } from './components/dashboard/DailyQuests'
import { Leaderboard } from './components/dashboard/Leaderboard'
import { NewMonsterModal } from './components/modals/NewMonsterModal'
import { Bestiary } from './components/bestiary/Bestiary'
import { Inventory } from './components/inventory/Inventory'
import { Laboratory } from './components/codex/Codex'
import { MonsterDetail } from './components/bestiary/MonsterDetail'
import { Battle } from './components/battle/Battle'
import { Dungeon } from './components/battle/Dungeon'
import { NavBar } from './components/ui/NavBar'
import { PlaceholderTab } from './components/ui/PlaceholderTab'
import { WorldMap, type WorldMapHandle } from './components/map/WorldMap'
import { SetupProfileModal } from './components/modals/SetupProfileModal'
import { TradeSelectionModal } from './components/modals/TradeSelectionModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { pickLevel, pickMonster } from './components/map/mapUtils'
import { Store } from './components/bestiary/Store'
import { GooglePayModal } from './components/modals/GooglePayModal'

const SystemEditor = import.meta.env.DEV
  ? lazy(() => import('./components/admin/SystemEditor').then(m => ({ default: m.SystemEditor })))
  : () => null;
import { DuelSelectionModal } from './components/modals/DuelSelectionModal'
import { TestEndedModal } from './components/modals/TestEndedModal'
import { BlockedUserScreen } from './components/modals/BlockedUserScreen'
import { ToastContainer } from './components/ui/Toast'
import { DebugBar } from './components/ui/DebugBar'

import { APP_CONFIG } from './config'

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
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  auth,
  db,
  update,
  ref,
  onAuthStateChanged,
  onValue,
  saveUserBackup,
  loadUserBackup,
  registerReferral,
  logout,
  signInWithGoogle,
  signInAnonymously,
  syncPlayerToFirebase,
  sendTradeSignal,
  PLAYER_UID,
  syncReferralProgress,
  checkEmailInvitation,
  watchReferrals,
  claimReferralReward,
  deleteReferral,
  resolveReferralCode,
  isProdDb
} from './lib/firebase'
import { User as FirebaseUser } from 'firebase/auth'



import { InviteModal } from './components/modals/InviteModal'
import { ReferralList, type ReferralEntry } from './components/referrals/ReferralList'
import { SoundProvider } from './context/SoundContext'
import { initNotifications, scheduleTestNotification } from './lib/notifications'
import { DebugConsole } from './components/debug/DebugConsole'

interface DebugLog {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

function AppContent() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('home')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const worldMapRef = useRef<WorldMapHandle>(null)

  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userUid, setUserUid] = useState<string>(PLAYER_UID)
  const [isBlocked, setIsBlocked] = useState(false)
  const [isTestEndedSkipped, setIsTestEndedSkipped] = useState(false)
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [logs, setLogs] = useState<DebugLog[]>([])

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
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)

  const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem('monster_collector_player_name'))
  const [pendingReferral, setPendingReferral] = useState<string | null>(() => localStorage.getItem('pending_referral'))
  const [playerEmail, setPlayerEmail] = useState<string | null>(() => localStorage.getItem('monster_collector_player_email'))
  const [avatarStyle, setAvatarStyle] = useState(() => localStorage.getItem('monster_collector_avatar_style') || 'avataaars')
  const [avatarSeed, setAvatarSeed] = useState(() => localStorage.getItem('monster_collector_avatar_seed') || 'seed')
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const s = localStorage.getItem('monster_collector_last_sync');
    return s ? parseInt(s) : null;
  })

  const [pvpWins, setPvpWins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('monster_pvp_wins');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [pvpLosses, setPvpLosses] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('monster_pvp_losses');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [isEditorMode, setIsEditorMode] = useState(() => {
    if (!import.meta.env.DEV) return false;
    return new URLSearchParams(window.location.search).get('editor') === '1' ||
      window.location.pathname === '/admin' ||
      window.location.pathname === '/admin/';
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
  const [graphicsQuality, setGraphicsQuality] = useState<'low' | 'high'>(() => {
    const saved = localStorage.getItem('monster_graphics_quality');
    if (saved === 'low' || saved === 'high') return saved;
    // Autodetect based on mobile user agent, CPU cores (<= 4) or RAM (<= 4GB)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowSpec = isMobile && (
      ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4) || 
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    );
    const detected = isLowSpec ? 'low' : 'high';
    localStorage.setItem('monster_graphics_quality', detected);
    return detected;
  });

  useEffect(() => {
    document.body.classList.toggle('graphics-low', graphicsQuality === 'low');
  }, [graphicsQuality]);

  const [mapTheme, setMapTheme] = useState<'day' | 'night'>(() => (localStorage.getItem('monster_map_theme') as any) || 'night')
  const [isMapAutoTheme, setIsMapAutoTheme] = useState(() => localStorage.getItem('monster_map_auto_theme') === 'true') // Default false
  const [spawnRadius, setSpawnRadius] = useState<number>(() => {
    const saved = localStorage.getItem('monster_spawn_radius');
    return saved ? parseInt(saved) : 1000;
  });

  // Log interception for Android debugging
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type: DebugLog['type'], args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      setLogs(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        type,
        message,
        timestamp: Date.now()
      }, ...prev].slice(0, 100)); // Keep last 100 logs
    };

    console.log = (...args) => {
      addLog('log', args);
      originalLog.apply(console, args);
    };
    console.error = (...args) => {
      addLog('error', args);
      originalError.apply(console, args);
    };
    console.warn = (...args) => {
      addLog('warn', args);
      originalWarn.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

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
          const mId = (pickMonster as any)(seed, rarity);
          const finalLvl = (pickLevel as any)(seed, rarity);
          (window as any).spawnCustomMonster(mId, finalLvl, rarity);
        } else {
          addToast({ title: 'Spawn selhal', message: 'Ujisti se, že jsi na mapě!', type: 'error' });
        }
      }, 500);
    } else if (cheatId?.startsWith('setReferral:')) {
      const code = cheatId.split(':')[1];
      localStorage.setItem('pending_referral', code);
      window.location.reload();
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
    } else if (cheatId === 'spawnNearMe') {
      setActiveTab('world');
      setTimeout(() => {
        if ((window as any).spawnCustomMonster && (window as any).spawnCustomResource) {
          const seed = 'debug_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
          const rarities = ['rare', 'epic'];
          const pickedRarity = rarities[Math.floor(Math.random() * rarities.length)] as any;
          const mId = (pickMonster as any)(seed, pickedRarity);
          const finalLvl = (pickLevel as any)(seed, pickedRarity);
          
          (window as any).spawnCustomMonster(mId, finalLvl, pickedRarity);
          (window as any).spawnCustomResource('herb', 3);
        } else {
          addToast({ title: 'Spawn selhal', message: 'Ujisti se, že jsi na mapě a máš GPS signál!', type: 'error' });
        }
      }, 500);
    } else if (cheatId === 'resetLevel') {
      localStorage.setItem('monster_collector_xp', '0');
      if (userUid) {
        update(ref(db, `users/${userUid}`), { currentLevel: 1, totalXP: 0 });
      }
      addToast({ title: 'Reset Levelu', message: 'Tvoje úroveň byla resetována na Level 1! Restartuji...', type: 'info' });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
    } else if (cheatId === 'addLegendary') {
      const legendaries = monsterDB.filter(m => m.rarity === 'Legendární');
      const randomLegendary = legendaries[Math.floor(Math.random() * legendaries.length)];
      if (randomLegendary) {
        (window as any).addMonster(randomLegendary.id, 10);
      }
    } else if (cheatId === 'debugIAP') {
      if ((window as any).debugIAP) (window as any).debugIAP();
    } else if (cheatId === 'openEditor') {
      setIsEditorMode(true);
    } else if (cheatId === 'openDungeonSim') {
      setActiveTab('dungeon');
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

  // Listen to blocked status in Realtime Database
  useEffect(() => {
    if (!userUid) {
      setIsBlocked(false);
      return;
    }
    const blockedRef = ref(db, `users/${userUid}/blo`);
    const unsubscribe = onValue(blockedRef, (snapshot) => {
      setIsBlocked(!!snapshot.val());
    });
    return () => unsubscribe();
  }, [userUid]);

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
    // Helper: process and save a referral code from any source
    const processReferralCode = async (code: string, source: string) => {
      if (!code || code.includes('utm_source')) return;

      console.log(`[Referral] Kód přijat z ${source}:`, code);

      // Pokusíme se vyřešit kód (pokud je to krátký kód, převede se na UID)
      const resolvedUid = await resolveReferralCode(code);
      console.log(`[Referral] Kód po vyřešení (${source}):`, resolvedUid);

      const savedRef = localStorage.getItem('pending_referral');
      if (savedRef === resolvedUid) {
        // I když je v localStorage, ujistíme se, že je i ve stavu
        if (!pendingReferral) setPendingReferral(resolvedUid);
        return;
      }

      localStorage.setItem('pending_referral', resolvedUid);
      setPendingReferral(resolvedUid);
      setReferredBy(resolvedUid);

      // Pokud je uživatel už přihlášen a referral ještě nebyl zaregistrován,
      // zaregistrujeme ho ihned (řeší race condition kdy referrer přijde pozdě)
      if (userUid && userUid !== resolvedUid && playerName) {
        if (currentLevel < 2) {
          console.log(`[Referral] Okamžitá registrace: ${resolvedUid} → ${userUid}`);
          const isNew = await registerReferral(resolvedUid, userUid, playerName, playerEmail || undefined);

          if (isNew) {
            addToast({
              title: 'Pozvánka přijata!',
              message: 'Byl jsi úspěšně spárován s lovcem. Odměna tě čeká na 3. úrovni!',
              type: 'success'
            });
          }
        } else {
          console.log(`[Referral] Ignoruji referral (Level ${currentLevel} >= 2): ${resolvedUid}`);
          // Toast ukážeme jen pokud to přišlo z URL/Deep linku (manuální akce), 
          // ne při každém spuštění z automatického referreru.
          if (source === 'URL' || source === 'Deep Link') {
            addToast({
              title: 'Pozvánka neaplikována',
              message: 'Omlouváme se, pozvánky jsou určeny pouze pro nově začínající lovce.',
              type: 'info'
            });
          }
        }
        localStorage.removeItem('pending_referral');
      }
    };

    // 1. Handle Web URL params
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    const urlLang = urlParams.get('lang');
    const importData = urlParams.get('import');

    if (importData) {
      try {
        const binString = atob(decodeURIComponent(importData));
        const utf8Bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
          utf8Bytes[i] = binString.charCodeAt(i);
        }
        const jsonStr = new TextDecoder().decode(utf8Bytes);
        const data = JSON.parse(jsonStr);

        if (data && data.uid) {
          localStorage.setItem('monster_collector_uid', data.uid);
          localStorage.setItem('monster_collector_player_name', data.playerName || 'Lovec');
          if (data.avatarStyle) localStorage.setItem('monster_collector_avatar_style', data.avatarStyle);
          if (data.avatarSeed) localStorage.setItem('monster_collector_avatar_seed', data.avatarSeed);
          if (data.totalXP !== undefined) localStorage.setItem('monster_collector_xp', String(data.totalXP));
          if (data.caughtMonsters) localStorage.setItem('monster_collector_caught', JSON.stringify(data.caughtMonsters));
          if (data.inventory) {
            localStorage.setItem('monster_collector_inventory', JSON.stringify(data.inventory));
            localStorage.setItem('monster_collector_inventory_v2', JSON.stringify(data.inventory));
          }
          
          alert('Váš herní postup byl úspěšně přenesen! Hra se nyní restartuje.');
          window.location.href = window.location.origin + window.location.pathname;
        } else {
          alert('Chyba: Neplatný formát dat pro import.');
        }
      } catch (err: any) {
        console.error(err);
        alert('Chyba při importu dat: Odkaz je poškozený nebo neúplný.');
      }
      return;
    }

    if (urlLang && ['cz', 'en', 'sk'].includes(urlLang)) {
      i18n.changeLanguage(urlLang);
    }

    if (refCode) {
      processReferralCode(refCode, 'URL');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // 2. Handle Native Deep Links (monsterapp://invite?ref=CODE or Universal Links)
    const handleDeepLink = (event: any) => {
      try {
        const url = new URL(event.url);
        const ref = url.searchParams.get('ref');
        if (ref) {
          processReferralCode(ref, 'Deep Link');
        }

        const importData = url.searchParams.get('import');
        if (importData) {
          const binString = atob(decodeURIComponent(importData));
          const utf8Bytes = new Uint8Array(binString.length);
          for (let i = 0; i < binString.length; i++) {
            utf8Bytes[i] = binString.charCodeAt(i);
          }
          const jsonStr = new TextDecoder().decode(utf8Bytes);
          const data = JSON.parse(jsonStr);

          if (data && data.uid) {
            localStorage.setItem('monster_collector_uid', data.uid);
            localStorage.setItem('monster_collector_player_name', data.playerName || 'Lovec');
            if (data.avatarStyle) localStorage.setItem('monster_collector_avatar_style', data.avatarStyle);
            if (data.avatarSeed) localStorage.setItem('monster_collector_avatar_seed', data.avatarSeed);
            if (data.totalXP !== undefined) localStorage.setItem('monster_collector_xp', String(data.totalXP));
            if (data.caughtMonsters) localStorage.setItem('monster_collector_caught', JSON.stringify(data.caughtMonsters));
            if (data.inventory) {
              localStorage.setItem('monster_collector_inventory', JSON.stringify(data.inventory));
              localStorage.setItem('monster_collector_inventory_v2', JSON.stringify(data.inventory));
            }
            
            alert('Váš herní postup byl úspěšně přenesen do aplikace! Hra se nyní restartuje.');
            window.location.reload();
          }
        }
      } catch (e) {
        console.error('Deep link error:', e);
      }
    };

    CapApp.addListener('appUrlOpen', handleDeepLink);

    // 3. Handle Native Install Referrer (Google Play)
    const handleInstallReferrer = (event: any) => {
      try {
        console.log('[Referral] Nativní event přijat:', event);

        // Event může přijít jako CustomEvent s detail (Capacitor), nebo jako Capacitor event
        const rawData = event.detail || event;
        let data = rawData;

        if (typeof rawData === 'string') {
          try {
            data = JSON.parse(rawData);
          } catch (e) {
            // Není to JSON, zkusíme jestli to není přímo kód
            data = { referrer: rawData };
          }
        }

        let code = data.referrer || data.value || (typeof data === 'string' ? data : null);

        console.log('[Referral] Nativní kód k zpracování:', code);

        if (code) {
          // Google Play referrer formát: "ref=FIREBASE_UID" (URL-encoded)
          if (typeof code === 'string' && code.includes('=')) {
            try {
              const params = new URLSearchParams(code);
              const extracted = params.get('ref');
              if (extracted) code = extracted;
            } catch (e) {
              console.warn("[Referral] Chyba při parsování referrer parametrů");
            }
          }

          processReferralCode(code, 'Google Play Referrer');
        }
      } catch (e) {
        console.warn('Zpracování nativního referreru selhalo:', e);
      }
    };

    window.addEventListener('onInstallReferrer', handleInstallReferrer);

    // DŮLEŽITÉ: Zkontrolovat, jestli už kód nečeká v globální proměnné (pokud přišel dřív než listener)
    if ((window as any).__nativeReferrer) {
      console.log('[Referral] Nalezen předem doručený kód:', (window as any).__nativeReferrer);
      handleInstallReferrer({ detail: { referrer: (window as any).__nativeReferrer } });
      (window as any).__nativeReferrer = null; // Vyčistit, ať to nezpracováváme 2x
    }

    return () => {
      CapApp.removeAllListeners();
      window.removeEventListener('onInstallReferrer', handleInstallReferrer);
    };
  }, [userUid, playerName, playerEmail]);

  // --- FIREBASE AUTH & SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserUid(firebaseUser.uid);

        // Referral vždy zkontrolujeme – bez ohledu na to, jestli má hráč backup
        const refFromUrl = pendingReferral || localStorage.getItem('pending_referral');
        const referrerUidMatch = firebaseUser.email ? await checkEmailInvitation(firebaseUser.email) : null;
        const finalRef = refFromUrl || referrerUidMatch;

        console.log('[Referral/Auth] uid:', firebaseUser.uid, 'finalRef:', finalRef, 'refFromUrl:', refFromUrl, 'emailMatch:', referrerUidMatch);

        // Online Backup Recovery
        const backup = await loadUserBackup(firebaseUser.uid);
        if (backup && !playerName) {
          // Restore data if user is logging in on a new device
          setPlayerName(backup.playerName);
          setAvatarStyle(backup.avatarStyle);
          setAvatarSeed(backup.avatarSeed);

          // Pokud byl uživatel pozván (ale v backupu to není), zaregistrujeme referral
          const backupRef = backup.referredBy || finalRef;
          if (backupRef) {
            console.log('[Referral/Auth] Nastavuji referredBy z backupu:', backupRef);
            setReferredBy(backupRef);
          }

          if (finalRef && finalRef !== firebaseUser.uid && !backup.referredBy && (backup.currentLevel || 1) < 2) {
            // Hráč má backup, ale referral ještě nebyl zaregistrován
            console.log('[Referral/Auth] Registrace referralu pro existujícího hráče (Level 1)');
            const isNew = await registerReferral(finalRef, firebaseUser.uid, backup.playerName || firebaseUser.displayName || 'Lovec', firebaseUser.email);
            if (isNew) {
              addToast({ title: 'Pozvánka přijata!', message: 'Byl jsi úspěšně spárován s lovcem.', type: 'success' });
            }
            localStorage.removeItem('pending_referral');
          }

          // Note: hooks like usePlayerXP/useMonsters also need to be synced
          // For now, we update localStorage so hooks pick it up on reload or next sync
          localStorage.setItem('monster_collector_player_name', backup.playerName);
          localStorage.setItem('monster_collector_avatar_style', backup.avatarStyle);
          localStorage.setItem('monster_collector_avatar_seed', backup.avatarSeed);
           if (backup.totalXP) localStorage.setItem('monster_collector_xp', backup.totalXP.toString());
          if (backup.caughtMonsters) localStorage.setItem('monster_collector_caught', JSON.stringify(backup.caughtMonsters));
          if (backup.inventory) {
            localStorage.setItem('monster_collector_inventory', JSON.stringify(backup.inventory));
            localStorage.setItem('monster_collector_inventory_v2', JSON.stringify(backup.inventory));
          }
          if (backup.pvw !== undefined) localStorage.setItem('monster_pvp_wins', backup.pvw.toString());
          if (backup.pvl !== undefined) localStorage.setItem('monster_pvp_losses', backup.pvl.toString());
          window.location.reload(); // Quickest way to let all hooks re-initialize with new data
        } else if (!backup && !playerName) {
          // Nový uživatel! Pouze uložíme informaci o pozvání do stavu, zápis provedeme až po dokončení profilu (získání jména)
          if (finalRef && finalRef !== firebaseUser.uid) {
            console.log('[Referral/Auth] Nový uživatel s referralem (čeká na dokončení profilu):', finalRef);
            setReferredBy(finalRef);
          }
        } else if (backup && playerName) {
          // Existující hráč (přihlásil se znovu) – zkontroluj jestli má referredBy
          if (finalRef && finalRef !== firebaseUser.uid && !backup.referredBy && currentLevel < 2) {
            console.log('[Referral/Auth] Existující hráč (Level 1), nový referral:', finalRef);
            setReferredBy(finalRef);
            await registerReferral(finalRef, firebaseUser.uid, playerName || 'Lovec', firebaseUser.email);
            localStorage.removeItem('pending_referral');
          } else if (backup.referredBy) {
            // DŮLEŽITÉ: Vždy obnovit referredBy z backupu!
            const resolvedRef = await resolveReferralCode(backup.referredBy);
            console.log('[Referral/Auth] Obnovuji referredBy z backupu:', resolvedRef);
            setReferredBy(resolvedRef);
          }
        }
      } else {
        console.log('[Referral/Auth] Žádný přihlášený uživatel. Pokus o anonymní přihlášení...');
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error('[Referral/Auth] Chyba při anonymním přihlášení:', err);
          setUser(null);
          setUserUid(PLAYER_UID);
        }
      }
    });
    return () => unsubscribe();
  }, [playerName, pendingReferral]);

  useEffect(() => {
    if (user && userUid && playerName) {
      const interval = setInterval(async () => {
        const now = Date.now();
        await saveUserBackup(userUid, {
          playerName,
          email: playerEmail,
          avatarStyle,
          avatarSeed,
          totalXP,
          currentLevel,
          caughtMonsters,
          inventory,
          pvw: pvpWins,
          pvl: pvpLosses,
          ...(referredBy ? { referredBy } : {}),
          lastSync: now
        });
        setLastSync(now);
        localStorage.setItem('monster_collector_last_sync', now.toString());
      }, 60000); // Back up every minute
      return () => clearInterval(interval);
    }
  }, [user, userUid, playerName, playerEmail, avatarStyle, avatarSeed, totalXP, currentLevel, caughtMonsters, inventory, pvpWins, pvpLosses]);

  // Automatická synchronizace progressu k referrerovi (Milanovi)
  useEffect(() => {
    if (userUid && referredBy && totalXP >= 0) {
      syncReferralProgress(userUid, currentLevel, totalXP, referredBy, playerName || undefined);
    }
  }, [totalXP, currentLevel, userUid, referredBy, playerName]);

  // Trigger toast if weak device was auto-detected on first launch
  useEffect(() => {
    const isFirstLaunchDetection = !localStorage.getItem('monster_graphics_quality_detected_alerted');
    if (isFirstLaunchDetection && graphicsQuality === 'low') {
      localStorage.setItem('monster_graphics_quality_detected_alerted', 'true');
      addToast({
        title: t('toasts.low_graphics_detected_title'),
        message: t('toasts.low_graphics_detected_desc'),
        type: 'info'
      });
    }
  }, [graphicsQuality, addToast, t]);


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
  const isFirstReferralLoad = useRef(true);
  const referralsRef = useRef<ReferralEntry[]>([]);
  
  // Sync ref with state to prevent dependencies loop
  useEffect(() => {
    referralsRef.current = referrals;
  }, [referrals]);

  useEffect(() => {
    if (!userUid) return;
    const unsubscribe = watchReferrals(userUid, (data) => {
      if (!data) {
        setReferrals([]);
        isFirstReferralLoad.current = false;
        return;
      }
      const list: ReferralEntry[] = Object.entries(data).map(([uid, val]: [string, any]) => ({
        uid,
        ...val
      }));

      // Kontrola změn (pouze pokud už máme počáteční data)
      if (!isFirstReferralLoad.current) {
        list.forEach(refEntry => {
          const previousData = referralsRef.current.find(r => r.uid === refEntry.uid);

          // 1. Nová registrace (přechod z levelu 0 na level 1+)
          if (refEntry.level >= 1 && (!previousData || previousData.level === 0)) {
            addToast({
              title: 'Nové vajíčko! 🥚',
              message: `Tvůj přítel ${refEntry.name || 'Lovec'} se zaregistroval. Vajíčko se vylíhne na 3. úrovni!`,
              type: 'success'
            });
          }

          // 2. Dosažení levelu 3 (připraveno k líhnutí)
          if (refEntry.level >= 3 && !refEntry.hatchClaimed) {
            if (!previousData || previousData.level < 3) {
              addToast({
                title: 'Vajíčko je připraveno! 🥚',
                message: `Tvůj přítel ${refEntry.name || 'Lovec'} dosáhl úrovně 3. Utíkej si vylíhnout odměnu!`,
                type: 'boost'
              });

              LocalNotifications.schedule({
                notifications: [{
                  title: "Odměna čeká! 🎁",
                  body: `${refEntry.name || 'Tvůj přítel'} dosáhl úrovně 3. Vajíčko je připraveno!`,
                  id: 2,
                  schedule: { at: new Date(Date.now() + 1000) }
                }]
              });
            }
          }
        });
      }

      setReferrals(list);
      isFirstReferralLoad.current = false;
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
        addToast({ title: 'Debug', message: `Příšera ${getLoc(found.name)} (ID: ${id}) přidána!`, type: 'xp' });
        console.log(`✅ Příšera ${found.name} přidána do sbírky.`);
      } else {
        console.error(`❌ Příšera s ID ${id} neexistuje v databázi.`);
      }
    };
  }, [saveMonster, addToast, addXP]);



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
      addToast({ title: '🧬 Monstrum přidáno!', message: `${getLoc(base.name)} (Lv.${lvl}) se připojilo k tobě!`, type: 'success' });
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

  // Temporary effect to grant the legendary monster as requested
  useEffect(() => {
    const hasGranted = localStorage.getItem('temp_granted_legendary_gift_114');
    if (!hasGranted) {
      const legendMonster = monsterDB.find(m => {
        const r = (m.rarity || '').toLowerCase();
        return r.includes('legend') || r.includes('legendárn');
      }) || monsterDB.find(m => m.id === '114') || monsterDB[0];

      if (legendMonster) {
        const monsterToSave = {
          ...legendMonster,
          level: 10,
          caughtAt: Date.now(),
          xp: 0,
          currentHP: (legendMonster.stats?.hp || 100) * 10, // Full HP
          image: `/monsters/${legendMonster.id}.png`,
          gems: [null, null, null]
        };
        saveMonster(monsterToSave as any, () => {});
        localStorage.setItem('temp_granted_legendary_gift_114', 'true');
        addToast({ 
          title: '🎁 Legendární dárek!', 
          message: `${getLoc(legendMonster.name)} (Lv.10) byl přidán do tvé sbírky!`, 
          type: 'success' 
        });
      }
    }
  }, [saveMonster, addToast]);

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
      if (spawnId) {
        (window as any).markMonsterAsCaught?.(spawnId);
      }
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
      addToast({ title: t('toasts.error'), message: t('toasts.item_missing'), type: 'info' });
      return;
    }

    const cfg = RESOURCE_CONFIG[type];
    if (!cfg) return;

    const label = getLoc(cfg.label, i18n.language);

    // Apply immediate stat heals
    if (cfg.stats?.hp) {
      const amount = cfg.statsType === 'perc' ? 100 : cfg.stats.hp; // Since max HP is 100 (for player)
      healHP(amount);
      if (caughtMonsters.length > 0) updateMonsterHP(0, amount);
      addToast({
        title: t('toasts.item_used', { name: label }),
        message: t('toasts.hp_healed', { amount: cfg.statsType === 'perc' ? cfg.stats.hp + '%' : amount }),
        type: 'success'
      });
    }
    if (cfg.stats?.energy) {
      addToast({
        title: t('toasts.item_used', { name: label }),
        message: t('toasts.energy_restored'),
        type: 'info'
      });
    }

    // Apply special effects
    if (cfg.specialEffect && cfg.specialEffect !== 'none') {
      const mins = cfg.effectDuration || 15;
      if (cfg.specialEffect === 'xp_boost') {
        activateBoost({ type: 'xp_boost', multiplier: 2, expiresAt: Date.now() + mins * 60 * 1000 });
        addToast({ title: t('toasts.xp_boost_title'), message: t('toasts.xp_boost_msg', { mins }), type: 'boost' });
      } else if (cfg.specialEffect === 'hp_regen') {
        activateBoost({ type: 'hp_regen', multiplier: 2, expiresAt: Date.now() + mins * 60 * 1000 });
        addToast({ title: t('toasts.hp_regen_title'), message: t('toasts.hp_regen_msg', { mins }), type: 'success' });
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
      addToast({ title: t('toasts.monsters_dead'), message: t('toasts.heal_needed'), type: 'error' });
      return;
    }
    if (pvpRole) updateDailyStat('duels');
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
        title: t('toasts.victory'),
        message: t('toasts.victory_msg', { xp, loot: lootMsg || 'nic' }),
        type: 'success'
      });
    }
  };

  const handleGather = (type: ResourceType, amount: number) => {
    addResource(type, amount)
    addToast({
      title: t('toasts.resource_gathered'),
      message: t('toasts.resource_gathered_msg', { amount, type }),
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
        addToast({ title: t('toasts.trade_done'), message: t('toasts.trade_done_msg', { name: getLoc(dbM.name) }), type: 'success' });
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
      whileHover={{ scale: 1.03, translateY: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => setActiveTab('store')}
      className="w-full mb-6 p-4 bg-gradient-to-r from-amber-500/25 via-amber-500/5 to-amber-950/10 border border-amber-500/35 rounded-2xl flex items-center justify-between group relative overflow-hidden shadow-[0_4px_25px_rgba(245,158,11,0.08)] active:shadow-[0_2px_10px_rgba(245,158,11,0.08)] transition-all duration-300"
    >
      {/* Shining effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent pointer-events-none animate-rarity-glint" />
      
      <div className="flex items-center gap-4 relative z-10">
        {/* Glowing Shop Icon Container */}
        <div className="size-12 bg-gradient-to-br from-amber-400 to-yellow-300 rounded-xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all duration-300">
          <Sparkles size={24} className="animate-pulse" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-white uppercase italic leading-none tracking-tight">
              {t('tabs.store')}
            </h3>
            {/* Glowing Premium Badge */}
            <span className="text-[8px] font-black text-slate-950 bg-gradient-to-r from-yellow-300 to-amber-400 px-1.5 py-0.5 rounded-full leading-none tracking-wider uppercase shadow-[0_0_10px_rgba(245,158,11,0.4)]">
              PREMIUM
            </span>
          </div>
          <p className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider mt-1 leading-tight">
            {t('store.button_subtitle')}
          </p>
        </div>
      </div>
      
      {/* Right trophy icon with glow */}
      <div className="size-8 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-amber-400 group-hover:text-white group-hover:border-amber-400/50 group-hover:bg-amber-500/20 transition-all duration-300 relative z-10 shadow-[inner_0_0_4px_rgba(255,255,255,0.05)]">
        <Trophy size={16} className="group-hover:scale-110 transition-transform" />
      </div>
    </motion.button>
  )

  const showTestEndedScreen = !isProdDb && (Capacitor.isNativePlatform() || !import.meta.env.DEV) && !isTestEndedSkipped;

  if (showTestEndedScreen && !isEditorMode) {
    return <TestEndedModal onSkip={() => setIsTestEndedSkipped(true)} />;
  }

  if (isBlocked && !isEditorMode) {
    return (
      <BlockedUserScreen
        playerName={playerName}
        userUid={userUid}
        onLogout={() => {
          logout();
          window.location.reload();
        }}
      />
    );
  }

  if (isEditorMode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Načítám administraci...</div>}>
        <SystemEditor onBack={() => {
          window.history.pushState({}, '', window.location.pathname);
          setIsEditorMode(false);
        }} />
      </Suspense>
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
            graphicsQuality={graphicsQuality}
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
              if (activeBattle?.pvpRole) {
                setPvpWins(prev => {
                  const next = prev + 1;
                  localStorage.setItem('monster_pvp_wins', next.toString());
                  return next;
                });
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
                addToast({ title: t('toasts.close_defeat'), message: t('toasts.close_defeat_msg', { xp }), type: 'info' });
              } else {
                setPvpLosses(prev => {
                  const next = prev + 1;
                  localStorage.setItem('monster_pvp_losses', next.toString());
                  return next;
                });
                addToast({ title: t('toasts.defeat'), message: t('toasts.defeat_msg'), type: 'error' });
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
              addToast({ title: t('toasts.escaped'), message: t('toasts.escaped_msg'), type: 'info' });
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
          initialReferral={pendingReferral || undefined}
        />
      )}

      {activeTab !== 'detail' && (
        <Header
          title={
            activeTab === 'vault' ? t('tabs.bestiary') :
              activeTab === 'inventory' ? t('tabs.inventory') :
                activeTab === 'world' ? t('tabs.world') :
                  activeTab === 'store' ? t('tabs.store') :
                    activeTab === 'codex' ? t('tabs.laboratory') :
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
          onDebugClick={() => setIsConsoleOpen(true)}
        />
      )}

      <main className="mx-auto relative w-full max-w-md md:max-w-lg">
        {/* Main Tabs - Always mounted to preserve scroll state */}
        <div className="w-full">
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
              <LatestDetection lastCaught={lastCaught} onSelect={(m) => {
                setSelectedMonster(m);
                setActiveTab('detail');
              }} />
              <RecentActivity
                caughtMonsters={caughtMonsters}
                onSelect={(m) => {
                  setSelectedMonster(m);
                  setActiveTab('detail');
                }}
                onSeeAll={() => setActiveTab('vault')}
              />
              <DailyQuests
                caughtMonsters={caughtMonsters}
                dailyDistance={dailyDistance}
                onClaimReward={(xp) => handleClaimReward(xp, activeBoosts)}
                isXPBoosted={activeBoosts.some(b => b.type === 'xp_boost' && b.expiresAt > Date.now())}
                playerLevel={currentLevel}
                dailyStats={dailyStats}
                referrals={referrals}
                onInvite={() => setIsInviteModalOpen(true)}
                onHatch={handleHatchReferral}
                onDelete={handleDeleteReferral}
              />
              <Leaderboard 
                userUid={userUid} 
                localPlayerName={playerName}
                localMonsterCount={new Set(caughtMonsters.map(m => m.id)).size}
                localPvpWins={pvpWins}
                localPvpLosses={pvpLosses}
              />
            </motion.div>
          )}

          {activeTab === 'vault' && (
            <Bestiary
              key="bestiary"
              caughtMonsters={caughtMonsters}
              onSelect={(m) => {
                setSelectedMonster(m);
                setActiveTab('detail');
              }}
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
              isInteractionBlocked={!!newMonster || (activeTab as string) === 'detail' || !!activeBattle || !!wildEncounter}
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
              graphicsQuality={graphicsQuality}
              spawnRadius={spawnRadius}
              mapTheme={isMapAutoTheme ? 'auto' : mapTheme}
              email={user?.email || playerEmail}
              pvpWins={pvpWins}
              pvpLosses={pvpLosses}
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

          {activeTab === 'detail' && selectedMonster && (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <MonsterDetail
                key="detail"
                monster={selectedMonster}
                graphicsQuality={graphicsQuality}
                canRelease={caughtMonsters.length > 1}
                onBack={() => {
                  setSelectedMonster(null);
                  setActiveTab('vault');
                }}
                inventory={inventory}
                onUsePotion={(type: string) => {
                  const idx = caughtMonsters.findIndex(m => (m as any).caughtAt === (selectedMonster as any).caughtAt);
                  if (idx !== -1) {
                    const cfg = RESOURCE_CONFIG[type];
                    if (cfg && cfg.stats?.hp) {
                      updateMonsterHP(idx, cfg.stats.hp);
                      consumeResources([{ type: type as any, count: 1 }]);
                      addToast({
                        title: t('toasts.monster_healed'),
                        message: t('toasts.monster_healed_msg', { amount: cfg.stats.hp }),
                        type: 'success'
                      });
                    }
                  }
                }}
                onEquipGem={(gemIdx, type) => {
                  const idx = caughtMonsters.findIndex(m => (m as any).caughtAt === (selectedMonster as any).caughtAt);
                  if (idx !== -1) {
                    const oldGem = caughtMonsters[idx].gems?.[gemIdx];
                    equipGem(idx, gemIdx, type);
                    const newGems = [...(caughtMonsters[idx].gems || [null, null, null])];
                    newGems[gemIdx] = type;
                    const updated = { ...caughtMonsters[idx], gems: newGems };
                    setSelectedMonster(updated);
                    if (type) consumeResources([{ type: type as any, count: 1 }]);
                    if (oldGem) addResource(oldGem as any, 1);
                    addToast({
                      title: type ? t('toasts.gem_inserted') : t('toasts.gem_removed'),
                      message: type ? t('toasts.gem_inserted_msg') : t('toasts.gem_removed_msg'),
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
                      title: type ? t('toasts.relic_inserted') : t('toasts.relic_removed'),
                      message: type ? t('toasts.relic_inserted_msg') : t('toasts.relic_removed_msg'),
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
                      title: t('toasts.mutation_title'),
                      message: t('toasts.mutation_msg', { name: getLoc(selectedMonster.name) }),
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
                    setActiveTab('vault');
                    addToast({ title: t('toasts.released'), message: t('toasts.released_msg', { name: getLoc(selectedMonster.name) }), type: 'info' });
                  } else {
                    const fallbackIdx = caughtMonsters.findIndex(m => m.id === selectedMonster.id);
                    if (fallbackIdx !== -1) {
                      removeMonster(selectedMonster.id);
                      setSelectedMonster(null);
                      setActiveTab('vault');
                      addToast({ title: t('toasts.released'), message: t('toasts.released_msg', { name: getLoc(selectedMonster.name) }), type: 'info' });
                    }
                  }
                }}
              />
            </motion.div>
          )}

          {activeTab === 'dungeon' && (
            <Dungeon onBack={() => setActiveTab('home')} caughtMonsters={caughtMonsters} />
          )}
        </div>
      </main>

      <NavBar active={activeTab === 'codex' ? 'inventory' : activeTab} onTabChange={(tab) => {
        setSelectedMonster(null)
        setActiveTab(tab)
        // Scroll to top of the page when clicking the navigation tabs
        window.scrollTo({ top: 0, behavior: 'instant' });
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
            googleEmail={user?.isAnonymous ? null : user?.email}
            playerEmail={playerEmail}
            isGoogleLinked={!!user && !user.isAnonymous}
            onUpdateEmail={(email) => {
              setPlayerEmail(email)
              localStorage.setItem('monster_collector_player_email', email)
            }}
            onLogout={() => logout()}
            caughtCount={new Set(caughtMonsters.map(m => m.id)).size}
            totalMonsters={monsterDB.length}
            lastSync={lastSync}
            isBatterySaver={isBatterySaver}
            onUpdateBatterySaver={(active) => {
              setIsBatterySaver(active);
              localStorage.setItem('monster_battery_saver', String(active));
            }}
            graphicsQuality={graphicsQuality}
            onUpdateGraphicsQuality={(quality) => {
              setGraphicsQuality(quality);
              localStorage.setItem('monster_graphics_quality', quality);
            }}
            isDebugMode={isDebugMode}
            onToggleDebug={() => {
              setIsConsoleOpen(true);
            }}
            mapTheme={mapTheme}
            isMapAutoTheme={isMapAutoTheme}
            onUpdateMapTheme={(theme, auto) => {
              setMapTheme(theme);
              setIsMapAutoTheme(auto);
              localStorage.setItem('monster_map_theme', theme);
              localStorage.setItem('monster_map_auto_theme', auto.toString());
            }}
            spawnRadius={spawnRadius}
            onUpdateSpawnRadius={setSpawnRadius}
            onLogin={async () => {
              try {
                const user = await signInWithGoogle();
                if (user) {
                  addToast({ title: t('settings.login_success') || 'Přihlášeno!', message: t('settings.welcome_back', { name: user.displayName || 'lovče' }) || `Vítej zpět, ${user.displayName || 'lovče'}!`, type: 'success' });
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
                <h3 className="text-xl font-black text-white uppercase mb-2">{t('p2p_trade.request_sent')}</h3>
                <p className="text-sm text-slate-400">{t('p2p_trade.waiting_partner', { name: p2pTrade.partnerName })}</p>
                <button onClick={() => setP2pTrade(null)} className="mt-8 px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase w-full">{t('p2p_trade.cancel')}</button>
              </motion.div>
            )}

            {p2pTrade.step === 'INCOMING_REQ' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-sm bg-slate-900 border border-purple-500/30 rounded-3xl p-8 text-center shadow-2xl">
                <SignalHigh size={48} className="text-purple-500 animate-bounce mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase mb-2">{t('p2p_trade.incoming')}</h3>
                <p className="text-sm text-slate-400">{t('p2p_trade.incoming_msg', { name: p2pTrade.partnerName })}</p>
                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={() => setP2pTrade({ ...p2pTrade, step: 'SELECTING' })} className="px-4 py-3 rounded-xl bg-purple-600 text-white font-black uppercase shadow-lg">{t('p2p_trade.accept')}</button>
                  <button onClick={() => setP2pTrade(null)} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold uppercase">{t('p2p_trade.reject')}</button>
                </div>
              </motion.div>
            )}

            {p2pTrade.step === 'WAITING_OFFER' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-sm bg-slate-900 border border-blue-500/30 rounded-3xl p-8 text-center shadow-2xl">
                <RefreshCw size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase mb-2">{t('p2p_trade.waiting_offer')}</h3>
                <p className="text-sm text-slate-400">{t('p2p_trade.partner_selecting', { name: p2pTrade.partnerName })}</p>
                <button onClick={() => setP2pTrade(null)} className="mt-8 px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase w-full">{t('p2p_trade.cancel')}</button>
              </motion.div>
            )}

            {p2pTrade.step === 'CONFIRMING' && p2pTrade.myMonster && p2pTrade.theirMonster && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-sm bg-slate-900 border border-orange-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-xl font-black text-center text-white uppercase mb-6">{t('p2p_trade.confirm_title')}</h3>
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div className="flex-1 text-center bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">{t('p2p_trade.you_give')}</p>
                    <img src={`/monsters/${p2pTrade.myMonster.id}.png`} className="w-16 h-16 object-contain mx-auto mix-blend-screen mb-1" alt="" />
                    <p className="text-xs font-bold text-white uppercase">{getLoc(p2pTrade.myMonster.name)}</p>
                    <p className="text-[10px] text-slate-400">LVL {p2pTrade.myMonster.level}</p>
                  </div>
                  <RefreshCw size={24} className="text-slate-500 shrink-0" />
                  <div className="flex-1 text-center bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                    <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-2">{t('p2p_trade.you_get')}</p>
                    <img src={`/monsters/${p2pTrade.theirMonster.id}.png`} className="w-16 h-16 object-contain mx-auto mix-blend-screen mb-1" alt="" />
                    <p className="text-xs font-bold text-white uppercase">{getLoc(p2pTrade.theirMonster.name)}</p>
                    <p className="text-[10px] text-slate-400">LVL {p2pTrade.theirMonster.level}</p>
                  </div>
                </div>

                {p2pTrade.confirmedByMe ? (
                  <div className="w-full text-center py-4 rounded-xl bg-orange-500/20 border border-orange-500/30">
                    <p className="text-xs font-black text-orange-400 uppercase tracking-widest animate-pulse">{t('p2p_trade.waiting_finish')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setP2pTrade({ ...p2pTrade, confirmedByMe: true })} className="px-4 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95">{t('p2p_trade.complete')}</button>
                    <button onClick={() => setP2pTrade(null)} className="px-4 py-4 rounded-xl bg-slate-800 text-slate-400 font-bold uppercase transition-transform active:scale-95">{t('p2p_trade.cancel')}</button>
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
              title={t('duel.picking')}
              description={t('duel.picking_desc')}
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
                <h3 className="text-xl font-black text-white uppercase">{t('duel.challenge_sent')}</h3>
                <p className="text-sm text-slate-400 mt-2">{t('duel.waiting_accept', { name: duel.partnerName })}</p>
                <button onClick={cancelChallenge} className="mt-8 w-full py-3 bg-slate-800 text-slate-400 font-bold rounded-xl uppercase">{t('p2p_trade.cancel')}</button>
              </motion.div>
            )}

            {duel.step === 'INCOMING' && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-slate-900 border border-red-500/50 rounded-3xl p-8 text-center shadow-2xl">
                <Sword size={48} className="text-red-500 animate-bounce mx-auto mb-4" />
                <h3 className="text-xl font-black text-white uppercase">{t('duel.incoming')}</h3>
                <p className="text-sm text-slate-400 mt-2">{t('duel.incoming_msg', { name: duel.partnerName })}</p>
                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={() => {
                    notifyAccept();
                  }} className="py-4 bg-red-600 text-white font-black rounded-xl uppercase text-xs">{t('duel.accept')}</button>
                  <button onClick={rejectChallenge} className="py-4 bg-slate-800 text-slate-400 font-black rounded-xl uppercase text-xs">{t('duel.reject')}</button>
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
                <h3 className="text-xl font-black text-white uppercase italic">{t('duel.waiting_opponent')}</h3>
                <p className="text-sm text-slate-400 mt-2">{t('duel.waiting_opponent_msg', { name: duel.partnerName })}</p>
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
        referralCode={userUid.slice(-6).toUpperCase()}
      />

      <DebugConsole
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        logs={logs}
        onClear={() => setLogs([])}
        onCheat={handleCheat}
        onToggleLegacy={() => {
          setIsDebugMode(!isDebugMode);
          setIsConsoleOpen(false); // Zavřít konzoli, aby byl vidět bar
        }}
      />
    </div>
  )

  async function handleProfileComplete(name: string, email?: string, referralCode?: string, overrideUid?: string) {
    // Použijeme explicitně předané UID z login procesu, abychom se vyhnuli race conditions
    const currentUid = overrideUid || userUid;

    setPlayerName(name)
    localStorage.setItem('monster_collector_player_name', name)
    if (email) {
      setPlayerEmail(email)
      localStorage.setItem('monster_collector_player_email', email)
    }

    if (referralCode && currentUid) {
      if (currentLevel < 2) {
        const resolvedRef = await resolveReferralCode(referralCode);
        console.log('[Referral/Setup] Registrace s kódem:', resolvedRef);
        setReferredBy(resolvedRef);
        const isNew = await registerReferral(resolvedRef, currentUid, name, email);
        if (isNew) {
          addToast({ title: 'Pozvánka uložena!', message: 'Odměnu získáš až budeš na Lv. 3!', type: 'success' });
        }
      } else {
        addToast({ title: 'Pozvánka ignorována', message: 'Tento účet již není považován za nově registrovaný.', type: 'info' });
      }
      localStorage.removeItem('pending_referral');
    } else if (email && currentUid && currentLevel < 2) {
      // Zkusíme automaticky dohledat pozvánku podle emailu
      const autoReferrer = await checkEmailInvitation(email);
      if (autoReferrer && autoReferrer !== currentUid) {
        setReferredBy(autoReferrer);
        await registerReferral(autoReferrer, currentUid, name, email);
        addToast({ title: 'Pozvánka spárována!', message: 'Našli jsme tvé dřívější pozvání přes email.', type: 'success' });
      }
    }
  }

  async function handleHatchReferral(invitedUid: string) {
    try {
      if (!userUid) return;

      // Pojistka proti vícenásobnému vybrání
      const referral = referrals.find(r => r.uid === invitedUid);
      if (referral?.hatchClaimed) {
        console.warn("[Referral] Odměna již byla dříve vybrána.");
        return;
      }

      await claimReferralReward(userUid, invitedUid);

      const rarePool = monsterDB.filter(m => {
        const r = (m.rarity || '').toLowerCase();
        return r === 'vzácná' || r === 'rare';
      });
      const randomMonster = rarePool[Math.floor(Math.random() * rarePool.length)];

      if (randomMonster) {
        const monsterWithMeta: Monster = {
          ...randomMonster,
          level: 4,
          image: `/monsters/${randomMonster.id}.png`,
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
        addToast({ title: 'Vajíčko vylíhnuto!', message: `Získal jsi vzácného ${getLoc(randomMonster.name)}!`, type: 'success' });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDeleteReferral(invitedId: string) {
    if (!userUid) return;
    try {
      const referral = referrals.find(r => r.uid === invitedId);
      if (referral?.hatchClaimed) {
        addToast({ title: 'Nelze smazat', message: 'Vylíhlé vajíčko už nelze odstranit pro zachování historie odměn.', type: 'error' });
        return;
      }

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
