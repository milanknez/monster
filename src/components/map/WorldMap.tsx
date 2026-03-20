import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MapPin, RefreshCw } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { monsterDB } from '../../data/monsters'
import type { Monster, SpawnPoint, SpawnRarity } from '../../types'
import { cn } from '../../utils'
import { syncPlayerToFirebase, watchNearbyPlayers } from '../../lib/firebase'

import {
  haversineM,
  metersToLatDeg,
  metersToLngDeg,
  seededFloat,
  pickMonster,
  pickLevel,
  calculateHPCost,
  makeMarkerIcon,
  makeTooltipHtml,
  makePlayerIcon,
  makeOtherPlayerIcon
} from './mapUtils'

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
export interface NearbyPlayer {
  id: string
  name: string
  lat: number
  lng: number
  lastSeen: number
  level: number
  avatarSeed?: string
  avatarStyle?: string
}

export interface WorldMapProps {
  onCatch: (monster: Monster) => void
  onStartTrade: (targetPlayerName?: string, targetUid?: string) => void
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
}

// ── Konfigurace ──────────────────────────────────────────────
const CATCH_RADIUS_M = 15
const COMMON_GRID_M = 100
const COMMON_RADIUS_CELLS = 8
const OVERPASS_RADIUS_M = 3000
const RESPAWN_COOLDOWN_MS = 5 * 60 * 1000

type Cooldowns = Record<string, number>

function loadCooldowns(): Cooldowns {
  try { return JSON.parse(localStorage.getItem('map_cooldowns') ?? '{}') }
  catch { return {} }
}

function isOnCooldown(cooldowns: Cooldowns, id: string): boolean {
  return Date.now() < (cooldowns[id] ?? 0)
}

const REF_LAT = 50.0
const LAT_STEP = metersToLatDeg(COMMON_GRID_M)
const LNG_STEP = metersToLngDeg(COMMON_GRID_M, REF_LAT)

function generateCommonSpawns(playerLat: number, playerLng: number, cooldowns: Cooldowns): SpawnPoint[] {
  if (!isFinite(playerLat) || !isFinite(playerLng)) return []
  const spawns: SpawnPoint[] = []
  const centerIX = Math.floor(playerLat / LAT_STEP)
  const centerIY = Math.floor(playerLng / LNG_STEP)
  for (let dy = -COMMON_RADIUS_CELLS; dy <= COMMON_RADIUS_CELLS; dy++) {
    for (let dx = -COMMON_RADIUS_CELLS; dx <= COMMON_RADIUS_CELLS; dx++) {
      const ix = centerIX + dy
      const iy = centerIY + dx
      const gridLat = ix * LAT_STEP
      const gridLng = iy * LNG_STEP
      const id = `grid_${ix}_${iy}`
      if (seededFloat(`skip_${id}`) < 0.25) continue
      const jLat = gridLat + (seededFloat(`jlat_${id}`) - 0.5) * LAT_STEP * 0.7
      const jLng = gridLng + (seededFloat(`jlng_${id}`) - 0.5) * LNG_STEP * 0.7
      spawns.push({
        id, lat: jLat, lng: jLng, rarity: 'common',
        monsterId: pickMonster(id, 'common'),
        level: pickLevel(id, 'common'),
        caught: isOnCooldown(cooldowns, id),
      })
    }
  }
  return spawns
}

async function fetchPoiSpawns(lat: number, lng: number, cooldowns: Cooldowns): Promise<SpawnPoint[]> {
  if (!isFinite(lat) || !isFinite(lng)) return []
  const query = `[out:json][timeout:30];(nwr["historic"~"castle|monastery|palace|fortress|monument|memorial|archaeological_site|ruins|city_gate|fort|tower|fountain"](around:${OVERPASS_RADIUS_M},${lat},${lng});nwr["tourism"~"museum|attraction|artwork|viewpoint|zoo|theme_park"](around:${OVERPASS_RADIUS_M},${lat},${lng}););out center;`.trim()
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const json = await res.json()
  const spawns: SpawnPoint[] = []
  const seenPos = new Set<string>()
  const EPIC_TAGS = ['castle', 'monastery', 'palace', 'fortress']
  for (const el of json.elements ?? []) {
    const elLat: number = el.lat ?? el.center?.lat
    const elLng: number = el.lon ?? el.center?.lon
    if (elLat === undefined || elLng === undefined || !isFinite(elLat) || !isFinite(elLng)) continue
    const posKey = `${elLat.toFixed(5)}_${elLng.toFixed(5)}`
    if (seenPos.has(posKey)) continue
    seenPos.add(posKey)
    const rarity: SpawnRarity = EPIC_TAGS.includes(el.tags?.historic) ? 'epic' : 'rare'
    const id = `poi_${el.type}_${el.id}`
    spawns.push({
      id, lat: elLat, lng: elLng, rarity,
      monsterId: pickMonster(id, rarity),
      level: pickLevel(id, rarity),
      caught: isOnCooldown(cooldowns, id),
    })
  }
  return spawns
}

export interface WorldMapHandle {
  centerOnPlayer: () => void;
}

export const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(({ 
  onCatch, 
  onStartTrade,
  onConsumeHP,  onDistanceUpdate, isInteractionBlocked, playerName, avatarStyle, avatarSeed, playerLevel, caughtMonsters, playerHP }, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const playerMarkerRef = useRef<L.Marker | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const otherPlayersMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const watchIdRef = useRef<number | null>(null)
  const overpassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPoiFetchRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastPosRef = useRef<[number, number] | null>(null)
  const playerPosRef = useRef<[number, number] | null>(null)
  const lastPosTimeRef = useRef<number | null>(null)
  const cooldownsRef = useRef<Cooldowns>(loadCooldowns())
  const [playerPos, setPlayerPos] = useState<[number, number] | null>(null)
  const [spawns, setSpawns] = useState<SpawnPoint[]>([])
  const [nearbySpawn, setNearbySpawn] = useState<SpawnPoint | null>(null)
  const [mockPlayers, setMockPlayers] = useState<NearbyPlayer[]>([])
  const [levelBlocked, setLevelBlocked] = useState(false)
  const [hpBlocked, setHpBlocked] = useState(false)
  const [loadingPoi, setLoadingPoi] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Hledám polohu…')
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([])
  const [firebasePlayers, setFirebasePlayers] = useState<NearbyPlayer[]>([])
  const [selectedOtherPlayer, setSelectedOtherPlayer] = useState<NearbyPlayer | null>(null)

  useImperativeHandle(ref, () => ({
    centerOnPlayer: () => {
      if (mapRef.current && playerMarkerRef.current) {
        mapRef.current.setView(playerMarkerRef.current.getLatLng(), 17);
      }
    }
  }));

  const currentEnergyCost = useMemo(() => {
    if (!nearbySpawn) return 0
    return calculateHPCost(nearbySpawn.level, nearbySpawn.rarity)
  }, [nearbySpawn])

  const recalcNearby = useCallback((lat: number, lng: number, currentSpawns: SpawnPoint[]) => {
    if (!isFinite(lat) || !isFinite(lng)) return
    const nearby = currentSpawns
      .filter(s => !s.caught && isFinite(s.lat) && isFinite(s.lng))
      .map(s => ({ s, dist: haversineM(lat, lng, s.lat, s.lng) }))
      .filter(({ dist }) => dist <= CATCH_RADIUS_M)
      .sort((a, b) => a.dist - b.dist)[0]
    setNearbySpawn(nearby?.s ?? null)
  }, [])

  const updateMarkers = useCallback((map: L.Map, currentSpawns: SpawnPoint[], playerLat: number, playerLng: number, pLevel: number) => {
    const existing = markersRef.current
    for (const [id, marker] of existing) {
      const spawn = currentSpawns.find(s => s.id === id)
      if (!spawn || spawn.caught) { marker.remove(); existing.delete(id) }
    }
    for (const spawn of currentSpawns) {
      if (spawn.caught || !isFinite(spawn.lat) || !isFinite(spawn.lng)) continue
      const dist = haversineM(playerLat, playerLng, spawn.lat, spawn.lng)
      const isNearby = dist <= CATCH_RADIUS_M
      const isLocked = spawn.level > pLevel
      const marker = existing.get(spawn.id)
      if (marker) {
        const prevNearby = (marker as any)._isNearby
        if (prevNearby !== isNearby) {
          marker.setIcon(makeMarkerIcon(spawn, isNearby, isLocked))
          marker.setTooltipContent(makeTooltipHtml(spawn, pLevel))
          ;(marker as any)._isNearby = isNearby
        }
      } else {
        const newMarker = L.marker([spawn.lat, spawn.lng], { 
          icon: makeMarkerIcon(spawn, isNearby, isLocked), 
          zIndexOffset: spawn.rarity === 'epic' ? 200 : spawn.rarity === 'rare' ? 100 : 0 
        })
        newMarker.bindTooltip(makeTooltipHtml(spawn, pLevel), { 
          direction: 'top', offset: [0, -12], className: 'monster-tooltip', opacity: 1 
        })
        newMarker.addTo(map)
        ;(newMarker as any)._isNearby = isNearby
        existing.set(spawn.id, newMarker)
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
        const newMarker = L.marker([p.lat, p.lng], { 
          icon: makeOtherPlayerIcon(p.name, p.avatarSeed || p.name, p.avatarStyle) 
        })
        .on('click', () => { setSelectedOtherPlayer(p) })
        .addTo(map)
        existing.set(p.id, newMarker)
      }
    }
  }, [])

  const fetchPOI = useCallback(async (lat: number, lng: number) => {
    if (!isFinite(lat) || !isFinite(lng)) return
    const last = lastPoiFetchRef.current
    if (last && haversineM(lat, lng, last.lat, last.lng) < 200) return
    lastPoiFetchRef.current = { lat, lng }
    const cacheKey = `poi_cache_${Math.round(lat*100)}_${Math.round(lng*100)}`
    const cachedData = localStorage.getItem(cacheKey)
    if (cachedData) {
      try {
        const { timestamp, data } = JSON.parse(cachedData)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setSpawns(prev => {
            const commons = prev.filter(s => s.rarity === 'common')
            const existingIds = new Set(commons.map(c => c.id))
            const newPois = (data as SpawnPoint[]).filter(d => !existingIds.has(d.id))
            return [...commons, ...newPois]
          })
          if (Date.now() - timestamp < 60 * 60 * 1000) return
        }
      } catch (e) { console.error("Cache error", e) }
    }
    setLoadingPoi(true)
    try {
      const poiSpawns = await fetchPoiSpawns(lat, lng, cooldownsRef.current)
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: poiSpawns }))
      setSpawns(prev => {
        const commons = prev.filter(s => s.rarity === 'common')
        const poiMap = new Map<string, SpawnPoint>()
        prev.filter(s => s.rarity !== 'common').forEach(s => poiMap.set(s.id, s))
        poiSpawns.forEach(s => poiMap.set(s.id, s))
        return [...commons, ...Array.from(poiMap.values())]
      })
    } catch (e) { console.warn('Overpass failed', e) }
    finally { setLoadingPoi(false) }
  }, [])

  const forceRefreshPOI = useCallback(() => {
    if (!playerPos) return
    const [lat, lng] = playerPos
    localStorage.removeItem(`poi_cache_${Math.round(lat*100)}_${Math.round(lng*100)}`)
    lastPoiFetchRef.current = null
    fetchPOI(lat, lng)
  }, [playerPos, fetchPOI])

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = L.map(mapContainerRef.current, { center: [50.0755, 14.4378], zoom: 16, zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)
    mapRef.current = map
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (!isFinite(lat) || !isFinite(lng)) return
        const now = Date.now()
        if (lastPosRef.current && lastPosTimeRef.current) {
          const [lLat, lLng] = lastPosRef.current
          const dt = (now - lastPosTimeRef.current) / 1000
          const traveled = haversineM(lLat, lLng, lat, lng)
          if (dt > 0) {
            const speedKmh = (traveled / dt) * 3.6
            if (traveled >= 4 && traveled <= 150 && speedKmh < 15) { onDistanceUpdate(traveled) }
          }
        }
        lastPosRef.current = [lat, lng]
        playerPosRef.current = [lat, lng]
        lastPosTimeRef.current = now
        setPlayerPos([lat, lng]); setStatusMsg('')
        if (!playerMarkerRef.current) {
          playerMarkerRef.current = L.marker([lat, lng], { icon: makePlayerIcon(), zIndexOffset: 1000 }).addTo(map)
          map.setView([lat, lng], 16)
        } else { playerMarkerRef.current.setLatLng([lat, lng]) }
        setSpawns(prev => {
          const commons = generateCommonSpawns(lat, lng, cooldownsRef.current)
          const pois = prev.filter(s => s.rarity !== 'common').map(s => ({ ...s, caught: isOnCooldown(cooldownsRef.current, s.id) }))
          const merged = [...commons, ...pois]
          recalcNearby(lat, lng, merged) 
          return merged
        })
        if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
        overpassTimerRef.current = setTimeout(() => fetchPOI(lat, lng), 2000)
      }, () => { setStatusMsg('GPS signál nenalezen.') }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 })
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      playerMarkerRef.current = null
      markersRef.current.clear()
      otherPlayersMarkersRef.current.clear()
    }
  }, [recalcNearby, fetchPOI, onDistanceUpdate])

  useEffect(() => {
    if (!playerPos || !isFinite(playerPos[0])) return
    recalcNearby(playerPos[0], playerPos[1], spawns)
    if (mapRef.current) { 
      updateMarkers(mapRef.current, spawns, playerPos[0], playerPos[1], playerLevel)
      updateOtherPlayers(mapRef.current, nearbyPlayers)
    }
  }, [spawns, playerPos, playerLevel, nearbyPlayers, updateMarkers, updateOtherPlayers, recalcNearby])

  // Simulation Controller
  useEffect(() => {
    (window as any).worldMap_spawnMockPlayers = (count: number = 3) => {
      if (!playerPos) {
        console.warn("GPS poloha není známa, nemohu spawnovat hráče.");
        return;
      }
      const newMock: NearbyPlayer[] = [];
      for (let i = 0; i < count; i++) {
        const dist = 30 + Math.random() * 50;
        const angle = Math.random() * Math.PI * 2;
        const dLat = (dist / 111320) * Math.cos(angle);
        const dLng = (dist / (111320 * Math.cos(playerPos[0] * Math.PI / 180))) * Math.sin(angle);
        const name = ['Aether_Ghost', 'Neon_Stalker', 'Cyber_Wraith', 'Void_Runner'][Math.floor(Math.random() * 4)] + `_${Math.floor(Math.random() * 999)}`;
        const avatarStyleChoice = ['avataaars', 'bottts', 'pixel-art', 'lorelei'][Math.floor(Math.random() * 4)];
        
        newMock.push({
          id: `mock_${Date.now()}_${i}`,
          name,
          level: Math.floor(Math.random() * 15) + 1,
          lat: playerPos[0] + dLat,
          lng: playerPos[1] + dLng,
          lastSeen: Date.now(),
          avatarSeed: name,
          avatarStyle: avatarStyleChoice
        });
      }
      setMockPlayers(prev => [...prev, ...newMock]);
      console.log(`Nasimulováno ${count} hráčů v okolí.`);
    };

    (window as any).worldMap_clearMockPlayers = () => setMockPlayers([]);

    if (window.location.hostname === 'localhost' && playerPos && mockPlayers.length === 0) {
      (window as any).worldMap_spawnMockPlayers(3);
    }
  }, [playerPos, mockPlayers.length]);

  // --- FIREBASE SYNC & WATCH ---
  useEffect(() => {
    if (!playerPos || !playerName) return;

    const syncInterval = setInterval(() => {
      syncPlayerToFirebase({
        name: playerName,
        level: playerLevel,
        monsterCount: caughtMonsters.length,
        lat: playerPos[0],
        lng: playerPos[1],
        avatarStyle,
        avatarSeed
      });
    }, 10000);

    syncPlayerToFirebase({
      name: playerName,
      level: playerLevel,
      monsterCount: caughtMonsters.length,
      lat: playerPos[0],
      lng: playerPos[1],
      avatarStyle,
      avatarSeed
    });

    const unsubscribe = watchNearbyPlayers((others) => {
      const mappedOthers = others
        .filter(p => {
           const isRecent = (Date.now() - p.lastActive) < 5 * 60 * 1000;
           if (!isRecent) return false;
           const dist = haversineM(playerPos[0], playerPos[1], p.lat, p.lng);
           return dist < 2000;
        })
        .map(p => ({
          ...p,
          id: p.id || `fb_${p.name}`
        }));
      setFirebasePlayers(mappedOthers);
    });

    return () => {
      clearInterval(syncInterval);
    };
  }, [playerPos, playerName, playerLevel, caughtMonsters.length, avatarStyle, avatarSeed]);

  useEffect(() => {
    const allPlayersMap = new Map<string, NearbyPlayer>();
    mockPlayers.forEach(p => allPlayersMap.set(p.name, p));
    firebasePlayers.forEach(p => allPlayersMap.set(p.name, p));
    setNearbyPlayers(Array.from(allPlayersMap.values()));
  }, [firebasePlayers, mockPlayers]);

  const handleCatch = () => {
    if (!nearbySpawn) return
    if (nearbySpawn.level > playerLevel) {
      setLevelBlocked(true); setTimeout(() => setLevelBlocked(false), 2500); return
    }
    const cost = calculateHPCost(nearbySpawn.level, nearbySpawn.rarity)
    if (playerHP < cost) {
      setHpBlocked(true); setTimeout(() => setHpBlocked(false), 2500); return
    }
    const dbM = monsterDB.find(m => m.id === nearbySpawn.monsterId) ?? monsterDB[0]
    const caught: Monster = { ...dbM, level: nearbySpawn.level, image: `/monsters/${dbM.id}.png` }
    const nC: Cooldowns = { ...cooldownsRef.current, [nearbySpawn.id]: Date.now() + RESPAWN_COOLDOWN_MS }
    cooldownsRef.current = nC; localStorage.setItem('map_cooldowns', JSON.stringify(nC))
    setSpawns(prev => prev.map(s => s.id === nearbySpawn.id ? { ...s, caught: true } : s))
    setNearbySpawn(null); onConsumeHP(cost); onCatch(caught)
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
      className="relative w-full h-full flex flex-col overflow-hidden" 
      style={{ height: 'calc(100vh - 176px - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
    >
      <div className="px-4 py-2 flex items-center justify-between shrink-0 bg-background-dark/50 backdrop-blur-sm z-50">
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black">Průzkum světa</p>
          <p className="text-slate-500 text-[9px] font-bold">{statusMsg || `${spawns.filter(s => !s.caught).length} příšer v sektoru`}</p>
        </div>
        <div className="flex items-center gap-2">
          {loadingPoi && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
               <RefreshCw size={10} className="text-blue-500 animate-spin" />
               <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">Skenování...</span>
            </div>
          )}
          <button onClick={forceRefreshPOI} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 group">
            <RefreshCw size={14} className={cn("group-hover:text-primary transition-colors", loadingPoi && "animate-spin")} />
          </button>
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
            <Heart size={10} className="text-red-500" fill="currentColor" />
            <span className="text-[10px] font-black text-red-500">{Math.round(playerHP)}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative m-3 mt-1 rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl isolate">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-black/80 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/5 z-40 pointer-events-none">
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /><span className="text-[8px] font-bold text-slate-400 uppercase">Běžná</span></div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /><span className="text-[8px] font-bold text-purple-400 uppercase">Vzácná</span></div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /><span className="text-[8px] font-bold text-orange-400 uppercase">Epická</span></div>
        </div>
      </div>

      <AnimatePresence>
        {nearbySpawn && !isInteractionBlocked && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-6 left-6 right-6 z-[1001]">
            {levelBlocked ? (
              <div className="w-full py-4 rounded-2xl bg-red-950 border border-red-500 text-red-100 font-extrabold text-xs text-center shadow-2xl uppercase">🔒 POTŘEBUJEŠ ÚROVEŇ {nearbySpawn.level}</div>
            ) : hpBlocked ? (
              <div className="w-full py-4 rounded-2xl bg-red-950 border border-red-500 text-red-100 font-extrabold text-xs text-center shadow-2xl uppercase">🔋 VYČERPÁNÍ! ({currentEnergyCost}% ENERGIE)</div>
            ) : (
              <button onClick={handleCatch} className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex flex-col items-center justify-center transition-all active:scale-95 border-b-4 border-black/20" style={{ background: nearbySpawn.rarity === 'epic' ? 'linear-gradient(135deg, #c2410c, #f97316)' : nearbySpawn.rarity === 'rare' ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : 'linear-gradient(135deg, #0891b2, #0db9f2)', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
                <div className="flex items-center gap-2"><MapPin size={14} className="animate-bounce" /><span className="text-sm">DETEKCE: LEVEL {nearbySpawn.level}</span></div>
                <div className="text-[9px] font-bold opacity-90 mt-1 flex items-center gap-1"><Heart size={8} fill="currentColor" /> SPOTŘEBA {currentEnergyCost}% ENERGIE</div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOtherPlayer && (
          <div className="absolute inset-0 z-[2000] flex items-end justify-center p-6 bg-black/20 backdrop-blur-[2px]">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOtherPlayer(null)} className="absolute inset-0" />
             <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="relative w-full max-w-sm bg-slate-900 border border-purple-500/30 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden">
                <div className="flex flex-col items-center text-center">
                   <div className="size-24 rounded-3xl bg-slate-800 border-2 border-purple-500 p-2 mb-4 shadow-lg">
                      <img src={`https://api.dicebear.com/7.x/${selectedOtherPlayer.avatarStyle || 'avataaars'}/svg?seed=${selectedOtherPlayer.avatarSeed || selectedOtherPlayer.name}`} className="w-full h-full object-cover" alt="Avatar" />
                   </div>
                   <div className="mb-6">
                     <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-1">Aether_Runner</p>
                     <h3 className="text-2xl font-black text-white uppercase italic">{selectedOtherPlayer.name}</h3>
                     <div className="mt-2 flex flex-col items-center gap-2">
                        <div className="inline-flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                           <span className="text-xs font-black text-purple-300">LEVEL {selectedOtherPlayer.level}</span>
                        </div>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3 w-full">
                     <button onClick={() => { onStartTrade(selectedOtherPlayer.name, selectedOtherPlayer.id); setSelectedOtherPlayer(null); }} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95 uppercase text-[10px] tracking-widest shadow-lg">
                       <RefreshCw size={14} className="animate-spin-slow" /> Vyměnit
                     </button>
                     <button onClick={() => setSelectedOtherPlayer(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-black py-4 rounded-2xl transition-all active:scale-95 uppercase text-[10px] tracking-widest">
                       Zavřít
                     </button>
                   </div>
                </div>
                <div className="absolute -top-10 -right-10 size-32 bg-purple-500/10 rounded-full blur-3xl" />
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

export default WorldMap
