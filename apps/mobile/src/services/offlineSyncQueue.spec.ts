import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks per moduli React Native ed Expo
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: { hostUri: 'localhost:8081' },
  },
}));

const mockStorage: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStorage[key] || null),
    setItem: vi.fn(async (key: string, val: string) => {
      mockStorage[key] = val;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete mockStorage[key];
    }),
  },
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn(async () => ({ isConnected: false, isInternetReachable: false })),
  },
}));

import {
  useOfflineSyncStore,
  OFFLINE_OUTBOX_STORAGE_KEY,
  AUTH_TOKEN_KEY,
  WINNER_RECORDS_STORAGE_KEY,
  subscribeToWinnerRecords,
} from './offlineSyncQueue.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Mobile OfflineSyncQueue Spec', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
    useOfflineSyncStore.setState({
      queue: [],
      isSyncing: false,
      lastSyncAt: null,
      lastSyncError: null,
    });
  });

  it('accoda mutazioni in SQLite/AsyncStorage quando l\'app è offline', async () => {
    const store = useOfflineSyncStore.getState();

    const id1 = await store.enqueueMutation('CREATE_MEAL_SLOT', { name: 'Colazione' });
    const id2 = await store.enqueueMutation('CREATE_NUTRITION_LOG', { calories: 350, foodName: 'Mela' });

    const currentQueue = useOfflineSyncStore.getState().queue;
    expect(currentQueue).toHaveLength(2);
    expect(currentQueue[0].id).toBe(id1);
    expect(currentQueue[0].type).toBe('CREATE_MEAL_SLOT');
    expect(currentQueue[1].id).toBe(id2);
    expect(currentQueue[1].type).toBe('CREATE_NUTRITION_LOG');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      OFFLINE_OUTBOX_STORAGE_KEY,
      expect.stringContaining(id1)
    );
  });

  it('rimuove dalla coda le mutazioni contrassegnate come SYNCED o REJECTED_STALE (LWW)', async () => {
    // Imposta token di autenticazione
    mockStorage[AUTH_TOKEN_KEY] = 'mock-bearer-token';

    const store = useOfflineSyncStore.getState();
    const idSynced = await store.enqueueMutation('CREATE_MEAL_SLOT', { name: 'Pranzo' });
    const idStale = await store.enqueueMutation('CREATE_FOOD_ITEM', { name: 'Pane Vecchio' });
    const idFailed = await store.enqueueMutation('CREATE_RECIPE', { name: 'Ricetta Errata' });

    // Mock della fetch HTTP verso /api/v1/sync/batch
    const mockBatchResponse = {
      results: [
        { id: idSynced, status: 'SYNCED', serverId: 'server-uuid-1' },
        { id: idStale, status: 'REJECTED_STALE', winner: { name: 'Pane Server' } },
        { id: idFailed, status: 'FAILED', error: 'Database constraint violation' },
      ],
      syncedAt: new Date().toISOString(),
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockBatchResponse,
    }) as any;

    const result = await store.flushQueue();

    // idSynced e idStale sono stati rimossi dalla coda attiva; idFailed rimane per retry
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(1);

    const remainingQueue = useOfflineSyncStore.getState().queue;
    expect(remainingQueue).toHaveLength(1);
    expect(remainingQueue[0].id).toBe(idFailed);
    expect(remainingQueue[0].retryCount).toBe(1);
    expect(remainingQueue[0].lastError).toContain('Database constraint violation');
  });

  it('su risposta REJECTED_STALE sovrascrive lo stato locale con il record winner e notifica i subscriber', async () => {
    mockStorage[AUTH_TOKEN_KEY] = 'mock-bearer-token';

    const winnerData = {
      id: 'server-food-999',
      name: 'Pane Integrale Ufficiale',
      calories100g: 240,
    };

    let notifiedWinner: any = null;
    let notifiedType: any = null;
    let notifiedId: any = null;

    const unsubscribe = subscribeToWinnerRecords((type, id, winner) => {
      notifiedType = type;
      notifiedId = id;
      notifiedWinner = winner;
    });

    const store = useOfflineSyncStore.getState();
    const idStale = await store.enqueueMutation('CREATE_FOOD_ITEM', {
      name: 'Mio Pane Locale',
      clientUpdatedAt: '2026-11-17T10:00:00.000Z',
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ id: idStale, status: 'REJECTED_STALE', winner: winnerData }],
        syncedAt: new Date().toISOString(),
      }),
    }) as any;

    await store.flushQueue();

    // Verifica che il winner sia stato salvato nello storage locale dei winner
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      WINNER_RECORDS_STORAGE_KEY,
      expect.stringContaining('Pane Integrale Ufficiale')
    );

    // Verifica notifica subscriber
    expect(notifiedType).toBe('CREATE_FOOD_ITEM');
    expect(notifiedId).toBe(idStale);
    expect(notifiedWinner).toEqual(winnerData);

    unsubscribe();
  });

  it('invia rigorosamente clientUpdatedAt (tempo modifica locale) e non l\'ora di sincronizzazione nel batch payload', async () => {
    mockStorage[AUTH_TOKEN_KEY] = 'mock-bearer-token';

    const localModificationTime = '2026-11-17T08:30:00.000Z';
    const store = useOfflineSyncStore.getState();

    const mutationId = await store.enqueueMutation('CREATE_MEAL_SLOT', {
      name: 'Spuntino Pomeridiano',
      clientUpdatedAt: localModificationTime,
    });

    let capturedRequestBody: any = null;

    globalThis.fetch = vi.fn().mockImplementationOnce(async (_url, options) => {
      capturedRequestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          results: [{ id: mutationId, status: 'SYNCED', serverId: 'slot-srv-1' }],
          syncedAt: new Date().toISOString(),
        }),
      };
    }) as any;

    await store.flushQueue();

    expect(capturedRequestBody).not.toBeNull();
    expect(capturedRequestBody.mutations).toHaveLength(1);
    expect(capturedRequestBody.mutations[0].id).toBe(mutationId);
    // Verifica che il timestamp inviato al server sia esattamente quello della modifica locale
    expect(capturedRequestBody.mutations[0].timestamp).toBe(localModificationTime);
  });
});
