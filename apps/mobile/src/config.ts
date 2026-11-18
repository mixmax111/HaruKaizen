import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const CUSTOM_API_URL_KEY = '@harukaizen:custom_api_url';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🌐 Risoluzione Intelligente dell'URL Backend (HaruKaizen Local-Edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * Sull'host Windows la porta 8080 è occupata da servizi di sistema (pgagent.exe);
 * HaruKaizen espone hk-api-local sulla porta 8002 dell'host Docker.
 * Su smartphone fisici con Expo Go, l'IP LAN viene estratto dinamicamente da hostUri.
 */
function extractLanHostIp(): string | null {
  // Prova 1: hostUri da expoConfig
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const rawIp = hostUri.split(':')[0];
    if (rawIp && rawIp !== 'localhost' && rawIp !== '127.0.0.1') return rawIp;
  }

  // Prova 2: linkingUri o experienceUrl (es. exp://192.168.1.6:8081)
  const uri = Constants.linkingUri || (Constants as any).experienceUrl;
  if (uri && typeof uri === 'string') {
    const match = uri.match(/:\/\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
    if (match && match[1] && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }

  return '192.168.1.6';
}

function resolveDefaultApiBaseUrl(): string {
  const lanHostIp = extractLanHostIp();

  // 1. Variabile d'ambiente esplicita (.env o eas.json)
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl && envUrl !== '') {
    // Se l'env punta a localhost ma siamo su un dispositivo fisico con IP LAN rilevato, usa l'IP LAN
    if (lanHostIp && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return envUrl
        .replace('localhost', lanHostIp)
        .replace('127.0.0.1', lanHostIp)
        .replace(':8080', ':8002');
    }
    // Normalizza sempre la porta 8080 su 8002 per evitare collisioni sull'host Docker
    return envUrl.replace(':8080', ':8002');
  }

  // 2. Se abbiamo un IP LAN rilevato da Metro o default LAN, usa direttamente porta 8002
  if (lanHostIp) {
    return `http://${lanHostIp}:8002/api/v1`;
  }

  // 3. Fallback per emulatore Android (10.0.2.2) o iOS/Web (localhost)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8002/api/v1';
  }

  return 'http://localhost:8002/api/v1';
}

export let API_BASE_URL = resolveDefaultApiBaseUrl();

/**
 * Inizializza l'endpoint dinamico da AsyncStorage (fondamentale per APK standalone)
 */
export async function initApiBaseUrl(): Promise<string> {
  try {
    const custom = await AsyncStorage.getItem(CUSTOM_API_URL_KEY);
    if (custom && custom.trim() !== '') {
      let cleaned = custom.trim().replace(':8080', ':8002');
      if (cleaned.includes('localhost') || cleaned.includes('127.0.0.1')) {
        const lanIp = extractLanHostIp();
        if (lanIp) {
          cleaned = cleaned.replace('localhost', lanIp).replace('127.0.0.1', lanIp);
        }
      }
      API_BASE_URL = cleaned;
      return API_BASE_URL;
    }
  } catch (err) {
    console.warn('[Config] Errore lettura custom API URL:', err);
  }
  API_BASE_URL = resolveDefaultApiBaseUrl();
  return API_BASE_URL;
}

/**
 * Imposta un endpoint custom (es. http://192.168.1.100:8002/api/v1)
 */
export async function setDynamicApiBaseUrl(url: string): Promise<string> {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.endsWith('/api/v1') && !cleaned.includes('/api/')) {
    cleaned = `${cleaned}/api/v1`;
  }

  API_BASE_URL = cleaned;
  await AsyncStorage.setItem(CUSTOM_API_URL_KEY, cleaned);
  return cleaned;
}

/**
 * Ripristina l'endpoint di default
 */
export async function resetDynamicApiBaseUrl(): Promise<string> {
  await AsyncStorage.removeItem(CUSTOM_API_URL_KEY);
  API_BASE_URL = resolveDefaultApiBaseUrl();
  return API_BASE_URL;
}

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
