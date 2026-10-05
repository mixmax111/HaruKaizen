import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises/exercises.controller.js';
import { ExercisesService } from './exercises/exercises.service.js';
import { WorkoutPlansController } from './plans/workout-plans.controller.js';
import { WorkoutPlansService } from './plans/workout-plans.service.js';
import { WorkoutLogsController } from './logs/workout-logs.controller.js';
import { WorkoutLogsService } from './logs/workout-logs.service.js';

@Module({
  controllers: [
    ExercisesController,
    WorkoutPlansController,
    WorkoutLogsController,
  ],
  providers: [
    ExercisesService,
    WorkoutPlansService,
    WorkoutLogsService,
  ],
  exports: [
    ExercisesService,
    WorkoutPlansService,
    WorkoutLogsService,
  ],
})
export class WorkoutModule {}
