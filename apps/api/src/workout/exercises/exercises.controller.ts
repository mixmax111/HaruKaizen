import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ExercisesService } from './exercises.service.js';
import { CreateExerciseDto } from './dto/create-exercise.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercisesService.create(user.sub, dto);
  }

  @Get()
  findAll(@Query('category') category?: string) {
    return this.exercisesService.findAll(category);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.exercisesService.findOne(id);
  }
}
