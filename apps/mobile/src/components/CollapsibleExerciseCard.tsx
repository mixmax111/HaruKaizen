import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { COLORS } from '../config';
import { hapticFeedback } from '../utils/haptics';
import { LocalWorkoutExercise, LocalWorkoutSet } from '../types/sync';

interface ExerciseCardProps {
  exercise: LocalWorkoutExercise;
  exerciseIndex: number;
  onToggleSet: (exerciseIndex: number, setIndex: number) => void;
  onUpdateWeight: (exerciseIndex: number, setIndex: number, delta: number) => void;
  onUpdateReps: (exerciseIndex: number, setIndex: number, delta: number) => void;
  onAddSet: (exerciseIndex: number) => void;
}

export const CollapsibleExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  exerciseIndex,
  onToggleSet,
  onUpdateWeight,
  onUpdateReps,
  onAddSet,
}) => {
  const allCompleted = exercise.sets.length > 0 && exercise.sets.every((s) => s.completed);
  // Se tutte le serie sono completate, collassa automaticamente lasciando la possibilità di espandere
  const [isManuallyExpanded, setIsManuallyExpanded] = useState<boolean>(false);
  const isCollapsed = allCompleted && !isManuallyExpanded;

  if (isCollapsed) {
    return (
      <TouchableOpacity
        style={styles.cardCollapsed}
        activeOpacity={0.7}
        onPress={() => {
          hapticFeedback.light();
          setIsManuallyExpanded(true);
        }}
      >
        <View style={styles.collapsedHeader}>
          <View style={styles.checkBadge}>
            <Text style={styles.checkBadgeText}>✓</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.exerciseNameCollapsed}>{exercise.exerciseName}</Text>
            <Text style={styles.exerciseSummaryText}>
              {exercise.sets.length} serie completate • Tocca per visualizzare
            </Text>
          </View>
          <Text style={styles.expandChevron}>▼</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, allCompleted && styles.cardAllDone]}>
      <TouchableOpacity
        style={styles.cardHeaderTouch}
        activeOpacity={0.8}
        onPress={() => {
          if (allCompleted) {
            hapticFeedback.light();
            setIsManuallyExpanded(false);
          }
        }}
      >
        <View>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          {exercise.notes ? <Text style={styles.exerciseNotes}>{exercise.notes}</Text> : null}
        </View>
        {allCompleted && (
          <View style={styles.allDoneTag}>
            <Text style={styles.allDoneTagText}>COMPLETATO</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Tabella Serie */}
      <View style={styles.setsHeaderRow}>
        <Text style={[styles.setColHeader, { flex: 0.8 }]}>SERIE</Text>
        <Text style={[styles.setColHeader, { flex: 2 }]}>PESO (KG)</Text>
        <Text style={[styles.setColHeader, { flex: 2 }]}>REPS</Text>
        <Text style={[styles.setColHeader, { flex: 1.2, textAlign: 'center' }]}>STATO</Text>
      </View>

      {exercise.sets.map((set, sIdx) => (
        <View
          key={set.id}
          style={[styles.setRow, set.completed && styles.setRowCompleted]}
        >
          <Text style={[styles.setNumber, { flex: 0.8 }]}>{set.setNumber}</Text>

          {/* Stepper Peso (KG) */}
          <View style={[styles.stepperContainer, { flex: 2 }]}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onUpdateWeight(exerciseIndex, sIdx, -2.5)}
            >
              <Text style={styles.stepBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{set.weightKg}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onUpdateWeight(exerciseIndex, sIdx, +2.5)}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Stepper Ripetizioni */}
          <View style={[styles.stepperContainer, { flex: 2 }]}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onUpdateReps(exerciseIndex, sIdx, -1)}
            >
              <Text style={styles.stepBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{set.repsCompleted}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onUpdateReps(exerciseIndex, sIdx, +1)}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Checkbox Serie Completata */}
          <View style={{ flex: 1.2, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.checkBtn, set.completed && styles.checkBtnActive]}
              onPress={() => onToggleSet(exerciseIndex, sIdx)}
            >
              <Text style={[styles.checkText, set.completed && styles.checkTextActive]}>
                {set.completed ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.btnAddSet}
        onPress={() => {
          hapticFeedback.light();
          onAddSet(exerciseIndex);
        }}
      >
        <Text style={styles.btnAddSetText}>+ Aggiungi Serie</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardAllDone: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  cardCollapsed: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadgeText: {
    color: '#09090b',
    fontWeight: '800',
    fontSize: 13,
  },
  exerciseNameCollapsed: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  exerciseSummaryText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  expandChevron: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  cardHeaderTouch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  exerciseNotes: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  allDoneTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  allDoneTagText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: 8,
  },
  setColHeader: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  setRowCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  setNumber: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    backgroundColor: '#27272a',
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stepperValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
  checkBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkText: {
    color: COLORS.textDim,
    fontSize: 16,
    fontWeight: '700',
  },
  checkTextActive: {
    color: '#09090b',
  },
  btnAddSet: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  btnAddSetText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
