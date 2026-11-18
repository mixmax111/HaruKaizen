import { z } from 'zod';
import {
  parseWeightKg,
  parseWeightWithNote,
  parseReps,
  parseRestSeconds,
  parseRPE,
  parseDateOrDefault,
} from '../smart-sanitizer.js';

export const CsvMeasurementRowSchema = z.object({
  recordedAt: z.string().min(1),
  weightKg: z.preprocess((val) => Number(val), z.number().positive()),
  bodyFatPercentage: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().min(1).max(70).nullable())
    .optional(),
  chestCm: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().positive().nullable())
    .optional(),
  armsCm: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().positive().nullable())
    .optional(),
  waistCm: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().positive().nullable())
    .optional(),
  legsCm: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().positive().nullable())
    .optional(),
});

export type CsvMeasurementRow = z.infer<typeof CsvMeasurementRowSchema>;

export const CsvNutritionRowSchema = z.object({
  loggedAt: z.string().min(1),
  mealType: z.preprocess((val) => {
    const s = String(val || '').trim().toUpperCase();
    if (s.includes('BREAK') || s.includes('COLAZIONE')) return 'BREAKFAST';
    if (s.includes('LUNCH') || s.includes('PRANZO')) return 'LUNCH';
    if (s.includes('DINNER') || s.includes('CENA')) return 'DINNER';
    return 'SNACK';
  }, z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])),
  foodName: z.string().min(1),
  quantityG: z.preprocess((val) => (val === '' || val === null || val === undefined ? 100 : Number(val)), z.number().positive()),
  caloriesConsumed: z.preprocess((val) => Number(val), z.number().nonnegative()),
  proteinConsumed: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().nonnegative().nullable())
    .optional(),
  carbsConsumed: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().nonnegative().nullable())
    .optional(),
  fatConsumed: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().nonnegative().nullable())
    .optional(),
});

export type CsvNutritionRow = z.infer<typeof CsvNutritionRowSchema>;

export const CsvWorkoutRowSchema = z.object({
  date: z.preprocess((val) => parseDateOrDefault(val), z.string().min(1)),
  workoutName: z.preprocess((val) => String(val || '').trim() || 'Allenamento Libero', z.string().min(1)),
  exerciseName: z.string().min(1),
  category: z
    .preprocess((val) => {
      const s = String(val || '').trim().toUpperCase();
      if (['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO'].includes(s)) {
        return s;
      }
      return 'CHEST'; // default fallback per categorizzazione
    }, z.enum(['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO']))
    .optional(),
  setOrder: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return 1;
    const match = String(val).match(/(\d+)/);
    return match ? Math.max(1, parseInt(match[1], 10)) : 1;
  }, z.number().int().positive()),
  weightKg: z
    .preprocess((val) => parseWeightWithNote(val).weightKg, z.number().nonnegative().nullable())
    .optional(),
  loadNote: z
    .preprocess((val) => parseWeightWithNote(val).loadNote ?? null, z.string().nullable())
    .optional(),
  notes: z
    .preprocess((val) => (val === '' || val === null || val === undefined ? null : String(val).trim()), z.string().nullable())
    .optional(),
  repsCompleted: z
    .preprocess((val) => parseReps(val).repsCompleted, z.number().int().nonnegative().nullable())
    .optional(),
  repsTarget: z
    .preprocess((val) => parseReps(val).repsTarget, z.string())
    .optional(),
  restSeconds: z
    .preprocess((val) => parseRestSeconds(val), z.number().int().nonnegative())
    .optional(),
  rpe: z
    .preprocess((val) => parseRPE(val), z.number().min(1).max(10).nullable())
    .optional(),
});

export type CsvWorkoutRow = z.infer<typeof CsvWorkoutRowSchema>;

