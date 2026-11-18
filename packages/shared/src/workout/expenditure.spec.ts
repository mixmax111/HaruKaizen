import { describe, it, expect } from 'vitest';
import {
  calculateWorkoutExpenditure,
  WorkoutExpenditureInput,
} from './expenditure.js';

describe('Unified Biomechanical Expenditure Engine (packages/shared)', () => {
  it('returns zeroes for empty workout session', () => {
    const res = calculateWorkoutExpenditure({
      userWeightKg: 75,
      sessionDurationMinutes: 0,
      exercises: [],
    });

    expect(res).toEqual({
      grossKcal: 0,
      netKcal: 0,
      effectiveDurationMinutes: 0,
      finalDurationMinutes: 0,
      averageMet: 0,
      totalWorkingVolumeKg: 0,
    });
  });

  describe('Gross vs Net Calorie Mathematical Invariant', () => {
    it('verifies exact relation: grossKcal - netKcal = hours * 1.05 * weightKg', () => {
      const weight = 80;
      const res = calculateWorkoutExpenditure({
        userWeightKg: weight,
        exercises: [
          {
            name: 'Panca Piana',
            executionType: 'REPETITIONS',
            metBase: 6.0,
            sets: [
              { repsCompleted: 10, weightKg: 80, rpe: 8, actualRestSeconds: 90 },
              { repsCompleted: 8, weightKg: 85, rpe: 9, actualRestSeconds: 120 },
              { repsCompleted: 6, weightKg: 90, rpe: 10, actualRestSeconds: 120 },
            ],
          },
        ],
      });

      const hours = res.finalDurationMinutes / 60;
      const expectedBasalKcal = hours * 1.05 * weight;
      const delta = res.grossKcal - res.netKcal;

      // Tolleranza +/- 1 kcal dovuta all'arrotondamento
      expect(Math.abs(delta - expectedBasalKcal)).toBeLessThanOrEqual(1.5);
    });
  });

  describe('Analytical Plausibility Benchmarks (Rev. 4/5 Table)', () => {
    // Media di sessione plausibile m in [3.0, 4.2] MET
    // grossKcal = m * 1.05 * kg * h
    // netKcal = (m - 1) * 1.05 * kg * h
    const cases = [
      { weightKg: 50, durationMin: 45, minGross: 118, maxGross: 166, minNet: 78, maxNet: 126 },
      { weightKg: 60, durationMin: 60, minGross: 189, maxGross: 265, minNet: 126, maxNet: 202 },
      { weightKg: 75, durationMin: 60, minGross: 236, maxGross: 331, minNet: 158, maxNet: 252 },
      { weightKg: 90, durationMin: 60, minGross: 284, maxGross: 397, minNet: 189, maxNet: 302 },
      { weightKg: 110, durationMin: 90, minGross: 520, maxGross: 728, minNet: 347, maxNet: 555 },
    ];

    cases.forEach(({ weightKg, durationMin, minGross, maxGross, minNet, maxNet }) => {
      it(`falls within physiological bounds for ${weightKg}kg over ${durationMin}min`, () => {
        // Workout tipico strutturato in modo da riempire la durata specificata
        // Serie da 10 reps a carico moderato (70% BW) con 90s di recupero
        const setDurationSec = 35 + 90; // ~125s per set (TUT ~35s + 90s rest)
        const totalSets = Math.round((durationMin * 60) / setDurationSec);

        const sets = Array.from({ length: totalSets }, () => ({
          setType: 'WORKING',
          repsCompleted: 10,
          weightKg: Math.round(weightKg * 0.7),
          rpe: 8,
          actualRestSeconds: 90,
        }));

        const res = calculateWorkoutExpenditure({
          userWeightKg: weightKg,
          sessionDurationMinutes: durationMin,
          exercises: [{ name: 'Esercizio Standard', sets }],
        });

        expect(res.grossKcal).toBeGreaterThanOrEqual(minGross - 5);
        expect(res.grossKcal).toBeLessThanOrEqual(maxGross + 10);
        expect(res.netKcal).toBeGreaterThanOrEqual(minNet - 5);
        expect(res.netKcal).toBeLessThanOrEqual(maxNet + 10);
      });
    });
  });

  describe('Safety Caps & Extreme Session Stress Test', () => {
    it('caps activeMet per set at 8.5 MET max', () => {
      const res = calculateWorkoutExpenditure({
        userWeightKg: 70,
        exercises: [
          {
            name: 'Extreme Squat',
            metBase: 7.5,
            sets: [
              // Carico estremo (2.5x BW = 175kg), RPE 10
              { repsCompleted: 5, weightKg: 175, rpe: 10, actualRestSeconds: 180 },
            ],
          },
        ],
      });

      // Il MET medio non deve esplodere e le calorie devono essere realistiche
      expect(res.averageMet).toBeLessThan(8.5);
    });

    it('extreme session (RPE 10, heavy load, 30s rest) produces session averageMet < 6.0 (approx 5.4)', () => {
      // 10 serie massimali: 35s TUT a 8.5 MET, 30s rest a 1.8 MET
      // Met medio atteso: ((8.5 * 35) + (1.8 * 30)) / 65 = 5.41 MET
      const sets = Array.from({ length: 10 }, () => ({
        setType: 'WORKING',
        repsCompleted: 10,
        weightKg: 120,
        rpe: 10,
        actualRestSeconds: 30,
      }));

      const res = calculateWorkoutExpenditure({
        userWeightKg: 80,
        exercises: [{ name: 'Squat Esplosivo', metBase: 6.0, sets }],
      });

      expect(res.averageMet).toBeLessThan(6.0);
      expect(res.averageMet).toBeGreaterThan(5.0);
      expect(Math.abs(res.averageMet - 5.41)).toBeLessThan(0.15);
    });
  });

  describe('Time-Based Exercises vs Reps-Based Exercises', () => {
    it('calculates duration from durationSeconds for time-based exercises', () => {
      const res = calculateWorkoutExpenditure({
        userWeightKg: 70,
        exercises: [
          {
            name: 'Plank',
            executionType: 'TIME',
            metBase: 4.0,
            sets: [
              { durationSeconds: 60, repsCompleted: 1, actualRestSeconds: 30 },
              { durationSeconds: 45, repsCompleted: 1, actualRestSeconds: 30 },
            ],
          },
        ],
      });

      // Durata totale = 60 + 30 + 45 + 30 = 165s (~3 min)
      expect(res.effectiveDurationMinutes).toBe(3);
      expect(res.grossKcal).toBeGreaterThan(0);
      expect(res.totalWorkingVolumeKg).toBe(0); // Nessun sovraccarico
    });

    it('caps time-based TUT between 5 and 3600 seconds', () => {
      const res = calculateWorkoutExpenditure({
        userWeightKg: 70,
        exercises: [
          {
            name: 'Extremely Long Hold',
            executionType: 'TIME',
            metBase: 4.0,
            sets: [{ durationSeconds: 5000, actualRestSeconds: 60 }],
          },
        ],
      });

      // TUT clamped a 3600 s (60 min) + 60s rest = 61 min
      expect(res.effectiveDurationMinutes).toBe(61);
    });
  });

  describe('Anti-Inactivity & Idle Filter', () => {
    it('resets finalDurationMinutes to effectiveDurationMinutes if wall clock > 1.5x effective', () => {
      const res = calculateWorkoutExpenditure({
        userWeightKg: 75,
        sessionDurationMinutes: 180, // 3 ore dimenticato acceso
        exercises: [
          {
            name: 'Curl Bicipiti',
            sets: [
              { repsCompleted: 10, weightKg: 14, actualRestSeconds: 60 },
              { repsCompleted: 10, weightKg: 14, actualRestSeconds: 60 },
            ],
          },
        ],
      });

      // Solo 2 serie (~3 minuti effettivi). 180 min > 3 * 1.5 => cap a effectiveDuration
      expect(res.effectiveDurationMinutes).toBeLessThanOrEqual(4);
      expect(res.finalDurationMinutes).toBe(res.effectiveDurationMinutes);
    });

    it('preserves wall clock duration if within 1.5x effective', () => {
      // 10 serie: ~20 minuti effettivi
      const sets = Array.from({ length: 10 }, () => ({
        setType: 'WORKING',
        repsCompleted: 10,
        weightKg: 40,
        actualRestSeconds: 90,
      }));

      const res = calculateWorkoutExpenditure({
        userWeightKg: 70,
        sessionDurationMinutes: 25, // Plausibile entro 1.5x (~21 min * 1.5 = ~31 min)
        exercises: [{ name: 'Spalle', sets }],
      });

      expect(res.finalDurationMinutes).toBe(25);
    });
  });

  describe('Flat Sets Compatibility for Legacy / Simple Callers', () => {
    it('accepts flat sets array with exerciseName and metBase', () => {
      const res = calculateWorkoutExpenditure({
        userWeightKg: 75,
        sets: [
          { exerciseName: 'Riscaldamento', setType: 'WARMUP', repsCompleted: 15, weightKg: 0, actualRestSeconds: 60 },
          { exerciseName: 'Panca', setType: 'WORKING', repsCompleted: 10, weightKg: 80, rpe: 8, actualRestSeconds: 90 },
        ],
      });

      expect(res.effectiveDurationMinutes).toBeGreaterThan(0);
      expect(res.grossKcal).toBeGreaterThan(0);
      expect(res.netKcal).toBeGreaterThan(0);
      expect(res.totalWorkingVolumeKg).toBe(800); // 10 * 80 (warmup escluso)
    });
  });
});
