import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Package, Heart, RefreshCw, Sword, X, Battery } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { monsterDB } from '../../data/monsters'
import type { Monster, SpawnPoint, SpawnRarity, ResourceType, ResourceSpawn } from '../../types'
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
  makeOtherPlayerIcon,
  makeResourceIcon,
  makeResourceTooltipHtml,
  RESOURCE_CONFIG
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
const CATCH_RADIUS_M = 15
const COMMON_GRID_M = 100
const COMMON_RADIUS_CELLS = 8
const OVERPASS_RADIUS_M = 3000
const RESPAWN_COOLDOWN_MS = 10 * 60 * 1000

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

function generateResources(playerLat: number, playerLng: number, cooldowns: Cooldowns): ResourceSpawn[] {
  if (!isFinite(playerLat) || !isFinite(playerLng)) return []
  const spawns: ResourceSpawn[] = []
  const centerIX = Math.floor(playerLat / LAT_STEP)
  const centerIY = Math.floor(playerLng / LNG_STEP)
  const resourceTypes: ResourceType[] = ['crystal', 'herb', 'energy', 'mineral']

  for (let dy = -COMMON_RADIUS_CELLS; dy <= COMMON_RADIUS_CELLS; dy++) {
    for (let dx = -COMMON_RADIUS_CELLS; dx <= COMMON_RADIUS_CELLS; dx++) {
      const ix = centerIX + dy
      const iy = centerIY + dx
      const gridLat = ix * LAT_STEP
      const gridLng = iy * LNG_STEP
      const id = `resource_${ix}_${iy}`
      if (seededFloat(`r_skip_${id}`) < 0.94) continue // Sníženo z 0.86 (nyní jen ~6 % buněk)
      let rType = resourceTypes[Math.floor(seededFloat(`rtype_${id}`) * resourceTypes.length)]
      
      const rareRoll = seededFloat(`rare_${id}`);
      if (rareRoll < 0.03) rType = 'magic_crystal';
      else if (rareRoll < 0.06) rType = 'super_mineral';

      const jLat = gridLat + (seededFloat(`rjlat_${id}`) - 0.5) * LAT_STEP * 0.9
      const jLng = gridLng + (seededFloat(`rjlng_${id}`) - 0.5) * LNG_STEP * 0.9
      spawns.push({
        id, lat: jLat, lng: jLng, type: rType,
        amount: Math.floor(seededFloat(`ramount_${id}`) * 2) + 1,
        isCollected: isOnCooldown(cooldowns, id)
      })
    }
  }
  return spawns
}

async function fetchPoiData(lat: number, lng: number, cooldowns: Cooldowns, force = false): Promise<{ monsters: SpawnPoint[], resources: ResourceSpawn[] }> {
  if (!isFinite(lat) || !isFinite(lng)) return { monsters: [], resources: [] }
  
  // Try to load from cache first for immediate display (if not forced)
  const cacheKey = `poi_cache_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  if (!force) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 3600000) { // 1 hour cache
          console.log("📍 Načítám POI z mezipaměti");
          return data.content;
        }
      } catch(e) { console.error("Cache read error:", e) }
    }
  }

  const query = `[out:json][timeout:30];
(
  // Monsters POIs
  nwr["historic"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["tourism"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["amenity"~"place_of_worship|museum|library|theatre"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["heritage"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  
  // Resources POIs (Logic-based)
  nwr["leisure"~"park|garden|nature_reserve|playground"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["landuse"~"forest|grass|orchard|flowerbed|allotments|meadow"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["power"~"substation|line|tower"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["natural"~"rock|stone|peak|cave_entrance|cliff|water|spring"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["highway"~"path|track|living_street|pedestrian"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["landuse"~"quarry|industrial|construction"](around:${OVERPASS_RADIUS_M},${lat},${lng});
);
out center;`.trim()

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', 
    body: 'data=' + encodeURIComponent(query), 
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  
  const json = await res.json()
  const monsters: SpawnPoint[] = []
  const resources: ResourceSpawn[] = []
  const seenPos = new Set<string>()
  const EPIC_TAGS = ['castle', 'monastery', 'palace', 'fortress', 'cathedral']
  
  for (const el of json.elements ?? []) {
    const elLat: number = el.lat ?? el.center?.lat
    const elLng: number = el.lon ?? el.center?.lon
    if (elLat === undefined || elLng === undefined || !isFinite(elLat) || !isFinite(elLng)) continue
    
    const posKey = `${elLat.toFixed(5)}_${elLng.toFixed(5)}`
    if (seenPos.has(posKey)) continue
    seenPos.add(posKey)
    
    const tags = el.tags || {}
    const id = `poi_${el.type}_${el.id}`
    const isCollected = isOnCooldown(cooldowns, id)

    if (tags.historic || tags.tourism || tags.amenity === 'place_of_worship' || tags.heritage) {
      const rarity: SpawnRarity = (EPIC_TAGS.includes(tags.historic) || EPIC_TAGS.includes(tags.heritage)) ? 'epic' : 'rare'
      monsters.push({
        id, lat: elLat, lng: elLng, rarity,
        monsterId: pickMonster(id, rarity),
        level: pickLevel(id, rarity),
        caught: isCollected,
      })
    } else {
      // Snižujeme hustotu surovin z POI o 80% (původně 30%)
      if (seededFloat(id + '_spawn') < 0.8) continue

      let type: ResourceType = 'crystal'
      let amount = Math.floor(seededFloat(id + '_amt') * 3) + 2

      if (tags.leisure || tags.landuse === 'forest' || tags.landuse === 'grass' || tags.landuse === 'orchard' || tags.natural === 'water') {
        type = 'herb'
      } else if (tags.power || tags.amenity === 'university' || tags.amenity === 'research_institute') {
        type = 'energy'
      } else if (tags.natural === 'rock' || tags.landuse === 'quarry' || tags.natural === 'peak') {
        type = 'mineral'
      }

      const poiRareRoll = seededFloat(id + '_rare');
      if (poiRareRoll < 0.05) type = 'magic_crystal';
      else if (poiRareRoll < 0.10) type = 'super_mineral';

      resources.push({
        id, lat: elLat, lng: elLng, 
        type, amount,
        isCollected
      })
    }
  }

  // Save to cache
  const result = { monsters, resources };
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), content: result }));
  return result;
}

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

  const updateMarkers = useCallback((map: L.Map, currentSpawns: SpawnPoint[], currentResources: ResourceSpawn[], playerLat: number, playerLng: number, pLevel: number, hideMonsters: boolean, hideResources: boolean) => {
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
          if ((marker as any)._isNearby !== isNearby || (marker as any)._isLocked !== currentLocked) {
            marker.setIcon(makeMarkerIcon(s, isNearby, currentLocked))
            marker.setTooltipContent(makeTooltipHtml(s, pLevel))
            ;(marker as any)._isNearby = isNearby
            ;(marker as any)._isLocked = currentLocked
          }
        } else {
          const m = L.marker([s.lat, s.lng], { icon: makeMarkerIcon(s, isNearby, currentLocked) }).bindTooltip(makeTooltipHtml(s, pLevel), { direction: 'top', offset: [0, -12], className: 'monster-tooltip' }).addTo(map)
          ;(m as any)._isNearby = isNearby
          ;(m as any)._isLocked = currentLocked
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
          if ((marker as any)._isNearby !== isNearby) {
            marker.setIcon(makeResourceIcon(r.type, isNearby))
            ;(marker as any)._isNearby = isNearby
          }
        } else {
          const m = L.marker([r.lat, r.lng], { icon: makeResourceIcon(r.type, isNearby) }).bindTooltip(makeResourceTooltipHtml(r.type, r.amount), { direction: 'top', offset: [0, -5], className: 'resource-tooltip' }).addTo(map)
          ;(m as any)._isNearby = isNearby
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
    if (force && addToast) {
       addToast({ title: 'Skenování okolí', message: 'Hledám vzácné příšery a suroviny v tvém okolí...', type: 'info' });
    }
    
    try {
      const { monsters: poiMonsters, resources: poiResources } = await fetchPoiData(lat, lng, cooldownsRef.current, force)
      
      setSpawns(prev => {
        const commons = prev.filter(p => p.rarity === 'common')
        const poiMap = new Map<string, SpawnPoint>()
        // Zachovat POI z jiných oblastí, které už máme
        prev.filter(p => p.rarity !== 'common').forEach(p => poiMap.set(p.id, p))
        poiMonsters.forEach(p => poiMap.set(p.id, p))
        return [...commons, ...Array.from(poiMap.values())]
      })

      setResources(prev => {
        const randoms = prev.filter(r => !r.id.startsWith('poi_'))
        const poiMap = new Map<string, ResourceSpawn>()
        prev.filter(r => r.id.startsWith('poi_')).forEach(r => poiMap.set(r.id, r))
        poiResources.forEach(r => poiMap.set(r.id, r))
        return [...randoms, ...Array.from(poiMap.values())]
      })
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
    
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
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
          playerMarkerRef.current = L.marker([lat, lng], { icon: makePlayerIcon(), zIndexOffset: 1000 }).addTo(map)
          map.setView([lat, lng], 17)
        } else { playerMarkerRef.current.setLatLng([lat, lng]) }
        
        const cooldowns = loadCooldowns()
        const commonMonsters = generateCommonSpawns(lat, lng, cooldowns)
        const commonRes = generateResources(lat, lng, cooldowns)
        
        setSpawns(prev => {
          const pois = prev.filter(p => p.rarity !== 'common').map(p => ({ ...p, caught: isOnCooldown(cooldowns, p.id) }))
          return [...commonMonsters, ...pois]
        })
        
        setResources(prev => {
          const pois = prev.filter(r => r.id.startsWith('poi_')).map(r => ({ ...r, isCollected: isOnCooldown(cooldowns, r.id) }))
          return [...commonRes, ...pois]
        })

        if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
        overpassTimerRef.current = setTimeout(() => fetchPOI(lat, lng), 1500)
      }, () => setStatusMsg('GPS nedostupná'), { enableHighAccuracy: true })
    }
  }, [onDistanceUpdate])

  useEffect(() => {
    if (!playerPos || !mapRef.current) return
    updateMarkers(mapRef.current, spawns, resources, playerPos[0], playerPos[1], playerLevel, !showMonsters, !showResources)
    updateOtherPlayers(mapRef.current, nearbyPlayers)
    recalcNearby(playerPos[0], playerPos[1], spawns, resources)
  }, [spawns, resources, playerPos, playerLevel, nearbyPlayers, updateMarkers, updateOtherPlayers, recalcNearby, showMonsters, showResources])

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
          {loadingPoi && <RefreshCw size={12} className="text-blue-500 animate-spin" />}
          
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
                   <p className="text-purple-400 text-xs font-black uppercase mb-6 tracking-widest">Aeternum Runner (LVL {selectedOtherPlayer.level})</p>
                    <div className="grid grid-cols-2 gap-3 w-full">
                       <button onClick={() => { onStartTrade(selectedOtherPlayer.name, selectedOtherPlayer.id); setSelectedOtherPlayer(null) }} className="bg-purple-600 text-white font-black py-4 rounded-xl uppercase text-xs tracking-tighter">Vyměnit</button>
                       <button 
                         onClick={() => { 
                           onStartDuel?.(selectedOtherPlayer.name, selectedOtherPlayer.id); 
                           setSelectedOtherPlayer(null); 
                         }} 
                         className="bg-red-600 text-white font-black py-4 rounded-xl uppercase text-xs tracking-tighter"
                       >
                         Vyzvat
                       </button>
                       <button onClick={() => setSelectedOtherPlayer(null)} className="col-span-2 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl uppercase text-xs">Zavřít</button>
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
