import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, useAuthStore } from '../stores/authStore';

export { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY };

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;

export const setAuthTokens = async (accessToken: string | null, refreshToken?: string | null): Promise<void> => {
  cachedAccessToken = accessToken;
  if (accessToken) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }

  if (refreshToken !== undefined) {
    cachedRefreshToken = refreshToken;
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  // Notifica reattiva di Zustand per aggiornare la navigazione in RootLayout senza ritardi
  useAuthStore.setState({
    token: accessToken,
    refreshToken: refreshToken !== undefined ? refreshToken : cachedRefreshToken,
    isAuthenticated: Boolean(accessToken && accessToken.trim() !== ''),
    isReady: true,
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    cachedAccessToken = token;
    return token;
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (cachedRefreshToken) return cachedRefreshToken;
  try {
    const token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    cachedRefreshToken = token;
    return token;
  } catch {
    return null;
  }
};

export const clearAuthTokens = async (): Promise<void> => {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  try {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    useAuthStore.getState().logout();
  } catch (err) {
    console.warn('[API] Errore rimozione token di autenticazione:', err);
  }
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor Richiesta: inietta Bearer Token e allinea baseURL dinamico
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.baseURL = API_BASE_URL;

    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Mutex condiviso per evitare collisioni nei refresh concorrenti
let refreshPromise: Promise<string | null> | null = null;

// Interceptor Risposta: Refresh Mutex & Anti-Loop Protection
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Se non è un errore 401 o non c'è config, inoltra l'errore senza intercettare
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/altcha-challenge') ||
      url.includes('/auth/logout');

    // Anti-Loop: non effettuare il refresh per rotte di autenticazione o tentativi già ripetuti
    if (isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            await clearAuthTokens();
            return null;
          }

          try {
            const refreshRes = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'x-refresh-token': refreshToken,
                  Authorization: `Bearer ${refreshToken}`,
                },
                timeout: 8000,
              },
            );

            const newToken =
              refreshRes.data?.data?.accessToken ||
              refreshRes.data?.accessToken;
            const newRefreshToken =
              refreshRes.data?.data?.refreshToken ||
              refreshRes.data?.refreshToken;

            if (newToken) {
              await setAuthTokens(newToken, newRefreshToken || undefined);
              return newToken;
            }

            await clearAuthTokens();
            return null;
          } catch (err) {
            await clearAuthTokens();
            throw err;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const refreshedToken = await refreshPromise;
      if (refreshedToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
        return apiClient(originalRequest);
      }

      return Promise.reject(error);
    } catch (refreshErr) {
      await clearAuthTokens();
      return Promise.reject(refreshErr);
    }
  },
);

export default apiClient;

