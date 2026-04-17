const fs = require('fs');
const path = 'd:/wamp64/www/monster/src/hooks/useMonsters.ts';
let content = fs.readFileSync(path, 'utf8');

const oldFn = `  const updateMonsterStats = useCallback((monsterIdx: number, stats: { hp?: number, atk?: number, def?: number }) => {
    setCaughtMonsters(prev => {
      const updated = [...prev]
      if (!updated[monsterIdx]) return prev

      const m = { ...updated[monsterIdx] }
      const oldStats = m.stats || { hp: 100, attack: 10, defense: 10 };
      m.stats = {
        hp: oldStats.hp + (stats.hp || 0),
        attack: oldStats.attack + (stats.atk || 0),
        defense: oldStats.defense + (stats.def || 0)
      }

      updated[monsterIdx] = m
      return updated
    })
  }, [])`;

const newFn = `  const updateMonsterStats = useCallback((monsterIdx: number, stats: { hp?: number, atk?: number, def?: number }, itemId?: string) => {
    setCaughtMonsters(prev => {
      const updated = [...prev]
      if (!updated[monsterIdx]) return prev

      const m = { ...updated[monsterIdx] }
      const oldStats = m.stats || { hp: 100, attack: 10, defense: 10 };
      m.stats = {
        hp: oldStats.hp + (stats.hp || 0),
        attack: oldStats.attack + (stats.atk || 0),
        defense: oldStats.defense + (stats.def || 0)
      }

      if (itemId) {
        const mutations = [...(m.mutations || [])];
        mutations.push({
          id: itemId,
          stats: { ...stats },
          timestamp: Date.now()
        });
        m.mutations = mutations;
      }

      updated[monsterIdx] = m
      return updated
    })
  }, [])`;

if (content.includes('const updateMonsterStats = useCallback')) {
    // Replace the whole function
    const startIdx = content.indexOf('const updateMonsterStats = useCallback');
    const endIdx = content.indexOf('}, [])', startIdx) + 6;
    content = content.substring(0, startIdx) + newFn + content.substring(endIdx);
    fs.writeFileSync(path, content);
    console.log('updateMonsterStats updated with mutation recording');
} else {
    console.log('Could not find updateMonsterStats');
}
