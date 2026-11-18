import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { WorkoutLogsService } from './workout-logs.service.js';
import {
  StartWorkoutLogDto,
  AddLogExerciseDto,
  AddLogSetDto,
  UpdateLogExerciseNotesDto,
  FinishWorkoutLogDto,
} from './dto/workout-log.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';

@Controller(['workout/logs', 'workouts/logs'])
export class WorkoutLogsController {
  constructor(private readonly logsService: WorkoutLogsService) {}

  @Post('start')
  startSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: StartWorkoutLogDto,
  ) {
    return this.logsService.startSession(user.sub, dto);
  }

  @Post(':id/exercises')
  addExercise(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) logId: string,
    @Body() dto: AddLogExerciseDto,
  ) {
    return this.logsService.addExercise(user.sub, logId, dto);
  }

  @Post('exercises/:exerciseId/sets')
  addSet(
    @CurrentUser() user: JwtPayload,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: AddLogSetDto,
  ) {
    return this.logsService.addSet(user.sub, exerciseId, dto);
  }

  @Patch('exercises/:exerciseId/skip')
  skipExercise(
    @CurrentUser() user: JwtPayload,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    return this.logsService.skipExercise(user.sub, exerciseId);
  }

  @Patch('exercises/:exerciseId/notes')
  updateNotes(
    @CurrentUser() user: JwtPayload,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: UpdateLogExerciseNotesDto,
  ) {
    return this.logsService.updateExerciseNotes(user.sub, exerciseId, dto.notes);
  }

  @Post(':id/finish')
  finishSession(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) logId: string,
    @Body() dto?: FinishWorkoutLogDto,
  ) {
    return this.logsService.finishSession(user.sub, logId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.logsService.findAll(user.sub);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.logsService.findOne(user.sub, id);
  }
}
