import {
  SpawnPoint,
  ResourceSpawn,
  ResourceType,
  Monster,
  SpawnRarity,
  Cooldowns
} from '../../types';
import {
  metersToLatDeg,
  metersToLngDeg,
  seededFloat,
  pickMonster,
  pickLevel,
  calculateHPCost,
  haversineM
} from './mapUtils';

export { calculateHPCost };

// ── Konfigurace Spawnování ──────────────────────────────────
export const COMMON_GRID_M = 100
export const RESOURCE_GRID_M = 60
export const COMMON_RADIUS_CELLS = 10
export const OVERPASS_RADIUS_M = 1500
export const REF_LAT = 50.0755
export const EPIC_TAGS = ['monastery', 'cathedral', 'tower', 'ruins', 'temple', 'tvrz', 'abbey', 'basilica', 'monument']
export const LEGENDARY_CANDIDATE_TAGS = ['castle', 'palace', 'chateau', 'fortress', 'citadel', 'manor']
// Vesnické POI – garantováno Rare spawn (bez skip chance)
export const VILLAGE_RURAL_TAGS = ['wayside_cross', 'wayside_shrine', 'wayside', 'chapel', 'memorial', 'boundary_stone', 'milestone', 'village_sign', 'cross']

// Šikovné konstanty pro mřížku
const LAT_STEP = metersToLatDeg(COMMON_GRID_M)
const LNG_STEP = metersToLngDeg(COMMON_GRID_M, REF_LAT)

export function loadCooldowns(): Cooldowns {
  try { return JSON.parse(localStorage.getItem('map_cooldowns') ?? '{}') }
  catch { return {} }
}

export function isOnCooldown(cooldowns: Cooldowns, id: string): boolean {
  const expiry = cooldowns[id]
  return !!expiry && Date.now() < expiry
}

/**
 * Generuje základní monstra v mřížce (Wild Monsters)
 */
export function generateCommonSpawns(playerLat: number, playerLng: number, cooldowns: Cooldowns, radiusM: number = 1000): SpawnPoint[] {
  if (!isFinite(playerLat) || !isFinite(playerLng)) return []
  const spawns: SpawnPoint[] = []
  const centerIX = Math.floor(playerLat / LAT_STEP)
  const centerIY = Math.floor(playerLng / LNG_STEP)
  
  const radiusCells = Math.ceil(radiusM / COMMON_GRID_M)

  for (let dy = -radiusCells; dy <= radiusCells; dy++) {
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      const ix = centerIX + dy
      const iy = centerIY + dx
      const gridLat = ix * LAT_STEP
      const gridLng = iy * LNG_STEP
      const hashX = (ix * 31337) ^ (iy * 11369);
      const hashY = (iy * 31337) ^ (ix * 11369);
      const id = `grid_${hashX}_${hashY}`

      // Hustota běžných monster
      if (seededFloat(`skip_${id}`) < 0.10) continue

      const jLat = gridLat + (seededFloat(`jlat_${id}`) - 0.5) * LAT_STEP * 1.5
      const jLng = gridLng + (seededFloat(`jlng_${id}`) - 0.5) * LNG_STEP * 1.5

      const realId = `grid_${ix}_${iy}`;

      spawns.push({
        id: realId,
        lat: jLat,
        lng: jLng,
        rarity: 'common',
        monsterId: pickMonster(id, 'common'),
        level: pickLevel(id, 'common'),
        caught: isOnCooldown(cooldowns, realId),
      })
    }
  }
  return spawns
}

/**
 * Generuje suroviny v mřížce
 */
export function generateResources(playerLat: number, playerLng: number, cooldowns: Cooldowns, radiusM: number = 1000): ResourceSpawn[] {
  if (!isFinite(playerLat) || !isFinite(playerLng)) return []
  const spawns: ResourceSpawn[] = []
  
  const resLatStep = metersToLatDeg(RESOURCE_GRID_M)
  const resLngStep = metersToLngDeg(RESOURCE_GRID_M, REF_LAT)
  
  const centerIX = Math.floor(playerLat / resLatStep)
  const centerIY = Math.floor(playerLng / resLngStep)
  const resourceTypes: ResourceType[] = ['crystal', 'herb', 'energy', 'mineral']

  const radiusCells = Math.ceil(radiusM / RESOURCE_GRID_M)

  for (let dy = -radiusCells; dy <= radiusCells; dy++) {
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      const ix = centerIX + dy
      const iy = centerIY + dx
      const gridLat = ix * resLatStep
      const gridLng = iy * resLngStep
      const hashX = (ix * 31337) ^ (iy * 11369);
      const hashY = (iy * 31337) ^ (ix * 11369);
      const id = `resource_${hashX}_${hashY}`

      // Hustota surovin (10% šance na přeskočení = 90% spawn rate v 60m mřížce)
      if (seededFloat(`r_skip_${id}`) < 0.10) continue

      const rChance = seededFloat(`rtype_${id}`);
      let rType: ResourceType = 'crystal';
      if (rChance < 0.40) rType = 'crystal';
      else if (rChance < 0.65) rType = 'energy';
      else if (rChance < 0.85) rType = 'mineral';
      else rType = 'herb';

      const rareRoll = seededFloat(`rare_${id}`);
      if (rareRoll < 0.03) rType = 'magic_crystal';
      else if (rareRoll < 0.06) rType = 'super_mineral';

      const jLat = gridLat + (seededFloat(`rjlat_${id}`) - 0.5) * resLatStep * 1.5
      const jLng = gridLng + (seededFloat(`rjlng_${id}`) - 0.5) * resLngStep * 1.5

      spawns.push({
        id: `res_${ix}_${iy}`,
        lat: jLat,
        lng: jLng,
        type: rType,
        amount: Math.floor(seededFloat(`ramount_${id}`) * 3) + 1, // 1-3 kusy
        isCollected: isOnCooldown(cooldowns, `res_${ix}_${iy}`)
      })
    }
  }
  return spawns
}

/**
 * Načítá body zájmu (POI) z OpenStreetMap přes Overpass API
 */
export async function fetchPoiData(
  lat: number,
  lng: number,
  cooldowns: Cooldowns,
  radiusM: number = 1500,
  force = false
): Promise<{ monsters: SpawnPoint[], resources: ResourceSpawn[], buildings: { lat: number, lng: number }[] }> {
  if (!isFinite(lat) || !isFinite(lng)) return { monsters: [], resources: [], buildings: [] }

  const cacheKey = `poi_cache_${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusM}`;
  if (!force) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 3600000) { // 1 hour cache
          return data.content;
        }
      } catch (e) { console.error("Cache read error:", e) }
    }
  }

  // Cleanup old cache entries to prevent QuotaExceededError
  try {
    const keys = Object.keys(localStorage);
    const poiKeys = keys.filter(k => k.startsWith('poi_cache_'));
    if (poiKeys.length > 40) { // Limit to 40 cache cells (roughly 2x2km area around player's travel path)
        poiKeys.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) { console.warn("Cache cleanup failed", e); }

  const query = `[out:json][timeout:60];
(
  // Monsters POIs
  nwr["historic"](around:${radiusM},${lat},${lng});
  nwr["tourism"](around:${radiusM},${lat},${lng});
  nwr["amenity"~"place_of_worship|museum|library|theatre"](around:${radiusM},${lat},${lng});
  nwr["heritage"](around:${radiusM},${lat},${lng});
  // Vesnické POI (boží muka, kapličky, pomínky)
  nwr["historic"~"wayside_cross|wayside_shrine|wayside|chapel|memorial|boundary_stone|milestone|village_sign|cross"](around:${radiusM},${lat},${lng});
  nwr["amenity"~"place_of_worship"](around:${radiusM},${lat},${lng});
  
  // Buildings to avoid
  nwr["building"](around:500,${lat},${lng});
  nwr["leisure"~"park|garden|nature_reserve|playground"](around:${radiusM},${lat},${lng});
  nwr["landuse"~"forest|grass|orchard|flowerbed|allotments|meadow"](around:${radiusM},${lat},${lng});
  nwr["natural"~"water|wood|scrub|heath|grassland|rock|peak"](around:${radiusM},${lat},${lng});
);
out center;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  let res, json, lastError;
  for (const endpoint of endpoints) {
    try {
      res = await fetch(endpoint, { method: 'POST', body: query });
      if (res.ok) {
        json = await res.json();
        break;
      } else {
        lastError = `Status ${res.status}`;
      }
    } catch (e) {
      lastError = e;
      console.warn(`Endpoint ${endpoint} failed, trying next...`);
    }
  }

  if (!json || !json.elements) {
    console.warn("Overpass API failed or offline. Attempting offline fallback...");
    // 1. Try to search localStorage for ANY cache entry close to the current location (within 2.5km)
    try {
      let closestKey = null;
      let closestDist = Infinity;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('poi_cache_')) {
          const parts = key.split('_');
          const cachedLat = parseFloat(parts[2]);
          const cachedLng = parseFloat(parts[3]);
          if (isFinite(cachedLat) && isFinite(cachedLng)) {
            const dist = haversineM(lat, lng, cachedLat, cachedLng);
            if (dist < closestDist && dist < 2500) {
              closestDist = dist;
              closestKey = key;
            }
          }
        }
      }
      if (closestKey) {
        const cached = localStorage.getItem(closestKey);
        if (cached) {
          const data = JSON.parse(cached);
          console.log("Offline Fallback: Loaded cached POI data at distance", closestDist, "meters");
          return data.content;
        }
      }
    } catch (e) {
      console.warn("Offline cache search failed:", e);
    }

    // 2. If no cache exists, generate stable offline pseudo-landmarks
    console.log("Offline Fallback: Generating mathematical pseudo-landmarks...");
    return generateOfflinePseudoPois(lat, lng, cooldowns, radiusM);
  }

  const monsters: SpawnPoint[] = []
  const resources: ResourceSpawn[] = []
  const buildings: { lat: number, lng: number }[] = []
  const seenPos = new Set<string>()
  const legCandidates: { m: SpawnPoint; tags: any }[] = []

  for (const el of json.elements ?? []) {
    const elLat: number = el.lat ?? el.center?.lat
    const elLng: number = el.lon ?? el.center?.lon
    if (elLat === undefined || elLng === undefined || !isFinite(elLat) || !isFinite(elLng)) continue

    // Přeskočit POUZE čisté budovy bez historického tagu – hrady/zámky mívají building=castle
    const isHistoricLandmark = el.tags && (
      LEGENDARY_CANDIDATE_TAGS.some(t => el.tags.historic === t || el.tags.heritage === t) ||
      EPIC_TAGS.some(t => el.tags.historic === t || el.tags.heritage === t) ||
      el.tags.name?.toLowerCase().match(/\b(hrad|zámek)\b/)
    );
    if (el.tags && el.tags.building && !isHistoricLandmark) {
      buildings.push({ lat: elLat, lng: elLng })
      continue
    }

    const posKey = `${elLat.toFixed(5)}_${elLng.toFixed(5)}`
    if (seenPos.has(posKey)) continue
    seenPos.add(posKey)

    const tags = el.tags || {}
    const id = `poi_${el.type}_${el.id}`
    const isCollected = isOnCooldown(cooldowns, id)

    if (tags.historic || tags.tourism || tags.amenity === 'place_of_worship' || tags.heritage) {
      const isLegCandidate = LEGENDARY_CANDIDATE_TAGS.some(t => tags.historic === t || tags.heritage === t || tags.castle_type === t) ||
        (tags.name?.toLowerCase().match(/\b(hrad|zámek)\b/));
      const isEpicSite = EPIC_TAGS.some(t => tags.historic === t || tags.heritage === t);
      const isChurch = tags.amenity === 'place_of_worship' && !isEpicSite && !isLegCandidate;
      const isVillageRural = VILLAGE_RURAL_TAGS.some(t => tags.historic === t) && !isChurch;
      const isSpecialSite = isLegCandidate || isEpicSite;

      // Legendary kandidáti se vždy zaregistrují; ostatní special sites mají 50% šanci na spawn
      if (isSpecialSite && !isLegCandidate && seededFloat(id + '_special_skip') < 0.50) continue;
      // Kostely & vesnické POI – žádný skip, garantovaný spawn
      // Ostatní historická místa – 10% šance na přeskočení
      if (!isSpecialSite && !isChurch && !isVillageRural && seededFloat(id + '_spawn_m') < 0.1) continue;

      let rarity: SpawnRarity = 'common';
      if (isSpecialSite) {
        rarity = 'epic'; // Výchozí raritou pro special je Epická (legendární se vybere v Pass 2)
      } else if (isChurch) {
        // Kostel: 70% Epic, 30% Rare
        const cRoll = seededFloat(id + '_church_rarity');
        rarity = cRoll < 0.70 ? 'epic' : 'rare';
      } else if (isVillageRural) {
        // Vesnické POI (boží muka, kapličky…): 85% Rare, 15% Epic
        const vRoll = seededFloat(id + '_village_rarity');
        rarity = vRoll < 0.15 ? 'epic' : 'rare';
      } else {
        const rRoll = seededFloat(id + '_rarity');
        if (rRoll < 0.26) rarity = 'epic';           // 26% Epická
        else if (rRoll < 0.76) rarity = 'rare';      // 50% Vzácná
        else rarity = 'common';                     // 24% Běžná
      }

      const m: SpawnPoint = {
        id, lat: elLat, lng: elLng, rarity,
        monsterId: '', // Bude finalizováno v Pass 3
        level: 0,
        caught: isCollected,
      };

      if (isLegCandidate) legCandidates.push({ m, tags });
      monsters.push(m);
    }
    else {
      // Zvýšená šance na suroviny z POI (50% šance na spawn)
      if (seededFloat(id + '_spawn') < 0.5) continue

      let type: ResourceType = 'crystal'
      let amount = Math.floor(seededFloat(id + '_amt') * 3) + 2

      if (tags.leisure || tags.landuse === 'forest' || tags.landuse === 'grass' || tags.landuse === 'orchard' || tags.natural === 'water') {
        // Bylinky z parků a lesů - zvýšená šance (nerf snížen z 85% na 60%)
        if (seededFloat(id + '_herb_nerf') < 0.60) continue;
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

  // Pass 2: Výběr legendárních vítězů (maximálně 1 na oblast cca 2km)
  const winnersByGrid: Record<string, { m: SpawnPoint; score: number }> = {};
  for (const cand of legCandidates) {
    const gridKey = `${Math.floor(cand.m.lat * 50)}_${Math.floor(cand.m.lng * 50)}`;
    const score = seededFloat(cand.m.id + "_winner_score");
    if (!winnersByGrid[gridKey] || score > winnersByGrid[gridKey].score) {
      winnersByGrid[gridKey] = { m: cand.m, score };
    }
  }
  for (const key in winnersByGrid) {
    winnersByGrid[key].m.rarity = 'legendary';
  }

  // Pass 3: Finalizace ID monster a úrovní podle konečné rarity
  for (const monster of monsters) {
    monster.monsterId = pickMonster(monster.id, monster.rarity);
    monster.level = pickLevel(monster.id, monster.rarity);
  }

  const result = { monsters, resources, buildings };
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), content: result }));
  return result;
}

/**
 * Generuje stabilní offline pseudo-památky, pokud není k dispozici internet ani cache
 */
function generateOfflinePseudoPois(
  lat: number,
  lng: number,
  cooldowns: Cooldowns,
  radiusM: number = 1500
): { monsters: SpawnPoint[], resources: ResourceSpawn[], buildings: { lat: number, lng: number }[] } {
  const monsters: SpawnPoint[] = [];
  const resources: ResourceSpawn[] = [];
  const buildings: { lat: number, lng: number }[] = [];

  // Použijeme hrubší mřížku pro památky (např. 400m)
  const OFFLINE_POI_GRID_M = 400;
  const poiLatStep = metersToLatDeg(OFFLINE_POI_GRID_M);
  const poiLngStep = metersToLngDeg(OFFLINE_POI_GRID_M, REF_LAT);

  const centerIX = Math.floor(lat / poiLatStep);
  const centerIY = Math.floor(lng / poiLngStep);
  const radiusCells = Math.ceil(radiusM / OFFLINE_POI_GRID_M);

  for (let dy = -radiusCells; dy <= radiusCells; dy++) {
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      const ix = centerIX + dy;
      const iy = centerIY + dx;
      const gridLat = ix * poiLatStep;
      const gridLng = iy * poiLngStep;

      const cellId = `offpoi_${ix}_${iy}`;
      
      // 12% šance na spawn památky v této buňce
      if (seededFloat(`${cellId}_spawn`) >= 0.12) continue;

      // Jitter pozice uvnitř buňky
      const pLat = gridLat + (seededFloat(`${cellId}_lat`) - 0.5) * poiLatStep * 0.8;
      const pLng = gridLng + (seededFloat(`${cellId}_lng`) - 0.5) * poiLngStep * 0.8;

      const id = `poi_offline_${ix}_${iy}`;
      const isCollected = isOnCooldown(cooldowns, id);

      // Určíme raritu (60% Rare, 35% Epic, 5% Legendary)
      const rarityRoll = seededFloat(`${cellId}_rarity`);
      let rarity: SpawnRarity = 'rare';
      if (rarityRoll < 0.05) rarity = 'legendary';
      else if (rarityRoll < 0.40) rarity = 'epic';

      monsters.push({
        id,
        lat: pLat,
        lng: pLng,
        rarity,
        monsterId: pickMonster(id, rarity),
        level: pickLevel(id, rarity),
        caught: isCollected
      });
      
      // Občas přidáme i nějakou vzácnější surovinu u této památky
      if (seededFloat(`${cellId}_res`) < 0.50) {
        const resId = `res_offline_${ix}_${iy}`;
        const resRoll = seededFloat(`${cellId}_restype`);
        let type: any = 'magic_crystal';
        if (resRoll < 0.50) type = 'super_mineral';
        
        resources.push({
          id: resId,
          lat: pLat + 0.0001, // kousek vedle památky
          lng: pLng + 0.0001,
          type,
          amount: Math.floor(seededFloat(`${cellId}_resamt`) * 3) + 2,
          isCollected: isOnCooldown(cooldowns, resId)
        });
      }
    }
  }

  return { monsters, resources, buildings };
}
