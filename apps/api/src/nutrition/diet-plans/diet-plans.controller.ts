import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { DietPlansService } from './diet-plans.service.js';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';

@Controller(['diet-plans', 'nutrition/plans'])
export class DietPlansController {
  constructor(private readonly dietPlansService: DietPlansService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDietPlanDto,
  ) {
    return this.dietPlansService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.dietPlansService.findAll(user.sub);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dietPlansService.findOne(user.sub, id);
  }

  @Post(':id/activate')
  activate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dietPlansService.activate(user.sub, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dietPlansService.remove(user.sub, id);
  }
}
