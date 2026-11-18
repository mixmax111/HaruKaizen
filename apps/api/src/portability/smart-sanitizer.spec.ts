import { describe, it, expect } from 'vitest';
import {
  parseWeightKg,
  parseWeightWithNote,
  parseReps,
  parseRestSeconds,
  parseRPE,
  parseDateOrDefault,
} from './smart-sanitizer.js';

describe('Smart Number & String Sanitizer', () => {
  describe('parseWeightWithNote', () => {
    it('should handle complex human strings from HaruKaizen_Mese_0_Completo', () => {
      // "Leggero" -> 0kg with load note
      expect(parseWeightWithNote('Leggero')).toEqual({ weightKg: 0, loadNote: 'Leggero' });
      // "Corpo Libero" -> 0kg with load note
      expect(parseWeightWithNote('Corpo Libero')).toEqual({ weightKg: 0, loadNote: 'Corpo Libero' });
      // "Corpo libero / 6" -> 6kg with load note
      expect(parseWeightWithNote('Corpo libero / 6')).toEqual({ weightKg: 6, loadNote: 'Corpo libero / 6' });
      // "4 piastre" -> 4kg with load note
      expect(parseWeightWithNote('4 piastre')).toEqual({ weightKg: 4, loadNote: '4 piastre' });
      // "Barra + 5" -> 5kg with load note
      expect(parseWeightWithNote('Barra + 5')).toEqual({ weightKg: 5, loadNote: 'Barra + 5' });
      // "Sbarra + 5-10" -> 5kg with load note
      expect(parseWeightWithNote('Sbarra + 5-10')).toEqual({ weightKg: 5, loadNote: 'Sbarra + 5-10' });
      // "14-16" -> 14kg with load note
      expect(parseWeightWithNote('14-16')).toEqual({ weightKg: 14, loadNote: '14-16' });
      // Pure numeric "80", "12.5" -> no loadNote needed
      expect(parseWeightWithNote('80')).toEqual({ weightKg: 80 });
      expect(parseWeightWithNote('12,5')).toEqual({ weightKg: 12.5 });
      expect(parseWeightWithNote(80)).toEqual({ weightKg: 80 });
    });
  });

  describe('parseWeightKg', () => {
    it('should return 0 for empty, null, undefined or dashes', () => {
      expect(parseWeightKg(null)).toBe(0);
      expect(parseWeightKg(undefined)).toBe(0);
      expect(parseWeightKg('')).toBe(0);
      expect(parseWeightKg('   ')).toBe(0);
      expect(parseWeightKg('-')).toBe(0);
      expect(parseWeightKg('--')).toBe(0);
    });

    it('should return 0 for bodyweight keywords', () => {
      expect(parseWeightKg('corpo libero')).toBe(0);
      expect(parseWeightKg('Corpo Libero')).toBe(0);
      expect(parseWeightKg('bodyweight')).toBe(0);
      expect(parseWeightKg('BW')).toBe(0);
    });

    it('should convert comma decimals to standard floats', () => {
      expect(parseWeightKg('12,5')).toBe(12.5);
      expect(parseWeightKg('26,25')).toBe(26.25);
      expect(parseWeightKg('0,5')).toBe(0.5);
    });

    it('should extract first valid numeric float from ranges and text', () => {
      expect(parseWeightKg('45-50-55 kg')).toBe(45);
      expect(parseWeightKg('2 kg')).toBe(2);
      expect(parseWeightKg('14-16-18-20 kg')).toBe(14);
      expect(parseWeightKg('Sbarra + 10kg per lato')).toBe(10);
      expect(parseWeightKg('Elastico rosso (15kg)')).toBe(15);
      expect(parseWeightKg(80)).toBe(80);
      expect(parseWeightKg(22.5)).toBe(22.5);
    });

    it('should return 0 if no numbers exist in string', () => {
      expect(parseWeightKg('nessun carico')).toBe(0);
      expect(parseWeightKg('solo barra')).toBe(0);
    });
  });

  describe('parseReps', () => {
    it('should preserve repsTarget raw string while extracting repsCompleted integer', () => {
      const res1 = parseReps('8-10');
      expect(res1.repsTarget).toBe('8-10');
      expect(res1.repsCompleted).toBe(8);

      const res2 = parseReps('12-15');
      expect(res2.repsTarget).toBe('12-15');
      expect(res2.repsCompleted).toBe(12);

      const res3 = parseReps('10');
      expect(res3.repsTarget).toBe('10');
      expect(res3.repsCompleted).toBe(10);

      const res4 = parseReps('AMRAP (max reps)');
      expect(res4.repsTarget).toBe('AMRAP (max reps)');
      expect(res4.repsCompleted).toBe(10); // fallback default

      const res5 = parseReps('60s');
      expect(res5.repsTarget).toBe('60s');
      expect(res5.repsCompleted).toBe(60);
    });

    it('should handle numbers, empty and null values gracefully', () => {
      expect(parseReps(12)).toEqual({ repsTarget: '12', repsCompleted: 12 });
      expect(parseReps('')).toEqual({ repsTarget: '10', repsCompleted: 10 });
      expect(parseReps(null)).toEqual({ repsTarget: '10', repsCompleted: 10 });
      expect(parseReps(undefined)).toEqual({ repsTarget: '10', repsCompleted: 10 });
    });
  });

  describe('parseRestSeconds', () => {
    it('should extract first integer from rest descriptions', () => {
      expect(parseRestSeconds('120s - 180s')).toBe(120);
      expect(parseRestSeconds('90s')).toBe(90);
      expect(parseRestSeconds('60 secondi')).toBe(60);
      expect(parseRestSeconds('120')).toBe(120);
      expect(parseRestSeconds(90)).toBe(90);
    });

    it('should fallback to 90 seconds when empty or invalid', () => {
      expect(parseRestSeconds(null)).toBe(90);
      expect(parseRestSeconds(undefined)).toBe(90);
      expect(parseRestSeconds('')).toBe(90);
      expect(parseRestSeconds('-')).toBe(90);
      expect(parseRestSeconds('recupero a sensazione')).toBe(90);
    });
  });

  describe('parseRPE', () => {
    it('should return null for empty, dashes or undefined', () => {
      expect(parseRPE(null)).toBeNull();
      expect(parseRPE(undefined)).toBeNull();
      expect(parseRPE('')).toBeNull();
      expect(parseRPE('-')).toBeNull();
      expect(parseRPE('--')).toBeNull();
    });

    it('should parse valid numbers and numeric strings', () => {
      expect(parseRPE(8)).toBe(8);
      expect(parseRPE('8')).toBe(8);
      expect(parseRPE('8.5')).toBe(8.5);
      expect(parseRPE('8,5')).toBe(8.5);
      expect(parseRPE('@ 9')).toBe(9);
    });
  });

  describe('parseDateOrDefault', () => {
    it('should return valid ISO string when date is missing or empty', () => {
      const res1 = parseDateOrDefault(null);
      expect(new Date(res1).getTime()).not.toBeNaN();

      const res2 = parseDateOrDefault(undefined);
      expect(new Date(res2).getTime()).not.toBeNaN();

      const res3 = parseDateOrDefault('');
      expect(new Date(res3).getTime()).not.toBeNaN();
    });

    it('should parse ISO date strings properly', () => {
      const res = parseDateOrDefault('2026-10-21');
      expect(res).toContain('2026-10-21');
    });

    it('should parse Italian DD/MM/YYYY date strings', () => {
      const res = parseDateOrDefault('21/10/2026');
      expect(res).toContain('2026-10-21');
    });
  });
});

