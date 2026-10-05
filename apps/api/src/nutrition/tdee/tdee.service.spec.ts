import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateSetVolume,
  estimateCaloriesBurned,
  ACTIVITY_MULTIPLIERS,
} from '@harukaizen/shared';

describe('TDEE & Metabolic Engine Spec', () => {
  it('dovrebbe calcolare correttamente il BMR per un uomo (Mifflin-St Jeor)', () => {
    // Uomo: 80kg, 180cm, nato 30 anni fa
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 30);

    const bmr = calculateBMR({
      weightKg: 80,
      heightCm: 180,
      birthDate,
      sex: 'M',
    });

    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(bmr).toBe(1780);
  });

  it('dovrebbe calcolare correttamente il BMR per una donna (Mifflin-St Jeor)', () => {
    // Donna: 60kg, 165cm, nata 25 anni fa
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25);

    const bmr = calculateBMR({
      weightKg: 60,
      heightCm: 165,
      birthDate,
      sex: 'F',
    });

    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(bmr).toBe(1345.25);
  });

  it('dovrebbe applicare correttamente il moltiplicatore TDEE per attività moderata', () => {
    const bmr = 1780;
    const tdee = calculateTDEE(bmr, ACTIVITY_MULTIPLIERS.MODERATE); // 1.55
    expect(tdee).toBe(1780 * 1.55);
  });

  it('dovrebbe calcolare correttamente il volume e le calorie stimate con valori MET', () => {
    const setVolume = calculateSetVolume(100, 8);
    expect(setVolume).toBe(800);

    // Esercizio con MET 6, peso 80kg, durata 45 minuti (0.75h)
    // 6 * 80 * 0.75 = 360 kcal
    const caloriesBurned = estimateCaloriesBurned({
      metValue: 6,
      weightKg: 80,
      durationMinutes: 45,
    });
    expect(caloriesBurned).toBe(360);
  });
});
