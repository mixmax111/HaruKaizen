import { describe, it, expect } from 'vitest';
import {
  getCalorieEstimateEligibility,
  isEligibleForCalorieEstimate,
  CalorieEstimateEligibility,
} from './eligibility.js';

describe('Calorie Estimate Eligibility Engine (packages/shared)', () => {
  const refDate = new Date('2026-11-18T12:00:00Z');

  describe('getCalorieEstimateEligibility', () => {
    it('returns OK for adult with known weight', () => {
      const result = getCalorieEstimateEligibility({
        birthDate: '1995-05-15',
        weightKg: 75.5,
        referenceDate: refDate,
      });
      expect(result).toBe('OK');
      expect(isEligibleForCalorieEstimate(result)).toBe(true);
    });

    it('returns OK for user turning 18 today', () => {
      const result = getCalorieEstimateEligibility({
        birthDate: '2008-11-18',
        weightKg: 70,
        referenceDate: refDate,
      });
      expect(result).toBe('OK');
    });

    it('returns MINOR for user under 18 years old', () => {
      const result = getCalorieEstimateEligibility({
        birthDate: '2008-11-19', // Turns 18 tomorrow
        weightKg: 68,
        referenceDate: refDate,
      });
      expect(result).toBe('MINOR');
      expect(isEligibleForCalorieEstimate(result)).toBe(false);
    });

    it('returns MINOR for 15 year old adolescent', () => {
      const result = getCalorieEstimateEligibility({
        birthDate: '2011-01-01',
        weightKg: 55,
        referenceDate: refDate,
      });
      expect(result).toBe('MINOR');
    });

    it('returns AGE_UNKNOWN if birthDate is null', () => {
      const result = getCalorieEstimateEligibility({
        birthDate: null,
        weightKg: 75,
        referenceDate: refDate,
      });
      expect(result).toBe('AGE_UNKNOWN');
      expect(isEligibleForCalorieEstimate(result)).toBe(false);
    });

    it('returns AGE_UNKNOWN if birthDate is undefined or empty', () => {
      expect(
        getCalorieEstimateEligibility({
          birthDate: undefined,
          weightKg: 80,
          referenceDate: refDate,
        }),
      ).toBe('AGE_UNKNOWN');

      expect(
        getCalorieEstimateEligibility({
          birthDate: '',
          weightKg: 80,
          referenceDate: refDate,
        }),
      ).toBe('AGE_UNKNOWN');
    });

    it('returns AGE_UNKNOWN if birthDate is invalid date string', () => {
      expect(
        getCalorieEstimateEligibility({
          birthDate: 'not-a-date',
          weightKg: 80,
          referenceDate: refDate,
        }),
      ).toBe('AGE_UNKNOWN');
    });

    it('returns WEIGHT_UNKNOWN if weightKg is null or undefined for adult', () => {
      expect(
        getCalorieEstimateEligibility({
          birthDate: '1990-01-01',
          weightKg: null,
          referenceDate: refDate,
        }),
      ).toBe('WEIGHT_UNKNOWN');

      expect(
        getCalorieEstimateEligibility({
          birthDate: '1990-01-01',
          weightKg: undefined,
          referenceDate: refDate,
        }),
      ).toBe('WEIGHT_UNKNOWN');
    });

    it('returns WEIGHT_UNKNOWN if weightKg is zero or negative for adult', () => {
      expect(
        getCalorieEstimateEligibility({
          birthDate: '1990-01-01',
          weightKg: 0,
          referenceDate: refDate,
        }),
      ).toBe('WEIGHT_UNKNOWN');

      expect(
        getCalorieEstimateEligibility({
          birthDate: '1990-01-01',
          weightKg: -5,
          referenceDate: refDate,
        }),
      ).toBe('WEIGHT_UNKNOWN');
    });

    it('prioritizes AGE_UNKNOWN over WEIGHT_UNKNOWN if both missing', () => {
      const result = getCalorieEstimateEligibility({
        birthDate: null,
        weightKg: null,
        referenceDate: refDate,
      });
      expect(result).toBe('AGE_UNKNOWN');
    });
  });
});
