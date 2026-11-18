import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSettings: {
          select: {
            preferredLlmProvider: true,
            preferredLlmModel: true,
            timezone: true,
            locale: true,
            targetWeightKg: true,
            isDarkMode: true,
            targetMode: true,
            targetCalories: true,
            targetProteinG: true,
            targetCarbsG: true,
            targetFatG: true,
            targetFiberG: true,
            goalType: true,
            deficitPct: true,
            surplusPct: true,
            proteinPerKg: true,
            fatPct: true,
            calorieBalanceMode: true,
            burnedCalorieRecoveryPct: true,
            isPregnant: true,
            isLactating: true,
            aiDailyRequestLimit: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utente non trovato.');

    const { passwordHash: _pw, ...safeUser } = user;
    return safeUser;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    if (dto.weightKg !== undefined && dto.weightKg > 0) {
      await this.prisma.measurement.create({
        data: {
          userId,
          weightKg: dto.weightKg,
          recordedAt: new Date(),
        },
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.heightCm !== undefined && { heightCm: dto.heightCm }),
        ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.sex !== undefined && { sex: dto.sex }),
        ...(dto.lifestyleMultiplier !== undefined && {
          lifestyleMultiplier: dto.lifestyleMultiplier,
        }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        heightCm: true,
        birthDate: true,
        sex: true,
        lifestyleMultiplier: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Verifica la password dell'utente per operazioni protette (export, cancellazione account).
   */
  private async verifyPasswordOrThrow(userId: string, confirmPassword?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, authProvider: true },
    });

    if (!user) throw new NotFoundException('Utente non trovato.');

    // Se l'utente usa autenticazione locale con password, la conferma è obbligatoria
    if (user.passwordHash) {
      if (!confirmPassword) {
        throw new BadRequestException('È richiesta la conferma della password per questa operazione sensibile.');
      }
      const isValid = await bcrypt.compare(confirmPassword, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Password di conferma non valida.');
      }
    }
  }

  /**
   * Esportazione completa di tutti i dati personali e sanitari (GDPR Right of Access/Portability).
   */
  async exportData(userId: string, confirmPassword?: string) {
    await this.verifyPasswordOrThrow(userId, confirmPassword);

    const [
      user,
      settings,
      measurements,
      nutritionLogs,
      mealSlots,
      recipes,
      ownedFoodItems,
      workoutPlans,
      workoutLogs,
      documents,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          heightCm: true,
          birthDate: true,
          sex: true,
          lifestyleMultiplier: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.userSettings.findUnique({
        where: { userId },
        select: {
          timezone: true,
          locale: true,
          targetWeightKg: true,
          targetMode: true,
          targetCalories: true,
          targetProteinG: true,
          targetCarbsG: true,
          targetFatG: true,
          targetFiberG: true,
          goalType: true,
          deficitPct: true,
          surplusPct: true,
          proteinPerKg: true,
          fatPct: true,
          calorieBalanceMode: true,
          burnedCalorieRecoveryPct: true,
          isPregnant: true,
          isLactating: true,
          aiDailyRequestLimit: true,
          isDarkMode: true,
          coachTone: true,
        },
      }),
      this.prisma.measurement.findMany({
        where: { userId, deletedAt: null },
        orderBy: { recordedAt: 'asc' },
      }),
      this.prisma.nutritionLog.findMany({
        where: { userId, deletedAt: null },
        orderBy: { loggedAt: 'asc' },
      }),
      this.prisma.mealSlot.findMany({
        where: { userId, deletedAt: null },
        orderBy: { slotOrder: 'asc' },
      }),
      this.prisma.recipe.findMany({
        where: { userId, deletedAt: null },
        include: { ingredients: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.foodItem.findMany({
        where: { userId, deletedAt: null },
      }),
      this.prisma.workoutPlan.findMany({
        where: { userId, deletedAt: null },
        include: {
          workoutDays: {
            include: { exercises: true },
          },
        },
      }),
      this.prisma.workoutLog.findMany({
        where: { userId, deletedAt: null },
        include: {
          logExercises: {
            include: { logSets: true },
          },
        },
      }),
      this.prisma.userDocument.findMany({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        app: 'HaruKaizen Sovereign Edition',
      },
      profile: user,
      settings,
      measurements,
      nutritionLogs,
      mealSlots,
      recipes,
      ownedFoodItems,
      workoutPlans,
      workoutLogs,
      documents,
    };
  }

  /**
   * Cancellazione totale account in transazione atomica (GDPR Right to be Forgotten).
   * Elimina tutti i dati figli e tutte le righe FoodItem di proprietà (zero orfani).
   */
  async deleteAccount(userId: string, confirmPassword?: string) {
    await this.verifyPasswordOrThrow(userId, confirmPassword);

    await this.prisma.$transaction(async (tx) => {
      // 1. NutritionLogs
      await tx.nutritionLog.deleteMany({ where: { userId } });

      // 2. RecipeIngredients e Recipes
      await tx.recipeIngredient.deleteMany({ where: { recipe: { userId } } });
      await tx.recipe.deleteMany({ where: { userId } });

      // 3. MealSlots
      await tx.mealSlot.deleteMany({ where: { userId } });

      // 4. WorkoutLogs, LogExercises, LogSets
      await tx.workoutLogSet.deleteMany({
        where: { logExercise: { workoutLog: { userId } } },
      });
      await tx.workoutLogExercise.deleteMany({
        where: { workoutLog: { userId } },
      });
      await tx.workoutLog.deleteMany({ where: { userId } });

      // 5. WorkoutPlans, Days, Exercises
      await tx.workoutDayExercise.deleteMany({
        where: { workoutDay: { workoutPlan: { userId } } },
      });
      await tx.workoutDay.deleteMany({
        where: { workoutPlan: { userId } },
      });
      await tx.workoutPlan.deleteMany({ where: { userId } });

      // 6. DietPlans, Days, Items
      await tx.dietDayItem.deleteMany({
        where: { dietDay: { dietPlan: { userId } } },
      });
      await tx.dietDay.deleteMany({
        where: { dietPlan: { userId } },
      });
      await tx.dietPlan.deleteMany({ where: { userId } });

      // 7. Misurazioni, Media, Documenti, Report AI
      await tx.measurement.deleteMany({ where: { userId } });
      await tx.progressMedia.deleteMany({ where: { userId } });
      await tx.userDocument.deleteMany({ where: { userId } });
      await tx.aiInsightReport.deleteMany({ where: { userId } });

      // 8. Pulizia di tutti i riferimenti verso FoodItem di proprietà dell'utente prima della cancellazione
      await tx.dietDayItem.deleteMany({ where: { foodItem: { userId } } });
      await tx.recipeIngredient.deleteMany({ where: { foodItem: { userId } } });
      await tx.nutritionLog.deleteMany({ where: { foodItem: { userId } } });

      // 9. Tutti i FoodItem di proprietà dell'utente (CoW e manual quick - zero orfani)
      await tx.foodItem.deleteMany({ where: { userId } });

      // 10. UserSettings
      await tx.userSettings.deleteMany({ where: { userId } });

      // 11. User
      await tx.user.delete({ where: { id: userId } });
    });

    return {
      success: true,
      message: 'Account e tutti i dati sanitari e nutrizionali eliminati definitivamente con successo.',
    };
  }
}
