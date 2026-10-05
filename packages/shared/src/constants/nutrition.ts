import { differenceInYears } from './date.utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// TDEE — Formula Mifflin-St Jeor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcola il BMR (Basal Metabolic Rate) con la formula Mifflin-St Jeor.
 * @param weightKg  Peso in kg
 * @param heightCm  Altezza in cm
 * @param birthDate Data di nascita (per calcolo età)
 * @param sex       Sesso biologico: "M" o "F"
 */
export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  birthDate: Date;
  sex: 'M' | 'F';
}): number {
  const age = differenceInYears(new Date(), params.birthDate);
  const base =
    10 * params.weightKg +
    6.25 * params.heightCm -
    5 * age;
  return params.sex === 'M' ? base + 5 : base - 161;
}

/**
 * Calcola il TDEE (Total Daily Energy Expenditure).
 * @param bmr               BMR calcolato con Mifflin-St Jeor
 * @param lifestyleMultiplier Moltiplicatore attività fisica (1.2 – 1.9)
 */
export function calculateTDEE(bmr: number, lifestyleMultiplier: number): number {
  return bmr * lifestyleMultiplier;
}

// Moltiplicatori attività (corrispondenti a lifestyleMultiplier nel DB)
export const ACTIVITY_MULTIPLIERS = {
  SEDENTARY:   1.2,   // Poco o nessun esercizio
  LIGHT:       1.375, // Esercizio leggero 1-3 gg/sett
  MODERATE:    1.55,  // Esercizio moderato 3-5 gg/sett
  ACTIVE:      1.725, // Esercizio intenso 6-7 gg/sett
  VERY_ACTIVE: 1.9,   // Esercizio molto intenso + lavoro fisico
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME ALLENAMENTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcola il volume di una serie (peso × reps).
 * Usato per il calcolo del progressive overload lato AI.
 */
export function calculateSetVolume(weightKg: number, reps: number): number {
  return weightKg * reps;
}

/**
 * Stima delle calorie bruciate durante un esercizio.
 * Formula: MET × weightKg × durationHours
 */
export function estimateCaloriesBurned(params: {
  metValue: number;
  weightKg: number;
  durationMinutes: number;
}): number {
  return params.metValue * params.weightKg * (params.durationMinutes / 60);
}
