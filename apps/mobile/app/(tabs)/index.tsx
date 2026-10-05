import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { COLORS, API_BASE_URL } from '../../src/config';
import { useSyncStore } from '../../src/stores/syncStore';
import { hapticFeedback } from '../../src/utils/haptics';

export default function HomeScreen() {
  const {
    workoutQueue,
    photoQueue,
    nutritionQueue,
    isSyncing,
    lastSyncAt,
    syncLogs,
    initializeStore,
    processSyncQueue,
    refreshLogs,
  } = useSyncStore();

  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  useEffect(() => {
    // Inizializza coda offline da AsyncStorage al mount
    initializeStore();

    // Ascolta cambiamenti di connettività di rete
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsConnected(online);

      // Auto-sync non appena torna online se ci sono elementi in coda
      if (online) {
        processSyncQueue();
      }
    });

    return () => unsubscribe();
  }, [initializeStore, processSyncQueue]);

  const totalPending = workoutQueue.length + photoQueue.length + nutritionQueue.length;

  const handleManualSync = async () => {
    await hapticFeedback.medium();
    const res = await processSyncQueue();
    await hapticFeedback.success();
    Alert.alert(
      'Sincronizzazione Terminata',
      `Elementi sincronizzati: ${res.success}. Falliti/In attesa: ${res.failed}.`
    );
  };

  const handleOpenLogs = async () => {
    await refreshLogs();
    setIsLogsModalOpen(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner Stato Connessione & Host IP attivo */}
        <View
          style={[
            styles.networkBanner,
            isConnected ? styles.bannerOnline : styles.bannerOffline,
          ]}
        >
          <View
            style={[
              styles.networkDot,
              { backgroundColor: isConnected ? COLORS.primary : COLORS.danger },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.networkText}>
              {isConnected
                ? 'Connesso a Internet • Cloud Sync Attivo'
                : 'Modalità Offline • Dati salvati in locale'}
            </Text>
            <Text style={styles.ipText} numberOfLines={1}>
              Backend: {API_BASE_URL}
            </Text>
          </View>
        </View>

        {/* Dashboard Title */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Benvenuto Atleta,</Text>
          <Text style={styles.title}>HaruKaizen Mobile Hub</Text>
        </View>

        {/* Card Stato Offline Sync */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <View>
              <Text style={styles.syncTitle}>Coda di Sincronizzazione</Text>
              <Text style={styles.syncSubtitle}>
                {totalPending === 0
                  ? 'Tutti i dati sono sincronizzati con il cloud'
                  : `${totalPending} elementi in attesa di upload`}
              </Text>
            </View>
            {isSyncing && <ActivityIndicator color={COLORS.primary} />}
          </View>

          <View style={styles.queueStatsRow}>
            <View style={styles.queueStat}>
              <Text style={styles.statVal}>{workoutQueue.length}</Text>
              <Text style={styles.statLabel}>Allenamenti</Text>
            </View>
            <View style={styles.queueStat}>
              <Text style={styles.statVal}>{nutritionQueue.length}</Text>
              <Text style={styles.statLabel}>Alimenti</Text>
            </View>
            <View style={styles.queueStat}>
              <Text style={styles.statVal}>{photoQueue.length}</Text>
              <Text style={styles.statLabel}>Foto</Text>
            </View>
          </View>

          {lastSyncAt && (
            <Text style={styles.lastSyncText}>
              Ultimo sync: {new Date(lastSyncAt).toLocaleTimeString()}
            </Text>
          )}

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.btnSync, isSyncing && styles.btnSyncDisabled]}
              disabled={isSyncing}
              onPress={handleManualSync}
            >
              <Text style={styles.btnSyncText}>
                {isSyncing ? 'Sincronizzazione in corso...' : 'Sincronizza Ora'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnLogs} onPress={handleOpenLogs}>
              <Text style={styles.btnLogsText}>Debug Logs ({syncLogs.length})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Links / Summary */}
        <Text style={styles.sectionTitle}>ATTIVITÀ RAPIDE</Text>
        <View style={styles.shortcutsRow}>
          <View style={styles.shortcutCard}>
            <Text style={styles.shortcutIcon}>🏋️</Text>
            <Text style={styles.shortcutTitle}>Gym Mode</Text>
            <Text style={styles.shortcutDesc}>Keep-awake e Rest Timer</Text>
          </View>
          <View style={styles.shortcutCard}>
            <Text style={styles.shortcutIcon}>📷</Text>
            <Text style={styles.shortcutTitle}>Ghosting</Text>
            <Text style={styles.shortcutDesc}>Allineamento fotografico</Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal Tracciamento Eventi Sync (Debug Console) */}
      <Modal visible={isLogsModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📡 Log di Sincronizzazione</Text>
              <TouchableOpacity onPress={() => setIsLogsModalOpen(false)}>
                <Text style={styles.closeBtn}>Chiudi</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Eventi catturati in tempo reale durante i tentativi di upload al server Docker:
            </Text>

            <ScrollView style={styles.logsScrollView}>
              {syncLogs.length === 0 ? (
                <Text style={styles.noLogsText}>Nessun evento registrato finora.</Text>
              ) : (
                syncLogs.map((log) => (
                  <View
                    key={log.id}
                    style={[
                      styles.logItem,
                      log.status === 'SUCCESS' ? styles.logSuccess : styles.logFailed,
                    ]}
                  >
                    <View style={styles.logHeaderRow}>
                      <Text style={styles.logBadge}>{log.type}</Text>
                      <Text
                        style={[
                          styles.logStatus,
                          { color: log.status === 'SUCCESS' ? COLORS.primary : COLORS.danger },
                        ]}
                      >
                        {log.status} {log.httpStatus ? `(HTTP ${log.httpStatus})` : ''}
                      </Text>
                    </View>
                    <Text style={styles.logTime}>
                      {new Date(log.timestamp).toLocaleTimeString()} • {log.durationMs || 0}ms
                    </Text>
                    {log.errorMessage ? (
                      <Text style={styles.logError}>{log.errorMessage}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  networkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  bannerOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  bannerOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  ipText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
  },
  syncCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 24,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  syncSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  queueStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#27272a',
    marginBottom: 14,
  },
  queueStat: {
    alignItems: 'center',
  },
  statVal: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  lastSyncText: {
    color: COLORS.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSync: {
    flex: 1.2,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSyncDisabled: {
    opacity: 0.6,
  },
  btnSyncText: {
    color: '#09090b',
    fontWeight: '700',
    fontSize: 14,
  },
  btnLogs: {
    flex: 0.8,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnLogsText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  shortcutIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  shortcutTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  shortcutDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  modalDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  logsScrollView: {
    maxHeight: 350,
  },
  noLogsText: {
    color: COLORS.textDim,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 20,
  },
  logItem: {
    backgroundColor: '#27272a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  logSuccess: {
    borderLeftColor: COLORS.primary,
  },
  logFailed: {
    borderLeftColor: COLORS.danger,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logBadge: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },
  logStatus: {
    fontWeight: '700',
    fontSize: 12,
  },
  logTime: {
    color: COLORS.textDim,
    fontSize: 11,
  },
  logError: {
    color: '#f87171',
    fontSize: 11,
    marginTop: 4,
  },
});
