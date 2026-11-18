/**
 * Macchina a Stati Finita Pura e Deterministica per il Timer di Allenamento (packages/shared)
 * 
 * Proprietà:
 * - Pura, senza side effect (nessun `setInterval` o timer interno).
 * - Totalmente serializzabile in JSON (primitive number/string/boolean/null).
 * - Modalità recupero configurabile: 'FORCED' (blocco serie successiva) o 'ADVISORY' (consultivo).
 * - Calcolo di `actualRestSeconds` deducendo le pause accumulate (`pausedAccumulatedMs`).
 * - Protezione contro clock rollback e salti temporali dell'orologio di sistema.
 */

export type TimerStatus =
  | 'IDLE'
  | 'PREPARATION'
  | 'WORK'
  | 'REST'
  | 'NEXT_SET'
  | 'PAUSED'
  | 'DONE';

export type RestTimerMode = 'FORCED' | 'ADVISORY';

export interface TimerMachineState {
  status: TimerStatus;
  previousStatus?: TimerStatus;
  mode: RestTimerMode;
  targetEndTime: number | null;
  secondsRemaining: number;
  totalDurationSeconds: number;
  restStartedAtMs: number | null;
  pausedAtMs: number | null;
  pausedAccumulatedMs: number;
  lastCompletedSetClientId: string | null;
  actualRestSeconds: number | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  canStartNextSet: boolean;
}

export type TimerEvent =
  | { type: 'START_PREPARATION'; durationSeconds: number; exerciseIndex?: number; setIndex?: number }
  | { type: 'START_WORK'; clientSideId?: string; isTimeBased?: boolean; durationSeconds?: number }
  | { type: 'FINISH_SET'; clientSideId: string; restSeconds: number; mode?: RestTimerMode }
  | { type: 'SKIP_REST' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ADD_SECONDS'; seconds: number }
  | { type: 'SUBTRACT_SECONDS'; seconds: number }
  | { type: 'TICK'; nowMs: number }
  | { type: 'FINISH_EXERCISE' }
  | { type: 'FINISH_SESSION' };

/**
 * Crea lo stato iniziale della macchina a stati timer.
 * Default di progetto: mode = 'FORCED'.
 */
export function createInitialTimerState(
  initialConfig?: Partial<TimerMachineState>,
): TimerMachineState {
  return {
    status: 'IDLE',
    mode: initialConfig?.mode ?? 'FORCED',
    targetEndTime: null,
    secondsRemaining: 0,
    totalDurationSeconds: 0,
    restStartedAtMs: null,
    pausedAtMs: null,
    pausedAccumulatedMs: 0,
    lastCompletedSetClientId: null,
    actualRestSeconds: null,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    canStartNextSet: true,
    ...initialConfig,
  };
}

/**
 * Reducer puro deterministico per la macchina a stati del timer di workout.
 * @param state Stato attuale
 * @param event Evento scatenante
 * @param nowMs Timestamp corrente in ms (se omesso o non fornito dall'evento, usa Date.now())
 */
export function timerMachineReducer(
  state: TimerMachineState,
  event: TimerEvent,
  nowMs: number = Date.now(),
): TimerMachineState {
  switch (event.type) {
    case 'START_PREPARATION': {
      const dur = Math.max(0, event.durationSeconds);
      if (dur === 0) {
        return {
          ...state,
          status: 'WORK',
          targetEndTime: null,
          secondsRemaining: 0,
          totalDurationSeconds: 0,
          canStartNextSet: true,
          currentExerciseIndex: event.exerciseIndex ?? state.currentExerciseIndex,
          currentSetIndex: event.setIndex ?? state.currentSetIndex,
        };
      }

      return {
        ...state,
        status: 'PREPARATION',
        totalDurationSeconds: dur,
        secondsRemaining: dur,
        targetEndTime: nowMs + dur * 1000,
        pausedAtMs: null,
        pausedAccumulatedMs: 0,
        canStartNextSet: false,
        currentExerciseIndex: event.exerciseIndex ?? state.currentExerciseIndex,
        currentSetIndex: event.setIndex ?? state.currentSetIndex,
      };
    }

    case 'START_WORK': {
      // Se proveniamo da REST o NEXT_SET, calcola l'actualRestSeconds della serie appena conclusa
      let computedActualRest: number | null = state.actualRestSeconds;
      if (state.restStartedAtMs !== null) {
        const elapsedRaw = nowMs - state.restStartedAtMs - state.pausedAccumulatedMs;
        computedActualRest = Math.max(0, Math.round(elapsedRaw / 1000));
      }

      const isTime = Boolean(event.isTimeBased && event.durationSeconds && event.durationSeconds > 0);
      const workDur = isTime ? event.durationSeconds! : 0;

      return {
        ...state,
        status: 'WORK',
        targetEndTime: isTime ? nowMs + workDur * 1000 : null,
        secondsRemaining: workDur,
        totalDurationSeconds: workDur,
        restStartedAtMs: null,
        pausedAtMs: null,
        pausedAccumulatedMs: 0,
        actualRestSeconds: computedActualRest,
        canStartNextSet: true,
      };
    }

    case 'FINISH_SET': {
      const activeMode = event.mode ?? state.mode;
      const restDur = Math.max(0, event.restSeconds);

      if (restDur === 0) {
        // Ultima serie o nessun recupero configurato
        return {
          ...state,
          status: 'NEXT_SET',
          mode: activeMode,
          lastCompletedSetClientId: event.clientSideId,
          restStartedAtMs: null,
          targetEndTime: null,
          secondsRemaining: 0,
          totalDurationSeconds: 0,
          pausedAtMs: null,
          pausedAccumulatedMs: 0,
          canStartNextSet: true,
        };
      }

      return {
        ...state,
        status: 'REST',
        mode: activeMode,
        lastCompletedSetClientId: event.clientSideId,
        restStartedAtMs: nowMs,
        pausedAtMs: null,
        pausedAccumulatedMs: 0,
        totalDurationSeconds: restDur,
        secondsRemaining: restDur,
        targetEndTime: nowMs + restDur * 1000,
        // In FORCED, bloccato finché il timer non scade o non si preme SKIP_REST. In ADVISORY, sempre libero.
        canStartNextSet: activeMode === 'ADVISORY',
      };
    }

    case 'SKIP_REST': {
      if (state.status !== 'REST' && state.status !== 'PAUSED') {
        return state;
      }

      // Sblocca immediatamente la serie successiva ma preserva restStartedAtMs per actualRestSeconds
      return {
        ...state,
        status: 'NEXT_SET',
        targetEndTime: null,
        secondsRemaining: 0,
        pausedAtMs: null,
        canStartNextSet: true,
      };
    }

    case 'PAUSE': {
      if (state.status === 'PAUSED' || state.status === 'IDLE' || state.status === 'DONE') {
        return state;
      }

      return {
        ...state,
        previousStatus: state.status,
        status: 'PAUSED',
        pausedAtMs: nowMs,
      };
    }

    case 'RESUME': {
      if (state.status !== 'PAUSED') {
        return state;
      }

      const pauseDuration = state.pausedAtMs ? Math.max(0, nowMs - state.pausedAtMs) : 0;
      const newAccumulated = state.pausedAccumulatedMs + pauseDuration;
      const newTargetEndTime = state.targetEndTime ? state.targetEndTime + pauseDuration : null;
      const resumedStatus = state.previousStatus ?? 'REST';

      return {
        ...state,
        status: resumedStatus,
        previousStatus: undefined,
        pausedAtMs: null,
        pausedAccumulatedMs: newAccumulated,
        targetEndTime: newTargetEndTime,
      };
    }

    case 'ADD_SECONDS': {
      if (!state.targetEndTime) return state;
      const deltaMs = event.seconds * 1000;
      const newTarget = state.targetEndTime + deltaMs;
      const newTotal = state.totalDurationSeconds + event.seconds;
      const newRemaining = Math.max(0, Math.ceil((newTarget - nowMs) / 1000));

      return {
        ...state,
        targetEndTime: newTarget,
        totalDurationSeconds: newTotal,
        secondsRemaining: newRemaining,
      };
    }

    case 'SUBTRACT_SECONDS': {
      if (!state.targetEndTime) return state;
      const deltaMs = event.seconds * 1000;
      // Non scendere sotto nowMs
      const newTarget = Math.max(nowMs, state.targetEndTime - deltaMs);
      const newRemaining = Math.max(0, Math.ceil((newTarget - nowMs) / 1000));

      return {
        ...state,
        targetEndTime: newTarget,
        secondsRemaining: newRemaining,
      };
    }

    case 'TICK': {
      const currentMs = event.nowMs ?? nowMs;

      if (state.status === 'PAUSED' || !state.targetEndTime) {
        return state;
      }

      // Protezione contro clock rollback dell'orologio di sistema (orologio saltato indietro)
      let adjustedTarget = state.targetEndTime;
      if (currentMs < state.targetEndTime - state.totalDurationSeconds * 1000) {
        adjustedTarget = currentMs + state.totalDurationSeconds * 1000;
      }

      // Timer scaduto naturalmente
      if (currentMs >= adjustedTarget) {
        if (state.status === 'PREPARATION') {
          return {
            ...state,
            status: 'WORK',
            targetEndTime: null,
            secondsRemaining: 0,
            totalDurationSeconds: 0,
            canStartNextSet: true,
          };
        }

        if (state.status === 'REST') {
          return {
            ...state,
            status: 'NEXT_SET',
            targetEndTime: null,
            secondsRemaining: 0,
            canStartNextSet: true,
          };
        }

        if (state.status === 'WORK') {
          return {
            ...state,
            targetEndTime: null,
            secondsRemaining: 0,
          };
        }
      }

      // Timer ancora attivo: ricalcola i secondi rimanenti con ceiling
      const remaining = Math.max(
        0,
        Math.min(state.totalDurationSeconds, Math.ceil((adjustedTarget - currentMs) / 1000)),
      );

      return {
        ...state,
        targetEndTime: adjustedTarget,
        secondsRemaining: remaining,
      };
    }

    case 'FINISH_EXERCISE': {
      return {
        ...state,
        currentExerciseIndex: state.currentExerciseIndex + 1,
        currentSetIndex: 0,
      };
    }

    case 'FINISH_SESSION': {
      return {
        ...state,
        status: 'DONE',
        targetEndTime: null,
        secondsRemaining: 0,
        canStartNextSet: false,
      };
    }

    default:
      return state;
  }
}
