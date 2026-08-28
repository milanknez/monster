import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, onChildAdded, set, onDisconnect, update, get, remove, push, DataSnapshot } from "firebase/database";
import {
    getAuth,
    signInWithPopup,
    signInWithCredential,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut, // Added signOut here
    signInAnonymously,
    User
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Konfigurace pro vývoj (Development)
const devConfig = {
    apiKey: "AIzaSyCThrnPN28Z8El74BSKkdCyGyo32oGN3qo",
    authDomain: "monster-app-3062e.firebaseapp.com",
    databaseURL: "https://monster-app-3062e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "monster-app-3062e",
    storageBucket: "monster-app-3062e.firebasestorage.app",
    messagingSenderId: "924150763137",
    appId: "1:924150763137:web:dca166eb99197cf7c38780",
    measurementId: "G-J1F1290THF"
};

// Konfigurace pro produkci (Zde vyplň údaje podle zvolené varianty)
const prodConfig = {
    apiKey: "AIzaSyC0Jdknti1kjw78mx2QgscVptlHJKQMMSw",
    authDomain: "monstero-prod.firebaseapp.com",
    databaseURL: "https://monstero-prod-default-rtdb.europe-west1.firebasedatabase.app", // Sem vlož URL produkční databáze
    projectId: "monstero-prod",
    storageBucket: "monstero-prod.firebasestorage.app",
    messagingSenderId: "377425376218",
    appId: "1:377425376218:web:067be9eb13898aa10e06e3",
    measurementId: "G-G3D8E5GETV"
};

// Chytré spojení konfigurací:
// Pokud je změněno pouze databaseURL (Varianta A), ostatní klíče se zdědí z devConfig.
// Pokud jsou změněny všechny klíče (Varianta B), použije se kompletní prodConfig.
const getProdConfig = () => {
    const config: any = { ...devConfig };
    
    // Použijeme produkční databázi, pokud je vyplněná
    if (prodConfig.databaseURL !== "SEM_VLOZ_PRODUKCNI_DATABASE_URL") {
        config.databaseURL = prodConfig.databaseURL;
    }
    
    // Pokud je vyplněn i zbytek (Varianta B), přepíšeme i ostatní klíče
    if (prodConfig.apiKey !== "SEM_VLOZ_PRODUKCNI_API_KEY") {
        Object.assign(config, prodConfig);
    }
    
    return config;
};

// Pokud je nastaveno VITE_FIREBASE_DB_ENV na 'production' nebo v localStorage, použije se produkční databáze (jinak vývojová).
const storedEnv = typeof window !== 'undefined' ? localStorage.getItem('monster_admin_db_env') : null;
export const isProdDb = storedEnv 
    ? storedEnv === 'production' 
    : import.meta.env.VITE_FIREBASE_DB_ENV === 'production';

const firebaseConfig = (isProdDb && prodConfig.databaseURL !== "SEM_VLOZ_PRODUKCNI_DATABASE_URL") 
    ? getProdConfig() 
    : devConfig;

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { onAuthStateChanged, ref, get, update, set, remove, onValue, signInAnonymously };

export const signInWithGoogle = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            const googleUser = await GoogleAuth.signIn();
            const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
            const result = await signInWithCredential(auth, credential);
            return result.user;
        }
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Chyba při přihlášení přes Google:", error);
        throw error;
    }
};

export const logout = () => signOut(auth);

// Pomocná funkce pro vygenerování unikátního anonymního ID, pokud nechceme Auth
const getAnonymousId = () => {
    let id = localStorage.getItem('monster_collector_uid');
    if (!id) {
        // Zkráceno na 6 znaků pro úsporu MB v Realtime Databázi
        id = Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem('monster_collector_uid', id);
    }
    return id;
};

export const PLAYER_UID = getAnonymousId();

/**
 * Synchronizuje polohu a stav hráče do Firebase (úsporný uzel pro mapu)
 */
export const syncPlayerToFirebase = (data: {
    uid?: string,
    name: string,
    level: number,
    monsterCount: number,
    lat: number,
    lng: number,
    avatarStyle: string,
    avatarSeed: string,
    email?: string | null,
    activeMonster?: { id: string, level: number, name: string, stats: any },
    pvpWins?: number,
    pvpLosses?: number
}) => {
    const uid = data.uid || PLAYER_UID;
    const presenceRef = ref(db, `presence/${uid}`);

    // Úsporné 3-písmenné klíče pro snížení MB přenosu
    const statusData = {
        nam: data.name,
        lvl: data.level,
        mct: data.monsterCount,
        lat: data.lat,
        lng: data.lng,
        avs: data.avatarStyle,
        avd: data.avatarSeed,
        eml: data.email || null,
        mon: data.activeMonster || null,
        act: Date.now(),
        onl: true,
        pvw: data.pvpWins || 0,
        pvl: data.pvpLosses || 0
    };

    set(presenceRef, statusData);

    // Indexace kódu pro bleskové vyhledávání bez stahování celé DB
    const shortCode = uid.slice(-6).toUpperCase();
    set(ref(db, `codes/${shortCode}`), uid);

    // Při odpojení (zavření aplikace) nastavit offline stav
    onDisconnect(presenceRef).update({
        onl: false,
        act: Date.now()
    });
};

/**
 * Uloží kompletní data uživatele (online záloha) - zůstává v uzlu users
 */
export const saveUserBackup = async (uid: string, data: any) => {
    const backupRef = ref(db, `users/${uid}`);
    // Sanitize data to strip out undefined properties (Firebase RTDB throws error on undefined)
    const cleanData = JSON.parse(JSON.stringify(data));
    await update(backupRef, {
        ...cleanData,
        updatedAt: Date.now()
    });
};

/**
 * Načte kompletní data uživatele (obsluha nového zařízení)
 */
export const loadUserBackup = async (uid: string) => {
    const backupRef = ref(db, `users/${uid}`);
    const snapshot = await get(backupRef);
    return snapshot.exists() ? snapshot.val() : null;
};

/**
 * Vyhledá plné UID podle krátkého 6-místného kódu přes index codes/
 */
export const resolveReferralCode = async (code: string): Promise<string> => {
    if (!code) return "";
    
    // Pokud je kód delší než 10 znaků, považujeme ho za plné UID
    if (code.length > 10) return code;

    const normalizedCode = code.toUpperCase();
    console.log(`[Referral/Resolve] Vyhledávání v indexu pro kód: ${normalizedCode}`);

    try {
        const codeRef = ref(db, `codes/${normalizedCode}`);
        const snapshot = await get(codeRef);
        
        if (snapshot.exists()) {
            const fullUid = snapshot.val();
            console.log(`[Referral/Resolve] Kód nalezen! UID: ${fullUid}`);
            return fullUid;
        }
    } catch (err) {
        console.error("[Referral/Resolve] Chyba v indexu:", err);
    }

    return code; // Fallback
};

/**
 * Referral Logika
 */
export const registerReferral = async (referrerUid: string, invitedUid: string, invitedName: string, invitedEmail?: string | null) => {
    try {
        // Vyřešit případný krátký kód na plné UID
        const fullReferrerUid = await resolveReferralCode(referrerUid);

        // 0. Prevence sebepozvání
        if (fullReferrerUid === invitedUid) {
            console.warn("[Referral/Register] Hráč nemůže pozvat sám sebe.");
            return false;
        }

        // 0.5 Kontrola, zda hráč již nebyl někým pozván (prevence zneužití smazání a znovukliknutí)
        const userSnap = await get(ref(db, `users/${invitedUid}`));
        if (userSnap.exists() && userSnap.val().referredBy) {
            console.log("[Referral/Register] Hráč již má nastaveného referrera v profilu.");
            // Pokud je to stejný referrer, můžeme zkontrolovat, zda záznam v referrals existuje
            const referralRef = ref(db, `referrals/${fullReferrerUid}/${invitedUid}`);
            const refSnap = await get(referralRef);
            if (refSnap.exists()) {
                console.log("[Referral/Register] Záznam v referrals již existuje.");
                return false;
            }
            // Pokud záznam v referrals NEEXISTUJE (byl smazán), ale user.referredBy existuje,
            // tak ho můžeme obnovit, ALE musíme si být jistí, že tím neumožníme double reward.
            // Nicméně nejbezpečnější je prostě nepovolit znovuvytvoření smazaného záznamu, 
            // pokud už jednou k registraci došlo.
            return false; 
        }

        console.log(`[Referral/Register] Registrace: referrer=${fullReferrerUid}, invited=${invitedUid}`);

        // 1. Primární tracking pro levely
        const referralRef = ref(db, `referrals/${fullReferrerUid}/${invitedUid}`);
        
        // Zkontrolujeme, jestli už záznam neexistuje (abychom ho nepřepsali a nespustili druhou notifikaci)
        const existingSnap = await get(referralRef);
        if (existingSnap.exists()) {
            const data = existingSnap.val();
            if (data.status === 'registered') {
                console.log("[Referral/Register] Referral již byl dříve zaregistrován.");
                return false;
            }
        }

        // Pokud neexistuje nebo nebyl registered, vytvoříme ho
        await set(referralRef, {
            name: invitedName,
            email: invitedEmail || null,
            level: existingSnap.exists() ? existingSnap.val().level || 1 : 1,
            totalXP: existingSnap.exists() ? existingSnap.val().totalXP || 0 : 0,
            timestamp: existingSnap.exists() ? existingSnap.val().timestamp || Date.now() : Date.now(),
            hatchClaimed: existingSnap.exists() ? existingSnap.val().hatchClaimed || false : false,
            status: 'registered',
            registeredUid: invitedUid
        });

        // 1.5 Uložit informaci k pozvanému hráči
        await update(ref(db, `users/${invitedUid}`), { referredBy: fullReferrerUid });
        
        // 2. Vyčistit dočasný záznam založený na emailu, pokud existuje
        if (invitedEmail) {
            const cleanEmail = invitedEmail.replace(/\./g, '_').toLowerCase();
            
            // Smazat email-based referral
            const oldReferralRef = ref(db, `referrals/${fullReferrerUid}/${cleanEmail}`);
            await remove(oldReferralRef);

            // Aktualizovat globální pozvánku
            const globalInviteRef = ref(db, `invites/${cleanEmail}`);
            await update(globalInviteRef, { 
                status: 'registered', 
                registeredUid: invitedUid,
                registeredAt: Date.now()
            });

            // Aktualizovat stav v seznamu pozvaných u referrera
            const userInviteRef = ref(db, `users/${fullReferrerUid}/invited_emails/${cleanEmail}`);
            await update(userInviteRef, { status: 'registered', registeredUid: invitedUid });
        }

        console.log("[Referral/Register] Registrace úspěšná.");
        return true;
    } catch (err) {
        console.error("[Referral/Register] Kritická chyba registrace:", err);
        return false;
    }
};

export const watchReferrals = (uid: string, callback: (referrals: any) => void) => {
    const referralsRef = ref(db, `referrals/${uid}`);
    return onValue(referralsRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
};

export const claimReferralReward = async (referrerUid: string, invitedUid: string) => {
    const referralRef = ref(db, `referrals/${referrerUid}/${invitedUid}`);
    await update(referralRef, { hatchClaimed: true });
};

export const deleteReferral = async (referrerUid: string, invitedId: string) => {
    const referralRef = ref(db, `referrals/${referrerUid}/${invitedId}`);
    await remove(referralRef);
};

export const syncReferralProgress = async (invitedUid: string, level: number, totalXP: number, referredBy: string, name?: string) => {
    if (!referredBy || !invitedUid || referredBy === "") return;

    try {
        // VŽDY vyřešit kód na plné UID před synchronizací
        const fullReferrerUid = await resolveReferralCode(referredBy);
        
        const referralRef = ref(db, `referrals/${fullReferrerUid}/${invitedUid}`);
        
        // Použijeme update pro efektivnější zápis a vyhnutí se problémům s oprávněním na čtení
        const updateData: any = {
            level,
            totalXP,
            status: 'registered',
            registeredUid: invitedUid,
            lastSync: Date.now()
        };

        if (name) updateData.name = name;

        await update(referralRef, updateData);
        console.log(`[Referral/Sync] Sync úspěšný (Lv. ${level}).`);
    } catch (err) {
        console.error("[Referral/Sync] Chyba při synchronizaci:", err);
    }
};

/**
 * Pozvání přes email
 */
export const inviteByEmail = async (referrerUid: string, email: string) => {
    // Firebase cesty nemohou obsahovat tečky
    const cleanEmail = email.replace(/\./g, '_').toLowerCase();

    // 1. Uložit do globálního seznamu pozvánek pro snadný lookup při registraci
    const inviteRef = ref(db, `invites/${cleanEmail}`);
    await set(inviteRef, {
        referrerUid,
        email,
        timestamp: Date.now()
    });

    // 2. Uložit do seznamu pozvaných u referrera pro tracking (v objektu uživatele)
    const userInviteRef = ref(db, `users/${referrerUid}/invited_emails/${cleanEmail}`);
    await set(userInviteRef, {
        email,
        status: 'pending',
        timestamp: Date.now()
    });

    // 3. Vytvořit záznam v referrals (pro okamžité zobrazení vajíčka v dashboardu)
    const referralRef = ref(db, `referrals/${referrerUid}/${cleanEmail}`);
    await set(referralRef, {
        name: email ? email.split('@')[0] : 'Pozvaný hráč', // Dočasné jméno z emailu
        email: email,
        level: 0,
        status: 'invited',
        timestamp: Date.now(),
        hatchClaimed: false
    });
};

export const checkEmailInvitation = async (email: string) => {
    const cleanEmail = email.replace(/\./g, '_').toLowerCase();
    const inviteRef = ref(db, `invites/${cleanEmail}`);
    const snapshot = await get(inviteRef);
    return snapshot.exists() ? snapshot.val().referrerUid : null;
};

/**
 * Poslouchá změny všech ostatních hráčů v databázi
 */
export const watchNearbyPlayers = (currentUid: string, callback: (players: any[]) => void) => {
    const presenceRef = ref(db, 'presence');
    return onValue(presenceRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback([]);
            return;
        }

        const playersArray = Object.entries(data)
            .filter(([id]) => id !== currentUid) // Vyfiltrovat sebe
            .map(([id, val]: [string, any]) => ({
                id,
                name: val.nam,
                level: val.lvl,
                monsterCount: val.mct,
                lat: val.lat,
                lng: val.lng,
                avatarStyle: val.avs,
                avatarSeed: val.avd,
                email: val.eml,
                activeMonster: val.mon,
                lastActive: val.act,
                isOnline: val.onl
            }));

        callback(playersArray);
    });
};

/**
 * Pošle signál (žádost, potvrzení, monster data) jinému hráči
 */
export const sendTradeSignal = async (fromUid: string, targetUid: string, signal: any) => {
    const signalRef = ref(db, `signals/${targetUid}`);
    await set(signalRef, {
        ...signal,
        fromUid: fromUid,
        timestamp: Date.now()
    });
};

/**
 * Sleduje vlastní schránku signálů
 */
export const watchTradeSignals = (uid: string, callback: (signal: any) => void) => {
    const signalRef = ref(db, `signals/${uid}`);
    return onValue(signalRef, (snapshot) => {
        const data = snapshot.val();
        // Přijmeme jen signály, které jsou relativně čerstvé (max 15 vteřin staré)
        if (data && data.timestamp && (Date.now() - data.timestamp) < 15000) {
            callback(data);
        }
    });
};

/**
 * Vymaže signál po zpracování
 */
export const clearTradeSignal = async (uid: string) => {
    const signalRef = ref(db, `signals/${uid}`);
    await set(signalRef, null);
};

/**
 * Dungeon Multiplayer Lobby Helper Functions (Minimalist 2-letter DB keys: dl, id, di, dn, hu, hn, ca, ea, st, pl, ui, nm, mo, rd, ja, lv, rt, hp)
 */

export const parseLobby = (raw: any) => {
    if (!raw) return null;
    const players: any = {};
    const rawPlayers = raw.pl || raw.p || raw.players || {};
    Object.keys(rawPlayers).forEach((uid) => {
        const p = rawPlayers[uid];
        const rawM = p.mo || p.m || p.monster;
        let monster = null;
        if (rawM) {
            monster = rawM.full ? {
                ...rawM.full,
                id: rawM.id || rawM.i || rawM.full.id,
                name: rawM.nm || rawM.n || rawM.name || rawM.full.name,
                level: rawM.lv || rawM.l || rawM.level || rawM.full.level || 1,
                rarity: rawM.rt || rawM.r || rawM.rarity || rawM.full.rarity || 'Běžné',
                maxHP: rawM.hp || rawM.maxHP || rawM.full.stats?.hp || 1000
            } : {
                id: rawM.id || rawM.i,
                name: rawM.nm || rawM.n || rawM.name,
                level: rawM.lv || rawM.l || rawM.level || 1,
                rarity: rawM.rt || rawM.r || rawM.rarity || 'Běžné',
                maxHP: rawM.hp || rawM.maxHP || 1000,
                stats: { hp: rawM.hp || rawM.maxHP || 1000, attack: rawM.at || 50 }
            };
        }
        players[uid] = {
            uid: p.ui || p.u || p.uid || uid,
            name: p.nm || p.n || p.name,
            monster,
            pos: p.ps || p.pos || { x: 300, y: 2300 },
            isReady: p.rd !== undefined ? p.rd : (p.r !== undefined ? p.r : (p.isReady || false)),
            isAccepted: p.ac !== undefined ? p.ac : (p.isAccepted || false),
            isLocked: p.lk !== undefined ? p.lk : (p.isLocked || false),
            joinedAt: p.ja || p.joinedAt || 0
        };
    });

    let status: 'waiting' | 'confirming' | 'selecting' | 'starting' | 'started' = 'waiting';
    if (raw.st === 'st' || raw.st === 'started') status = 'started';
    else if (raw.st === 'go' || raw.st === 'starting') status = 'starting';
    else if (raw.st === 'sl' || raw.st === 'selecting') status = 'selecting';
    else if (raw.st === 'cf' || raw.st === 'confirming') status = 'confirming';
    else status = 'waiting';

    return {
        id: raw.id || raw.i,
        dungeonId: raw.di || raw.d || raw.dungeonId,
        dungeonName: raw.dn || raw.dungeonName,
        hostUid: raw.hu || raw.h || raw.hostUid,
        hostName: raw.hn || raw.hostName,
        createdAt: raw.ca || raw.createdAt,
        expiresAt: raw.ea || raw.expiresAt,
        startedAt: raw.sa || raw.startedAt || raw.ca || raw.createdAt,
        status,
        players,
        enemySeed: raw.es ?? null,
        stats: raw.stt ? {
            totalDamageDealt: raw.stt.td || 0,
            dungeonTime: raw.stt.dt || 0,
            playersStats: raw.stt.ps || {}
        } : null
    };
};

export const createDungeonLobby = async (lobbyId: string, dungeonId: string, dungeonName: string, hostUid: string, hostName: string, customExpiresAt?: number) => {
    const lobbyRef = ref(db, `dungeon_lobbies/${lobbyId}`);
    const now = Date.now();
    const expiresAt = customExpiresAt || (now + 120000);
    await set(lobbyRef, {
        id: lobbyId,
        di: dungeonId,
        dn: dungeonName,
        hu: hostUid,
        hn: hostName,
        ca: now,
        ea: expiresAt,
        st: 'wt',
        pl: {
            [hostUid]: {
                ui: hostUid,
                nm: hostName,
                mo: null,
                rd: false,
                ja: now
            }
        }
    });
};

export const joinOrCreateDungeonLobby = async (
    lobbyId: string, 
    dungeonId: string, 
    dungeonName: string, 
    playerUid: string, 
    playerName: string, 
    customExpiresAt?: number
) => {
    const lobbyRef = ref(db, `dungeon_lobbies/${lobbyId}`);
    const snapshot = await get(lobbyRef);
    const now = Date.now();
    const expiresAt = customExpiresAt || (now + 120000);

    if (!snapshot.exists()) {
        await set(lobbyRef, {
            id: lobbyId,
            di: dungeonId,
            dn: dungeonName,
            hu: playerUid,
            hn: playerName,
            ca: now,
            ea: expiresAt,
            st: 'wt',
            pl: {
                [playerUid]: {
                    ui: playerUid,
                    nm: playerName,
                    mo: null,
                    rd: false,
                    ja: now
                }
            }
        });
    } else {
        const rawData = snapshot.val();
        const lobbyData = parseLobby(rawData);
        const existingPlayers = Object.keys(lobbyData?.players || {});
        if (!existingPlayers.includes(playerUid) && existingPlayers.length >= 4) {
            throw new Error('Lobby je plné! (max 4 hráči)');
        }
        if (!rawData.ea && !rawData.expiresAt) {
            await update(lobbyRef, { ea: expiresAt, st: rawData.st || rawData.s || 'wt' });
        }
        const playerRef = ref(db, `dungeon_lobbies/${lobbyId}/pl/${playerUid}`);
        await set(playerRef, {
            ui: playerUid,
            nm: playerName,
            mo: null,
            rd: false,
            ja: now
        });
    }
};

export const joinDungeonLobby = async (lobbyId: string, playerUid: string, playerName: string) => {
    const lobbyRef = ref(db, `dungeon_lobbies/${lobbyId}`);
    const snapshot = await get(lobbyRef);
    if (snapshot.exists()) {
        const lobbyData = parseLobby(snapshot.val());
        const existingPlayers = Object.keys(lobbyData?.players || {});
        if (!existingPlayers.includes(playerUid) && existingPlayers.length >= 4) {
            throw new Error('Lobby je plné! (max 4 hráči)');
        }
    }
    const playerRef = ref(db, `dungeon_lobbies/${lobbyId}/pl/${playerUid}`);
    await set(playerRef, {
        ui: playerUid,
        nm: playerName,
        mo: null,
        rd: false,
        ja: Date.now()
    });
};

export const leaveDungeonLobby = async (lobbyId: string, playerUid: string) => {
    const lobbyRef = ref(db, `dungeon_lobbies/${lobbyId}`);
    const snapshot = await get(lobbyRef);
    if (snapshot.exists()) {
        const rawData = snapshot.val();
        const lobbyData = parseLobby(rawData);
        if (!lobbyData) return;
        const hostUid = lobbyData.hostUid;
        const remainingPlayerUids = Object.keys(lobbyData.players || {}).filter(uid => uid !== playerUid);
        
        if (remainingPlayerUids.length === 0) {
            await remove(lobbyRef);
            return;
        }

        const updates: any = {};
        if (playerUid === hostUid) {
            const nextHostUid = remainingPlayerUids[0];
            const nextHostName = lobbyData.players[nextHostUid]?.name || 'Hráč';
            updates.hu = nextHostUid;
            updates.hn = nextHostName;
        }
        updates[`pl/${playerUid}`] = null;
        await update(lobbyRef, updates);
    }
};

export const updateLobbyPlayerMonster = async (lobbyId: string, playerUid: string, monster: any) => {
    const monsterRef = ref(db, `dungeon_lobbies/${lobbyId}/pl/${playerUid}/mo`);
    if (!monster) {
        await set(monsterRef, null);
    } else {
        await set(monsterRef, {
            id: monster.id || monster.i || 'm1',
            nm: typeof monster.name === 'object' ? (monster.name.cz || monster.name.en || 'Monster') : (monster.name || 'Monster'),
            lv: monster.level || monster.l || 1,
            rt: monster.rarity || monster.r || 'Běžné',
            hp: monster.stats?.hp || monster.maxHP || monster.hp || 1000,
            at: monster.stats?.attack || monster.attack || 50
        });
    }
};

export const saveLobbyFinalStats = async (
    lobbyId: string, 
    totalDamageDealt: number, 
    dungeonTime: number, 
    playersStats: Record<string, { totalDamage: number; totalHealing: number; dps: number }>
) => {
    const statsRef = ref(db, `dungeon_lobbies/${lobbyId}/stt`);
    const psCompact: Record<string, any> = {};
    Object.entries(playersStats).forEach(([uid, p]) => {
        psCompact[uid] = {
            td: p.totalDamage,
            th: p.totalHealing,
            dps: p.dps
        };
    });
    await set(statsRef, {
        td: totalDamageDealt,
        dt: dungeonTime,
        ps: psCompact
    });
};

export const setLobbyPlayerReady = async (lobbyId: string, playerUid: string, isReady: boolean) => {
    const readyRef = ref(db, `dungeon_lobbies/${lobbyId}/pl/${playerUid}/rd`);
    await set(readyRef, isReady);
};

export const updateLobbyPlayerPos = async (lobbyId: string, playerUid: string, pos: { x: number, y: number }) => {
    const posRef = ref(db, `dungeon_lobbies/${lobbyId}/pl/${playerUid}/ps`);
    await set(posRef, pos);
};

export const setLobbyStatus = async (lobbyId: string, status: 'wt' | 'cf' | 'sl' | 'go' | 'st') => {
    const statusRef = ref(db, `dungeon_lobbies/${lobbyId}/st`);
    await set(statusRef, status);
};

export const setPlayerAcceptance = async (lobbyId: string, playerUid: string, isAccepted: boolean) => {
    const acceptedRef = ref(db, `dungeon_lobbies/${lobbyId}/pl/${playerUid}/ac`);
    await set(acceptedRef, isAccepted);
};

export const setPlayerMonsterLock = async (lobbyId: string, playerUid: string, isLocked: boolean) => {
    const lockedRef = ref(db, `dungeon_lobbies/${lobbyId}/pl/${playerUid}/lk`);
    await set(lockedRef, isLocked);
};

export const resetLobbyToWaiting = async (lobbyId: string) => {
    const lobbyRef = ref(db, `dungeon_lobbies/${lobbyId}`);
    const snapshot = await get(lobbyRef);
    if (!snapshot.exists()) return;
    const lobbyData = snapshot.val();
    const players = lobbyData.pl || {};
    
    // Clear ac & lk & rd flags for all players, reset status to wt, clear events & stats
    const updates: any = { 
        st: 'wt',
        ev: null,
        stt: null
    };
    Object.keys(players).forEach(uid => {
        updates[`pl/${uid}/ac`] = false;
        updates[`pl/${uid}/lk`] = false;
        updates[`pl/${uid}/rd`] = false;
    });
    await update(lobbyRef, updates);
};

export const cleanupStaleLobbies = (rawMap: any) => {
    if (!rawMap) return;
    const now = Date.now();
    Object.keys(rawMap).forEach((id) => {
        const raw = rawMap[id];
        if (!raw) return;
        const status = (raw.st === 'st' || raw.s === 's' || raw.status === 'started' || raw.st === 'started') ? 'started' : 'waiting';
        const createdAt = raw.ca || raw.createdAt || now;
        const expiresAt = raw.ea || raw.expiresAt || (createdAt + 120000);
        const startedAt = raw.sa || raw.startedAt || createdAt;

        // Samozničení neaktivních raidů:
        // 1. Čekající raid (waiting), kterému vypršel 2min časovač před více než 3 minutami (vymaže se z DB)
        // 2. Probíhající raid (started), který běží déle než 15 minut (vymaže se z DB)
        if ((status === 'waiting' && now > expiresAt + 180000) || (status === 'started' && now > startedAt + 900000)) {
            const lobbyRef = ref(db, `dungeon_lobbies/${id}`);
            remove(lobbyRef).catch(() => {});
        }
    });
};

export const startDungeonLobby = async (lobbyId: string) => {
    const lobbyRef = ref(db, `dungeon_lobbies/${lobbyId}`);
    await update(lobbyRef, {
        st: 'st',
        sa: Date.now(),
        es: Math.floor(Math.random() * 1000000)  // enemy seed – same for all clients
    });
};

export const getDungeonLobbies = async () => {
    const lobbiesRef = ref(db, `dungeon_lobbies`);
    const snapshot = await get(lobbiesRef);
    const rawMap = snapshot.val() || {};
    cleanupStaleLobbies(rawMap);
    const parsedMap: any = {};
    Object.keys(rawMap).forEach((id) => {
        const parsed = parseLobby(rawMap[id]);
        if (parsed) parsedMap[id] = parsed;
    });
    return parsedMap;
};

export const watchDungeonLobbies = (callback: (lobbies: any) => void) => {
    const lobbiesRef = ref(db, `dungeon_lobbies`);
    return onValue(lobbiesRef, (snapshot: DataSnapshot) => {
        const rawMap = snapshot.val() || {};
        cleanupStaleLobbies(rawMap);
        const parsedMap: any = {};
        Object.keys(rawMap).forEach((id) => {
            const parsed = parseLobby(rawMap[id]);
            if (parsed) parsedMap[id] = parsed;
        });
        callback(parsedMap);
    });
};

export const watchSingleLobby = (lobbyId: string, callback: (lobby: any) => void) => {
    const lobbyRef = ref(db, `dungeon_lobbies/${lobbyId}`);
    return onValue(lobbyRef, (snapshot: DataSnapshot) => {
        callback(parseLobby(snapshot.val()));
    });
};

export const deleteDungeonLobby = async (lobbyId: string) => {
    const lobbyRef = ref(db, `dungeon_lobbies/${lobbyId}`);
    await remove(lobbyRef);
};

export const broadcastCombatEvent = async (lobbyId: string, event: any) => {
    const eventRef = ref(db, `dungeon_lobbies/${lobbyId}/ev`);
    const newEventRef = push(eventRef);
    await set(newEventRef, { ...event, ts: Date.now() });
};

export const clearCombatEvents = async (lobbyId: string) => {
    const eventRef = ref(db, `dungeon_lobbies/${lobbyId}/ev`);
    await remove(eventRef).catch(() => {});
};

export const watchCombatEvents = (lobbyId: string, minTs: number, callback: (event: any) => void) => {
    const eventRef = ref(db, `dungeon_lobbies/${lobbyId}/ev`);
    const processedKeys = new Set<string>();
    return onChildAdded(eventRef, (snapshot: DataSnapshot) => {
        const key = snapshot.key;
        if (!key || processedKeys.has(key)) return;
        processedKeys.add(key);
        const val = snapshot.val();
        if (val && (val.ts || 0) >= minTs) {
            callback(val);
        }
    });
};

export const rollForLootItem = async (lobbyId: string, itemIdx: number, playerUid: string, playerName: string, roll: number) => {
    const rollRef = ref(db, `dungeon_lobbies/${lobbyId}/loot_rolls/${itemIdx}/${playerUid}`);
    await set(rollRef, {
        ui: playerUid,
        nm: playerName,
        rl: roll,
        action: 'need',
        ts: Date.now()
    });
};

export const passLootItem = async (lobbyId: string, itemIdx: number, playerUid: string, playerName: string) => {
    const passRef = ref(db, `dungeon_lobbies/${lobbyId}/loot_rolls/${itemIdx}/${playerUid}`);
    await set(passRef, {
        ui: playerUid,
        nm: playerName,
        action: 'pass',
        ts: Date.now()
    });
};

export const watchLootRolls = (lobbyId: string, callback: (rolls: Record<string, Record<string, any>>) => void) => {
    const rollsRef = ref(db, `dungeon_lobbies/${lobbyId}/loot_rolls`);
    return onValue(rollsRef, (snapshot: DataSnapshot) => {
        callback(snapshot.val() || {});
    });
};

