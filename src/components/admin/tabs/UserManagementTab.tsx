import React, { useState, useEffect, useRef, useCallback } from 'react';

import {

  Users, User, Trophy, Activity,

  MapPin, Clock, Sword, Heart, AlertCircle, Mail, LogIn, Package

} from 'lucide-react';

import { RESOURCE_CONFIG } from '../../../data/resources';

import { motion, AnimatePresence } from 'framer-motion';

import { useTranslation } from 'react-i18next';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import { db } from '../../../lib/firebase';

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



  const mapRef = useRef<L.Map | null>(null);

  const markerRef = useRef<L.CircleMarker | null>(null);

  const pulseRef = useRef<L.CircleMarker | null>(null);



  const fetchUserDetails = async (uid: string) => {

    setIsLoadingDetails(true);

    try {

      const userRef = ref(db, `users/${uid}`);

      const referralRef = ref(db, `referrals/${uid}`);



      const [userSnap, referralSnap] = await Promise.all([

        get(userRef),

        get(referralRef)

      ]);



      setDetailedData({

        ...(userSnap.exists() ? userSnap.val() : {}),

        referralList: referralSnap.exists() ? referralSnap.val() : {}

      });

    } catch (e) { console.error(e); }

    finally { setIsLoadingDetails(false); }

  };



  useEffect(() => {

    if (selectedPlayerId) fetchUserDetails(selectedPlayerId);

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



  const [isRepairing, setIsRepairing] = useState(false);



  const repairAllReferrals = async () => {

    setIsRepairing(true);

    try {

      const usersSnap = await get(ref(db, 'users'));

      const referralsSnap = await get(ref(db, 'referrals'));

      const invitesSnap = await get(ref(db, 'invites'));



      const allUsers = usersSnap.val() || {};

      const allReferrals = referralsSnap.val() || {};

      const allInvites = invitesSnap.val() || {};

      let repairCount = 0;



      // 1. Create email -> UID map from both Users and Global Invites

      const emailToUid: Record<string, string> = {};



      // Map from users backup

      Object.entries(allUsers).forEach(([uid, data]: [string, any]) => {

        const email = data.email || (data.playerName?.includes('@') ? data.playerName : null);

        if (email) emailToUid[email.toLowerCase()] = uid;

      });



      // Map from global invites (source of truth for registration)

      Object.entries(allInvites).forEach(([cleanEmail, data]: [string, any]) => {

        if (data.registeredUid) {

          const originalEmail = data.email || cleanEmail.replace('_', '.');

          emailToUid[originalEmail.toLowerCase()] = data.registeredUid;

        }

      });



      // 2. Scan all referrals

      for (const [referrerUid, userReferrals] of Object.entries(allReferrals)) {

        for (const [refKey, refData] of Object.entries(userReferrals as any)) {

          const emailMatch = (refKey.includes('@') ? refKey.replace('_', '.') : (refData as any).email)?.toLowerCase();



          if (emailMatch && emailToUid[emailMatch]) {

            const realUid = emailToUid[emailMatch];

            // Only update if link is missing or status is invited

            if (!(refData as any).registeredUid || (refData as any).status === 'invited') {

              await update(ref(db, `referrals/${referrerUid}/${refKey}`), {

                registeredUid: realUid,

                status: 'registered'

              });

              // Repair invited_emails mapping

              const cleanEmail = emailMatch.replace(/\./g, '_');

              await update(ref(db, `users/${referrerUid}/invited_emails/${cleanEmail}`), {

                registeredUid: realUid,

                status: 'registered'

              });

              repairCount++;

            }

          }

        }

      }

      alert(`Oprava dokončena! Propojeno ${repairCount} pozvánek. Refreshněte stránku (F5).`);

    } catch (e) {

      console.error(e);

      alert('Chyba při opravě.');

    } finally {

      setIsRepairing(false);

    }

  };



  const [manualEmail, setManualEmail] = useState('');

  const [manualUid, setManualUid] = useState('');



  const handleManualLink = async () => {

    if (!manualEmail || !manualUid) return alert('VyplĹte obě pole!');

    const cleanEmail = manualEmail.replace(/\./g, '_').toLowerCase();



    try {

      const inviteSnap = await get(ref(db, `invites/${cleanEmail}`));

      if (!inviteSnap.exists()) return alert('Tento e-mail nebyl v systému nalezen jako pozvaný.');



      const referrerUid = inviteSnap.val().referrerUid;



      await update(ref(db, `invites/${cleanEmail}`), { registeredUid: manualUid, status: 'registered' });

      await update(ref(db, `referrals/${referrerUid}/${cleanEmail}`), { registeredUid: manualUid, status: 'registered' });

      await update(ref(db, `users/${referrerUid}/invited_emails/${cleanEmail}`), { registeredUid: manualUid, status: 'registered' });



      alert('Propojeno! Teď už by se měl level v dashboardu zobrazit správně.');

      setManualEmail('');

      setManualUid('');

    } catch (e) {

      alert('Chyba při propojování.');

    }

  };



  return (

    <div className="flex-1 overflow-y-auto pr-2 h-full">

      <div className="mb-6 space-y-4">

        <div className="flex items-center justify-between bg-slate-900 border border-white/5 p-4 rounded-3xl">

          <div className="flex items-center gap-3">

            <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Users size={20} /></div>

            <div>

              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Správa uživatelů</div>

              <div className="text-sm font-black text-white uppercase italic">Monitoring a správa hráčů</div>

            </div>

          </div>

          <button

            onClick={repairAllReferrals}

            disabled={isRepairing}

            className={cn(

              "px-5 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase text-purple-500 hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2",

              isRepairing && "opacity-50 animate-pulse"

            )}

          >

            {isRepairing ? <Activity size={14} className="animate-spin" /> : <AlertCircle size={14} />}

            {isRepairing ? 'Opravuji...' : 'Opravit všechny vztahy'}

          </button>

        </div>



        {/* Manual Link Tool */}

        <div className="p-4 bg-slate-900/50 border border-dashed border-white/10 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-3 items-end">

          <div>

            <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 ml-2">E-mail pozvánky</label>

            <input type="text" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="daniel@test.cz" className="w-full bg-black border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-primary/50" />

          </div>

          <div>

            <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 ml-2">ID hráče (z tabulky)</label>

            <input type="text" value={manualUid} onChange={(e) => setManualUid(e.target.value)} placeholder="UID zleva..." className="w-full bg-black border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-primary/50" />

          </div>

          <button onClick={handleManualLink} className="py-2.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-slate-950 transition-all">Propojit ručně</button>

        </div>

      </div>



      {!selectedPlayerId ? (

        <div className="h-full flex flex-col items-center justify-center opacity-10 text-white py-20">

          <Users size={64} className="mb-4" />

          <p className="text-xs font-black uppercase tracking-[0.3em]">Vyberte hráče ze seznamu</p>

        </div>

      ) : (

        <div className="space-y-6 pb-20">



          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Profilovka */}

            <div className="p-8 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">

              <div className="flex items-center gap-6 relative z-10">

                <div className="size-20 rounded-2xl bg-slate-800 border-2 border-white/10 p-1 flex items-center justify-center">

                  <img src={`https://api.dicebear.com/7.x/${detailedData?.avatarStyle || pSummary?.avatarStyle || 'bottts'}/svg?seed=${detailedData?.avatarSeed || pSummary?.avatarSeed || selectedPlayerId}`} className="w-full h-full rounded-lg" alt="Avatar" />

                </div>

                <div className="flex-1 min-w-0 space-y-1">

                  <h1 className="text-2xl font-black text-white uppercase italic truncate">{currentName}</h1>

                  <div className="flex flex-col gap-1">

                    <div className="text-[10px] font-black text-primary uppercase">ID: {selectedPlayerId}</div>

                    {(detailedData?.email || pSummary?.email || (currentName?.includes('@') ? currentName : null)) && (

                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">

                        <Mail size={12} className="text-slate-500" />

                        {detailedData?.email || pSummary?.email || currentName}

                      </div>

                    )}

                  </div>

                </div>

              </div>

              <div className="mt-6 p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">

                <div className="space-y-0.5">

                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Poslední aktivita</div>

                  <div className="text-xs font-black text-white italic flex items-center gap-2">

                    <LogIn size={14} className="text-primary" />

                    {new Date(pSummary?.lastActive || Date.now()).toLocaleString(i18n.language === 'cz' ? 'cs-CZ' : (i18n.language === 'sk' ? 'sk-SK' : 'en-US'))}

                  </div>

                </div>

                <div className="text-right">

                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</div>

                  <div className="text-[10px] font-black text-emerald-500">

                    {pSummary?.isOnline ? 'Online' : 'Offline'}

                  </div>

                </div>

              </div>

              <div className="grid grid-cols-3 gap-3 mt-6 text-center">

                <div className="bg-black/40 p-3 rounded-2xl">

                  <div className="text-[9px] text-slate-500 font-bold uppercase">ÚroveĹ</div>

                  <div className="text-xl font-black text-white italic">

                    {detailedData?.level || detailedData?.currentLevel || pSummary?.level || 1}

                  </div>

                </div>

                <div className="bg-black/40 p-3 rounded-2xl"><div className="text-[9px] text-slate-500 font-bold uppercase">Inventář</div><div className="text-xl font-black text-emerald-500 italic">{detailedData?.inventory?.length || 0}</div></div>

                <div className="bg-black/40 p-3 rounded-2xl"><div className="text-[9px] text-slate-500 font-bold uppercase">Příšery</div><div className="text-xl font-black text-primary italic">{detailedData?.caughtMonsters?.length || pSummary?.monsterCount || 0}</div></div>

              </div>

            </div>



            {/* MAPA S VYNUCENOU INICIALIZACÍ */}

            <div className="h-[320px] bg-slate-900 border-2 border-white/10 rounded-[2.5rem] overflow-hidden relative shadow-2xl">

              <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-1 pointer-events-none">

                <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black text-white uppercase flex items-center gap-2 shadow-2xl backdrop-blur-md">

                  <MapPin size={12} className="text-cyan-400" /> Poslední známá poloha

                </div>

                {hasCoords && (

                  <div className="bg-black/60 px-3 py-1 rounded-full text-[8px] font-bold text-slate-400 border border-white/10">

                    {currentLat.toFixed(5)}, {currentLng.toFixed(5)}

                  </div>

                )}

              </div>



              {/* DIV S CALLBACK REF */}

              <div

                ref={mapContainerRef}

                className="w-full h-full"

                key={`map-${selectedPlayerId}`} // Vynutí čerstvý DOM pro callback

                style={{ background: '#020617', zIndex: 1, position: 'relative' }}

              />



              {!hasCoords && (

                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-950/80 backdrop-blur-sm z-[10]">

                  <MapPin size={32} className="opacity-10 mb-2" />

                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 italic">Hledám GPS souřadnice...</span>

                </div>

              )}

            </div>

          </div>



          {/* SEZNAM MONSTER A INVENTĂĹ */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            <div className="space-y-4">

              <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2"><Sword size={16} className="text-primary" /> Sbírka příšer</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {detailedData?.caughtMonsters?.map((m: any, i: number) => (

                  <div key={i} className="p-3 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center gap-3">

                    <div className="size-10 bg-black/40 rounded-lg p-1 shrink-0"><img src={`/monsters/${m.id}.png`} className="w-full h-full object-contain" alt={getLoc(m.name, 'cz')} /></div>

                    <div className="min-w-0">

                      <div className="text-[11px] font-black text-white uppercase truncate">{getLoc(m.name, 'cz')}</div>

                      <div className="text-[9px] font-black text-primary">ÚroveĹ {m.level}</div>

                    </div>

                  </div>

                )) || <div className="py-10 text-center opacity-20 italic font-black uppercase text-[10px] tracking-widest border border-white/5 rounded-3xl">Zatím žádné úlovky</div>}

              </div>

            </div>



            <div className="space-y-4">

              <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">

                <Package size={16} className="text-emerald-500" /> Inventář předmětů

              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {detailedData?.inventory && detailedData.inventory.length > 0 ? (

                  detailedData.inventory.map((item: any, i: number) => {

                    const config = RESOURCE_CONFIG[item.type];

                    return (

                      <div key={i} className="p-3 bg-slate-900/50 border border-white/5 rounded-2xl flex items-center gap-3">

                        <div className="size-10 bg-black/40 rounded-lg flex items-center justify-center text-xl shrink-0">

                          {config?.hasCustomIcon ? (

                            <img src={`/resources/${config.customIcon || item.type}.png`} className="w-6 h-6 object-contain" alt={item.type} />

                          ) : (

                            <span>{config?.icon || 'đź“¦'}</span>

                          )}

                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="text-[11px] font-black text-white uppercase truncate">

                            {getLoc(config?.label, 'cz') || item.type}

                          </div>

                          <div className="flex items-center justify-between">

                            <div className="text-[9px] font-black text-emerald-500 uppercase">{config?.category || 'Předmět'}</div>

                            <div className="text-[10px] font-black text-white bg-white/10 px-1.5 py-0.5 rounded-md">x{item.count}</div>

                          </div>

                        </div>

                      </div>

                    );

                  })

                ) : (

                  <div className="py-10 text-center opacity-20 italic font-black uppercase text-[10px] tracking-widest border border-white/5 rounded-3xl">Inventář je prázdný</div>

                )}

              </div>

            </div>

          </div>



          {/* POZVANÍ PĹĂTELÉ */}

          <div className="space-y-4">

            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">

              <Users size={16} className="text-purple-500" /> Pozvaní přátelé

            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {detailedData?.referralList && Object.entries(detailedData.referralList).length > 0 ? (

                Object.entries(detailedData.referralList).map(([ruid, data]: [string, any]) => {

                  const isRegistered = data.status === 'registered' || !!data.registeredUid;

                  const isInvited = !isRegistered;



                  const isReady = isRegistered && (data.level || 0) >= 3;



                  // Granular progress towards Lv. 3 (1050 XP) or fallback to level-based

                  const progress = !isRegistered ? 0 : (

                    data.totalXP

                      ? Math.min((data.totalXP / 1050) * 100, 100)

                      : Math.min(((data.level || 1) / 3) * 100, 100)

                  );



                  return (

                    <div key={ruid} className={cn(

                      "p-4 bg-slate-900 border rounded-3xl flex items-center gap-4 relative overflow-hidden transition-all",

                      isReady ? "border-purple-500/40 bg-purple-500/5 shadow-lg shadow-purple-500/10" : "border-white/5"

                    )}>

                      {/* Egg / Trophy Icon */}

                      <div className="size-12 shrink-0 flex items-center justify-center bg-black/40 rounded-2xl border border-white/5 relative z-10 overflow-hidden">

                        {data.hatchClaimed ? (

                          <span className="text-xl">đźŹ†</span>

                        ) : (

                          <img

                            src={data.level >= 3 ? "/eggs/egg_hatched.png" : (data.level >= 2 ? "/eggs/egg_cracked.png" : "/eggs/egg_whole.png")}

                            className={cn(

                              "w-8 h-8 object-contain transition-transform duration-500",

                              isInvited && "grayscale opacity-40 scale-75",

                              !isInvited && data.level >= 3 && "animate-bounce",

                              !isInvited && data.level === 2 && "animate-egg-hop",

                              !isInvited && data.level === 1 && "animate-egg-shake"

                            )}

                            alt="Egg"

                          />

                        )}

                        {isReady && !data.hatchClaimed && (

                          <div className="absolute -top-1 -right-1 size-3 bg-purple-500 rounded-full animate-ping" />

                        )}

                      </div>



                      <div className="flex-1 min-w-0 relative z-10">

                        <div className="text-xs font-black text-white truncate uppercase italic">

                          {getLoc(data.name, 'cz') || ruid?.split('@')[0] || 'Neznámý uživatel'}

                        </div>

                        <div className="text-[10px] font-bold text-slate-500 truncate mb-2 block">

                          {data.email || (ruid.includes('@') ? ruid.replace(/_/g, '.') : ruid)}

                        </div>



                        <div className="space-y-1">

                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">

                            <span className={cn(isInvited ? "text-slate-600" : "text-primary")}>

                              {isInvited ? 'PENDING' : 'REGISTERED'}

                            </span>

                            <span className="text-slate-400">ÚroveĹ {data.level || 0}</span>

                          </div>

                          <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">

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



                      {/* Actions */}

                      <div className="flex flex-col gap-2 relative z-10">

                        <button

                          onClick={async () => {

                            if (window.confirm('Opravdu smazat tuto pozvánku?')) {

                              await remove(ref(db, `referrals/${selectedPlayerId}/${ruid}`));

                              fetchUserDetails(selectedPlayerId); // Refresh

                            }

                          }}

                          className="p-2 hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-colors rounded-xl"

                        >

                          <Trash2 size={16} />

                        </button>

                      </div>



                      {/* Status Badge */}

                      {data.hatchClaimed && (

                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[7px] font-black text-amber-500 uppercase">

                          Claimed

                        </div>

                      )}

                    </div>

                  )

                })

              ) : (

                <div className="py-12 text-center bg-slate-900/50 border border-white/5 rounded-[2rem] border-dashed">

                  <Users size={24} className="mx-auto mb-2 text-slate-800" />

                  <div className="text-[10px] opacity-20 italic font-black uppercase tracking-widest">Zatím žádné pozvánky</div>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

