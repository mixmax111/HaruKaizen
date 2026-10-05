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
  background: '#0d0e15',       // Deepest Dark Surface
  surface: '#12131a',          // Surface Main
  card: '#1a1b22',             // Card Container Low
  cardContainer: '#1e1f26',    // Card Container High
  cardBorder: '#27272a',       // Subtle Border
  cardBorderGlow: '#3c4a42',   // Terminal Emerald Tint Border
  primary: '#4edea3',          // Phosphor Emerald Telemetry
  primaryContainer: '#10b981', // Solid Emerald
  primaryDark: '#005236',
  secondary: '#c0c1ff',        // Indigo Telemetry
  secondaryContainer: '#3131c0',
  accent: '#c0c1ff',           // Telemetry Accent
  tertiary: '#ffb2b7',         // Coral Accent
  tertiaryContainer: '#ff7886',
  danger: '#ef4444',
  text: '#e3e1ec',             // On-Surface High Contrast
  textMuted: '#bbcabf',        // Monospace Muted
  textDim: '#86948a',          // Outline Dim
  outline: '#86948a',
  outlineVariant: '#3c4a42',
};
