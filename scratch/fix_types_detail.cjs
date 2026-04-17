const fs = require('fs');
const path = 'd:/wamp64/www/monster/src/components/bestiary/MonsterDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix interface
content = content.replace(
    'onRelease?: () => void;',
    'onPermanentlyUpgrade?: (itemType: string, stats: any) => void;\n  onRelease?: () => void;'
);

// 2. Fix the "cfg.stats possibly undefined" in labels
// Pattern: {(cfg.stats?.atk || 0) > 0 ? '+' : ''}{cfg.stats.atk}
content = content.replace(/\{cfg\.stats\.atk\}/g, '{cfg.stats?.atk}');
content = content.replace(/\{cfg\.stats\.hp\}/g, '{cfg.stats?.hp}');
content = content.replace(/\{cfg\.stats\.def\}/g, '{cfg.stats?.def}');

fs.writeFileSync(path, content);
console.log('MonsterDetail.tsx: Interface updated and strict null checks added for stats.');
