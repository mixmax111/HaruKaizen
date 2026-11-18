import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkoutLogsService } from './workout-logs.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SetType } from '@harukaizen/shared';

describe('WorkoutLogsService', () => {
  let service: WorkoutLogsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      workoutLog: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      workoutLogExercise: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      workoutLogSet: {
        create: vi.fn(),
      },
      measurement: {
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ birthDate: new Date('1995-01-01') }),
      },
    };

    service = new WorkoutLogsService(mockPrisma as unknown as PrismaService);
  });

  it('should accurately calculate volume excluding WARMUP sets and calculate calories with biomechanical engine', async () => {
    const started = new Date(Date.now() - 60 * 60 * 1000); // 60 minuti fa (telefono lasciato aperto)

    mockPrisma.workoutLog.findUnique.mockResolvedValueOnce({
      id: 'log-1',
      userId: 'user-1',
      startedAt: started,
      finishedAt: null,
      deletedAt: null,
      logExercises: [
        {
          id: 'ex-1',
          isSkipped: false,
          exerciseNameSnapshot: 'Panca Piana',
          logSets: [
            { setType: SetType.WARMUP, repsCompleted: 15, weightKg: 50 }, // Warmup: NON conta nel volume
            { setType: SetType.WORKING, repsCompleted: 10, weightKg: 100, rpe: 8 }, // 1000 kg
            { setType: SetType.FAILURE, repsCompleted: 8, weightKg: 100, rpe: 9 },  // 800 kg
          ],
        },
        {
          id: 'ex-2',
          isSkipped: true, // Skipped: NON conta
          exerciseNameSnapshot: 'Croci Manubri',
          logSets: [
            { setType: SetType.WORKING, repsCompleted: 10, weightKg: 80 },
          ],
        },
      ],
    });

    mockPrisma.measurement.findFirst.mockResolvedValueOnce({
      weightKg: 80,
    });

    mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
      id: 'log-1',
      ...args.data,
      logExercises: [],
    }));

    const result = await service.finishSession('user-1', 'log-1');

    // Volume effettivo = (10 * 100) + (8 * 100) = 1800 kg
    expect(result.summary.totalWorkingVolumeKg).toBe(1800);
    // Capping anti-inattività: 60 minuti di wall-clock con solo 3 serie vengono cappati alla durata effettiva (~6-8 min)
    expect(result.summary.durationMinutes).toBeLessThan(15);
    // Calorie biomeccaniche per 3 serie (1 warmup + 2 working a 100kg con 80kg bw)
    // Dispendio netto: ~16 kcal. Dispendio lordo: ~30-40 kcal.
    expect(result.summary.caloriesBurned).toBeGreaterThanOrEqual(15);
    expect(result.summary.caloriesBurned).toBeLessThanOrEqual(45);
    expect((result.summary as any).grossCaloriesBurned).toBeGreaterThanOrEqual(25);
  });

  it('underage user workout expenditure blocks adult MET calculation and requires manual calories', async () => {
    const started = new Date(Date.now() - 30 * 60 * 1000);

    // Utente minorenne (16 anni)
    const minorBirthDate = new Date();
    minorBirthDate.setFullYear(minorBirthDate.getFullYear() - 16);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: minorBirthDate });

    mockPrisma.workoutLog.findUnique.mockResolvedValueOnce({
      id: 'log-minor',
      userId: 'user-minor',
      startedAt: started,
      finishedAt: null,
      deletedAt: null,
      logExercises: [
        {
          id: 'ex-1',
          isSkipped: false,
          exerciseNameSnapshot: 'Squat',
          logSets: [
            { setType: SetType.WORKING, repsCompleted: 10, weightKg: 80 },
          ],
        },
      ],
    });

    mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 65 });

    mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
      id: 'log-minor',
      ...args.data,
      logExercises: [],
    }));

    // Caso 1: Senza manualCaloriesBurned -> finalCaloriesBurned deve essere null (MET bloccato)
    const resultNoManual = await service.finishSession('user-minor', 'log-minor');
    expect(resultNoManual.summary.caloriesBurned).toBeNull();

    // Caso 2: Con manualCaloriesBurned -> finalCaloriesBurned usa il valore manuale
    mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: minorBirthDate });
    mockPrisma.workoutLog.findUnique.mockResolvedValueOnce({
      id: 'log-minor-2',
      userId: 'user-minor',
      startedAt: started,
      finishedAt: null,
      deletedAt: null,
      logExercises: [],
    });
    mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 65 });
    mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
      id: 'log-minor-2',
      ...args.data,
      logExercises: [],
    }));

    const resultWithManual = await service.finishSession('user-minor', 'log-minor-2', {
      manualCaloriesBurned: 180,
    });
    expect(resultWithManual.summary.caloriesBurned).toBe(180);
    expect(resultWithManual.summary.manualCaloriesBurned).toBe(180);
  });

  describe('Weight resolution cascade & calorie estimation blockers', () => {
    const started = new Date('2026-06-01T10:00:00Z');
    const workoutDate = new Date('2026-06-01T10:00:00Z');

    const baseLog = {
      id: 'log-test',
      userId: 'user-test',
      date: workoutDate,
      startedAt: started,
      finishedAt: null,
      deletedAt: null,
      logExercises: [
        {
          id: 'ex-1',
          isSkipped: false,
          exerciseNameSnapshot: 'Bench Press',
          logSets: [
            { setType: SetType.WORKING, repsCompleted: 10, weightKg: 80, rpe: 8 },
            { setType: SetType.WORKING, repsCompleted: 10, weightKg: 80, rpe: 8 },
          ],
        },
      ],
    };

    it('blocks calorie calculation when birthDate is null (unknown age)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: null });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog);
      mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 75 });
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test');
      expect(res.summary.caloriesBurned).toBeNull();
    });

    it('allows manual calories even when birthDate is null (unknown age)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: null });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog);
      mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 75 });
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test', {
        manualCaloriesBurned: 220,
      });
      expect(res.summary.caloriesBurned).toBe(220);
      expect(res.summary.manualCaloriesBurned).toBe(220);
    });

    it('blocks calorie calculation when weight is unknown (no measurements)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog);
      // Historical measurement: null
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      // Profile measurement: null
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test');
      expect(res.summary.caloriesBurned).toBeNull();
    });

    it('allows manual calories when weight is unknown (no measurements)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog);
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test', {
        manualCaloriesBurned: 310,
      });
      expect(res.summary.caloriesBurned).toBe(310);
      expect(res.summary.manualCaloriesBurned).toBe(310);
    });

    it('cascade case 1: uses historical measurement when recordedAt <= workout date', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog);
      // Historical measurement exists
      mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 85, recordedAt: new Date('2026-05-30') });
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test');
      expect(res.summary.caloriesBurned).not.toBeNull();
      expect(res.summary.caloriesBurned).toBeGreaterThan(0);
      // Should have queried measurement once with recordedAt <= workout.date
      expect(mockPrisma.measurement.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-test',
          deletedAt: null,
          recordedAt: { lte: workoutDate },
        },
        orderBy: { recordedAt: 'desc' },
      });
    });

    it('cascade case 2: falls back to latest profile measurement when no historical measurement <= workout date', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog);
      // Historical measurement: null
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      // Profile measurement: exists (e.g. recorded today)
      mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 78, recordedAt: new Date('2026-06-05') });
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test');
      expect(res.summary.caloriesBurned).not.toBeNull();
      expect(res.summary.caloriesBurned).toBeGreaterThan(0);
      // Second findFirst should query user latest measurement without lte filter
      expect(mockPrisma.measurement.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          userId: 'user-test',
          deletedAt: null,
        },
        orderBy: { recordedAt: 'desc' },
      });
    });

    it('cascade case 3: when neither historical nor profile measurement exists, weight is unknown and calories are null', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog);
      // Historical: null
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      // Profile: null
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test');
      expect(res.summary.caloriesBurned).toBeNull();
    });

    it('returns weightWarning "peso non aggiornato" if measurement is older than 90 days without blocking estimate', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog); // workoutDate = 2026-06-01
      // 100 days older than workoutDate
      const oldRecordedAt = new Date('2026-02-20T10:00:00Z');
      mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 82, recordedAt: oldRecordedAt });
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test');
      expect(res.summary.caloriesBurned).not.toBeNull();
      expect(res.summary.caloriesBurned).toBeGreaterThan(0);
      expect(res.summary.weightWarning).toBe('peso non aggiornato');
    });

    it('returns weightWarning null if measurement is recent (<= 90 days)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(baseLog); // workoutDate = 2026-06-01
      // 30 days old
      const recentRecordedAt = new Date('2026-05-02T10:00:00Z');
      mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 82, recordedAt: recentRecordedAt });
      mockPrisma.workoutLog.update.mockImplementationOnce((args: any) => Promise.resolve({
        id: 'log-test',
        ...args.data,
        logExercises: [],
      }));

      const res = await service.finishSession('user-test', 'log-test');
      expect(res.summary.caloriesBurned).not.toBeNull();
      expect(res.summary.weightWarning).toBeNull();
    });
  });
});
