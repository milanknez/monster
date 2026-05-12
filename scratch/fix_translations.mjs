import fs from 'fs';

const filePath = 'd:/wamp64/www/monster/src/data/resources.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Regex to find RESOURCE_CONFIG = { ... };
const configMatch = content.match(/export const RESOURCE_CONFIG: Record<string, ResourceConfig> = (\{[\s\S]*?\});/);

if (configMatch) {
    let configStr = configMatch[1];
    
    // We can't easily parse this as JSON because it's JS (unquoted keys, etc.)
    // But we can do some clever regex replacements for common patterns.

    // 1. Fix descriptions that are just strings
    // "description": "Text", -> "description": { "cz": "Text", "en": "English", "sk": "Slovak" }
    configStr = configStr.replace(/"description":\s*"([^"]+)"/g, (match, text) => {
        let en = text;
        let sk = text;
        
        // Basic translation logic for stats
        if (text.includes('Zvyšuje útok o')) {
            const val = text.match(/\d+/)[0];
            const isPerc = text.includes('%');
            en = `Increases attack by ${val}${isPerc ? '%' : ' points'}.`;
            sk = `Zvyšuje útok o ${val}${isPerc ? '%' : ' bodov'}.`;
        } else if (text.includes('Zvyšuje obranu o')) {
            const val = text.match(/\d+/)[0];
            const isPerc = text.includes('%');
            en = `Increases defense by ${val}${isPerc ? '%' : ' points'}.`;
            sk = `Zvyšuje obranu o ${val}${isPerc ? '%' : ' bodov'}.`;
        } else if (text.includes('Zvyšuje zdraví o')) {
            const val = text.match(/\d+/)[0];
            const isPerc = text.includes('%');
            en = `Increases health by ${val}${isPerc ? '%' : ' points'}.`;
            sk = `Zvyšuje zdravie o ${val}${isPerc ? '%' : ' bodov'}.`;
        } else if (text.includes('Trvale vylepší tvé monstrum')) {
            const stats = text.match(/\([^\)]+\)/)[0];
            en = `Permanently improves your monster ${stats}.`;
            sk = `Trvale vylepší tvoje monštrum ${stats}.`;
        } else if (text.includes('Zpevní kůži')) {
            en = "Strengthens your monster's skin with a permanent bonus (+5 DEF).";
            sk = "Spevní kožu tvojho monštra trvalým bonusom (+5 DEF).";
        } else if (text.includes('Zvýší hustotu krve')) {
            en = "Increases blood density, strengthening stamina and resistance (+20 HP, +3 DEF).";
            sk = "Zvýši hustotu krvi, posilní výdrž i odolnosť (+20 HP, +3 DEF).";
        } else if (text.includes('Bio-gel')) {
            en = "Bio-gel accelerating tissue recovery (+10 HP, +2 DEF).";
            sk = "Bio-gél urýchľujúci obnovu tkanív (+10 HP, +2 DEF).";
        } else if (text.includes('Čistý extrakt')) {
            en = "Pure adrenal gland extract for higher combat strength (+8 ATK).";
            sk = "Čistý extrakt z nadobličiek pre vyššiu silu v boji (+8 ATK).";
        } else if (text.includes('Vylepšený genetický kód')) {
            en = "Improved genetic code for an overall stat boost (+5 ATK, +5 DEF).";
            sk = "Vylepšený genetický kód pre celkové zvýšenie štatistík (+5 ATK, +5 DEF).";
        } else if (text.includes('Vulkanický kondenzát')) {
            en = "Obtained from fire monsters, brutally increases attack (+10 ATK).";
            sk = "Získava sa z ohnivých monštier, brutálne zvýši útok (+10 ATK).";
        } else if (text.includes('Glaciální esence')) {
            en = "Freezes the monster's body surface into an icy shell (+10 DEF).";
            sk = "Zmrazí povrch tela monštra do ľadového panciera (+10 DEF).";
        } else if (text.includes('Mutagenní biomasa')) {
            en = "Massive increase in monster muscle and organ mass (+50 HP).";
            sk = "Masívny nárast svalovej a orgánovej hmoty monštra (+50 HP).";
        }

        return `"description": { "cz": "${text}", "en": "${en}", "sk": "${sk}" }`;
    });

    // 2. Fix labels that are just strings
    configStr = configStr.replace(/"label":\s*"([^"]+)"/g, (match, text) => {
        let en = text;
        let sk = text;
        
        if (text === "Sérum z krunýře") { en = "Shell Serum"; sk = "Sérum z panciera"; }
        else if (text === "Regenerační gel") { en = "Regeneration Gel"; sk = "Regeneračný gél"; }
        else if (text === "Adrenalinový extrakt") { en = "Adrenaline Extract"; sk = "Adrenalínový extrakt"; }
        else if (text === "Stabilizovaná DNA") { en = "Stabilized DNA"; sk = "Stabilizovaná DNA"; }
        else if (text === "Vulkanický kondenzát") { en = "Volcanic Condensate"; sk = "Vulkanický kondenzát"; }
        else if (text === "Glaciální esence") { en = "Glacial Essence"; sk = "Glaciálna esencia"; }
        else if (text === "Mutagenní biomasa") { en = "Mutagenic Biomass"; sk = "Mutagénna biomasa"; }
        else if (text === "Dračí krev") { en = "Dragon Blood"; sk = "Dračia krv"; }
        else if (text === "Prastarý Artefakt") { en = "Ancient Artifact"; sk = "Prastarý Artefakt"; }

        return `"label": { "cz": "${text}", "en": "${en}", "sk": "${sk}" }`;
    });

    content = content.replace(configMatch[1], configStr);
    fs.writeFileSync(filePath, content);
    console.log("Translations fixed successfully.");
} else {
    console.log("RESOURCE_CONFIG not found.");
}
