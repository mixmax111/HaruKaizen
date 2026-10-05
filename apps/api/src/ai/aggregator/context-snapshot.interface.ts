export interface ContextSnapshot {
  user: {
    id: string;
    email: string;
    heightCm?: number | null;
    sex?: string | null;
    birthDate?: string | null;
    lifestyleMultiplier: number;
    targetWeightKg?: number | null;
    coachTone: string;
  };
  timeframe: {
    dateStart: string;
    dateEnd: string;
  };
  measurements: {
    currentWeightKg?: number;
    previousWeightKg?: number;
    deltaWeightKg?: number;
    bodyFatPercentage?: number | null;
    recentMeasurements: Array<{
      date: string;
      weightKg: number;
      bodyFatPercentage?: number | null;
    }>;
  };
  nutrition: {
    totalDaysLogged: number;
    avgDailyCalories: number;
    avgDailyProteinG: number;
    avgDailyCarbsG: number;
    avgDailyFatG: number;
    estimatedTdeeCalories?: number | null;
    calorieBalanceDiff?: number | null; // Consumate - TDEE
  };
  workout: {
    totalSessions: number;
    totalDurationMinutes: number;
    totalWorkingVolumeKg: number;
    totalEstimatedCaloriesBurned: number;
    sessions: Array<{
      dayName: string;
      date: string;
      durationMinutes?: number | null;
      caloriesBurned?: number | null;
      exercisesCompleted: string[];
    }>;
  };
}
