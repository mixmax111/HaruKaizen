import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, API_BASE_URL } from '../../src/config';
import { apiClient } from '../../src/services/api';
import { hapticFeedback } from '../../src/utils/haptics';
import { useSyncStore } from '../../src/stores/syncStore';
import { useOfflineSyncStore } from '../../src/services/offlineSyncQueue';
import { LocalWorkoutExercise, LocalWorkoutSet } from '../../src/types/sync';
import { useRestTimer } from '../../src/hooks/useRestTimer';
import { CollapsibleExerciseCard } from '../../src/components/CollapsibleExerciseCard';
import { RestTimerBanner } from '../../src/components/workout/RestTimerBanner';
import {
  calculateWorkoutExpenditure,
  getCalorieEstimateEligibility,
  isEligibleForCalorieEstimate,
  BiomechanicalSetInput,
} from '@harukaizen/shared';

const DEFAULT_FREE_EXERCISES: LocalWorkoutExercise[] = [
  {
    id: 'ex-1',
    exerciseId: 'ex-bench-press',
    exerciseName: 'Panca Piana con Bilanciere',
    notes: 'RPE 8 target, fermo al petto 1s',
    sets: [
      { id: 's-1', setNumber: 1, setType: 'WORKING', weightKg: 80, repsCompleted: 8, rpe: 8, completed: false },
      { id: 's-2', setNumber: 2, setType: 'WORKING', weightKg: 82.5, repsCompleted: 8, rpe: 8.5, completed: false },
      { id: 's-3', setNumber: 3, setType: 'WORKING', weightKg: 85, repsCompleted: 6, rpe: 9, completed: false },
    ],
  },
  {
    id: 'ex-2',
    exerciseId: 'ex-incline-db',
    exerciseName: 'Spinte Manubri su Panca Inclinata',
    notes: 'Inclinazione 30 gradi',
    sets: [
      { id: 's-4', setNumber: 1, setType: 'WORKING', weightKg: 28, repsCompleted: 10, rpe: 8, completed: false },
      { id: 's-5', setNumber: 2, setType: 'WORKING', weightKg: 28, repsCompleted: 10, rpe: 8.5, completed: false },
      { id: 's-6', setNumber: 3, setType: 'FAILURE', weightKg: 28, repsCompleted: 9, rpe: 10, completed: false },
    ],
  },
];

export default function WorkoutScreen() {
  // 1. Schermo sempre attivo per tutta la sessione di palestra
  useKeepAwake();

  // 2. Offline Stores
  const { addPendingWorkoutLog, processSyncQueue } = useSyncStore();
  const { enqueueMutation: enqueueOfflineMutation } = useOfflineSyncStore();

  // 3. Rest Timer Hook matematico
  const {
    secondsRemaining,
    isRunning,
    formattedTime,
    progress,
    startTimer,
    addSeconds,
    subtractSeconds,
    cancelTimer,
  } = useRestTimer(90);

  // Piani di allenamento assegnati
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanDayId, setSelectedPlanDayId] = useState<string>('FREE');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [sessionStartTime] = useState<number>(Date.now());

  // Profilo utente per idoneità stima calorie
  const [userBirthDate, setUserBirthDate] = useState<string | null>(null);
  const [userWeightKg, setUserWeightKg] = useState<number | null>(null);

  // Stato Sessione Attiva
  const [workoutTitle, setWorkoutTitle] = useState('Sessione Palestra - Spinta / Push');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<LocalWorkoutExercise[]>(DEFAULT_FREE_EXERCISES);

  // Modale per aggiungere un esercizio custom
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newExName, setNewExName] = useState('');

  // Fetch piani attivi e profilo utente da backend tramite client API centralizzato
  useEffect(() => {
    async function loadWorkoutPlans() {
      try {
        const [plansRes, userRes, measRes] = await Promise.all([
          apiClient.get('/workout/plans').catch(() => ({ data: { data: [] } })),
          apiClient.get('/users/me').catch(() => ({ data: null })),
          apiClient.get('/measurements').catch(() => ({ data: { data: [] } })),
        ]);

        const list = plansRes.data?.data || plansRes.data;
        if (Array.isArray(list) && list.length > 0) {
          setPlans(list);
        }

        const user = userRes.data?.data || userRes.data;
        if (user?.birthDate) {
          setUserBirthDate(user.birthDate);
        }

        const measurements = measRes.data?.data || measRes.data;
        if (Array.isArray(measurements) && measurements.length > 0) {
          const sorted = [...measurements].sort(
            (a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
          );
          if (sorted[0]?.weightKg) {
            setUserWeightKg(Number(sorted[0].weightKg));
          }
        }
      } catch {
        // Fallback silenzioso su sessione libera
      }
    }

    loadWorkoutPlans();
  }, []);

  // Seleziona un giorno da un piano assegnato o sessione libera
  const handleSelectDay = (dayId: string, dayName: string, dayExercises?: any[], planId?: string) => {
    setSelectedPlanDayId(dayId);
    setSelectedPlanId(planId || null);
    setWorkoutTitle(dayName);

    if (dayId === 'FREE' || !dayExercises || dayExercises.length === 0) {
      setExercises(DEFAULT_FREE_EXERCISES);
      return;
    }

    // Mappa esercizi dal piano strutturato (WorkoutDayExercise Prisma model)
    const mapped: LocalWorkoutExercise[] = dayExercises.map((dex: any, idx: number) => {
      const setsCount = Number(dex.sets || dex.setsCount || dex.targetSets || 3);
      const rawReps = String(dex.repsTarget || dex.targetReps || '10');
      const targetRepsNum = parseInt(rawReps.match(/\d+/)?.[0] || '10', 10);
      const targetWeightNum = Number(dex.weightTarget ?? dex.targetWeightKg ?? 50);
      const targetRpeNum = Number(dex.rpeTarget ?? dex.targetRpe ?? 8);
      const restSec = Number(dex.restSeconds ?? 90);

      const sets: LocalWorkoutSet[] = [];
      for (let s = 1; s <= setsCount; s++) {
        sets.push({
          id: `s_${idx}_${s}_${Date.now()}`,
          setNumber: s,
          setType: 'WORKING',
          weightKg: targetWeightNum,
          repsCompleted: targetRepsNum,
          rpe: targetRpeNum,
          completed: false,
          prescribedWeightKg: targetWeightNum,
          prescribedReps: targetRepsNum,
        });
      }

      return {
        id: `ex_${idx}_${Date.now()}`,
        exerciseId: dex.exerciseId || dex.id || `ex_${idx}`,
        exerciseName: dex.exercise?.name || dex.name || `Esercizio ${idx + 1}`,
        notes: dex.notes || dex.exercise?.instructions || '',
        isExtraExercise: false,
        restSeconds: restSec,
        repsTarget: rawReps,
        weightTarget: targetWeightNum,
        sets,
      };
    });

    setExercises(mapped);
  };

  // Azioni sulle Serie: Toggle [✓] con Haptics Medium & Rest Timer automatico
  const handleToggleSet = async (exIdx: number, sIdx: number) => {
    const next = [...exercises];
    const targetSet = next[exIdx].sets[sIdx];
    const nextCompleted = !targetSet.completed;
    targetSet.completed = nextCompleted;
    setExercises(next);

    if (nextCompleted) {
      // Feedback aptico Medium conforme alle specifiche
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      // Avvia Rest Timer con i secondi target dell'esercizio
      const targetRest = next[exIdx]?.restSeconds || 90;
      startTimer(targetRest, next[exIdx]?.exerciseName);

      // Log immediato o accodamento offline
      enqueueOfflineMutation('CREATE_WORKOUT_LOG', {
        action: 'LOG_SINGLE_SET',
        workoutTitle,
        exerciseName: next[exIdx]?.exerciseName,
        setNumber: targetSet.setNumber,
        setType: targetSet.setType,
        weightKg: targetSet.weightKg,
        reps: targetSet.repsCompleted,
        rpe: targetSet.rpe,
        completedAt: new Date().toISOString(),
      }).catch(() => {});
    } else {
      await hapticFeedback.light();
    }
  };

  const handleUpdateWeight = async (exIdx: number, sIdx: number, delta: number) => {
    await hapticFeedback.light();
    const next = [...exercises];
    const targetSet = next[exIdx].sets[sIdx];
    targetSet.weightKg = Math.max(0, +(targetSet.weightKg + delta).toFixed(1));
    setExercises(next);
  };

  const handleUpdateReps = async (exIdx: number, sIdx: number, delta: number) => {
    await hapticFeedback.light();
    const next = [...exercises];
    const targetSet = next[exIdx].sets[sIdx];
    targetSet.repsCompleted = Math.max(0, targetSet.repsCompleted + delta);
    setExercises(next);
  };

  const handleUpdateSetType = (exIdx: number, sIdx: number) => {
    hapticFeedback.light();
    const next = [...exercises];
    const targetSet = next[exIdx].sets[sIdx];
    const current = targetSet.setType || 'WORKING';
    const order: Array<'WORKING' | 'WARMUP' | 'DROPSET' | 'FAILURE'> = [
      'WORKING',
      'WARMUP',
      'DROPSET',
      'FAILURE',
    ];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    targetSet.setType = order[nextIdx];
    setExercises(next);
  };

  const handleUpdateRpe = (exIdx: number, sIdx: number, delta: number) => {
    hapticFeedback.light();
    const next = [...exercises];
    const targetSet = next[exIdx].sets[sIdx];
    let currentRpe = targetSet.rpe || 8;
    currentRpe += delta;
    if (currentRpe > 10) currentRpe = 5;
    targetSet.rpe = +currentRpe.toFixed(1);
    setExercises(next);
  };

  const handleAddSet = (exIdx: number) => {
    const next = [...exercises];
    const ex = next[exIdx];
    const last = ex.sets[ex.sets.length - 1];
    const newSet: LocalWorkoutSet = {
      id: `s_${Date.now()}`,
      setNumber: ex.sets.length + 1,
      setType: 'WORKING',
      weightKg: last ? last.weightKg : 50,
      repsCompleted: last ? last.repsCompleted : 10,
      rpe: last ? last.rpe : 8,
      completed: false,
    };
    ex.sets.push(newSet);
    setExercises(next);
  };

  const handleAddExerciseSubmit = () => {
    if (!newExName.trim()) return;
    const newExercise: LocalWorkoutExercise = {
      id: `ex_${Date.now()}`,
      exerciseId: `custom_${Date.now()}`,
      exerciseName: newExName.trim(),
      isExtraExercise: true,
      restSeconds: 90,
      sets: [
        { id: `s_${Date.now()}`, setNumber: 1, setType: 'WORKING', weightKg: 20, repsCompleted: 10, rpe: 8, completed: false },
      ],
    };
    setExercises([...exercises, newExercise]);
    setNewExName('');
    setIsAddModalVisible(false);
  };

  // Helper messaggio per idoneità stima calorie
  const getEligibilityMessage = (eligibility: string): string | null => {
    switch (eligibility) {
      case 'MINOR':
        return 'Non disp. per minorenni';
      case 'AGE_UNKNOWN':
        return 'Data nascita mancante';
      case 'WEIGHT_UNKNOWN':
        return 'Peso mancante';
      default:
        return null;
    }
  };

  // Calcolo volume e calorie stimate fisiologiche
  const { totalVolumeKg, completedSetsCount, estimatedCalories, eligibilityMessage } = React.useMemo(() => {
    let setsCount = 0;
    const setsInput: BiomechanicalSetInput[] = [];

    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed) {
          setsCount++;
          setsInput.push({
            setType: s.setType,
            repsCompleted: s.repsCompleted,
            weightKg: s.weightKg,
            rpe: s.rpe,
            exerciseName: ex.exerciseName,
          });
        }
      });
    });

    const eligibility = getCalorieEstimateEligibility({
      birthDate: userBirthDate,
      weightKg: userWeightKg,
      referenceDate: new Date(sessionStartTime),
    });

    const isEligible = isEligibleForCalorieEstimate(eligibility);

    const result = calculateWorkoutExpenditure({
      sets: setsInput,
      userWeightKg: isEligible && userWeightKg ? userWeightKg : 75,
    });

    return {
      totalVolumeKg: result.totalWorkingVolumeKg,
      completedSetsCount: setsCount,
      estimatedCalories: isEligible ? result.caloriesBurned : null,
      eligibilityMessage: getEligibilityMessage(eligibility),
    };
  }, [exercises, userBirthDate, userWeightKg, sessionStartTime]);

  // Fine Allenamento: salvataggio offline idempotente
  const handleFinishWorkout = async () => {
    await hapticFeedback.success();

    const clientSyncId = `workout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const clientCapturedAt = new Date().toISOString();

    const durationMinutes = Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000));
    const completedSetsOnly = exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      notes: ex.notes || undefined,
      isExtraExercise: Boolean(ex.isExtraExercise),
      sets: ex.sets
        .filter((s) => s.completed)
        .map((s) => ({
          setNumber: s.setNumber,
          setType: s.setType || 'WORKING',
          weightKg: s.weightKg,
          repsCompleted: s.repsCompleted,
          rpe: s.rpe,
        })),
    })).filter((ex) => ex.sets.length > 0);

    const payload = {
      clientSyncId,
      planId: selectedPlanId || undefined,
      name: workoutTitle,
      clientCapturedAt,
      notes,
      durationMinutes,
      caloriesBurned: estimatedCalories ?? undefined,
      exercises: completedSetsOnly,
    };

    // Accoda nella nuova OfflineSyncQueue idempotente
    await enqueueOfflineMutation('CREATE_WORKOUT_LOG', payload);
    // Supporto per il tracer legacy
    await addPendingWorkoutLog({
      clientSyncId,
      name: workoutTitle,
      clientCapturedAt,
      notes,
      exercises: completedSetsOnly.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map((s) => ({
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          repsCompleted: s.repsCompleted,
          rpe: s.rpe,
        })),
      })),
    });

    Alert.alert(
      'Sessione Registrata!',
      'Workout salvato nella outbox idempotente (@harukaizen:offline_outbox_v1). I dati verranno sincronizzati automaticamente con il backend.',
      [
        {
          text: 'Sincronizza Ora',
          onPress: async () => {
            const res = await processSyncQueue();
            Alert.alert('Sync Terminato', `${res.success} sincronizzati. ${res.failed} in attesa.`);
          },
        },
        { text: 'OK', style: 'cancel' },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Lista Verticale con FlatList */}
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE GYM LOGGER • KEEP-AWAKE ATTIVO</Text>
            </View>

            {/* Live Telemetry Banner */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>VOLUME</Text>
                <Text style={styles.statValue}>{totalVolumeKg} kg</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>SERIE</Text>
                <Text style={styles.statValue}>{completedSetsCount}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>CALORIE (ACSM)</Text>
                <Text style={[styles.statValue, { color: COLORS.secondary }]}>
                  {estimatedCalories !== null ? `~${estimatedCalories} kcal` : '— kcal'}
                </Text>
                {estimatedCalories === null && eligibilityMessage ? (
                  <Text style={{ fontSize: 9, color: COLORS.tertiary, marginTop: 2, textAlign: 'center' }}>
                    {eligibilityMessage}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Selector Pills per Piano Assegnato / Quick Session */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.planPillRow}
            >
              <TouchableOpacity
                style={[
                  styles.planPill,
                  selectedPlanDayId === 'FREE' && styles.planPillActive,
                ]}
                onPress={() => handleSelectDay('FREE', 'Sessione Libera')}
              >
                <Text
                  style={[
                    styles.planPillText,
                    selectedPlanDayId === 'FREE' && styles.planPillTextActive,
                  ]}
                >
                  ⚡ Quick Free Session
                </Text>
              </TouchableOpacity>

              {plans.map((p) =>
                (p.workoutDays || p.days || []).map((d: any) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.planPill,
                      selectedPlanDayId === d.id && styles.planPillActive,
                    ]}
                    onPress={() => handleSelectDay(d.id, `${p.name} - ${d.name}`, d.workoutDayExercises || d.exercises, p.id)}
                  >
                    <Text
                      style={[
                        styles.planPillText,
                        selectedPlanDayId === d.id && styles.planPillTextActive,
                      ]}
                    >
                      📋 {d.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TextInput
              style={styles.titleInput}
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
              placeholder="Nome Sessione"
              placeholderTextColor="#71717a"
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <CollapsibleExerciseCard
            exercise={item}
            exerciseIndex={index}
            onToggleSet={handleToggleSet}
            onUpdateWeight={handleUpdateWeight}
            onUpdateReps={handleUpdateReps}
            onUpdateSetType={handleUpdateSetType}
            onUpdateRpe={handleUpdateRpe}
            onAddSet={handleAddSet}
          />
        )}
        ListFooterComponent={
          <View style={styles.footerArea}>
            <TouchableOpacity
              style={styles.btnAddEx}
              onPress={() => {
                hapticFeedback.light();
                setIsAddModalVisible(true);
              }}
            >
              <Text style={styles.btnAddExText}>+ AGGIUNGI ESERCIZIO ALLA SESSIONE</Text>
            </TouchableOpacity>

            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>NOTE SESSIONE (RPE, SENSAZIONI, FATICA):</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Es. Ottimo pompaggio, deltoidi carichi, recuperi regolari a 90s..."
                placeholderTextColor="#71717a"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.btnFinish} onPress={handleFinishWorkout}>
              <Text style={styles.btnFinishText}>&gt; COMPLETA E SALVA WORKOUT</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Persistent Rest Timer HUD Banner */}
      <RestTimerBanner
        isRunning={isRunning}
        formattedTime={formattedTime}
        progress={progress}
        secondsRemaining={secondsRemaining}
        onAddSeconds={addSeconds}
        onSubtractSeconds={subtractSeconds}
        onSkip={cancelTimer}
      />

      {/* Modale Aggiunta Esercizio */}
      <Modal visible={isAddModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Aggiungi Esercizio</Text>
            <TextInput
              style={styles.modalInput}
              value={newExName}
              onChangeText={setNewExName}
              placeholder="Es. Trazioni alla Sbarra"
              placeholderTextColor="#71717a"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleAddExerciseSubmit}
              >
                <Text style={styles.modalBtnConfirmText}>Aggiungi</Text>
              </TouchableOpacity>
            </View>
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
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  headerArea: {
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181920',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  liveBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#181920',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#71717a',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  planPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  planPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#181920',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  planPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(78,222,163,0.12)',
  },
  planPillText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    fontSize: 11,
  },
  planPillTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  titleInput: {
    backgroundColor: COLORS.card,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  footerArea: {
    marginTop: 10,
    gap: 14,
  },
  btnAddEx: {
    backgroundColor: '#181920',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnAddExText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  notesCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  notesLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#71717a',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesInput: {
    color: '#ffffff',
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  btnFinish: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  btnFinishText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.background,
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#181920',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  modalBtnCancel: {
    backgroundColor: '#27272a',
  },
  modalBtnCancelText: {
    color: '#a1a1aa',
    fontWeight: '600',
    fontSize: 12,
  },
  modalBtnConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalBtnConfirmText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
