/**
 * Biomechanical Set-Based Calorie & Duration Expenditure Engine
 * 
 * Replaces naive wall-clock MET estimation with physiological per-set TUT (Time Under Tension)
 * and EPOC-elevated inter-set rest phases based on ACSM metabolic guidelines.
 */

export interface BiomechanicalSetInput {
  setType?: string | null;
  repsCompleted?: number | null;
  weightKg?: number | null;
  rpe?: number | null;
  restSeconds?: number | null;
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
  caloriesBurned: number;
  totalWorkingVolumeKg: number;
}

export function isWarmupExercise(name?: string | null): boolean {
  if (!name) return false;
  return /(warm-?up|riscaldamento|stretching|mobilit[aà]|elastici)/i.test(name);
}

/**
 * Calculates biomechanical energy expenditure and duration from completed sets.
 */
export function calculateWorkoutExpenditure(input: WorkoutExpenditureInput): WorkoutExpenditureResult {
  const { sets, userWeightKg, wallClockDurationMinutes } = input;
  const safeWeight = userWeightKg && userWeightKg > 0 ? userWeightKg : 75;

  if (!sets || sets.length === 0) {
    const rawWallClock = wallClockDurationMinutes ? Math.max(0, Math.round(wallClockDurationMinutes)) : 0;
    return {
      effectiveDurationMinutes: 0,
      finalDurationMinutes: rawWallClock,
      caloriesBurned: 0,
      totalWorkingVolumeKg: 0,
    };
  }

  let totalSeconds = 0;
  let totalKcal = 0;
  let totalWorkingVolumeKg = 0;

  for (const set of sets) {
    const isWarmupSet =
      (set.setType && set.setType.toUpperCase() === 'WARMUP') ||
      isWarmupExercise(set.exerciseName);

    // TUT (Time Under Tension): clamped [15, 75] seconds
    const reps = typeof set.repsCompleted === 'number' && set.repsCompleted > 0 ? set.repsCompleted : 10;
    const tutSeconds = Math.min(75, Math.max(15, reps * 3.5));

    // Active MET
    let activeMet: number;
    if (isWarmupSet) {
      activeMet = 3.0;
    } else {
      const baseMet = 5.5;
      const rpe = typeof set.rpe === 'number' && !isNaN(set.rpe) ? set.rpe : 8;
      const rpeBonus = Math.max(0, (rpe - 7) * 0.4);
      const weight = typeof set.weightKg === 'number' && !isNaN(set.weightKg) ? Math.max(0, set.weightKg) : 0;
      const loadBonus = Math.min(2.0, (weight / safeWeight) * 1.5);
      activeMet = baseMet + rpeBonus + loadBonus;
    }

    // Controlled Rest Phase: clamped [30, 180] seconds
    const rawRest =
      typeof set.restSeconds === 'number' && !isNaN(set.restSeconds) && set.restSeconds > 0
        ? set.restSeconds
        : isWarmupSet
        ? 60
        : 90;
    const restSeconds = Math.min(180, Math.max(30, rawRest));
    const restMet = isWarmupSet ? 1.3 : 1.8;

    // ACSM Metabolic equation: kcal/min = (MET * 3.5 * weightKg) / 200
    const activeKcal = (tutSeconds / 60) * ((activeMet * 3.5 * safeWeight) / 200);
    const restKcal = (restSeconds / 60) * ((restMet * 3.5 * safeWeight) / 200);

    totalKcal += activeKcal + restKcal;
    totalSeconds += tutSeconds + restSeconds;

    // Working volume (exclude warmup)
    if (!isWarmupSet) {
      const weight = typeof set.weightKg === 'number' && !isNaN(set.weightKg) ? Math.max(0, set.weightKg) : 0;
      totalWorkingVolumeKg += reps * weight;
    }
  }

  const effectiveDurationMinutes = Math.max(1, Math.round(totalSeconds / 60));
  let finalDurationMinutes = effectiveDurationMinutes;

  if (wallClockDurationMinutes !== undefined && wallClockDurationMinutes !== null && wallClockDurationMinutes > 0) {
    // If phone was left idle and wallClock exceeds 1.5x effective duration, cap to effective
    if (wallClockDurationMinutes > effectiveDurationMinutes * 1.5) {
      finalDurationMinutes = effectiveDurationMinutes;
    } else {
      finalDurationMinutes = Math.max(1, Math.round(wallClockDurationMinutes));
    }
  }

  return {
    effectiveDurationMinutes,
    finalDurationMinutes,
    caloriesBurned: Math.round(totalKcal),
    totalWorkingVolumeKg: Math.round(totalWorkingVolumeKg * 100) / 100,
  };
}

