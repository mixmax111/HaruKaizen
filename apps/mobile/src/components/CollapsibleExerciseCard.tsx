import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
  onUpdateSetType?: (exerciseIndex: number, setIndex: number) => void;
  onUpdateRpe?: (exerciseIndex: number, setIndex: number, delta: number) => void;
  onAddSet: (exerciseIndex: number) => void;
}

const SET_TYPE_LABELS: Record<string, string> = {
  WORKING: 'W',
  WARMUP: 'WU',
  DROPSET: 'D',
  FAILURE: 'F',
};

export const CollapsibleExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  exerciseIndex,
  onToggleSet,
  onUpdateWeight,
  onUpdateReps,
  onUpdateSetType,
  onUpdateRpe,
  onAddSet,
}) => {
  const allCompleted = exercise.sets.length > 0 && exercise.sets.every((s) => s.completed);
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
              {exercise.sets.length} serie completate • Tocca per espandere
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
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          {exercise.notes ? <Text style={styles.exerciseNotes}>{exercise.notes}</Text> : null}
        </View>
        {allCompleted && (
          <View style={styles.allDoneTag}>
            <Text style={styles.allDoneTagText}>COMPLETATO</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Tabella Intestazione Serie: SET, TYPE, KG, REPS, RPE, [✓] */}
      <View style={styles.setsHeaderRow}>
        <Text style={[styles.setColHeader, { flex: 0.6 }]}>SET</Text>
        <Text style={[styles.setColHeader, { flex: 0.8, textAlign: 'center' }]}>TYPE</Text>
        <Text style={[styles.setColHeader, { flex: 1.6 }]}>KG</Text>
        <Text style={[styles.setColHeader, { flex: 1.4 }]}>REPS</Text>
        <Text style={[styles.setColHeader, { flex: 1.1, textAlign: 'center' }]}>RPE</Text>
        <Text style={[styles.setColHeader, { flex: 0.9, textAlign: 'center' }]}>[✓]</Text>
      </View>

      {exercise.sets.map((set, sIdx) => {
        const typeKey = set.setType || 'WORKING';
        const typeLabel = SET_TYPE_LABELS[typeKey] || 'W';
        const rpeVal = set.rpe || 8;

        return (
          <View
            key={set.id}
            style={[styles.setRow, set.completed && styles.setRowCompleted]}
          >
            {/* Col 1: Set Number */}
            <Text style={[styles.setNumber, { flex: 0.6 }]}>{set.setNumber}</Text>

            {/* Col 2: Set Type Button (W / WU / D / F) */}
            <View style={{ flex: 0.8, alignItems: 'center' }}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  typeLabel === 'WU' && styles.typeBtnWarmup,
                  typeLabel === 'F' && styles.typeBtnFailure,
                  typeLabel === 'D' && styles.typeBtnDropset,
                ]}
                onPress={() => onUpdateSetType && onUpdateSetType(exerciseIndex, sIdx)}
              >
                <Text style={styles.typeBtnText}>{typeLabel}</Text>
              </TouchableOpacity>
            </View>

            {/* Col 3: Stepper Peso (KG) */}
            <View style={[styles.stepperContainer, { flex: 1.6 }]}>
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

            {/* Col 4: Stepper Ripetizioni */}
            <View style={[styles.stepperContainer, { flex: 1.4 }]}>
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

            {/* Col 5: Stepper RPE [5-10] */}
            <View style={{ flex: 1.1, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.rpeBtn}
                onPress={() => onUpdateRpe && onUpdateRpe(exerciseIndex, sIdx, 0.5)}
              >
                <Text style={styles.rpeBtnText}>@{rpeVal}</Text>
              </TouchableOpacity>
            </View>

            {/* Col 6: Checkbox Serie Completata [✓] */}
            <View style={{ flex: 0.9, alignItems: 'center' }}>
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
        );
      })}

      <TouchableOpacity
        style={styles.btnAddSet}
        onPress={() => {
          hapticFeedback.light();
          onAddSet(exerciseIndex);
        }}
      >
        <Text style={styles.btnAddSetText}>+ AGGIUNGI SERIE</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 14,
    marginBottom: 12,
  },
  cardAllDone: {
    borderColor: 'rgba(78,222,163,0.3)',
    backgroundColor: '#12171f',
  },
  cardCollapsed: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(78,222,163,0.3)',
    padding: 12,
    marginBottom: 10,
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(78,222,163,0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  exerciseNameCollapsed: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exerciseSummaryText: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
  },
  expandChevron: {
    color: '#71717a',
    fontSize: 11,
  },
  cardHeaderTouch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  exerciseNotes: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  allDoneTag: {
    backgroundColor: 'rgba(78,222,163,0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  allDoneTagText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    marginBottom: 4,
  },
  setColHeader: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#71717a',
    fontWeight: 'bold',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1f26',
  },
  setRowCompleted: {
    opacity: 0.75,
  },
  setNumber: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeBtn: {
    backgroundColor: '#1e1f26',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    minWidth: 26,
    alignItems: 'center',
  },
  typeBtnWarmup: {
    borderColor: '#eab308',
  },
  typeBtnFailure: {
    borderColor: '#ef4444',
  },
  typeBtnDropset: {
    borderColor: '#8b5cf6',
  },
  typeBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#e4e4e7',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181920',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 2,
    paddingVertical: 2,
    marginHorizontal: 3,
  },
  stepBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stepBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepperValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 26,
    textAlign: 'center',
  },
  rpeBtn: {
    backgroundColor: '#181920',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  rpeBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e1f26',
    borderWidth: 1,
    borderColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkText: {
    color: '#71717a',
    fontSize: 14,
  },
  checkTextActive: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  btnAddSet: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    alignItems: 'center',
  },
  btnAddSetText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
