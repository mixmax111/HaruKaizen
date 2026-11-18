import { describe, it, expect } from 'vitest';
import { ExercisesController } from './exercises.controller.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

describe('ExercisesController — Security Guard Spec', () => {
  it('should have JwtAuthGuard applied explicitly to controller or findAll', () => {
    const classGuards = Reflect.getMetadata('__guards__', ExercisesController) || [];
    const methodGuards = Reflect.getMetadata('__guards__', ExercisesController.prototype.findAll) || [];
    const allGuards = [...classGuards, ...methodGuards];

    expect(allGuards).toContain(JwtAuthGuard);
  });
});
