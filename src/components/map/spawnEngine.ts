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
  calculateHPCost
} from './mapUtils';

export { calculateHPCost };

// ── Konfigurace Spawnování ──────────────────────────────────
export const COMMON_GRID_M = 100
export const COMMON_RADIUS_CELLS = 10
export const OVERPASS_RADIUS_M = 1500
export const REF_LAT = 50.0755
export const EPIC_TAGS = ['castle', 'monastery', 'palace', 'fortress', 'cathedral']

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
export function generateCommonSpawns(playerLat: number, playerLng: number, cooldowns: Cooldowns): SpawnPoint[] {
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
      const hashX = (ix * 31337) ^ (iy * 11369);
      const hashY = (iy * 31337) ^ (ix * 11369);
      const id = `grid_${hashX}_${hashY}`

      // Hustota běžných monster (zhruba 90% šance na obdélník, díky velkému jitteru se roztýlí)
      if (seededFloat(`skip_${id}`) < 0.10) continue

      // Zvýšený 1.5x rozptyl pro přelezení mřížky do okolí
      const jLat = gridLat + (seededFloat(`jlat_${id}`) - 0.5) * LAT_STEP * 1.5
      const jLng = gridLng + (seededFloat(`jlng_${id}`) - 0.5) * LNG_STEP * 1.5

      const realId = `grid_${ix}_${iy}`;

      spawns.push({
        id: realId, // ID fixní pro synchronizaci sežených napříč relacemi
        lat: jLat, 
        lng: jLng, 
        rarity: 'common',
        monsterId: pickMonster(id, 'common'),    // Seed hashovaný pro náhodu
        level: pickLevel(id, 'common'),          // Seed hashovaný pro náhodu
        caught: isOnCooldown(cooldowns, realId), // Cooldown fixní na mřížku
      })
    }
  }
  return spawns
}

/**
 * Generuje suroviny v mřížce
 */
export function generateResources(playerLat: number, playerLng: number, cooldowns: Cooldowns): ResourceSpawn[] {
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
      // Prosolení ID aby se předešlo řádkování v generátoru náhody
      const hashX = (ix * 31337) ^ (iy * 11369);
      const hashY = (iy * 31337) ^ (ix * 11369);
      const id = `resource_${hashX}_${hashY}`

      // Hustota surovin na mapě (zvýšená na 30% šanci)
      if (seededFloat(`r_skip_${id}`) < 0.70) continue

      const rChance = seededFloat(`rtype_${id}`);
      let rType: ResourceType = 'crystal';
      // Bylinky tvoří jen 15% z gridu, protože se masivně generují ze stromů a trávy z map (POI)
      if (rChance < 0.40) rType = 'crystal';       // 40 %
      else if (rChance < 0.65) rType = 'energy';   // 25 %
      else if (rChance < 0.85) rType = 'mineral';  // 20 %
      else rType = 'herb';                         // 15 %

      const rareRoll = seededFloat(`rare_${id}`);
      if (rareRoll < 0.03) rType = 'magic_crystal';
      else if (rareRoll < 0.06) rType = 'super_mineral';

      // Jitter 1.5x velikosti buňky aby překračovaly hranice mřížky a netvořily linky
      const jLat = gridLat + (seededFloat(`rjlat_${id}`) - 0.5) * LAT_STEP * 1.5
      const jLng = gridLng + (seededFloat(`rjlng_${id}`) - 0.5) * LNG_STEP * 1.5

      spawns.push({
        id: `res_${ix}_${iy}`, // ID zachováme přehledné pro cooldowns
        lat: jLat, 
        lng: jLng, 
        type: rType,
        amount: Math.floor(seededFloat(`ramount_${id}`) * 2) + 1,
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
  force = false
): Promise<{ monsters: SpawnPoint[], resources: ResourceSpawn[], buildings: { lat: number, lng: number }[] }> {
  if (!isFinite(lat) || !isFinite(lng)) return { monsters: [], resources: [], buildings: [] }

  const cacheKey = `poi_cache_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  if (!force) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 3600000) { // 1 hodina cache
          return data.content;
        }
      } catch (e) { console.error("Cache read error:", e) }
    }
  }

  const query = `[out:json][timeout:60];
(
  // Monsters POIs
  nwr["historic"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["tourism"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["amenity"~"place_of_worship|museum|library|theatre"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["heritage"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  
  // Buildings to avoid
  nwr["building"](around:500,${lat},${lng});
  nwr["leisure"~"park|garden|nature_reserve|playground"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["landuse"~"forest|grass|orchard|flowerbed|allotments|meadow"](around:${OVERPASS_RADIUS_M},${lat},${lng});
  nwr["natural"~"water|wood|scrub|heath|grassland|rock|peak"](around:${OVERPASS_RADIUS_M},${lat},${lng});
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
    throw new Error(String(lastError) || "Všechny Overpass servery jsou zaneprázdněny");
  }

  const monsters: SpawnPoint[] = []
  const resources: ResourceSpawn[] = []
  const buildings: { lat: number, lng: number }[] = []
  const seenPos = new Set<string>()

  for (const el of json.elements ?? []) {
    const elLat: number = el.lat ?? el.center?.lat
    const elLng: number = el.lon ?? el.center?.lon
    if (elLat === undefined || elLng === undefined || !isFinite(elLat) || !isFinite(elLng)) continue

    if (el.tags && el.tags.building) {
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
      // 20% šance, že u historického místa nic nenaspanujeme (méně nepořádku na mapě)
      if (seededFloat(id + '_spawn_m') < 0.1) continue

      const isEpicSite = EPIC_TAGS.includes(tags.historic) || EPIC_TAGS.includes(tags.heritage)
      let rarity: SpawnRarity = 'common'

      if (isEpicSite) {
        rarity = 'epic'
      } else {
        const rRoll = seededFloat(id + '_rarity')
        if (rRoll < 0.25) rarity = 'rare'
        else if (rRoll < 0.05) rarity = 'epic' // Překvapivá epická i u menší památky
        else rarity = 'common'
      }

      monsters.push({
        id, lat: elLat, lng: elLng, rarity,
        monsterId: pickMonster(id, rarity),
        level: pickLevel(id, rarity),
        caught: isCollected,
      })
    } else {
      // Snížená hustota surovin z POI
      if (seededFloat(id + '_spawn') < 0.8) continue

      let type: ResourceType = 'crystal'
      let amount = Math.floor(seededFloat(id + '_amt') * 3) + 2

      if (tags.leisure || tags.landuse === 'forest' || tags.landuse === 'grass' || tags.landuse === 'orchard' || tags.natural === 'water') {
        // Obrovská redukce bylinek z parků a lesů (tráva je všude)
        if (seededFloat(id + '_herb_nerf') < 0.85) continue; 
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

  const result = { monsters, resources, buildings };
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), content: result }));
  return result;
}
