import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  calculateRecipeNutrition,
  calculatePortionSnapshot,
  RecipeIngredientInput,
} from '@harukaizen/shared';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  LogRecipeDto,
} from './dto/recipe.dto.js';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  private clampClientUpdatedAt(clientUpdatedAt?: string | Date | null): Date {
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 5 * 60 * 1000);
    if (!clientUpdatedAt) return now;

    const parsed = new Date(clientUpdatedAt);
    if (isNaN(parsed.getTime())) return now;
    return parsed.getTime() > maxFuture.getTime() ? maxFuture : parsed;
  }

  /**
   * Mappa gli ingredienti da database nel formato atteso dal motore di calcolo condiviso.
   */
  private formatIngredientsForCalculation(
    ingredients: Array<{
      foodItemId: string;
      quantity: number;
      unit: string;
      foodItem: {
        id: string;
        name: string;
        calories100g: number;
        protein100g: number;
        carbs100g: number;
        fat100g: number;
        fiber100g: number | null;
        sodium100g: number | null;
        servingSizeG: number | null;
      };
    }>
  ): RecipeIngredientInput[] {
    return ingredients.map((ing) => ({
      foodItemId: ing.foodItemId,
      foodItemName: ing.foodItem.name,
      quantity: ing.quantity,
      unit: ing.unit,
      densityGPerMl: 1.0,
      servingSizeG: ing.foodItem.servingSizeG,
      calories100g: ing.foodItem.calories100g,
      protein100g: ing.foodItem.protein100g,
      carbs100g: ing.foodItem.carbs100g,
      fat100g: ing.foodItem.fat100g,
      fiber100g: ing.foodItem.fiber100g,
      sodium100g: ing.foodItem.sodium100g,
    }));
  }

  async list(userId: string) {
    const recipes = await this.prisma.recipe.findMany({
      where: { userId, deletedAt: null },
      include: {
        ingredients: {
          include: { foodItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recipes.map((r) => {
      const formatted = this.formatIngredientsForCalculation(r.ingredients);
      const calculated = calculateRecipeNutrition({
        ingredients: formatted,
        defaultServings: r.defaultServings,
        finishedWeightG: r.finishedWeightG,
      });

      return {
        id: r.id,
        clientSideId: r.clientSideId,
        name: r.name,
        notes: r.notes,
        defaultServings: r.defaultServings,
        finishedWeightG: r.finishedWeightG,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        calculation: calculated,
      };
    });
  }

  async findById(userId: string, id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: { foodItem: true },
        },
      },
    });

    if (!recipe || recipe.deletedAt) {
      throw new NotFoundException('Ricetta non trovata.');
    }
    if (recipe.userId !== userId) {
      throw new ForbiddenException('Non autorizzato alla visualizzazione della ricetta.');
    }

    const formatted = this.formatIngredientsForCalculation(recipe.ingredients);
    const calculated = calculateRecipeNutrition({
      ingredients: formatted,
      defaultServings: recipe.defaultServings,
      finishedWeightG: recipe.finishedWeightG,
    });

    return {
      ...recipe,
      calculation: calculated,
    };
  }

  async create(userId: string, dto: CreateRecipeDto) {
    const safeTime = this.clampClientUpdatedAt(dto.clientUpdatedAt);

    // Idempotenza se clientSideId presente
    if (dto.clientSideId) {
      const existing = await this.prisma.recipe.findUnique({
        where: {
          userId_clientSideId: {
            userId,
            clientSideId: dto.clientSideId,
          },
        },
        include: { ingredients: { include: { foodItem: true } } },
      });

      if (existing) {
        if (existing.clientUpdatedAt && safeTime < existing.clientUpdatedAt) {
          return { status: 'REJECTED_STALE', winner: existing };
        }
        // Se più recente, aggiorna
        return this.update(userId, existing.id, {
          name: dto.name,
          defaultServings: dto.defaultServings,
          finishedWeightG: dto.finishedWeightG,
          notes: dto.notes,
          clientUpdatedAt: dto.clientUpdatedAt,
          ingredients: dto.ingredients,
        });
      }
    }

    if (!dto.ingredients || dto.ingredients.length === 0) {
      throw new BadRequestException('Una ricetta deve contenere almeno un ingrediente.');
    }

    // Verifica che tutti i foodItemId esistano e siano accessibili
    const foodItemIds = dto.ingredients.map((i) => i.foodItemId);
    const foodItems = await this.prisma.foodItem.findMany({
      where: {
        id: { in: foodItemIds },
        OR: [{ userId }, { userId: null }],
        deletedAt: null,
      },
    });

    if (foodItems.length !== foodItemIds.length) {
      throw new BadRequestException('Uno o più alimenti selezionati non sono validi o non appartengono all’utente.');
    }

    // Transazione atomica per ricetta + ingredienti
    const created = await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          userId,
          name: dto.name.trim(),
          defaultServings: dto.defaultServings ?? 1,
          finishedWeightG: dto.finishedWeightG,
          notes: dto.notes,
          clientSideId: dto.clientSideId,
          clientUpdatedAt: safeTime,
        },
      });

      await tx.recipeIngredient.createMany({
        data: dto.ingredients.map((ing) => ({
          recipeId: recipe.id,
          foodItemId: ing.foodItemId,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      });

      return tx.recipe.findUniqueOrThrow({
        where: { id: recipe.id },
        include: {
          ingredients: {
            include: { foodItem: true },
          },
        },
      });
    });

    const formatted = this.formatIngredientsForCalculation(created.ingredients);
    const calculation = calculateRecipeNutrition({
      ingredients: formatted,
      defaultServings: created.defaultServings,
      finishedWeightG: created.finishedWeightG,
    });

    return {
      status: 'APPLIED',
      data: {
        ...created,
        calculation,
      },
    };
  }

  async update(userId: string, id: string, dto: UpdateRecipeDto) {
    const existing = await this.prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: true },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Ricetta non trovata.');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('Non autorizzato alla modifica della ricetta.');
    }

    const safeTime = this.clampClientUpdatedAt(dto.clientUpdatedAt);
    if (existing.clientUpdatedAt && safeTime < existing.clientUpdatedAt) {
      return { status: 'REJECTED_STALE', winner: existing };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id },
        data: {
          name: dto.name?.trim() ?? existing.name,
          defaultServings: dto.defaultServings ?? existing.defaultServings,
          finishedWeightG:
            dto.finishedWeightG !== undefined ? dto.finishedWeightG : existing.finishedWeightG,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          clientUpdatedAt: safeTime,
        },
      });

      if (dto.ingredients) {
        if (dto.ingredients.length === 0) {
          throw new BadRequestException('Una ricetta non può avere 0 ingredienti.');
        }

        // Sostituzione atomica degli ingredienti
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        await tx.recipeIngredient.createMany({
          data: dto.ingredients.map((ing) => ({
            recipeId: id,
            foodItemId: ing.foodItemId,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        });
      }

      return tx.recipe.findUniqueOrThrow({
        where: { id },
        include: {
          ingredients: {
            include: { foodItem: true },
          },
        },
      });
    });

    const formatted = this.formatIngredientsForCalculation(updated.ingredients);
    const calculation = calculateRecipeNutrition({
      ingredients: formatted,
      defaultServings: updated.defaultServings,
      finishedWeightG: updated.finishedWeightG,
    });

    return {
      status: 'APPLIED',
      data: {
        ...updated,
        calculation,
      },
    };
  }

  async delete(userId: string, id: string) {
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Ricetta non trovata.');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('Non autorizzato.');
    }

    await this.prisma.recipe.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, deletedRecipeId: id };
  }

  /**
   * Registra una ricetta nel diario alimentare (voce singola o esplosa).
   */
  async logRecipe(userId: string, dto: LogRecipeDto) {
    const recipe = await this.findById(userId, dto.recipeId);
    const loggedAt = dto.loggedAt ? new Date(dto.loggedAt) : new Date();

    // Calcolo porzione consumata
    const portion = calculatePortionSnapshot({
      recipeCalculation: recipe.calculation,
      portionType: dto.portionType,
      portionValue: dto.portionValue,
    });

    if (dto.mode === 'SINGLE_ITEM') {
      const log = await this.prisma.nutritionLog.create({
        data: {
          userId,
          clientSideId: dto.clientSideId,
          mealSlotId: dto.mealSlotId,
          loggedAt,
          entryType: 'RECIPE',
          recipeId: recipe.id,
          recipeNameSnapshot: recipe.name,
          customFoodName: recipe.name,
          mealType: 'LUNCH', // fallback legacy
          quantityG: portion.consumedGrams,
          caloriesConsumed: portion.snapshot.caloriesConsumed,
          proteinConsumed: portion.snapshot.proteinConsumed,
          carbsConsumed: portion.snapshot.carbsConsumed,
          fatConsumed: portion.snapshot.fatConsumed,
          fiberConsumed: portion.snapshot.fiberConsumed,
        },
        include: { mealSlot: true },
      });

      return { mode: 'SINGLE_ITEM', logs: [log] };
    } else {
      // Modalità EXPLODED: crea N record separati, uno per ingrediente proporzionato
      const createdLogs = await this.prisma.$transaction(
        recipe.calculation.ingredients.map((ing) => {
          const ingQuantityG = Math.round(ing.computedWeightG * portion.portionRatio * 10) / 10;
          const ingCalories = Math.round(ing.calories * portion.portionRatio);
          const ingProtein = Math.round(ing.protein * portion.portionRatio * 10) / 10;
          const ingCarbs = Math.round(ing.carbs * portion.portionRatio * 10) / 10;
          const ingFat = Math.round(ing.fat * portion.portionRatio * 10) / 10;
          const ingFiber =
            ing.fiber !== null ? Math.round(ing.fiber * portion.portionRatio * 10) / 10 : null;

          return this.prisma.nutritionLog.create({
            data: {
              userId,
              mealSlotId: dto.mealSlotId,
              loggedAt,
              entryType: 'FOOD_ITEM',
              foodItemId: ing.foodItemId,
              customFoodName: ing.foodItemName || 'Ingrediente Ricetta',
              recipeId: recipe.id,
              recipeNameSnapshot: recipe.name,
              mealType: 'LUNCH',
              quantityG: ingQuantityG,
              caloriesConsumed: ingCalories,
              proteinConsumed: ingProtein,
              carbsConsumed: ingCarbs,
              fatConsumed: ingFat,
              fiberConsumed: ingFiber,
            },
          });
        })
      );

      return { mode: 'EXPLODED', logs: createdLogs };
    }
  }
}

