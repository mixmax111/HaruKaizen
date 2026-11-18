import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AddLogSetDto, FinishWorkoutLogDto } from './logs/dto/workout-log.dto.js';
import { CreateWorkoutDayExerciseDto } from './plans/dto/create-workout-plan.dto.js';

describe('Workout DTOs Validation Limits (Step 1 Security)', () => {
  describe('AddLogSetDto', () => {
    it('accepts valid set data within limits', async () => {
      const dto = plainToInstance(AddLogSetDto, {
        orderIndex: 1,
        setOrder: 1,
        setType: 'WORKING',
        repsCompleted: 10,
        weightKg: 100,
        rpe: 8,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('accepts all 4 canonical setType values (WARMUP, WORKING, DROPSET, FAILURE)', async () => {
      const validTypes = ['WARMUP', 'WORKING', 'DROPSET', 'FAILURE'];
      for (const setType of validTypes) {
        const dto = plainToInstance(AddLogSetDto, {
          orderIndex: 1,
          setType,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('rejects legacy DROP and invalid setType', async () => {
      for (const setType of ['DROP', 'SUPERSET_INVALID']) {
        const dto = plainToInstance(AddLogSetDto, {
          orderIndex: 1,
          setType,
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('setType');
      }
    });

    it('rejects repsCompleted > 500 or < 0', async () => {
      const dtoTooHigh = plainToInstance(AddLogSetDto, {
        orderIndex: 1,
        setType: 'WORKING',
        repsCompleted: 501,
      });
      const errorsHigh = await validate(dtoTooHigh);
      expect(errorsHigh.some((e) => e.property === 'repsCompleted')).toBe(true);

      const dtoNegative = plainToInstance(AddLogSetDto, {
        orderIndex: 1,
        setType: 'WORKING',
        repsCompleted: -1,
      });
      const errorsNegative = await validate(dtoNegative);
      expect(errorsNegative.some((e) => e.property === 'repsCompleted')).toBe(true);
    });

    it('rejects weightKg > 1000 or < 0', async () => {
      const dtoTooHeavy = plainToInstance(AddLogSetDto, {
        orderIndex: 1,
        setType: 'WORKING',
        weightKg: 1001,
      });
      const errorsHeavy = await validate(dtoTooHeavy);
      expect(errorsHeavy.some((e) => e.property === 'weightKg')).toBe(true);

      const dtoNegative = plainToInstance(AddLogSetDto, {
        orderIndex: 1,
        setType: 'WORKING',
        weightKg: -5,
      });
      const errorsNegative = await validate(dtoNegative);
      expect(errorsNegative.some((e) => e.property === 'weightKg')).toBe(true);
    });

    it('rejects rpe > 10 or < 1', async () => {
      const dtoHighRpe = plainToInstance(AddLogSetDto, {
        orderIndex: 1,
        setType: 'WORKING',
        rpe: 11,
      });
      const errorsHigh = await validate(dtoHighRpe);
      expect(errorsHigh.some((e) => e.property === 'rpe')).toBe(true);

      const dtoZeroRpe = plainToInstance(AddLogSetDto, {
        orderIndex: 1,
        setType: 'WORKING',
        rpe: 0,
      });
      const errorsZero = await validate(dtoZeroRpe);
      expect(errorsZero.some((e) => e.property === 'rpe')).toBe(true);
    });

    it('rejects orderIndex/setOrder > 100 or < 1', async () => {
      const dtoHighOrder = plainToInstance(AddLogSetDto, {
        orderIndex: 101,
        setOrder: 101,
        setType: 'WORKING',
      });
      const errorsHigh = await validate(dtoHighOrder);
      expect(errorsHigh.some((e) => e.property === 'orderIndex')).toBe(true);
      expect(errorsHigh.some((e) => e.property === 'setOrder')).toBe(true);
    });
  });

  describe('FinishWorkoutLogDto', () => {
    it('accepts manualCaloriesBurned within [0, 10000]', async () => {
      const validDto = plainToInstance(FinishWorkoutLogDto, {
        manualCaloriesBurned: 500,
      });
      const errors = await validate(validDto);
      expect(errors).toHaveLength(0);
    });

    it('rejects manualCaloriesBurned > 10000 or < 0', async () => {
      const dtoTooHigh = plainToInstance(FinishWorkoutLogDto, {
        manualCaloriesBurned: 10001,
      });
      const errorsHigh = await validate(dtoTooHigh);
      expect(errorsHigh.some((e) => e.property === 'manualCaloriesBurned')).toBe(true);

      const dtoNegative = plainToInstance(FinishWorkoutLogDto, {
        manualCaloriesBurned: -10,
      });
      const errorsNegative = await validate(dtoNegative);
      expect(errorsNegative.some((e) => e.property === 'manualCaloriesBurned')).toBe(true);
    });
  });

  describe('CreateWorkoutDayExerciseDto', () => {
    it('accepts sets [1, 50] and restSeconds [0, 600]', async () => {
      const validDto = plainToInstance(CreateWorkoutDayExerciseDto, {
        exerciseId: 'ex-1',
        orderIndex: 1,
        sets: 4,
        repsTarget: '8-12',
        restSeconds: 90,
      });
      const errors = await validate(validDto);
      expect(errors).toHaveLength(0);
    });

    it('rejects sets > 50 or < 1', async () => {
      const dtoHighSets = plainToInstance(CreateWorkoutDayExerciseDto, {
        exerciseId: 'ex-1',
        orderIndex: 1,
        sets: 51,
        repsTarget: '8-12',
        restSeconds: 90,
      });
      const errorsHigh = await validate(dtoHighSets);
      expect(errorsHigh.some((e) => e.property === 'sets')).toBe(true);

      const dtoZeroSets = plainToInstance(CreateWorkoutDayExerciseDto, {
        exerciseId: 'ex-1',
        orderIndex: 1,
        sets: 0,
        repsTarget: '8-12',
        restSeconds: 90,
      });
      const errorsZero = await validate(dtoZeroSets);
      expect(errorsZero.some((e) => e.property === 'sets')).toBe(true);
    });

    it('rejects restSeconds > 600 or < 0', async () => {
      const dtoHighRest = plainToInstance(CreateWorkoutDayExerciseDto, {
        exerciseId: 'ex-1',
        orderIndex: 1,
        sets: 3,
        repsTarget: '10',
        restSeconds: 601,
      });
      const errorsHigh = await validate(dtoHighRest);
      expect(errorsHigh.some((e) => e.property === 'restSeconds')).toBe(true);

      const dtoNegativeRest = plainToInstance(CreateWorkoutDayExerciseDto, {
        exerciseId: 'ex-1',
        orderIndex: 1,
        sets: 3,
        repsTarget: '10',
        restSeconds: -1,
      });
      const errorsNegative = await validate(dtoNegativeRest);
      expect(errorsNegative.some((e) => e.property === 'restSeconds')).toBe(true);
    });
  });
});
