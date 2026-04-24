import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import { ref, update } from 'firebase/database';

/**
 * Initializes both Local and Push notifications for the user.
 * @param uid The user's UID to associate the FCM token with
 */
export const initNotifications = async (uid: string) => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
        console.log('Not a native platform, skipping notification initialization.');
        return;
    }

    try {
        // --- 1. LOCAL NOTIFICATIONS (48h Inactivity Reminder) ---
        await scheduleReengagementReminder();

        // --- 2. PUSH NOTIFICATIONS (FCM) ---
        await setupPushNotifications(uid);

    } catch (error) {
        console.error('Error during notification initialization:', error);
    }
};

const scheduleReengagementReminder = async () => {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
        const request = await LocalNotifications.requestPermissions();
        if (request.display !== 'granted') {
            console.log('User denied local notification permissions.');
            return;
        }
    }

    // Zrušíme všechny staré naplánované notifikace (aby se čas posunul na +48h od teď)
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    // Naplánujeme dvě notifikace: jednu za 48h (2 dny) a druhou za 120h (5 dní)
    const date2Days = new Date();
    date2Days.setHours(date2Days.getHours() + 48);

    const date5Days = new Date();
    date5Days.setHours(date5Days.getHours() + 120);

    await LocalNotifications.schedule({
        notifications: [
            {
                title: "Monstera tě hledají! 👹",
                body: "Už 2 dny jsi nebyl na lovu. Divoké příšery v okolí začínají ovládat tvoji čtvrť!",
                id: 10,
                schedule: { at: date2Days, allowWhileIdle: true },
                sound: 'default'
            },
            {
                title: "Tvoje monstra jsou smutná... 😢",
                body: "Už je to 5 dní! Tvoje sbírka chřadne a vzácné kousky utíkají k jiným lovcům. Přijď je zachránit!",
                id: 11,
                schedule: { at: date5Days, allowWhileIdle: true },
                sound: 'default'
            }
        ]
    });
    console.log('Reminders scheduled for 2 and 5 days.');
};

/**
 * Debug function to test if notifications are working at all.
 * Triggers a notification in 5 seconds.
 */
export const scheduleTestNotification = async () => {
    if (!Capacitor.isNativePlatform()) return;

    await LocalNotifications.schedule({
        notifications: [
            {
                title: "Testovací notifikace",
                body: "Pokud toto vidíš, notifikace fungují! (Tato zmizí za 5 sekund)",
                id: 99,
                schedule: { at: new Date(Date.now() + 5000) },
                sound: 'default'
            }
        ]
    });
    console.log('Test notification scheduled for in 5 seconds.');
};

const setupPushNotifications = async (uid: string) => {
    // Check/Request Push Permissions
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions.');
        return;
    }

    // Register with FCM
    await PushNotifications.register();

    // Listeners
    await PushNotifications.removeAllListeners();

    // On successful registration, save the token to Firebase
    await PushNotifications.addListener('registration', (token: { value: string }) => {
        console.log('Push registration success, token:', token.value);
        saveTokenToDatabase(uid, token.value);
    });

    // Handle registration error
    await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on push registration:', JSON.stringify(error));
    });

    // Handle incoming notification while app is open
    await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('Push notification received:', JSON.stringify(notification));
    });

    // Handle action performed on notification (clicking it)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        console.log('Push notification action performed:', JSON.stringify(notification));
    });
};

const saveTokenToDatabase = async (uid: string, token: string) => {
    if (!uid) return;
    try {
        const playerRef = ref(db, `players/${uid}`);
        await update(playerRef, { fcmToken: token });
        console.log('FCM token successfully saved to player profile.');
    } catch (e) {
        console.error('Failed to save FCM token to database:', e);
    }
};

/**
 * Legacy export for backward compatibility if needed temporarily
 */
export const scheduleDailyMonsterReminder = scheduleReengagementReminder;
