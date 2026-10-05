import Constants from 'expo-constants';

/**
 * Risoluzione Intelligente dell'URL Backend:
 * 1. STANDALONE (Preview APK / Production): usa rigorosamente EXPO_PUBLIC_API_URL (iniettato a build time).
 * 2. SVILUPPO (Expo Go / Metro): se manca EXPO_PUBLIC_API_URL, ricava l'IP host del computer da Constants.expoConfig.hostUri.
 * 3. EMULATORE / FALLBACK: 10.0.2.2 per emulatore Android standard, localhost per Web.
 */
function resolveApiBaseUrl(): string {
  // Se la variabile d'ambiente è esplicitamente valorizzata (es. da .env o eas.json), è la source of truth
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }

  // Se siamo in modalità development con Metro attivo, estrai l'IP host del computer
  const hostUri = Constants.expoConfig?.hostUri;
  if (__DEV__ && hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:3000/api/v1`;
    }
  }

  // Fallback sicuro su porta 3000 (standard NestJS)
  return 'http://10.0.2.2:3000/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const COLORS = {
  background: '#09090b', // Dark zinc profondo
  card: '#18181b',       // Dark zinc card
  cardBorder: '#27272a',
  primary: '#10b981',    // Emerald HaruKaizen
  primaryDark: '#059669',
  secondary: '#f59e0b',  // Amber
  accent: '#6366f1',     // Indigo
  danger: '#ef4444',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  textDim: '#71717a',
};
