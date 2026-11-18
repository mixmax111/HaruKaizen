import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PromptBuilderService } from '../prompts/prompt-builder.service.js';
import { AiOrchestratorService } from '../orchestrator/ai-orchestrator.service.js';
import { DocumentsService } from '../../documents/documents.service.js';
import { DataAggregatorService } from '../aggregator/data-aggregator.service.js';
import {
  AiGeneratedWorkoutPlanSchema,
  AiGeneratedWorkoutPlan,
  AiGeneratedDietPlanSchema,
  AiGeneratedDietPlan,
} from './ai-plan.schema.js';
import { RecordOrigin } from '@harukaizen/shared';

export interface GenerateWorkoutPlanParams {
  userGoal?: string;
  daysPerWeek?: number;
  equipmentAvailable?: string;
}

export interface GenerateDietPlanParams {
  userGoal?: string;
  targetKcal?: number;
  dietaryRestrictions?: string;
}

@Injectable()
export class AiSandboxService {
  private readonly logger = new Logger(AiSandboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly documentsService: DocumentsService,
    private readonly aggregator: DataAggregatorService,
  ) {}

  /**
   * Genera e salva in sandbox isolata una scheda di allenamento generata dall'AI.
   */
  async generateWorkoutPlan(userId: string, params: GenerateWorkoutPlanParams) {
    this.logger.log(`Inizio generazione AI Workout Plan per utente ${userId}`);

    // 1. Snapshot e profilo
    const snapshot = await this.aggregator.buildWeeklySnapshot(userId);
    const activeDocs = await this.documentsService.getActiveRagDocuments(userId);

    // 2. Pre-check clinico deterministico
    const clinicalCheck = this.promptBuilder.evaluateClinicalGuardrails({
      sex: snapshot.user.sex,
      heightCm: snapshot.user.heightCm,
      weightKg: snapshot.measurements.currentWeightKg,
    });

    // 3. Prompt building con iniezione Semi-RAG
    const systemPrompt = this.promptBuilder.buildSystemPrompt(snapshot.user.coachTone, {
      userDocuments: activeDocs,
      clinicalCheck,
      isPlanGeneration: true,
    });

    const userPrompt = this.promptBuilder.buildWorkoutPlanPrompt({
      userGoal: params.userGoal,
      daysPerWeek: params.daysPerWeek,
      equipmentAvailable: params.equipmentAvailable,
      snapshot,
    });

    // 4. Invocazione LLM con validazione schema Zod
    const aiOutput = await this.orchestrator.generateStructuredObject<AiGeneratedWorkoutPlan>(
      userId,
      systemPrompt,
      userPrompt,
      AiGeneratedWorkoutPlanSchema,
    );

    // Se il pre-check clinico era scattato e l'AI non ha popolato clinicalWarning, iniettiamo il motivo
    if (clinicalCheck.requiresClinicalWarning && !aiOutput.clinicalWarning) {
      aiOutput.clinicalWarning = `Attenzione Medica di Sicurezza: ${clinicalCheck.warningReasons.join(' ')}`;
    }

    // 5. Creazione isolata in Sandbox con auto-risoluzione FK
    return this.createIsolatedWorkoutPlan(userId, aiOutput);
  }

  /**
   * Genera e salva in sandbox isolata una dieta generata dall'AI.
   */
  async generateDietPlan(userId: string, params: GenerateDietPlanParams) {
    this.logger.log(`Inizio generazione AI Diet Plan per utente ${userId}`);

    const snapshot = await this.aggregator.buildWeeklySnapshot(userId);
    const activeDocs = await this.documentsService.getActiveRagDocuments(userId);

    const targetKcal =
      params.targetKcal ||
      Math.round(snapshot.nutrition.estimatedTdeeCalories || snapshot.nutrition.avgDailyCalories || 2000);

    const clinicalCheck = this.promptBuilder.evaluateClinicalGuardrails({
      sex: snapshot.user.sex,
      heightCm: snapshot.user.heightCm,
      weightKg: snapshot.measurements.currentWeightKg,
      targetKcal,
    });

    const systemPrompt = this.promptBuilder.buildSystemPrompt(snapshot.user.coachTone, {
      userDocuments: activeDocs,
      clinicalCheck,
      isPlanGeneration: true,
    });

    const userPrompt = this.promptBuilder.buildDietPlanPrompt({
      userGoal: params.userGoal,
      targetKcal,
      dietaryRestrictions: params.dietaryRestrictions,
      snapshot,
    });

    const aiOutput = await this.orchestrator.generateStructuredObject<AiGeneratedDietPlan>(
      userId,
      systemPrompt,
      userPrompt,
      AiGeneratedDietPlanSchema,
    );

    if (clinicalCheck.requiresClinicalWarning && !aiOutput.clinicalWarning) {
      aiOutput.clinicalWarning = `Attenzione Medica di Sicurezza: ${clinicalCheck.warningReasons.join(' ')}`;
    }

    return this.createIsolatedDietPlan(userId, aiOutput);
  }

  /**
   * Creazione isolata all'interno di una transazione Prisma.
   * Risolve automaticamente chiavi esterne per esercizi sconosciuti.
   */
  async createIsolatedWorkoutPlan(userId: string, data: AiGeneratedWorkoutPlan) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Creazione WorkoutPlan forzando origin: AI_DRAFT e isAiIsolated: true
      const workoutPlan = await tx.workoutPlan.create({
        data: {
          userId,
          name: data.name,
          origin: RecordOrigin.AI_DRAFT,
          isAiIsolated: true,
          isActive: false,
          isPublic: false,
          aiReasoning: data.aiReasoning,
          clinicalWarning: data.clinicalWarning || null,
        },
      });

      // 2. Creazione giorni ed esercizi
      for (const day of data.days) {
        const createdDay = await tx.workoutDay.create({
          data: {
            workoutPlanId: workoutPlan.id,
            name: day.name,
            orderIndex: day.dayOrder,
          },
        });

        for (let exIndex = 0; exIndex < day.exercises.length; exIndex++) {
          const ex = day.exercises[exIndex];

          // Risoluzione Foreign Key case-insensitive
          let exercise = await tx.exercise.findFirst({
            where: {
              name: { equals: ex.exerciseName.trim(), mode: 'insensitive' },
            },
          });

          if (!exercise) {
            this.logger.log(`Esercizio "${ex.exerciseName}" non trovato nel catalogo. Auto-creazione in corso...`);
            exercise = await tx.exercise.create({
              data: {
                name: ex.exerciseName.trim(),
                category: ex.category,
                defaultMetValue: 5.0,
                createdByUserId: userId,
                isVerified: false,
              },
            });
          }

          await tx.workoutDayExercise.create({
            data: {
              workoutDayId: createdDay.id,
              exerciseId: exercise.id,
              orderIndex: exIndex + 1,
              sets: ex.sets,
              repsTarget: ex.repsTarget,
              weightTarget: ex.weightTargetKg ? `${ex.weightTargetKg}kg` : ex.rpeTarget ? `RPE ${ex.rpeTarget}` : null,
              restSeconds: ex.restSeconds || 90,
              notes: ex.notes || null,
            },
          });
        }
      }

      return tx.workoutPlan.findUnique({
        where: { id: workoutPlan.id },
        include: {
          workoutDays: {
            orderBy: { orderIndex: 'asc' },
            include: {
              exercises: {
                orderBy: { orderIndex: 'asc' },
                include: { exercise: true },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Creazione isolata all'interno di una transazione Prisma.
   * Risolve automaticamente chiavi esterne per alimenti sconosciuti.
   */
  async createIsolatedDietPlan(userId: string, data: AiGeneratedDietPlan) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Creazione DietPlan forzando origin: AI_DRAFT e isAiIsolated: true
      const dietPlan = await tx.dietPlan.create({
        data: {
          userId,
          name: data.name,
          origin: RecordOrigin.AI_DRAFT,
          isAiIsolated: true,
          isActive: false,
          isPublic: false,
          aiReasoning: data.aiReasoning,
          clinicalWarning: data.clinicalWarning || null,
        },
      });

      for (const day of data.days) {
        const createdDay = await tx.dietDay.create({
          data: {
            dietPlanId: dietPlan.id,
            name: day.name,
          },
        });

        for (const item of day.items) {
          // Risoluzione Foreign Key case-insensitive
          let food = await tx.foodItem.findFirst({
            where: {
              name: { equals: item.foodName.trim(), mode: 'insensitive' },
            },
          });

          if (!food) {
            this.logger.log(`Alimento "${item.foodName}" non trovato nel catalogo. Auto-creazione in corso...`);
            food = await tx.foodItem.create({
              data: {
                name: item.foodName.trim(),
                calories100g: item.calories100g,
                protein100g: item.protein100g,
                carbs100g: item.carbs100g,
                fat100g: item.fat100g,
                isVerified: false,
              },
            });
          }

          await tx.dietDayItem.create({
            data: {
              dietDayId: createdDay.id,
              foodItemId: food.id,
              mealType: item.mealType,
              quantityG: item.quantityG,
              scheduledTime: item.scheduledTime || null,
            },
          });
        }
      }

      return tx.dietPlan.findUnique({
        where: { id: dietPlan.id },
        include: {
          dietDays: {
            include: {
              dietDayItems: {
                include: { foodItem: true },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Promuove un piano di allenamento da bozza isolata (AI_DRAFT) a piano operativo dell'utente (AI_APPLIED).
   */
  async promoteWorkoutPlan(userId: string, planId: string) {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { id: planId, userId, deletedAt: null },
    });

    if (!plan) {
      throw new NotFoundException(`Bozza di allenamento con ID ${planId} non trovata.`);
    }

    const updated = await this.prisma.workoutPlan.update({
      where: { id: plan.id },
      data: {
        origin: RecordOrigin.AI_APPLIED,
        isAiIsolated: false,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            exercises: {
              include: { exercise: true },
            },
          },
        },
      },
    });

    this.logger.log(`Piano di allenamento ${plan.id} promosso con successo a piano operativo (AI_APPLIED).`);
    return updated;
  }

  /**
   * Promuove un piano alimentare da bozza isolata (AI_DRAFT) a piano operativo dell'utente (AI_APPLIED).
   */
  async promoteDietPlan(userId: string, planId: string) {
    const plan = await this.prisma.dietPlan.findFirst({
      where: { id: planId, userId, deletedAt: null },
    });

    if (!plan) {
      throw new NotFoundException(`Bozza alimentare con ID ${planId} non trovata.`);
    }

    const updated = await this.prisma.dietPlan.update({
      where: { id: plan.id },
      data: {
        origin: RecordOrigin.AI_APPLIED,
        isAiIsolated: false,
        isActive: true,
      },
      include: {
        dietDays: {
          include: {
            dietDayItems: {
              include: { foodItem: true },
            },
          },
        },
      },
    });

    this.logger.log(`Piano nutrizionale ${plan.id} promosso con successo a piano operativo (AI_APPLIED).`);
    return updated;
  }

  /**
   * Elenca tutte le bozze AI isolate per l'utente.
   */
  async findSandboxDrafts(userId: string) {
    const [workoutDrafts, dietDrafts] = await Promise.all([
      this.prisma.workoutPlan.findMany({
        where: {
          userId,
          origin: RecordOrigin.AI_DRAFT,
          isAiIsolated: true,
          deletedAt: null,
        },
        include: {
          workoutDays: {
            orderBy: { orderIndex: 'asc' },
            include: {
              exercises: {
                orderBy: { orderIndex: 'asc' },
                include: { exercise: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dietPlan.findMany({
        where: {
          userId,
          origin: RecordOrigin.AI_DRAFT,
          isAiIsolated: true,
          deletedAt: null,
        },
        include: {
          dietDays: {
            include: {
              dietDayItems: {
                include: { foodItem: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      workoutDrafts,
      dietDrafts,
    };
  }
}
