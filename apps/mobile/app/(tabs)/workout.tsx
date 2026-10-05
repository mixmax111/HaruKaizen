import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { COLORS } from '../../src/config';
import { hapticFeedback } from '../../src/utils/haptics';
import { useSyncStore } from '../../src/stores/syncStore';
import { LocalWorkoutExercise, LocalWorkoutSet } from '../../src/types/sync';
import { useRestTimer } from '../../src/hooks/useRestTimer';
import { FloatingRestPill } from '../../src/components/FloatingRestPill';
import { CollapsibleExerciseCard } from '../../src/components/CollapsibleExerciseCard';

export default function WorkoutScreen() {
  // 1. Schermo sempre attivo per tutta la sessione di palestra
  useKeepAwake();

  // 2. Store Zustand Offline & SyncTracer
  const { addPendingWorkoutLog, isSyncing, processSyncQueue } = useSyncStore();

  // 3. Rest Timer Hook matematico anti-background trap
  const {
    isRunning,
    formattedTime,
    progress,
    startTimer,
    addSeconds,
    subtractSeconds,
    cancelTimer,
  } = useRestTimer(90);

  // Stato Sessione Attiva
  const [workoutTitle, setWorkoutTitle] = useState('Sessione Palestra - Spinta / Push');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<LocalWorkoutExercise[]>([
    {
      id: 'ex-1',
      exerciseId: 'ex-bench-press',
      exerciseName: 'Panca Piana con Bilanciere',
      notes: 'RPE 8 target, fermo al petto 1s',
      sets: [
        { id: 's-1', setNumber: 1, weightKg: 80, repsCompleted: 8, prescribedWeightKg: 80, prescribedReps: 8, completed: false },
        { id: 's-2', setNumber: 2, weightKg: 82.5, repsCompleted: 8, prescribedWeightKg: 80, prescribedReps: 8, completed: false },
        { id: 's-3', setNumber: 3, weightKg: 85, repsCompleted: 6, prescribedWeightKg: 80, prescribedReps: 8, completed: false },
      ],
    },
    {
      id: 'ex-2',
      exerciseId: 'ex-incline-db',
      exerciseName: 'Spinte Manubri su Panca Inclinata',
      notes: 'Inclinazione 30 gradi',
      sets: [
        { id: 's-4', setNumber: 1, weightKg: 28, repsCompleted: 10, prescribedWeightKg: 28, prescribedReps: 10, completed: false },
        { id: 's-5', setNumber: 2, weightKg: 28, repsCompleted: 10, prescribedWeightKg: 28, prescribedReps: 10, completed: false },
        { id: 's-6', setNumber: 3, weightKg: 28, repsCompleted: 9, prescribedWeightKg: 28, prescribedReps: 10, completed: false },
      ],
    },
  ]);

  // Modale per aggiungere un esercizio custom
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newExName, setNewExName] = useState('');

  // Azioni sulle Serie con Haptics differenziati
  const handleToggleSet = async (exIdx: number, sIdx: number) => {
    const next = [...exercises];
    const targetSet = next[exIdx].sets[sIdx];
    const nextCompleted = !targetSet.completed;
    targetSet.completed = nextCompleted;
    setExercises(next);

    if (nextCompleted) {
      // Feedback aptico Medium per conferma serie completata
      await hapticFeedback.medium();
      // Avvia la Floating Rest Pill per 90 secondi con allarme contestuale
      startTimer(90, next[exIdx]?.exerciseName);
    } else {
      await hapticFeedback.light();
    }
  };

  const handleUpdateWeight = async (exIdx: number, sIdx: number, delta: number) => {
    // Feedback aptico Light per regolazione carico
    await hapticFeedback.light();
    const next = [...exercises];
    const targetSet = next[exIdx].sets[sIdx];
    targetSet.weightKg = Math.max(0, +(targetSet.weightKg + delta).toFixed(1));
    setExercises(next);
  };

  const handleUpdateReps = async (exIdx: number, sIdx: number, delta: number) => {
    // Feedback aptico Light per incremento/decremento rep
    await hapticFeedback.light();
    const next = [...exercises];
    const targetSet = next[exIdx].sets[sIdx];
    targetSet.repsCompleted = Math.max(0, targetSet.repsCompleted + delta);
    setExercises(next);
  };

  const handleAddSet = (exIdx: number) => {
    const next = [...exercises];
    const ex = next[exIdx];
    const last = ex.sets[ex.sets.length - 1];
    const newSet: LocalWorkoutSet = {
      id: `s_${Date.now()}`,
      setNumber: ex.sets.length + 1,
      weightKg: last ? last.weightKg : 50,
      repsCompleted: last ? last.repsCompleted : 10,
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
      sets: [
        { id: `s_${Date.now()}`, setNumber: 1, weightKg: 20, repsCompleted: 10, completed: false },
      ],
    };
    setExercises([...exercises, newExercise]);
    setNewExName('');
    setIsAddModalVisible(false);
  };

  // Fine Allenamento: salvataggio offline puro tramite addPendingWorkoutLog
  const handleFinishWorkout = async () => {
    await hapticFeedback.success();

    const clientSyncId = `workout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const clientCapturedAt = new Date().toISOString();

    const payload = {
      clientSyncId,
      name: workoutTitle,
      clientCapturedAt,
      notes,
      exercises: exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets
          .filter((s: LocalWorkoutSet) => s.completed)
          .map((s: LocalWorkoutSet) => ({
            setNumber: s.setNumber,
            weightKg: s.weightKg,
            repsCompleted: s.repsCompleted,
            rpe: s.rpe,
          })),
      })),
    };

    // Chiama l'action offline dello store senza bloccare la UI
    await addPendingWorkoutLog(payload);

    Alert.alert(
      'Sessione Registrata!',
      'Il workout è stato salvato nello store locale (Zustand + SyncTracer). Il worker sincronizzerà i dati automaticamente non appena tornerai connesso.',
      [
        {
          text: 'Sincronizza Adesso',
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
      {/* Lista Verticale ad alte prestazioni (FlatList) con Card collassabili */}
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE GYM MODE • KEEP-AWAKE ATTIVO</Text>
            </View>
            <TextInput
              style={styles.titleInput}
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
              placeholder="Nome Sessione"
              placeholderTextColor={COLORS.textDim}
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
              <Text style={styles.btnAddExText}>+ Aggiungi Esercizio</Text>
            </TouchableOpacity>

            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Note Allenamento / RPE Globale:</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Sensazioni, fatica muscolare, dolori articolari..."
                placeholderTextColor={COLORS.textDim}
                multiline
              />
            </View>

            <TouchableOpacity style={styles.btnFinish} onPress={handleFinishWorkout}>
              <Text style={styles.btnFinishText}>TERMINA E SALVA ALLENAMENTO</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Pillola Fluttuante (FloatingRestPill) per il Timer di Riposo */}
      <FloatingRestPill
        isRunning={isRunning}
        formattedTime={formattedTime}
        progress={progress}
        onAddSeconds={addSeconds}
        onSubtractSeconds={subtractSeconds}
        onCancel={cancelTimer}
      />

      {/* Modal Aggiungi Esercizio */}
      <Modal visible={isAddModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Aggiungi Esercizio</Text>
            <TextInput
              style={styles.modalInput}
              value={newExName}
              onChangeText={setNewExName}
              placeholder="Nome esercizio (es. Squat, Stacco)"
              placeholderTextColor={COLORS.textDim}
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
                <Text style={styles.modalBtnConfirmText}>Inserisci</Text>
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
    paddingBottom: 110, // Spazio extra per evitare sovrapposizione con la Floating Pill
  },
  headerArea: {
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  liveBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleInput: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  footerArea: {
    marginTop: 10,
  },
  btnAddEx: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnAddExText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  notesBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  notesLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesInput: {
    color: COLORS.text,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  btnFinish: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  btnFinishText: {
    color: '#09090b',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#27272a',
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalBtnCancel: {
    backgroundColor: '#27272a',
  },
  modalBtnCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalBtnConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalBtnConfirmText: {
    color: '#09090b',
    fontWeight: '700',
  },
});
