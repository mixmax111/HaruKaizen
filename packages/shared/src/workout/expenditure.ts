/**
 * Motore Fisiologico Unificato Biomeccanico Dispendio Energetico (packages/shared)
 * Conforme alle decisioni di progetto (Rev. 4/5):
 * - ACSM Equation: kcal/min = (MET * 3.5 * weightKg) / 200
 * - 1 MET basale = 1.05 kcal/kg/h
 * - netKcal = grossKcal - basalKcal (differenza esatta = ore * 1.05 * kg)
 * - Tetto activeMet per singola serie: 8.5 MET
 * - Sessione estrema: averageMet < 6.0 MET (atteso ~5.41 MET su 10 serie RPE 10 / rest 30s)
 * - Esercizi a tempo vs ripetizioni
 * - Filtro anti-inattività / standby: se wall clock > 1.5x effectiveDuration => cap a effectiveDuration
 */

export interface WorkoutSetExpenditureInput {
  setType?: string | null;
  repsCompleted?: number | null;
  durationSeconds?: number | null;
  weightKg?: number | null;
  rpe?: number | null;
  actualRestSeconds?: number | null;
  plannedRestSeconds?: number | null;
  restSeconds?: number | null; // legacy alias
}

export interface WorkoutExerciseExpenditureInput {
  id?: string;
  name?: string | null;
  exerciseName?: string | null;
  executionType?: 'REPETITIONS' | 'TIME' | string | null;
  metBase?: number | null;
  defaultMetValue?: number | null;
  sets: WorkoutSetExpenditureInput[];
}

export interface WorkoutFlatSetInput extends WorkoutSetExpenditureInput {
  exerciseName?: string | null;
  executionType?: 'REPETITIONS' | 'TIME' | string | null;
  metBase?: number | null;
  defaultMetValue?: number | null;
}

export interface WorkoutExpenditureInput {
  userWeightKg: number;
  sessionDurationMinutes?: number | null;
  exercises?: WorkoutExerciseExpenditureInput[];
  sets?: WorkoutFlatSetInput[];
}

export interface WorkoutExpenditureResult {
  grossKcal: number;
  netKcal: number;
  effectiveDurationMinutes: number;
  finalDurationMinutes: number;
  averageMet: number;
  totalWorkingVolumeKg: number;
}

export function isWarmupExercise(name?: string | null): boolean {
  if (!name) return false;
  return /(warm-?up|riscaldamento|stretching|mobilit[aà]|elastici)/i.test(name);
}

/**
 * Calcola il dispendio energetico biomeccanico (lordo e netto), durata e volume di lavoro.
 */
export function calculateWorkoutExpenditure(
  input: WorkoutExpenditureInput,
): WorkoutExpenditureResult {
  const { userWeightKg, sessionDurationMinutes, exercises, sets } = input;
  const safeWeight = userWeightKg && userWeightKg > 0 ? userWeightKg : 75;

  // Normalizza gli input in una lista uniforme di set
  type NormalizedSet = {
    setType: string;
    reps: number;
    durationSeconds: number;
    weightKg: number;
    rpe: number;
    restSeconds: number;
    isTimeBased: boolean;
    metBase: number;
    isWarmup: boolean;
  };

  const normalizedSets: NormalizedSet[] = [];

  if (Array.isArray(exercises) && exercises.length > 0) {
    for (const ex of exercises) {
      const exName = ex.name || ex.exerciseName || '';
      const isTime = ex.executionType === 'TIME';
      const base = ex.metBase ?? ex.defaultMetValue ?? (isTime ? 6.0 : 5.5);
      const isWarmupEx = isWarmupExercise(exName);

      if (Array.isArray(ex.sets)) {
        for (const s of ex.sets) {
          const isWarmup = (s.setType && s.setType.toUpperCase() === 'WARMUP') || isWarmupEx;
          const rawRest =
            typeof s.actualRestSeconds === 'number' && !isNaN(s.actualRestSeconds) && s.actualRestSeconds >= 0
              ? s.actualRestSeconds
              : typeof s.plannedRestSeconds === 'number' && !isNaN(s.plannedRestSeconds) && s.plannedRestSeconds >= 0
              ? s.plannedRestSeconds
              : typeof s.restSeconds === 'number' && !isNaN(s.restSeconds) && s.restSeconds >= 0
              ? s.restSeconds
              : isWarmup
              ? 60
              : 90;

          normalizedSets.push({
            setType: s.setType || 'WORKING',
            reps: typeof s.repsCompleted === 'number' && s.repsCompleted > 0 ? s.repsCompleted : 10,
            durationSeconds: typeof s.durationSeconds === 'number' && s.durationSeconds > 0 ? s.durationSeconds : 0,
            weightKg: typeof s.weightKg === 'number' && !isNaN(s.weightKg) ? Math.max(0, s.weightKg) : 0,
            rpe: typeof s.rpe === 'number' && !isNaN(s.rpe) ? s.rpe : 8,
            restSeconds: Math.min(300, Math.max(0, rawRest)),
            isTimeBased: isTime,
            metBase: base,
            isWarmup,
          });
        }
      }
    }
  } else if (Array.isArray(sets) && sets.length > 0) {
    for (const s of sets) {
      const isTime = s.executionType === 'TIME';
      const base = s.metBase ?? s.defaultMetValue ?? (isTime ? 6.0 : 5.5);
      const isWarmup =
        (s.setType && s.setType.toUpperCase() === 'WARMUP') || isWarmupExercise(s.exerciseName);
      const rawRest =
        typeof s.actualRestSeconds === 'number' && !isNaN(s.actualRestSeconds) && s.actualRestSeconds >= 0
          ? s.actualRestSeconds
          : typeof s.plannedRestSeconds === 'number' && !isNaN(s.plannedRestSeconds) && s.plannedRestSeconds >= 0
          ? s.plannedRestSeconds
          : typeof s.restSeconds === 'number' && !isNaN(s.restSeconds) && s.restSeconds >= 0
          ? s.restSeconds
          : isWarmup
          ? 60
          : 90;

      normalizedSets.push({
        setType: s.setType || 'WORKING',
        reps: typeof s.repsCompleted === 'number' && s.repsCompleted > 0 ? s.repsCompleted : 10,
        durationSeconds: typeof s.durationSeconds === 'number' && s.durationSeconds > 0 ? s.durationSeconds : 0,
        weightKg: typeof s.weightKg === 'number' && !isNaN(s.weightKg) ? Math.max(0, s.weightKg) : 0,
        rpe: typeof s.rpe === 'number' && !isNaN(s.rpe) ? s.rpe : 8,
        restSeconds: Math.min(300, Math.max(0, rawRest)),
        isTimeBased: isTime,
        metBase: base,
        isWarmup,
      });
    }
  }

  if (normalizedSets.length === 0) {
    const rawWallClock =
      sessionDurationMinutes && sessionDurationMinutes > 0
        ? Math.max(0, Math.round(sessionDurationMinutes))
        : 0;
    return {
      grossKcal: 0,
      netKcal: 0,
      effectiveDurationMinutes: 0,
      finalDurationMinutes: rawWallClock,
      averageMet: 0,
      totalWorkingVolumeKg: 0,
    };
  }

  let totalSeconds = 0;
  let totalGrossKcal = 0;
  let totalWorkingVolumeKg = 0;

  for (const set of normalizedSets) {
    // 1. Time Under Tension (TUT)
    let tutSeconds: number;
    let activeMet: number;

    if (set.isTimeBased) {
      tutSeconds = Math.min(3600, Math.max(5, set.durationSeconds > 0 ? set.durationSeconds : 30));
      if (set.isWarmup) {
        activeMet = 3.0;
      } else {
        activeMet = Math.min(8.5, Math.max(1.5, set.metBase));
      }
    } else {
      tutSeconds = Math.min(75, Math.max(15, set.reps * 3.5));
      if (set.isWarmup) {
        activeMet = 3.0;
      } else {
        const base = set.metBase > 0 ? set.metBase : 5.5;
        const rpeBonus = Math.max(0, (set.rpe - 7) * 0.4);
        const loadBonus = Math.min(2.0, (set.weightKg / safeWeight) * 1.5);
        activeMet = Math.min(8.5, base + rpeBonus + loadBonus);
      }
    }

    // 2. Controlled Rest Phase & EPOC
    const restSeconds = set.restSeconds;
    const restMet = set.isWarmup ? 1.3 : 1.8;

    // 3. ACSM Equation: kcal/min = (MET * 3.5 * safeWeight) / 200
    const activeKcal = (tutSeconds / 60) * ((activeMet * 3.5 * safeWeight) / 200);
    const restKcal = restSeconds > 0 ? (restSeconds / 60) * ((restMet * 3.5 * safeWeight) / 200) : 0;

    totalGrossKcal += activeKcal + restKcal;
    totalSeconds += tutSeconds + restSeconds;

    // 4. Working Volume (esclude warmup e time-based)
    if (!set.isWarmup && !set.isTimeBased) {
      totalWorkingVolumeKg += set.reps * set.weightKg;
    }
  }

  const effectiveDurationMinutes = Math.max(1, Math.round(totalSeconds / 60));
  let finalDurationMinutes = effectiveDurationMinutes;

  if (sessionDurationMinutes && sessionDurationMinutes > 0) {
    if (sessionDurationMinutes > effectiveDurationMinutes * 1.5) {
      // Idle / dimenticato aperto: cap a effectiveDuration
      finalDurationMinutes = effectiveDurationMinutes;
    } else {
      finalDurationMinutes = Math.max(1, Math.round(sessionDurationMinutes));
      if (finalDurationMinutes > effectiveDurationMinutes) {
        const excessMinutes = finalDurationMinutes - effectiveDurationMinutes;
        // Tempo eccedente entro il range 1.5x conteggiato a riposo passivo (1.0 MET)
        const excessKcal = (excessMinutes / 60) * ((1.0 * 3.5 * safeWeight) / 200);
        totalGrossKcal += excessKcal;
      }
    }
  }

  // Differenza esatta netta / lorda: Basal = minuti * (1.0 * 3.5 * pesoKg / 200) = ore * 1.05 * pesoKg
  const basalKcal = finalDurationMinutes * ((1.0 * 3.5 * safeWeight) / 200);

  const grossKcal = Math.round(totalGrossKcal);
  const netKcal = Math.max(0, Math.round(totalGrossKcal - basalKcal));

  // Average MET: totalGrossKcal / (finalDurationMinutes * (3.5 * safeWeight / 200))
  const averageMet =
    finalDurationMinutes > 0
      ? Math.round((totalGrossKcal / (finalDurationMinutes * ((3.5 * safeWeight) / 200))) * 100) / 100
      : 0;

  return {
    grossKcal,
    netKcal,
    effectiveDurationMinutes,
    finalDurationMinutes,
    averageMet,
    totalWorkingVolumeKg: Math.round(totalWorkingVolumeKg * 100) / 100,
  };
}
