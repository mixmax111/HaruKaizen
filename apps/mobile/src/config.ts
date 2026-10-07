import Constants from 'expo-constants';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🌐 Risoluzione Intelligente dell'URL Backend (HaruKaizen Local-Edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. PRIORITÀ ASSOLUTA — Variabile d'ambiente:
 *    EXPO_PUBLIC_API_URL definita in `apps/mobile/.env` (es. "http://192.168.1.150:8080/api/v1").
 * 
 * 2. SVILUPPO SU RETE LOCALE (Expo Go / Metro Bundler):
 *    Se la variabile non è impostata, estrae automaticamente l'IP locale del PC
 *    dalla connessione Metro attiva (Constants.expoConfig.hostUri).
 * 
 * 3. EMULATORE / FALLBACK:
 *    - Android Emulator: http://10.0.2.2:8080/api/v1 (porta 8080 per Local Docker Compose)
 *    - iOS Simulator / Web: http://localhost:8080/api/v1
 * 
 * 👉 OVERRIDE MANUALE PER AMBIENTI AIR-GAPPED:
 *    Se vuoi forzare un IP fisso senza variabili d'ambiente, decommenta la riga sotto:
 *    // return 'http://192.168.1.150:8080/api/v1';
 */
function resolveApiBaseUrl(): string {
  // 1. Variabile d'ambiente esplicita (.env o eas.json)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }

  // 2. Rilevamento automatico IP host LAN da Expo Metro Bundler
  const hostUri = Constants.expoConfig?.hostUri;
  if (__DEV__ && hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      // In Local-Edition l'API su Docker Compose risponde su porta 8002
      return `http://${ip}:8002/api/v1`;
    }
  }

  // 3. Fallback standard per emulatore Android
  return 'http://10.0.2.2:8002/api/v1';
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
