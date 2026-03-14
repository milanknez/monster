import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { monsterDB } from '../data/monsters'
import type { Monster } from '../types'
import { Heart, MapPin } from 'lucide-react'

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
type SpawnRarity = 'common' | 'rare' | 'epic'

interface SpawnPoint {
  id: string
  lat: number
  lng: number
  rarity: SpawnRarity
  monsterId: string
  level: number
  caught: boolean
}

interface WorldMapProps {
  onCatch: (monster: Monster) => void
  playerHP: number
  onConsumeHP: (amount: number) => void
  isInteractionBlocked?: boolean
}

// ── Konfigurace (tvoje testovací hodnoty) ──────────────────────
const CATCH_RADIUS_M = 15 // TESTOVACÍ HODNOTA
const COMMON_GRID_M = 100
const COMMON_RADIUS_CELLS = 8
const OVERPASS_RADIUS_M = 3000
const RESPAWN_COOLDOWN_MS = 5 * 60 * 1000

// ── Pomocné funkce pro HP cost ───────────────────────────────
const calculateHPCost = (level: number, rarity: SpawnRarity) => {
  const base = 25
  const rarityBonus = rarity === 'epic' ? 15 : rarity === 'rare' ? 7 : 0
  return base + (level * 2) + rarityBonus
}

// ── Cooldown helpers ──────────────────────────────────────────
type Cooldowns = Record<string, number>

function loadCooldowns(): Cooldowns {
  try { return JSON.parse(localStorage.getItem('map_cooldowns') ?? '{}') }
  catch { return {} }
}

function isOnCooldown(cooldowns: Cooldowns, id: string): boolean {
  return Date.now() < (cooldowns[id] ?? 0)
}

function getPlayerLevelFromStorage(): number {
  try {
    const caught: Monster[] = JSON.parse(localStorage.getItem('monster_collector_caught') ?? '[]')
    return Math.max(1, Math.floor(caught.length / 3) + 1)
  } catch { return 1 }
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!isFinite(lat1) || !isFinite(lng1) || !isFinite(lat2) || !isFinite(lng2)) return 999999
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function metersToLatDeg(m: number) { return m / 111_320 }
function metersToLngDeg(m: number, lat: number) {
  const cosLat = Math.cos(lat * Math.PI / 180)
  return m / (111_320 * (Math.abs(cosLat) < 0.00001 ? 0.00001 : cosLat))
}

function seededFloat(seed: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0
  }
  return (h >>> 0) / 0xFFFFFFFF
}

function pickLevel(seed: string, rarity: SpawnRarity): number {
  const r = seededFloat(seed + '_lvl')
  if (rarity === 'common') return r < 0.40 ? 2 : 1
  if (rarity === 'rare') return 3 + Math.floor(r * 4)
  return 7 + Math.floor(r * 4)
}

function pickMonster(seed: string, rarity: SpawnRarity): string {
  const pool = monsterDB.filter(m => {
    if (rarity === 'epic') return m.rarity === 'Epická' || m.rarity === 'Legendární'
    if (rarity === 'rare') return m.rarity === 'Vzácná'
    return m.rarity === 'Běžná' || m.rarity === 'Neobvyklá'
  })
  const arr = pool.length ? pool : monsterDB
  return arr[Math.floor(seededFloat(seed) * arr.length)].id
}

function generateCommonSpawns(playerLat: number, playerLng: number, cooldowns: Cooldowns): SpawnPoint[] {
  if (!isFinite(playerLat) || !isFinite(playerLng)) return []
  const spawns: SpawnPoint[] = []
  const latStep = metersToLatDeg(COMMON_GRID_M)
  const lngStep = metersToLngDeg(COMMON_GRID_M, playerLat)

  const baseLat = Math.round(playerLat / latStep) * latStep
  const baseLng = Math.round(playerLng / lngStep) * lngStep

  for (let dy = -COMMON_RADIUS_CELLS; dy <= COMMON_RADIUS_CELLS; dy++) {
    for (let dx = -COMMON_RADIUS_CELLS; dx <= COMMON_RADIUS_CELLS; dx++) {
      const lat = baseLat + dy * latStep
      const lng = baseLng + dx * lngStep
      if (seededFloat(`skip_${lat.toFixed(6)}_${lng.toFixed(6)}`) < 0.25) continue
      const jLat = lat + (seededFloat(`jlat_${lat.toFixed(6)}_${lng.toFixed(6)}`) - 0.5) * latStep * 0.6
      const jLng = lng + (seededFloat(`jlng_${lat.toFixed(6)}_${lng.toFixed(6)}`) - 0.5) * lngStep * 0.6
      const id = `common_${lat.toFixed(6)}_${lng.toFixed(6)}`
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
  const query = `[out:json][timeout:20];(node["historic"~"monument|memorial|archaeological_site|ruins|city_gate|fort|wayside_cross|wayside_shrine"](around:${OVERPASS_RADIUS_M},${lat},${lng});node["tourism"~"museum|attraction|artwork|viewpoint"](around:${OVERPASS_RADIUS_M},${lat},${lng});node["historic"="castle"](around:${OVERPASS_RADIUS_M},${lat},${lng});way["historic"="castle"](around:${OVERPASS_RADIUS_M},${lat},${lng});way["historic"~"monument|memorial|archaeological_site|ruins"](around:${OVERPASS_RADIUS_M},${lat},${lng});way["tourism"~"museum|attraction"](around:${OVERPASS_RADIUS_M},${lat},${lng}););out center;`.trim()
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const json = await res.json()
  const spawns: SpawnPoint[] = []

  for (const el of json.elements ?? []) {
    const elLat: number = el.lat ?? el.center?.lat
    const elLng: number = el.lon ?? el.center?.lon
    if (elLat === undefined || elLng === undefined || !isFinite(elLat) || !isFinite(elLng)) continue
    const rarity: SpawnRarity = el.tags?.historic === 'castle' ? 'epic' : 'rare'
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

const RARITY_COLORS: Record<SpawnRarity, { bg: string; border: string; glow: string; badge: string; label: string }> = {
  common: { bg: '#0f172a', border: '#475569', glow: '#64748b', badge: '#334155', label: '#94a3b8' },
  rare: { bg: '#1e0a3c', border: '#9333ea', glow: '#a855f7', badge: '#4c1d95', label: '#d8b4fe' },
  epic: { bg: '#1c0a00', border: '#ea580c', glow: '#f97316', badge: '#7c2d12', label: '#fed7aa' },
}

const SILHOUETTE_SVG = `<path d="M50 10 C35 10 25 20 25 32 C25 38 27 43 32 47 L28 55 C26 60 30 65 35 63 L38 61 C40 64 44 66 50 66 C56 66 60 64 62 61 L65 63 C70 65 74 60 72 55 L68 47 C73 43 75 38 75 32 C75 20 65 10 50 10 Z" fill="currentColor"/><circle cx="40" cy="30" r="4" fill="rgba(0,0,0,0.5)"/><circle cx="60" cy="30" r="4" fill="rgba(0,0,0,0.5)"/>`

function makeMarkerIcon(spawn: SpawnPoint, isNearby: boolean, isLocked: boolean): L.DivIcon {
  const c = RARITY_COLORS[spawn.rarity]
  const outerSize = spawn.rarity === 'epic' ? 48 : spawn.rarity === 'rare' ? 42 : 36
  const innerR = 32
  const lockOverlay = isLocked
    ? `<text x="50" y="58" text-anchor="middle" font-size="28" fill="#ef4444" opacity="0.9">🔒</text>`
    : `<text x="50" y="60" text-anchor="middle" font-size="42" font-weight="bold" fill="${c.label}" filter="url(#mg)">?</text>`
  const pulse = isNearby && !isLocked ? `<circle cx="50" cy="50" r="46" fill="none" stroke="${c.glow}" stroke-width="3" opacity="0.7"><animate attributeName="r" values="42;50;42" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0.15;0.8" dur="1.2s" repeatCount="indefinite"/></circle>` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerSize}" height="${outerSize + 10}" viewBox="0 0 100 115"><defs><filter id="mg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${pulse}<circle cx="50" cy="50" r="${innerR}" fill="${c.bg}" stroke="${c.border}" stroke-width="3.5" filter="url(#mg)"/>${lockOverlay}<rect x="28" y="76" width="44" height="18" rx="9" fill="${c.badge}" stroke="${c.border}" stroke-width="1.5"/><text x="50" y="89" text-anchor="middle" font-size="13" font-weight="bold" fill="${c.label}">Lv.${spawn.level}</text></svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [outerSize, outerSize + 10], iconAnchor: [outerSize / 2, outerSize / 2] })
}

function makeTooltipHtml(spawn: SpawnPoint, playerLevel: number): string {
  const c = RARITY_COLORS[spawn.rarity]
  const locked = spawn.level > playerLevel
  const rarityLabel = spawn.rarity === 'epic' ? '🏰 Epická' : spawn.rarity === 'rare' ? '🏛 Vzácná' : '⚔️ Běžná'
  const energyCost = calculateHPCost(spawn.level, spawn.rarity)
  return `<div style="text-align:center;min-width:90px;"><svg width="48" height="52" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="42" r="38" fill="${c.bg}" stroke="${c.border}" stroke-width="3"/><g style="color:${c.label}">${SILHOUETTE_SVG}</g></svg><div style="color:${c.label};font-size:13px;font-weight:800;margin-top:2px;">Lv. ${spawn.level}</div><div style="color:#64748b;font-size:10px;">${rarityLabel}</div><div style="color:#ef4444;font-size:9px;margin-top:3px;font-weight:bold;">⚡ -${energyCost}% ENERGIE</div>${locked ? `<div style="color:#ef4444;font-size:10px;margin-top:2px;">🔒 Vyžaduje Lv.${spawn.level}</div>` : ''}</div>`
}

function makePlayerIcon(): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100"><defs><filter id="pg"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="50" cy="50" r="44" fill="rgba(13,185,242,0.1)" stroke="#0db9f2" stroke-width="2"><animate attributeName="r" values="38;46;38" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/></circle><circle cx="50" cy="50" r="20" fill="#0db9f2" filter="url(#pg)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
}

export const WorldMap = ({ onCatch, playerHP, onConsumeHP, isInteractionBlocked }: WorldMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const playerMarkerRef = useRef<L.Marker | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const watchIdRef = useRef<number | null>(null)
  const overpassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPoiFetchRef = useRef<{ lat: number; lng: number } | null>(null)
  const cooldownsRef = useRef<Cooldowns>(loadCooldowns())

  const [playerPos, setPlayerPos] = useState<[number, number] | null>(null)
  const [playerLevel, setPlayerLevel] = useState<number>(getPlayerLevelFromStorage)
  const [spawns, setSpawns] = useState<SpawnPoint[]>([])
  const [nearbySpawn, setNearbySpawn] = useState<SpawnPoint | null>(null)
  const [levelBlocked, setLevelBlocked] = useState(false)
  const [hpBlocked, setHpBlocked] = useState(false)
  const [loadingPoi, setLoadingPoi] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Hledám polohu…')

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
      if (existing.has(spawn.id)) { existing.get(spawn.id)!.setIcon(makeMarkerIcon(spawn, isNearby, isLocked)) } else {
        const marker = L.marker([spawn.lat, spawn.lng], { icon: makeMarkerIcon(spawn, isNearby, isLocked), zIndexOffset: spawn.rarity === 'epic' ? 200 : spawn.rarity === 'rare' ? 100 : 0 })
        marker.bindTooltip(makeTooltipHtml(spawn, pLevel), { direction: 'top', offset: [0, -12], className: 'monster-tooltip', opacity: 1 })
        marker.addTo(map); existing.set(spawn.id, marker)
      }
    }
  }, [])

  const fetchPOI = useCallback(async (lat: number, lng: number) => {
    if (!isFinite(lat) || !isFinite(lng)) return
    const last = lastPoiFetchRef.current
    if (last && haversineM(lat, lng, last.lat, last.lng) < 500) return
    lastPoiFetchRef.current = { lat, lng }; setLoadingPoi(true)
    try {
      const poiSpawns = await fetchPoiSpawns(lat, lng, cooldownsRef.current)
      setSpawns(prev => [...prev.filter(s => s.rarity === 'common'), ...poiSpawns])
    } catch (e) { console.warn('Overpass fetch failed:', e) } finally { setLoadingPoi(false) }
  }, [])

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = L.map(mapContainerRef.current, { center: [50.0755, 14.4378], zoom: 16, zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map); mapRef.current = map
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (!isFinite(lat) || !isFinite(lng)) return
        setPlayerPos([lat, lng]); setStatusMsg('')
        if (!playerMarkerRef.current) {
          playerMarkerRef.current = L.marker([lat, lng], { icon: makePlayerIcon(), zIndexOffset: 1000 }).addTo(map)
          map.setView([lat, lng], 16)
        } else { playerMarkerRef.current.setLatLng([lat, lng]) }
        setSpawns(prev => {
          const commons = generateCommonSpawns(lat, lng, cooldownsRef.current)
          const pois = prev.filter(s => s.rarity !== 'common').map(s => ({ ...s, caught: isOnCooldown(cooldownsRef.current, s.id) }))
          const merged = [...commons, ...pois]
          recalcNearby(lat, lng, merged) // OKAMŽITÝ PŘEPOČET PŘI POHYBU
          return merged
        })
        if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
        overpassTimerRef.current = setTimeout(() => fetchPOI(lat, lng), 2000)
      }, (err) => { setStatusMsg(err.code === 1 ? 'Povol GPS polohu' : 'Poloha nedostupná') }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 })
    } else { setStatusMsg('Geolokace není dostupná') }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
      map.remove(); mapRef.current = null; playerMarkerRef.current = null; markersRef.current.clear()
    }
  }, [recalcNearby, fetchPOI])

  useEffect(() => {
    if (!playerPos || !isFinite(playerPos[0])) return
    recalcNearby(playerPos[0], playerPos[1], spawns)
    if (mapRef.current) { updateMarkers(mapRef.current, spawns, playerPos[0], playerPos[1], playerLevel) }
  }, [spawns, playerPos, playerLevel, updateMarkers, recalcNearby])

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
    setPlayerLevel(getPlayerLevelFromStorage())
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 176px)' }}>
      {/* Info lišta */}
      <div className="px-4 py-2 flex items-center justify-between shrink-0 bg-background-dark/50 backdrop-blur-sm z-50">
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black">Průzkum světa</p>
          <p className="text-slate-500 text-[9px] font-bold">
            {statusMsg || `${spawns.filter(s => !s.caught).length} příšer v sektoru`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
            <Heart size={10} className="text-red-500" fill="currentColor" />
            <span className="text-[10px] font-black text-red-500">{Math.round(playerHP)}%</span>
          </div>
          <button onClick={() => mapRef.current && playerMarkerRef.current && mapRef.current.setView(playerMarkerRef.current.getLatLng(), 17)} className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black px-3 py-1.5 rounded-full active:scale-95 transition-transform">🛰️ POLOHA</button>
        </div>
      </div>

      {/* Kontejner mapy */}
      <div className="flex-1 relative m-3 mt-1 rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl isolate">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Legenda (uvnitř mapy) */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-black/80 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/5 z-40 pointer-events-none">
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /><span className="text-[8px] font-bold text-slate-400 uppercase">Běžná</span></div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /><span className="text-[8px] font-bold text-purple-400 uppercase">Vzácná</span></div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /><span className="text-[8px] font-bold text-orange-400 uppercase">Epická</span></div>
        </div>

        {/* Debug info - jen pro testování radiusu */}
        {CATCH_RADIUS_M > 100 && (
          <div className="absolute top-2 left-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded px-2 py-1 text-[8px] font-black text-primary z-40 pointer-events-none uppercase">
            Radius: {CATCH_RADIUS_M}m | {nearbySpawn ? 'Máš cíl!' : 'Hledám...'}
          </div>
        )}
      </div>

      {/* Tlačítko - teď mimo kontejner mapy pro jistotu z-indexu */}
      <AnimatePresence>
        {nearbySpawn && !isInteractionBlocked && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-6 left-6 right-6 z-[1001]"
          >
            {levelBlocked ? (
              <div className="w-full py-4 rounded-2xl bg-red-950 border border-red-500 text-red-100 font-extrabold text-xs text-center shadow-2xl">🔒 POTŘEBUJEŠ ÚROVEŇ {nearbySpawn.level}</div>
            ) : hpBlocked ? (
              <div className="w-full py-4 rounded-2xl bg-red-950 border border-red-500 text-red-100 font-extrabold text-xs text-center shadow-2xl">🔋 VYČERPÁNÍ! ({currentEnergyCost}% ENERGIE)</div>
            ) : (
              <button
                onClick={handleCatch}
                style={{
                  background: nearbySpawn.rarity === 'epic' ? 'linear-gradient(135deg, #c2410c, #f97316)' :
                    nearbySpawn.rarity === 'rare' ? 'linear-gradient(135deg, #7e22ce, #a855f7)' :
                      'linear-gradient(135deg, #0891b2, #0db9f2)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
                }}
                className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex flex-col items-center justify-center transition-all active:scale-95 border-b-4 border-black/20"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="animate-bounce" />
                  <span className="text-sm">DETEKCE: LEVEL {nearbySpawn.level}</span>
                </div>
                <div className="text-[9px] font-bold opacity-90 mt-1 flex items-center gap-1">
                  <Heart size={8} fill="currentColor" /> SPOTŘEBA {currentEnergyCost}% ENERGIE
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
