import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, onDisconnect, update } from "firebase/database";

// Pro uživatele: Sem vlož konfiguraci ze své Firebase Console (Web App Config)
const firebaseConfig = {
    apiKey: "AIzaSyC3tHRAzNy_bxVQHo7_1zcaXmk3uDd9UNM",
    authDomain: "monstero-5cbe6.firebaseapp.com",
    projectId: "monstero-5cbe6",
    databaseURL: "https://monstero-5cbe6-default-rtdb.europe-west1.firebasedatabase.app",
    storageBucket: "monstero-5cbe6.firebasestorage.app",
    messagingSenderId: "615786759721",
    appId: "1:615786759721:web:22af53b47747248beb7e38",
    measurementId: "G-NVMV14KX3G"
};


const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

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
    name: string,
    level: number,
    monsterCount: number,
    lat: number,
    lng: number,
    avatarStyle: string,
    avatarSeed: string
}) => {
    const playerRef = ref(db, `players/${PLAYER_UID}`);

    const statusData = {
        ...data,
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
 * Poslouchá změny všech ostatních hráčů v databázi
 */
export const watchNearbyPlayers = (callback: (players: any[]) => void) => {
    const playersRef = ref(db, 'players');
    return onValue(playersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback([]);
            return;
        }

        const playersArray = Object.entries(data)
            .filter(([id]) => id !== PLAYER_UID) // Vyfiltrovat sebe
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
export const sendTradeSignal = async (targetUid: string, signal: any) => {
    const signalRef = ref(db, `signals/${targetUid}`);
    await set(signalRef, {
        ...signal,
        fromUid: PLAYER_UID,
        timestamp: Date.now()
    });
};

/**
 * Sleduje vlastní schránku signálů
 */
export const watchTradeSignals = (callback: (signal: any) => void) => {
    const signalRef = ref(db, `signals/${PLAYER_UID}`);
    return onValue(signalRef, (snapshot) => {
        const data = snapshot.val();
        if (data) callback(data);
    });
};

/**
 * Vymaže signál po zpracování
 */
export const clearTradeSignal = async () => {
    const signalRef = ref(db, `signals/${PLAYER_UID}`);
    await set(signalRef, null);
};
