import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataAggregatorService } from './data-aggregator.service.js';
import { NotFoundException } from '@nestjs/common';

describe('DataAggregatorService Spec', () => {
  let service: DataAggregatorService;

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    measurement: {
      findMany: vi.fn(),
    },
    nutritionLog: {
      findMany: vi.fn(),
    },
    workoutLog: {
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DataAggregatorService(mockPrisma as any);
  });

  it('dovrebbe sollevare NotFoundException se l’utente non esiste', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.buildWeeklySnapshot('unknown-user'),
    ).rejects.toThrow(NotFoundException);
  });

  it('dovrebbe aggregare correttamente misurazioni, nutrizione e serie di allenamento nello snapshot', async () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 28);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'alex@harukaizen.dev',
      heightCm: 178,
      birthDate,
      sex: 'M',
      lifestyleMultiplier: 1.55,
      dietTrackingMode: 0,
      userSettings: {
        preferredLlmProvider: 'openai',
      },
    });

    mockPrisma.measurement.findMany.mockResolvedValue([
      { weightKg: 78.5, bodyFatPercentage: 14.2, recordedAt: new Date() },
      { weightKg: 79.0, bodyFatPercentage: 14.5, recordedAt: new Date(Date.now() - 86400000 * 7) },
    ]);

    mockPrisma.nutritionLog.findMany.mockResolvedValue([
      {
        caloriesConsumed: 2400,
        proteinConsumed: 160,
        carbsConsumed: 280,
        fatConsumed: 70,
        loggedAt: new Date(),
      },
    ]);

    mockPrisma.workoutLog.findMany.mockResolvedValue([
      {
        id: 'wlog-1',
        name: 'Gambe & Core',
        startedAt: new Date(),
        completedAt: new Date(Date.now() + 3600000),
        durationMinutes: 60,
        estimatedCaloriesBurned: 450,
        logExercises: [
          {
            exerciseNameSnapshot: 'Squat',
            isSkipped: false,
            logSets: [
              { setType: 'WARMUP', weightKg: 50, repsCompleted: 10 },
              { setType: 'WORKING', weightKg: 100, repsCompleted: 8 },
              { setType: 'WORKING', weightKg: 100, repsCompleted: 8 },
            ],
          },
        ],
      },
    ]);

    const snapshot = await service.buildWeeklySnapshot('user-1');

    expect(snapshot.user.id).toBe('user-1');
    expect(snapshot.measurements.currentWeightKg).toBe(78.5);
    expect(snapshot.measurements.deltaWeightKg).toBe(-0.5);
    expect(snapshot.nutrition.estimatedTdeeCalories).toBeGreaterThan(2000);

    expect(snapshot.nutrition.totalDaysLogged).toBe(1);
    expect(snapshot.nutrition.avgDailyCalories).toBe(2400);

    // Verifica aggregazione workout e calcolo working volume (esclude serie WARMUP: 100*8 + 100*8 = 1600kg)
    expect(snapshot.workout.totalSessions).toBe(1);
    expect(snapshot.workout.totalWorkingVolumeKg).toBe(1600);
    expect(snapshot.workout.sessions[0].exercisesCompleted).toContain('Squat');
  });
});
