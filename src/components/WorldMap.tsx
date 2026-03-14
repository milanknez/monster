import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { monsterDB } from '../data/monsters'
import type { Monster } from '../types'

// ── Leaflet default icon fix ──────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Typy ─────────────────────────────────────────────────────
type SpawnRarity = 'common' | 'rare' | 'epic'

interface SpawnPoint {
  id: string
  lat: number
  lng: number
  rarity: SpawnRarity
  monsterId: string
  level: number       // level příšery na tomto spawnu
  caught: boolean
}

// ── Konfigurace ───────────────────────────────────────────────
const CATCH_RADIUS_M      = 15    // max. vzdálenost pro chytání (m)
const COMMON_GRID_M       = 100   // krok mřížky pro common příšery (m)
const COMMON_RADIUS_CELLS = 8     // počet buněk od hráče
const OVERPASS_RADIUS_M   = 3000  // poloměr dotazu Overpass API (m)

// Výpočet úrovně hráče z počtu chycených příšer
// 1 úroveň za každé 3 chycené (minimum 1)
function getPlayerLevel(): number {
  try {
    const caught: Monster[] = JSON.parse(localStorage.getItem('monster_collector_caught') ?? '[]')
    return Math.max(1, Math.floor(caught.length / 3) + 1)
  } catch {
    return 1
  }
}

// ── Pomocné funkce ────────────────────────────────────────────

/** Haversine vzdálenost v metrech */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function metersToLatDeg(m: number) { return m / 111_320 }
function metersToLngDeg(m: number, lat: number) {
  return m / (111_320 * Math.cos(lat * Math.PI / 180))
}

/** Deterministický hash → číslo 0..1 */
function seededFloat(seed: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h >>> 0) / 0xFFFFFFFF
}

/** Vybere level příšery deterministicky – s realistickou distribucí */
function pickLevel(seed: string, rarity: SpawnRarity): number {
  const r = seededFloat(seed + '_lvl')
  if (rarity === 'common') return r < 0.40 ? 2 : 1   // 60 % Lv.1, 40 % Lv.2
  if (rarity === 'rare')   return 3 + Math.floor(r * 4)  // Lv. 3–6 rovnoměrně
  return 7 + Math.floor(r * 4)                         // Lv. 7–10 rovnoměrně (epic)
}

/** Vybere příšeru deterministicky z DB */
function pickMonster(seed: string, rarity: SpawnRarity): string {
  const pool = monsterDB.filter(m => {
    if (rarity === 'epic')  return m.rarity === 'Epická' || m.rarity === 'Legendární'
    if (rarity === 'rare')  return m.rarity === 'Vzácná'
    return m.rarity === 'Běžná' || m.rarity === 'Neobvyklá'
  })
  const arr = pool.length ? pool : monsterDB
  return arr[Math.floor(seededFloat(seed) * arr.length)].id
}

/** Generuj common spawn body v mřížce kolem hráče */
function generateCommonSpawns(playerLat: number, playerLng: number, caught: Set<string>): SpawnPoint[] {
  const spawns: SpawnPoint[] = []
  const latStep = metersToLatDeg(COMMON_GRID_M)
  const lngStep = metersToLngDeg(COMMON_GRID_M, playerLat)
  const baseLat = Math.round(playerLat / latStep) * latStep
  const baseLng = Math.round(playerLng / lngStep) * lngStep

  for (let dy = -COMMON_RADIUS_CELLS; dy <= COMMON_RADIUS_CELLS; dy++) {
    for (let dx = -COMMON_RADIUS_CELLS; dx <= COMMON_RADIUS_CELLS; dx++) {
      const lat = baseLat + dy * latStep
      const lng = baseLng + dx * lngStep

      // 25% šance na prázdnou buňku
      if (seededFloat(`skip_${lat.toFixed(6)}_${lng.toFixed(6)}`) < 0.25) continue

      // Jitter (každý je trochu posunutý, ne přesně na mřížce)
      const jLat = lat + (seededFloat(`jlat_${lat.toFixed(6)}_${lng.toFixed(6)}`) - 0.5) * latStep * 0.6
      const jLng = lng + (seededFloat(`jlng_${lat.toFixed(6)}_${lng.toFixed(6)}`) - 0.5) * lngStep * 0.6

      const id = `common_${lat.toFixed(6)}_${lng.toFixed(6)}`
      spawns.push({
        id,
        lat: jLat,
        lng: jLng,
        rarity: 'common',
        monsterId: pickMonster(id, 'common'),
        level: pickLevel(id, 'common'),
        caught: caught.has(id),
      })
    }
  }
  return spawns
}

// ── Overpass API ──────────────────────────────────────────────
async function fetchPoiSpawns(lat: number, lng: number, caught: Set<string>): Promise<SpawnPoint[]> {
  const query = `
    [out:json][timeout:20];
    (
      node["historic"~"monument|memorial|archaeological_site|ruins|city_gate|fort|wayside_cross|wayside_shrine"](around:${OVERPASS_RADIUS_M},${lat},${lng});
      node["tourism"~"museum|attraction|artwork|viewpoint"](around:${OVERPASS_RADIUS_M},${lat},${lng});
      node["historic"="castle"](around:${OVERPASS_RADIUS_M},${lat},${lng});
      way["historic"="castle"](around:${OVERPASS_RADIUS_M},${lat},${lng});
      way["historic"~"monument|memorial|archaeological_site|ruins"](around:${OVERPASS_RADIUS_M},${lat},${lng});
      way["tourism"~"museum|attraction"](around:${OVERPASS_RADIUS_M},${lat},${lng});
    );
    out center;
  `.trim()

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const json = await res.json()
  const spawns: SpawnPoint[] = []

  for (const el of json.elements ?? []) {
    const elLat: number = el.lat ?? el.center?.lat
    const elLng: number = el.lon ?? el.center?.lon
    if (!elLat || !elLng) continue

    const rarity: SpawnRarity = (el.tags?.historic === 'castle') ? 'epic' : 'rare'
    const id = `poi_${el.type}_${el.id}`

    spawns.push({
      id, lat: elLat, lng: elLng, rarity,
      monsterId: pickMonster(id, rarity),
      level: pickLevel(id, rarity),
      caught: caught.has(id),
    })
  }
  return spawns
}

// ── SVG silueta příšery (stejná pro všechny) ─────────────────
const SILHOUETTE_SVG = `
  <path d="M50 10 C35 10 25 20 25 32 C25 38 27 43 32 47
           L28 55 C26 60 30 65 35 63 L38 61
           C40 64 44 66 50 66 C56 66 60 64 62 61
           L65 63 C70 65 74 60 72 55 L68 47
           C73 43 75 38 75 32 C75 20 65 10 50 10 Z"
        fill="currentColor"/>
  <circle cx="40" cy="30" r="4" fill="rgba(0,0,0,0.5)"/>
  <circle cx="60" cy="30" r="4" fill="rgba(0,0,0,0.5)"/>
`

// ── Barvy dle rarity ──────────────────────────────────────────
const RARITY_COLORS: Record<SpawnRarity, { bg: string; border: string; glow: string; badge: string; label: string }> = {
  common: { bg: '#0f172a', border: '#475569', glow: '#64748b', badge: '#334155', label: '#94a3b8' },
  rare:   { bg: '#1e0a3c', border: '#9333ea', glow: '#a855f7', badge: '#4c1d95', label: '#d8b4fe' },
  epic:   { bg: '#1c0a00', border: '#ea580c', glow: '#f97316', badge: '#7c2d12', label: '#fed7aa' },
}

// ── Leaflet marker ikona ──────────────────────────────────────
function makeMarkerIcon(spawn: SpawnPoint, isNearby: boolean, isLocked: boolean): L.DivIcon {
  const c = RARITY_COLORS[spawn.rarity]
  const outerSize = spawn.rarity === 'epic' ? 48 : spawn.rarity === 'rare' ? 42 : 36
  const innerR = 32
  const lockOverlay = isLocked ? `
    <text x="50" y="58" text-anchor="middle" font-size="28" font-family="sans-serif" fill="#ef4444" opacity="0.9">🔒</text>
  ` : `
    <text x="50" y="60" text-anchor="middle" font-size="42" font-family="serif" font-weight="bold"
          fill="${c.label}" filter="url(#mg)">?</text>
  `
  const pulse = isNearby && !isLocked ? `
    <circle cx="50" cy="50" r="46" fill="none" stroke="${c.glow}" stroke-width="3" opacity="0.7">
      <animate attributeName="r" values="42;50;42" dur="1.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0.15;0.8" dur="1.2s" repeatCount="indefinite"/>
    </circle>` : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerSize}" height="${outerSize + 10}" viewBox="0 0 100 115">
    <defs>
      <filter id="mg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${pulse}
    <circle cx="50" cy="50" r="${innerR}" fill="${c.bg}" stroke="${c.border}" stroke-width="3.5" filter="url(#mg)"/>
    ${lockOverlay}
    <!-- Level badge -->
    <rect x="28" y="76" width="44" height="18" rx="9" fill="${c.badge}" stroke="${c.border}" stroke-width="1.5"/>
    <text x="50" y="89" text-anchor="middle" font-size="13" font-family="monospace" font-weight="bold" fill="${c.label}">Lv.${spawn.level}</text>
  </svg>`

  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [outerSize, outerSize + 10],
    iconAnchor: [outerSize / 2, outerSize / 2],
  })
}

// ── Tooltip HTML (silueta + level) ───────────────────────────
function makeTooltipHtml(spawn: SpawnPoint, playerLevel: number): string {
  const c = RARITY_COLORS[spawn.rarity]
  const locked = spawn.level > playerLevel
  const rarityLabel = spawn.rarity === 'epic' ? '🏰 Epická' : spawn.rarity === 'rare' ? '🏛 Vzácná' : '⚔️ Běžná'
  return `
    <div style="text-align:center;min-width:90px;">
      <svg width="48" height="52" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="42" r="38" fill="${c.bg}" stroke="${c.border}" stroke-width="3"/>
        <g style="color:${c.label}">${SILHOUETTE_SVG}</g>
      </svg>
      <div style="color:${c.label};font-size:13px;font-weight:800;margin-top:2px;">Lv. ${spawn.level}</div>
      <div style="color:#64748b;font-size:10px;">${rarityLabel}</div>
      ${locked ? `<div style="color:#ef4444;font-size:10px;margin-top:2px;">🔒 Vyžaduje Lv.${spawn.level}</div>` : ''}
    </div>`
}

function makePlayerIcon(): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100">
    <defs><filter id="pg"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle cx="50" cy="50" r="44" fill="rgba(13,185,242,0.1)" stroke="#0db9f2" stroke-width="2">
      <animate attributeName="r" values="38;46;38" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="50" cy="50" r="20" fill="#0db9f2" filter="url(#pg)"/>
    <circle cx="50" cy="50" r="10" fill="white"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
}

// ── Komponenta ────────────────────────────────────────────────
export const WorldMap = () => {
  const mapContainerRef  = useRef<HTMLDivElement>(null)
  const mapRef           = useRef<L.Map | null>(null)
  const playerMarkerRef  = useRef<L.Marker | null>(null)
  const markersRef       = useRef<Map<string, L.Marker>>(new Map())
  const watchIdRef       = useRef<number | null>(null)
  const overpassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPoiFetchRef  = useRef<{ lat: number; lng: number } | null>(null)

  const [playerPos, setPlayerPos]       = useState<[number, number] | null>(null)
  const [playerLevel, setPlayerLevel]   = useState<number>(getPlayerLevel)
  const [spawns, setSpawns]             = useState<SpawnPoint[]>([])
  const [caughtIds, setCaughtIds]       = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('map_caught_ids') ?? '[]')) }
    catch { return new Set() }
  })
  const [nearbySpawn, setNearbySpawn]   = useState<SpawnPoint | null>(null)
  const [catchResult, setCatchResult]   = useState<Monster | null>(null)
  const [levelBlocked, setLevelBlocked] = useState(false)
  const [loadingPoi, setLoadingPoi]     = useState(false)
  const [statusMsg, setStatusMsg]       = useState('Hledám polohu…')

  // ── Přepočítej "nearby" spawn ─────────────────────────────
  const recalcNearby = useCallback((lat: number, lng: number, currentSpawns: SpawnPoint[]) => {
    const nearby = currentSpawns
      .filter(s => !s.caught)
      .map(s => ({ s, dist: haversineM(lat, lng, s.lat, s.lng) }))
      .filter(({ dist }) => dist <= CATCH_RADIUS_M)
      .sort((a, b) => a.dist - b.dist)[0]
    setNearbySpawn(nearby?.s ?? null)
  }, [])

  // ── Aktualizuj markery na mapě ────────────────────────────
  const updateMarkers = useCallback((
    map: L.Map,
    currentSpawns: SpawnPoint[],
    playerLat: number,
    playerLng: number,
    pLevel: number,
  ) => {
    const existing = markersRef.current

    for (const [id, marker] of existing) {
      const spawn = currentSpawns.find(s => s.id === id)
      if (!spawn || spawn.caught) { marker.remove(); existing.delete(id) }
    }

    for (const spawn of currentSpawns) {
      if (spawn.caught) continue
      const dist     = haversineM(playerLat, playerLng, spawn.lat, spawn.lng)
      const isNearby = dist <= CATCH_RADIUS_M
      const isLocked = spawn.level > pLevel

      if (existing.has(spawn.id)) {
        existing.get(spawn.id)!.setIcon(makeMarkerIcon(spawn, isNearby, isLocked))
      } else {
        const marker = L.marker([spawn.lat, spawn.lng], {
          icon: makeMarkerIcon(spawn, isNearby, isLocked),
          zIndexOffset: spawn.rarity === 'epic' ? 200 : spawn.rarity === 'rare' ? 100 : 0,
        })
        marker.bindTooltip(makeTooltipHtml(spawn, pLevel), {
          direction: 'top',
          offset: [0, -12],
          className: 'monster-tooltip',
          opacity: 1,
        })
        marker.addTo(map)
        existing.set(spawn.id, marker)
      }
    }
  }, [])

  // ── Načti POI z Overpass (debounced) ─────────────────────
  const fetchPOI = useCallback(async (lat: number, lng: number, currentCaught: Set<string>) => {
    const last = lastPoiFetchRef.current
    if (last && haversineM(lat, lng, last.lat, last.lng) < 500) return
    lastPoiFetchRef.current = { lat, lng }
    setLoadingPoi(true)
    try {
      const poiSpawns = await fetchPoiSpawns(lat, lng, currentCaught)
      setSpawns(prev => [...prev.filter(s => s.rarity === 'common'), ...poiSpawns])
    } catch (e) {
      console.warn('Overpass fetch failed:', e)
    } finally {
      setLoadingPoi(false)
    }
  }, [])

  // ── Inicializace mapy ─────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [50.0755, 14.4378],
      zoom: 15,
      zoomControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)
    mapRef.current = map

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          setPlayerPos([lat, lng])
          setStatusMsg('')

          if (!playerMarkerRef.current) {
            playerMarkerRef.current = L.marker([lat, lng], { icon: makePlayerIcon(), zIndexOffset: 1000 }).addTo(map)
            map.setView([lat, lng], 16)
          } else {
            playerMarkerRef.current.setLatLng([lat, lng])
          }

          setSpawns(prev => {
            const caughtSet  = new Set(prev.filter(s => s.caught).map(s => s.id))
            const commons    = generateCommonSpawns(lat, lng, caughtSet)
            const pois       = prev.filter(s => s.rarity !== 'common')
            const merged     = [...commons, ...pois].map(s => ({
              ...s,
              caught: caughtSet.has(s.id) || prev.find(p => p.id === s.id)?.caught || false,
            }))
            recalcNearby(lat, lng, merged)
            return merged
          })

          if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
          overpassTimerRef.current = setTimeout(() => {
            setCaughtIds(c => { fetchPOI(lat, lng, c); return c })
          }, 2000)
        },
        (err) => {
          console.warn('Geo error:', err.message)
          setStatusMsg('Poloha nedostupná – zkontroluj oprávnění')
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      )
    } else {
      setStatusMsg('Geolokace není dostupná')
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
      map.remove()
      mapRef.current = null
      playerMarkerRef.current = null
      markersRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Aktualizuj markery při změně spawns / playerPos ──────
  useEffect(() => {
    if (!mapRef.current || !playerPos) return
    updateMarkers(mapRef.current, spawns, playerPos[0], playerPos[1], playerLevel)
    recalcNearby(playerPos[0], playerPos[1], spawns)
  }, [spawns, playerPos, playerLevel, updateMarkers, recalcNearby])

  // ── Center na hráče ───────────────────────────────────────
  const handleCenter = () => {
    if (playerMarkerRef.current && mapRef.current)
      mapRef.current.setView(playerMarkerRef.current.getLatLng(), 16, { animate: true })
  }

  // ── Chytání ───────────────────────────────────────────────
  const handleCatch = () => {
    if (!nearbySpawn) return

    // Level check
    if (nearbySpawn.level > playerLevel) {
      setLevelBlocked(true)
      setTimeout(() => setLevelBlocked(false), 2500)
      return
    }

    const dbMonster = monsterDB.find(m => m.id === nearbySpawn.monsterId)
      ?? monsterDB[Math.floor(seededFloat(nearbySpawn.id) * monsterDB.length)]

    const caught: Monster = {
      ...dbMonster,
      level: nearbySpawn.level,
      image: `/monsters/${dbMonster.id}.png`,
    }

    // Uložení do kolekce
    const existing: Monster[] = JSON.parse(localStorage.getItem('monster_collector_caught') ?? '[]')
    if (!existing.some(m => m.id === caught.id)) {
      localStorage.setItem('monster_collector_caught', JSON.stringify([caught, ...existing]))
    }

    // Označ jako chycená
    const newCaught = new Set(caughtIds)
    newCaught.add(nearbySpawn.id)
    setCaughtIds(newCaught)
    localStorage.setItem('map_caught_ids', JSON.stringify([...newCaught]))

    setSpawns(prev => prev.map(s => s.id === nearbySpawn.id ? { ...s, caught: true } : s))
    setNearbySpawn(null)
    setCatchResult(caught)

    // Přepočítej level hráče po chycení
    setPlayerLevel(getPlayerLevel())
  }

  const c = nearbySpawn ? RARITY_COLORS[nearbySpawn.rarity] : null

  // ── Render ────────────────────────────────────────────────
  return (
    <motion.div
      key="world-map"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="relative w-full flex flex-col"
      style={{ height: 'calc(100vh - 176px)', minHeight: 480 }}
    >
      {/* Info lišta */}
      <div className="px-4 pt-2 pb-2 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Průzkum světa</p>
          <p className="text-slate-500 text-[10px] mt-0.5">
            {loadingPoi ? '⏳ Načítám místní POI…'
              : statusMsg || `${spawns.filter(s => !s.caught).length} příšer v okolí`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Hráčský level badge */}
          <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 text-primary text-[10px] font-black px-2.5 py-1 rounded-full">
            ⚡ Lv.{playerLevel}
          </div>
          <button
            onClick={handleCenter}
            className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full hover:border-primary/40 hover:text-primary transition-all active:scale-95"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            </svg>
            Moje poloha
          </button>
        </div>
      </div>

      {/* Mapa */}
      <div className="relative flex-1 mx-3 rounded-2xl overflow-hidden border border-slate-700/60 shadow-[0_0_30px_rgba(13,185,242,0.08)]">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-primary/10" />
        <div className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary/50 rounded-tl-lg" />
        <div className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary/50 rounded-tr-lg" />
        <div className="pointer-events-none absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary/50 rounded-bl-lg" />
        <div className="pointer-events-none absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary/50 rounded-br-lg" />

        {/* Legenda */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-black/75 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
            <span className="text-[10px] text-slate-400">Běžná Lv.1–2</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span className="text-[10px] text-purple-400">Vzácná Lv.3–6</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span className="text-[10px] text-orange-400">Epická Lv.7–10</span>
          </div>
        </div>
      </div>

      {/* Tlačítko "Chytit" */}
      <AnimatePresence>
        {nearbySpawn && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="absolute bottom-4 left-4 right-4"
          >
            {levelBlocked ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full py-4 rounded-2xl bg-red-950 border border-red-500/50 text-red-400 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2"
              >
                🔒 Potřebuješ Lv.{nearbySpawn.level} — jsi Lv.{playerLevel}
              </motion.div>
            ) : (
              <button
                onClick={handleCatch}
                style={{
                  background: nearbySpawn.rarity === 'epic'
                    ? 'linear-gradient(135deg, #c2410c, #f97316)'
                    : nearbySpawn.rarity === 'rare'
                    ? 'linear-gradient(135deg, #7e22ce, #a855f7)'
                    : 'linear-gradient(135deg, #0891b2, #0db9f2)',
                  boxShadow: `0 8px 30px ${c?.glow}55`,
                }}
                className="w-full py-4 rounded-2xl font-black text-base text-white uppercase tracking-wide flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <span className="text-xl">⚡</span>
                Chytit {nearbySpawn.rarity === 'epic' ? 'Epickou' : nearbySpawn.rarity === 'rare' ? 'Vzácnou' : ''} příšeru
                <span className="text-sm opacity-75 font-bold normal-case">
                  Lv.{nearbySpawn.level}
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: výsledek chytání */}
      <AnimatePresence>
        {catchResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 rounded-2xl mx-3"
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.7, y: 40 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="bg-background-dark border border-primary/30 rounded-3xl p-6 mx-4 max-w-xs w-full text-center shadow-[0_0_60px_rgba(13,185,242,0.3)]"
            >
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-primary font-black text-lg uppercase tracking-wider mb-1">Chyceno!</p>
              <img
                src={catchResult.image}
                alt={catchResult.name}
                className="w-28 h-28 object-contain mx-auto my-3 drop-shadow-lg"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <p className="text-white font-bold text-xl">{catchResult.name}</p>
              <p className="text-slate-400 text-xs mt-1">{catchResult.type} · Lv. {catchResult.level}</p>
              <p className="text-slate-500 text-xs mt-2 line-clamp-3">{catchResult.description}</p>
              <div className="mt-3 text-primary/80 text-xs font-bold">
                ⚡ Tvůj level: {playerLevel}
              </div>
              <button
                onClick={() => setCatchResult(null)}
                className="mt-4 w-full py-3 rounded-xl bg-primary text-background-dark font-black uppercase tracking-wide hover:bg-primary/80 transition-all active:scale-95"
              >
                Pokračovat v průzkumu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
