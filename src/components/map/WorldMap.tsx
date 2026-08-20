import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, Sword, Shield, Zap, Package, X, Compass, Crosshair, Users, RefreshCw, Battery, Heart, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { monsterDB } from '../../data/monsters'
import type { Monster, SpawnPoint, SpawnRarity, ResourceType, ResourceSpawn, Cooldowns, NearbyPlayer } from '../../types'
import { cn, getLoc } from '../../utils'
import { syncPlayerToFirebase, watchNearbyPlayers } from '../../lib/firebase'
import { useGameSound } from '../../data/sounds'

import {
  haversineM,
  makeMarkerIcon,
  makeTooltipHtml,
  makePlayerIcon,
  makeOtherPlayerIcon,
  makeResourceIcon,
  makeResourceTooltipHtml,
  RARITY_COLORS,
  RARITY_SCORE,
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

// ── IndexedDB Map Tile Cache Helper ─────────────────────────────
const TILE_DB_NAME = 'monstero-tile-cache';
const TILE_STORE_NAME = 'tiles';

function openTileDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TILE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(TILE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getTileFromIndexedDb(key: string): Promise<string | null> {
  return openTileDb()
    .then(db => {
      return new Promise<string | null>((resolve) => {
        const transaction = db.transaction(TILE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(TILE_STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    })
    .catch(() => null);
}

function saveTileToIndexedDb(key: string, base64Data: string): Promise<void> {
  return openTileDb()
    .then(db => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(TILE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(TILE_STORE_NAME);
        const request = store.put(base64Data, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    })
    .catch(err => {
      console.warn("Failed to cache tile in IndexedDB:", err);
    });
}

// ── Custom Leaflet layer with automatic IndexedDB caching ──────
const CachedTileLayer = L.TileLayer.extend({
  createTile: function (coords: any, done: any) {
    const tile = document.createElement('img');
    L.DomEvent.on(tile, 'load', L.Util.bind((this as any)._tileOnLoad, this, done, tile));
    L.DomEvent.on(tile, 'error', L.Util.bind((this as any)._tileOnError, this, done, tile));

    if ((this as any).options.crossOrigin || (this as any).options.crossOrigin === '') {
      tile.crossOrigin = (this as any).options.crossOrigin === true ? '' : (this as any).options.crossOrigin;
    }

    tile.alt = '';
    tile.setAttribute('role', 'presentation');

    const url = (this as any).getTileUrl(coords);
    const cacheKey = `${coords.z}_${coords.x}_${coords.y}`;

    getTileFromIndexedDb(cacheKey).then(cachedData => {
      if (cachedData) {
        tile.src = cachedData;
      } else {
        fetch(url)
          .then(res => res.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = reader.result as string;
              tile.src = base64Data;
              saveTileToIndexedDb(cacheKey, base64Data);
            };
            reader.readAsDataURL(blob);
          })
          .catch(() => {
            tile.src = url;
          });
      }
    });

    return tile;
  }
});

// ── Typy ─────────────────────────────────────────────────────
// NearbyPlayer interface is now imported from '../../types'

export interface WorldMapProps {
  onCatch: (monster: Monster, spawnId?: string) => void
  onStartTrade: (targetPlayerName?: string, targetUid?: string) => void
  onStartDuel: (targetPlayerName?: string, targetUid?: string) => void
  tradeSignal?: string | null
  onBleSignal?: (type: string, targetName: string, fromName: string, data: string) => void
  playerHP: number
  onConsumeHP: (amount: number) => void
  onDistanceUpdate: (lat: number, lng: number, meters: number) => void
  isInteractionBlocked?: boolean
  caughtMonsters: Monster[]
  initialPosition?: { lat: number, lng: number } | null
  playerName: string
  playerUid: string
  email?: string | null
  avatarStyle: string
  avatarSeed: string
  playerLevel: number
  onGather: (type: ResourceType, amount: number) => void
  activeMonster: Monster | null
  addToast?: (toast: { title: string; message: string; type: 'success' | 'info' | 'error' | 'boost' }) => void
  ignoreSpeedLimit?: boolean
  isBatterySaver?: boolean
  graphicsQuality?: 'low' | 'high'
  mapTheme?: 'day' | 'night' | 'auto'
  spawnRadius?: number
  pvpWins?: number
  pvpLosses?: number
  onOpenDungeon?: (dungeon: DungeonSpawnPoint) => void
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
  playerUid,
  email,
  avatarStyle,
  avatarSeed,
  playerLevel,
  caughtMonsters,
  playerHP,
  onGather,
  onStartDuel,
  activeMonster,
  addToast,
  ignoreSpeedLimit = false,
  isBatterySaver = false,
  graphicsQuality = 'high',
  initialPosition = null,
  mapTheme = 'auto',
  spawnRadius = 1000,
  pvpWins = 0,
  pvpLosses = 0,
  onOpenDungeon
}, ref) => {

  const { t, i18n } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const playerMarkerRef = useRef<L.Marker | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const resourceMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const otherPlayersMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const dungeonMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const [dungeons, setDungeons] = useState<DungeonSpawnPoint[]>([])
  const watchIdRef = useRef<number | null>(null)
  const overpassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPoiFetchRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastPosRef = useRef<[number, number] | null>(null)
  const lastPosTimeRef = useRef<number | null>(null)
  const cooldownsRef = useRef<Cooldowns>(loadCooldowns())
  const autoCenterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInternalMoveRef = useRef(false)
  const isStoppingRef = useRef(false)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const speedViolationCountRef = useRef(0)
  const detectedMonstersRef = useRef<Set<string>>(new Set())

  const { playNotification } = useGameSound()

  const [playerPos, setPlayerPos] = useState<[number, number] | null>(initialPosition ? [initialPosition.lat, initialPosition.lng] : null)
  const [spawns, setSpawns] = useState<SpawnPoint[]>([])
  const [resources, setResources] = useState<ResourceSpawn[]>([])
  const [levelBlocked, setLevelBlocked] = useState(false)
  const [energyBlocked, setEnergyBlocked] = useState(false)
  const [showMonsters, setShowMonsters] = useState(true)
  const [showResources, setShowResources] = useState(true)
  const [loadingPoi, setLoadingPoi] = useState(false)

  function makeDungeonIcon(type: 'station' | 'park' | 'square', title: string, recommendedLevel: number, scale = 1.0) {
    const iconEmoji = type === 'station' ? '🪨' : (type === 'park' ? '🌋' : '💀');
    const bgGradient = type === 'station' ? 'from-slate-700 to-zinc-900' : (type === 'park' ? 'from-orange-700 to-amber-900' : 'from-purple-800 to-slate-950');
    const borderColor = type === 'station' ? 'border-slate-400' : (type === 'park' ? 'border-orange-500' : 'border-purple-400');

    const html = `
      <div style="transform: scale(${scale}); transform-origin: bottom center;" class="relative group cursor-pointer flex flex-col items-center">
        <div class="relative w-7.5 h-7.5 rounded-xl bg-gradient-to-br ${bgGradient} border-2 ${borderColor} shadow-md flex items-center justify-center transition-transform group-hover:scale-110">
          <span class="text-xs animate-pulse">${iconEmoji}</span>
        </div>
        <div class="mt-0.5 px-1.5 py-0.2 bg-black/90 backdrop-blur-md border border-white/10 rounded text-[8px] font-bold text-amber-300 whitespace-nowrap shadow-md">
          Lv.${recommendedLevel}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'dungeon-marker-icon',
      iconSize: [30 * scale, 40 * scale],
      iconAnchor: [15 * scale, 32 * scale]
    });
  }
  const [statusMsg, setStatusMsg] = useState(initialPosition ? '' : t('map.searching'))
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([])
  const [firebasePlayers, setFirebasePlayers] = useState<NearbyPlayer[]>([])
  const [selectedOtherPlayer, setSelectedOtherPlayer] = useState<NearbyPlayer | null>(null)
  const [buildings, setBuildings] = useState<{ lat: number, lng: number }[]>([])
  const buildingsRef = useRef<{ lat: number, lng: number }[]>([])
  const [isAutoCenter, setIsAutoCenter] = useState(true)
  const isAutoCenterRef = useRef(isAutoCenter)
  const [isTooFast, setIsTooFast] = useState(false)
  const [visibleRarities, setVisibleRarities] = useState<Set<SpawnRarity>>(new Set(['common', 'rare', 'epic', 'legendary']))
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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

  const nearbySpawn = useMemo(() => {
    if (!playerPos) return null;
    const nearby = spawns
      .filter(s => !s.caught && isFinite(s.lat) && isFinite(s.lng) && visibleRarities.has(s.rarity))
      .map(s => ({ s, dist: haversineM(playerPos[0], playerPos[1], s.lat, s.lng) }))
      .filter(({ dist }) => dist <= CATCH_RADIUS_M)
      .sort((a, b) => a.dist - b.dist)[0];
    return nearby?.s ?? null;
  }, [playerPos, spawns, visibleRarities]);

  const nearbyResource = useMemo(() => {
    if (!playerPos) return null;
    const nearby = resources
      .filter(r => !r.isCollected && isFinite(r.lat) && isFinite(r.lng))
      .map(r => ({ r, dist: haversineM(playerPos[0], playerPos[1], r.lat, r.lng) }))
      .filter(({ dist }) => dist <= CATCH_RADIUS_M)
      .sort((a, b) => a.dist - b.dist)[0];
    return nearby?.r ?? null;
  }, [playerPos, resources]);

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
            lat: playerPos[0] + 0.00005, // cca 5-8m
            lng: playerPos[1] + 0.00005, // cca 5-8m
            rarity: 'epic',
            monsterId: 'obsidian_golem',
            level: 7,
            caught: false
          };
          const next = [...prev, newM];
          return next;
        });
        addToast?.({ title: 'Goleme, vstaň!', message: 'Epický boss se objevil v tvé blízkosti!', type: 'success' });
      }
    };

    (window as any).spawnCustomMonster = (mId: string, lvl: number, rar: SpawnRarity = 'common') => {
      if (playerPos) {
        setSpawns(prev => {
          const newM: SpawnPoint = {
            id: 'custom_spawn_' + Date.now(),
            lat: playerPos[0] + 0.00006,
            lng: playerPos[1] + 0.00006,
            rarity: rar,
            monsterId: mId,
            level: lvl,
            caught: false
          };
          return [...prev, newM];
        });
        const mName = monsterDB.find(m => m.id === mId)?.name || mId;
        addToast?.({ title: 'Detekce!', message: `${mName} (Lv.${lvl}) naspawnováno u tebe!`, type: 'info' });
      }
    };

    (window as any).spawnCustomResource = (type: ResourceType, amount: number) => {
      if (playerPos) {
        setResources(prev => {
          const newR: ResourceSpawn = {
            id: 'custom_res_' + Date.now(),
            lat: playerPos[0] - 0.00006,
            lng: playerPos[1] - 0.00006,
            type: type,
            amount: amount,
            isCollected: false
          };
          return [...prev, newR];
        });
        const label = type === 'herb' ? 'Bylinka' : 'Minerál';
        addToast?.({ title: 'Surovina!', message: `${label} (${amount}x) se objevila u tebe!`, type: 'success' });
      }
    };

    return () => {
      delete (window as any).spawnMapMonster;
      delete (window as any).spawnBasicMonster;
      delete (window as any).spawnCustomMonster;
      delete (window as any).spawnCustomResource;
    };
  }, [playerPos]);

  const updateMarkers = useCallback((map: L.Map, currentSpawns: SpawnPoint[], currentResources: ResourceSpawn[], playerLat: number, playerLng: number, pLevel: number, hideMonsters: boolean, hideResources: boolean, scale: number) => {
    // Monsters
    const existing = markersRef.current
    for (const [id, marker] of existing) {
      const s = currentSpawns.find(spawn => spawn.id === id);
      const isVisible = s && visibleRarities.has(s.rarity);
      
      if (hideMonsters || !s || s.caught || !isVisible) { 
        marker.remove(); 
        existing.delete(id);
      }
    }
    if (!hideMonsters) {
      for (const s of currentSpawns) {
        if (s.caught || !visibleRarities.has(s.rarity)) continue
        const dist = haversineM(playerLat, playerLng, s.lat, s.lng)
        const isNearby = dist <= CATCH_RADIUS_M
        const currentLocked = s.level > pLevel
        const isCollected = caughtMonsters.some(m => m.id === s.monsterId)
        const marker = existing.get(s.id)

        if (marker) {
          if ((marker as any)._isNearby !== isNearby || (marker as any)._isLocked !== currentLocked || (marker as any)._scale !== scale || (marker as any)._isCollected !== isCollected) {
            marker.setIcon(makeMarkerIcon(s, isNearby, currentLocked, scale, isCollected))
            marker.setTooltipContent(makeTooltipHtml(s, pLevel))
              ; (marker as any)._isNearby = isNearby
              ; (marker as any)._isLocked = currentLocked
              ; (marker as any)._scale = scale
              ; (marker as any)._isCollected = isCollected
          }
        } else {
          const m = L.marker([s.lat, s.lng], { icon: makeMarkerIcon(s, isNearby, currentLocked, scale, isCollected) }).bindTooltip(makeTooltipHtml(s, pLevel), { direction: 'top', offset: [0, -12], className: 'monster-tooltip' }).addTo(map)
            ; (m as any)._isNearby = isNearby
            ; (m as any)._isLocked = currentLocked
            ; (m as any)._scale = scale
            ; (m as any)._isCollected = isCollected
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

    // Dungeons
    const dExisting = dungeonMarkersRef.current
    for (const [id, marker] of dExisting) {
      if (!dungeons.find(d => d.id === id)) { marker.remove(); dExisting.delete(id); }
    }
    for (const d of dungeons) {
      const marker = dExisting.get(d.id)
      if (marker) {
        if ((marker as any)._scale !== scale) {
          marker.setIcon(makeDungeonIcon(d.type, d.title, d.recommendedLevel, scale))
            ; (marker as any)._scale = scale
        }
      } else if (map) {
        const m = L.marker([d.lat, d.lng], { icon: makeDungeonIcon(d.type, d.title, d.recommendedLevel, scale) })
          .on('click', () => { if (onOpenDungeon) onOpenDungeon(d); })
          .addTo(map)
          ; (m as any)._scale = scale
        dExisting.set(d.id, m)
      }
    }
  }, [visibleRarities, dungeons])

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
    const distanceSinceLast = lastPoiFetchRef.current ? haversineM(lat, lng, lastPoiFetchRef.current.lat, lastPoiFetchRef.current.lng) : 9999
    if (force || distanceSinceLast > (spawnRadius * 0.4)) {
      setLoadingPoi(true)
      setStatusMsg(t('map.scanning'))

      try {
        const { monsters: poiMonsters, resources: poiResources, buildings: poiBuildings, dungeons: poiDungeons } = await fetchPoiData(lat, lng, cooldownsRef.current, spawnRadius, force)
        if (poiDungeons) setDungeons(poiDungeons)

        setSpawns(prev => {
          const currentCooldowns = loadCooldowns()
          const poiMap = new Map<string, SpawnPoint>()
          // 1. Zafixujeme POI z okolí + nové POI
          prev.filter(p => p.rarity !== 'common' && haversineM(lat, lng, p.lat, p.lng) < 2000).forEach(p => {
            poiMap.set(p.id, { ...p, caught: p.caught || isOnCooldown(currentCooldowns, p.id) })
          })
          poiMonsters.forEach(p => {
            poiMap.set(p.id, { ...p, caught: p.caught || isOnCooldown(currentCooldowns, p.id) })
          })

          const rawPois = Array.from(poiMap.values())

          // 2. Legendary & Epic nikdy nefiltrujeme – vždy se zobrazí na jejich přesné poloze
          const highPois = rawPois.filter(p => p.rarity === 'legendary' || p.rarity === 'epic')

          // 3. Rare POI profiltrujeme rozestupem 20m (priorita vyšší raritě)
          const sortedRare = rawPois
            .filter(p => p.rarity === 'rare')
            .sort((a, b) => (RARITY_SCORE[b.rarity] || 0) - (RARITY_SCORE[a.rarity] || 0))
          const filteredRare = optimizeSpawns(sortedRare, [], highPois, 0, 20)

          const poisArray = [...highPois, ...filteredRare]

          // 4. Common grid – vyhýbá se všem POI o 20m
          const rawCommons = prev.filter(c => c.rarity === 'common')
          const finalCommons = optimizeSpawns(rawCommons, poiBuildings || [], poisArray, 35, 20)

          return [...finalCommons, ...poisArray]
        })

        setResources(prev => {
          const currentCooldowns = loadCooldowns()
          const poiMap = new Map<string, ResourceSpawn>()
          // 1. Zafixujeme POI z okolí + nové
          prev.filter(r => r.id.startsWith('poi_') && haversineM(lat, lng, r.lat, r.lng) < 2000).forEach(r => {
            poiMap.set(r.id, { ...r, isCollected: r.isCollected || isOnCooldown(currentCooldowns, r.id) })
          })
          poiResources.forEach(r => {
            poiMap.set(r.id, { ...r, isCollected: r.isCollected || isOnCooldown(currentCooldowns, r.id) })
          })
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
        setStatusMsg(t('map.scan_error'))
        setTimeout(() => setStatusMsg(''), 3000)
      } finally {
        setLoadingPoi(false)
      }
    }
  }, [spawnRadius])

  // První rychlé načtení (z cache i pro běžné monstra), pokud se přepínáme z jiné záložky
  useEffect(() => {
    if (initialPosition && spawns.length === 0) {
      const { lat, lng } = initialPosition;
      
      const cooldowns = loadCooldowns();
      const commonMonsters = generateCommonSpawns(lat, lng, cooldowns, spawnRadius);
      const commonRes = generateResources(lat, lng, cooldowns, spawnRadius);
      
      // Zkusit načíst i POI z cache rovnou
      const cacheKey = `poi_cache_${lat.toFixed(3)}_${lng.toFixed(3)}`;
      const cached = localStorage.getItem(cacheKey);
      
      let poiMonsters: SpawnPoint[] = [];
      let poiResources: ResourceSpawn[] = [];
      let poiBuildings: any[] = [];
      
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 3600000) {
            poiMonsters = data.content.monsters || [];
            poiResources = data.content.resources || [];
            poiBuildings = data.content.buildings || [];
            buildingsRef.current = poiBuildings;
            setBuildings(poiBuildings);
          }
        } catch (e) {}
      }

      const filteredM = poiMonsters.map(p => ({ ...p, caught: isOnCooldown(cooldowns, p.id) }));
      const filteredR = poiResources.map(r => ({ ...r, isCollected: isOnCooldown(cooldowns, r.id) }));

      const optimizedCommon = optimizeSpawns(commonMonsters, poiBuildings, filteredM, 35, 20);
      const optimizedRes = optimizeSpawns(commonRes, poiBuildings, filteredR, 35, 20);
      
      setSpawns([...optimizedCommon, ...filteredM]);
      setResources([...optimizedRes, ...filteredR]);
      setStatusMsg('');
    }
  }, [spawnRadius]); // Jen jednou při mountu komponenty

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const initPos: [number, number] = initialPosition ? [initialPosition.lat, initialPosition.lng] : [50.0755, 14.4378]
    const map = L.map(mapContainerRef.current, { 
      center: initPos, 
      zoom: 16, 
      zoomControl: false,
      preferCanvas: graphicsQuality === 'low'
    })
    mapRef.current = map

    
    if (initialPosition) {
      const { lat, lng } = initialPosition
      playerMarkerRef.current = L.marker([lat, lng], {
        icon: makePlayerIcon(),
        zIndexOffset: 1000,
        interactive: true
      }).addTo(map)
      lastPosRef.current = [lat, lng]
      lastPosTimeRef.current = Date.now()
      
      // Lehké "zazoomování" při startu pro lepší efekt, podobně jako u tlačítka pointu
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 17, { animate: true, duration: 1 });
        }
      }, 100);
    }

    const handleManualInteractionStart = () => {
      if (mapRef.current && !isStoppingRef.current) {
        isStoppingRef.current = true
        map.stop()
        isStoppingRef.current = false
      }
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

  // Propojení tématu mapy
  useEffect(() => {
    if (!mapRef.current) return;

    let effectiveTheme: 'day' | 'night' = 'day';
    if (mapTheme === 'auto') {
      const hour = new Date().getHours();
      effectiveTheme = (hour >= 20 || hour < 6) ? 'night' : 'day';
    } else {
      effectiveTheme = mapTheme as 'day' | 'night';
    }

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (!tileLayerRef.current) {
      tileLayerRef.current = new (CachedTileLayer as any)(tileUrl, { 
        maxZoom: 19,
        attribution
      }).addTo(mapRef.current);
    } else {
      tileLayerRef.current.setUrl(tileUrl);
    }

  }, [mapTheme]);

  // --- GPS Sledování ---
  useEffect(() => {
    if (!('geolocation' in navigator) || !mapRef.current) return

    let watchId: number | null = null;

    const startWatching = () => {
      if (watchId !== null) return;
      watchId = navigator.geolocation.watchPosition((pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        if (!isFinite(lat) || !isFinite(lng)) return
        const now = Date.now()

        // 1. Filter out poor accuracy/drift to prevent location "flying"
        if (lastPosRef.current) {
          // Ignore updates with accuracy worse than 100 meters
          if (accuracy !== undefined && accuracy > 100) {
            return;
          }
          // If accuracy is poor (e.g. > 35m) and the jump from the last position is larger than the accuracy range,
          // ignore the update to prevent sudden jumps
          if (accuracy !== undefined && accuracy > 35) {
            const jumpDist = haversineM(lastPosRef.current[0], lastPosRef.current[1], lat, lng);
            if (jumpDist > accuracy) {
              return;
            }
          }
        }

        // 2. Battery saver throttling: limit updates to once every 5 seconds (unless they moved > 15m)
        if (isBatterySaver && lastPosRef.current && lastPosTimeRef.current) {
          const timeSinceLastUpdate = now - lastPosTimeRef.current;
          const distMoved = haversineM(lastPosRef.current[0], lastPosRef.current[1], lat, lng);
          if (timeSinceLastUpdate < 5000 && distMoved < 15) {
            return;
          }
        }

        if (lastPosRef.current && lastPosTimeRef.current) {
          const traveled = haversineM(lastPosRef.current[0], lastPosRef.current[1], lat, lng)
          const timeDiff = (now - lastPosTimeRef.current) / 1000 // seconds

          const speedMps = (pos.coords.speed !== null && pos.coords.speed !== undefined)
            ? pos.coords.speed
            : (timeDiff > 0 ? traveled / timeDiff : 0)

          const speed = Math.min(speedMps, 50)

          if (!ignoreSpeedLimit && speed > 10 && traveled > 15) {
            speedViolationCountRef.current++
            if (speedViolationCountRef.current >= 3) {
              setIsTooFast(true)
            }
          } else if (ignoreSpeedLimit || speed < 6) {
            speedViolationCountRef.current = 0
            setIsTooFast(false)
          }

          if (traveled >= 10 && traveled <= 150) onDistanceUpdate(lat, lng, traveled)
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

          mapRef.current!.setView([lat, lng], 17)
        } else {
          playerMarkerRef.current.setLatLng([lat, lng])
          if (isAutoCenterRef.current && mapRef.current) {
            isInternalMoveRef.current = true
            mapRef.current.panTo([lat, lng], { animate: true })
          }
        }

        const cooldowns = loadCooldowns()
        cooldownsRef.current = cooldowns // Keep ref in sync
        const commonMonsters = generateCommonSpawns(lat, lng, cooldowns, spawnRadius)
        const commonRes = generateResources(lat, lng, cooldowns, spawnRadius)

        setSpawns(prev => {
          const pois = prev.filter(p =>
            (p.rarity !== 'common' || p.id.startsWith('dev_') || p.id.startsWith('custom_') || p.id.startsWith('cheat_'))
            && haversineM(lat, lng, p.lat, p.lng) < 2000
          ).map(p => ({ ...p, caught: isOnCooldown(cooldowns, p.id) }));

          const optimizedCommon = optimizeSpawns(commonMonsters, buildingsRef.current, pois, 35, 20);
          return [...optimizedCommon, ...pois];
        });

        setResources(prev => {
          const pois = prev.filter(r => r.id.startsWith('poi_') && haversineM(lat, lng, r.lat, r.lng) < 2000).map(r => ({ ...r, isCollected: isOnCooldown(cooldowns, r.id) }))
          const optimizedRes = optimizeSpawns(commonRes, buildingsRef.current, pois, 35, 20)
          return [...optimizedRes, ...pois]
        })

        if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current)
        overpassTimerRef.current = setTimeout(() => fetchPOI(lat, lng), 800)
      }, (err) => {
        setStatusMsg(t('map.gps_unavailable'));
        console.warn("Geolocation watch error:", err);
      }, {
        enableHighAccuracy: true, // Always use high accuracy (GPS) to prevent location jumping hundreds of meters
        maximumAge: isBatterySaver ? 10000 : 1000, // Cache results longer in battery saver mode
        timeout: 10000
      })
    };

    const stopWatching = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopWatching();
      } else {
        startWatching();
      }
    };

    startWatching();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopWatching();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (overpassTimerRef.current) clearTimeout(overpassTimerRef.current);
    }
  }, [onDistanceUpdate, isBatterySaver, ignoreSpeedLimit])

  // Zvuk pro zobrazení tlačítka BOJOVAT (když je příšera v dosahu)
  useEffect(() => {
    if (nearbySpawn) {
      if (!detectedMonstersRef.current.has(nearbySpawn.id)) {
        detectedMonstersRef.current.add(nearbySpawn.id);
        playNotification();
      }
    }
  }, [nearbySpawn, playNotification]);

  useEffect(() => {
    if (!playerPos || !mapRef.current) return
    updateMarkers(mapRef.current, spawns, resources, playerPos[0], playerPos[1], playerLevel, !showMonsters, !showResources, iconScale)
    updateOtherPlayers(mapRef.current, nearbyPlayers)
  }, [spawns, resources, playerPos, playerLevel, nearbyPlayers, updateMarkers, updateOtherPlayers, showMonsters, showResources, iconScale, visibleRarities])


  useEffect(() => {
    (window as any).markMonsterAsCaught = (spawnId: string) => {
      const nC = { ...cooldownsRef.current, [spawnId]: Date.now() + RESPAWN_COOLDOWN_MS }
      cooldownsRef.current = nC;
      localStorage.setItem('map_cooldowns', JSON.stringify(nC))
      setSpawns(prev => prev.map(s => s.id === spawnId ? { ...s, caught: true } : s))
    };
    return () => { delete (window as any).markMonsterAsCaught; };
  }, []);


  useEffect(() => {
    if (!playerPos || !playerName || !playerUid) return
    const sync = () => {
      syncPlayerToFirebase({
        uid: playerUid,
        name: playerName,
        level: playerLevel,
        monsterCount: new Set(caughtMonsters.map(m => m.id)).size,
        lat: playerPos[0],
        lng: playerPos[1],
        avatarStyle: avatarStyle,
        avatarSeed: avatarSeed,
        email: email,
        pvpWins,
        pvpLosses
      });
    };
    sync(); // Sync immediately
    const interval = setInterval(sync, 10000); // And every 10s
    return () => clearInterval(interval);
  }, [playerPos, playerName, playerLevel, caughtMonsters.length, avatarStyle, avatarSeed, playerUid, pvpWins, pvpLosses])

  useEffect(() => {
    if (!playerPos || !playerName || !playerUid) return
    const unsubscribe = watchNearbyPlayers(playerUid, (others: any[]) => {
      setFirebasePlayers(others.filter((p: any) => 
        p.name !== playerName && // Filter by name too
        (Date.now() - p.lastActive) < 300000 && 
        haversineM(playerPos[0], playerPos[1], p.lat, p.lng) < 2000
      ).map((p: any) => ({ ...p, id: p.id || `fb_${p.name}` })))
    });
    return () => unsubscribe();
  }, [playerPos, playerName, playerUid])

  useEffect(() => {
    const all = new Map<string, NearbyPlayer>()
    firebasePlayers.forEach(p => all.set(p.name, p))
    setNearbyPlayers(Array.from(all.values()))
  }, [firebasePlayers])

  function handleCatch() {
    if (!nearbySpawn) return
    const cost = calculateHPCost(nearbySpawn.level, nearbySpawn.rarity)
    if (playerHP < cost) { setEnergyBlocked(true); setTimeout(() => setEnergyBlocked(false), 2000); return }
    const dbM = monsterDB.find(m => m.id === nearbySpawn.monsterId) || monsterDB[0]
    onConsumeHP(cost)
    onCatch({ ...dbM, level: nearbySpawn.level, image: `/monsters/${dbM.id}.png` } as Monster, nearbySpawn.id)
  }

  function handleGather() {
    if (!nearbyResource) return
    onGather(nearbyResource.type, nearbyResource.amount)
    const nC = { ...cooldownsRef.current, [nearbyResource.id]: Date.now() + RESPAWN_COOLDOWN_MS }
    cooldownsRef.current = nC; localStorage.setItem('map_cooldowns', JSON.stringify(nC))
    setResources(prev => prev.map(r => r.id === nearbyResource.id ? { ...r, isCollected: true } : r))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full flex flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - 160px)' }}
    >
      <div className="px-4 py-2 flex items-center justify-between bg-background-dark/50 backdrop-blur-sm z-50">
        <div>
          <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">{t('map.exploring')}</p>
          <p className="text-slate-500 text-[9px] font-bold">
            {statusMsg || t('map.status', { monsters: spawns.filter(s => !s.caught).length, resources: resources.filter(r => !r.isCollected).length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Bar */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 mr-1">
            <button
              onClick={() => playerPos && fetchPOI(playerPos[0], playerPos[1], true)}
              className={cn("p-1.5 rounded-full transition-all hover:bg-white/10", loadingPoi ? "text-blue-500" : "text-slate-400")}
              title={t('map.refresh_map')}
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
            <span className="text-[10px] font-black text-blue-500 uppercase">{Math.round(playerHP)}% {t('map.energy')}</span>
          </div>
        </div>
      </div>

      {/* Speed Warning Overlay */}
      <AnimatePresence>
        {isTooFast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="absolute inset-x-6 top-16 z-[3000] bg-red-600/90 text-white rounded-2xl p-4 flex items-center justify-center gap-3 backdrop-blur-md shadow-2xl border-2 border-red-500/50"
          >
            <div className="size-10 bg-white/20 rounded-full flex items-center justify-center">
              <Navigation className="animate-pulse" size={20} />
            </div>
            <div className="text-left">
              <p className="font-black uppercase text-xs leading-none mb-1">{t('map.too_fast')}</p>
              <p className="text-[9px] font-bold opacity-80 uppercase leading-none">{t('map.too_fast_desc')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative m-3 mt-1 rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
        <div 
          ref={mapContainerRef} 
          className={cn(
            "w-full h-full z-0 transition-all duration-700",
            (mapTheme === 'night' || (mapTheme === 'auto' && (new Date().getHours() >= 20 || new Date().getHours() < 6))) && "map-dark-filter"
          )} 
        />

        {/* Legend Overlay */}
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsFilterOpen(true)}
          className="absolute bottom-[66px] left-4 z-[1001] bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-lg p-2.5 px-3 flex flex-col gap-1.5 shadow-2xl text-left transition-all active:bg-slate-900"
        >
          {[
            { id: 'common', label: t('rarities.common'), color: 'text-slate-400' },
            { id: 'rare', label: t('rarities.rare'), color: 'text-blue-500' },
            { id: 'epic', label: t('rarities.epic'), color: 'text-purple-500' },
            { id: 'legendary', label: t('rarities.legendary'), color: 'text-amber-500' }
          ].map(l => (
            <span 
              key={l.id} 
              className={cn(
                "text-[7.5px] font-black uppercase tracking-[0.2em] drop-shadow-sm leading-none transition-all", 
                visibleRarities.has(l.id as any) ? l.color : "text-slate-600 opacity-40 grayscale"
              )}
            >
              {l.label}
            </span>
          ))}
        </motion.button>
      </div>

      <AnimatePresence>
        {isFilterOpen && (
          <div 
            className="absolute inset-0 z-[2000] flex items-end justify-center p-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsFilterOpen(false)}
          >
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setIsFilterOpen(false);
                }
              }}
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              className="w-full bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] p-6 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-white uppercase tracking-widest italic">{t('map.legend_filter')}</h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'common', label: t('rarities.common'), color: 'bg-slate-400' },
                  { id: 'rare', label: t('rarities.rare'), color: 'bg-blue-500' },
                  { id: 'epic', label: t('rarities.epic'), color: 'bg-purple-500' },
                  { id: 'legendary', label: t('rarities.legendary'), color: 'bg-amber-500' }
                ].map(r => {
                  const isActive = visibleRarities.has(r.id as any);
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        const next = new Set(visibleRarities);
                        if (isActive) {
                          if (next.size > 1) next.delete(r.id as any);
                        } else {
                          next.add(r.id as any);
                        }
                        setVisibleRarities(next);
                      }}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
                        isActive ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2.5 h-2.5 rounded-full", r.color)} />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">{r.label}</span>
                      </div>
                      <div className={cn(
                        "w-10 h-5 rounded-full relative transition-all",
                        isActive ? "bg-primary" : "bg-slate-700"
                      )}>
                        <motion.div 
                          animate={{ x: isActive ? 22 : 2 }}
                          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isInteractionBlocked && !isTooFast && (nearbyResource || nearbySpawn) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="absolute bottom-6 left-6 right-6 z-[1001] flex flex-col gap-2 pointer-events-none"
          >
            {/* 1. Zpráva o uzamčené příšeře (pokud je příšera zablokovaná levelem) */}
            {nearbySpawn && nearbySpawn.level > playerLevel && (
              <div className="w-full py-3.5 rounded-2xl bg-red-950/90 backdrop-blur-md border border-red-500/20 text-red-200 font-black text-center uppercase text-[11px] flex items-center justify-center gap-2 shadow-2xl pointer-events-auto">
                <X size={14} className="text-red-500" />
                <span>{t('map.locked', { level: nearbySpawn.level })}</span>
              </div>
            )}

            {/* 2. Tlačítko pro sběr suroviny */}
            {nearbyResource && (
              <button 
                onClick={handleGather} 
                className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex flex-col items-center justify-center bg-gradient-to-r from-emerald-600 to-teal-500 border-b-4 border-black/20 shadow-2xl transition-all active:scale-95 pointer-events-auto"
              >
                <div className="flex items-center gap-2 underline underline-offset-4 decoration-white/30">
                  <Package size={16} />
                  <span>{t('map.gather', { type: getLoc(RESOURCE_CONFIG[nearbyResource.type]?.label, i18n.language) || t('common.sector') })}</span>
                </div>
                <div className="text-[10px] opacity-80 mt-1">{t('map.gather_desc', { amount: nearbyResource.amount })}</div>
              </button>
            )}

            {/* 3. Tlačítko pro boj s příšerou (pokud na ni hráč má level) */}
            {nearbySpawn && nearbySpawn.level <= playerLevel && (
              <div className="w-full pointer-events-auto">
                {energyBlocked ? (
                  <div className="w-full py-5 rounded-2xl bg-slate-900/90 backdrop-blur-md border-b-4 border-orange-500/50 text-orange-200 font-black text-center uppercase text-sm flex items-center justify-center gap-2 shadow-2xl">
                    <span>{t('map.low_energy')}</span>
                  </div>
                ) : (
                  <button 
                    onClick={handleCatch} 
                    className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex flex-col items-center justify-center border-b-4 border-black/20 shadow-2xl transition-all active:scale-95" 
                    style={{ background: nearbySpawn.rarity === 'epic' ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : nearbySpawn.rarity === 'rare' ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'linear-gradient(135deg, #b91c1c, #450a0a)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Target size={16} className="animate-pulse" />
                      <span>{caughtMonsters.length === 0 ? t('map.catch') : t('map.battle')}: {t('monster.level_short')} {nearbySpawn.level}</span>
                    </div>
                    <div className="text-[10px] opacity-80 mt-1 uppercase tracking-tighter font-black">
                      {caughtMonsters.length === 0 
                        ? t('map.catch_energy', { amount: calculateHPCost(nearbySpawn.level, nearbySpawn.rarity) }) 
                        : t('map.take_strongest')}
                    </div>
                  </button>
                )}
              </div>
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
                <p className="text-purple-400 text-[10px] font-black uppercase mb-6 tracking-widest leading-none">{t('ranks.r1')} (LVL {selectedOtherPlayer.level})</p>

                {selectedPlayerDist !== null && selectedPlayerDist > CATCH_RADIUS_M && (
                  <div className="w-full bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] font-black text-center uppercase p-3 rounded-2xl mb-6 italic tracking-tight leading-relaxed">
                    {t('map.trade_duel_radius')}
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full">
                  {selectedPlayerDist !== null && selectedPlayerDist <= CATCH_RADIUS_M && (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                        onClick={() => { onStartTrade(selectedOtherPlayer.name, selectedOtherPlayer.id); setSelectedOtherPlayer(null) }}
                        className="bg-purple-600 active:scale-95 shadow-lg shadow-purple-900/20 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-tighter transition-all"
                      >
                        {t('map.trade')}
                      </button>
                      <button
                        onClick={() => {
                          onStartDuel?.(selectedOtherPlayer.name, selectedOtherPlayer.id);
                          setSelectedOtherPlayer(null);
                        }}
                        className="bg-red-600 active:scale-95 shadow-lg shadow-red-900/20 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-tighter transition-all"
                      >
                        {t('map.duel')}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedOtherPlayer(null)}
                    className="bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl uppercase text-xs hover:bg-slate-700 active:scale-95 transition-all shadow-inner"
                  >
                    {t('common.close')}
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

export default memo(WorldMap)
