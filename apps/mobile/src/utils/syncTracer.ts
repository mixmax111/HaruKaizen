import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'WORKOUT' | 'NUTRITION' | 'PHOTO';
  status: 'SUCCESS' | 'FAILED' | 'RETRY';
  httpStatus?: number;
  clientSyncId: string;
  errorMessage?: string;
  durationMs?: number;
}

const SYNC_LOGS_STORAGE_KEY = 'harukaizen_sync_tracer_logs_v1';
const MAX_LOGS_RETENTION = 60; // Mantieni gli ultimi 60 log per non sovraccaricare AsyncStorage

class SyncTracerService {
  private logs: SyncLogEntry[] = [];
  private isLoaded: boolean = false;

  async loadLogs(): Promise<SyncLogEntry[]> {
    if (this.isLoaded) return this.logs;
    try {
      const raw = await AsyncStorage.getItem(SYNC_LOGS_STORAGE_KEY);
      if (raw) {
        this.logs = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[SyncTracer] Impossibile caricare i log locali:', e);
    }
    this.isLoaded = true;
    return this.logs;
  }

  async recordEvent(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): Promise<void> {
    await this.loadLogs();
    const newEntry: SyncLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    this.logs = [newEntry, ...this.logs].slice(0, MAX_LOGS_RETENTION);

    try {
      await AsyncStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.warn('[SyncTracer] Errore nel salvataggio del log:', e);
    }
  }

  async getLogs(): Promise<SyncLogEntry[]> {
    return this.loadLogs();
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    await AsyncStorage.removeItem(SYNC_LOGS_STORAGE_KEY);
  }
}

export const syncTracer = new SyncTracerService();
