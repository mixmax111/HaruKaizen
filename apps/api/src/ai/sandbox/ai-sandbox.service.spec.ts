import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiSandboxService } from './ai-sandbox.service.js';
import { RecordOrigin } from '@harukaizen/shared';
import type { AiGeneratedWorkoutPlan, AiGeneratedDietPlan } from './ai-plan.schema.js';

describe('AiSandboxService', () => {
  let service: AiSandboxService;
  let mockPrisma: any;
  let mockPromptBuilder: any;
  let mockOrchestrator: any;
  let mockDocumentsService: any;
  let mockAggregator: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (callback) => callback(mockTx)),
      workoutPlan: {
        findFirst: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      dietPlan: {
        findFirst: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockPromptBuilder = {
      evaluateClinicalGuardrails: vi.fn().mockImplementation((input) => {
        const reasons: string[] = [];
        let requiresClinicalWarning = false;
        if (input.targetKcal !== undefined) {
          if (input.sex === 'M' && input.targetKcal < 1500) {
            requiresClinicalWarning = true;
            reasons.push('Target calorico < 1500 kcal per maschio.');
          } else if (input.sex === 'F' && input.targetKcal < 1200) {
            requiresClinicalWarning = true;
            reasons.push('Target calorico < 1200 kcal per femmina.');
          }
        }
        return { requiresClinicalWarning, warningReasons: reasons };
      }),
      buildSystemPrompt: vi.fn().mockReturnValue('SYSTEM_PROMPT'),
      buildWorkoutPlanPrompt: vi.fn().mockReturnValue('USER_PROMPT_WORKOUT'),
      buildDietPlanPrompt: vi.fn().mockReturnValue('USER_PROMPT_DIET'),
    };

    mockOrchestrator = {
      generateStructuredObject: vi.fn(),
    };

    mockDocumentsService = {
      getActiveRagDocuments: vi.fn().mockResolvedValue([]),
    };

    mockAggregator = {
      buildWeeklySnapshot: vi.fn().mockResolvedValue({
        user: { sex: 'M', heightCm: 180, coachTone: 'KAIZEN' },
        measurements: { currentWeightKg: 80 },
        nutrition: { targetCaloriesDaily: 2200 },
      }),
    };

    service = new AiSandboxService(
      mockPrisma,
      mockPromptBuilder,
      mockOrchestrator,
      mockDocumentsService,
      mockAggregator,
    );
  });

  const mockTx: any = {
    workoutPlan: {
      create: vi.fn().mockImplementation((args) => ({
        id: 'mock-plan-id',
        ...args.data,
      })),
      findUnique: vi.fn().mockImplementation((args) => ({
        id: args.where.id,
        name: 'Hypertrophy Block A',
        origin: RecordOrigin.AI_DRAFT,
        isAiIsolated: true,
      })),
    },
    workoutDay: {
      create: vi.fn().mockImplementation((args) => ({
        id: 'mock-day-id',
        ...args.data,
      })),
    },
    exercise: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    workoutDayExercise: {
      create: vi.fn(),
    },
    dietPlan: {
      create: vi.fn().mockImplementation((args) => ({
        id: 'mock-diet-id',
        ...args.data,
      })),
      findUnique: vi.fn().mockImplementation((args) => ({
        id: args.where.id,
        name: 'Cutting Diet Plan',
        origin: RecordOrigin.AI_DRAFT,
        isAiIsolated: true,
      })),
    },
    dietDay: {
      create: vi.fn().mockImplementation((args) => ({
        id: 'mock-diet-day-id',
        ...args.data,
      })),
    },
    foodItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    dietDayItem: {
      create: vi.fn(),
    },
  };

  it('strictly enforces origin: AI_DRAFT and isAiIsolated: true when creating isolated workout plan', async () => {
    mockTx.exercise.findFirst.mockResolvedValue({ id: 'ex-bench', name: 'Panca Piana' });

    const dummyPlan: AiGeneratedWorkoutPlan = {
      name: 'Sandbox Push Pull Legs',
      description: 'Mesociclo isolato per test',
      aiReasoning: 'Focus sul petto con volumi MAV',
      clinicalWarning: null,
      days: [
        {
          name: 'Day 1 - Push',
          dayOrder: 1,
          exercises: [
            {
              exerciseName: 'Panca Piana',
              category: 'CHEST',
              sets: 4,
              repsTarget: '8-10',
              restSeconds: 120,
            },
          ],
        },
      ],
    };

    await service.createIsolatedWorkoutPlan('user-123', dummyPlan);

    expect(mockTx.workoutPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        name: 'Sandbox Push Pull Legs',
        origin: RecordOrigin.AI_DRAFT,
        isAiIsolated: true,
        isActive: false,
      }),
    });
  });

  it('auto-resolves foreign keys by creating unknown exercises in catalog', async () => {
    // Simuliamo che l'esercizio non esiste nel catalogo
    mockTx.exercise.findFirst.mockResolvedValue(null);
    mockTx.exercise.create.mockResolvedValue({
      id: 'ex-newly-created',
      name: 'Pendlay Row con deficit',
      category: 'BACK',
    });

    const dummyPlan: AiGeneratedWorkoutPlan = {
      name: 'Custom Pull Day',
      description: 'Dorsali e bicipiti',
      aiReasoning: 'Carico sul gran dorsale',
      days: [
        {
          name: 'Day 1 - Pull',
          dayOrder: 1,
          exercises: [
            {
              exerciseName: 'Pendlay Row con deficit',
              category: 'BACK',
              sets: 3,
              repsTarget: '6-8',
              restSeconds: 90,
            },
          ],
        },
      ],
    };

    await service.createIsolatedWorkoutPlan('user-123', dummyPlan);

    expect(mockTx.exercise.findFirst).toHaveBeenCalled();
    expect(mockTx.exercise.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Pendlay Row con deficit',
        category: 'BACK',
        createdByUserId: 'user-123',
        isVerified: false,
      }),
    });
    expect(mockTx.workoutDayExercise.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exerciseId: 'ex-newly-created',
      }),
    });
  });

  it('auto-resolves foreign keys by creating unknown food items in catalog', async () => {
    mockTx.foodItem.findFirst.mockResolvedValue(null);
    mockTx.foodItem.create.mockResolvedValue({
      id: 'food-newly-created',
      name: 'Pane di segale integrale speciale',
    });

    const dummyDiet: AiGeneratedDietPlan = {
      name: 'Sandbox Diet',
      description: 'Dieta bilanciata',
      aiReasoning: 'Equilibrio glicemico',
      days: [
        {
          name: 'Giorno Tipo',
          items: [
            {
              mealType: 'BREAKFAST',
              foodName: 'Pane di segale integrale speciale',
              quantityG: 100,
              calories100g: 220,
              protein100g: 8,
              carbs100g: 45,
              fat100g: 2,
            },
          ],
        },
      ],
    };

    await service.createIsolatedDietPlan('user-123', dummyDiet);

    expect(mockTx.foodItem.findFirst).toHaveBeenCalled();
    expect(mockTx.foodItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Pane di segale integrale speciale',
        calories100g: 220,
        isVerified: false,
      }),
    });
    expect(mockTx.dietDayItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        foodItemId: 'food-newly-created',
      }),
    });
  });

  it('triggers deterministic clinical warning when target kcal < 1500 for male or < 1200 for female', async () => {
    const maleCheck = mockPromptBuilder.evaluateClinicalGuardrails({ sex: 'M', targetKcal: 1350 });
    expect(maleCheck.requiresClinicalWarning).toBe(true);
    expect(maleCheck.warningReasons[0]).toContain('1500 kcal');

    const femaleCheck = mockPromptBuilder.evaluateClinicalGuardrails({ sex: 'F', targetKcal: 1100 });
    expect(femaleCheck.requiresClinicalWarning).toBe(true);
    expect(femaleCheck.warningReasons[0]).toContain('1200 kcal');

    const safeCheck = mockPromptBuilder.evaluateClinicalGuardrails({ sex: 'M', targetKcal: 1800 });
    expect(safeCheck.requiresClinicalWarning).toBe(false);
  });
});

