export interface LocalWorkoutSet {
  id: string;
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  rpe?: number;
  setType?: 'WORKING' | 'WARMUP' | 'DROPSET' | 'FAILURE';
  completed: boolean;
  prescribedWeightKg?: number;
  prescribedReps?: number;
}

export interface LocalWorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  notes?: string;
  isExtraExercise?: boolean;
  restSeconds?: number;
  repsTarget?: string;
  weightTarget?: number;
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

export interface LocalMealSlot {
  id: string; // clientSideId
  name: string;
  slotOrder: number;
  clientUpdatedAt: string;
}

export interface LocalRecipeIngredient {
  foodItemId?: string;
  customFoodName?: string;
  quantity: number;
  unit: 'g' | 'ml' | 'serving' | 'piece';
}

export interface LocalRecipe {
  id: string; // clientSideId
  name: string;
  defaultServings?: number;
  finishedWeightG?: number | null;
  notes?: string;
  clientUpdatedAt: string;
  ingredients: LocalRecipeIngredient[];
}

export interface QueuedNutritionLog {
  clientSyncId: string;
  clientCapturedAt: string;
  clientUpdatedAt?: string;
  barcode?: string;
  foodItemId?: string;
  mealSlotId?: string;
  recipeId?: string;
  entryType?: 'FOOD_ITEM' | 'RECIPE' | 'QUICK_ADD';
  customFoodName?: string;
  recipeNameSnapshot?: string;
  foodName?: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiberConsumed?: number | null;
  grams: number;
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  retryCount: number;
}
