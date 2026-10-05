import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { WorkoutPlansService } from './workout-plans.service.js';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';

@Controller(['workout/plans', 'workout-plans'])
export class WorkoutPlansController {
  constructor(private readonly plansService: WorkoutPlansService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWorkoutPlanDto,
  ) {
    return this.plansService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.plansService.findAll(user.sub);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plansService.findOne(user.sub, id);
  }

  @Post(':id/activate')
  activate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plansService.activate(user.sub, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plansService.remove(user.sub, id);
  }
}
