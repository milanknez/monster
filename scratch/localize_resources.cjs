
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/resources.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Translations Map
const labels = {
    "Krystal": { "cz": "Krystal", "en": "Crystal", "sk": "Kryštál" },
    "Bylinka": { "cz": "Bylinka", "en": "Herb", "sk": "Bylinka" },
    "Energie": { "cz": "Energie", "en": "Energy", "sk": "Energia" },
    "Minerál": { "cz": "Minerál", "en": "Mineral", "sk": "Minerál" },
    "Magický Krystal": { "cz": "Magický Krystal", "en": "Magic Crystal", "sk": "Magický Kryštál" },
    "Vzácný Minerál": { "cz": "Vzácný Minerál", "en": "Rare Mineral", "sk": "Vzácny Minerál" },
    "Tajemné vajíčko": { "cz": "Tajemné vajíčko", "en": "Mysterious Egg", "sk": "Tajomné vajíčko" },
    "XP Elixír": { "cz": "XP Elixír", "en": "XP Elixir", "sk": "XP Elixír" },
    "HP Potion": { "cz": "HP Potion", "en": "HP Potion", "sk": "HP Potion" },
    "Mana Potion": { "cz": "Mana Potion", "en": "Mana Potion", "sk": "Mana Potion" },
    "Ohnivý Drahokam": { "cz": "Ohnivý Drahokam", "en": "Fire Gem", "sk": "Ohnivý Drahokam" },
    "Vodní Drahokam": { "cz": "Vodní Drahokam", "en": "Water Gem", "sk": "Vodný Drahokam" },
    "Přírodní Drahokam": { "cz": "Přírodní Drahokam", "en": "Nature Gem", "sk": "Prírodný Drahokam" },
    "Rudý Jaspis 1": { "cz": "Rudý Jaspis 1", "en": "Red Jasper 1", "sk": "Červený Jaspis 1" },
    "Zelený Nefrit 1": { "cz": "Zelený Nefrit 1", "en": "Green Jade 1", "sk": "Zelený Nefrit 1" },
    "Bílý Křemen 1": { "cz": "Bílý Křemen 1", "en": "White Quartz 1", "sk": "Biely Kremeň 1" },
    "Rudý Jaspis 2": { "cz": "Rudý Jaspis 2", "en": "Red Jasper 2", "sk": "Červený Jaspis 2" },
    "Zelený Nefrit 2": { "cz": "Zelený Nefrit 2", "en": "Green Jade 2", "sk": "Zelený Nefrit 2" },
    "Bílý Křemen 2": { "cz": "Bílý Křemen 2", "en": "White Quartz 2", "sk": "Biely Kremeň 2" },
    "Rudý Jaspis 3": { "cz": "Rudý Jaspis 3", "en": "Red Jasper 3", "sk": "Červený Jaspis 3" },
    "Zelený Nefrit 3": { "cz": "Zelený Nefrit 3", "en": "Green Jade 3", "sk": "Zelený Nefrit 3" },
    "Bílý Křemen 3": { "cz": "Bílý Křemen 3", "en": "White Quartz 3", "sk": "Biely Kremeň 3" },
    "Rudý Jaspis 4": { "cz": "Rudý Jaspis 4", "en": "Red Jasper 4", "sk": "Červený Jaspis 4" },
    "Zelený Nefrit 4": { "cz": "Zelený Nefrit 4", "en": "Green Jade 4", "sk": "Zelený Nefrit 4" },
    "Bílý Křemen 4": { "cz": "Bílý Křemen 4", "en": "White Quartz 4", "sk": "Biely Kremeň 4" },
    "Rudý Jaspis 5": { "cz": "Rudý Jaspis 5", "en": "Red Jasper 5", "sk": "Červený Jaspis 5" },
    "Zelený Nefrit 5": { "cz": "Zelený Nefrit 5", "en": "Green Jade 5", "sk": "Zelený Nefrit 5" },
    "Bílý Křemen 5": { "cz": "Bílý Křemen 5", "en": "White Quartz 5", "sk": "Biely Kremeň 5" },
    "Rudý Jaspis 6": { "cz": "Rudý Jaspis 6", "en": "Red Jasper 6", "sk": "Červený Jaspis 6" },
    "Zelený Nefrit 6": { "cz": "Zelený Nefrit 6", "en": "Green Jade 6", "sk": "Zelený Nefrit 6" },
    "Bílý Křemen 6": { "cz": "Bílý Křemen 6", "en": "White Quartz 6", "sk": "Biely Kremeň 6" },
    "Zasněná aura": { "cz": "Zasněná aura", "en": "Dreamy Aura", "sk": "Zasnená aura" },
    "Dravý mutagen": { "cz": "Dravý mutagen", "en": "Predatory Mutagen", "sk": "Dravý mutagén" },
    "Zahušťovač krve": { "cz": "Zahušťovač krve", "en": "Blood Thickener", "sk": "Zahusťovač krvi" },
    "Pevná kůže": { "cz": "Pevná kůže", "en": "Tough Skin", "sk": "Pevná koža" },
    "Plášť stínu": { "cz": "Plášť stínu", "en": "Shadow Cloak", "sk": "Plášť tieňa" },
    "Drtič kostí": { "cz": "Drtič kostí", "en": "Bone Crusher", "sk": "Drvič kostí" },
    "Křišťálové srdce": { "cz": "Křišťálové srdce", "en": "Crystal Heart", "sk": "Kryštálové srdce" },
    "Dračí dech": { "cz": "Dračí dech", "en": "Dragon Breath", "sk": "Dračí dych" },
    "Kamenný strážce": { "cz": "Kamenný strážce", "en": "Stone Guardian", "sk": "Kamenný strážca" },
    "Blesková esence": { "cz": "Blesková esence", "en": "Lightning Essence", "sk": "Blesková esencia" },
    "Mrazivý dotek": { "cz": "Mrazivý dotek", "en": "Frosty Touch", "sk": "Mrazivý dotyk" },
    "Trnový věnec": { "cz": "Trnový věnec", "en": "Thorn Wreath", "sk": "Tŕňový veniec" },
    "meč skázy": { "cz": "meč skázy", "en": "Sword of Doom", "sk": "Meč skazy" },
    "Magická Truhla": { "cz": "Magická Truhla", "en": "Magic Chest", "sk": "Magická truhlica" },
    "báby svitek": { "cz": "báby svitek", "en": "Old Hag's Scroll", "sk": "Babský zvitok" },
    "Asasínská relikvie": { "cz": "Asasínská relikvie", "en": "Assassin's Relic", "sk": "Asasínska relikvia" },
    "zub času": { "cz": "zub času", "en": "Tooth of Time", "sk": "Zub času" },
    "Stará kost": { "cz": "Stará kost", "en": "Old Bone", "sk": "Stará kosť" },
    "Prasklá lebka": { "cz": "Prasklá lebka", "en": "Cracked Skull", "sk": "Prasknutá lebka" },
    "ocelový řetěz": { "cz": "ocelový řetěz", "en": "Steel Chain", "sk": "Oceľová reťaz" },
    "Tajemný přívěšek": { "cz": "Tajemný přívěšek", "en": "Mysterious Pendant", "sk": "Tajomný prívesok" },
    "Stará mince": { "cz": "Stará mince", "en": "Old Coin", "sk": "Stará minca" },
    "Prázdná ulita": { "cz": "Prázdná ulita", "en": "Empty Shell", "sk": "Prázdna ulita" },
    "Ostrý kámen": { "cz": "Ostrý kámen", "en": "Sharp Stone", "sk": "Ostrý kameň" },
    "Dřevěný špalek": { "cz": "Dřevěný špalek", "en": "Wooden Block", "sk": "Drevený poleno" },
    "Starý pergamen": { "cz": "Starý pergamen", "en": "Old Parchment", "sk": "Starý pergamen" },
    "Dřevěný štít": { "cz": "Dřevěný štít", "en": "Wooden Shield", "sk": "Drevený štít" },
    "Malý lektvar": { "cz": "Malý lektvar", "en": "Small Potion", "sk": "Malý lektvar" },
    "Zrezivělý hřebík": { "cz": "Zrezivělý hřebík", "en": "Rusty Nail", "sk": "Zhrdzavený klinec" },
    "Stará rukavice": { "cz": "Stará rukavice", "en": "Old Glove", "sk": "Stará rukavica" },
    "Tupá dýka": { "cz": "Tupá dýka", "en": "Blunt Dagger", "sk": "Tupá dýka" },
    "Psí tlapka": { "cz": "Psí tlapka", "en": "Dog Paw", "sk": "Psia labka" }
};

const descriptions = {
    "Běžný drahokam sloužící k vylepšování základních atributů.": { "cz": "Běžný drahokam sloužící k vylepšování základních atributů.", "en": "Common gem used for upgrading basic attributes.", "sk": "Bežný drahokam slúžiaci na vylepšovanie základných atribútov." },
    "Přírodní surovina pro vaření lektvarů.": { "cz": "Přírodní surovina pro vaření lektvarů.", "en": "Natural resource for brewing potions.", "sk": "Prírodná surovina na varenie lektvarov." },
    "Kondenzovaná elektrická energie.": { "cz": "Kondenzovaná elektrická energie.", "en": "Condensed electrical energy.", "sk": "Kondenzovaná elektrická energia." },
    "Tvrdý stavební kámen.": { "cz": "Tvrdý stavební kámen.", "en": "Hard construction stone.", "sk": "Tvrdý stavebný kameň." },
    "Vzácný magický drahokam.": { "cz": "Vzácný magický drahokam.", "en": "Rare magical gem.", "sk": "Vzácny magický drahokam." },
    "Ohněm kovaný kámen.": { "cz": "Ohněm kovaný kámen.", "en": "Fire-forged stone.", "sk": "Ohňom kovaný kameň." },
    "Vylíhne se na vzácnou příšerku.": { "cz": "Vylíhne se na vzácnou příšerku.", "en": "Hatches into a rare monster.", "sk": "Vyliahne sa z neho vzácna príšerka." },
    "Dvojitý zisk XP na 15 minut.": { "cz": "Dvojitý zisk XP na 15 minut.", "en": "Double XP gain for 15 minutes.", "sk": "Dvojitý zisk XP na 15 minút." },
    "Okamžitě vyléčí 50 HP.": { "cz": "Okamžitě vyléčí 50 HP.", "en": "Instantly heals 50 HP.", "sk": "Okamžite vylieči 50 HP." },
    "Obnoví 60 bodů many (výdrže).": { "cz": "Obnoví 60 bodů many (výdrže).", "en": "Restores 60 mana points (stamina).", "sk": "Obnoví 60 bodov many (výdrže)." },
    "Zvyšuje útok o 15%.": { "cz": "Zvyšuje útok o 15%.", "en": "Increases attack by 15%.", "sk": "Zvyšuje útok o 15%." },
    "Zvyšuje zdraví o 15%.": { "cz": "Zvyšuje zdraví o 15%.", "en": "Increases health by 15%.", "sk": "Zvyšuje zdravie o 15%." },
    "Zvyšuje obranu o 15%.": { "cz": "Zvyšuje obranu o 15%.", "en": "Increases defense by 15%.", "sk": "Zvyšuje obranu o 15%." },
    "Zvyšuje útok o 6 bodů.": { "cz": "Zvyšuje útok o 6 bodů.", "en": "Increases attack by 6 points.", "sk": "Zvyšuje útok o 6 bodov." },
    "Zvyšuje zdraví o 15 bodů.": { "cz": "Zvyšuje zdraví o 15 bodů.", "en": "Increases health by 15 points.", "sk": "Zvyšuje zdravie o 15 bodov." },
    "Zvyšuje obranu o 4 body.": { "cz": "Zvyšuje obranu o 4 body.", "en": "Increases defense by 4 points.", "sk": "Zvyšuje obranu o 4 body." },
    "Zvyšuje útok o 12 bodů.": { "cz": "Zvyšuje útok o 12 bodů.", "en": "Increases attack by 12 points.", "sk": "Zvyšuje útok o 12 bodov." },
    "Zvyšuje zdraví o 30 bodů.": { "cz": "Zvyšuje zdraví o 30 bodů.", "en": "Increases health by 30 points.", "sk": "Zvyšuje zdravie o 30 bodov." },
    "Zvyšuje obranu o 8 body.": { "cz": "Zvyšuje obranu o 8 body.", "en": "Increases defense by 8 points.", "sk": "Zvyšuje obranu o 8 body." },
    "Zvyšuje útok o 20 bodů.": { "cz": "Zvyšuje útok o 20 bodů.", "en": "Increases attack by 20 points.", "sk": "Zvyšuje útok o 20 bodov." },
    "Zvyšuje zdraví o 50 bodů.": { "cz": "Zvyšuje zdraví o 50 bodů.", "en": "Increases health by 50 points.", "sk": "Zvyšuje zdravie o 50 bodov." },
    "Zvyšuje obranu o 12 body.": { "cz": "Zvyšuje obranu o 12 body.", "en": "Increases defense by 12 points.", "sk": "Zvyšuje obranu o 12 body." },
    "Zvyšuje útok o 35 bodů.": { "cz": "Zvyšuje útok o 35 bodů.", "en": "Increases attack by 35 points.", "sk": "Zvyšuje útok o 35 bodov." },
    "Zvyšuje zdraví o 100 bodů.": { "cz": "Zvyšuje zdraví o 100 bodů.", "en": "Increases health by 100 points.", "sk": "Zvyšuje zdravie o 100 bodov." },
    "Zvyšuje obranu o 20 bodů.": { "cz": "Zvyšuje obranu o 20 bodů.", "en": "Increases defense by 20 points.", "sk": "Zvyšuje obranu o 20 bodov." },
    "Zvyšuje útok o 50 bodů.": { "cz": "Zvyšuje útok o 50 bodů.", "en": "Increases attack by 50 points.", "sk": "Zvyšuje útok o 50 bodov." },
    "Zvyšuje zdraví o 150 bodů.": { "cz": "Zvyšuje zdraví o 150 bodů.", "en": "Increases health by 150 points.", "sk": "Zvyšuje zdravie o 150 bodov." },
    "Zvyšuje obranu o 30 bodů.": { "cz": "Zvyšuje obranu o 30 bodů.", "en": "Increases defense by 30 points.", "sk": "Zvyšuje obranu o 30 bodov." },
    "Zvyšuje útok o 75 bodů.": { "cz": "Zvyšuje útok o 75 bodů.", "en": "Increases attack by 75 points.", "sk": "Zvyšuje útok o 75 bodov." },
    "Zvyšuje zdraví o 200 bodů.": { "cz": "Zvyšuje zdraví o 200 bodů.", "en": "Increases health by 200 points.", "sk": "Zvyšuje zdravie o 200 bodov." },
    "Zvyšuje obranu o 45 bodů.": { "cz": "Zvyšuje obranu o 45 bodů.", "en": "Increases defense by 45 points.", "sk": "Zvyšuje obranu o 45 bodov." },
    "Zvyšuje obranu o 8 bodů.": { "cz": "Zvyšuje obranu o 8 bodů.", "en": "Increases defense by 8 points.", "sk": "Zvyšuje obranu o 8 bodov." },
    "Zvyšuje zdraví o 30 bodů.": { "cz": "Zvyšuje zdraví o 30 bodů.", "en": "Increases health by 30 points.", "sk": "Zvyšuje zdravie o 30 bodov." },
    "Zvyšuje obranu o 12 bodů.": { "cz": "Zvyšuje obranu o 12 bodů.", "en": "Increases defense by 12 points.", "sk": "Zvyšuje obranu o 12 bodov." },

    "Zvyšuje regeneraci many a dává jemný pocit klidu (+10 HP).": { "cz": "Zvyšuje regeneraci many a dává jemný pocit klidu (+10 HP).", "en": "Increases mana regeneration and gives a gentle sense of calm (+10 HP).", "sk": "Zvyšuje regeneráciu many a dáva jemný pocit pokoja (+10 HP)." },
    "Zvýší agresivitu a sílu útoku příšery (+5 ATK).": { "cz": "Zvýší agresivitu a sílu útoku příšery (+5 ATK).", "en": "Increases monster aggressiveness and attack power (+5 ATK).", "sk": "Zvýši agresivitu a silu útoku príšery (+5 ATK)." },
    "Zahušťuje krev a zvyšuje odolnost proti zranění (+20 HP, +3 DEF).": { "cz": "Zahušťuje krev a zvyšuje odolnost proti zranění (+20 HP, +3 DEF).", "en": "Thickens blood and increases resistance to injury (+20 HP, +3 DEF).", "sk": "Zahusťuje krv a zvyšuje odolnosť proti zraneniu (+20 HP, +3 DEF)." },
    "Kůže ztuhne jako kámen a poskytuje vynikající ochranu (+15 DEF).": { "cz": "Kůže ztuhne jako kámen a poskytuje vynikající ochranu (+15 DEF).", "en": "Skin hardens like stone and provides excellent protection (+15 DEF).", "sk": "Koža stuhne ako kameň a poskytuje vynikajúcu ochranu (+15 DEF)." },
    "Umožňuje lépe splynout s okolím a zvyšuje obranu (+10 DEF).": { "cz": "Umožňuje lépe splynout s okolím a zvyšuje obranu (+10 DEF).", "en": "Allows better blending with the environment and increases defense (+10 DEF).", "sk": "Umožňuje lepšie splynúť s okolím a zvyšuje obranu (+10 DEF)." },
    "Každý úder má drtivý dopad (+15 ATK).": { "cz": "Každý úder má drtivý dopad (+15 ATK).", "en": "Every strike has a crushing impact (+15 ATK).", "sk": "Každý úder má drvivý dopad (+15 ATK)." },
    "Křišťálové srdce pulzuje životní energií (+50 HP).": { "cz": "Křišťálové srdce pulzuje životní energií (+50 HP).", "en": "Crystal heart pulses with life energy (+50 HP).", "sk": "Kryštálové srdce pulzuje životnou energiou (+50 HP)." },
    "Dech naplněný dračí silou (+20 ATK).": { "cz": "Dech naplněný dračí silou (+20 ATK).", "en": "Breath filled with dragon power (+20 ATK).", "sk": "Dych naplnený dračou silou (+20 ATK)." },
    "Prastará síla země chrání monstrum (+25 DEF).": { "cz": "Prastará síla země chrání monstrum (+25 DEF).", "en": "Ancient power of the earth protects the monster (+25 DEF).", "sk": "Prastará sila zeme chráni monštrum (+25 DEF)." },
    "Elektrické výboje posilují útoky (+30 ATK).": { "cz": "Elektrické výboje posilují útoky (+30 ATK).", "en": "Electrical discharges strengthen attacks (+30 ATK).", "sk": "Elektrické výboje posilňujú útoky (+30 ATK)." },
    "Zpomaluje nepřátele a posiluje obranu (+20 DEF).": { "cz": "Zpomaluje nepřátele a posiluje obranu (+20 DEF).", "en": "Slows down enemies and strengthens defense (+20 DEF).", "sk": "Spomaľuje nepriateľov a posilňuje obranu (+20 DEF)." },
    "Ostré trny zraňují útočníky a zvyšují obranu (+18 DEF).": { "cz": "Ostré trny zraňují útočníky a zvyšují obranu (+18 DEF).", "en": "Sharp thorns wound attackers and increase defense (+18 DEF).", "sk": "Ostré tŕne zraňujú útočníkov a zvyšujú obranu (+18 DEF)." },
    "Trvale vylepší tvé monstrum (+12 ATK, +-2 DEF).": { "cz": "Trvale vylepší tvé monstrum (+12 ATK, +-2 DEF).", "en": "Permanently improves your monster (+12 ATK, +-2 DEF).", "sk": "Trvale vylepší tvoje monštrum (+12 ATK, +-2 DEF)." },
    "Trvale vylepší tvé monstrum (+100 HP).": { "cz": "Trvale vylepší tvé monstrum (+100 HP).", "en": "Permanently improves your monster (+100 HP).", "sk": "Trvale vylepší tvoje monštrum (+100 HP)." },
    "Trvale vylepší tvé monstrum (+6 DEF).": { "cz": "Trvale vylepší tvé monstrum (+6 DEF).", "en": "Permanently improves your monster (+6 DEF).", "sk": "Trvale vylepší tvoje monštrum (+6 DEF)." },
    "Trvale vylepší tvé monstrum (+10 ATK).": { "cz": "Trvale vylepší tvé monstrum (+10 ATK).", "en": "Permanently improves your monster (+10 ATK).", "sk": "Trvale vylepší tvoje monštrum (+10 ATK)." },
    "Trvale vylepší tvé monstrum (+5 ATK).": { "cz": "Trvale vylepší tvé monstrum (+5 ATK).", "en": "Permanently improves your monster (+5 ATK).", "sk": "Trvale vylepší tvoje monštrum (+5 ATK)." },
    "Trvale vylepší tvé monstrum (+5 DEF).": { "cz": "Trvale vylepší tvé monstrum (+5 DEF).", "en": "Permanently improves your monster (+5 DEF).", "sk": "Trvale vylepší tvoje monštrum (+5 DEF)." },
    "Trvale vylepší tvé monstrum (+15 HP).": { "cz": "Trvale vylepší tvé monstrum (+15 HP).", "en": "Permanently improves your monster (+15 HP).", "sk": "Trvale vylepší tvoje monštrum (+15 HP)." },
    "Trvale vylepší tvé monstrum (+8 DEF).": { "cz": "Trvale vylepší tvé monstrum (+8 DEF).", "en": "Permanently improves your monster (+8 DEF).", "sk": "Trvale vylepší tvoje monštrum (+8 DEF)." },
    "Trvale vylepší tvé monstrum (+10 HP).": { "cz": "Trvale vylepší tvé monstrum (+10 HP).", "en": "Permanently improves your monster (+10 HP).", "sk": "Trvale vylepší tvoje monštrum (+10 HP)." },
    "Trvale vylepší tvé monstrum (+5 HP).": { "cz": "Trvale vylepší tvé monstrum (+5 HP).", "en": "Permanently improves your monster (+5 HP).", "sk": "Trvale vylepší tvoje monštrum (+5 HP)." },
    "Trvale vylepší tvé monstrum (+12 DEF).": { "cz": "Trvale vylepší tvé monstrum (+12 DEF).", "en": "Permanently improves your monster (+12 DEF).", "sk": "Trvale vylepší tvoje monštrum (+12 DEF)." },
    "Trvale vylepší tvé monstrum (+6 ATK).": { "cz": "Trvale vylepší tvé monstrum (+6 ATK).", "en": "Permanently improves your monster (+6 ATK).", "sk": "Trvale vylepší tvoje monštrum (+6 ATK)." },
    "Trvale vylepší tvé monstrum (+4 ATK).": { "cz": "Trvale vylepší tvé monstrum (+4 ATK).", "en": "Permanently improves your monster (+4 ATK).", "sk": "Trvale vylepší tvoje monštrum (+4 ATK)." },
    "Trvale vylepší tvé monstrum (+8 HP).": { "cz": "Trvale vylepší tvé monstrum (+8 HP).", "en": "Permanently improves your monster (+8 HP).", "sk": "Trvale vylepší tvoje monštrum (+8 HP)." },
    "Trvale vylepší tvé monstrum (+10 DEF).": { "cz": "Trvale vylepší tvé monstrum (+10 DEF).", "en": "Permanently improves your monster (+10 DEF).", "sk": "Trvale vylepší tvoje monštrum (+10 DEF)." },
    "Trvale vylepší tvé monstrum (+20 HP).": { "cz": "Trvale vylepší tvé monstrum (+20 HP).", "en": "Permanently improves your monster (+20 HP).", "sk": "Trvale vylepší tvoje monštrum (+20 HP)." },
    "Trvale vylepší tvé monstrum (+7 ATK).": { "cz": "Trvale vylepší tvé monstrum (+7 ATK).", "en": "Permanently improves your monster (+7 ATK).", "sk": "Trvale vylepší tvoje monštrum (+7 ATK)." },
    "Trvale vylepší tvé monstrum (+5 HP, +5 ATK, +5 DEF).": { "cz": "Trvale vylepší tvé monstrum (+5 HP, +5 ATK, +5 DEF).", "en": "Permanently improves your monster (+5 HP, +5 ATK, +5 DEF).", "sk": "Trvale vylepší tvoje monštrum (+5 HP, +5 ATK, +5 DEF)." }
};

// Generic replacement function
function replaceStrings(content, map, keyName) {
    for (const [original, localized] of Object.entries(map)) {
        const regex = new RegExp(`"${keyName}":\\s*"${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
        content = content.replace(regex, `"${keyName}": ${JSON.stringify(localized, null, 2).replace(/\n/g, '\n    ')}`);
    }
    return content;
}

content = replaceStrings(content, labels, 'label');
content = replaceStrings(content, descriptions, 'description');

fs.writeFileSync(filePath, content);
console.log('Successfully localized resources.ts without changing other values.');
