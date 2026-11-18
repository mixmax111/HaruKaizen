import { describe, it, expect } from 'vitest';
import {
  createInitialTimerState,
  timerMachineReducer,
  TimerMachineState,
} from './timer-machine.js';

describe('Live Workout Timer State Machine (packages/shared)', () => {
  const baseTime = 1700000000000; // t0 in ms

  describe('Initial State & Defaults', () => {
    it('creates initial state in IDLE with FORCED mode as default', () => {
      const state = createInitialTimerState();
      expect(state.status).toBe('IDLE');
      expect(state.mode).toBe('FORCED');
      expect(state.canStartNextSet).toBe(true);
      expect(state.actualRestSeconds).toBeNull();
      expect(state.lastCompletedSetClientId).toBeNull();
      expect(state.targetEndTime).toBeNull();
      expect(state.secondsRemaining).toBe(0);
    });

    it('allows overriding mode to ADVISORY in initial state', () => {
      const state = createInitialTimerState({ mode: 'ADVISORY' });
      expect(state.mode).toBe('ADVISORY');
    });
  });

  describe('FORCED vs ADVISORY Rest Modes on FINISH_SET', () => {
    it('in FORCED mode: locks canStartNextSet to false until timer expires or SKIP_REST', () => {
      const state = createInitialTimerState({ mode: 'FORCED' });
      const nextState = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-1', restSeconds: 60 },
        baseTime,
      );

      expect(nextState.status).toBe('REST');
      expect(nextState.canStartNextSet).toBe(false);
      expect(nextState.secondsRemaining).toBe(60);
      expect(nextState.targetEndTime).toBe(baseTime + 60000);
      expect(nextState.lastCompletedSetClientId).toBe('set-1');
      expect(nextState.restStartedAtMs).toBe(baseTime);
    });

    it('in ADVISORY mode: keeps canStartNextSet = true during REST countdown', () => {
      const state = createInitialTimerState({ mode: 'ADVISORY' });
      const nextState = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-1', restSeconds: 90 },
        baseTime,
      );

      expect(nextState.status).toBe('REST');
      expect(nextState.canStartNextSet).toBe(true);
      expect(nextState.secondsRemaining).toBe(90);
    });
  });

  describe('Timer Expiry & SKIP_REST Behavior', () => {
    it('natural expiry on TICK transitions REST to NEXT_SET and unlocks canStartNextSet', () => {
      let state = createInitialTimerState({ mode: 'FORCED' });
      state = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-1', restSeconds: 30 },
        baseTime,
      );
      expect(state.canStartNextSet).toBe(false);

      // Advance by 15s
      state = timerMachineReducer(state, { type: 'TICK', nowMs: baseTime + 15000 }, baseTime + 15000);
      expect(state.status).toBe('REST');
      expect(state.secondsRemaining).toBe(15);
      expect(state.canStartNextSet).toBe(false);

      // Advance by 30s (timer expires)
      state = timerMachineReducer(state, { type: 'TICK', nowMs: baseTime + 30000 }, baseTime + 30000);
      expect(state.status).toBe('NEXT_SET');
      expect(state.secondsRemaining).toBe(0);
      expect(state.targetEndTime).toBeNull();
      expect(state.canStartNextSet).toBe(true);
    });

    it('SKIP_REST unlocks canStartNextSet immediately while keeping restStartedAtMs for actualRestSeconds measurement', () => {
      let state = createInitialTimerState({ mode: 'FORCED' });
      state = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-1', restSeconds: 60 },
        baseTime,
      );

      // User skips rest at 20s
      state = timerMachineReducer(state, { type: 'SKIP_REST' }, baseTime + 20000);
      expect(state.status).toBe('NEXT_SET');
      expect(state.canStartNextSet).toBe(true);
      expect(state.secondsRemaining).toBe(0);
      // Measurement continues ticking
      expect(state.restStartedAtMs).toBe(baseTime);

      // When user starts next set at 25s, actualRestSeconds is 25s!
      state = timerMachineReducer(state, { type: 'START_WORK', clientSideId: 'set-2' }, baseTime + 25000);
      expect(state.status).toBe('WORK');
      expect(state.actualRestSeconds).toBe(25);
      expect(state.lastCompletedSetClientId).toBe('set-1');
    });
  });

  describe('Pause & Resume Tracking with actualRestSeconds', () => {
    it('deducts paused duration from actualRestSeconds when starting next work set', () => {
      let state = createInitialTimerState();
      // Finish set-1 at t0, rest 60s
      state = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-1', restSeconds: 60 },
        baseTime,
      );

      // Pause at t0 + 10s
      state = timerMachineReducer(state, { type: 'PAUSE' }, baseTime + 10000);
      expect(state.status).toBe('PAUSED');
      expect(state.previousStatus).toBe('REST');
      expect(state.pausedAtMs).toBe(baseTime + 10000);

      // Resume at t0 + 30s (paused for 20s)
      state = timerMachineReducer(state, { type: 'RESUME' }, baseTime + 30000);
      expect(state.status).toBe('REST');
      expect(state.pausedAccumulatedMs).toBe(20000);
      expect(state.pausedAtMs).toBeNull();
      // Target end time deferred by 20s
      expect(state.targetEndTime).toBe(baseTime + 80000);

      // User starts next work set at t0 + 50s
      // Total wall clock elapsed = 50s, minus 20s pause = 30s actual rest!
      state = timerMachineReducer(state, { type: 'START_WORK', clientSideId: 'set-2' }, baseTime + 50000);
      expect(state.status).toBe('WORK');
      expect(state.actualRestSeconds).toBe(30);
    });
  });

  describe('Quick Adjustments (+/- 15s)', () => {
    it('ADD_SECONDS increases targetEndTime and secondsRemaining', () => {
      let state = createInitialTimerState();
      state = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-1', restSeconds: 60 },
        baseTime,
      );

      state = timerMachineReducer(state, { type: 'ADD_SECONDS', seconds: 15 }, baseTime);
      expect(state.secondsRemaining).toBe(75);
      expect(state.targetEndTime).toBe(baseTime + 75000);
    });

    it('SUBTRACT_SECONDS decreases remaining time clamped to current time', () => {
      let state = createInitialTimerState();
      state = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-1', restSeconds: 20 },
        baseTime,
      );

      state = timerMachineReducer(state, { type: 'SUBTRACT_SECONDS', seconds: 15 }, baseTime);
      expect(state.secondsRemaining).toBe(5);
      expect(state.targetEndTime).toBe(baseTime + 5000);
    });
  });

  describe('Clock Rollback & Clock Jump Protection', () => {
    it('protects against system clock jumping backwards by 30 minutes', () => {
      let state = createInitialTimerState();
      state = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-1', restSeconds: 60 },
        baseTime,
      );

      // Clock jumps back 30 minutes (nowMs = baseTime - 1800000)
      const jumpedBackMs = baseTime - 1800000;
      state = timerMachineReducer(state, { type: 'TICK', nowMs: jumpedBackMs }, jumpedBackMs);

      // secondsRemaining must not explode to 1860 seconds, it must be capped to totalDurationSeconds
      expect(state.secondsRemaining).toBeLessThanOrEqual(60);
      expect(state.secondsRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pure JSON Serializability Round-Trip', () => {
    it('serializes to JSON and restores perfectly without state loss', () => {
      let state = createInitialTimerState({ mode: 'FORCED' });
      state = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'set-alpha', restSeconds: 90 },
        baseTime,
      );
      state = timerMachineReducer(state, { type: 'PAUSE' }, baseTime + 15000);

      const jsonStr = JSON.stringify(state);
      const restored: TimerMachineState = JSON.parse(jsonStr);

      expect(restored).toEqual(state);

      // State machine continues normally from restored state
      const resumed = timerMachineReducer(restored, { type: 'RESUME' }, baseTime + 25000);
      expect(resumed.status).toBe('REST');
      expect(resumed.pausedAccumulatedMs).toBe(10000);
    });
  });

  describe('Last Set Without Rest (restSeconds = 0)', () => {
    it('transitions immediately to NEXT_SET if restSeconds is 0', () => {
      const state = createInitialTimerState({ mode: 'FORCED' });
      const nextState = timerMachineReducer(
        state,
        { type: 'FINISH_SET', clientSideId: 'final-set', restSeconds: 0 },
        baseTime,
      );

      expect(nextState.status).toBe('NEXT_SET');
      expect(nextState.canStartNextSet).toBe(true);
      expect(nextState.targetEndTime).toBeNull();
      expect(nextState.secondsRemaining).toBe(0);
    });
  });
});
