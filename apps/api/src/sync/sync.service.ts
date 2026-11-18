import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MutationType, OfflineMutationDto } from './dto/batch-sync.dto.js';
import { DocumentCategory, calculateAge } from '@harukaizen/shared';
import {
  calculateWorkoutExpenditure,
  BiomechanicalSetInput,
} from '../workout/expenditure/biomechanical-expenditure.js';

export interface MutationResult {
  id: string;
  status: 'SYNCED' | 'ALREADY_SYNCED' | 'FAILED' | 'REJECTED_STALE';
  serverId?: string;
  winner?: any;
  error?: string;
}

export interface BatchSyncResponse {
  results: MutationResult[];
  syncedAt: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Limita clientUpdatedAt a serverNow + 5 minuti (clock skew guard).
   */
  private clampClientUpdatedAt(clientUpdatedAt?: string | Date | null): Date {
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 5 * 60 * 1000);
    if (!clientUpdatedAt) return now;

    const parsed = new Date(clientUpdatedAt);
    if (isNaN(parsed.getTime())) return now;
    return parsed.getTime() > maxFuture.getTime() ? maxFuture : parsed;
  }

  private getMutationDependencyWeight(type: MutationType): number {
    switch (type) {
      case MutationType.CREATE_MEAL_SLOT:
      case MutationType.CREATE_FOOD_ITEM:
        return 1;
      case MutationType.CREATE_MEASUREMENT:
        return 2;
      case MutationType.CREATE_RECIPE:
        return 3;
      case MutationType.CREATE_NUTRITION_LOG:
      case MutationType.CREATE_WORKOUT_LOG:
      case MutationType.CREATE_DOCUMENT_TEXT:
      default:
        return 4;
    }
  }

  /**
   * Elabora in modo sequenziale, atomico per dipendenze e idempotente il batch di mutazioni offline.
   */
  async processBatchSync(userId: string, mutations: OfflineMutationDto[]): Promise<BatchSyncResponse> {
    const results: MutationResult[] = [];

    // Ordina rispettando le dipendenze (MealSlot/FoodItem prima di Recipe e Log)
    // A parità di peso, rispetta l'ordine cronologico
    const sortedMutations = [...mutations].sort((a, b) => {
      const weightA = this.getMutationDependencyWeight(a.type);
      const weightB = this.getMutationDependencyWeight(b.type);
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    for (const mutation of sortedMutations) {
      try {
        const result = await this.processSingleMutation(userId, mutation);
        results.push(result);
      } catch (err: any) {
        this.logger.error(`Fallimento sincronizzazione per mutazione ${mutation.id}: ${err.message}`);
        results.push({
          id: mutation.id,
          status: 'FAILED',
          error: err.message || 'Errore generico durante l\'elaborazione della mutazione',
        });
      }
    }

    return {
      results,
      syncedAt: new Date().toISOString(),
    };
  }

  private async processSingleMutation(userId: string, mutation: OfflineMutationDto): Promise<MutationResult> {
    const clientSideId = mutation.id.trim();
    const safeClientUpdatedAt = this.clampClientUpdatedAt(mutation.timestamp);

    switch (mutation.type) {
      case MutationType.CREATE_MEAL_SLOT: {
        const existing = await this.prisma.mealSlot.findUnique({
          where: {
            userId_clientSideId: {
              userId,
              clientSideId,
            },
          },
        });

        if (existing) {
          if (existing.clientUpdatedAt && safeClientUpdatedAt < existing.clientUpdatedAt) {
            return { id: clientSideId, status: 'REJECTED_STALE', winner: existing };
          }
          return { id: clientSideId, status: 'ALREADY_SYNCED', serverId: existing.id };
        }

        const p = mutation.payload;
        const cleanName = String(p.name || 'Slot Pasto').trim();

        // Controllo collisione nomi: se due dispositivi offline creano gli stessi slot predefiniti,
        // uniscili per nome invece di creare duplicati "Nome (1)"
        const DEFAULT_SLOT_NAMES = ['colazione', 'pranzo', 'cena', 'spuntini', 'spuntino', 'pre-workout'];
        const sameName = await this.prisma.mealSlot.findFirst({
          where: {
            userId,
            deletedAt: null,
            name: { equals: cleanName, mode: 'insensitive' },
          },
        });

        if (sameName && DEFAULT_SLOT_NAMES.includes(cleanName.toLowerCase())) {
          return { id: clientSideId, status: 'SYNCED', serverId: sameName.id };
        }

        const created = await this.prisma.mealSlot.create({
          data: {
            userId,
            clientSideId,
            name: sameName ? `${cleanName} (1)` : cleanName,
            slotOrder: p.slotOrder !== undefined ? Number(p.slotOrder) : 0,
            clientUpdatedAt: safeClientUpdatedAt,
          },
        });

        return { id: clientSideId, status: 'SYNCED', serverId: created.id };
      }

      case MutationType.CREATE_FOOD_ITEM: {
        const existing = await this.prisma.foodItem.findUnique({
          where: {
            userId_clientSideId: {
              userId,
              clientSideId,
            },
          },
        });

        if (existing) {
          if (existing.clientUpdatedAt && safeClientUpdatedAt < existing.clientUpdatedAt) {
            return { id: clientSideId, status: 'REJECTED_STALE', winner: existing };
          }
          return { id: clientSideId, status: 'ALREADY_SYNCED', serverId: existing.id };
        }

        const p = mutation.payload;

        // Risoluzione flessibile basedOnId per copie CoW create offline
        let resolvedBasedOnId = p.basedOnId || null;
        if (!resolvedBasedOnId && p.basedOnExternalId) {
          const globalRef = await this.prisma.foodItem.findFirst({
            where: {
              userId: null,
              externalId: String(p.basedOnExternalId).trim(),
              deletedAt: null,
            },
          });
          resolvedBasedOnId = globalRef?.id || null;
        }

        const created = await this.prisma.foodItem.create({
          data: {
            userId,
            clientSideId,
            name: String(p.name || 'Alimento').trim(),
            barcode: p.barcode ? String(p.barcode).trim() : null,
            calories100g: Number(p.calories100g || p.calories || 0),
            protein100g: Number(p.protein100g || p.protein || 0),
            carbs100g: Number(p.carbs100g || p.carbs || 0),
            fat100g: Number(p.fat100g || p.fat || 0),
            fiber100g: p.fiber100g !== undefined && p.fiber100g !== null ? Number(p.fiber100g) : null,
            sodium100g: p.sodium100g !== undefined && p.sodium100g !== null ? Number(p.sodium100g) : null,
            servingSizeG: p.servingSizeG !== undefined && p.servingSizeG !== null ? Number(p.servingSizeG) : null,
            isVerified: false,
            isUserEdited: true,
            basedOnId: resolvedBasedOnId,
            source: p.source || 'LOCAL',
            externalId: p.externalId || p.barcode || null,
            clientUpdatedAt: safeClientUpdatedAt,
          },
        });

        return { id: clientSideId, status: 'SYNCED', serverId: created.id };
      }

      case MutationType.CREATE_RECIPE: {
        const existing = await this.prisma.recipe.findUnique({
          where: {
            userId_clientSideId: {
              userId,
              clientSideId,
            },
          },
        });

        if (existing) {
          if (existing.clientUpdatedAt && safeClientUpdatedAt < existing.clientUpdatedAt) {
            return { id: clientSideId, status: 'REJECTED_STALE', winner: existing };
          }
          return { id: clientSideId, status: 'ALREADY_SYNCED', serverId: existing.id };
        }

        const p = mutation.payload;
        const rawIngredients = Array.isArray(p.ingredients) ? p.ingredients : [];

        // Risolve gli ingredienti: possono puntare a foodItemId o foodItemClientSideId
        const created = await this.prisma.$transaction(async (tx) => {
          const recipe = await tx.recipe.create({
            data: {
              userId,
              clientSideId,
              name: String(p.name || 'Ricetta').trim(),
              defaultServings: p.defaultServings ? Number(p.defaultServings) : 1,
              finishedWeightG: p.finishedWeightG ? Number(p.finishedWeightG) : null,
              notes: p.notes ? String(p.notes) : null,
              clientUpdatedAt: safeClientUpdatedAt,
            },
          });

          for (const ing of rawIngredients) {
            let targetFoodItemId = ing.foodItemId;

            if (!targetFoodItemId && ing.foodItemClientSideId) {
              const localFood = await tx.foodItem.findUnique({
                where: {
                  userId_clientSideId: {
                    userId,
                    clientSideId: ing.foodItemClientSideId,
                  },
                },
              });
              targetFoodItemId = localFood?.id;
            }

            if (targetFoodItemId) {
              await tx.recipeIngredient.create({
                data: {
                  recipeId: recipe.id,
                  foodItemId: targetFoodItemId,
                  quantity: Number(ing.quantity || 100),
                  unit: ing.unit || 'g',
                },
              });
            }
          }

          return recipe;
        });

        return { id: clientSideId, status: 'SYNCED', serverId: created.id };
      }

      case MutationType.CREATE_MEASUREMENT: {
        const existing = await this.prisma.measurement.findUnique({
          where: { clientSideId },
        });

        if (existing) {
          return { id: clientSideId, status: 'ALREADY_SYNCED', serverId: existing.id };
        }

        const p = mutation.payload;
        const recordedAt = p.recordedAt || p.date ? new Date(p.recordedAt || p.date) : new Date(mutation.timestamp);

        const created = await this.prisma.measurement.create({
          data: {
            clientSideId,
            userId,
            recordedAt,
            weightKg: Number(p.weightKg),
            bodyFatPercentage: p.bodyFatPercentage ? Number(p.bodyFatPercentage) : null,
            waistCm: p.waistCm ? Number(p.waistCm) : null,
            chestCm: p.chestCm ? Number(p.chestCm) : null,
            armsCm: p.armsCm ? Number(p.armsCm) : null,
            legsCm: p.legsCm ? Number(p.legsCm) : null,
          },
        });

        return { id: clientSideId, status: 'SYNCED', serverId: created.id };
      }

      case MutationType.CREATE_NUTRITION_LOG: {
        const existing = await this.prisma.nutritionLog.findUnique({
          where: {
            userId_clientSideId: {
              userId,
              clientSideId,
            },
          },
        });

        if (existing) {
          if (existing.clientUpdatedAt && safeClientUpdatedAt < existing.clientUpdatedAt) {
            return { id: clientSideId, status: 'REJECTED_STALE', winner: existing };
          }
          return { id: clientSideId, status: 'ALREADY_SYNCED', serverId: existing.id };
        }

        const p = mutation.payload;
        const loggedAt = p.loggedAt || p.date ? new Date(p.loggedAt || p.date) : new Date(mutation.timestamp);

        // Risoluzione flessibile FoodItem (via id, clientSideId o (source, externalId))
        let resolvedFoodItemId = p.foodItemId;
        if (!resolvedFoodItemId && p.foodItemClientSideId) {
          const food = await this.prisma.foodItem.findUnique({
            where: {
              userId_clientSideId: {
                userId,
                clientSideId: p.foodItemClientSideId,
              },
            },
          });
          resolvedFoodItemId = food?.id;
        }
        if (!resolvedFoodItemId && (p.source || p.externalSource) && (p.externalId || p.barcode)) {
          const source = p.source || p.externalSource || 'OPEN_FOOD_FACTS';
          const externalId = String(p.externalId || p.barcode).trim();
          const globalFood = await this.prisma.foodItem.findFirst({
            where: {
              source,
              externalId,
              userId: null,
              deletedAt: null,
            },
          });
          resolvedFoodItemId = globalFood?.id;
        }

        // Risoluzione flessibile MealSlot
        let resolvedMealSlotId = p.mealSlotId;
        if (!resolvedMealSlotId && p.mealSlotClientSideId) {
          const slot = await this.prisma.mealSlot.findUnique({
            where: {
              userId_clientSideId: {
                userId,
                clientSideId: p.mealSlotClientSideId,
              },
            },
          });
          resolvedMealSlotId = slot?.id;
        }

        // Risoluzione flessibile Recipe
        let resolvedRecipeId = p.recipeId;
        if (!resolvedRecipeId && p.recipeClientSideId) {
          const recipe = await this.prisma.recipe.findUnique({
            where: {
              userId_clientSideId: {
                userId,
                clientSideId: p.recipeClientSideId,
              },
            },
          });
          resolvedRecipeId = recipe?.id;
        }

        const created = await this.prisma.nutritionLog.create({
          data: {
            clientSideId,
            userId,
            loggedAt,
            entryType: p.entryType || (resolvedRecipeId ? 'RECIPE' : resolvedFoodItemId ? 'FOOD_ITEM' : 'QUICK_ADD'),
            foodItemId: resolvedFoodItemId,
            mealSlotId: resolvedMealSlotId,
            recipeId: resolvedRecipeId,
            mealType: p.mealType || 'SNACK',
            customFoodName: p.foodName || p.customFoodName || 'Pasto Offline',
            recipeNameSnapshot: p.recipeNameSnapshot,
            quantityG: Number(p.quantityG || 100),
            caloriesConsumed: Number(p.caloriesConsumed || p.calories || 0),
            proteinConsumed: p.proteinConsumed !== undefined ? Number(p.proteinConsumed) : null,
            carbsConsumed: p.carbsConsumed !== undefined ? Number(p.carbsConsumed) : null,
            fatConsumed: p.fatConsumed !== undefined ? Number(p.fatConsumed) : null,
            fiberConsumed: p.fiberConsumed !== undefined && p.fiberConsumed !== null ? Number(p.fiberConsumed) : null,
            clientUpdatedAt: safeClientUpdatedAt,
          },
        });

        return { id: clientSideId, status: 'SYNCED', serverId: created.id };
      }

      case MutationType.CREATE_WORKOUT_LOG: {
        const existing = await this.prisma.workoutLog.findUnique({
          where: { clientSideId },
        });

        if (existing) {
          return { id: clientSideId, status: 'ALREADY_SYNCED', serverId: existing.id };
        }

        const p = mutation.payload;
        const startedAt = p.startedAt || p.date ? new Date(p.startedAt || p.date) : new Date(mutation.timestamp);
        const finishedAt = p.finishedAt ? new Date(p.finishedAt) : new Date(startedAt.getTime() + 60 * 60 * 1000);

        // Risoluzione a cascata del peso corporeo (offline sync):
        // 1. Ultima misurazione storica con recordedAt <= startedAt
        let measurement = await this.prisma.measurement.findFirst({
          where: {
            userId,
            deletedAt: null,
            recordedAt: { lte: startedAt },
          },
          orderBy: { recordedAt: 'desc' },
        });

        // 2. Se assente, peso attuale dal profilo utente (ultima misurazione in assoluto)
        if (!measurement) {
          measurement = await this.prisma.measurement.findFirst({
            where: {
              userId,
              deletedAt: null,
            },
            orderBy: { recordedAt: 'desc' },
          });
        }

        // 3. Altrimenti peso sconosciuto (null, MAI fallback fisso 75)
        const userWeightKg = measurement?.weightKg ?? null;

        // Warning consultivo se misurazione più vecchia di 90 giorni rispetto al workout
        if (measurement && measurement.recordedAt) {
          const diffMs = Math.abs(startedAt.getTime() - new Date(measurement.recordedAt).getTime());
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays > 90) {
            this.logger.warn(`Offline sync: peso non aggiornato (>90 giorni) per utente ${userId}`);
          }
        }

        const rawWallClock = p.durationMinutes
          ? Number(p.durationMinutes)
          : Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000));

        // Clamping non-critical fields con warning nel logger (per non bloccare sync utente)
        const clamp = (val: number | null | undefined, min: number, max: number, field: string): number | null => {
          if (val === undefined || val === null || isNaN(val)) return null;
          if (val < min) {
            this.logger.warn(`Offline sync clamped ${field} from ${val} to min ${min} for user ${userId}`);
            return min;
          }
          if (val > max) {
            this.logger.warn(`Offline sync clamped ${field} from ${val} to max ${max} for user ${userId}`);
            return max;
          }
          return val;
        };

        const ALLOWED_SET_TYPES = ['WARMUP', 'WORKING', 'DROP', 'DROPSET', 'FAILURE'];
        const exercises = Array.isArray(p.exercises) ? p.exercises : [];
        const processedExercises: Array<{
          exName: string;
          isSkipped: boolean;
          sets: Array<{
            orderIndex: number;
            setType: string;
            repsCompleted: number | null;
            weightKg: number | null;
            rpe: number | null;
          }>;
        }> = [];

        const flattenedSets: BiomechanicalSetInput[] = [];

        for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
          const exData = exercises[exIdx];
          const exName = (exData.exerciseName || exData.name || 'Esercizio').trim();
          const isSkipped = Boolean(exData.isSkipped);
          const rawSets = Array.isArray(exData.sets) ? exData.sets : [];
          const clampedSets: Array<{
            orderIndex: number;
            setType: string;
            repsCompleted: number | null;
            weightKg: number | null;
            rpe: number | null;
          }> = [];

          for (let sIdx = 0; sIdx < rawSets.length; sIdx++) {
            const s = rawSets[sIdx];

            let setType = s.setType ? String(s.setType).toUpperCase() : 'WORKING';
            if (!ALLOWED_SET_TYPES.includes(setType)) {
              this.logger.warn(`Offline sync mapped invalid setType "${s.setType}" to WORKING for user ${userId}`);
              setType = 'WORKING';
            }

            const rawOrder = s.orderIndex !== undefined && s.orderIndex !== null ? Number(s.orderIndex) : sIdx + 1;
            const orderIndex = clamp(rawOrder, 1, 100, `set[${exIdx},${sIdx}].orderIndex`) ?? sIdx + 1;

            const repsCompleted = s.repsCompleted !== undefined && s.repsCompleted !== null
              ? clamp(Number(s.repsCompleted), 0, 500, `set[${exIdx},${sIdx}].repsCompleted`)
              : null;

            const weightKg = s.weightKg !== undefined && s.weightKg !== null
              ? clamp(Number(s.weightKg), 0, 1000, `set[${exIdx},${sIdx}].weightKg`)
              : null;

            const rpe = s.rpe !== undefined && s.rpe !== null
              ? clamp(Number(s.rpe), 1, 10, `set[${exIdx},${sIdx}].rpe`)
              : null;

            clampedSets.push({
              orderIndex,
              setType,
              repsCompleted,
              weightKg,
              rpe,
            });

            if (!isSkipped) {
              flattenedSets.push({
                setType,
                repsCompleted,
                weightKg,
                rpe,
                exerciseName: exName,
              });
            }
          }

          processedExercises.push({
            exName,
            isSkipped,
            sets: clampedSets,
          });
        }

        const expenditure = calculateWorkoutExpenditure({
          sets: flattenedSets,
          userWeightKg: userWeightKg ?? undefined,
          wallClockDurationMinutes: rawWallClock,
        });

        const finalDurationMinutes = p.durationMinutes ? Number(p.durationMinutes) : expenditure.finalDurationMinutes;

        // Tutela fisiologica: se età sconosciuta (birthDate == null), minorenne (<18) o peso sconosciuto => stima MET adulti bloccata
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { birthDate: true },
        });

        let isAgeKnown = false;
        let isUnderage = false;
        if (user?.birthDate) {
          try {
            const age = calculateAge(user.birthDate, startedAt);
            isAgeKnown = true;
            isUnderage = age < 18;
          } catch {
            isAgeKnown = false;
          }
        }

        const isWeightKnown = userWeightKg !== null && userWeightKg > 0;
        const isEligibleForAutoCalories = isAgeKnown && !isUnderage && isWeightKnown;

        const rawManualCalories = p.manualCaloriesBurned !== undefined && p.manualCaloriesBurned !== null
          ? Number(p.manualCaloriesBurned)
          : null;
        const clampedManualCalories = rawManualCalories !== null
          ? clamp(rawManualCalories, 0, 10000, 'manualCaloriesBurned')
          : null;

        let finalCalories: number | null = null;
        if (clampedManualCalories !== null) {
          finalCalories = clampedManualCalories;
        } else if (isEligibleForAutoCalories) {
          finalCalories = p.caloriesBurned ? Number(p.caloriesBurned) : expenditure.caloriesBurned;
        } else {
          finalCalories = null;
        }

        const created = await this.prisma.$transaction(async (tx) => {
          const log = await tx.workoutLog.create({
            data: {
              clientSideId,
              userId,
              dayNameSnapshot: p.dayNameSnapshot || p.workoutName || 'Allenamento Offline',
              startedAt,
              finishedAt,
              durationMinutes: finalDurationMinutes,
              caloriesBurned: finalCalories,
              manualCaloriesBurned: clampedManualCalories ?? undefined,
            },
          });

          for (let exIdx = 0; exIdx < processedExercises.length; exIdx++) {
            const exData = processedExercises[exIdx];
            const logEx = await tx.workoutLogExercise.create({
              data: {
                workoutLogId: log.id,
                exerciseNameSnapshot: exData.exName,
                isSkipped: exData.isSkipped,
              },
            });

            for (let sIdx = 0; sIdx < exData.sets.length; sIdx++) {
              const setData = exData.sets[sIdx];
              await tx.workoutLogSet.create({
                data: {
                  clientSideId: `${clientSideId}_set_${exIdx}_${sIdx}`,
                  workoutLogExerciseId: logEx.id,
                  orderIndex: setData.orderIndex,
                  setType: setData.setType as any,
                  weightKg: setData.weightKg,
                  repsCompleted: setData.repsCompleted,
                  rpe: setData.rpe,
                },
              });
            }
          }

          return log;
        });

        return { id: clientSideId, status: 'SYNCED', serverId: created.id };
      }

      case MutationType.CREATE_DOCUMENT_TEXT: {
        const existing = await this.prisma.userDocument.findUnique({
          where: { clientSideId },
        });

        if (existing) {
          return { id: clientSideId, status: 'ALREADY_SYNCED', serverId: existing.id };
        }

        const p = mutation.payload;
        const text = String(p.extractedMarkdown || p.content || '').trim();
        const tokenEstimate = Math.ceil(text.length / 4);

        const created = await this.prisma.userDocument.create({
          data: {
            clientSideId,
            userId,
            title: p.title || 'Documento Offline',
            category: p.category || DocumentCategory.OTHER,
            originalFilename: p.originalFilename || 'offline_document.md',
            mimeType: p.mimeType || 'text/markdown',
            extractedMarkdown: text,
            tokenEstimate,
            isActiveInRag: p.isActiveInRag !== false,
          },
        });

        return { id: clientSideId, status: 'SYNCED', serverId: created.id };
      }

      default:
        throw new Error(`Tipo di mutazione non supportato: ${mutation.type}`);
    }
  }
}
