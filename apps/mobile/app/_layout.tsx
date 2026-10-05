import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotificationsAsync,
  syncPushTokenWithBackend,
} from '../src/services/notificationService';

export default function RootLayout() {
  const router = useRouter();
  const notificationResponseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // 1. Registrazione permessi e push token all'avvio dell'app
    registerForPushNotificationsAsync().then(async (token: string | null) => {
      if (token) {
        // Se è presente un token di autenticazione salvato, sincronizza con l'API
        const authToken = await AsyncStorage.getItem('@harukaizen:auth_token');
        if (authToken) {
          await syncPushTokenWithBackend(token, authToken);
        }
      }
    });

    // 2. Listener tap su notifiche (Deep Linking alle tab)
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.screen === 'workout') {
          router.push('/(tabs)/workout');
        } else if (data?.screen === 'nutrition') {
          router.push('/(tabs)/nutrition');
        } else if (data?.screen === 'progress') {
          router.push('/(tabs)/progress');
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [router]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}

