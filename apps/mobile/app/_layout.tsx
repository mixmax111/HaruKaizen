import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  syncPushTokenWithBackend,
} from '../src/services/notificationService';
import { COLORS } from '../src/config';
import { useAuthStore } from '../src/stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TypedStack: any = Stack;

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isReady, initializeAuth, token } = useAuthStore();
  const notificationResponseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // 1. Inizializza stato autenticazione da AsyncStorage
    initializeAuth().then((hasToken) => {
      if (hasToken && token) {
        registerForPushNotificationsAsync()
          .then(async (pushToken: string | null) => {
            if (pushToken) {
              await syncPushTokenWithBackend(pushToken, token);
            }
          })
          .catch((err) => {
            console.warn('[Push] Registrazione token ignorata in Expo Go:', err);
          });
      }
    });

    // 2. Listener tap su notifiche (Deep Linking alle tab)
    try {
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
    } catch (err) {
      console.warn('[Notifications] Listener non supportato in questo ambiente:', err);
    }

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [router, initializeAuth, token]);

  // 3. Auth Guard reattivo: se l'operatore non ha un token, reindirizza al login
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Non autenticato -> reindirizza alla schermata di login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Autenticato -> reindirizza alla dashboard principale
      router.replace('/(tabs)');
    }
  }, [isReady, isAuthenticated, segments, router]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <TypedStack screenOptions={{ headerShown: false }}>
      <TypedStack.Screen name="(auth)" options={{ headerShown: false }} />
      <TypedStack.Screen name="(tabs)" options={{ headerShown: false }} />
    </TypedStack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
