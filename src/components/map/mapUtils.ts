import L from 'leaflet'
import { monsterDB } from '../../data/monsters'
import type { SpawnPoint, SpawnRarity } from '../../types'

export const RARITY_COLORS: Record<SpawnRarity, { bg: string; border: string; glow: string; badge: string; label: string }> = {
  common: { bg: '#0f172a', border: '#475569', glow: '#64748b', badge: '#334155', label: '#94a3b8' },
  rare: { bg: '#1e0a3c', border: '#9333ea', glow: '#a855f7', badge: '#4c1d95', label: '#d8b4fe' },
  epic: { bg: '#1c0a00', border: '#ea580c', glow: '#f97316', badge: '#7c2d12', label: '#fed7aa' },
}

export const RESOURCE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  crystal: { color: '#0db9f2', label: 'Krystal', icon: '💎' },
  herb: { color: '#10b981', label: 'Bylinka', icon: '🌿' },
  energy: { color: '#f59e0b', label: 'Energie', icon: '⚡' },
  mineral: { color: '#64748b', label: 'Minerál', icon: '🪨' },
  xp_booster: { color: '#ec4899', label: 'XP Elixír', icon: '🧪' },
  hp_potion: { color: '#ef4444', label: 'Lékárnička', icon: '❤️' },
  energy_drink: { color: '#3b82f6', label: 'Energy Drink', icon: '🎒' },
  magic_crystal: { color: '#a855f7', label: 'Magický Krystal', icon: '🔮' },
  super_mineral: { color: '#ea580c', label: 'Vzácný Minerál', icon: '🌋' },
  
  // RED GEMS
  gem_red_1: { color: '#ef4444', label: 'Rudý Jaspis I', icon: '🔴' },
  gem_red_2: { color: '#ef4444', label: 'Rudý Jaspis II', icon: '🔴' },
  gem_red_3: { color: '#ef4444', label: 'Rudý Jaspis III', icon: '🔴' },
  gem_red_4: { color: '#ef4444', label: 'Rudý Jaspis IV', icon: '💠' },
  gem_red_5: { color: '#ef4444', label: 'Rudý Jaspis V', icon: '💠' },
  gem_red_6: { color: '#ef4444', label: 'Rudý Jaspis VI', icon: '💠' },
  
  // GREEN GEMS
  gem_green_1: { color: '#10b981', label: 'Zelený Nefrit I', icon: '🟢' },
  gem_green_2: { color: '#10b981', label: 'Zelený Nefrit II', icon: '🟢' },
  gem_green_3: { color: '#10b981', label: 'Zelený Nefrit III', icon: '🟢' },
  gem_green_4: { color: '#10b981', label: 'Zelený Nefrit IV', icon: '🌿' },
  gem_green_5: { color: '#10b981', label: 'Zelený Nefrit V', icon: '🌿' },
  gem_green_6: { color: '#10b981', label: 'Zelený Nefrit VI', icon: '🌿' },
  
  // WHITE GEMS
  gem_white_1: { color: '#e2e8f0', label: 'Bílý Křemen I', icon: '⚪' },
  gem_white_2: { color: '#e2e8f0', label: 'Bílý Křemen II', icon: '⚪' },
  gem_white_3: { color: '#e2e8f0', label: 'Bílý Křemen III', icon: '⚪' },
  gem_white_4: { color: '#e2e8f0', label: 'Bílý Křemen IV', icon: '💎' },
  gem_white_5: { color: '#e2e8f0', label: 'Bílý Křemen V', icon: '💎' },
  gem_white_6: { color: '#e2e8f0', label: 'Bílý Křemen VI', icon: '💎' },
}

export const SILHOUETTE_SVG = `<path d="M50 10 C35 10 25 20 25 32 C25 38 27 43 32 47 L28 55 C26 60 30 65 35 63 L38 61 C40 64 44 66 50 66 C56 66 60 64 62 61 L65 63 C70 65 74 60 72 55 L68 47 C73 43 75 38 75 32 C75 20 65 10 50 10 Z" fill="currentColor"/><circle cx="40" cy="30" r="4" fill="rgba(0,0,0,0.5)"/><circle cx="60" cy="30" r="4" fill="rgba(0,0,0,0.5)"/>`

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!isFinite(lat1) || !isFinite(lng1) || !isFinite(lat2) || !isFinite(lng2)) return 999999
  const R = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function metersToLatDeg(m: number) { return m / 111_320 }
export function metersToLngDeg(m: number, lat: number) {
  const cosLat = Math.cos(lat * Math.PI / 180)
  return m / (111_320 * (Math.abs(cosLat) < 0.00001 ? 0.00001 : cosLat))
}

export function seededFloat(seed: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0
  }
  return (h >>> 0) / 0xFFFFFFFF
}

export function pickMonster(seed: string, rarity: SpawnRarity): string {
  const pool = monsterDB.filter(m => {
    const r = (m.rarity || '').toLowerCase()
    if (rarity === 'epic') return r === 'epická' || r === 'legendární' || r === 'epic' || r === 'legendary'
    if (rarity === 'rare') return r === 'vzácná' || r === 'rare'
    return r === 'běžná' || r === 'neobvyklá' || r === 'common' || r === 'uncommon'
  })
  const arr = pool.length ? pool : monsterDB
  const mSeed = seed + '_species'
  const index = Math.floor(seededFloat(mSeed) * arr.length)
  return arr[index].id
}

export function pickLevel(seed: string, rarity: SpawnRarity): number {
  const r = seededFloat(seed + '_lvl')
  if (rarity === 'common') {
    if (r < 0.10) return 3
    return r < 0.45 ? 2 : 1
  }
  if (rarity === 'rare') return 3 + Math.floor(r * 4)
  return 7 + Math.floor(r * 4)
}

export function calculateHPCost(level: number, rarity: SpawnRarity) {
  const base = 25
  const rarityBonus = rarity === 'epic' ? 15 : rarity === 'rare' ? 7 : 0
  return base + (level * 2) + rarityBonus
}

export function makeMarkerIcon(spawn: SpawnPoint, isNearby: boolean, isLocked: boolean): L.DivIcon {
  const c = RARITY_COLORS[spawn.rarity]
  const outerSize = spawn.rarity === 'epic' ? 48 : spawn.rarity === 'rare' ? 42 : 36
  const innerR = 32
  
  // Silhouette added as background even when locked to show it's a monster
  const silhouette = `<g transform="translate(18, 18) scale(0.64)" opacity="0.4" style="color:${c.label}">${SILHOUETTE_SVG}</g>`
  
  const lockOverlay = isLocked
    ? `<g transform="translate(30, 30) scale(1.6)"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v3H9V7zm3 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="#ef4444" stroke="#000" stroke-width="0.5"/></g>`
    : `<text x="50" y="60" text-anchor="middle" font-size="42" font-weight="bold" fill="${c.label}" filter="url(#mg)">?</text>`
  
  const pulse = isNearby && !isLocked ? `<circle cx="50" cy="50" r="46" fill="none" stroke="${c.glow}" stroke-width="3" opacity="0.7"><animate attributeName="r" values="42;50;42" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8" dur="1.2s" repeatCount="indefinite"/></circle>` : ''
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerSize}" height="${outerSize + 10}" viewBox="0 0 100 115">
    <defs>
      <filter id="mg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${pulse}
    <circle cx="50" cy="50" r="${innerR}" fill="${c.bg}" stroke="${c.border}" stroke-width="3.5" filter="url(#mg)"/>
    ${silhouette}
    ${lockOverlay}
    <rect x="28" y="76" width="44" height="18" rx="9" fill="${c.badge}" stroke="${c.border}" stroke-width="1.5"/>
    <text x="50" y="89" text-anchor="middle" font-size="13" font-weight="bold" fill="${c.label}">Lv.${spawn.level}</text>
  </svg>`
  
  return L.divIcon({ html: svg, className: '', iconSize: [outerSize, outerSize + 10], iconAnchor: [outerSize / 2, outerSize / 2] })
}

export function makeResourceIcon(type: string, isNearby: boolean): L.DivIcon {
  const conf = RESOURCE_CONFIG[type] || RESOURCE_CONFIG.crystal
  const size = 32
  const pulse = isNearby ? `<circle cx="50" cy="50" r="46" fill="none" stroke="${conf.color}" stroke-width="3" opacity="0.7"><animate attributeName="r" values="32;50;32" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/></circle>` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${pulse}<circle cx="50" cy="50" r="30" fill="rgba(0,0,0,0.6)" stroke="${conf.color}" stroke-width="2"/><text x="50" y="65" text-anchor="middle" font-size="45">${conf.icon}</text></svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

export function makeResourceTooltipHtml(type: string, amount: number): string {
  const conf = RESOURCE_CONFIG[type] || RESOURCE_CONFIG.crystal
  return `<div style="text-align:center;min-width:80px;"><div style="font-size:24px;margin-bottom:2px;">${conf.icon}</div><div style="color:${conf.color};font-size:12px;font-weight:900;text-transform:uppercase;">${conf.label}</div><div style="color:#94a3b8;font-size:10px;font-weight:bold;">Množství: ${amount}</div></div>`
}

export function makeTooltipHtml(spawn: SpawnPoint, playerLevel: number): string {
  const c = RARITY_COLORS[spawn.rarity]
  const locked = spawn.level > playerLevel
  const rarityLabel = spawn.rarity === 'epic' ? '🏰 Epická' : spawn.rarity === 'rare' ? '🏛 Vzácná' : '⚔️ Běžná'
  const energyCost = calculateHPCost(spawn.level, spawn.rarity)
  return `<div style="text-align:center;min-width:90px;"><svg width="48" height="52" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="42" r="38" fill="${c.bg}" stroke="${c.border}" stroke-width="3"/><g style="color:${c.label}">${SILHOUETTE_SVG}</g></svg><div style="color:${c.label};font-size:13px;font-weight:800;margin-top:2px;">Lv. ${spawn.level}</div><div style="color:#64748b;font-size:10px;">${rarityLabel}</div><div style="color:#ef4444;font-size:9px;margin-top:3px;font-weight:bold;">⚡ -${energyCost}% ENERGIE</div>${locked ? `<div style="color:#ef4444;font-size:10px;margin-top:2px;">🔒 Vyžaduje Lv.${spawn.level}</div>` : ''}</div>`
}

export function makePlayerIcon(): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100"><defs><filter id="pg"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="50" cy="50" r="44" fill="rgba(13,185,242,0.1)" stroke="#0db9f2" stroke-width="2"><animate attributeName="r" values="38;46;38" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/></circle><circle cx="50" cy="50" r="20" fill="#0db9f2" filter="url(#pg)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [28, 28], iconAnchor: [14, 14] })
}

export function makeOtherPlayerIcon(name: string, seed: string, style?: string): L.DivIcon {
  const svg = `
    <div style="position:relative; width:30px; height:30px;">
      <div style="position:absolute; inset:-3px; background:rgba(168,85,247,0.2); border-radius:50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position:relative; width:30px; height:30px; background:#1e1b4b; border:2px solid #a855f7; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(168,85,247,0.4);">
        <img src="https://api.dicebear.com/7.x/${style || 'avataaars'}/svg?seed=${seed || name}" style="width:100%; height:100%; object-fit:cover;" />
      </div>
      <div style="position:absolute; top:-15px; left:50%; translate:-50% 0; background:rgba(0,0,0,0.8); padding:1px 4px; border-radius:3px; border:1px solid rgba(168,85,247,0.3); white-space:nowrap;">
        <span style="color:#e9d5ff; font-size:8px; font-weight:900; text-transform:uppercase; letter-spacing:0.04em;">${name}</span>
      </div>
    </div>
  `;
  return L.divIcon({ html: svg, className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
}
