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
  mapTheme?: 'day' | 'night' | 'auto'
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
  initialPosition = null,
  mapTheme = 'auto'
}, ref) => {

  const { t, i18n } = useTranslation()
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
  const [statusMsg, setStatusMsg] = useState(initialPosition ? '' : t('map.searching'))
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([])
  const [firebasePlayers, setFirebasePlayers] = useState<NearbyPlayer[]>([])
  const [selectedOtherPlayer, setSelectedOtherPlayer] = useState<NearbyPlayer | null>(null)
  const [buildings, setBuildings] = useState<{ lat: number, lng: number }[]>([])
  const buildingsRef = useRef<{ lat: number, lng: number }[]>([])
  const [isAutoCenter, setIsAutoCenter] = useState(true)
  const isAutoCenterRef = useRef(isAutoCenter)
  const [isTooFast, setIsTooFast] = useState(false)

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
      .filter(s => !s.caught && isFinite(s.lat) && isFinite(s.lng))
      .map(s => ({ s, dist: haversineM(playerPos[0], playerPos[1], s.lat, s.lng) }))
      .filter(({ dist }) => dist <= CATCH_RADIUS_M)
      .sort((a, b) => a.dist - b.dist)[0];
    return nearby?.s ?? null;
  }, [playerPos, spawns]);

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

    return () => {
      delete (window as any).spawnMapMonster;
      delete (window as any).spawnBasicMonster;
      delete (window as any).spawnCustomMonster;
    };
  }, [playerPos]);

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
    setStatusMsg(t('map.scanning'))

    try {
      const { monsters: poiMonsters, resources: poiResources, buildings: poiBuildings } = await fetchPoiData(lat, lng, cooldownsRef.current, force)

      setSpawns(prev => {
        const poiMap = new Map<string, SpawnPoint>()
        // 1. Zafixujeme POI z okolí + nové POI
        prev.filter(p => p.rarity !== 'common' && haversineM(lat, lng, p.lat, p.lng) < 2000).forEach(p => poiMap.set(p.id, p))
        poiMonsters.forEach(p => poiMap.set(p.id, p))

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
      setStatusMsg(t('map.scan_error'))
      setTimeout(() => setStatusMsg(''), 3000)
    } finally {
      setLoadingPoi(false)
    }
  }, [])

  // První rychlé načtení (z cache i pro běžné monstra), pokud se přepínáme z jiné záložky
  useEffect(() => {
    if (initialPosition && spawns.length === 0) {
      const { lat, lng } = initialPosition;
      
      const cooldowns = loadCooldowns();
      const commonMonsters = generateCommonSpawns(lat, lng, cooldowns);
      const commonRes = generateResources(lat, lng, cooldowns);
      
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
  }, []); // Jen jednou při mountu komponenty

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const initPos: [number, number] = initialPosition ? [initialPosition.lat, initialPosition.lng] : [50.0755, 14.4378]
    const map = L.map(mapContainerRef.current, { center: initPos, zoom: 16, zoomControl: false })
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
      tileLayerRef.current = L.tileLayer(tileUrl, { 
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
        const { latitude: lat, longitude: lng } = pos.coords
        if (!isFinite(lat) || !isFinite(lng)) return
        const now = Date.now()
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
        const commonMonsters = generateCommonSpawns(lat, lng, cooldowns)
        const commonRes = generateResources(lat, lng, cooldowns)

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
        enableHighAccuracy: !isBatterySaver,
        maximumAge: isBatterySaver ? 5000 : 1000,
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
  }, [spawns, resources, playerPos, playerLevel, nearbyPlayers, updateMarkers, updateOtherPlayers, showMonsters, showResources, iconScale])


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
        monsterCount: caughtMonsters.length,
        lat: playerPos[0],
        lng: playerPos[1],
        avatarStyle: avatarStyle,
        avatarSeed: avatarSeed,
        email: email
      });
    };
    sync(); // Sync immediately
    const interval = setInterval(sync, 10000); // And every 10s
    return () => clearInterval(interval);
  }, [playerPos, playerName, playerLevel, caughtMonsters.length, avatarStyle, avatarSeed, playerUid])

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
        <div className="absolute bottom-[66px] left-4 z-[1001] bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-lg p-2.5 px-3 flex flex-col gap-1.5 shadow-2xl pointer-events-none">
          {[
            { label: t('rarities.common'), color: 'text-slate-400' },
            { label: t('rarities.rare'), color: 'text-blue-500' },
            { label: t('rarities.epic'), color: 'text-purple-500' },
            { label: t('rarities.legendary'), color: 'text-amber-500' }
          ].map(l => (
            <span key={l.label} className={cn("text-[7.5px] font-black uppercase tracking-[0.2em] drop-shadow-sm leading-none", l.color)}>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {nearbyResource && !nearbySpawn && !isInteractionBlocked && !isTooFast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-6 left-6 right-6 z-[1001]">
            <button onClick={handleGather} className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex flex-col items-center justify-center bg-gradient-to-r from-emerald-600 to-teal-500 border-b-4 border-black/20 shadow-2xl transition-all active:scale-95">
              <div className="flex items-center gap-2 underline underline-offset-4 decoration-white/30">
                <Package size={16} />
                <span>{t('map.gather', { type: getLoc(RESOURCE_CONFIG[nearbyResource.type]?.label, i18n.language) || t('common.sector') })}</span>
              </div>
              <div className="text-[10px] opacity-80 mt-1">{t('map.gather_desc', { amount: nearbyResource.amount })}</div>
            </button>
          </motion.div>
        )}
        {nearbySpawn && !isInteractionBlocked && !isTooFast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-6 left-6 right-6 z-[1001]">
            {nearbySpawn.level > playerLevel ? (
              <div className="w-full py-5 rounded-2xl bg-red-950/90 backdrop-blur-md border-b-4 border-red-500/50 text-red-200 font-black text-center uppercase text-sm flex items-center justify-center gap-2 shadow-2xl">
                <X size={16} className="text-red-500" />
                <span>{t('map.locked', { level: nearbySpawn.level })}</span>
              </div>
            ) : energyBlocked ? (
              <div className="w-full py-5 rounded-2xl bg-slate-900/90 backdrop-blur-md border-b-4 border-orange-500/50 text-orange-200 font-black text-center uppercase text-sm flex items-center justify-center gap-2 shadow-2xl">
                <span>{t('map.low_energy')}</span>
              </div>
            ) : (
              <button onClick={handleCatch} className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex flex-col items-center justify-center border-b-4 border-black/20 shadow-2xl transition-all active:scale-95" style={{ background: nearbySpawn.rarity === 'epic' ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : nearbySpawn.rarity === 'rare' ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'linear-gradient(135deg, #b91c1c, #450a0a)' }}>
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
