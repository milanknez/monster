import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
  Users, User, Trophy, Activity,
  MapPin, Clock, Sword, Heart, AlertCircle, Mail, LogIn, Package,
  ArrowLeft, Search
} from 'lucide-react';

import { RESOURCE_CONFIG } from '../../../data/resources';

import { motion, AnimatePresence } from 'framer-motion';

import { useTranslation } from 'react-i18next';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import { db, isProdDb } from '../../../lib/firebase';

import { ref, get, update, remove } from 'firebase/database';

import { cn, calculateLevel, getLoc } from '../../../utils';

import { Trash2 } from 'lucide-react';



// ── Leaflet Icons Fix ──────────────────────────────────────────

if (typeof window !== 'undefined') {

  delete (L.Icon.Default.prototype as any)._getIconUrl

  L.Icon.Default.mergeOptions({

    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',

  })

}



interface PlayerSummary {

  id: string;

  name: string;

  email?: string;

  level: number;

  monsterCount: number;

  isOnline: boolean;

  lastActive: number;

  lat: number;

  lng: number;

  avatarStyle: string;

  avatarSeed: string;

  isBlocked?: boolean;

}



interface UserManagementTabProps {

  players: PlayerSummary[];

  selectedPlayerId: string | null;

  setSelectedPlayerId: (id: string | null) => void;

}



export const UserManagementTab: React.FC<UserManagementTabProps> = ({ players, selectedPlayerId, setSelectedPlayerId }) => {
  const { t, i18n } = useTranslation();
  const [detailedData, setDetailedData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'blocked'>('all');

  const [profileTab, setProfileTab] = useState<'info' | 'monsters' | 'inventory' | 'referrals'>('info');
  const [monsterSearch, setMonsterSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('Vše');

  const renderTimeBadge = (timestamp: number) => {
    if (!timestamp) return <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[8px] font-black uppercase">Nikdy</span>;

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



  const mapRef = useRef<L.Map | null>(null);

  const markerRef = useRef<L.CircleMarker | null>(null);

  const pulseRef = useRef<L.CircleMarker | null>(null);



  const fetchUserDetails = async (uid: string) => {

    setIsLoadingDetails(true);

    try {

      const userRef = ref(db, `users/${uid}`);

      const referralRef = ref(db, `referrals/${uid}`);



      // Fetch both snaps, but catch errors individually (e.g. Permission Denied on referrals for non-fida emails)

      const userSnap = await get(userRef).catch(err => {

        console.warn("Failed to fetch user data:", err);

        return null;

      });



      const referralSnap = await get(referralRef).catch(err => {

        console.warn("Failed to fetch referral data:", err);

        return null;

      });



      setDetailedData({

        ...(userSnap && userSnap.exists() ? userSnap.val() : {}),

        referralList: referralSnap && referralSnap.exists() ? referralSnap.val() : {}

      });

    } catch (e) { 

      console.error("Error in fetchUserDetails:", e); 

    } finally { 

      setIsLoadingDetails(false); 

    }

  };



  useEffect(() => {
    setDetailedData(null);
    setProfileTab('info');
    setMonsterSearch('');
    setItemSearch('');
    setItemCategoryFilter('Vše');
    if (selectedPlayerId) {
      fetchUserDetails(selectedPlayerId);
    }
  }, [selectedPlayerId]);



  // Proaktivní oprava levelů v detailu uživatele

  const runReferralRepair = async () => {

    if (!selectedPlayerId || !detailedData?.referralList) return;



    const entries = Object.entries(detailedData.referralList) as [string, any][];

    for (const [ruid, data] of entries) {

      let targetUid = data.registeredUid || (ruid.includes('@') ? null : ruid);

      const originalEmail = data.email || (ruid.includes('@') ? ruid.replace(/_/g, '.') : null);



      // Pokud nemáme UID, zkusíme najít hráče podle emailu

      if (!targetUid || targetUid.includes('@')) {

        // 1. Zkusíme uzel /invites

        if (originalEmail) {

          const cleanEmail = originalEmail.replace(/\./g, '_').toLowerCase();

          const inviteSnap = await get(ref(db, `invites/${cleanEmail}`));

          if (inviteSnap.exists() && inviteSnap.val().registeredUid) {

            targetUid = inviteSnap.val().registeredUid;

          }

        }



        // 2. Pokud stále nic, prohledáme všechny uživatele (pojistka)

        if ((!targetUid || targetUid.includes('@')) && originalEmail) {

          const usersSnap = await get(ref(db, 'users'));

          if (usersSnap.exists()) {

            const allUsers = usersSnap.val();

            const foundUser = Object.entries(allUsers).find(([_, u]: [any, any]) =>

              u.email?.toLowerCase() === originalEmail.toLowerCase()

            );

            if (foundUser) targetUid = foundUser[0];

          }

        }

      }



      if (targetUid && !targetUid.includes('@')) {

        const [playerSnap, userSnap] = await Promise.all([

          get(ref(db, `presence/${targetUid}`)),

          get(ref(db, `users/${targetUid}`))

        ]);



        const p = playerSnap.exists() ? playerSnap.val() : (userSnap.exists() ? userSnap.val() : null);

        if (p) {

          const currentLevel = Math.max(

            p.lvl || p.level || 0,

            p.currentLevel || 0,

            p.totalXP ? calculateLevel(p.totalXP) : 0

          );



          if ((p.lvl !== undefined && data.level !== currentLevel) || data.totalXP !== (p.totalXP || 0) || !data.registeredUid || data.status !== 'registered') {

            update(ref(db, `referrals/${selectedPlayerId}/${ruid}`), {

              level: currentLevel,

              totalXP: p.totalXP || 0,

              status: 'registered',

              registeredUid: targetUid

            });

          }

        }

      }

    }

  };



  useEffect(() => {

    runReferralRepair();

  }, [selectedPlayerId, detailedData?.referralList]);



  const pSummary = players.find(p => p.id === selectedPlayerId);

  const currentName = getLoc(detailedData?.name || detailedData?.playerName || pSummary?.name || selectedPlayerId, 'cz');

  const currentLat = Number(detailedData?.lat || pSummary?.lat);

  const currentLng = Number(detailedData?.lng || pSummary?.lng);

  const hasCoords = !isNaN(currentLat) && !isNaN(currentLng) && currentLat !== 0;



  // ── CALLBACK REF PRO MAPU (Zaručuje, že div existuje) ──────────

  const mapContainerRef = useCallback((node: HTMLDivElement | null) => {

    // Cleanup if node is unmounting OR if we are about to re-initialize

    if (mapRef.current) {

      mapRef.current.remove();

      mapRef.current = null;

      markerRef.current = null;

      pulseRef.current = null;

    }



    if (node !== null) {

      // Vytvoření čerstvé mapy

      const map = L.map(node, {

        center: [hasCoords ? currentLat : 50.0755, hasCoords ? currentLng : 14.4378],

        zoom: 16,

        zoomControl: true,

        attributionControl: false

      });



      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      mapRef.current = map;



      // Pokud máme polohu, hned ji tam prskneme

      if (hasCoords) {

        markerRef.current = L.circleMarker([currentLat, currentLng], {

          radius: 8, fillColor: "#00eeff", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8

        }).addTo(map);

        pulseRef.current = L.circleMarker([currentLat, currentLng], {

          radius: 20, fillColor: "#00eeff", color: "transparent", weight: 0, fillOpacity: 0.2, className: 'animate-pulse'

        }).addTo(map);

      }



      // Vynucený update

      setTimeout(() => map.invalidateSize(), 200);

    }

  }, [selectedPlayerId, hasCoords, currentLat, currentLng]);

  const [isCleaning, setIsCleaning] = useState(false);

  const cleanupInactiveUsers = async () => {
    if (!window.confirm('Opravdu chcete z databáze vymazat všechny neaktivní hráče (bez přezdívky, 0 XP, bez monster)?')) return;
    setIsCleaning(true);
    try {
      const usersSnap = await get(ref(db, 'users'));
      if (!usersSnap.exists()) {
        alert('Žádní uživatelé v databázi.');
        return;
      }
      const allUsers = usersSnap.val();
      let deleteCount = 0;
      for (const [uid, uVal] of Object.entries(allUsers)) {
        const u = uVal as any;
        const name = u.playerName;
        const hasRealName = name && name !== 'undefined' && name !== 'null' && name.trim().length > 0;
        const hasXP = u.totalXP && u.totalXP > 0;
        const hasMonsters = u.caughtMonsters && u.caughtMonsters.length > 0;
        const hasInvites = u.invited_emails && Object.keys(u.invited_emails).length > 0;

        if (!hasRealName && !hasXP && !hasMonsters && !hasInvites) {
          await remove(ref(db, `users/${uid}`));
          deleteCount++;
        }
      }
      alert(`Vyčištění dokončeno! Bylo smazáno ${deleteCount} neaktivních profilů.`);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Chyba při mazání neaktivních hráčů.');
    } finally {
      setIsCleaning(false);
    }
  };

  const toggleBlockPlayer = async () => {
    if (!selectedPlayerId) return;
    const isCurrentlyBlocked = !!detailedData?.blo;
    const actionText = isCurrentlyBlocked ? 'odblokovat' : 'zablokovat';
    if (window.confirm(`Opravdu chcete ${actionText} hráče ${currentName}?`)) {
      let updated = false;
      try {
        await update(ref(db, `users/${selectedPlayerId}`), {
          blo: !isCurrentlyBlocked
        });
        updated = true;
      } catch (err: any) {
        console.warn("Standard SDK update failed, attempting fallback via REST API with Database Secret...", err);
        
        // Fallback using Database Secret / auth token
        let token = (import.meta.env.VITE_PROD_DB_SECRET as string) || localStorage.getItem('monster_admin_prod_auth_token') || "";
        
        // If token is missing, ask the user for it
        if (!token) {
          const tokenInput = window.prompt(
            "Oprávnění databáze zamítnuto (permission_denied).\n\nZadejte prosím platný Database Secret z Firebase Console (Project Settings -> Service Accounts -> Database Secrets) pro autorizaci zápisu:"
          );
          if (tokenInput) {
            localStorage.setItem('monster_admin_prod_auth_token', tokenInput);
            token = tokenInput;
          }
        }

        if (token) {
          const dbUrl = db.app.options.databaseURL?.replace(/\/$/, "");
          if (dbUrl) {
            try {
              const res = await fetch(`${dbUrl}/users/${selectedPlayerId}.json?auth=${encodeURIComponent(token)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blo: !isCurrentlyBlocked })
              });
              if (res.ok) {
                updated = true;
              } else {
                console.error("REST update failed with status:", res.status);
              }
            } catch (fetchErr) {
              console.error("REST update fetch request failed:", fetchErr);
            }
          }
        }
      }

      if (updated) {
        setDetailedData((prev: any) => prev ? { ...prev, blo: !isCurrentlyBlocked } : null);
        alert(`Hráč byl úspěšně ${isCurrentlyBlocked ? 'odblokován' : 'zablokován'}.`);
      } else {
        alert('Chyba při změně stavu blokování (nedostatečná oprávnění).');
      }
    }
  };

  const [isMigratingUser, setIsMigratingUser] = useState(false);

  const migrateUserToProduction = async () => {
    if (!selectedPlayerId) return;
    if (!window.confirm(`Opravdu chcete přenést hráče ${currentName} (ID: ${selectedPlayerId}) do produkční databáze?`)) return;

    setIsMigratingUser(true);
    const PROD_DATABASE_URL = "https://monstero-prod-default-rtdb.europe-west1.firebasedatabase.app";

    try {
      const userSnap = await get(ref(db, `users/${selectedPlayerId}`));
      const presenceSnap = await get(ref(db, `presence/${selectedPlayerId}`));

      if (!userSnap.exists() && !presenceSnap.exists()) {
        alert('Žádná data pro migraci nebyla nalezena.');
        setIsMigratingUser(false);
        return;
      }

      const attemptMigration = async (token?: string) => {
        const queryParam = token ? `?auth=${encodeURIComponent(token)}` : "";
        const promises = [];

        // 1. Profil, batoh a chycené příšery
        if (userSnap.exists()) {
          promises.push(
            fetch(`${PROD_DATABASE_URL}/users/${selectedPlayerId}.json${queryParam}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userSnap.val())
            })
          );
        }

        // 2. GPS, email a přítomnost
        if (presenceSnap.exists()) {
          promises.push(
            fetch(`${PROD_DATABASE_URL}/presence/${selectedPlayerId}.json${queryParam}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(presenceSnap.val())
            })
          );
        }

        // 3. Index referenčního kódu
        const shortCode = selectedPlayerId.slice(-6).toUpperCase();
        promises.push(
          fetch(`${PROD_DATABASE_URL}/codes/${shortCode}.json${queryParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedPlayerId)
          })
        );

        return await Promise.all(promises);
      };

      // 1. Zkusíme načíst token z .env nebo z localStorage
      let authToken = (import.meta.env.VITE_PROD_DB_SECRET as string) || localStorage.getItem('monster_admin_prod_auth_token') || "";

      let results = await attemptMigration(authToken);

      // Pokud dostaneme 401 Unauthorized (token chybí nebo vypršel), vyžádáme si ho znovu a uložíme
      const hasUnauthorized = results.some(res => res.status === 401);
      if (hasUnauthorized) {
        const tokenInput = window.prompt(
          "Ověření selhalo nebo token chybí.\n\nZadejte prosím platný Database Secret z Firebase Console (Project Settings -> Service Accounts -> Database Secrets):"
        );
        if (!tokenInput) {
          alert('Migrace byla přerušena (chybí oprávnění).');
          setIsMigratingUser(false);
          return;
        }
        localStorage.setItem('monster_admin_prod_auth_token', tokenInput);
        authToken = tokenInput;
        results = await attemptMigration(authToken);
      }

      const allOk = results.every(res => res.ok);
      if (allOk) {
        alert('Hráč byl úspěšně přenesen do produkční databáze!');
      } else {
        const failedResponse = results.find(res => !res.ok);
        alert(`Migrace selhala (Status: ${failedResponse?.status}). Zkontrolujte bezpečnostní pravidla.`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Chyba při migraci hráče: ' + err.message);
    } finally {
      setIsMigratingUser(false);
    }
  };

  const copyMigrationLink = () => {
    if (!selectedPlayerId || !detailedData) {
      alert('Chyba: Data hráče nejsou načtena.');
      return;
    }

    const migrationPayload = {
      uid: selectedPlayerId,
      playerName: detailedData.playerName || pSummary?.name || 'Lovec',
      avatarStyle: detailedData.avatarStyle || detailedData.avs || pSummary?.avatarStyle || 'bottts',
      avatarSeed: detailedData.avatarSeed || detailedData.avd || pSummary?.avatarSeed || selectedPlayerId,
      totalXP: detailedData.totalXP || 0,
      caughtMonsters: (detailedData.caughtMonsters || []).map((m: any) => ({
        id: m.id,
        level: m.level,
        xp: m.xp || 0,
        currentHP: m.currentHP,
        gems: m.gems || [null, null, null],
        items: m.items || [null, null, null],
        caughtAt: m.caughtAt,
        stats: m.stats,
        mutations: m.mutations
      })),
      inventory: (detailedData.inventory || []).map((item: any) => {
        if (!item) return null;
        return {
          type: item.type,
          count: item.count
        };
      })
    };

    try {
      const jsonStr = JSON.stringify(migrationPayload);
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      let binString = "";
      for (let i = 0; i < utf8Bytes.length; i++) {
        binString += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Data = btoa(binString);
      
      const targetDomain = isProdDb ? 'https://monstero-prod.web.app' : 'https://monster-app-3062e.web.app';
      const link = `${targetDomain}/?import=${encodeURIComponent(base64Data)}`;
      
      navigator.clipboard.writeText(link)
        .then(() => {
          alert('Odkaz pro přenos byl zkopírován do schránky!\n\nData byla bezpečně zabalena přímo do odkazu. Pošlete ho hráči, aby jej otevřel na svém telefonu.');
        })
        .catch(err => {
          console.error(err);
          alert('Chyba při kopírování odkazu: ' + err.message);
        });
    } catch (e: any) {
      console.error(e);
      alert('Chyba při balení dat pro migraci: ' + e.message);
    }
  };

  const downloadPlayerBackup = () => {
    if (!selectedPlayerId || !detailedData) {
      alert('Chyba: Data hráče nejsou načtena.');
      return;
    }

    const migrationPayload = {
      uid: selectedPlayerId,
      playerName: detailedData.playerName || pSummary?.name || 'Lovec',
      avatarStyle: detailedData.avatarStyle || detailedData.avs || pSummary?.avatarStyle || 'bottts',
      avatarSeed: detailedData.avatarSeed || detailedData.avd || pSummary?.avatarSeed || selectedPlayerId,
      totalXP: detailedData.totalXP || 0,
      caughtMonsters: (detailedData.caughtMonsters || []).map((m: any) => ({
        id: m.id,
        level: m.level,
        xp: m.xp || 0,
        currentHP: m.currentHP,
        gems: m.gems || [null, null, null],
        items: m.items || [null, null, null],
        caughtAt: m.caughtAt,
        stats: m.stats,
        mutations: m.mutations
      })),
      inventory: (detailedData.inventory || []).map((item: any) => {
        if (!item) return null;
        return {
          type: item.type,
          count: item.count
        };
      })
    };

    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(migrationPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const filename = `monstero_player_${migrationPayload.playerName.replace(/\s+/g, '_')}_backup.json`;
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e: any) {
      console.error(e);
      alert('Chyba při stahování zálohy: ' + e.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 h-full">

      {!selectedPlayerId ? (
        <div className="space-y-6">
          {/* Header Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-white/5 p-6 rounded-3xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-3.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Vyhledat hráče podle jména, emailu nebo ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-xs text-white focus:border-primary/50 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                {(['all', 'online', 'blocked'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                      statusFilter === tab 
                        ? "bg-primary text-slate-950 shadow-md shadow-primary/10" 
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {tab === 'all' ? 'Všichni' : tab === 'online' ? 'Online' : 'Blokovaní'}
                  </button>
                ))}
              </div>

              <button
                onClick={cleanupInactiveUsers}
                disabled={isCleaning}
                className={cn(
                  "px-5 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500 hover:text-white transition-all",
                  isCleaning && "opacity-50 animate-pulse"
                )}
              >
                {isCleaning ? 'Čistím...' : 'Vyčistit neaktivní'}
              </button>
            </div>
          </div>

          {/* Players Table */}
          <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/25">
                    <th className="p-4 pl-6">Hráč</th>
                    <th className="p-4">ID</th>
                    <th className="p-4">Level</th>
                    <th className="p-4">Sbírka</th>
                    <th className="p-4">Poslední Aktivita</th>
                    <th className="p-4 pr-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {players
                    .filter(p =>
                      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .filter(p => {
                      if (statusFilter === 'online') return p.isOnline && !p.isBlocked;
                      if (statusFilter === 'blocked') return p.isBlocked;
                      return true;
                    })
                    .length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-slate-500 uppercase tracking-wider italic">
                          Žádní hráči nenalezeni
                        </td>
                      </tr>
                    ) : (
                      players
                        .filter(p =>
                          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.email?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .filter(p => {
                          if (statusFilter === 'online') return p.isOnline && !p.isBlocked;
                          if (statusFilter === 'blocked') return p.isBlocked;
                          return true;
                        })
                        .map(p => (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedPlayerId(p.id)}
                            className={cn(
                              "hover:bg-white/5 transition-colors cursor-pointer group",
                              p.isBlocked && "opacity-60"
                            )}
                          >
                            <td className="p-4 pl-6 flex items-center gap-3">
                              <div className="size-10 rounded-xl bg-slate-800 border border-white/10 overflow-hidden relative shrink-0">
                                <img src={`https://api.dicebear.com/7.x/${p.avatarStyle || 'bottts'}/svg?seed=${p.avatarSeed || p.id}`} className="w-full h-full" alt="Avatar" />
                                {p.isOnline && !p.isBlocked && (
                                  <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                                )}
                                {p.isBlocked && (
                                  <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-rose-600 border-2 border-slate-950 rounded-full flex items-center justify-center text-[7px] font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.8)]">✕</div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-black text-white uppercase group-hover:text-primary transition-colors flex items-center gap-1.5">
                                  {p.name || 'Lovec'}
                                  {p.isBlocked && (
                                    <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded leading-none shrink-0 flex items-center gap-1">
                                      <AlertCircle size={10} /> BLOKOVÁN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500">{p.email}</div>
                              </div>
                            </td>
                            <td className="p-4 text-[10px] font-mono text-slate-400">{p.id}</td>
                            <td className="p-4">
                              <span className="text-xs font-black px-2.5 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20 shadow-sm shadow-primary/5">
                                Lv {p.level}
                              </span>
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-350">
                              {p.monsterCount} {p.monsterCount === 1 ? 'Příšera' : p.monsterCount < 5 ? 'Příšery' : 'Příšer'}
                            </td>
                            <td className="p-4 text-xs text-slate-400">
                              {p.lastActive ? new Date(p.lastActive).toLocaleString('cs-CZ') : 'Nikdy'}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {renderTimeBadge(p.lastActive)}
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-20">
          {/* Back Action Header */}
          <div className="flex items-center justify-between pb-2">
            <button
              onClick={() => setSelectedPlayerId(null)}
              className="flex items-center gap-2 text-xs font-black uppercase text-primary/80 hover:text-primary transition-all bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl border border-primary/20"
            >
              <ArrowLeft size={14} /> Zpět na seznam hráčů
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Left Card: Basic Profile Info */}
            <div className="p-6 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="flex items-center gap-4 relative z-10">
                <div className="size-16 rounded-xl bg-slate-800 border-2 border-white/10 p-1 flex items-center justify-center relative shrink-0">
                  <img src={`https://api.dicebear.com/7.x/${detailedData?.avatarStyle || pSummary?.avatarStyle || 'bottts'}/svg?seed=${detailedData?.avatarSeed || pSummary?.avatarSeed || selectedPlayerId}`} className="w-full h-full rounded-lg" alt="Avatar" />
                  {(detailedData?.blo || pSummary?.isBlocked) && (
                    <div className="absolute -bottom-1 -right-1 size-5 bg-rose-600 border-2 border-slate-950 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.8)]">✕</div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <h1 className="text-xl font-black text-white uppercase italic truncate">{currentName}</h1>
                    {(detailedData?.blo || pSummary?.isBlocked) && (
                      <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded leading-none shrink-0 flex items-center gap-1">
                        <AlertCircle size={10} /> BLOKOVÁN
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[9px] font-black text-primary uppercase">ID: {selectedPlayerId}</div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold">
                      <Mail size={10} className="text-slate-500" />
                      {detailedData?.email || pSummary?.email || 'Bez e-mailu'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Aktivita</div>
                  <div className="text-[10px] font-black text-white italic flex items-center gap-1.5">
                    <LogIn size={12} className="text-primary" />
                    {pSummary?.lastActive ? new Date(pSummary.lastActive).toLocaleString('cs-CZ') : 'Nikdy'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</div>
                  <div className={cn(
                    "text-[9px] font-black",
                    detailedData?.blo 
                      ? "text-rose-500 animate-pulse" 
                      : (pSummary?.isOnline ? 'text-emerald-500' : 'text-slate-400')
                  )}>
                    {detailedData?.blo ? 'Zablokován' : (pSummary?.isOnline ? 'Online' : 'Offline')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-5 text-center">
                <div className="bg-black/40 p-2.5 rounded-2xl">
                  <div className="text-[8px] text-slate-500 font-bold uppercase">Úroveň</div>
                  <div className="text-base font-black text-white italic">
                    {detailedData?.level || detailedData?.currentLevel || pSummary?.level || 1}
                  </div>
                </div>
                <div className="bg-black/40 p-2.5 rounded-2xl">
                  <div className="text-[8px] text-slate-500 font-bold uppercase">Inventář</div>
                  <div className="text-base font-black text-emerald-500 italic">
                    {detailedData?.inventory?.length || 0}
                  </div>
                </div>
                <div className="bg-black/40 p-2.5 rounded-2xl">
                  <div className="text-[8px] text-slate-500 font-bold uppercase">Příšery</div>
                  <div className="text-base font-black text-primary italic">
                    {detailedData?.caughtMonsters?.length || pSummary?.monsterCount || 0}
                  </div>
                </div>
              </div>

              <button
                onClick={toggleBlockPlayer}
                className={cn(
                  "mt-5 w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all border",
                  detailedData?.blo
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-slate-950"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                )}
              >
                {detailedData?.blo ? 'Odblokovat hráče' : 'Zablokovat hráče'}
              </button>

              {!isProdDb && (
                <button
                  onClick={migrateUserToProduction}
                  disabled={isMigratingUser}
                  className="mt-2.5 w-full py-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-slate-950 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {isMigratingUser ? 'Přenáším...' : 'Přenést do produkce'}
                </button>
              )}

              <button
                onClick={copyMigrationLink}
                className="mt-2 w-full py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-slate-950 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Kopírovat odkaz pro migraci
              </button>

              <button
                onClick={downloadPlayerBackup}
                className="mt-2 w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Stáhnout zálohu hráče (JSON)
              </button>
            </div>

            {/* Right Side: Tabbed Details & Map */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* Secondary Navigation */}
              <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 w-full overflow-x-auto no-scrollbar gap-1">
                {(['info', 'monsters', 'inventory', 'referrals'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setProfileTab(tab)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex-1 text-center",
                      profileTab === tab 
                        ? "bg-primary text-slate-950 shadow-lg shadow-primary/10" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {tab === 'info' ? 'Profil & Poloha' : 
                     tab === 'monsters' ? `Příšery (${detailedData?.caughtMonsters?.length || pSummary?.monsterCount || 0})` : 
                     tab === 'inventory' ? `Inventář (${detailedData?.inventory?.length || 0})` : 
                     `Pozvání (${detailedData?.referralList ? Object.keys(detailedData.referralList).length : 0})`}
                  </button>
                ))}
              </div>

              {/* Sub-tab content */}
              <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 min-h-[380px] flex flex-col justify-between">
                
                {profileTab === 'info' && (
                  <div className="space-y-6 h-full flex flex-col">
                    <div className="flex-1 min-h-[280px] bg-slate-950 border border-white/10 rounded-[2rem] overflow-hidden relative shadow-inner">
                      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-1 pointer-events-none">
                        <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10 text-[9px] font-black text-white uppercase flex items-center gap-1.5 shadow-2xl backdrop-blur-md">
                          <MapPin size={10} className="text-cyan-400" /> Poslední známá poloha GPS
                        </div>
                        {hasCoords && (
                          <div className="bg-black/60 px-2 py-0.5 rounded-full text-[8px] font-bold text-slate-400 border border-white/5 w-fit">
                            {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                          </div>
                        )}
                      </div>

                      <div
                        ref={mapContainerRef}
                        className="absolute inset-0 w-full h-full"
                        key={`map-${selectedPlayerId}`}
                        style={{ background: '#020617', zIndex: 1, position: 'absolute' }}
                      />

                      {!hasCoords && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-950/80 backdrop-blur-sm z-[10]">
                          <MapPin size={24} className="opacity-10 mb-2" />
                          <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 italic">GPS data nedostupná</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {profileTab === 'monsters' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 text-slate-500" size={14} />
                      <input 
                        type="text" 
                        placeholder="Hledat v chycených příšerách..." 
                        value={monsterSearch} 
                        onChange={(e) => setMonsterSearch(e.target.value)} 
                        className="w-full max-w-sm bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-primary/50 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[300px] overflow-y-auto pr-1 content-start custom-scrollbar">
                      {detailedData?.caughtMonsters && detailedData.caughtMonsters.length > 0 ? (
                        detailedData.caughtMonsters
                          .filter((m: any) => getLoc(m.name, 'cz').toLowerCase().includes(monsterSearch.toLowerCase()) || m.id.includes(monsterSearch))
                          .map((m: any, i: number) => (
                            <div key={i} className="p-2 bg-black/25 border border-white/5 rounded-xl flex flex-col items-center text-center group hover:border-primary/30 transition-all">
                              <div className="size-12 bg-black/40 rounded-lg p-1 flex items-center justify-center shrink-0 mb-1">
                                <img src={`/monsters/${m.id}.png`} className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300" alt={getLoc(m.name, 'cz')} onError={(e) => e.currentTarget.style.display = 'none'} />
                              </div>
                              <div className="min-w-0 w-full">
                                <div className="text-[9px] font-black text-white uppercase truncate leading-tight">{getLoc(m.name, 'cz')}</div>
                                <div className="text-[8px] font-black text-primary leading-tight">Lv {m.level}</div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="col-span-full py-12 text-center opacity-25 italic font-black uppercase text-[10px] tracking-widest border border-white/5 rounded-3xl">Zatím žádné úlovky</div>
                      )}
                    </div>
                  </div>
                )}

                {profileTab === 'inventory' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-2.5 text-slate-500" size={12} />
                        <input 
                          type="text" 
                          placeholder="Hledat předmět..." 
                          value={itemSearch} 
                          onChange={(e) => setItemSearch(e.target.value)} 
                          className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white focus:border-primary/50 outline-none"
                        />
                      </div>
                      <div className="flex gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/5 w-fit">
                        {['Vše', 'Surovina', 'Klíčový předmět', 'Spotřební'].map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => setItemCategoryFilter(cat)}
                            className={cn("px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all", itemCategoryFilter === cat ? "bg-primary text-slate-950" : "text-slate-500 hover:text-white")}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 content-start custom-scrollbar">
                      {detailedData?.inventory && detailedData.inventory.length > 0 ? (
                        (() => {
                          const filteredItems = detailedData.inventory.map((item: any, i: number) => {
                            const config = RESOURCE_CONFIG[item.type];
                            return { item, config, index: i };
                          }).filter(({ item, config }: any) => {
                            const name = getLoc(config?.label, 'cz') || item.type;
                            const matchSearch = name.toLowerCase().includes(itemSearch.toLowerCase());
                            const matchCategory = itemCategoryFilter === 'Vše' || config?.category === itemCategoryFilter;
                            return matchSearch && matchCategory;
                          });

                          if (filteredItems.length === 0) {
                            return <div className="col-span-full py-12 text-center opacity-25 italic font-black uppercase text-[10px] tracking-widest border border-white/5 rounded-3xl">Žádné předměty neodpovídají filtrům</div>;
                          }

                          return filteredItems.map(({ item, config, index }: any) => (
                            <div key={index} className="p-3 bg-black/20 border border-white/5 rounded-2xl flex items-center gap-3">
                              <div className="size-10 bg-black/40 rounded-lg flex items-center justify-center text-xl shrink-0">
                                {config?.hasCustomIcon ? (
                                  <img src={`/resources/${config.customIcon || item.type}.png`} className="w-6 h-6 object-contain" alt={item.type} />
                                ) : (
                                  <span>{config?.icon || '📦'}</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-black text-white uppercase truncate">
                                  {getLoc(config?.label, 'cz') || item.type}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="text-[8px] font-black text-emerald-500 uppercase">{config?.category || 'Předmět'}</div>
                                  <div className="text-[10px] font-black text-white bg-white/10 px-1.5 py-0.5 rounded-md">x{item.count}</div>
                                </div>
                              </div>
                            </div>
                          ));
                        })()
                      ) : (
                        <div className="col-span-full py-12 text-center opacity-25 italic font-black uppercase text-[10px] tracking-widest border border-white/5 rounded-3xl">Inventář je prázdný</div>
                      )}
                    </div>
                  </div>
                )}

                {profileTab === 'referrals' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 content-start custom-scrollbar">
                      {detailedData?.referralList && Object.entries(detailedData.referralList).length > 0 ? (
                        Object.entries(detailedData.referralList).map(([ruid, data]: [string, any]) => {
                          const isRegistered = data.status === 'registered' || !!data.registeredUid;
                          const isInvited = !isRegistered;
                          const isReady = isRegistered && (data.level || 0) >= 3;
                          const progress = !isRegistered ? 0 : (
                            data.totalXP
                              ? Math.min((data.totalXP / 1050) * 100, 100)
                              : Math.min(((data.level || 1) / 3) * 100, 100)
                          );

                          return (
                            <div key={ruid} className={cn(
                              "p-3 bg-black/20 border rounded-2xl flex items-center gap-3 relative overflow-hidden transition-all",
                              isReady ? "border-purple-500/40 bg-purple-500/5 shadow-md shadow-purple-500/5" : "border-white/5"
                            )}>
                              <div className="size-10 shrink-0 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 relative z-10 overflow-hidden">
                                {data.hatchClaimed ? (
                                  <span className="text-lg">👑</span>
                                ) : (
                                  <img
                                    src={data.level >= 3 ? "/eggs/egg_hatched.png" : (data.level >= 2 ? "/eggs/egg_cracked.png" : "/eggs/egg_whole.png")}
                                    className={cn(
                                      "w-6 h-6 object-contain transition-transform duration-500",
                                      isInvited && "grayscale opacity-40 scale-75",
                                      !isInvited && data.level >= 3 && "animate-bounce",
                                      !isInvited && data.level === 2 && "animate-egg-hop",
                                      !isInvited && data.level === 1 && "animate-egg-shake"
                                    )}
                                    alt="Egg"
                                  />
                                )}
                                {isReady && !data.hatchClaimed && (
                                  <div className="absolute -top-1 -right-1 size-2.5 bg-purple-500 rounded-full animate-ping" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0 relative z-10">
                                <div className="text-[10px] font-black text-white truncate uppercase italic">
                                  {getLoc(data.name, 'cz') || ruid?.split('@')[0] || 'Neznámý'}
                                </div>
                                <div className="text-[8px] font-bold text-slate-500 truncate mb-1 block">
                                  {data.email || (ruid.includes('@') ? ruid.replace(/_/g, '.') : ruid)}
                                </div>

                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-wider">
                                    <span className={cn(isInvited ? "text-slate-600" : "text-primary")}>
                                      {isInvited ? 'PENDING' : 'REGISTERED'}
                                    </span>
                                    <span className="text-slate-400">Lv {data.level || 0}</span>
                                  </div>
                                  <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                                    <div
                                      className={cn(
                                        "h-full transition-all duration-1000",
                                        data.hatchClaimed ? "bg-amber-500" : isInvited ? "bg-slate-800" : "bg-purple-500"
                                      )}
                                      style={{ width: data.hatchClaimed ? '100%' : `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 relative z-10">
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Opravdu smazat tuto pozvánku?')) {
                                      await remove(ref(db, `referrals/${selectedPlayerId}/${ruid}`));
                                      fetchUserDetails(selectedPlayerId);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-colors rounded-lg"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="col-span-full py-12 text-center bg-black/20 border border-white/5 border-dashed rounded-[2rem]">
                          <Users size={20} className="mx-auto mb-1.5 text-slate-800" />
                          <div className="text-[9px] opacity-20 italic font-black uppercase tracking-widest">Žádné pozvánky</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};



