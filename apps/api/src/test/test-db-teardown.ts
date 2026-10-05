import { PrismaClient } from '@prisma/client';

export class TestDbTeardown {
  static async cleanDatabase(prisma: PrismaClient): Promise<void> {
    // Ordine di cancellazione che rispetta i vincoli di foreign key
    const tablenames = [
      'workout_log_sets',
      'workout_log_exercises',
      'workout_logs',
      'workout_day_exercises',
      'workout_days',
      'workout_plans',
      'diet_day_items',
      'diet_days',
      'diet_plans',
      'nutrition_logs',
      'food_items',
      'progress_media',
      'ai_insight_reports',
      'measurements',
      'user_settings',
      'users',
    ];

    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablenames.map((t) => `"${t}"`).join(', ')} CASCADE;`);
    } catch {
      // Fallback per ambienti senza supporto a truncate cascade
      await prisma.$transaction([
        prisma.workoutLogSet.deleteMany(),
        prisma.workoutLogExercise.deleteMany(),
        prisma.workoutLog.deleteMany(),
        prisma.workoutDayExercise.deleteMany(),
        prisma.workoutDay.deleteMany(),
        prisma.workoutPlan.deleteMany(),
        prisma.dietDayItem.deleteMany(),
        prisma.dietDay.deleteMany(),
        prisma.dietPlan.deleteMany(),
        prisma.nutritionLog.deleteMany(),
        prisma.progressMedia.deleteMany(),
        prisma.aiInsightReport.deleteMany(),
        prisma.measurement.deleteMany(),
        prisma.userSettings.deleteMany(),
        prisma.user.deleteMany(),
      ]);
    }
  }
}
