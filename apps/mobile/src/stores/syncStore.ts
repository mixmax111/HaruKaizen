import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedWorkoutLog, QueuedPhotoUpload, QueuedNutritionLog } from '../types/sync';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../config';
import { syncTracer, SyncLogEntry } from '../utils/syncTracer';

const STORAGE_KEY = 'harukaizen_offline_sync_store_v1';

interface SyncStoreState {
  workoutQueue: QueuedWorkoutLog[];
  photoQueue: QueuedPhotoUpload[];
  nutritionQueue: QueuedNutritionLog[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncLogs: SyncLogEntry[];

  // Actions
  initializeStore: () => Promise<void>;
  enqueueWorkout: (workout: Omit<QueuedWorkoutLog, 'retryCount'>) => Promise<void>;
  addPendingWorkoutLog: (workout: Omit<QueuedWorkoutLog, 'retryCount'>) => Promise<void>;
  enqueuePhoto: (photo: Omit<QueuedPhotoUpload, 'retryCount'>) => Promise<void>;
  addPendingMediaUpload: (photo: Omit<QueuedPhotoUpload, 'retryCount'>) => Promise<void>;
  enqueueNutrition: (nutrition: Omit<QueuedNutritionLog, 'retryCount'>) => Promise<void>;
  processSyncQueue: (authToken?: string) => Promise<{ success: number; failed: number }>;
  clearAllQueues: () => Promise<void>;
  refreshLogs: () => Promise<void>;
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  workoutQueue: [],
  photoQueue: [],
  nutritionQueue: [],
  isSyncing: false,
  lastSyncAt: null,
  syncLogs: [],

  initializeStore: async () => {
    try {
      const serialized = await AsyncStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        set({
          workoutQueue: parsed.workoutQueue || [],
          photoQueue: parsed.photoQueue || [],
          nutritionQueue: parsed.nutritionQueue || [],
          lastSyncAt: parsed.lastSyncAt || null,
        });
      }
      const logs = await syncTracer.getLogs();
      set({ syncLogs: logs });
    } catch (err) {
      console.warn('Errore nel caricamento della coda offline di sync:', err);
    }
  },

  enqueueWorkout: async (workout) => {
    const nextQueue = [...get().workoutQueue, { ...workout, retryCount: 0 }];
    set({ workoutQueue: nextQueue });
    await saveStateToStorage(get());
  },

  addPendingWorkoutLog: async (workout) => {
    const nextQueue = [...get().workoutQueue, { ...workout, retryCount: 0 }];
    set({ workoutQueue: nextQueue });
    await saveStateToStorage(get());

    await syncTracer.recordEvent({
      type: 'WORKOUT',
      status: 'RETRY',
      clientSyncId: workout.clientSyncId,
      errorMessage: 'Salvato in locale nella coda offline (in attesa di invio)',
    });
    const logs = await syncTracer.getLogs();
    set({ syncLogs: logs });
  },

  enqueuePhoto: async (photo) => {
    const nextQueue = [...get().photoQueue, { ...photo, retryCount: 0 }];
    set({ photoQueue: nextQueue });
    await saveStateToStorage(get());
  },

  // Action ufficiale per Ghosting Camera: registra solo l'URI del file su disco (MAI Base64)
  addPendingMediaUpload: async (photo) => {
    const nextQueue = [...get().photoQueue, { ...photo, retryCount: 0 }];
    set({ photoQueue: nextQueue });
    await saveStateToStorage(get());

    await syncTracer.recordEvent({
      type: 'PHOTO',
      status: 'RETRY',
      clientSyncId: photo.clientSyncId,
      errorMessage: `Foto salvata in locale (${photo.category}, ${photo.weightKg ? `${photo.weightKg}kg` : 'peso non spec.'}). In attesa di sync multipart.`,
    });
    const logs = await syncTracer.getLogs();
    set({ syncLogs: logs });
  },

  enqueueNutrition: async (nutrition) => {
    const nextQueue = [...get().nutritionQueue, { ...nutrition, retryCount: 0 }];
    set({ nutritionQueue: nextQueue });
    await saveStateToStorage(get());
  },

  refreshLogs: async () => {
    const logs = await syncTracer.getLogs();
    set({ syncLogs: logs });
  },

  processSyncQueue: async (authToken?: string) => {
    if (get().isSyncing) return { success: 0, failed: 0 };
    set({ isSyncing: true });

    let successCount = 0;
    let failedCount = 0;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };

    // 1. Sincronizzazione Workouts
    const remainingWorkouts: QueuedWorkoutLog[] = [];
    for (const workout of get().workoutQueue) {
      const startT = Date.now();
      try {
        const res = await fetch(`${API_BASE_URL}/workouts/logs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            clientSyncId: workout.clientSyncId,
            workoutPlanId: workout.workoutPlanId,
            name: workout.name,
            notes: workout.notes,
            clientCapturedAt: workout.clientCapturedAt,
            exercises: workout.exercises,
          }),
        });

        const durationMs = Date.now() - startT;

        if (res.ok || res.status === 409) {
          successCount++;
          await syncTracer.recordEvent({
            type: 'WORKOUT',
            status: 'SUCCESS',
            httpStatus: res.status,
            clientSyncId: workout.clientSyncId,
            durationMs,
          });
        } else {
          remainingWorkouts.push({ ...workout, retryCount: workout.retryCount + 1 });
          failedCount++;
          await syncTracer.recordEvent({
            type: 'WORKOUT',
            status: 'FAILED',
            httpStatus: res.status,
            clientSyncId: workout.clientSyncId,
            errorMessage: `HTTP ${res.status}: ${res.statusText}`,
            durationMs,
          });
        }
      } catch (err: any) {
        remainingWorkouts.push({ ...workout, retryCount: workout.retryCount + 1 });
        failedCount++;
        await syncTracer.recordEvent({
          type: 'WORKOUT',
          status: 'FAILED',
          clientSyncId: workout.clientSyncId,
          errorMessage: err?.message || 'Network request failed (offline / unreachable)',
          durationMs: Date.now() - startT,
        });
      }
    }

    // 2. Sincronizzazione Nutrizione
    const remainingNutrition: QueuedNutritionLog[] = [];
    for (const item of get().nutritionQueue) {
      const startT = Date.now();
      try {
        const res = await fetch(`${API_BASE_URL}/nutrition/logs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            clientSyncId: item.clientSyncId,
            foodName: item.foodName,
            barcode: item.barcode,
            calories: item.calories,
            proteins: item.proteins,
            carbs: item.carbs,
            fats: item.fats,
            grams: item.grams,
            mealType: item.mealType,
            date: item.clientCapturedAt,
          }),
        });

        const durationMs = Date.now() - startT;

        if (res.ok || res.status === 409) {
          successCount++;
          await syncTracer.recordEvent({
            type: 'NUTRITION',
            status: 'SUCCESS',
            httpStatus: res.status,
            clientSyncId: item.clientSyncId,
            durationMs,
          });
        } else {
          remainingNutrition.push({ ...item, retryCount: item.retryCount + 1 });
          failedCount++;
          await syncTracer.recordEvent({
            type: 'NUTRITION',
            status: 'FAILED',
            httpStatus: res.status,
            clientSyncId: item.clientSyncId,
            errorMessage: `HTTP ${res.status}`,
            durationMs,
          });
        }
      } catch (err: any) {
        remainingNutrition.push({ ...item, retryCount: item.retryCount + 1 });
        failedCount++;
        await syncTracer.recordEvent({
          type: 'NUTRITION',
          status: 'FAILED',
          clientSyncId: item.clientSyncId,
          errorMessage: err?.message || 'Network request failed',
          durationMs: Date.now() - startT,
        });
      }
    }

    // 3. Sincronizzazione Foto Progressi (Multipart upload con expo-file-system)
    const remainingPhotos: QueuedPhotoUpload[] = [];
    for (const photo of get().photoQueue) {
      const startT = Date.now();
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.localFileUri);
        if (!fileInfo.exists) {
          // File non trovato su disco, rimuovi per non bloccare la coda
          continue;
        }

        const uploadParameters: Record<string, string> = {
          clientSyncId: photo.clientSyncId,
          clientCapturedAt: photo.clientCapturedAt,
          category: photo.category,
          notes: photo.notes || '',
        };

        if (photo.weightKg !== undefined && photo.weightKg !== null) {
          uploadParameters.weightKg = String(photo.weightKg);
        }

        const uploadResponse = await FileSystem.uploadAsync(
          `${API_BASE_URL}/media/progress/upload`,
          photo.localFileUri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            parameters: uploadParameters,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        );

        const durationMs = Date.now() - startT;

        if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
          // REGOLA DI BUSINESS: Garbage Collection manuale - elimina fisicamente il file solo dopo il 200 OK
          try {
            await FileSystem.deleteAsync(photo.localFileUri, { idempotent: true });
          } catch (delErr) {
            console.warn('Errore eliminazione file temporaneo post-upload:', delErr);
          }
          successCount++;
          await syncTracer.recordEvent({
            type: 'PHOTO',
            status: 'SUCCESS',
            httpStatus: uploadResponse.status,
            clientSyncId: photo.clientSyncId,
            durationMs,
          });
        } else {
          remainingPhotos.push({ ...photo, retryCount: photo.retryCount + 1 });
          failedCount++;
          await syncTracer.recordEvent({
            type: 'PHOTO',
            status: 'FAILED',
            httpStatus: uploadResponse.status,
            clientSyncId: photo.clientSyncId,
            errorMessage: `Upload status ${uploadResponse.status}`,
            durationMs,
          });
        }
      } catch (err: any) {
        remainingPhotos.push({ ...photo, retryCount: photo.retryCount + 1 });
        failedCount++;
        await syncTracer.recordEvent({
          type: 'PHOTO',
          status: 'FAILED',
          clientSyncId: photo.clientSyncId,
          errorMessage: err?.message || 'Upload failed',
          durationMs: Date.now() - startT,
        });
      }
    }

    const updatedLogs = await syncTracer.getLogs();

    set({
      workoutQueue: remainingWorkouts,
      nutritionQueue: remainingNutrition,
      photoQueue: remainingPhotos,
      isSyncing: false,
      lastSyncAt: new Date().toISOString(),
      syncLogs: updatedLogs,
    });

    await saveStateToStorage(get());
    return { success: successCount, failed: failedCount };
  },

  clearAllQueues: async () => {
    set({
      workoutQueue: [],
      photoQueue: [],
      nutritionQueue: [],
    });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));

async function saveStateToStorage(state: SyncStoreState) {
  try {
    const dataToSave = {
      workoutQueue: state.workoutQueue,
      photoQueue: state.photoQueue,
      nutritionQueue: state.nutritionQueue,
      lastSyncAt: state.lastSyncAt,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (err) {
    console.error('Errore nel salvataggio offline sync store:', err);
  }
}
