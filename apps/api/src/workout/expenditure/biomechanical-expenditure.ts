/**
 * Biomechanical Set-Based Calorie & Duration Expenditure Engine
 * 
 * Delegated to @harukaizen/shared unified engine.
 * Retains backward-compatible interfaces for apps/api callers.
 */

import {
  calculateWorkoutExpenditure as sharedCalculateWorkoutExpenditure,
  isWarmupExercise as sharedIsWarmupExercise,
} from '@harukaizen/shared';

export interface BiomechanicalSetInput {
  setType?: string | null;
  repsCompleted?: number | null;
  durationSeconds?: number | null;
  weightKg?: number | null;
  rpe?: number | null;
  restSeconds?: number | null;
  actualRestSeconds?: number | null;
  exerciseName?: string | null;
}

export interface WorkoutExpenditureInput {
  sets: BiomechanicalSetInput[];
  userWeightKg?: number | null;
  wallClockDurationMinutes?: number | null;
}

export interface WorkoutExpenditureResult {
  effectiveDurationMinutes: number;
  finalDurationMinutes: number;
  caloriesBurned: number; // Net calories for API/budget
  grossCaloriesBurned: number; // Gross calories (metabolic total)
  netCaloriesBurned: number;
  grossKcal: number;
  netKcal: number;
  averageMet: number;
  totalWorkingVolumeKg: number;
}

export const isWarmupExercise = sharedIsWarmupExercise;

/**
 * Calculates biomechanical energy expenditure and duration by delegating to @harukaizen/shared.
 */
export function calculateWorkoutExpenditure(input: WorkoutExpenditureInput): WorkoutExpenditureResult {
  const { sets, userWeightKg, wallClockDurationMinutes } = input;

  const sharedResult = sharedCalculateWorkoutExpenditure({
    userWeightKg: userWeightKg && userWeightKg > 0 ? userWeightKg : 75,
    sessionDurationMinutes: wallClockDurationMinutes,
    sets: sets.map((s) => ({
      setType: s.setType,
      repsCompleted: s.repsCompleted,
      durationSeconds: s.durationSeconds,
      weightKg: s.weightKg,
      rpe: s.rpe,
      actualRestSeconds: s.actualRestSeconds ?? s.restSeconds,
      plannedRestSeconds: s.restSeconds,
      exerciseName: s.exerciseName,
    })),
  });

  return {
    effectiveDurationMinutes: sharedResult.effectiveDurationMinutes,
    finalDurationMinutes: sharedResult.finalDurationMinutes,
    caloriesBurned: sharedResult.netKcal,
    grossCaloriesBurned: sharedResult.grossKcal,
    netCaloriesBurned: sharedResult.netKcal,
    grossKcal: sharedResult.grossKcal,
    netKcal: sharedResult.netKcal,
    averageMet: sharedResult.averageMet,
    totalWorkingVolumeKg: sharedResult.totalWorkingVolumeKg,
  };
}
