function seededFloat(seed) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0
  }
  return (h >>> 0) / 0xFFFFFFFF
}

const arrLen = 4;
const counts = {};

for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    const id = `grid_${55000 + x}_${10000 + y}`;
    const f = seededFloat(id);
    const idx = Math.floor(f * arrLen);
    counts[idx] = (counts[idx] || 0) + 1;
    // console.log(`${id}: ${idx}`);
  }
}

console.log(counts);
