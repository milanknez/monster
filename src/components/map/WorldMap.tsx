import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, Sword, Shield, Zap, Package, X, Compass, Crosshair, Users, RefreshCw, Battery, Heart } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { monsterDB } from '../../data/monsters'
import type { Monster, SpawnPoint, SpawnRarity, ResourceType, ResourceSpawn, Cooldowns, NearbyPlayer } from '../../types'
import { cn } from '../../utils'
import { syncPlayerToFirebase, watchNearbyPlayers } from '../../lib/firebase'

import {
  haversineM,
  makeMarkerIcon,
  makeTooltipHtml,
  makePlayerIcon,
  makeOtherPlayerIcon,
  makeResourceIcon,
  makeResourceTooltipHtml,
  RARITY_COLORS,
  RESOURCE_CONFIG,
  optimizeSpawns
} from './mapUtils'

import {
  generateCommonSpawns,
  generateResources,
  fetchPoiData,
  isOnCooldown,
  loadCooldowns,
  calculateHPCost,
  COMMON_GRID_M,
  OVERPASS_RADIUS_M
} from './spawnEngine'

// ── Leaflet default icon fix ──────────────────────────────────
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// ── Typy ─────────────────────────────────────────────────────
// NearbyPlayer interface is now imported from '../../types'

export interface WorldMapProps {
  onCatch: (monster: Monster) => void
  onStartTrade: (targetPlayerName?: string, targetUid?: string) => void
  onStartDuel: (targetPlayerName?: string, targetUid?: string) => void
  tradeSignal?: string | null
  onBleSignal?: (type: string, targetName: string, fromName: string, data: string) => void
  playerHP: number
  onConsumeHP: (amount: number) => void
  onDistanceUpdate: (meters: number) => void
  isInteractionBlocked?: boolean
  caughtMonsters: Monster[]
  playerName: string
  avatarStyle: string
  avatarSeed: string
  playerLevel: number
  onGather: (type: ResourceType, amount: number) => void
  activeMonster: Monster | null
  addToast?: (toast: { title: string; message: string; type: 'success' | 'info' | 'error' | 'boost' }) => void
}

// ── Konfigurace ──────────────────────────────────────────────
// ── Pomocné funkce jsou nyní v spawnEngine.ts ──
const CATCH_RADIUS_M = 15
const RESPAWN_COOLDOWN_MS = 10 * 60 * 1000

export interface WorldMapHandle {
  centerOnPlayer: () => void;
}

export const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(({
  onCatch,
  onStartTrade,
  onConsumeHP,
  onDistanceUpdate,
  isInteractionBlocked,
  playerName,
  avatarStyle,
  avatarSeed,
  playerLevel,
  caughtMonsters,
  playerHP,
  onGather,
  onStartDuel,
  activeMonster,
  addToast
}, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const playerMarkerRef = useRef<L.Marker | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const resourceMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const otherPlayersMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const watchIdRef = useRef<number | null>(null)
  const overpassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPoiFetchRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastPosRef = useRef<[number, number] | null>(null)
  const lastPosTimeRef = useRef<number | null>(null)
  const cooldownsRef = useRef<Cooldowns>(loadCooldowns())
  const autoCenterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInternalMoveRef = useRef(false)

  const [playerPos, setPlayerPos] = useState<[number, number] | null>(null)
  const [spawns, setSpawns] = useState<SpawnPoint[]>([])
  const [resources, setResources] = useState<ResourceSpawn[]>([])
  const [nearbySpawn, setNearbySpawn] = useState<SpawnPoint | null>(null)
  const [nearbyResource, setNearbyResource] = useState<ResourceSpawn | null>(null)

  const [levelBlocked, setLevelBlocked] = useState(false)
  const [energyBlocked, setEnergyBlocked] = useState(false)
  const [showMonsters, setShowMonsters] = useState(true)
  const [showResources, setShowResources] = useState(true)
  const [loadingPoi, setLoadingPoi] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Hledám polohu…')
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([])
  const [firebasePlayers, setFirebasePlayers] = useState<NearbyPlayer[]>([])
  const [selectedOtherPlayer, setSelectedOtherPlayer] = useState<NearbyPlayer | null>(null)
  const [buildings, setBuildings] = useState<{ lat: number, lng: number }[]>([])
  const buildingsRef = useRef<{ lat: number, lng: number }[]>([])
  const [isAutoCenter, setIsAutoCenter] = useState(true)
  const isAutoCenterRef = useRef(isAutoCenter)

  const selectedPlayerDist = useMemo(() => {
    if (!playerPos || !selectedOtherPlayer) return null
    return haversineM(playerPos[0], playerPos[1], selectedOtherPlayer.lat, selectedOtherPlayer.lng)
  }, [playerPos, selectedOtherPlayer])

  const [zoom, setZoom] = useState(17)
  const iconScale = useMemo(() => {
    if (zoom >= 18) return 1.2
    if (zoom >= 17) return 1.0
    if (zoom >= 16) return 0.8
    if (zoom >= 15) return 0.65
    if (zoom >= 14) return 0.5
    return 0.35
  }, [zoom])
  const setAutoCenterSync = (val: boolean) => {
    setIsAutoCenter(val)
    isAutoCenterRef.current = val
  }

  useEffect(() => { isAutoCenterRef.current = isAutoCenter }, [isAutoCenter])

  useImperativeHandle(ref, () => ({
    centerOnPlayer: () => {
      if (mapRef.current && playerMarkerRef.current) {
        mapRef.current.setView(playerMarkerRef.current.getLatLng(), 17);
      }
    }
  }));

  useEffect(() => {
    (window as any).spawnMapMonster = () => {
      if (playerPos) {
        setSpawns(prev => {
          const newM: SpawnPoint = {
            id: 'dev_spawn_' + Date.now(),
            lat: playerPos[0] + 0.00001,
            lng: playerPos[1] + 0.00001,
            rarity: 'epic',
            monsterId: 'obsidian_golem',
            level: 7,
            caught: false
          };
          const next = [...prev, newM];
          return next;
        });
        console.log("🔥 Epický Golem Lv.7 naspawněn naproti tobě!");
      }
    };

    (window as any).spawnCustomMonster = (mId: string, lvl: number, rar: SpawnRarity = 'common') => {
      if (playerPos) {
        setSpawns(prev => [
          ...prev,
          {
            id: 'custom_spawn_' + Date.now(),
            lat: playerPos[0] + 0.00005,
            lng: playerPos[1] + 0.00005,
            rarity: rar,
            monsterId: mId,
            level: lvl,
            caught: false
          }
        ]);
        console.log(`🧨 Monstrum ${mId} (Lv.${lvl}, ${rar}) naspawněno u tebe!`);
      }
    };

    return () => {
      delete (window as any).spawnMapMonster;
      delete (window as any).spawnBasicMonster;
      delete (window as any).spawnCustomMonster;
    };
  }, [playerPos]);

  const recalcNearby = useCallback((lat: number, lng: number, currentSpawns: SpawnPoint[], currentResources: ResourceSpawn[]) => {
    if (!isFinite(lat) || !isFinite(lng)) return
    const nearbySp = currentSpawns
      .filter(s => !s.caught && isFinite(s.lat) && isFinite(s.lng))
      .map(s => ({ s, dist: haversineM(lat, lng, s.lat, s.lng) }))
      .filter(({ dist }) => dist <= CATCH_RADIUS_M)
      .sort((a, b) => a.dist - b.dist)[0]
    setNearbySpawn(nearbySp?.s ?? null)

    const nearbyRes = currentResources
      .filter(r => !r.isCollected && isFinite(r.lat) && isFinite(r.lng))
      .map(r => ({ r, dist: haversineM(lat, lng, r.lat, r.lng) }))
      .filter(({ dist }) => dist <= CATCH_RADIUS_M)
      .sort((a, b) => a.dist - b.dist)[0]
    setNearbyResource(nearbyRes?.r ?? null)
  }, [])

  const updateMarkers = useCallback((map: L.Map, currentSpawns: SpawnPoint[], currentResources: ResourceSpawn[], playerLat: number, playerLng: number, pLevel: number, hideMonsters: boolean, hideResources: boolean, scale: number) => {
    // Monsters
    const existing = markersRef.current
    for (const [id, marker] of existing) {
      if (hideMonsters || !currentSpawns.find(s => s.id === id && !s.caught)) { marker.remove(); existing.delete(id) }
    }
    if (!hideMonsters) {
      for (const s of currentSpawns) {
        if (s.caught) continue
        const dist = haversineM(playerLat, playerLng, s.lat, s.lng)
        const isNearby = dist <= CATCH_RADIUS_M
        const currentLocked = s.level > pLevel
        const marker = existing.get(s.id)

        if (marker) {
          if ((marker as any)._isNearby !== isNearby || (marker as any)._isLocked !== currentLocked || (marker as any)._scale !== scale) {
            marker.setIcon(makeMarkerIcon(s, isNearby, currentLocked, scale))
            marker.setTooltipContent(makeTooltipHtml(s, pLevel))
              ; (marker as any)._isNearby = isNearby
              ; (marker as any)._isLocked = currentLocked
              ; (marker as any)._scale = scale
          }
        } else {
          const m = L.marker([s.lat, s.lng], { icon: makeMarkerIcon(s, isNearby, currentLocked, scale) }).bindTooltip(makeTooltipHtml(s, pLevel), { direction: 'top', offset: [0, -12], className: 'monster-tooltip' }).addTo(map)
            ; (m as any)._isNearby = isNearby
            ; (m as any)._isLocked = currentLocked
            ; (m as any)._scale = scale
          existing.set(s.id, m)
        }
      }
    }

    // Resources
    const rExisting = resourceMarkersRef.current
    for (const [id, marker] of rExisting) {
      if (hideResources || !currentResources.find(r => r.id === id && !r.isCollected)) { marker.remove(); rExisting.delete(id) }
    }
    if (!hideResources) {
      for (const r of currentResources) {
        if (r.isCollected) continue
        const dist = haversineM(playerLat, playerLng, r.lat, r.lng)
        const isNearby = dist <= CATCH_RADIUS_M
        const marker = rExisting.get(r.id)
        if (marker) {
          if ((marker as any)._isNearby !== isNearby || (marker as any)._scale !== scale) {
            marker.setIcon(makeResourceIcon(r.type, isNearby, scale))
              ; (marker as any)._isNearby = isNearby
              ; (marker as any)._scale = scale
          }
        } else {
          const m = L.marker([r.lat, r.lng], { icon: makeResourceIcon(r.type, isNearby, scale) }).bindTooltip(makeResourceTooltipHtml(r.type, r.amount), { direction: 'top', offset: [0, -5], className: 'resource-tooltip' }).addTo(map)
            ; (m as any)._isNearby = isNearby
            ; (m as any)._scale = scale
          rExisting.set(r.id, m)
        }
      }
    }
  }, [])

  const updateOtherPlayers = useCallback((map: L.Map, players: NearbyPlayer[]) => {
    const existing = otherPlayersMarkersRef.current
    const activeIds = new Set(players.map(p => p.id))
    for (const [id, marker] of existing) {
      if (!activeIds.has(id)) { marker.remove(); existing.delete(id) }
    }
    for (const p of players) {
      const marker = existing.get(p.id)
      if (marker) {
        marker.setLatLng([p.lat, p.lng])
      } else {
        const newMarker = L.marker([p.lat, p.lng], { icon: makeOtherPlayerIcon(p.name, p.avatarSeed || p.name, p.avatarStyle) }).on('click', () => { setSelectedOtherPlayer(p) }).addTo(map)
        existing.set(p.id, newMarker)
      }
    }
  }, [])

  const fetchPOI = useCallback(async (lat: number, lng: number, force = false) => {
    if (!isFinite(lat) || !isFinite(lng)) return
    const last = lastPoiFetchRef.current
    if (!force && last && haversineM(lat, lng, last.lat, last.lng) < 200) return

    lastPoiFetchRef.current = { lat, lng }
    setLoadingPoi(true)
    setStatusMsg('Skenuji POI…')

    try {
      const { monsters: poiMonsters, resources: poiResources, buildings: poiBuildings } = await fetchPoiData(lat, lng, cooldownsRef.current, force)

      setSpawns(prev => {
        const poiMap = new Map<string, SpawnPoint>()
        // 1. Zafixujeme POI z okolí + nové POI
        prev.filter(p => p.rarity !== 'common' && haversineM(lat, lng, p.lat, p.lng) < 2000).forEach(p => poiMap.set(p.id, p))
        poiMonsters.forEach(p => poiMap.set(p.id, p))
        const poisArray = Array.from(poiMap.values())

        // 2. Vezmeme všechny existující common a optimalizujeme je 
        // proti nově načteným budovám a POI. Pustíme je do "posouvací" funkce,
        // která je vystrčí z budov a zajistí 15m rozestup
        const rawCommons = prev.filter(c => c.rarity === 'common')
        const finalCommons = optimizeSpawns(rawCommons, poiBuildings || [], poisArray, 35, 15)

        return [...finalCommons, ...poisArray]
      })

      setResources(prev => {
        const poiMap = new Map<string, ResourceSpawn>()
        // 1. Zafixujeme POI z okolí + nové
        prev.filter(r => r.id.startsWith('poi_') && haversineM(lat, lng, r.lat, r.lng) < 2000).forEach(r => poiMap.set(r.id, r))
        poiResources.forEach(r => poiMap.set(r.id, r))
        const poisArray = Array.from(poiMap.values())

        // 2. Posunout a pročistit
        const rawRandoms = prev.filter(r => !r.id.startsWith('poi_'))
        const finalRandoms = optimizeSpawns(rawRandoms, poiBuildings || [], poisArray, 35, 15)

        return [...finalRandoms, ...poisArray]
      })

      setBuildings(poiBuildings || [])
      buildingsRef.current = poiBuildings || []

      setStatusMsg('')
    } catch (e) {
      console.error("POI Fetch Error:", e)
      setStatusMsg('Chyba skenování')
      setTimeout(() => setStatusMsg(''), 3000)
    } finally {
      setLoadingPoi(false)
    }
  }, [])

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = L.map(mapContainerRef.current, { center: [50.0755, 14.4378], zoom: 16, zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    mapRef.current = map

    const handleManualInteractionStart = () => {
      if (mapRef.current) map.stop()
      setAutoCenterSync(false)
      if (autoCenterTimerRef.current) clearTimeout(autoCenterTimerRef.current)
    }

    const handleManualInteractionEnd = () => {
      if (autoCenterTimerRef.current) clearTimeout(autoCenterTimerRef.current)
      autoCenterTimerRef.current = setTimeout(() => {
        setAutoCenterSync(true)
        if (mapRef.current && playerMarkerRef.current) {
          isInternalMoveRef.current = true
          mapRef.current.panTo(playerMarkerRef.current.getLatLng(), { animate: true })
        }
      }, 14000)
    }

    map.on('movestart', () => {
      if (isInternalMoveRef.current) {
        // This was us (GPS or return-to-center timer)
        return
      }
      handleManualInteractionStart()
    })

    map.on('moveend', () => {
      if (isInternalMoveRef.current) {
        isInternalMoveRef.current = false
        return
      }
      handleManualInteractionEnd()
    })

    // Also handle zoom just in case it doesn't trigger move properly in all browsers
    map.on('zoomstart', handleManualInteractionStart)
    map.on('zoomend', () => {
      setZoom(map.getZoom())
      handleManualInteractionEnd()
    })

    return () => {
      if (autoCenterTimerRef.current) clearTimeout(autoCenterTimerRef.current);
    }
  }, []) // Mapa se inicializuje jen jednou

  // --- GPS Sledování ---
  useEffect(() => {
    if (!('geolocation' in navigator) || !mapRef.current) return

    const watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      if (!isFinite(lat) || !isFinite(lng)) return
      const now = Date.now()
      if (lastPosRef.current && lastPosTimeRef.current) {
        const traveled = haversineM(lastPosRef.current[0], lastPosRef.current[1], lat, lng)
        if (traveled >= 4 && traveled <= 150) onDistanceUpdate(traveled)
      }
      lastPosRef.current = [lat, lng]
      lastPosTimeRef.current = now
      setPlayerPos([lat, lng]); setStatusMsg('')

      if (!playerMarkerRef.current) {
        playerMarkerRef.current = L.marker([lat, lng], {
          icon: makePlayerIcon(),
          zIndexOffset: 1000,
          interactive: true
        }).addTo(mapRef.current!)

        // --- Cheat: 6x click spawns random monster ---
        let cheatClicks = 0;
        let cheatTimeout: any = null;
        playerMarkerRef.current.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          cheatClicks++;
          if (cheatTimeout) clearTimeout(cheatTimeout);
          cheatTimeout = setTimeout(() => { cheatClicks = 0; }, 5000);

          if (cheatClicks >= 6) {
            cheatClicks = 0;
            const randomM = monsterDB[Math.floor(Math.random() * monsterDB.length)];
            const offsetLat = (Math.random() - 0.5) * 0.00006;
            const offsetLng = (Math.random() - 0.5) * 0.00006;
            setSpawns(prev => [
              ...prev,
              {
                id: 'cheat_' + Date.now(),
                lat: lat + offsetLat,
                lng: lng + offsetLng,
                rarity: 'common',
                monsterId: randomM.id,
                level: playerLevel,
                caught: false
              }
            ]);
            addToast?.({
              title: 'Cheat aktivován',
              message: 'Divoké monstrum se objevilo u tebe!',
              type: 'success'
            });
          }
        });

        mapRef.current!.setView([lat, lng], 17)
      } else {
        playerMarkerRef.current.setLatLng([lat, lng])
        if (isAutoCenterRef.current && mapRef.current) {
          isInternalMoveRef.current = true
          mapRef.current.panTo([lat, lng], { animate: true })
        }
      }

      const cooldowns = loadCooldowns()
      const commonMonsters = generateCommonSpawns(lat, lng, cooldowns)
      const commonRes = generateResources(lat, lng, cooldowns)

      setSpawns(prev => {
        const pois = prev.filter(p => p.rarity !== 'common' && haversineM(lat, lng, p.lat, p.lng) < 2000).map(p => ({ ...p, caught: isOnCooldown(cooldowns, p.id) }))
        // Aplikace přesunu + 15m rozestupu přes optimizeSpawns
        const optimizedCommon = optimizeSpawns(commonMonsters, buildingsRef.current, pois, 35, 15)
        return [...optimizedCommon, ...pois]
      })

      setResources(prev => {
        const pois = prev.filter(r => r.id.startsWith('poi_') && haversineM(lat, lng, r.lat, r.lng) < 2000).map(r => ({ ...r, isCollected: isOnCooldown(cooldowns, r.id) }))
        // Aplikace přesunu + 15m rozestupu
        const optimizedRes = optimizeSpawns(commonRes, buildingsRef.current, pois, 35, 15)
        return [...optimizedRes, ...pois]
      })

      if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
      overpassTimerRef.current = setTimeout(() => fetchPOI(lat, lng), 800)
    }, (err) => {
      setStatusMsg('GPS nedostupná');
      console.warn("Geolocation watch error:", err);
    }, { enableHighAccuracy: true })

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current);
    }
  }, [onDistanceUpdate]) // REMOVED isAutoCenter from dependencies

  useEffect(() => {
    if (!playerPos || !mapRef.current) return
    updateMarkers(mapRef.current, spawns, resources, playerPos[0], playerPos[1], playerLevel, !showMonsters, !showResources, iconScale)
    updateOtherPlayers(mapRef.current, nearbyPlayers)
    recalcNearby(playerPos[0], playerPos[1], spawns, resources)
  }, [spawns, resources, playerPos, playerLevel, nearbyPlayers, updateMarkers, updateOtherPlayers, recalcNearby, showMonsters, showResources, iconScale])

  const handleCatch = () => {
    if (!nearbySpawn) return
    // Level check is now handled in the UI directly
    const cost = calculateHPCost(nearbySpawn.level, nearbySpawn.rarity)
    if (playerHP < cost) { setEnergyBlocked(true); setTimeout(() => setEnergyBlocked(false), 2000); return }
    const dbM = monsterDB.find(m => m.id === nearbySpawn.monsterId) || monsterDB[0]
    onConsumeHP(cost)
    onCatch({ ...dbM, level: nearbySpawn.level, image: `/monsters/${dbM.id}.png` } as Monster)
    const nC = { ...cooldownsRef.current, [nearbySpawn.id]: Date.now() + RESPAWN_COOLDOWN_MS }
    cooldownsRef.current = nC; localStorage.setItem('map_cooldowns', JSON.stringify(nC))
    setSpawns(prev => prev.map(s => s.id === nearbySpawn.id ? { ...s, caught: true } : s))
    setNearbySpawn(null)
  }

  const handleGather = () => {
    if (!nearbyResource) return
    onGather(nearbyResource.type, nearbyResource.amount)
    const nC = { ...cooldownsRef.current, [nearbyResource.id]: Date.now() + RESPAWN_COOLDOWN_MS }
    cooldownsRef.current = nC; localStorage.setItem('map_cooldowns', JSON.stringify(nC))
    setResources(prev => prev.map(r => r.id === nearbyResource.id ? { ...r, isCollected: true } : r))
    setNearbyResource(null)
  }

  useEffect(() => {
    if (!playerPos || !playerName) return
    const sync = () => {
      syncPlayerToFirebase({
        name: playerName,
        level: playerLevel,
        monsterCount: caughtMonsters.length,
        lat: playerPos[0],
        lng: playerPos[1],
        avatarStyle: avatarStyle,
        avatarSeed: avatarSeed
      });
    };
    sync(); // Sync immediately
    const interval = setInterval(sync, 10000); // And every 10s
    return () => clearInterval(interval);
  }, [playerPos, playerName, playerLevel, caughtMonsters.length, avatarStyle, avatarSeed])

  useEffect(() => {
    if (!playerPos || !playerName) return
    const unsubscribe = watchNearbyPlayers((others) => {
      setFirebasePlayers(others.filter(p => (Date.now() - p.lastActive) < 300000 && haversineM(playerPos[0], playerPos[1], p.lat, p.lng) < 2000).map(p => ({ ...p, id: p.id || `fb_${p.name}` })))
    });
    return () => unsubscribe();
  }, [playerPos, playerName])

  useEffect(() => {
    const all = new Map<string, NearbyPlayer>()
    firebasePlayers.forEach(p => all.set(p.name, p))
    setNearbyPlayers(Array.from(all.values()))
  }, [firebasePlayers])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 176px)' }}>
      <div className="px-4 py-2 flex items-center justify-between bg-background-dark/50 backdrop-blur-sm z-50">
        <div>
          <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Průzkum Sektoru</p>
          <p className="text-slate-500 text-[9px] font-bold">{statusMsg || `${spawns.filter(s => !s.caught).length} příšer & ${resources.filter(r => !r.isCollected).length} surovin`}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Bar */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 mr-1">
            <button
              onClick={() => playerPos && fetchPOI(playerPos[0], playerPos[1], true)}
              className={cn("p-1.5 rounded-full transition-all hover:bg-white/10", loadingPoi ? "text-blue-500" : "text-slate-400")}
              title="Vynutit obnovu mapy"
            >
              <RefreshCw size={12} className={cn(loadingPoi && "animate-spin")} />
            </button>
            <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
            <button
              onClick={() => setShowMonsters(!showMonsters)}
              className={cn("p-1.5 rounded-full transition-all", showMonsters ? "bg-primary/20 text-primary" : "text-slate-500 opacity-50")}
            >
              <Sword size={12} />
            </button>
            <button
              onClick={() => setShowResources(!showResources)}
              className={cn("p-1.5 rounded-full transition-all", showResources ? "bg-emerald-500/20 text-emerald-500" : "text-slate-500 opacity-50")}
            >
              <Package size={12} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
            <Battery size={10} className="text-blue-500" fill="currentColor" />
            <span className="text-[10px] font-black text-blue-500 uppercase">{Math.round(playerHP)}% Energie</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative m-3 mt-1 rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-[1001] bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-lg p-2.5 px-3 flex flex-col gap-1.5 shadow-2xl pointer-events-none">
          {[
            { label: 'Běžná', color: 'text-blue-500' },
            { label: 'Vzácná', color: 'text-purple-500' },
            { label: 'Epická', color: 'text-orange-500' }
          ].map(l => (
            <span key={l.label} className={cn("text-[7.5px] font-black uppercase tracking-[0.2em] drop-shadow-sm leading-none", l.color)}>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {nearbyResource && !nearbySpawn && !isInteractionBlocked && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-6 left-6 right-6 z-[1001]">
            <button onClick={handleGather} className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex flex-col items-center justify-center bg-gradient-to-r from-emerald-600 to-teal-500 border-b-4 border-black/20 shadow-2xl transition-all active:scale-95">
              <div className="flex items-center gap-2 underline underline-offset-4 decoration-white/30"><Package size={16} /><span>SEBRAT: {RESOURCE_CONFIG[nearbyResource.type]?.label || 'Surovinu'}</span></div>
              <div className="text-[10px] opacity-80 mt-1">ZÍSKÁŠ {nearbyResource.amount}ks MATERIÁLU</div>
            </button>
          </motion.div>
        )}
        {nearbySpawn && !isInteractionBlocked && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-6 left-6 right-6 z-[1001]">
            {nearbySpawn.level > playerLevel ? (
              <div className="w-full py-5 rounded-2xl bg-red-950/90 backdrop-blur-md border-b-4 border-red-500/50 text-red-200 font-black text-center uppercase text-sm flex items-center justify-center gap-2 shadow-2xl">
                <X size={16} className="text-red-500" />
                <span>UZAMČENO: VYŽADUJE ÚROVEŇ {nearbySpawn.level}</span>
              </div>
            ) : energyBlocked ? (
              <div className="w-full py-5 rounded-2xl bg-slate-900/90 backdrop-blur-md border-b-4 border-orange-500/50 text-orange-200 font-black text-center uppercase text-sm flex items-center justify-center gap-2 shadow-2xl">
                <Battery size={16} className="text-orange-500" />
                <span>🔋 ENERGIE PŘÍLIŠ NÍZKÁ</span>
              </div>
            ) : (
              <button onClick={handleCatch} className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex flex-col items-center justify-center border-b-4 border-black/20 shadow-2xl transition-all active:scale-95" style={{ background: nearbySpawn.rarity === 'epic' ? 'linear-gradient(135deg, #c2410c, #f97316)' : nearbySpawn.rarity === 'rare' ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : 'linear-gradient(135deg, #0891b2, #0db9f2)' }}>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="animate-bounce" />
                  <span>{caughtMonsters.length === 0 ? 'CHYTIT' : 'BOJOVAT'}: LEVEL {nearbySpawn.level}</span>
                </div>
                <div className="text-[10px] opacity-80 mt-1 uppercase tracking-tighter font-black">
                  {caughtMonsters.length === 0 ? `SPOTŘEBUJE ${calculateHPCost(nearbySpawn.level, nearbySpawn.rarity)}% ENERGIE` : 'VZÍT SI SVÉ NEJSILNĚJŠÍ MONSTRUM'}
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOtherPlayer && (
          <div className="absolute inset-0 z-[2000] flex items-end justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="w-full max-w-sm bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col items-center">
                <img src={`https://api.dicebear.com/7.x/${selectedOtherPlayer.avatarStyle || 'avataaars'}/svg?seed=${selectedOtherPlayer.avatarSeed || selectedOtherPlayer.name}`} className="size-20 bg-slate-800 rounded-2xl mb-4 border border-purple-500/30" alt="" />
                <h3 className="text-xl font-black text-white uppercase italic">{selectedOtherPlayer.name}</h3>
                <p className="text-purple-400 text-[10px] font-black uppercase mb-6 tracking-widest leading-none">Aeternum Runner (LVL {selectedOtherPlayer.level})</p>

                {selectedPlayerDist !== null && selectedPlayerDist > CATCH_RADIUS_M && (
                  <div className="w-full bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] font-black text-center uppercase p-3 rounded-2xl mb-6 italic tracking-tight leading-relaxed">
                    🔴 Výměna a souboj je možný jen při osobním setkání.
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full">
                  {selectedPlayerDist !== null && selectedPlayerDist <= CATCH_RADIUS_M && (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                        onClick={() => { onStartTrade(selectedOtherPlayer.name, selectedOtherPlayer.id); setSelectedOtherPlayer(null) }}
                        className="bg-purple-600 active:scale-95 shadow-lg shadow-purple-900/20 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-tighter transition-all"
                      >
                        Vyměnit
                      </button>
                      <button
                        onClick={() => {
                          onStartDuel?.(selectedOtherPlayer.name, selectedOtherPlayer.id);
                          setSelectedOtherPlayer(null);
                        }}
                        className="bg-red-600 active:scale-95 shadow-lg shadow-red-900/20 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-tighter transition-all"
                      >
                        Vyzvat
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedOtherPlayer(null)}
                    className="bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl uppercase text-xs hover:bg-slate-700 active:scale-95 transition-all shadow-inner"
                  >
                    Zavřít
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

export default WorldMap
