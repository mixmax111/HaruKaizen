import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../config';

export const OFFLINE_OUTBOX_STORAGE_KEY = '@harukaizen:offline_outbox_v1';
export const AUTH_TOKEN_KEY = '@harukaizen:auth_token';
export const WINNER_RECORDS_STORAGE_KEY = '@harukaizen:synced_winner_records_v1';

export type WinnerRecordSubscriber = (type: OfflineMutationType, clientSideId: string, winner: any) => void;
const winnerSubscribers = new Set<WinnerRecordSubscriber>();

export function subscribeToWinnerRecords(callback: WinnerRecordSubscriber): () => void {
  winnerSubscribers.add(callback);
  return () => {
    winnerSubscribers.delete(callback);
  };
}

/**
 * Sovrascrive lo stato locale con il record winner restituito dal server su conflitto LWW (REJECTED_STALE).
 */
export async function applyWinnerRecordToLocalState(
  type: OfflineMutationType,
  clientSideId: string,
  winner: any
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(WINNER_RECORDS_STORAGE_KEY);
    const records: Record<string, any> = raw ? JSON.parse(raw) : {};
    records[`${type}:${clientSideId}`] = {
      type,
      clientSideId,
      winner,
      appliedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(WINNER_RECORDS_STORAGE_KEY, JSON.stringify(records));

    winnerSubscribers.forEach((cb) => {
      try {
        cb(type, clientSideId, winner);
      } catch (e: any) {
        console.warn('[OfflineSyncQueue] Errore subscriber winner:', e.message);
      }
    });
  } catch (err: any) {
    console.warn('[OfflineSyncQueue] Errore applicazione winner locale:', err.message);
  }
}

export type OfflineMutationType =
  | 'CREATE_MEASUREMENT'
  | 'CREATE_NUTRITION_LOG'
  | 'CREATE_WORKOUT_LOG'
  | 'CREATE_DOCUMENT_TEXT'
  | 'CREATE_MEAL_SLOT'
  | 'CREATE_FOOD_ITEM'
  | 'CREATE_RECIPE';

export interface OfflineMutation {
  id: string; // clientSideId (UUID v4)
  type: OfflineMutationType;
  timestamp: string; // ISO date string
  payload: Record<string, any>;
  retryCount?: number;
  lastError?: string;
}

export interface MutationResult {
  id: string;
  status: 'SYNCED' | 'ALREADY_SYNCED' | 'REJECTED_STALE' | 'FAILED';
  serverId?: string;
  winner?: any;
  error?: string;
}

export interface BatchSyncResponse {
  results: MutationResult[];
  syncedAt: string;
}

export interface OfflineSyncState {
  queue: OfflineMutation[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;

  // Actions
  initializeQueue: () => Promise<void>;
  enqueueMutation: (type: OfflineMutationType, payload: Record<string, any>) => Promise<string>;
  flushQueue: () => Promise<{ synced: number; failed: number }>;
  removeMutation: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
}

/**
 * Genera un identificativo UUID v4 crittograficamente conforme RFC-4122
 */
export function generateClientSideId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useOfflineSyncStore = create<OfflineSyncState>((set, get) => ({
  queue: [],
  isSyncing: false,
  lastSyncAt: null,
  lastSyncError: null,

  initializeQueue: async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_OUTBOX_STORAGE_KEY);
      if (stored) {
        const parsed: OfflineMutation[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set({ queue: parsed });
        }
      }
    } catch (err: any) {
      console.warn('[OfflineSyncQueue] Errore inizializzazione store:', err.message);
    }
  },

  enqueueMutation: async (type: OfflineMutationType, payload: Record<string, any>): Promise<string> => {
    const id = generateClientSideId();
    // Usa il timestamp della modifica locale (clientUpdatedAt), garantendo che non sia l'ora del sync
    const clientUpdatedAt = payload.clientUpdatedAt || new Date().toISOString();
    const newMutation: OfflineMutation = {
      id,
      type,
      timestamp: clientUpdatedAt,
      payload: {
        ...payload,
        clientUpdatedAt,
      },
      retryCount: 0,
    };

    const nextQueue = [...get().queue, newMutation];
    set({ queue: nextQueue });

    try {
      await AsyncStorage.setItem(OFFLINE_OUTBOX_STORAGE_KEY, JSON.stringify(nextQueue));
    } catch (err: any) {
      console.error('[OfflineSyncQueue] Impossibile salvare la mutazione su AsyncStorage:', err.message);
    }

    // Tenta un flush immediato se connessi alla rete
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable !== false) {
      // Esegui in background senza bloccare la UI chiamante
      get().flushQueue().catch((e) => console.warn('[OfflineSyncQueue] Auto-flush non riuscito:', e.message));
    }

    return id;
  },

  flushQueue: async (): Promise<{ synced: number; failed: number }> => {
    const state = get();
    if (state.isSyncing || state.queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    set({ isSyncing: true, lastSyncError: null });

    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        set({ isSyncing: false, lastSyncError: 'Autenticazione richiesta per sincronizzare' });
        return { synced: 0, failed: state.queue.length };
      }

      // Prepara payload compatibile con POST /api/v1/sync/batch
      // Il timestamp inviato è rigorosamente quello della modifica locale (clientUpdatedAt) e non l'ora di sincronizzazione
      const payloadMutations = state.queue.map((m) => ({
        id: m.id,
        type: m.type,
        timestamp: m.payload?.clientUpdatedAt || m.timestamp,
        payload: m.payload,
      }));

      const res = await fetch(`${API_BASE_URL}/sync/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mutations: payloadMutations }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const responseJson = await res.json();
      const data: BatchSyncResponse = responseJson.data || responseJson;

      let synced = 0;
      let failed = 0;
      const resultMap = new Map<string, MutationResult>();

      if (data && Array.isArray(data.results)) {
        for (const r of data.results) {
          resultMap.set(r.id, r);
        }
      }

      // Filtra e aggiorna la coda locale
      const remainingQueue: OfflineMutation[] = [];

      for (const item of state.queue) {
        const result = resultMap.get(item.id);
        if (result) {
          if (result.status === 'SYNCED' || result.status === 'ALREADY_SYNCED') {
            synced++;
          } else if (result.status === 'REJECTED_STALE') {
            synced++;
            // Mutazione scartata per obsolescenza LWW: rimuovi dalla coda E sovrascrivi stato locale con server winner
            if (result.winner) {
              await applyWinnerRecordToLocalState(item.type, item.id, result.winner);
            }
          } else {
            failed++;
            remainingQueue.push({
              ...item,
              retryCount: (item.retryCount || 0) + 1,
              lastError: result.error || 'Fallimento sincronizzazione server',
            });
          }
        } else {
          // Nessun risultato restituito per questo ID, mantieni in coda
          failed++;
          remainingQueue.push(item);
        }
      }

      const now = new Date().toISOString();
      set({
        queue: remainingQueue,
        isSyncing: false,
        lastSyncAt: now,
      });

      await AsyncStorage.setItem(OFFLINE_OUTBOX_STORAGE_KEY, JSON.stringify(remainingQueue));
      return { synced, failed };
    } catch (err: any) {
      console.warn('[OfflineSyncQueue] Errore durante il flush della coda offline:', err.message);
      set({
        isSyncing: false,
        lastSyncError: err.message || 'Errore di rete durante la sincronizzazione',
      });
      return { synced: 0, failed: state.queue.length };
    }
  },

  removeMutation: async (id: string) => {
    const updated = get().queue.filter((m) => m.id !== id);
    set({ queue: updated });
    await AsyncStorage.setItem(OFFLINE_OUTBOX_STORAGE_KEY, JSON.stringify(updated));
  },

  clearQueue: async () => {
    set({ queue: [], lastSyncError: null });
    await AsyncStorage.removeItem(OFFLINE_OUTBOX_STORAGE_KEY);
  },
}));

export const offlineSyncService = {
  enqueue: (type: OfflineMutationType, payload: Record<string, any>) =>
    useOfflineSyncStore.getState().enqueueMutation(type, payload),
  flush: () => useOfflineSyncStore.getState().flushQueue(),
  getQueue: () => useOfflineSyncStore.getState().queue,
  clear: () => useOfflineSyncStore.getState().clearQueue(),
};

