import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initApiBaseUrl } from '../config';

export const AUTH_TOKEN_KEY = '@harukaizen:auth_token';
export const REFRESH_TOKEN_KEY = '@harukaizen:refresh_token';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isReady: boolean;

  // Actions
  initializeAuth: () => Promise<boolean>;
  setTokens: (accessToken: string | null, refreshToken?: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isReady: false,

  initializeAuth: async () => {
    try {
      await initApiBaseUrl();
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      ]);

      const isAuthed = Boolean(accessToken && accessToken.trim() !== '');
      set({
        token: accessToken,
        refreshToken,
        isAuthenticated: isAuthed,
        isReady: true,
      });
      return isAuthed;
    } catch (err) {
      console.warn('[AuthStore] Errore inizializzazione autenticazione:', err);
      set({
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isReady: true,
      });
      return false;
    }
  },

  setTokens: async (accessToken: string | null, refreshToken?: string | null) => {
    try {
      if (accessToken) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken);
      } else {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      }

      if (refreshToken !== undefined) {
        if (refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        } else {
          await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }

      const isAuthed = Boolean(accessToken && accessToken.trim() !== '');
      set((state) => ({
        token: accessToken,
        refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
        isAuthenticated: isAuthed,
        isReady: true,
      }));
    } catch (err) {
      console.warn('[AuthStore] Errore salvataggio token:', err);
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);
      set({
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isReady: true,
      });
    } catch (err) {
      console.warn('[AuthStore] Errore rimozione token durante logout:', err);
    }
  },
}));

