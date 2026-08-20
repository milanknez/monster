import { dungeonsDB } from '../data/dungeons';

function runRaidSimulation(dungeonId = 'dark_cave') {
  const dungeon = dungeonsDB.find(d => d.id === dungeonId) || dungeonsDB[0];
  console.log(`\n==================================================`);
  console.log(`⚔️ SIMULACE DUNGEONU: ${dungeon.name.cz} (Doporučený Level: ${dungeon.recommendedLevel})`);
  console.log(`==================================================\n`);

  // Setup 4x Level 15 Party (Tank, Healer, 2x DPS)
  const party = [
    { name: 'Tank (🛡️)', hp: 2200, maxHp: 2200, dps: 90, isHealer: false },
    { name: 'Healer (💚)', hp: 1200, maxHp: 1200, dps: 70, isHealer: true },
    { name: 'DPS #1 (⚔️)', hp: 1400, maxHp: 1400, dps: 210, isHealer: false },
    { name: 'DPS #2 (⚔️)', hp: 1400, maxHp: 1400, dps: 190, isHealer: false },
  ];

  let totalCombatSeconds = 0;
  let totalDamageTaken = 0;
  let totalHealingDone = 0;

  for (const wave of dungeon.waves) {
    console.log(`--- VLNA ${wave.waveIndex}: ${wave.enemyCount}x Monstrum (HP: ${wave.baseHp}${wave.shield ? ', Shield: ' + wave.shield : ''}) ---`);
    let waveEnemiesHp = (wave.baseHp + (wave.shield || 0)) * wave.enemyCount;
    let waveSeconds = 0;

    while (waveEnemiesHp > 0 && party.some(p => p.hp > 0)) {
      waveSeconds += 0.5;
      totalCombatSeconds += 0.5;

      // Group DPS
      const groupDps = party.filter(p => p.hp > 0).reduce((sum, p) => sum + p.dps, 0);
      waveEnemiesHp -= groupDps * 0.5;

      // Enemy DPS against target (Tank takes threat)
      const enemyDps = wave.waveIndex === 3 ? 180 : (wave.waveIndex === 2 ? 110 : 70);
      const target = party.find(p => p.hp > 0) || party[0];
      const damageThisTick = enemyDps * 0.5;
      target.hp -= damageThisTick;
      totalDamageTaken += damageThisTick;

      // Healer rotation every 4s
      if (Math.floor(waveSeconds) % 4 === 0) {
        const lowestHpPlayer = party.filter(p => p.hp > 0).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
        if (lowestHpPlayer) {
          const healAmount = Math.round(lowestHpPlayer.maxHp * 0.35);
          lowestHpPlayer.hp = Math.min(lowestHpPlayer.maxHp, lowestHpPlayer.hp + healAmount);
          totalHealingDone += healAmount;
        }
      }
    }

    console.log(`✅ Vlna ${wave.waveIndex} dokončena za ${waveSeconds.toFixed(1)} sekund!`);
  }

  const mins = Math.floor(totalCombatSeconds / 60);
  const secs = Math.floor(totalCombatSeconds % 60);

  console.log(`\n==================================================`);
  console.log(`🏆 VÝSLEDEK BENCHMARKU RAIDU`);
  console.log(`==================================================`);
  console.log(`⏱️ Celkový čas boje: ${mins} min ${secs} sek (${totalCombatSeconds.toFixed(1)} s)`);
  console.log(`💥 Utrpené poškození: ${Math.round(totalDamageTaken)} DMG`);
  console.log(`💚 Celkové léčení: ${Math.round(totalHealingDone)} HP`);
  console.log(`🛡️ Stav party na konci:`);
  party.forEach(p => console.log(`   - ${p.name}: ${Math.max(0, Math.round(p.hp))}/${p.maxHp} HP (${p.hp > 0 ? 'PŘEŽIL ✅' : 'MRTEV 💀'})`));
  console.log(`==================================================\n`);
}

runRaidSimulation('dark_cave');
