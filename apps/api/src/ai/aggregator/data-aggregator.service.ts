import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ContextSnapshot } from './context-snapshot.interface.js';
import { calculateBMR, calculateTDEE, SetType } from '@harukaizen/shared';

@Injectable()
export class DataAggregatorService {
  constructor(private readonly prisma: PrismaService) {}

  async buildWeeklySnapshot(userId: string, startDate?: Date, endDate?: Date): Promise<ContextSnapshot> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSettings: true,
      },
    });

    if (!user) throw new NotFoundException('Utente non trovato.');

    // 1. Misurazioni (Ultime 5)
    const recentMeasurements = await this.prisma.measurement.findMany({
      where: { userId, deletedAt: null },
      orderBy: { recordedAt: 'desc' },
      take: 5,
    });

    const currentWeight = recentMeasurements[0]?.weightKg;
    const prevWeight = recentMeasurements[1]?.weightKg;
    const deltaWeight = currentWeight && prevWeight ? Math.round((currentWeight - prevWeight) * 10) / 10 : undefined;

    // Calcolo TDEE
    let estimatedTdee: number | null = null;
    if (currentWeight && user.heightCm && user.birthDate && user.sex) {
      const bmr = calculateBMR({
        weightKg: currentWeight,
        heightCm: user.heightCm,
        birthDate: user.birthDate,
        sex: user.sex as 'M' | 'F',
      });
      estimatedTdee = Math.round(calculateTDEE(bmr, user.lifestyleMultiplier));
    }

    // 2. Nutrizione (Ultimi 7 giorni)
    const nutritionLogs = await this.prisma.nutritionLog.findMany({
      where: {
        userId,
        deletedAt: null,
        loggedAt: { gte: start, lte: end },
      },
    });

    // Raggruppa per giorno univoco
    const daysSet = new Set(nutritionLogs.map(l => l.loggedAt.toISOString().split('T')[0]));
    const totalDaysLogged = daysSet.size || 1;

    const totalCals = nutritionLogs.reduce((acc, l) => acc + l.caloriesConsumed, 0);
    const totalProt = nutritionLogs.reduce((acc, l) => acc + (l.proteinConsumed || 0), 0);
    const totalCarb = nutritionLogs.reduce((acc, l) => acc + (l.carbsConsumed || 0), 0);
    const totalFat = nutritionLogs.reduce((acc, l) => acc + (l.fatConsumed || 0), 0);

    const avgDailyCalories = Math.round(totalCals / totalDaysLogged);
    const avgDailyProteinG = Math.round((totalProt / totalDaysLogged) * 10) / 10;
    const avgDailyCarbsG = Math.round((totalCarb / totalDaysLogged) * 10) / 10;
    const avgDailyFatG = Math.round((totalFat / totalDaysLogged) * 10) / 10;

    const calorieBalanceDiff = estimatedTdee ? avgDailyCalories - estimatedTdee : null;

    // 3. Allenamento (Sessioni nell'intervallo)
    const workoutLogs = await this.prisma.workoutLog.findMany({
      where: {
        userId,
        deletedAt: null,
        startedAt: { gte: start, lte: end },
      },
      include: {
        logExercises: {
          include: { logSets: true },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    let totalDuration = 0;
    let totalCalsBurned = 0;
    let totalWorkingVolumeKg = 0;

    const sessions = workoutLogs.map(w => {
      totalDuration += w.durationMinutes || 0;
      totalCalsBurned += w.caloriesBurned || 0;

      const exercisesCompleted: string[] = [];

      for (const ex of w.logExercises) {
        if (!ex.isSkipped) {
          exercisesCompleted.push(ex.exerciseNameSnapshot);
          for (const s of ex.logSets) {
            if (s.setType !== SetType.WARMUP) {
              totalWorkingVolumeKg += (s.repsCompleted || 0) * (s.weightKg || 0);
            }
          }
        }
      }

      return {
        dayName: w.dayNameSnapshot,
        date: w.startedAt ? w.startedAt.toISOString().split('T')[0] : '',
        durationMinutes: w.durationMinutes,
        caloriesBurned: w.caloriesBurned,
        exercisesCompleted,
      };
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        heightCm: user.heightCm,
        sex: user.sex,
        birthDate: user.birthDate ? user.birthDate.toISOString().split('T')[0] : null,
        lifestyleMultiplier: user.lifestyleMultiplier,
        targetWeightKg: user.userSettings?.targetWeightKg,
        coachTone: user.userSettings?.coachTone || 'KAIZEN',
      },
      timeframe: {
        dateStart: start.toISOString().split('T')[0],
        dateEnd: end.toISOString().split('T')[0],
      },
      measurements: {
        currentWeightKg: currentWeight,
        previousWeightKg: prevWeight,
        deltaWeightKg: deltaWeight,
        bodyFatPercentage: recentMeasurements[0]?.bodyFatPercentage,
        recentMeasurements: recentMeasurements.map(m => ({
          date: m.recordedAt.toISOString().split('T')[0],
          weightKg: m.weightKg,
          bodyFatPercentage: m.bodyFatPercentage,
        })),
      },
      nutrition: {
        totalDaysLogged,
        avgDailyCalories,
        avgDailyProteinG,
        avgDailyCarbsG,
        avgDailyFatG,
        estimatedTdeeCalories: estimatedTdee,
        calorieBalanceDiff,
      },
      workout: {
        totalSessions: workoutLogs.length,
        totalDurationMinutes: totalDuration,
        totalWorkingVolumeKg,
        totalEstimatedCaloriesBurned: Math.round(totalCalsBurned),
        sessions,
      },
    };
  }
}
