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
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, API_BASE_URL } from '../../src/config';
import { useSyncStore } from '../../src/stores/syncStore';
import { hapticFeedback } from '../../src/utils/haptics';

export default function MobileTelemetryHomeScreen() {
  const router = useRouter();
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [apiData, setApiData] = useState<{
    calories: number;
    caloriesTarget: number;
    weight: number;
    workoutsCount: number;
  }>({
    calories: 2450,
    caloriesTarget: 2800,
    weight: 76.4,
    workoutsCount: 5,
  });

  useEffect(() => {
    initializeStore();

    // Listener connettività di rete
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsConnected(online);
      if (online) {
        processSyncQueue();
      }
    });

    // Fetch dati live da NestJS
    async function fetchLiveTelemetry() {
      try {
        const token = await AsyncStorage.getItem('@harukaizen:auth_token');
        setIsAuthenticated(!!token);
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API_BASE_URL}/nutrition/summary?date=${today}`, { headers });
        if (res.ok) {
          const json = await res.json();
          const summary = json.data || json;
          if (summary) {
            setApiData((prev) => ({
              ...prev,
              calories: summary.totalCalories || prev.calories,
              caloriesTarget: summary.calorieTarget || prev.caloriesTarget,
            }));
          }
        }
      } catch (err) {
        // Fallback silenzioso su telemetria locale
      }
    }

    fetchLiveTelemetry();
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

  const caloriePct = Math.min(100, Math.round((apiData.calories / apiData.caloriesTarget) * 100));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Terminal Node Command Ribbon */}
        <View style={styles.ribbonCard}>
          <View style={styles.ribbonTopRow}>
            <View style={styles.daemonPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.daemonText}>DAEMON ONLINE</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (isAuthenticated) {
                  Alert.alert('Sessione Operatore', 'Disconnettere questo nodo mobile?', [
                    { text: 'Annulla', style: 'cancel' },
                    {
                      text: 'Disconnetti',
                      style: 'destructive',
                      onPress: async () => {
                        await AsyncStorage.removeItem('@harukaizen:auth_token');
                        setIsAuthenticated(false);
                        router.push('/(auth)/login' as any);
                      },
                    },
                  ]);
                } else {
                  router.push('/(auth)/login' as any);
                }
              }}
              style={styles.authBadgeBtn}
            >
              <Text style={[styles.authBadgeText, isAuthenticated && styles.authBadgeTextActive]}>
                {isAuthenticated ? '[AUTH: ACTIVE]' : '[AUTH: LOGIN]'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.ribbonBottomRow}>
            <Text style={styles.nodeAddressText}>
              NODE: {API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/v1$/, '')} • {isConnected ? 'ONLINE' : 'OFFLINE_CACHE'}
            </Text>
            <Text style={styles.latencyText}>12ms</Text>
          </View>
        </View>

        {/* 2. Header Title */}
        <View style={styles.header}>
          <Text style={styles.subTitleText}>&gt; CORE_TELEMETRY</Text>
          <Text style={styles.titleText}>Overview &amp; Telemetry</Text>
        </View>

        {/* 3. High-Density 2x2 Telemetry KPI Grid */}
        <View style={styles.kpiGrid}>
          {/* Tile 1: Energy Equilibrium */}
          <View style={styles.kpiTile}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>ENERGY EQUILIBRIUM</Text>
              <Text style={styles.kpiIcon}>🔥</Text>
            </View>
            <Text style={styles.kpiValue}>
              {apiData.calories}{' '}
              <Text style={styles.kpiUnit}>/ {apiData.caloriesTarget}</Text>
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${caloriePct}%`, backgroundColor: COLORS.primary }]} />
            </View>
            <Text style={styles.kpiFooterText}>Met: {caloriePct}% • Deficit -350</Text>
          </View>

          {/* Tile 2: Training Microcycle */}
          <View style={styles.kpiTile}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>TRAINING CYCLE</Text>
              <Text style={styles.kpiIcon}>🏋️</Text>
            </View>
            <Text style={styles.kpiValue}>
              {apiData.workoutsCount} <Text style={styles.kpiUnit}>/ 6 sets</Text>
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '83%', backgroundColor: COLORS.secondary }]} />
            </View>
            <Text style={styles.kpiFooterText}>Streak: 18d • Target 83%</Text>
          </View>

          {/* Tile 3: Body Mass Metric */}
          <View style={styles.kpiTile}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>BODY MASS METRIC</Text>
              <Text style={styles.kpiIcon}>⚖️</Text>
            </View>
            <Text style={styles.kpiValue}>
              {apiData.weight} <Text style={styles.kpiUnit}>kg</Text>
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '72%', backgroundColor: COLORS.primary }]} />
            </View>
            <Text style={styles.kpiFooterText}>-0.8kg 30d • Roll 76.6kg</Text>
          </View>

          {/* Tile 4: CNS Readiness */}
          <View style={styles.kpiTile}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>CNS READINESS</Text>
              <Text style={styles.kpiIcon}>🌙</Text>
            </View>
            <Text style={styles.kpiValue}>
              92% <Text style={styles.kpiUnit}>HRV 68</Text>
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '92%', backgroundColor: COLORS.secondary }]} />
            </View>
            <Text style={styles.kpiFooterText}>Peak Hypertrophy State</Text>
          </View>
        </View>

        {/* 4. Offline Sync Queue Ribbon */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeaderRow}>
            <View>
              <Text style={styles.syncTitle}>&gt; SYNC_PIPELINE</Text>
              <Text style={styles.syncSubtitle}>
                {totalPending === 0
                  ? 'All local WAL events synced to node'
                  : `${totalPending} events pending upload`}
              </Text>
            </View>
            {isSyncing && <ActivityIndicator color={COLORS.primary} />}
          </View>

          <View style={styles.queueStatsRow}>
            <View style={styles.queueCol}>
              <Text style={styles.queueVal}>{workoutQueue.length}</Text>
              <Text style={styles.queueLabel}>WORKOUTS</Text>
            </View>
            <View style={styles.queueCol}>
              <Text style={styles.queueVal}>{nutritionQueue.length}</Text>
              <Text style={styles.queueLabel}>NUTRITION</Text>
            </View>
            <View style={styles.queueCol}>
              <Text style={styles.queueVal}>{photoQueue.length}</Text>
              <Text style={styles.queueLabel}>MEDIA_GHOST</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btnSync, isSyncing && styles.btnSyncDisabled]}
              disabled={isSyncing}
              onPress={handleManualSync}
            >
              <Text style={styles.btnSyncText}>
                {isSyncing ? '[SYNCING...]' : '[SYNC NOW]'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnLogs} onPress={handleOpenLogs}>
              <Text style={styles.btnLogsText}>[LOGS: {syncLogs.length}]</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Fast Action Telemetry Hub */}
        <Text style={styles.sectionHeader}>&gt; EXECUTION_MODULES</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/workout')}
          >
            <Text style={styles.actionIcon}>🏋️</Text>
            <Text style={styles.actionTitle}>Gym Mode Logger</Text>
            <Text style={styles.actionDesc}>Anti-sleep timer &amp; haptics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/progress')}
          >
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionTitle}>Ghosting Camera</Text>
            <Text style={styles.actionDesc}>Pose overlay &amp; photogrammetry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sync Debug Logs Modal */}
      <Modal visible={isLogsModalOpen} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>&gt; NODE_SYNC_LOGS</Text>
              <TouchableOpacity onPress={() => setIsLogsModalOpen(false)}>
                <Text style={styles.closeBtn}>[CLOSE]</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.logsScrollView}>
              {syncLogs.length === 0 ? (
                <Text style={styles.noLogsText}>No pipeline events recorded.</Text>
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
                        {log.status} {log.httpStatus ? `HTTP ${log.httpStatus}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.logTime}>
                      {new Date(log.timestamp).toLocaleTimeString()} • {log.durationMs || 0}ms
                    </Text>
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
    paddingTop: 45,
    paddingBottom: 40,
  },
  ribbonCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    marginBottom: 16,
  },
  ribbonTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  daemonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.2)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  daemonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  authBadgeBtn: {
    backgroundColor: '#1e1f2b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2e303e',
  },
  authBadgeText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  authBadgeTextActive: {
    color: COLORS.primary,
  },
  ribbonBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nodeAddressText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  latencyText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  header: {
    marginBottom: 18,
  },
  subTitleText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginBottom: 2,
  },
  titleText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiTile: {
    width: '48.5%',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  kpiIcon: {
    fontSize: 12,
  },
  kpiValue: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  kpiUnit: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '400',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#27272a',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
  },
  kpiFooterText: {
    color: COLORS.textDim,
    fontSize: 9.5,
    fontFamily: 'monospace',
  },
  syncCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 20,
  },
  syncHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  syncSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  queueStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#27272a',
    marginBottom: 12,
  },
  queueCol: {
    alignItems: 'center',
    flex: 1,
  },
  queueVal: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  queueLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnSync: {
    flex: 1.2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSyncDisabled: {
    opacity: 0.6,
  },
  btnSyncText: {
    color: '#0d0e15',
    fontWeight: '700',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  btnLogs: {
    flex: 0.8,
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnLogsText: {
    color: COLORS.text,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actionDesc: {
    color: COLORS.textDim,
    fontSize: 10.5,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  closeBtn: {
    color: COLORS.textDim,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  logsScrollView: {
    maxHeight: 350,
  },
  noLogsText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginVertical: 20,
  },
  logItem: {
    backgroundColor: '#12131a',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
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
  },
  logBadge: {
    color: COLORS.text,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  logStatus: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  logTime: {
    color: COLORS.textDim,
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});
