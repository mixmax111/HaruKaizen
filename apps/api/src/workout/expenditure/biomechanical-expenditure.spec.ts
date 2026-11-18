import { describe, it, expect } from 'vitest';
import { calculateWorkoutExpenditure, BiomechanicalSetInput } from './biomechanical-expenditure.js';

describe('Biomechanical Expenditure Engine', () => {
  it('should return 0 calories and duration for empty sets', () => {
    const result = calculateWorkoutExpenditure({
      sets: [],
      userWeightKg: 80,
      wallClockDurationMinutes: 45,
    });

    expect(result.caloriesBurned).toBe(0);
    expect(result.effectiveDurationMinutes).toBe(0);
    expect(result.totalWorkingVolumeKg).toBe(0);
  });

  it('should accurately calculate expenditure for a standard 23-set workout (approx 215-235 kcal for 80kg user)', () => {
    const sets: BiomechanicalSetInput[] = [
      // 2 Warmup sets
      { setType: 'WARMUP', repsCompleted: 10, weightKg: 20, restSeconds: 60, exerciseName: 'Riscaldamento Elastici' },
      { setType: 'WARMUP', repsCompleted: 10, weightKg: 30, restSeconds: 60, exerciseName: 'Mobilità Spalle' },
      // 21 Working sets (hypertrophic compound & isolation)
      ...Array.from({ length: 7 }, () => ({
        setType: 'WORKING',
        repsCompleted: 10,
        weightKg: 85,
        rpe: 8.5,
        restSeconds: 90,
        exerciseName: 'Panca Piana Bilanciere',
      })),
      ...Array.from({ length: 7 }, () => ({
        setType: 'WORKING',
        repsCompleted: 10,
        weightKg: 70,
        rpe: 8.5,
        restSeconds: 90,
        exerciseName: 'Lat Machine Neutra',
      })),
      ...Array.from({ length: 7 }, () => ({
        setType: 'WORKING',
        repsCompleted: 12,
        weightKg: 45,
        rpe: 9,
        restSeconds: 90,
        exerciseName: 'Military Press Manubri',
      })),
    ];

    expect(sets.length).toBe(23);

    const result = calculateWorkoutExpenditure({
      sets,
      userWeightKg: 80,
      wallClockDurationMinutes: 90, // User left phone open for 90m
    });

    // 23 sets for 80kg user should be between 215 and 235 gross kcal, and approx 150-175 net kcal
    expect(result.grossCaloriesBurned).toBeGreaterThanOrEqual(215);
    expect(result.grossCaloriesBurned).toBeLessThanOrEqual(235);
    expect(result.caloriesBurned).toBeGreaterThanOrEqual(150);
    expect(result.caloriesBurned).toBeLessThanOrEqual(175);

    // Wall-clock of 90m should be capped to effectiveDurationMinutes (~44-50m) because 90 > effective * 1.5
    expect(result.effectiveDurationMinutes).toBeGreaterThanOrEqual(40);
    expect(result.effectiveDurationMinutes).toBeLessThanOrEqual(55);
    expect(result.finalDurationMinutes).toBe(result.effectiveDurationMinutes);

    // Volume should exclude warmup sets (2 * 10 * 20 + 2 * 10 * 30 excluded)
    // 7 * 10 * 85 (5950) + 7 * 10 * 70 (4900) + 7 * 12 * 45 (3780) = 14630 kg
    expect(result.totalWorkingVolumeKg).toBe(14630);
  });

  it('should preserve wallClockDuration if within 1.5x of effective duration', () => {
    const sets: BiomechanicalSetInput[] = Array.from({ length: 10 }, () => ({
      setType: 'WORKING',
      repsCompleted: 10,
      weightKg: 60,
      rpe: 8,
      restSeconds: 90,
    }));

    // 10 sets * (35s TUT + 90s rest) = 1250s ~ 21 minutes
    const result = calculateWorkoutExpenditure({
      sets,
      userWeightKg: 75,
      wallClockDurationMinutes: 25, // 25 is within 21 * 1.5 (31.5)
    });

    expect(result.finalDurationMinutes).toBe(25);
  });

  it('should clamp TUT to [15, 75] seconds and rest to [30, 180] seconds', () => {
    const extremeSets: BiomechanicalSetInput[] = [
      // Very high reps: 40 reps * 3.5 = 140s -> clamped to 75s
      { setType: 'WORKING', repsCompleted: 40, weightKg: 10, restSeconds: 400 }, // rest clamped to 180s
      // Very low reps: 1 rep * 3.5 = 3.5s -> clamped to 15s
      { setType: 'WORKING', repsCompleted: 1, weightKg: 10, restSeconds: 10 }, // rest clamped to 30s
    ];

    const result = calculateWorkoutExpenditure({
      sets: extremeSets,
      userWeightKg: 75,
    });

    // Set 1: TUT 75s, Rest 180s -> 255s
    // Set 2: TUT 15s, Rest 30s -> 45s
    // Total seconds: 300s = 5 minutes
    expect(result.effectiveDurationMinutes).toBe(5);
  });
});
