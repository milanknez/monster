const fs = require('fs');
const path = 'd:/wamp64/www/monster/src/data/resources.ts';
let content = fs.readFileSync(path, 'utf8');

// Helper to add recipe to a loot item
function addRecipe(lootId, recipeItems) {
    const searchStr = `"${lootId}": {`;
    const recipeStr = `\n    "recipe": ${JSON.stringify(recipeItems, null, 6).replace(/\n/g, '\n    ')},\n    "recipeAmount": 1,`;
    content = content.replace(searchStr, searchStr + recipeStr);
}

// 1. loot_1 (Sérum z krunýře)
addRecipe('loot_1', [
    { type: "mineral", count: 8 },
    { type: "energy", count: 2 }
]);

// 2. loot_2 (Dravý mutagen)
addRecipe('loot_2', [
    { type: "herb", count: 8 },
    { type: "crystal", count: 2 }
]);

// 3. loot_4 (Regenerační gel)
addRecipe('loot_4', [
    { type: "herb", count: 5 },
    { type: "crystal", count: 5 },
    { type: "mineral", count: 2 }
]);

// 4. loot_12 (tesákův luk)
addRecipe('loot_12', [
    { type: "mineral", count: 10 },
    { type: "crystal", count: 5 }
]);

// 5. loot_15 (báby svitek)
addRecipe('loot_15', [
    { type: "herb", count: 10 },
    { type: "crystal", count: 5 }
]);

fs.writeFileSync(path, content);
console.log('Relic recipes added to resources.ts');
