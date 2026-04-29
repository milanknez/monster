import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, onDisconnect, update, get, remove } from "firebase/database";
import {
    getAuth,
    signInWithPopup,
    signInWithCredential,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut, // Added signOut here
    User
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Pro uživatele: Sem vlož konfiguraci ze své Firebase Console (Web App Config)
const firebaseConfig = {
    apiKey: "AIzaSyCThrnPN28Z8El74BSKkdCyGyo32oGN3qo",
    authDomain: "monster-app-3062e.firebaseapp.com",
    databaseURL: "https://monster-app-3062e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "monster-app-3062e",
    storageBucket: "monster-app-3062e.firebasestorage.app",
    messagingSenderId: "924150763137",
    appId: "1:924150763137:web:dca166eb99197cf7c38780",
    measurementId: "G-J1F1290THF"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { onAuthStateChanged, ref, get, update, set };

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
        id = 'player_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('monster_collector_uid', id);
    }
    return id;
};

export const PLAYER_UID = getAnonymousId();

/**
 * Synchronizuje polohu a stav hráče do Firebase
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
    activeMonster?: { id: string, level: number, name: string, stats: any }
}) => {
    const uid = data.uid || PLAYER_UID;
    const playerRef = ref(db, `players/${uid}`);

    const statusData = {
        name: data.name,
        level: data.level,
        monsterCount: data.monsterCount,
        lat: data.lat,
        lng: data.lng,
        avatarStyle: data.avatarStyle,
        avatarSeed: data.avatarSeed,
        email: data.email || null,
        activeMonster: data.activeMonster || null,
        lastActive: Date.now(),
        isOnline: true
    };

    set(playerRef, statusData);

    // Při odpojení (zavření aplikace) nastavit offline stav
    onDisconnect(playerRef).update({
        isOnline: false,
        lastActive: Date.now()
    });
};

/**
 * Uloží kompletní data uživatele (online záloha)
 */
export const saveUserBackup = async (uid: string, data: any) => {
    const backupRef = ref(db, `users/${uid}`);
    await update(backupRef, {
        ...data,
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
 * Vyhledá plné UID podle krátkého 6-místného kódu (posledních 6 znaků UID)
 */
export const resolveReferralCode = async (code: string): Promise<string> => {
    if (!code) return "";
    
    // Pokud je kód delší než 10 znaků, považujeme ho za plné UID
    if (code.length > 10) return code;

    const normalizedCode = code.toUpperCase();
    console.log(`[Referral/Resolve] Pokus o vyhledání UID pro kód: ${normalizedCode}`);

    try {
        const playersRef = ref(db, 'players');
        const snapshot = await get(playersRef);
        
        if (snapshot.exists()) {
            const players = snapshot.val();
            // Najdeme UID, které končí na zadaný kód
            const foundUid = Object.keys(players).find(uid => 
                uid.toUpperCase().endsWith(normalizedCode)
            );
            
            if (foundUid) {
                console.log(`[Referral/Resolve] Kód ${normalizedCode} vyřešen na UID: ${foundUid}`);
                return foundUid;
            }
        }
    } catch (err) {
        console.error("[Referral/Resolve] Chyba při vyhledávání kódu:", err);
    }

    return code; // Fallback na původní kód
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
            return;
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
                return;
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
    } catch (err) {
        console.error("[Referral/Register] Kritická chyba registrace:", err);
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
    const playersRef = ref(db, 'players');
    return onValue(playersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback([]);
            return;
        }

        const playersArray = Object.entries(data)
            .filter(([id]) => id !== currentUid) // Vyfiltrovat sebe
            .map(([id, val]: [string, any]) => ({
                id,
                ...val,
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
