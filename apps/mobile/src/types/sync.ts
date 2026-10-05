export interface LocalWorkoutSet {
  id: string;
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  rpe?: number;
  completed: boolean;
  prescribedWeightKg?: number;
  prescribedReps?: number;
}

export interface LocalWorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  notes?: string;
  sets: LocalWorkoutSet[];
}

export interface QueuedWorkoutLog {
  clientSyncId: string;
  workoutPlanId?: string;
  name: string;
  clientCapturedAt: string;
  exercises: {
    exerciseId: string;
    sets: {
      setNumber: number;
      weightKg: number;
      repsCompleted: number;
      rpe?: number;
    }[];
  }[];
  notes?: string;
  retryCount: number;
}

export interface QueuedPhotoUpload {
  clientSyncId: string;
  clientCapturedAt: string;
  localFileUri: string; // Salvato su disco tramite expo-file-system
  category: 'FRONT' | 'SIDE' | 'BACK';
  weightKg?: number; // Peso corporeo opzionale associato alla foto
  notes?: string;
  retryCount: number;
}

export interface QueuedNutritionLog {
  clientSyncId: string;
  clientCapturedAt: string;
  barcode?: string;
  foodName: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  grams: number;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  retryCount: number;
}
