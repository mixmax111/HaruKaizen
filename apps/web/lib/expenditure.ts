/**
 * Biomechanical Set-Based Calorie Expenditure (Client-Side Helper)
 * 
 * Accurately estimates calories burned during a live gym session based on completed sets,
 * TUT (Time Under Tension), load relative to bodyweight, RPE, and recovery EPOC phases.
 */

export interface LiveSetItem {
  setType?: string | null;
  repsCompleted?: number | null;
  weightKg?: number | null;
  rpe?: number | null;
  restSeconds?: number | null;
  exerciseName?: string | null;
}

export function isWarmupExercise(name?: string | null): boolean {
  if (!name) return false;
  return /(warm-?up|riscaldamento|stretching|mobilit[aà]|elastici)/i.test(name);
}

export function calculateLiveExpenditure(
  sets: LiveSetItem[],
  userWeightKg: number = 75,
): { caloriesBurned: number; effectiveDurationMinutes: number; totalVolumeKg: number } {
  if (!sets || sets.length === 0) {
    return { caloriesBurned: 0, effectiveDurationMinutes: 0, totalVolumeKg: 0 };
  }

  const safeWeight = userWeightKg > 0 ? userWeightKg : 75;
  let totalKcal = 0;
  let totalSeconds = 0;
  let totalVolumeKg = 0;

  for (const set of sets) {
    const isWarmupSet =
      (set.setType && set.setType.toUpperCase() === 'WARMUP') ||
      isWarmupExercise(set.exerciseName);

    const reps = typeof set.repsCompleted === 'number' && set.repsCompleted > 0 ? set.repsCompleted : 10;
    const tutSeconds = Math.min(75, Math.max(15, reps * 3.5));

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

    const rawRest =
      typeof set.restSeconds === 'number' && !isNaN(set.restSeconds) && set.restSeconds > 0
        ? set.restSeconds
        : isWarmupSet
        ? 60
        : 90;
    const restSeconds = Math.min(180, Math.max(30, rawRest));
    const restMet = isWarmupSet ? 1.3 : 1.8;

    const activeKcal = (tutSeconds / 60) * ((activeMet * 3.5 * safeWeight) / 200);
    const restKcal = (restSeconds / 60) * ((restMet * 3.5 * safeWeight) / 200);

    totalKcal += activeKcal + restKcal;
    totalSeconds += tutSeconds + restSeconds;

    if (!isWarmupSet) {
      const weight = typeof set.weightKg === 'number' && !isNaN(set.weightKg) ? Math.max(0, set.weightKg) : 0;
      totalVolumeKg += reps * weight;
    }
  }

  return {
    caloriesBurned: Math.round(totalKcal),
    effectiveDurationMinutes: Math.max(1, Math.round(totalSeconds / 60)),
    totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
  };
}

