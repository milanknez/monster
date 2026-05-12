import fs from 'fs';
import path from 'path';

const monstersDir = 'd:/wamp64/www/monster/src/data/monsters';

const translations = {
  "001": {
    "name": { "en": "Flame Belly", "sk": "Plamienok Horúcobruch" },
    "desc": { "en": "A small animated ember that gets angry easily. It's always hungry and swallows glowing stones.", "sk": "Malý oživený uhlík, ktorý sa ľahko nahnevá. Je stále hladný a prehĺta žeravé kamene." },
    "abilities": [
      { "name": { "en": "Flame Breath", "sk": "Plamenný dych" }, "desc": { "en": "Hits the enemy with a massive flame and causes burns.", "sk": "Zasiahne nepriateľa masívnym plameňom a spôsobí popáleniny." } },
      { "name": { "en": "Lava Aura", "sk": "Lávová aura" }, "desc": { "en": "Creates a protective shield that damages close attackers (Damage reduction 55-65%)", "sk": "Tvorí ochranný štít, ktorý poškodzuje útočníkov zblízka (Zníženie dmg 55-65%)" } }
    ]
  },
  "002": {
    "name": { "en": "Splashy Waterfriend", "sk": "Čľapko Vodomil" },
    "desc": { "en": "A smiling droplet with restless eyes. It loves splashing everyone around.", "sk": "Usmievavá kvapka s neposednými očkami. Strašne rado strieka na všetkých okolo." },
    "abilities": [
      { "name": { "en": "Water Pulse", "sk": "Vodný pulz" }, "desc": { "en": "Sends a strong shockwave of water that can confuse the enemy.", "sk": "Vysiela silnú rázovú vlnu vody, ktorá môže nepriateľa zmiasť." } },
      { "name": { "en": "Healing Spring", "sk": "Liečivý prameň" }, "desc": { "en": "Calls forth a stream of pure water that immediately restores some health.", "sk": "Vyvolá prúd čistej vody, ktorý okamžite obnoví časť zdravia." } }
    ]
  },
  "003": {
    "name": { "en": "Stumpy Branchslav", "sk": "Pník Vetvoslav" },
    "desc": { "en": "A living piece of old wood with real moss growing on it. It's very slow but kind.", "sk": "Oživený kus starého dreva, na ktorom rastie pravý mach. Je strašne pomalý, ale milý." },
    "abilities": [
      { "name": { "en": "Root Prison", "sk": "Koreňové väzenie" }, "desc": { "en": "Summons thorny roots that immobilize the enemy for one round.", "sk": "Vyvolá tŕnisté korene, ktoré znehybnia nepriateľa na jedno kolo." } },
      { "name": { "en": "Photosynthesis", "sk": "Fotosyntéza" }, "desc": { "en": "Uses sunlight to gradually regenerate health.", "sk": "Využíva slnečné svetlo k postupnej regenerácii zdravia." } }
    ]
  },
  "004": {
    "name": { "en": "Sparky Sparkmouse", "sk": "Bleskomyš Iskerná" },
    "desc": { "en": "A small yellow cloud of fur that constantly crackles with static electricity. Loves running in circles.", "sk": "Malý žltý obláčik srsti, ktorý neustále praská statickou elektrinou. Rád behá v kruhu." },
    "abilities": [
      { "name": { "en": "Lightning Discharge", "sk": "Bleskový výboj" }, "desc": { "en": "Releases accumulated energy as a destructive bolt. Inflicts a curse dealing 15% ATK damage.", "sk": "Uvoľní nahromadenú energiu v podobe ničivého blesku. Uvalí kletbu uštědřující 15 % poškodenia z ATK." } },
      { "name": { "en": "Static Charge", "sk": "Statické nabitie" }, "desc": { "en": "Increases attack speed and chance to stun the enemy.", "sk": "Zvýši rýchlosť útoku a šancu na ochromenie nepriateľa." } }
    ]
  },
  "005": {
    "name": { "en": "Lava-eater Thud", "sk": "Lávojed Bumkác" },
    "desc": { "en": "A big fat stone from a hot volcano that rolls downhill and pants a lot.", "sk": "Veľký a tlustý kameň z horúcej sopky, ktorý sa valí z kopca a hrozne u toho funí." },
    "abilities": [
      { "name": { "en": "Eruption", "sk": "Erupcia" }, "desc": { "en": "Causes a magma explosion that hits all enemies.", "sk": "Spôsobí výbuch magmy, ktorý zasiahne všetkých nepriateľov." } },
      { "name": { "en": "Hardened Lava", "sk": "Stuhnutá láva" }, "desc": { "en": "Creates a layer of hardened stone that drastically increases defense (Damage reduction 55-65%)", "sk": "Vytvorí vrstvu stuhnutého kameňa, ktorá drasticky zvýši obranu (Zníženie dmg 55-65%)" } }
    ]
  },
  "006": {
    "name": { "en": "Leafy Rustle-eye", "sk": "Listoočko Šustivé" },
    "desc": { "en": "A small green ball camouflaging as a maple leaf. Sneezes tiny leaves.", "sk": "Malá zelená kulička, ktorá sa maskuje za javorový list. Kýchá malinké lístečky." },
    "abilities": [
      { "name": { "en": "Leaf Blade", "sk": "Listová britva" }, "desc": { "en": "Sends sharp leaves that cut through even armor.", "sk": "Vysiela ostré listy, ktoré prerežú aj brnenie." } },
      { "name": { "en": "Wind Dance", "sk": "Tanec vo vetre" }, "desc": { "en": "Increases agility and chance to dodge attacks. Inflicts a curse dealing 15% ATK damage.", "sk": "Zvýši mrštnosť a šancu na vyhnutie sa útoku. Uvalí kletbu uštědřující 15 % poškodenia z ATK." } }
    ]
  },
  "007": {
    "name": { "en": "Bubbler Waver", "sk": "Bubliko Vlniar" },
    "desc": { "en": "Looks like a round water bubble and loves jumping into puddles.", "sk": "Vyzerá ako guľatá vodná bublina a hrozne rada skáče do kaluží." },
    "abilities": [
      { "name": { "en": "Gigantic Tsunami", "sk": "Gigantická tsunami" }, "desc": { "en": "Summons a huge wave that sweeps everything in its path.", "sk": "Vyvolá obrovskú vlnu, ktorá zmetie všetko v ceste." } },
      { "name": { "en": "Sea Fury", "sk": "Morský hnev" }, "desc": { "en": "Increases attack power based on remaining health.", "sk": "Zvýši silu útokov v závislosti na zostávajúcom zdraví." } }
    ]
  },
  "008": {
    "name": { "en": "Earthy Rooty", "sk": "Koreňo Zemitý" },
    "desc": { "en": "A wise old grandfather made of twigs, always grumbling about mushrooms and pine needles.", "sk": "Taký starý múdry dedko z vetvičiek, ktorý stále niečo bručí o hubách a ihličí." },
    "abilities": [
      { "name": { "en": "Root Grip", "sk": "Koreňové zovretie" }, "desc": { "en": "Strong roots burst from the ground, slowing the enemy and draining their energy. Inflicts a curse dealing 15% ATK damage.", "sk": "Zo zeme vyrazia silné korene, ktoré nepriateľa spomalia a postupne vysávajú jeho energiu. Uvalí kletbu uštědřující 15 % poškodenia z ATK." } },
      { "name": { "en": "Forest Breath", "sk": "Dych pralesa" }, "desc": { "en": "Heals part of own health and strengthens defense of all nature beings nearby.", "sk": "Uzdraví časť vlastného zdravia a posilní obranu všetkých prírodných bytostí v okolí." } }
    ]
  },
  "009": {
    "name": { "en": "Toothy Rodent", "sk": "Zúbko Hlodavec" },
    "desc": { "en": "This furry imp can chew through a whole staff in a second. Prefers sleeping in holes gnawed in trunks.", "sk": "Tento chlpatý rarášok dokáže behom sekundy rozkúsať celú palicu. Najradšej spí vo vyhlodaných dierach v kmeni." },
    "abilities": [
      { "name": { "en": "Gnawing Attack", "sk": "Hlodavý útok" }, "desc": { "en": "Quick attack with sharp teeth that can reduce the opponent's defense (Damage reduction 55-65%)", "sk": "Rýchly útok ostrými zubami, ktorý môže znížiť obranu protivníka (Zníženie dmg 55-65%)" } },
      { "name": { "en": "Mossy Regeneration", "sk": "Machová regenerácia" }, "desc": { "en": "If standing on nature ground, gradually restores health.", "sk": "Pokiaľ stojí na prírodnej pôde, postupne si obnovuje zdravie." } }
    ]
  },
  "010": {
    "name": { "en": "Wild Meowflare", "sk": "Mňaukožiar Divoký" },
    "desc": { "en": "A small kitten of unknown origin with huge glowing orange eyes. Wanders the enchanted forest and loves catching sparks in campfires.", "sk": "Malé mačiatko neznámeho pôvodu s obrovskými svietiacimi oranžovými očami. Túla sa začarovaným lesom a miluje lovenie iskričiek v táboráku." },
    "abilities": [
      { "name": { "en": "Glowing Hiss", "sk": "Žiarivý prskanec" }, "desc": { "en": "Fires a small ball of sparks that momentarily blinds the opponent.", "sk": "Vystrelí malú guľu iskier, ktorá protivníka na chvíľku oslepí." } },
      { "name": { "en": "Battery Charge", "sk": "Nabitie bateriek" }, "desc": { "en": "When wind blows on it, it recharges lost energy and starts buzzing. Inflicts a curse dealing 15% ATK damage.", "sk": "Keď na ňu pofúka vietor, tak si dobije stratenú energiu a začne bzučať. Uvalí kletbu uštědřující 15 % poškodenia z ATK." } }
    ]
  },
  "101": {
    "name": { "en": "Shadoweater Zor", "sk": "Tieňožrút Zor" },
    "desc": { "en": "An ancient entity woven from purest darkness. It doesn't move, but shadows around it come alive and consume all living things. Legend says seeing its face means losing one's own identity.", "sk": "Prastará entita utkaná z najčistejšej temnoty. Nepohybuje sa, ale tiene v jeho okolí ožívajú a pohlcujú všetko živé. Traduje sa, že uvidieť jeho tvár znamená stratiť vlastnú identitu." },
    "abilities": [
      { "name": { "en": "Shadow Feast", "sk": "Hostina tieňov" }, "desc": { "en": "Drains the enemy's life force and keeps part for its own regeneration.", "sk": "Vysaje životnú silu nepriateľa a časť si ponechá pre svoju regeneráciu." } },
      { "name": { "en": "Void Touch", "sk": "Dotyk prázdnoty" }, "desc": { "en": "Strikes with a blow so cold the enemy freezes in terror for a moment.", "sk": "Zasadí ranu tak chladnú, že nepriateľ na chvíľu skamenie hrôzou." } },
      { "name": { "en": "Mind Blackout", "sk": "Zatemnenie mysle" }, "desc": { "en": "Shrouds the battlefield in darkness, drastically reducing the enemy's attack.", "sk": "Zahalí bojisko do temnoty, ktorá drasticky znižuje nepriateľov útok." } }
    ]
  },
  "102": {
    "name": { "en": "Bloody Whisperer", "sk": "Krvavý Šeptal" },
    "desc": { "en": "A tall, gaunt figure in tattered red robes. It has no mouth, yet you hear its voice directly in your head, whispering unspeakable horrors and your inevitable end.", "sk": "Vysoká, vychudnutá postava v potrhanom červenom rúchu. Nemá ústa, napriek tomu jeho hlas počujete priamo vo svojej hlave, ako vám našepkáva nevýslovné hrôzy a váš nevyhnutný koniec." },
    "abilities": [
      { "name": { "en": "Voice of Madness", "sk": "Hlas šialenstva" }, "desc": { "en": "Causes psychological collapse in the enemy, paralyzing them for several rounds.", "sk": "Spôsobí nepriateľovi psychický kolaps a ochromí ho na niekoľko kôl." } },
      { "name": { "en": "Bloody Ritual", "sk": "Krvavý rituál" }, "desc": { "en": "Opens the enemy's wounds and drains all their remaining energy.", "sk": "Otvorí rany nepriateľa a vysaje z neho všetku zostávajúcu energiu." } },
      { "name": { "en": "Scent of Death", "sk": "Pach smrti" }, "desc": { "en": "Spreads an aura of fear that increases its own attack power.", "sk": "Šíri okolo seba auru strachu, ktorá zvyšuje jeho vlastnú útočnú silu." } }
    ]
  },
  "103": {
    "name": { "en": "Corpse Puppeteer", "sk": "Mŕtvolný Loutkár" },
    "desc": { "en": "A giant, grotesque mass of muscle and tendon with many spider-like arms. From each finger hang thin, pulsing nerve fibers used to control puppets sewn from parts of its previous victims.", "sk": "Obria, groteskná masa svalov a šliach s mnohými pavúčími pažami. Z každého prsta mu visí tenké, pulzujúce nervové vlákna, ktorými ovláda loutky zošité z častí svojich predchádzajúcich obetí." },
    "abilities": [
      { "name": { "en": "Twisted Marionette", "sk": "Zvrátená marioneta" }, "desc": { "en": "Reflects 50% of taken damage back to the attacker.", "sk": "Odrazí 50 % utrženého poškodenia späť na útočníka." } },
      { "name": { "en": "Fibers of Fate", "sk": "Vlákna osudu" }, "desc": { "en": "Numbs the opponent and temporarily steals part of their attack power.", "sk": "Ochromí súpera a dočasne mu ukradne časť jeho útočnej sily." } },
      { "name": { "en": "Army of Shadows", "sk": "Armáda tieňov" }, "desc": { "en": "Summons ghostly allies who attack in a massive volley.", "sk": "Vyvolá prízračné spolubojovníkov, ktorí zaútočia v mohutnej salve." } }
    ]
  },
  "104": {
    "name": { "en": "Rotting Wraith", "sk": "Hnijúci Prízrak" },
    "desc": { "en": "A shapeless mass of rotting flesh and algae from ancient swamps, constantly rearranging and secreting corrosive toxic fumes.", "sk": "Beztvará masa hnijúceho mäsa a rias z prastarých močiarov, ktorá sa neustále preskupuje a vylučuje leptavé toxické výpary." },
    "abilities": [
      { "name": { "en": "Plague Mist", "sk": "Morová hmla" }, "desc": { "en": "Contaminates the battlefield, permanently reducing enemy defense each round.", "sk": "Zamorí bojisko, čím trvale znižuje obranu súpera každým kolom." } },
      { "name": { "en": "Slimy Tentacle", "sk": "Slizké chapadlo" }, "desc": { "en": "A sharp strike that leaves a corrosive substance eating through armor.", "sk": "Prudký úder, ktorý zanechá leptavú látku rozežierajúcu zbroj." } },
      { "name": { "en": "Wave of Decay", "sk": "Vlna hniloby" }, "desc": { "en": "Damages enemies in an area and uses part of the power for own healing.", "sk": "Plošne poškodí nepriateľa a časť síl použije k vlastnému zaceleniu." } }
    ]
  },
  "105": {
    "name": { "en": "Shapeless Horror", "sk": "Beztvará Hrôza" },
    "desc": { "en": "A giant octopus-like entity with infinitely writhing tentacles.", "sk": "Obria chobotnicovitá entita s nekonečne sa krútiacimi chapadlami." },
    "abilities": [
      { "name": { "en": "Chaos Mutation", "sk": "Mutácia chaosu" }, "desc": { "en": "Randomly changes its stats to adapt to the enemy.", "sk": "Náhodne zmení svoje štatistiky, aby sa prispôsobila nepriateľovi." } },
      { "name": { "en": "Reality Tear", "sk": "Roztrhnutie reality" }, "desc": { "en": "Conjures a rift that temporarily damages enemy defense and attack.", "sk": "Vykúzli trhlinu, ktorá dočasne poškodí nepriateľovu obranu i útok." } },
      { "name": { "en": "Spectral Bite", "sk": "Prízračné kúsnutie" }, "desc": { "en": "Strikes with jaws from another dimension that ignore all armor.", "sk": "Zasadí ranu čeľusťami z inej dimenzie, ktorá ignoruje akékoľvek brnenie." } }
    ]
  },
  "106": {
    "name": { "en": "Green Taur", "sk": "Green Taur" },
    "desc": { "en": "An ancient minotaur born in the depths of the abyss. Its body is overgrown with dark crystals and poisonously green flames shoot from its horns and mouth. Every step burns the ground and its presence warps reality.", "sk": "Prastarý minotaurus zrodený v hlbinách priepasti. Jeho telo je prerastené temnými kryštálmi a z jeho rohov i tlamy šľahajú plamene jedovato zeleného ohňa. Každý jeho krok spaľuje zem a jeho prítomnosť deformuje realitu." },
    "abilities": [
      { "name": { "en": "Green Hell", "sk": "Zelené peklo" }, "desc": { "en": "Fires a wave of green fire that burns the enemy and leaves a poisonous effect over time.", "sk": "Vyšľahne vlnu zeleného ohňa, ktorá spaľuje nepriateľa a zanecháva jedovatý efekt v čase." } },
      { "name": { "en": "Crystalline Impact", "sk": "Kryštalický náraz" }, "desc": { "en": "Runs forward and strikes the enemy with horns reinforced by crystals, causing massive damage.", "sk": "Rozbehne sa vpred a udrie nepriateľa rohy posilnenými kryštálmi, čím spôsobí masívne poškodenie." } },
      { "name": { "en": "Green Flame Aura", "sk": "Aura zeleného plameňa" }, "desc": { "en": "Dark fire around the minotaur weakens enemies and gradually protects your life (Damage reduction 55-65%)", "sk": "Temný oheň okolo minotaura oslabuje nepriateľov a postupne chráni tvoje životy (Zníženie dmg 55-65%)" } }
    ]
  },
  "107": {
    "name": { "en": "Guardian of the Cursed", "sk": "Strážca Prekliatych" },
    "desc": { "en": "A fire giant with blue flames of suffering burning within. It carries a lantern trapping the souls of thousands of fallen warriors, giving it immense strength.", "sk": "Ohnivý obor, v ktorého vnútri horia modré plamene utrpenia. Nesie lucernu, v ktorej sú uväznené duše tisícov padlých bojovníkov, ktoré mu dodávajú neskonalú silu." },
    "abilities": [
      { "name": { "en": "Cleansing Flame", "sk": "Očistný plameň" }, "desc": { "en": "Releases a destructive explosion accompanied by the screams of trapped souls.", "sk": "Vypustí ničivú explóziu sprevádzanú výkrikmi uväznených duší." } },
      { "name": { "en": "Soul Scorch", "sk": "Duševná spála" }, "desc": { "en": "Burns the enemy's soul, temporarily reducing their critical hit chance.", "sk": "Popáli dušu nepriateľa, čím dočasne zníži jeho šancu na kritický zásah." } },
      { "name": { "en": "Bringer of Doom", "sk": "Svetlonos zmaru" }, "desc": { "en": "Souls fly out of the lantern, strengthening the guardian's attack.", "sk": "Z lucerny vyletia duše, ktoré posilnia strážcov útok." } }
    ]
  },
  "108": {
    "name": { "en": "Creeping Rot", "sk": "Plazivá Hniloba" },
    "desc": { "en": "A translucent insect as large as a house, forming invisible nests underground. Any victim meets the same fate: unspeakable slow dehydration.", "sk": "Priesvitný hmyz veľký ako dom, ktorý tvorí neviditeľné hniezda pod zemou. Akúkoľvek jeho obeť stretne rovnaký osud: nevýslovne pomalé vyschnutie." },
    "abilities": [
      { "name": { "en": "Infection", "sk": "Infekcia" }, "desc": { "en": "An inconspicuous bite that temporarily paralyzes the enemy's total strength.", "sk": "Nenápadné kúsnutie, ktoré dočasne ochromí celkovú silu nepriateľa." } },
      { "name": { "en": "Drain Fluids", "sk": "Vysatie tekutín" }, "desc": { "en": "A brutal attack that immediately restores part of own life by leaching the enemy's strength.", "sk": "Brutálny útok, ktorý okamžite obnoví časť vlastných životov luhovaním síl nepriateľa." } },
      { "name": { "en": "Parasitic Wave", "sk": "Parazitická vlna" }, "desc": { "en": "A sharp volley of rotting spores that hit all living and dead.", "sk": "Prudká salva hnijúcich spór, ktoré zasiahnu všetko živé i mŕtve." } }
    ]
  },
  "109": {
    "name": { "en": "Demonic Ash Lord", "sk": "Démonický Pán Popola" },
    "desc": { "en": "A gigantic beast composed of hardened obsidian and liquid lava. Its chest is a volcanic furnace that consumes all living things and turns them into choking ash.", "sk": "Gigantická beštia zložená z tvrdeného obsidiánu a tekutej lávy. Jej hruď tvorí sopečná pec, ktorá pohlcuje všetko živé a mení to v dusivý popol." },
    "abilities": [
      { "name": { "en": "Hellish Burn", "sk": "Pekelné zožehnutie" }, "desc": { "en": "Strikes with a hellish flame that ignores 50% of enemy defense.", "sk": "Zasadí ranu plameňom pekelným, ktorá ignoruje 50 % nepriateľovej obrany." } },
      { "name": { "en": "Cinder Storm", "sk": "Uhoľná búrka" }, "desc": { "en": "Burns the battlefield and air, drastically reducing enemy defense.", "sk": "Zošľahne bojisko i vzduch, čím drasticky zníži obranu nepriateľa." } },
      { "name": { "en": "Volcanic Blast", "sk": "Sopečný výbuch" }, "desc": { "en": "The monster accumulates energy in its chest and releases a destructive wave of lava.", "sk": "Monštrum nahromadí energiu vo svojej hrudi a vypustí ničivú vlnu lávy." } }
    ]
  },
  "110": {
    "name": { "en": "Void Eye", "sk": "Oko Prázdnoty" },
    "desc": { "en": "A pulsing mass of flesh and veins with a single gigantic eye in the center. Its gaze pierces reality and smaller eyes on outgrowths follow your every move in every possible timeline.", "sk": "Pulzujúca masa mäsa a žíl s jediným gigantickým okom uprostred. Jej pohľad preniká realitou a menšie oči na výbežkoch sledujú váš každý pohyb v každej možnej časovej línii." },
    "abilities": [
      { "name": { "en": "End Prediction", "sk": "Predpoveď konca" }, "desc": { "en": "Never misses and has a huge chance for a critical hit.", "sk": "Nikdy neminie a má ohromnú šancu na kritický zásah." } },
      { "name": { "en": "Disintegration", "sk": "Dezintegrácia" }, "desc": { "en": "Fires a scientifically unexplainable beam that disassembles the enemy into atoms.", "sk": "Vypustí vedecky nevysvetliteľný lúč, ktorý rozoberie nepriateľa na atómy." } },
      { "name": { "en": "Future Insight", "sk": "Vzhľad do budúcna" }, "desc": { "en": "Briefly stops time and temporarily increases its attack stats.", "sk": "Na krátku chvíľu zastaví čas a dočasne zvýši svoje útočné štatistiky." } }
    ]
  },
  "111": {
    "name": { "en": "Turtle Shark", "sk": "Korytnačo Shark" },
    "desc": { "en": "Turtle Shark is a water wizard of chaos - hard shell like a tank, teeth sharp as cheese graters, and a tail that likes to wag when no one's looking. Jumps out of water like a maniac, surprising enemies and occasionally getting tangled in its own shell.", "sk": "Korytnačo Shark je vodný čarodejník chaosu – tvrdý pancier ako tank, zuby ostré ako škrabky na syr a chvost, ktorý rád máva, keď sa nikto nepozerá. Skáče z vody ako šialenec, prekvapuje nepriateľov a občas sa pri tom zamotá do vlastného panciera." },
    "abilities": [
      { "name": { "en": "Crushing Bite", "sk": "Drtivý skus" }, "desc": { "en": "Attacks with powerful jaws, causing high damage to one enemy.", "sk": "Zaútočí silnými čeľusťami a spôsobí vysoké poškodenie jednému nepriateľovi." } },
      { "name": { "en": "Shell Shield", "sk": "Pancierový štít" }, "desc": { "en": "Retracts into its shell and significantly reduces damage taken for one round (Damage reduction 55-65%)", "sk": "Zatiahne sa do panciera a výrazne zníži prijaté poškodenie na jedno kolo (Zníženie dmg 55-65%)" } }
    ]
  },
  "112": {
    "name": { "en": "Planktogon", "sk": "Planktogon" },
    "desc": { "en": "Planktogon is a strange water mutant composed of thousands of glowing plankton holding together as a living mass. At first glance it looks cute - it glows, floats and quietly bubbles. But when an enemy approaches, its body contracts into a denser form, revealing rows of tiny sharp teeth.", "sk": "Planktogon je zvláštny vodný mutant zložený z tisícov žiariacich planktónov, ktoré držia pohromade ako živá hmota. Na prvý pohľad pôsobí roztomilo – svetielkuje, vznáša sa a ticho buble. Akonáhle sa ale priblíži nepriateľ, jeho telo sa stiahne do hustejšej formy a odhalí rady drobných ostrých zúbkov." },
    "abilities": [
      { "name": { "en": "Glowing Swarm", "sk": "Svietivý roj" }, "desc": { "en": "Fires a swarm of plankton that surrounds the enemy and causes minor damage.", "sk": "Vystrelí roj planktónu, ktorý obklopí nepriateľa a spôsobí drobné poškodenie." } },
      { "name": { "en": "Regenerative Cluster", "sk": "Regeneračný zhub" }, "desc": { "en": "Planktons huddle together and quickly heal damage, restoring 25% health.", "sk": "Planktóny sa zomknú a rýchlo zacelia poškodenie, čím si obnovia 25% zdravia." } }
    ]
  },
  "113": {
    "name": { "en": "Hydrox", "sk": "Hydrox" },
    "desc": { "en": "Hydrox is an unstable water mutant resembling a living chemical mixture. Its body constantly swirls, bubbles and changes shape. Sharp teeth and long claw-like arms emerge from the translucent liquid, striking like a whip.", "sk": "Hydrox je nestabilný vodný mutant pripomínajúci živú chemickú zmes. Jeho telo neustále víri, buble a mení tvar. Z priesvitnej kvapaliny vystupujú ostré zuby a dlhé drápovité ramená, ktoré dokážu šľahať ako bič." },
    "abilities": [
      { "name": { "en": "Acid Discharge", "sk": "Kyselinový výboj" }, "desc": { "en": "Sprays a stream of corrosive liquid, causing high damage and weakening enemy defense.", "sk": "Vystrekne prúd žieravej kvapaliny, ktorý spôsobí vysoké poškodenie a môže oslabiť obranu nepriateľa." } },
      { "name": { "en": "Liquid Body", "sk": "Tekuté telo" }, "desc": { "en": "Liquefies and part of attacks pass through it, reducing damage taken for one round (Damage reduction 55-65%)", "sk": "Roztečie sa a časť útokov prejde cez neho, čím zníži prijaté poškodenie na jedno kolo (Zníženie dmg 55-65%)" } }
    ]
  },
  "114": {
    "name": { "en": "Kara Milka", "sk": "Kara Milka" },
    "desc": { "en": "A cute brown dog with a birthday hat and two curved teeth. Known for its charming singing that can calm even the wildest monsters. A nimble companion that feels at home in the forest.", "sk": "Roztomilý hnedý psík s narodeninovou čiapočkou a dvoma zahnutými zúbkami. Známa svojím očarujúcim spevom, ktorý dokáže upokojiť aj tie najdivokejšie potvory. Mrštný spoločník, ktorý sa v lese cíti ako doma." },
    "abilities": [
      { "name": { "en": "Birthday Song", "sk": "Narodeninová pieseň" }, "desc": { "en": "Sings a melodic song that heals part of HP.", "sk": "Spieva melodickú pieseň, ktorá lieči časť HP." } },
      { "name": { "en": "Toothy Lunge", "sk": "Zubatý výpad" }, "desc": { "en": "A quick attack with its curved teeth upwards.", "sk": "Rýchly útok svojimi zahnutými zúbkami nahor." } }
    ]
  }
};

const commonTranslations = {
  en: {
    "Zasáhne nepřítele": "Hits the enemy",
    "způsobí poškození": "causes damage",
    "na jedno kolo": "for one round",
    "snižuje obranu": "reduces defense",
    "zvyšuje útok": "increases attack",
    "obnoví zdraví": "restores health",
    "Snížení dmg 55-65%": "Damage reduction 55-65%",
    "Uvalí kletbu uštědřující 15 % poškození z ATK": "Inflicts a curse dealing 15% ATK damage",
    "Rychlý útok": "Quick attack",
    "Zvýší rychlost": "Increases speed",
    "Vyléčí se": "Heals itself",
    "Vystřelí ohnivou kouli": "Fires a fireball",
    "Vytvoří štít": "Creates a shield",
    "vysává život": "drains life",
    "ochrání tvé životy": "protects your life"
  },
  sk: {
    "Zasáhne nepřítele": "Zasiahne nepriateľa",
    "způsobí poškození": "spôsobí poškodenie",
    "na jedno kolo": "na jedno kolo",
    "snižuje obranu": "znižuje obranu",
    "zvyšuje útok": "zvyšuje útok",
    "obnoví zdraví": "obnoví zdravie",
    "Snížení dmg 55-65%": "Zníženie dmg 55-65%",
    "Uvalí kletbu uštědřující 15 % poškození z ATK": "Uvalí kliatbu uštědrujúcu 15 % poškodenia z ATK",
    "Rychlý útok": "Rýchly útok",
    "Zvýší rychlost": "Zvýši rýchlosť",
    "Vyléčí se": "Vylieči sa",
    "Vystřelí ohnivou kouli": "Vystrelí ohnivú guľu",
    "Vytvoří štít": "Vytvorí štít",
    "vysává život": "vysáva život",
    "ochrání tvé životy": "ochráni tvoje životy"
  }
};

function autoTranslate(text, lang) {
  let result = text;
  const map = commonTranslations[lang];
  for (const [key, val] of Object.entries(map)) {
    result = result.replace(new RegExp(key, 'g'), val);
  }
  return result;
}

const files = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(monstersDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const id = data.id;

  if (translations[id]) {
    const t = translations[id];
    data.name.en = t.name.en;
    data.name.sk = t.name.sk;
    data.description.en = t.desc.en;
    data.description.sk = t.desc.sk;
    
    if (data.abilities && t.abilities) {
      data.abilities.forEach((ab, idx) => {
        if (t.abilities[idx]) {
          ab.name.en = t.abilities[idx].name.en;
          ab.name.sk = t.abilities[idx].name.sk;
          ab.description.en = t.abilities[idx].desc.en;
          ab.description.sk = t.abilities[idx].desc.sk;
        }
      });
    }
  } else {
    // Basic fallback for others
    data.name.en = data.name.en || data.name.cz;
    data.name.sk = data.name.sk || data.name.cz;
    data.description.en = autoTranslate(data.description.cz, 'en');
    data.description.sk = autoTranslate(data.description.cz, 'sk');

    if (data.abilities) {
      data.abilities.forEach(ab => {
        ab.name.en = ab.name.en || ab.name.cz;
        ab.name.sk = ab.name.sk || ab.name.cz;
        ab.description.en = autoTranslate(ab.description.cz, 'en');
        ab.description.sk = autoTranslate(ab.description.cz, 'sk');
      });
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
});

console.log("Monsters translations fixed.");
