import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateNutritionLogDto } from './dto/create-nutrition-log.dto.js';
import {
  calculateNutritionalTargets,
  calculateDailyCalorieBalance,
  calculateDailyFiberSummary,
} from '@harukaizen/shared';

@Injectable()
export class NutritionLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private clampClientUpdatedAt(clientUpdatedAt?: string | Date | null): Date {
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 5 * 60 * 1000);
    if (!clientUpdatedAt) return now;

    const parsed = new Date(clientUpdatedAt);
    if (isNaN(parsed.getTime())) return now;
    return parsed.getTime() > maxFuture.getTime() ? maxFuture : parsed;
  }

  async create(userId: string, dto: CreateNutritionLogDto) {
    const safeTime = this.clampClientUpdatedAt(dto.clientUpdatedAt);
    const entryType = dto.entryType || (dto.foodItemId ? 'FOOD_ITEM' : dto.recipeId ? 'RECIPE' : 'QUICK_ADD');

    // Idempotenza offline via clientSideId
    if (dto.clientSideId) {
      const existing = await this.prisma.nutritionLog.findUnique({
        where: {
          userId_clientSideId: {
            userId,
            clientSideId: dto.clientSideId,
          },
        },
      });

      if (existing) {
        if (existing.clientUpdatedAt && safeTime < existing.clientUpdatedAt) {
          return { status: 'REJECTED_STALE', winner: existing };
        }

        const updated = await this.prisma.nutritionLog.update({
          where: { id: existing.id },
          data: {
            mealSlotId: dto.mealSlotId ?? existing.mealSlotId,
            foodItemId: dto.foodItemId ?? existing.foodItemId,
            recipeId: dto.recipeId ?? existing.recipeId,
            customFoodName: dto.customFoodName ?? existing.customFoodName,
            recipeNameSnapshot: dto.recipeNameSnapshot ?? existing.recipeNameSnapshot,
            quantityG: dto.quantityG ?? existing.quantityG,
            caloriesConsumed: dto.caloriesConsumed ?? existing.caloriesConsumed,
            proteinConsumed: dto.proteinConsumed ?? existing.proteinConsumed,
            carbsConsumed: dto.carbsConsumed ?? existing.carbsConsumed,
            fatConsumed: dto.fatConsumed ?? existing.fatConsumed,
            fiberConsumed: dto.fiberConsumed !== undefined ? dto.fiberConsumed : existing.fiberConsumed,
            loggedAt: new Date(dto.loggedAt),
            deletedAt: null,
            clientUpdatedAt: safeTime,
          },
        });
        return { status: 'APPLIED', data: updated };
      }
    }

    // Se fornito mealSlotId, verifica che appartenga all'utente
    if (dto.mealSlotId) {
      const slot = await this.prisma.mealSlot.findUnique({ where: { id: dto.mealSlotId } });
      if (!slot || slot.deletedAt || slot.userId !== userId) {
        throw new BadRequestException('Slot pasto specificato non valido.');
      }
    }

    let calories = dto.caloriesConsumed;
    let protein = dto.proteinConsumed;
    let carbs = dto.carbsConsumed;
    let fat = dto.fatConsumed;
    let fiber: number | null = dto.fiberConsumed ?? null;
    let quantityG = dto.quantityG ?? 100;
    let customFoodName = dto.customFoodName;

    if (entryType === 'FOOD_ITEM' && dto.foodItemId) {
      const food = await this.prisma.foodItem.findUnique({
        where: { id: dto.foodItemId },
      });
      if (!food || food.deletedAt) throw new NotFoundException('Alimento non trovato.');
      if (food.userId && food.userId !== userId) {
        throw new ForbiddenException('Non autorizzato all’accesso a questo alimento privato.');
      }

      quantityG = dto.quantityG && dto.quantityG > 0 ? dto.quantityG : 100;
      const ratio = quantityG / 100;
      calories = Math.round(food.calories100g * ratio * 10) / 10;
      protein = Math.round(food.protein100g * ratio * 10) / 10;
      carbs = Math.round(food.carbs100g * ratio * 10) / 10;
      fat = Math.round(food.fat100g * ratio * 10) / 10;
      fiber = food.fiber100g !== null && food.fiber100g !== undefined
        ? Math.round(food.fiber100g * ratio * 10) / 10
        : null;
      customFoodName = customFoodName || food.name;
    } else if (entryType === 'QUICK_ADD') {
      if (calories === undefined || calories === null) {
        throw new BadRequestException('Per una registrazione rapida (Quick Add) le calorie sono obbligatorie.');
      }
      customFoodName = customFoodName?.trim() || 'Registrazione Rapida';
      quantityG = quantityG || 1;
    } else if (entryType === 'RECIPE') {
      if (!dto.recipeId && !customFoodName) {
        throw new BadRequestException('Specificare recipeId o il nome della ricetta.');
      }
    }

    const log = await this.prisma.nutritionLog.create({
      data: {
        userId,
        clientSideId: dto.clientSideId,
        mealSlotId: dto.mealSlotId,
        foodItemId: dto.foodItemId,
        recipeId: dto.recipeId,
        entryType,
        customFoodName,
        recipeNameSnapshot: dto.recipeNameSnapshot,
        loggedAt: new Date(dto.loggedAt),
        mealType: dto.mealType || 'LUNCH',
        quantityG,
        caloriesConsumed: calories ?? 0,
        proteinConsumed: protein ?? 0,
        carbsConsumed: carbs ?? 0,
        fatConsumed: fat ?? 0,
        fiberConsumed: fiber,
        clientUpdatedAt: safeTime,
      },
      include: { foodItem: true, mealSlot: true, recipe: true },
    });

    return { status: 'APPLIED', data: log };
  }

  async findByDate(userId: string, dateStr: string) {
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);

    return this.prisma.nutritionLog.findMany({
      where: {
        userId,
        deletedAt: null,
        loggedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        foodItem: true,
        mealSlot: true,
        recipe: true,
      },
      orderBy: { loggedAt: 'asc' },
    });
  }

  async getSummary(userId: string, dateStr: string) {
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);

    // 1. Log della giornata
    const logs = await this.prisma.nutritionLog.findMany({
      where: {
        userId,
        deletedAt: null,
        loggedAt: { gte: start, lte: end },
      },
      include: { foodItem: true, mealSlot: true, recipe: true },
      orderBy: { loggedAt: 'asc' },
    });

    // 2. Calcolo totali consumati e fibre
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const l of logs) {
      totalCalories += l.caloriesConsumed;
      totalProtein += l.proteinConsumed ?? 0;
      totalCarbs += l.carbsConsumed ?? 0;
      totalFat += l.fatConsumed ?? 0;
    }

    const fiberSummary = calculateDailyFiberSummary({
      logs: logs.map((l) => ({ fiberConsumed: l.fiberConsumed })),
    });

    const consumed = {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      fiber: fiberSummary.totalFiberG,
      isFiberIncomplete: fiberSummary.isFiberIncomplete,
      fiberDisplay: fiberSummary.displayValue,
      totalEntries: logs.length,
    };

    // 3. Calcolo calorie bruciate dai workout del giorno
    const workoutLogs = await this.prisma.workoutLog.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: start, lte: end },
      },
      select: { caloriesBurned: true, manualCaloriesBurned: true },
    });

    let burnedCalories = 0;
    for (const w of workoutLogs) {
      // Priorità a manualCaloriesBurned se presente, altrimenti caloriesBurned
      const burned = w.manualCaloriesBurned ?? w.caloriesBurned ?? 0;
      burnedCalories += burned;
    }
    burnedCalories = Math.round(burnedCalories);

    // 4. Profilo utente, impostazioni e misurazione storica
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSettings: true,
        measurements: {
          where: {
            deletedAt: null,
            recordedAt: { lte: end },
          },
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    const latestWeight = user?.measurements?.[0]?.weightKg ?? 75;
    const settings = user?.userSettings;

    // 5. Motore deterministico target
    const targetEngineResult = calculateNutritionalTargets({
      weightKg: latestWeight,
      heightCm: user?.heightCm ?? 175,
      sex: (user?.sex as 'M' | 'F') ?? 'M',
      birthDate: user?.birthDate,
      lifestyleMultiplier: user?.lifestyleMultiplier ?? 1.2,
      targetMode: (settings?.targetMode as 'AUTO' | 'MANUAL') ?? 'AUTO',
      goalType: (settings?.goalType as 'CUT' | 'MAINTENANCE' | 'BULK') ?? 'MAINTENANCE',
      deficitPct: settings?.deficitPct,
      surplusPct: settings?.surplusPct,
      proteinPerKg: settings?.proteinPerKg,
      fatPct: settings?.fatPct,
      isPregnant: settings?.isPregnant,
      isLactating: settings?.isLactating,
      manualTargets: {
        targetCalories: settings?.targetCalories,
        targetProteinG: settings?.targetProteinG,
        targetCarbsG: settings?.targetCarbsG,
        targetFatG: settings?.targetFatG,
        targetFiberG: settings?.targetFiberG,
      },
    });

    // 6. Calcolo bilancio energetico (Simple vs Active con prevenzione doppio conteggio)
    const balanceResult = calculateDailyCalorieBalance({
      targetCalories: targetEngineResult.targetCalories,
      baseTdee: targetEngineResult.baseTdee,
      eatenCalories: consumed.calories,
      burnedCalories,
      calorieBalanceMode: (settings?.calorieBalanceMode as 'SIMPLE' | 'ACTIVE') ?? 'SIMPLE',
      burnedCalorieRecoveryPct: settings?.burnedCalorieRecoveryPct ?? 50,
      isSpecialGroup: targetEngineResult.isSpecialGroup,
      isAgeKnown: targetEngineResult.isAgeKnown,
    });

    // 7. Raggruppamento voci per MealSlot
    const userSlots = await this.prisma.mealSlot.findMany({
      where: { userId, deletedAt: null },
      orderBy: { slotOrder: 'asc' },
    });

    const slotMap = new Map<string, any>();
    for (const s of userSlots) {
      slotMap.set(s.id, {
        id: s.id,
        name: s.name,
        slotOrder: s.slotOrder,
        logs: [] as any[],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      });
    }

    const unassignedLogs: any[] = [];

    for (const log of logs) {
      if (log.mealSlotId && slotMap.has(log.mealSlotId)) {
        const slotEntry = slotMap.get(log.mealSlotId)!;
        slotEntry.logs.push(log);
        slotEntry.totals.calories += log.caloriesConsumed;
        slotEntry.totals.protein += log.proteinConsumed ?? 0;
        slotEntry.totals.carbs += log.carbsConsumed ?? 0;
        slotEntry.totals.fat += log.fatConsumed ?? 0;
      } else {
        unassignedLogs.push(log);
      }
    }

    return {
      date: dateStr,
      consumed,
      burnedCalories,
      targets: {
        calories: targetEngineResult.targetCalories,
        proteinG: targetEngineResult.targetProteinG,
        carbsG: targetEngineResult.targetCarbsG,
        fatG: targetEngineResult.targetFatG,
        fiberG: targetEngineResult.targetFiberG,
        targetMode: targetEngineResult.targetMode,
        goalType: targetEngineResult.goalType,
        floorAdjustmentApplied: targetEngineResult.floorAdjustmentApplied,
        advisoryWarnings: targetEngineResult.advisoryWarnings,
        clinicalDisclaimer: targetEngineResult.clinicalDisclaimer,
      },
      balance: balanceResult,
      fiberSummary,
      mealSlots: Array.from(slotMap.values()),
      unassignedLogs,
    };
  }

  async remove(userId: string, id: string) {
    const log = await this.prisma.nutritionLog.findUnique({ where: { id } });
    if (!log || log.deletedAt) throw new NotFoundException('Log pasto non trovato.');
    if (log.userId !== userId) throw new ForbiddenException('Non autorizzato.');

    return this.prisma.nutritionLog.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
