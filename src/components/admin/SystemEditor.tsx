import React, { useState, useEffect } from 'react'
import {
  Save, Plus, Trash2, Download, Copy, ArrowLeft, ShieldAlert,
  Beaker, Gem, Droplets,
  Package, Dice5, ChevronRight, X, Settings2, Palette, Upload,
  Sword, Shield, Heart, Sparkles, Info, Check, Users, Globe, Languages,
  Trophy, Activity, Clock, Swords
} from 'lucide-react'

import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { monsterDB } from '../../data/monsters'
import { RESOURCE_CONFIG as initialResources } from '../../data/resources'
import { cn, TYPE_COLORS, TYPE_ICONS, getMonsterColors, getMonsterTypeIcon, getMonsterRarityColor, getLoc, RARITY_COLORS } from '../../utils'
import { SYSTEM_SETTINGS } from '../../data/settings'
import { db, isProdDb } from '../../lib/firebase'
import { ref, onValue, set, get } from 'firebase/database'
import translationsData from '../../data/translations.json'
import systemValues from '../../data/system_values.json'

// Tabs
import { MonsterEditorTab } from './tabs/MonsterEditorTab'
import { ResourceDesignTab } from './tabs/ResourceDesignTab'
import { UserManagementTab } from './tabs/UserManagementTab'
import { TranslationEditorTab } from './tabs/TranslationEditorTab'
import { DungeonEditorTab } from './tabs/DungeonEditorTab'
import { dungeonsDB } from '../../data/dungeons'

// --- Constants ---
const MONSTER_TYPES = ['fire', 'water', 'nature', 'electric']
const MONSTER_RARITIES = ['common', 'rare', 'epic', 'legendary']



function Snowflake(props: any) {
  return <Droplets {...props} className={cn(props.className, "rotate-180")} />
}

const TYPE_EMOJIS: Record<string, string> = {
  'fire': '🔥', 'water': '💧', 'nature': '🌿', 'electric': '⚡'
}


const RARITY_EMOJIS: Record<string, string> = {
  'common': '⚪', 'rare': '🔵', 'epic': '🟣', 'legendary': '✨'
}

const ABILITY_TYPES = [
  { id: 'attack', label: '⚔️ Útočná speciální', defaultChance: 65, defaultVal: 155, desc: 'Dmg 155%' },
  { id: 'defense', label: '🛡️ Obrana', defaultChance: 65, defaultVal: 60, desc: 'Snížení dmg 60%' },
  { id: 'heal', label: '❤️ Léčení (Instantní)', defaultChance: 65, defaultVal: 15, desc: '+15% HP hned' },
  { id: 'regen', label: '🌿 Regenerace (2 kola)', defaultChance: 65, defaultVal: 10, desc: '+10% HP / kolo' },
  { id: 'curse', label: '💀 Kletba (2 kola)', defaultChance: 50, defaultVal: 20, desc: '20% Atk DMG / kolo' },
  { id: 'debuff', label: '🎯 Oslabení (2 kola)', defaultChance: 65, defaultVal: 40, desc: '-40% šance na zásah' },
  { id: 'reflect', label: '🪞 Odraz poškození (2 kola)', defaultChance: 70, defaultVal: 50, desc: 'Odrazí 50% DMG zpět' },
  { id: 'extra', label: '⚡ Extra útok (%)', defaultChance: 50, defaultVal: 40, desc: '+40% DMG k základu' },
]

type EditorTab = 'dashboard' | 'monsters' | 'resources' | 'users' | 'languages' | 'settings' | 'dungeons';


interface SystemEditorProps {
  onBack: () => void;
}

// Helper pro barevný časový štítek
const renderTimeBadge = (timestamp: number) => {
  if (!timestamp) return <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[7px] font-black uppercase">Nikdy</span>;

  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  let label = '';
  let colorClass = '';

  if (mins < 1) { label = 'ONLINE'; colorClass = 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'; }
  else if (mins < 60) { label = `-${mins}m`; colorClass = 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'; }
  else if (hours < 24) { label = `-${hours}h`; colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30'; }
  else if (days < 7) { label = `-${days}d`; colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30'; }
  else { label = `-${weeks}t`; colorClass = 'bg-red-500/20 text-red-500 border-red-500/30'; }

  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shadow-sm", colorClass)}>
      {label}
    </span>
  );
};

export const SystemEditor: React.FC<SystemEditorProps> = ({ onBack }) => {
  const { t, i18n } = useTranslation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passInput, setPassInput] = useState('')
  const [activeTab, setActiveTab] = useState<EditorTab>('dashboard')

  // Data States
  const [monsters, setMonsters] = useState(monsterDB)
  const [resourceConfig, setResourceConfig] = useState(initialResources)
  const [dungeons, setDungeons] = useState(dungeonsDB)

  // Selection & UI States
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null)
  const [monsterForm, setMonsterForm] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarFilter, setSidebarFilter] = useState('Vše')
  const [elementFilter, setElementFilter] = useState('Vše')

  // Players State
  const [players, setPlayers] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])

  // Translation & System Values State
  const [translationResources, setTranslationResources] = useState(translationsData as any)
  const [monsterTypes, setMonsterTypes] = useState(systemValues.monsterTypes)
  const [monsterRarities, setMonsterRarities] = useState(systemValues.monsterRarities)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  // Preview States
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false)
  const [jsonInput, setJsonInput] = useState('')

  // Global Note State
  const [globalNote, setGlobalNote] = useState(SYSTEM_SETTINGS.globalNote || '')
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)

  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleBackupDatabase = async () => {
    setIsBackingUp(true);
    try {
      let data: any = null;
      try {
        const rootSnap = await get(ref(db, "/"));
        if (rootSnap.exists()) {
          data = rootSnap.val();
        }
      } catch (err: any) {
        console.warn("Standard SDK backup read failed, attempting REST fallback...", err);
        
        let token = (import.meta.env.VITE_PROD_DB_SECRET as string) || localStorage.getItem('monster_admin_prod_auth_token') || "";
        if (!token) {
          const tokenInput = window.prompt(
            "Oprávnění pro zálohu celé databáze zamítnuto (permission_denied).\n\nZadejte prosím platný Database Secret z Firebase Console pro autorizaci stažení:"
          );
          if (tokenInput) {
            localStorage.setItem('monster_admin_prod_auth_token', tokenInput);
            token = tokenInput;
          }
        }

        if (token) {
          const dbUrl = db.app.options.databaseURL?.replace(/\/$/, "");
          if (dbUrl) {
            const res = await fetch(`${dbUrl}/.json?auth=${encodeURIComponent(token)}`);
            if (res.ok) {
              data = await res.json();
            } else {
              throw new Error(`REST API returned status: ${res.status}`);
            }
          }
        }
      }

      if (!data) {
        alert("Chyba při zálohování databáze (nedostatečná oprávnění).");
        return;
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const envName = isProdDb ? 'PROD' : 'TEST';
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("download", `monstero_backup_${envName}_${dateStr}.json`);
      downloadAnchor.click();
      alert("Záloha byla úspěšně stažena!");
    } catch (err: any) {
      console.error(err);
      alert("Chyba při zálohování databáze: " + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const envName = isProdDb ? 'PRODUKČNÍ' : 'TESTOVACÍ';
    if (!window.confirm(`⚠️ VAROVÁNÍ: Obnovením kompletně přepíšete aktuální ${envName} databázi daty ze záložního souboru. Všechna stávající data v tomto prostředí budou smazána.\n\nOpravdu chcete pokračovat?`)) {
      event.target.value = '';
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const parsedData = JSON.parse(jsonContent);

        if (typeof parsedData !== 'object' || parsedData === null) {
          throw new Error('Neplatný formát záložního souboru.');
        }

        let restored = false;
        try {
          const { set } = await import('firebase/database');
          await set(ref(db, "/"), parsedData);
          restored = true;
        } catch (err: any) {
          console.warn("Standard SDK restore failed, attempting REST fallback...", err);
          
          let token = (import.meta.env.VITE_PROD_DB_SECRET as string) || localStorage.getItem('monster_admin_prod_auth_token') || "";
          if (!token) {
            const tokenInput = window.prompt(
              "Oprávnění databáze pro zápis zamítnuto (permission_denied).\n\nZadejte prosím platný Database Secret z Firebase Console pro autorizaci obnovy:"
            );
            if (tokenInput) {
              localStorage.setItem('monster_admin_prod_auth_token', tokenInput);
              token = tokenInput;
            }
          }

          if (token) {
            const dbUrl = db.app.options.databaseURL?.replace(/\/$/, "");
            if (dbUrl) {
              const res = await fetch(`${dbUrl}/.json?auth=${encodeURIComponent(token)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: jsonContent
              });
              if (res.ok) {
                restored = true;
              } else {
                throw new Error(`REST API returned status: ${res.status}`);
              }
            }
          }
        }

        if (restored) {
          alert('Obnova databáze byla úspěšně dokončena!');
          window.location.reload();
        } else {
          alert('Chyba při obnově databáze (nedostatečná oprávnění).');
        }
      } catch (err: any) {
        console.error(err);
        alert('Chyba při importu zálohy: ' + err.message);
      } finally {
        setIsRestoring(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Sync monsters list with DB (mock) or local update
  useEffect(() => {
    if (selectedMonsterId) {
      const m = monsters.find(m => m.id === selectedMonsterId)
      if (m) {
        setMonsterForm(JSON.parse(JSON.stringify(m)))
        setTempImageUrl(null)
        setImgError(false)
      }
    } else {
      setMonsterForm(null)
    }
  }, [selectedMonsterId, monsters])

  const fetchInitialDataViaRest = async () => {
    const tokenKey = isProdDb ? 'monster_admin_prod_auth_token' : 'monster_admin_dev_auth_token';
    const envSecret = isProdDb ? import.meta.env.VITE_PROD_DB_SECRET : import.meta.env.VITE_DEV_DB_SECRET;
    let token = (envSecret as string) || localStorage.getItem(tokenKey) || "";
    if (!token) {
      const tokenInput = window.prompt(
        `Oprávnění pro načtení seznamu hráčů a pozvánek v ${isProdDb ? 'PRODUKCI' : 'TESTU'} zamítnuto (permission_denied).\n\nZadejte prosím platný Database Secret pro toto prostředí:`
      );
      if (tokenInput) {
        localStorage.setItem(tokenKey, tokenInput);
        token = tokenInput;
      }
    }

    if (token) {
      const dbUrl = db.app.options.databaseURL?.replace(/\/$/, "");
      if (dbUrl) {
        try {
          const [usersRes, presenceRes, playersRes, referralsRes] = await Promise.all([
            fetch(`${dbUrl}/users.json?auth=${encodeURIComponent(token)}`),
            fetch(`${dbUrl}/presence.json?auth=${encodeURIComponent(token)}`),
            fetch(`${dbUrl}/players.json?auth=${encodeURIComponent(token)}`),
            fetch(`${dbUrl}/referrals.json?auth=${encodeURIComponent(token)}`)
          ]);

          if (!usersRes.ok && usersRes.status === 401) {
            console.warn("[SystemEditor] Invalid auth token, clearing stored token.");
            localStorage.removeItem(tokenKey);
            return;
          }

          let usersMap = {};
          let presenceMap = {};
          let playersNodeMap = {};

          if (usersRes.ok) usersMap = await usersRes.json() || {};
          if (presenceRes.ok) presenceMap = await presenceRes.json() || {};
          if (playersRes.ok) playersNodeMap = await playersRes.json() || {};
          
          if (referralsRes.ok) {
            const referralsVal = await referralsRes.json() || {};
            const flattened: any[] = [];
            const existingKeys = new Set<string>();

            Object.entries(referralsVal).forEach(([referrerId, userRefs]: [string, any]) => {
              if (userRefs && typeof userRefs === 'object') {
                Object.entries(userRefs).forEach(([invitedId, refData]: [string, any]) => {
                  existingKeys.add(`${referrerId}_${invitedId}`);
                  flattened.push({
                    ...refData,
                    referrerId,
                    invitedId,
                  });
                });
              }
            });

            // Doplnění uživatelů, kteří mají referredBy přímo v profilu
            Object.entries(usersMap).forEach(([uid, uData]: [string, any]) => {
              if (uData && uData.referredBy) {
                let refUid = uData.referredBy;
                // Najít referrera – buď podle přesného UID nebo podle short-kódu (posledních 6 znaků)
                const matchingReferrer = Object.keys(usersMap).find(id => 
                  id === refUid || id.slice(-6).toUpperCase() === refUid.toUpperCase()
                );
                if (matchingReferrer) refUid = matchingReferrer;

                const key = `${refUid}_${uid}`;
                if (!existingKeys.has(key)) {
                  existingKeys.add(key);
                  flattened.push({
                    name: uData.playerName || uData.name || uData.email?.split('@')[0] || 'Lovec',
                    email: uData.email || null,
                    level: uData.level || uData.lvl || 1,
                    status: 'registered',
                    timestamp: uData.createdAt || uData.updatedAt || Date.now(),
                    referrerId: refUid,
                    invitedId: uid,
                    hatchClaimed: false
                  });
                }
              }
            });

            flattened.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setReferrals(flattened);
          }

          const allUids = Array.from(new Set([
            ...Object.keys(presenceMap), 
            ...Object.keys(usersMap),
            ...Object.keys(playersNodeMap)
          ]));
          const combined = allUids.map(id => {
            const pData = (presenceMap as any)[id] || {};
            const uData = (usersMap as any)[id] || {};
            const pNodeData = (playersNodeMap as any)[id] || {};
            
            const merged = { ...pNodeData, ...uData, ...pData };
            const rawName = merged.nam || merged.playerName || merged.name || merged.n || id;
            const finalName = getLoc(rawName, 'cz');
            const finalLevel = merged.lvl || merged.level || merged.currentLevel || 1;
            const finalMonsterCount = merged.mct || (Array.isArray(merged.caughtMonsters) ? merged.caughtMonsters.length : (merged.monsterCount || merged.mc || 0));
            
            return {
              id,
              name: finalName,
              level: finalLevel,
              monsterCount: finalMonsterCount,
              isOnline: !!merged.onl,
              lastActive: merged.act || merged.lastActive || merged.updatedAt || merged.lastSync || 0,
              lat: merged.lat || 0,
              lng: merged.lng || 0,
              avatarStyle: merged.avs || merged.avatarStyle || 'bottts',
              avatarSeed: merged.avd || merged.avatarSeed || id,
              inventory: merged.inventory || [],
              caughtMonsters: merged.caughtMonsters || [],
              email: merged.email || merged.eml || (merged.playerName?.includes('@') ? merged.playerName : (merged.nam?.includes('@') ? merged.nam : null)),
              isBlocked: !!merged.blo,
              referredBy: merged.referredBy || null,
              updatedAt: merged.updatedAt || merged.lastSync || merged.act || 0
            };
          }).sort((a, b) => {
            if (a.isBlocked && !b.isBlocked) return 1;
            if (!a.isBlocked && b.isBlocked) return -1;
            return (b.lastActive || 0) - (a.lastActive || 0);
          });

          setPlayers(combined);
        } catch (err) {
          console.error("REST sync failed:", err);
        }
      }
    }
  };

  // Sync Referrals for Dashboard
  useEffect(() => {
    const referralsRef = ref(db, 'referrals');
    const unsubReferrals = onValue(referralsRef, (snapshot) => {
      const val = snapshot.val() || {};
      const flattened: any[] = [];
      const existingKeys = new Set<string>();

      Object.entries(val).forEach(([referrerId, userRefs]: [string, any]) => {
        if (userRefs && typeof userRefs === 'object') {
          Object.entries(userRefs).forEach(([invitedId, refData]: [string, any]) => {
            existingKeys.add(`${referrerId}_${invitedId}`);
            flattened.push({
              ...refData,
              referrerId,
              invitedId,
            });
          });
        }
      });

      flattened.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setReferrals(flattened);
    }, (error) => {
      console.warn("[SystemEditor] Referrals SDK Sync restricted, skipping realtime stream.");
    });
    return () => unsubReferrals();
  }, []);

  // Sync Players & Referrals
  useEffect(() => {
    const presenceRef = ref(db, 'presence');
    const usersRef = ref(db, 'users');
    const playersRef = ref(db, 'players');
    const referralsRef = ref(db, 'referrals');

    let presenceMap: Record<string, any> = {};
    let usersMap: Record<string, any> = {};
    let playersNodeMap: Record<string, any> = {};
    let rawReferralsMap: Record<string, any> = {};

    const mergeAndSet = () => {
      const allUids = Array.from(new Set([
        ...Object.keys(presenceMap), 
        ...Object.keys(usersMap),
        ...Object.keys(playersNodeMap)
      ]));
      const combined = allUids.map(id => {
        const pData = presenceMap[id] || {};
        const uData = usersMap[id] || {};
        const pNodeData = playersNodeMap[id] || {};
        
        const merged = { ...pNodeData, ...uData, ...pData };
        
        // Robust naming fallback from merged data
        const rawName = merged.nam || merged.playerName || merged.name || merged.n || id;
        const finalName = getLoc(rawName, 'cz');

        // Robust level and monster count fallbacks from merged data
        const finalLevel = merged.lvl || merged.level || merged.currentLevel || 1;
        const finalMonsterCount = merged.mct || (Array.isArray(merged.caughtMonsters) ? merged.caughtMonsters.length : (merged.monsterCount || merged.mc || 0));

        return {
          id,
          name: finalName,
          level: finalLevel,
          monsterCount: finalMonsterCount,
          isOnline: !!merged.onl,
          lastActive: merged.act || merged.lastActive || merged.updatedAt || merged.lastSync || 0,
          lat: merged.lat || 0,
          lng: merged.lng || 0,
          avatarStyle: merged.avs || merged.avatarStyle || 'bottts',
          avatarSeed: merged.avd || merged.avatarSeed || id,
          inventory: merged.inventory || [],

          caughtMonsters: merged.caughtMonsters || [],

          email: merged.email || merged.eml || (merged.playerName?.includes('@') ? merged.playerName : (merged.nam?.includes('@') ? merged.nam : null)),

          isBlocked: !!merged.blo,

          referredBy: merged.referredBy || null,

          updatedAt: merged.updatedAt || merged.lastSync || merged.act || 0

        };

      }).sort((a, b) => {

        if (a.isBlocked && !b.isBlocked) return 1;

        if (!a.isBlocked && b.isBlocked) return -1;

        return (b.lastActive || 0) - (a.lastActive || 0);

      });

      setPlayers(combined);

      // Construct and update referrals state for dashboard table
      const flattened: any[] = [];
      const existingKeys = new Set<string>();

      // 1. Z uzlu referrals v databázi (pokud je dostupný)
      Object.entries(rawReferralsMap).forEach(([referrerId, userRefs]: [string, any]) => {
        if (userRefs && typeof userRefs === 'object') {
          Object.entries(userRefs).forEach(([invitedId, refData]: [string, any]) => {
            existingKeys.add(`${referrerId}_${invitedId}`);
            flattened.push({
              ...refData,
              referrerId,
              invitedId,
            });
          });
        }
      });

      // 2. Doplnění všech uživatelů majících referredBy v profilu
      Object.entries(usersMap).forEach(([uid, uData]: [string, any]) => {
        if (uData && uData.referredBy) {
          let refUid = uData.referredBy;
          const refNorm = refUid.toUpperCase();
          const matchingReferrer = Object.keys(usersMap).find(id => 
            id === refUid || 
            id.slice(-6).toUpperCase() === refNorm || 
            id.slice(-6).toUpperCase() === refNorm.slice(-6) ||
            id.toLowerCase().endsWith(refUid.toLowerCase())
          );
          if (matchingReferrer) refUid = matchingReferrer;

          const key = `${refUid}_${uid}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            flattened.push({
              name: getLoc(uData.playerName || uData.name || uData.email?.split('@')[0] || 'Lovec', 'cz'),
              email: uData.email || null,
              level: Math.max(uData.lvl || uData.level || 0, uData.currentLevel || 0, 1),
              status: 'registered',
              timestamp: uData.createdAt || uData.updatedAt || uData.lastActive || Date.now(),
              referrerId: refUid,
              invitedId: uid,
              hatchClaimed: false
            });
          }
        }
      });

      flattened.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setReferrals(flattened);
    };

    const unsubPresence = onValue(presenceRef, (snapshot) => {
      presenceMap = snapshot.val() || {};
      mergeAndSet();
    }, (error) => {
      console.error("[SystemEditor] Presence Error, trying REST fallback:", error);
      fetchInitialDataViaRest();
    });

    const unsubUsers = onValue(usersRef, (snapshot) => {
      usersMap = snapshot.val() || {};
      mergeAndSet();
    }, (error) => {
      console.error("[SystemEditor] Users Error, trying REST fallback:", error);
      fetchInitialDataViaRest();
    });

    const unsubPlayersNode = onValue(playersRef, (snapshot) => {
      playersNodeMap = snapshot.val() || {};
      mergeAndSet();
    }, (error) => {
      console.error("[SystemEditor] Players Error, trying REST fallback:", error);
      fetchInitialDataViaRest();
    });

    const unsubReferrals = onValue(referralsRef, (snapshot) => {
      rawReferralsMap = snapshot.val() || {};
      mergeAndSet();
    }, (error) => {
      // Ignorujeme případný restricted permission na čtení celého uzlu referrals
    });

    return () => {
      unsubPresence();
      unsubUsers();
      unsubPlayersNode();
      unsubReferrals();
    };
  }, []);

  const handleAddNewMonster = () => {
    const newId = (Math.max(...monsters.map(m => parseInt(m.id))) + 1).toString().padStart(3, '0');
    const newMonster = {
      id: newId,
      name: { cz: 'Nová Příšerka', en: 'New Monster', sk: 'Nová príšerka' },
      description: { cz: 'Zde zadejte lore nebo popis příšerky...', en: 'Description...', sk: 'Popis...' },
      type: 'fire',
      rarity: 'common',
      stats: { hp: 100, attack: 50, defense: 40, speed: 50 },
      abilities: []
    };
    setMonsters([...monsters, newMonster]);
    setSelectedMonsterId(newId);
  }

  const handleSaveMonster = async () => {
    if (!monsterForm) return;

    // Save image if changed
    if (tempImageUrl && !imgError) {
      try {
        const fileInput = document.getElementById('image-upload-hidden') as HTMLInputElement;
        const file = fileInput?.files?.[0];
        if (file) {
          await fetch(`/api/save-monster-image?id=${monsterForm.id}`, {
            method: 'POST',
            body: file
          });
        }
      } catch (err) {
        console.error('Monster image upload failed:', err);
      }
    }

    const newMonsters = monsters.map(m => m.id === monsterForm.id ? monsterForm : m);
    setMonsters(newMonsters);

    if (window.location.hostname === 'localhost') {
      try {
        const res = await fetch('/api/save-monster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: monsterForm.id, monster: monsterForm })
        });
        if (res.ok) {
          alert('Monstrum uloženo přímo do souboru.');
          return;
        }
      } catch (e) {
        console.error('API save failed:', e);
      }
    }

    downloadJson(newMonsters, 'monsters.ts', 'monsterDB');
  }

  const handleSaveConfig = async (tab: EditorTab, data: any) => {
    if (window.location.hostname === 'localhost') {
      try {
        const res = await fetch('/api/save-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: tab, data })
        });
        if (res.ok) {
          alert(`Konfigurace ${tab} uložena přímo do souboru.`);
          return;
        }
      } catch (e) {
        console.error('API save failed:', e);
      }
    }

    if (tab === 'dungeons') {
      const content = `import { Localized } from '../types';\n\nexport interface DungeonWaveConfig {\n  waveIndex: number;\n  enemyRarityPool: 'rare' | 'epic' | 'legendary';\n  enemyCount: number;\n  cloneSameMonster: boolean;\n  baseHp: number;\n  level: number;\n  shield?: number;\n}\n\nexport interface DungeonConfig {\n  id: string;\n  name: Localized<string>;\n  description: Localized<string>;\n  backgroundImage: string;\n  recommendedLevel: number;\n  waves: DungeonWaveConfig[];\n  lootTable: {\n    waveDrops: {\n      [waveIndex: number]: {\n        chance: number;\n        rarity: 'common' | 'rare' | 'epic' | 'legendary';\n      };\n    };\n    bossDrops: {\n      chance: number;\n      rarityDistribution: {\n        legendary: number;\n        epic: number;\n        rare: number;\n      };\n    };\n  };\n}\n\nexport const dungeonsDB: DungeonConfig[] = ${JSON.stringify(data, null, 2)};`;

      const dataStr = "data:text/typescript;charset=utf-8," + encodeURIComponent(content);
      const anchor = document.createElement('a');
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", "dungeons.ts");
      anchor.click();
      alert('Konfigurace dungeons.ts připravena k uložení. Nahraďte obsah v src/data/dungeons.ts');
      return;
    }

    const varName = tab === 'resources' ? 'resourceConfig' : (tab === 'settings' ? 'SYSTEM_SETTINGS' : 'monsterDB');
    downloadJson(data, `${tab}.ts`, varName);
  }


  const downloadJson = (data: any, filename: string, varName: string) => {
    const content = `export const ${varName} = ${JSON.stringify(data, null, 2)};`;

    const dataStr = "data:text/typescript;charset=utf-8," + encodeURIComponent(content);
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", filename);
    anchor.click();
    alert(`Konfigurace ${filename} připravena k uložení. Nahraďte obsah v src/data/${filename}`);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && monsterForm) {
      const reader = new FileReader();
      reader.onloadend = () => { setTempImageUrl(reader.result as string); setImgError(false); };
      reader.readAsDataURL(file);
    }
  }

  const handleResourceImageUpload = async (id: string, file: File) => {
    try {
      const res = await fetch(`/api/save-resource-image?id=${id}`, {
        method: 'POST',
        body: file
      });
      if (res.ok) {
        const newConfig = { ...resourceConfig, [id]: { ...resourceConfig[id], hasCustomIcon: true } };
        setResourceConfig(newConfig);
        await handleSaveConfig('resources', newConfig);
        alert('Ikonka nahrána a konfigurace aktualizována!');
      } else {
        throw new Error('Upload server error');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Chyba při nahrávání ikonky. Ujistěte se, že běží dev server.');
    }
  }

  const handleSaveGlobalNote = async () => {
    setIsSavingNote(true)
    try {
      await handleSaveConfig('settings', { globalNote })
    } catch (e) {
      alert('Chyba při ukládání poznámky.')
    } finally {
      setTimeout(() => setIsSavingNote(false), 1000)
    }
  }


  const openJsonEditor = () => {
    const data = activeTab === 'monsters' 
      ? (selectedMonsterId ? monsterForm : monsters) 
      : (activeTab === 'dungeons' ? dungeons : resourceConfig);
    setJsonInput(JSON.stringify(data, null, 2));
    setIsJsonModalOpen(true);
  }

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (activeTab === 'monsters') {
        if (selectedMonsterId) {
          setMonsterForm(parsed);
          setMonsters(monsters.map(m => m.id === selectedMonsterId ? parsed : m));
        } else {
          setMonsters(parsed);
        }
      } else if (activeTab === 'resources') {
        setResourceConfig(parsed);
      } else if (activeTab === 'dungeons') {
        setDungeons(parsed);
      }
      setIsJsonModalOpen(false);
    } catch (e) {
      alert('Neplatný formát JSON!');
    }
  }

  if (!isAuthenticated && window.location.hostname !== 'localhost') {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20"><ShieldAlert className="text-red-500" size={32} /></div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">ZABEZPEČENÁ ZÓNA</h1>
          <input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-white font-black tracking-[0.5em] focus:border-primary/50" placeholder="••••" />
          <button onClick={() => passInput === 'bmxbmx' ? setIsAuthenticated(true) : alert('Nesprávný kód')} className="w-full py-4 bg-primary text-slate-950 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all">Autorizovat</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row overflow-hidden font-display">

      {/* Sidebar */}
      <aside className="w-full md:w-[280px] border-r border-white/10 bg-slate-900 flex flex-col shrink-0">

        {/* TAB SWITCHER */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="mb-8 px-2 py-4 border-b border-white/5">
            <h2 className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Administrace</h2>
            <div className="text-lg font-black text-white uppercase italic tracking-tighter">Monstero</div>

            {/* Env Switcher */}
            <div className="mt-4 flex items-center justify-between p-1 bg-black/40 border border-white/5 rounded-xl">
              <button 
                onClick={() => {
                  if (isProdDb) {
                    localStorage.setItem('monster_admin_db_env', 'development');
                    window.location.reload();
                  }
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition-all",
                  !isProdDb 
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                    : "text-slate-500 hover:text-slate-350"
                )}
              >
                TEST (DEV)
              </button>
              <button 
                onClick={() => {
                  if (!isProdDb) {
                    localStorage.setItem('monster_admin_db_env', 'production');
                    window.location.reload();
                  }
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition-all",
                  isProdDb 
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-lg" 
                    : "text-slate-500 hover:text-slate-350"
                )}
              >
                PRODUKCE
              </button>
            </div>
          </div>
          {[
            { id: 'dashboard', icon: Trophy, label: 'Dashboard', desc: 'Přehled a rychlé statistiky' },
            { id: 'monsters', icon: Settings2, label: 'Příšery', desc: 'Editor a AI generátor' },
            { id: 'resources', icon: Palette, label: 'Suroviny', desc: 'Design herních surovin' },
            { id: 'dungeons', icon: Swords, label: 'Dungeony', desc: 'Správa a konfigurace arén' },
            { id: 'users', icon: Users, label: 'Hráči', desc: 'Správa a online monitoring' },
            { id: 'languages', icon: Globe, label: 'Jazyky', desc: 'Překlady a lokalizace' },
            { id: 'settings', icon: Settings2, label: 'Systém', desc: 'Globální nastavení hry' }
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as EditorTab); setSelectedMonsterId(null); setSelectedPlayerId(null); }} className={cn("w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all group", activeTab === tab.id ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(13,185,242,0.1)]" : "bg-black/20 border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200")}>
              <tab.icon size={18} className={cn("shrink-0 transition-transform group-hover:scale-110", activeTab === tab.id ? "text-primary" : "text-slate-500")} />
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider block leading-none">{tab.label}</span>
                <span className="text-[8px] text-slate-500 block leading-none mt-1">{tab.desc}</span>
              </div>
            </button>
          ))}
        </div>

        <button onClick={onBack} className="p-4 border-t border-white/5 flex items-center gap-2 text-slate-500 hover:text-white transition-colors uppercase text-[11px] font-black tracking-widest shrink-0"><ArrowLeft size={14} /> Zpět</button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="w-full space-y-8 pb-20">

          {/* TOP BAR ACTIONS */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                {activeTab === 'dashboard' ? 'Přehled Systému' : activeTab === 'monsters' ? 'Editor Příšer' : (activeTab === 'users' ? 'Správa Uživatelů' : (activeTab === 'languages' ? 'Jazyky & Hodnoty' : (activeTab === 'dungeons' ? 'Editor Dungeonů' : 'Resource Design')))}
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                {activeTab === 'dashboard' ? 'Statistiky a rychlé přehledy herního světa' : activeTab === 'users' ? 'Monitoring a správa registrovaných hráčů' : 'Administrace herních datových struktur'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => activeTab === 'monsters' ? handleSaveMonster() : handleSaveConfig(activeTab, activeTab === 'dungeons' ? dungeons : resourceConfig)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 border border-emerald-500/30 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-emerald-500 shadow-xl shadow-emerald-500/10"
              >
                <Save size={14} /> Uložit Změny
              </button>
              <button onClick={openJsonEditor} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                <Copy size={14} /> RAW JSON
              </button>
              <button onClick={() => {
                const data = activeTab === 'monsters' ? (selectedMonsterId ? monsterForm : monsters) : (activeTab === 'dungeons' ? dungeons : resourceConfig);
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
                const anchor = document.createElement('a'); anchor.setAttribute("href", dataStr); anchor.setAttribute("download", `${activeTab}.json`); anchor.click();
              }} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {/* GLOBAL NOTES SECTION - NOW FULL WIDTH BELOW HEADER */}
          <div className="w-full">
            <button
              onClick={() => setIsNoteOpen(!isNoteOpen)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors"
            >
              <ChevronRight size={14} className={cn("transition-transform", isNoteOpen && "rotate-90")} />
              {isNoteOpen ? 'Skrýt poznámky' : 'Zobrazit globální poznámky'}
            </button>

            <AnimatePresence>
              {isNoteOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl relative group border-t-primary/20">
                    <textarea
                      value={globalNote}
                      onChange={(e) => setGlobalNote(e.target.value)}
                      placeholder="Zde si můžete psát poznámky k balancování, TODO list nebo herní lore..."
                      className="w-full min-h-[150px] bg-transparent text-slate-300 font-mono text-xs outline-none resize-y p-2 placeholder:text-slate-600 custom-scrollbar leading-relaxed"
                    />

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600 uppercase italic">
                        <Info size={10} /> Poznámky jsou sdílené v settings.ts
                      </div>
                      <button
                        onClick={handleSaveGlobalNote}
                        disabled={isSavingNote}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                          isSavingNote ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {isSavingNote ? <><Check size={12} /> Uloženo</> : <><Save size={12} /> Uložit poznámku</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Grid - Tighter padding */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                    <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-3"><Users size={20} /></div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Registrovaní Hráči</div>
                    <div className="text-2xl font-black text-white italic">{players.length}</div>
                  </div>
                  
                  <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                    <div className="size-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-3"><Activity size={20} /></div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Hráči Online</div>
                    <div className="text-2xl font-black text-emerald-500 italic">{players.filter(p => p.isOnline).length}</div>
                  </div>

                  <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                    <div className="size-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 mb-3"><Trophy size={20} /></div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Celkem Pozvánek</div>
                    <div className="text-2xl font-black text-purple-500 italic">{referrals.length}</div>
                  </div>

                  <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                    <div className="size-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-3"><Settings2 size={20} /></div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Aktivní Prostředí</div>
                    <div className={cn("text-lg font-black uppercase italic mt-0.5", isProdDb ? "text-rose-500" : "text-amber-500")}>
                      {isProdDb ? 'PRODUKCE' : 'TEST (DEV)'}
                    </div>
                  </div>
                </div>

                {/* Dashboard Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {/* Column 1: Recent Registered Players - High density list */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Clock size={14} className="text-cyan-400" /> Poslední registrovaní
                    </h2>
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 divide-y divide-white/5 space-y-2.5">
                      {players
                        .filter(p => p.updatedAt > 0 && !p.isBlocked)
                        .sort((a, b) => b.updatedAt - a.updatedAt)
                        .slice(0, 8)
                        .map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => { setActiveTab('users'); setSelectedPlayerId(p.id); }}
                            className="flex items-center justify-between pt-2 pb-1 first:pt-1 last:pb-1 px-2 cursor-pointer hover:bg-white/5 rounded-xl transition-all group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-lg bg-slate-800 border border-white/10 overflow-hidden relative shrink-0">
                                <img src={`https://api.dicebear.com/7.x/${p.avatarStyle || 'bottts'}/svg?seed=${p.avatarSeed || p.id}`} className="w-full h-full" alt="Avatar" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-black text-white uppercase truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                                  {p.name || 'Lovec'}
                                </div>
                                <div className="text-[8px] text-slate-500 font-mono leading-none mt-0.5">ID: {p.id}</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div className="text-[10px] font-black text-primary leading-none">Lv {p.level}</div>
                              <div className="text-[8px] text-slate-500 mt-1 leading-none">
                                {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('cs-CZ') : 'Neznámé'}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Column 2: Recent Active Players - High density list */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Users size={14} className="text-primary" /> Poslední aktivní hráči
                    </h2>
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 divide-y divide-white/5 space-y-2.5">
                      {players.filter(p => !p.isBlocked).slice(0, 8).map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => { setActiveTab('users'); setSelectedPlayerId(p.id); }}
                          className="flex items-center justify-between pt-2 pb-1 first:pt-1 last:pb-1 px-2 cursor-pointer hover:bg-white/5 rounded-xl transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-slate-800 border border-white/10 overflow-hidden relative shrink-0">
                              <img src={`https://api.dicebear.com/7.x/${p.avatarStyle || 'bottts'}/svg?seed=${p.avatarSeed || p.id}`} className="w-full h-full" alt="Avatar" />
                              {p.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-black text-white uppercase truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                                {p.name || 'Lovec'}
                                {p.isBlocked && <span className="text-[7px] text-rose-500 bg-rose-500/10 px-0.5 rounded leading-none shrink-0 border border-rose-500/20">BLOK</span>}
                              </div>
                              <div className="text-[8px] text-slate-500 font-mono leading-none mt-0.5">ID: {p.id}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-black text-primary leading-none">Lv {p.level}</div>
                            <div className="text-[8px] text-slate-500 mt-1 leading-none">{renderTimeBadge(p.lastActive)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: TOP Players - High density list sorted by unique monster species */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Trophy size={14} className="text-amber-400" /> TOP Hráči (Unikátní druhy)
                    </h2>
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 divide-y divide-white/5 space-y-2.5">
                      {players
                        .filter(p => !p.isBlocked)
                        .map(p => ({
                          ...p,
                          uniqueCount: p.caughtMonsters ? new Set(p.caughtMonsters.map((m: any) => m.id)).size : 0
                        }))
                        .sort((a, b) => b.uniqueCount - a.uniqueCount)
                        .slice(0, 8)
                        .map((p, rank) => (
                          <div 
                            key={p.id} 
                            onClick={() => { setActiveTab('users'); setSelectedPlayerId(p.id); }}
                            className="flex items-center justify-between pt-2 pb-1 first:pt-1 last:pb-1 px-2 cursor-pointer hover:bg-white/5 rounded-xl transition-all group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="text-[10px] font-black text-amber-500 w-4 text-center shrink-0">
                                {rank + 1}.
                              </div>
                              <div className="size-8 rounded-lg bg-slate-800 border border-white/10 overflow-hidden relative shrink-0">
                                <img src={`https://api.dicebear.com/7.x/${p.avatarStyle || 'bottts'}/svg?seed=${p.avatarSeed || p.id}`} className="w-full h-full" alt="Avatar" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-black text-white uppercase truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                                  {p.name || 'Lovec'}
                                </div>
                                <div className="text-[8px] text-slate-500 font-mono leading-none mt-0.5">ID: {p.id}</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div className="text-[10px] font-black text-emerald-400 leading-none">
                                {p.uniqueCount} druhů
                              </div>
                              <div className="text-[8px] text-slate-500 mt-1 leading-none">
                                Celkem: {p.caughtMonsters?.length || 0}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Column 4: Recent Invitations - High density list */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                      <Trophy size={14} className="text-purple-500" /> Poslední pozvánky a doporučení
                    </h2>
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 divide-y divide-white/5 space-y-2.5">
                      {referrals.length === 0 ? (
                        <div className="py-8 text-center opacity-25 italic text-[10px] uppercase tracking-wider">Žádné pozvánky v databázi</div>
                      ) : (
                        referrals.slice(0, 8).map((refEntry, idx) => {
                          const referrer = players.find(p => p.id === refEntry.referrerId || p.id.slice(-6).toUpperCase() === refEntry.referrerId?.toUpperCase());
                          const isRegistered = refEntry.status === 'registered' || !!refEntry.registeredUid;
                          return (
                            <div key={idx} className="flex items-center justify-between pt-2 first:pt-0">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-8 bg-black/40 rounded-lg border border-white/5 flex items-center justify-center text-[11px] shrink-0">
                                  {refEntry.hatchClaimed ? '👑' : '🥚'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[11px] font-black text-white uppercase leading-none">
                                    {getLoc(refEntry.name, 'cz') || refEntry.email?.split('@')[0] || 'Neznámý'}
                                  </div>
                                  <div className="text-[8px] text-slate-500 truncate leading-none mt-1">
                                    Od: <span className="font-bold text-slate-400">{referrer?.name || refEntry.referrerId}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[7px] font-black uppercase leading-none border",
                                  isRegistered ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-slate-800 text-slate-500 border-transparent"
                                )}>
                                  {isRegistered ? `Lv ${refEntry.level || 0}` : 'PENDING'}
                                </span>
                                <div className="text-[8px] text-slate-500 mt-1 leading-none">
                                  {refEntry.timestamp ? new Date(refEntry.timestamp).toLocaleDateString('cs-CZ') : 'Neznámé datum'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'monsters' && (
              <MonsterEditorTab
                monsters={monsters}
                setMonsters={setMonsters}
                selectedMonsterId={selectedMonsterId}
                setSelectedMonsterId={setSelectedMonsterId}
                handleAddNewMonster={handleAddNewMonster}
                monsterForm={monsterForm}
                setMonsterForm={setMonsterForm}
                MONSTER_TYPES={MONSTER_TYPES}
                MONSTER_RARITIES={MONSTER_RARITIES}
                TYPE_COLORS={TYPE_COLORS}
                TYPE_EMOJIS={TYPE_EMOJIS}
                RARITY_EMOJIS={RARITY_EMOJIS}
                RARITY_COLORS={RARITY_COLORS}
                ABILITY_TYPES={ABILITY_TYPES}
                handleImageUpload={handleImageUpload}
                tempImageUrl={tempImageUrl}
                imgError={imgError}
                setImgError={setImgError}
              />
            )}


            {activeTab === 'resources' && (
              <ResourceDesignTab resourceConfig={resourceConfig} setResourceConfig={setResourceConfig} handleResourceImageUpload={handleResourceImageUpload} />
            )}

            {activeTab === 'users' && (
              <UserManagementTab
                players={players}
                selectedPlayerId={selectedPlayerId}
                setSelectedPlayerId={setSelectedPlayerId}
              />
            )}

            {activeTab === 'languages' && (
              <TranslationEditorTab
                resources={translationResources}
                onSave={(newRes) => {
                  setTranslationResources(newRes);
                  if (window.location.hostname === 'localhost') {
                    handleSaveConfig('translations' as any, newRes);
                  }
                }}
                monsterTypes={monsterTypes}
                monsterRarities={monsterRarities}
                onSaveValues={(types, rarities) => {
                  const newVal = { monsterTypes: types, monsterRarities: rarities };
                  setMonsterTypes(types);
                  setMonsterRarities(rarities);
                  if (window.location.hostname === 'localhost') {
                    handleSaveConfig('system_values' as any, newVal);
                  }
                }}
              />
            )}
            {activeTab === 'dungeons' && (
              <DungeonEditorTab dungeons={dungeons} onSave={(updated) => setDungeons(updated)} />
            )}
            {activeTab === 'settings' && (
              <div className="max-w-4xl space-y-6">
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Aktivní Prostředí</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 leading-none">Všechny operace zálohování a obnovy budou provedeny v tomto prostředí.</p>
                    </div>
                    <div className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border", isProdDb ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500")}>
                      {isProdDb ? 'PRODUKCE' : 'TEST (DEV)'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Backup Card */}
                  <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl flex flex-col justify-between h-64">
                    <div>
                      <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4"><Download size={22} /></div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Záloha databáze (Export)</h4>
                      <p className="text-[10px] text-slate-500 leading-normal mt-2">
                        Stáhne kompletní kopii aktivní databáze (uživatelské profily, chycená monstra, batoh, pozvánky, atd.) jako soubor `.json` do vašeho počítače.
                      </p>
                    </div>
                    <button
                      onClick={handleBackupDatabase}
                      disabled={isBackingUp}
                      className="w-full py-3.5 bg-primary text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isBackingUp ? 'Zálohuji...' : <><Download size={14} /> Stáhnout Zálohu (JSON)</>}
                    </button>
                  </div>

                  {/* Restore Card */}
                  <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl flex flex-col justify-between h-64 border-t-rose-500/20">
                    <div>
                      <div className="size-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mb-4"><Upload size={22} /></div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Obnova databáze (Import)</h4>
                      <p className="text-[10px] text-rose-500 font-bold uppercase leading-normal mt-2">
                        ⚠️ VAROVÁNÍ: Nahráním zálohy kompletně přepíšete aktuální databázi v aktivním prostředí. Stávající data budou nevratně přepsána.
                      </p>
                    </div>
                    <label className={cn(
                      "w-full py-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 text-center",
                      isRestoring && "opacity-50 pointer-events-none"
                    )}>
                      {isRestoring ? 'Obnovuji...' : <><Upload size={14} /> Nahrát a Obnovit Databázi</>}
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreDatabase}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {isJsonModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">RAW JSON EDITOR</h3>
                <button onClick={() => setIsJsonModalOpen(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex-1 p-6 bg-black/40">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full h-full min-h-[400px] bg-transparent text-emerald-400 font-mono text-xs outline-none resize-none p-4 custom-scrollbar"
                  spellCheck={false}
                />
              </div>
              <div className="p-6 border-t border-white/5 bg-slate-900/50 flex gap-3 justify-end">
                <button onClick={() => setIsJsonModalOpen(false)} className="px-6 py-3 text-xs font-black uppercase text-slate-500">
                  Zrušit
                </button>
                <button onClick={applyJsonChanges} className="px-8 py-3 bg-primary text-slate-950 rounded-xl text-xs font-black uppercase shadow-lg shadow-primary/10">
                  Použít změny
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
