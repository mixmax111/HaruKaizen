import { calculateAge } from '../nutrition/age.js';

export type CalorieEstimateEligibility =
  | 'OK'
  | 'MINOR'
  | 'AGE_UNKNOWN'
  | 'WEIGHT_UNKNOWN';

export interface CalorieEstimateEligibilityInput {
  birthDate?: Date | string | null;
  weightKg?: number | null;
  referenceDate?: Date;
}

/**
 * Valuta l'idoneità dell'utente al calcolo stima calorie allenamento.
 * Regole approvate (Rev. 4/5):
 * 1. Età sconosciuta (birthDate nullo/invalido) => AGE_UNKNOWN
 * 2. Minorenne (< 18 anni solari) => MINOR
 * 3. Peso sconosciuto (weightKg <= 0 o nullo) => WEIGHT_UNKNOWN
 * 4. Altrimenti => OK
 */
export function getCalorieEstimateEligibility(
  input: CalorieEstimateEligibilityInput,
): CalorieEstimateEligibility {
  const { birthDate, weightKg, referenceDate = new Date() } = input;

  if (!birthDate) {
    return 'AGE_UNKNOWN';
  }

  let age: number;
  try {
    age = calculateAge(birthDate, referenceDate);
  } catch {
    return 'AGE_UNKNOWN';
  }

  if (age < 18) {
    return 'MINOR';
  }

  if (weightKg === null || weightKg === undefined || weightKg <= 0 || isNaN(weightKg)) {
    return 'WEIGHT_UNKNOWN';
  }

  return 'OK';
}

/**
 * Verifica booleana rapida se l'eligibility consente la stima calorica automatica.
 */
export function isEligibleForCalorieEstimate(
  eligibility: CalorieEstimateEligibility,
): boolean {
  return eligibility === 'OK';
}
