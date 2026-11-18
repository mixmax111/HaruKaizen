import { z } from 'zod';

export const ExerciseCategoryEnum = z.enum([
  'CHEST',
  'BACK',
  'LEGS',
  'SHOULDERS',
  'ARMS',
  'CORE',
  'CARDIO',
]);

export const MealTypeEnum = z.enum([
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
]);

export const AiWorkoutExerciseSchema = z.object({
  exerciseName: z.string().min(1),
  category: ExerciseCategoryEnum,
  sets: z.number().int().min(1).max(10),
  repsTarget: z.string().min(1), // es. "8-12" o "AMRAP"
  weightTargetKg: z.number().nullable().optional(),
  rpeTarget: z.number().min(5).max(10).nullable().optional(),
  restSeconds: z.number().int().default(90),
  notes: z.string().nullable().optional(),
});

export const AiWorkoutDaySchema = z.object({
  name: z.string().min(1), // es. "Giorno A - Spinta (Petto, Spalle, Tricipiti)"
  dayOrder: z.number().int().min(1),
  exercises: z.array(AiWorkoutExerciseSchema).min(1),
});

export const AiGeneratedWorkoutPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  aiReasoning: z.string().min(1),
  clinicalWarning: z.string().nullable().optional(),
  days: z.array(AiWorkoutDaySchema).min(1),
});

export type AiGeneratedWorkoutPlan = z.infer<typeof AiGeneratedWorkoutPlanSchema>;

export const AiDietItemSchema = z.object({
  mealType: MealTypeEnum,
  foodName: z.string().min(1),
  quantityG: z.number().positive(),
  calories100g: z.number().nonnegative(),
  protein100g: z.number().nonnegative(),
  carbs100g: z.number().nonnegative(),
  fat100g: z.number().nonnegative(),
  scheduledTime: z.string().nullable().optional(), // es. "08:00"
});

export const AiDietDaySchema = z.object({
  name: z.string().min(1), // es. "Giorno Tipo (Target 2100 kcal)"
  items: z.array(AiDietItemSchema).min(1),
});

export const AiGeneratedDietPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  aiReasoning: z.string().min(1),
  clinicalWarning: z.string().nullable().optional(),
  targetCalories: z.number().positive().optional(),
  days: z.array(AiDietDaySchema).min(1),
});

export type AiGeneratedDietPlan = z.infer<typeof AiGeneratedDietPlanSchema>;

