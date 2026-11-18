import { describe, it, expect } from 'vitest';
import { ExercisesController } from './exercises.controller.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';

describe('ExercisesController — Security Guard Spec', () => {
  it('should have JwtAuthGuard applied explicitly to controller or findAll', () => {
    const classGuards = Reflect.getMetadata('__guards__', ExercisesController) || [];
    const methodGuards = Reflect.getMetadata('__guards__', ExercisesController.prototype.findAll) || [];
    const allGuards = [...classGuards, ...methodGuards];

    expect(allGuards).toContain(JwtAuthGuard);
  });

  it('rejects unauthenticated request on /exercises with 401 Unauthorized', () => {
    const reflector = new Reflector();
    const guard = new JwtAuthGuard(reflector);

    expect(() => guard.handleRequest(null, false, { message: 'No auth token' })).toThrow(
      UnauthorizedException,
    );
  });
});
