import axios from 'axios';

/**
 * Risoluzione intelligente del baseURL per il client web:
 * 1. Nel browser (client-side): usa sempre la route relativa '/api/v1'.
 *    Questo fa transitare tutte le chiamate attraverso il Route Handler proxy di Next.js
 *    (app/api/v1/[...path]/route.ts).
 *    Vantaggi:
 *    - Funziona su qualsiasi porta (3000, 3001, ecc.)
 *    - Funziona su qualsiasi host (localhost, 127.0.0.1, IP LAN 192.168.x.x)
 *    - Elimina completamente problemi di CORS
 *    - Garantisce il salvataggio dei cookie httpOnly (refresh token) senza restrizioni cross-site
 * 2. In SSR (Node.js runtime di Next.js):
 *    Usa INTERNAL_API_URL (per comunicazione tra container Docker) o NEXT_PUBLIC_API_URL,
 *    con fallback su 'http://127.0.0.1:8002/api/v1'.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8002/api/v1'
  ).replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Invia sempre il refresh cookie httpOnly
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Request interceptor per inserire il Bearer token
apiClient.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Mutex condiviso per evitare race-condition di refresh concorrenti
let refreshPromise: Promise<string | null> | null = null;

// Response interceptor per refresh trasparente in caso di 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se non è un errore HTTP 401 o non c'è config, inoltra l'errore
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    const isAuthRoute =
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/altcha-challenge') ||
      url.includes('/auth/logout');

    // NON intercettare gli endpoint di autenticazione: devono restituire il 401 direttamente
    // al componente UI chiamante senza tentare il refresh e senza forzare reload o redirect
    if (isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
          .then((res) => {
            const newToken = res.data?.data?.accessToken || res.data?.accessToken;
            if (newToken) {
              setAccessToken(newToken);
              return newToken;
            }
            throw new Error('Nessun token restituito');
          })
          .catch((refreshErr) => {
            setAccessToken(null);
            throw refreshErr;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
      return Promise.reject(error);
    } catch (refreshError) {
      setAccessToken(null);

      // Reindirizza al login SOLO se l'utente si trova su una pagina riservata (non pubblica)
      // e NON effettuare reload se l'utente si trova già su /login, /register o /
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const isPublicPath =
          currentPath === '/' ||
          currentPath === '/login' ||
          currentPath === '/register';

        if (!isPublicPath) {
          window.location.replace('/login');
        }
      }

      return Promise.reject(refreshError);
    }
  }
);
