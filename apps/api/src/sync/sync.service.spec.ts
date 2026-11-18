import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from './sync.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MutationType, OfflineMutationDto } from './dto/batch-sync.dto.js';

describe('SyncService', () => {
  let service: SyncService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      measurement: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      nutritionLog: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      workoutLog: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      workoutLogExercise: {
        create: vi.fn(),
      },
      workoutLogSet: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      exercise: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      foodItem: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      mealSlot: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      recipe: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      recipeIngredient: {
        create: vi.fn(),
      },
      userDocument: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    service = new SyncService(mockPrisma as unknown as PrismaService);
  });

  it('should return ALREADY_SYNCED if mutation clientSideId already exists', async () => {
    mockPrisma.measurement.findUnique.mockResolvedValueOnce({
      id: 'server-m-1',
      clientSideId: 'client-m-1',
    });

    const mutation: OfflineMutationDto = {
      id: 'client-m-1',
      type: MutationType.CREATE_MEASUREMENT,
      timestamp: '2026-10-21T00:00:00Z',
      payload: {
        weightKg: 80,
      },
    };

    const res = await service.processBatchSync('user-1', [mutation]);

    expect(res.results).toHaveLength(1);
    expect(res.results[0].status).toBe('ALREADY_SYNCED');
    expect(res.results[0].serverId).toBe('server-m-1');
    expect(mockPrisma.measurement.create).not.toHaveBeenCalled();
  });

  it('should process and create a new measurement mutation with clientSideId', async () => {
    mockPrisma.measurement.findUnique.mockResolvedValueOnce(null);
    mockPrisma.measurement.create.mockResolvedValueOnce({
      id: 'server-m-new',
      clientSideId: 'client-m-new',
    });

    const mutation: OfflineMutationDto = {
      id: 'client-m-new',
      type: MutationType.CREATE_MEASUREMENT,
      timestamp: '2026-10-21T01:00:00Z',
      payload: {
        weightKg: 81.5,
        bodyFatPercentage: 15.2,
      },
    };

    const res = await service.processBatchSync('user-1', [mutation]);

    expect(res.results).toHaveLength(1);
    expect(res.results[0].status).toBe('SYNCED');
    expect(res.results[0].serverId).toBe('server-m-new');
    expect(mockPrisma.measurement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientSideId: 'client-m-new',
        userId: 'user-1',
        weightKg: 81.5,
      }),
    });
  });

  it('should sort mutations chronologically before processing', async () => {
    const executedOrder: string[] = [];

    mockPrisma.measurement.findUnique.mockImplementation(async (query: any) => {
      executedOrder.push(query.where.clientSideId);
      return null;
    });
    mockPrisma.measurement.create.mockResolvedValue({ id: 'srv' });

    const mutations: OfflineMutationDto[] = [
      {
        id: 'mutation-later',
        type: MutationType.CREATE_MEASUREMENT,
        timestamp: '2026-10-21T03:00:00Z',
        payload: { weightKg: 80 },
      },
      {
        id: 'mutation-earlier',
        type: MutationType.CREATE_MEASUREMENT,
        timestamp: '2026-10-21T01:00:00Z',
        payload: { weightKg: 79 },
      },
    ];

    const res = await service.processBatchSync('user-1', mutations);

    expect(res.results).toHaveLength(2);
    expect(executedOrder).toEqual(['mutation-earlier', 'mutation-later']);
  });

  it('should isolate failures without aborting other valid mutations', async () => {
    // Prima mutazione fallisce
    mockPrisma.measurement.findUnique.mockRejectedValueOnce(new Error('DB Connection Timeout'));
    // Seconda mutazione ha successo
    mockPrisma.nutritionLog.findUnique.mockResolvedValueOnce(null);
    mockPrisma.nutritionLog.create.mockResolvedValueOnce({ id: 'srv-nutr' });

    const mutations: OfflineMutationDto[] = [
      {
        id: 'mut-fail',
        type: MutationType.CREATE_MEASUREMENT,
        timestamp: '2026-10-21T01:00:00Z',
        payload: { weightKg: 80 },
      },
      {
        id: 'mut-success',
        type: MutationType.CREATE_NUTRITION_LOG,
        timestamp: '2026-10-21T02:00:00Z',
        payload: { mealType: 'LUNCH', calories: 650 },
      },
    ];

    const res = await service.processBatchSync('user-1', mutations);

    expect(res.results).toHaveLength(2);
    expect(res.results[0].status).toBe('FAILED');
    expect(res.results[0].error).toContain('DB Connection Timeout');
    expect(res.results[1].status).toBe('SYNCED');
    expect(res.results[1].serverId).toBe('srv-nutr');
  });

  it('sync queue resolves log pointing to external foodItem via source + externalId', async () => {
    mockPrisma.nutritionLog.findUnique.mockResolvedValueOnce(null);
    mockPrisma.foodItem.findFirst.mockResolvedValueOnce({
      id: 'global-off-food-uuid',
      name: 'Yogurt Greco OFF',
      source: 'OPEN_FOOD_FACTS',
      externalId: '8001234567890',
    });
    mockPrisma.nutritionLog.create.mockResolvedValueOnce({ id: 'srv-log-external' });

    const mutation: OfflineMutationDto = {
      id: 'mut-log-ext',
      type: MutationType.CREATE_NUTRITION_LOG,
      timestamp: '2026-10-21T01:00:00Z',
      payload: {
        source: 'OPEN_FOOD_FACTS',
        externalId: '8001234567890',
        caloriesConsumed: 120,
        quantityG: 150,
      },
    };

    const res = await service.processBatchSync('user-1', [mutation]);
    expect(res.results[0].status).toBe('SYNCED');
    expect(mockPrisma.nutritionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        foodItemId: 'global-off-food-uuid',
        caloriesConsumed: 120,
      }),
    });
  });

  it('meal slot offline name collision merges default slots instead of renaming', async () => {
    mockPrisma.mealSlot.findUnique.mockResolvedValueOnce(null);
    mockPrisma.mealSlot.findFirst.mockResolvedValueOnce({
      id: 'existing-colazione-id',
      name: 'Colazione',
    });

    const mutation: OfflineMutationDto = {
      id: 'client-slot-colazione',
      type: MutationType.CREATE_MEAL_SLOT,
      timestamp: '2026-10-21T01:00:00Z',
      payload: {
        name: 'Colazione',
      },
    };

    const res = await service.processBatchSync('user-1', [mutation]);
    expect(res.results[0].status).toBe('SYNCED');
    expect(res.results[0].serverId).toBe('existing-colazione-id');
    expect(mockPrisma.mealSlot.create).not.toHaveBeenCalled();
  });

  describe('CREATE_WORKOUT_LOG offline sync limits & clamping', () => {
    it('clamps out-of-bounds workout set and calorie fields instead of rejecting mutation', async () => {
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(null);
      // Historical measurement exists
      mockPrisma.measurement.findFirst.mockResolvedValueOnce({ weightKg: 80 });
      // Adult user
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });

      mockPrisma.workoutLog.create.mockResolvedValueOnce({ id: 'srv-log-clamped' });
      mockPrisma.workoutLogExercise.create.mockResolvedValueOnce({ id: 'srv-ex-1' });
      mockPrisma.workoutLogSet.create.mockResolvedValueOnce({ id: 'srv-set-1' });

      const mutation: OfflineMutationDto = {
        id: 'client-workout-out-of-bounds',
        type: MutationType.CREATE_WORKOUT_LOG,
        timestamp: '2026-10-21T10:00:00Z',
        payload: {
          workoutName: 'Heavy Leg Day',
          manualCaloriesBurned: 15000, // Exceeds 10000 limit -> clamp to 10000
          exercises: [
            {
              exerciseName: 'Squat',
              sets: [
                {
                  orderIndex: 250, // Exceeds 100 limit -> clamp to 100
                  setType: 'INVALID_SUPERSET', // Invalid -> map to WORKING
                  repsCompleted: 700, // Exceeds 500 limit -> clamp to 500
                  weightKg: 1500, // Exceeds 1000 limit -> clamp to 1000
                  rpe: 15, // Exceeds 10 limit -> clamp to 10
                },
              ],
            },
          ],
        },
      };

      const res = await service.processBatchSync('user-1', [mutation]);

      expect(res.results[0].status).toBe('SYNCED');
      expect(res.results[0].serverId).toBe('srv-log-clamped');

      // Check clamped log create data
      expect(mockPrisma.workoutLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          manualCaloriesBurned: 10000,
          caloriesBurned: 10000,
        }),
      });

      // Check clamped set create data
      expect(mockPrisma.workoutLogSet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderIndex: 100,
          setType: 'WORKING',
          repsCompleted: 500,
          weightKg: 1000,
          rpe: 10,
        }),
      });
    });

    it('maps legacy DROP setType to DROPSET on offline sync with logger warning', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: new Date('1990-01-01') });
      mockPrisma.workoutLog.create.mockResolvedValueOnce({ id: 'srv-log-drop' });
      mockPrisma.workoutLogExercise.create.mockResolvedValueOnce({ id: 'srv-ex-1' });
      mockPrisma.workoutLogSet.create.mockResolvedValueOnce({ id: 'srv-set-1' });

      const mutation: OfflineMutationDto = {
        id: 'client-workout-drop',
        type: MutationType.CREATE_WORKOUT_LOG,
        timestamp: '2026-10-21T10:00:00Z',
        payload: {
          workoutName: 'Drop Set Workout',
          exercises: [
            {
              exerciseName: 'Biceps Curl',
              sets: [
                {
                  orderIndex: 1,
                  setType: 'DROP',
                  repsCompleted: 12,
                  weightKg: 20,
                },
              ],
            },
          ],
        },
      };

      const res = await service.processBatchSync('user-1', [mutation]);
      expect(res.results[0].status).toBe('SYNCED');
      expect(mockPrisma.workoutLogSet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          setType: 'DROPSET',
        }),
      });
    });

    it('blocks automatic calorie estimation on offline sync when user age or weight is unknown', async () => {
      mockPrisma.workoutLog.findUnique.mockResolvedValueOnce(null);
      // No measurements
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      mockPrisma.measurement.findFirst.mockResolvedValueOnce(null);
      // Unknown age (birthDate null)
      mockPrisma.user.findUnique.mockResolvedValueOnce({ birthDate: null });

      mockPrisma.workoutLog.create.mockResolvedValueOnce({ id: 'srv-log-unknown-bio' });
      mockPrisma.workoutLogExercise.create.mockResolvedValueOnce({ id: 'srv-ex-1' });
      mockPrisma.workoutLogSet.create.mockResolvedValueOnce({ id: 'srv-set-1' });

      const mutation: OfflineMutationDto = {
        id: 'client-workout-unknown-bio',
        type: MutationType.CREATE_WORKOUT_LOG,
        timestamp: '2026-10-21T10:00:00Z',
        payload: {
          workoutName: 'General Workout',
          exercises: [
            {
              exerciseName: 'Bench Press',
              sets: [{ orderIndex: 1, repsCompleted: 10, weightKg: 80, rpe: 8 }],
            },
          ],
        },
      };

      const res = await service.processBatchSync('user-1', [mutation]);

      expect(res.results[0].status).toBe('SYNCED');
      expect(mockPrisma.workoutLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caloriesBurned: null,
        }),
      });
    });
  });
});

