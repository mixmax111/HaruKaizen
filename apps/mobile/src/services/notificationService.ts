import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';

// Configurazione comportamento notifiche in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Richiede i permessi per le notifiche push e restituisce l'Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'HaruKaizen Notifiche',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4edea3',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data || null;
  } catch (error) {
    console.warn('Errore durante la registrazione del push token:', error);
    return null;
  }
}

/**
 * Invia il push token al backend NestJS per sincronizzarlo con il profilo utente
 */
export async function syncPushTokenWithBackend(
  pushToken: string,
  authToken: string
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/notifications/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken }),
    });
  } catch (error) {
    console.warn('Errore sincronizzazione push token con backend:', error);
  }
}

/**
 * Schedula una notifica locale per il promemoria pasti
 */
export async function scheduleMealReminder(
  mealTitle: string,
  delayMinutes: number
): Promise<string | null> {
  try {
    const seconds = Math.max(1, delayMinutes * 60);
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Promemoria Pasto 🥗`,
        body: `È ora di registrare: ${mealTitle}`,
        data: { screen: 'nutrition' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    return identifier;
  } catch (error) {
    console.warn('Errore schedulazione promemoria pasto:', error);
    return null;
  }
}

/**
 * Schedula un avviso alla scadenza del timer di recupero palestra
 */
export async function scheduleRestTimerNotification(
  seconds: number,
  exerciseName?: string
): Promise<string | null> {
  try {
    if (seconds <= 0) return null;
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recupero Terminato! ⏱️',
        body: exerciseName
          ? `Pronto per la prossima serie di ${exerciseName}`
          : 'Pronto per la prossima serie!',
        sound: true,
        data: { screen: 'workout' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    return identifier;
  } catch (error) {
    console.warn('Errore schedulazione notifica timer recupero:', error);
    return null;
  }
}

/**
 * Cancella una notifica programmata per il timer di recupero
 */
export async function cancelRestTimerNotification(
  notificationId: string
): Promise<void> {
  try {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  } catch (error) {
    console.warn('Errore cancellazione notifica timer recupero:', error);
  }
}

