import { Controller, Get, Post, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { NutritionLogsService } from './nutrition-logs.service.js';
import { CreateNutritionLogDto } from './dto/create-nutrition-log.dto.js';
import { FoodService } from '../food/food.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';

@Controller('nutrition')
export class NutritionLogsController {
  constructor(
    private readonly logsService: NutritionLogsService,
    private readonly foodService: FoodService,
  ) {}

  @Get('barcode/:barcode')
  getByBarcode(@Param('barcode') barcode: string) {
    return this.foodService.findByBarcode(barcode);
  }

  @Post('logs')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNutritionLogDto,
  ) {
    return this.logsService.create(user.sub, dto);
  }

  @Get('logs')
  findByDate(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
  ) {
    const queryDate = date || new Date().toISOString().split('T')[0];
    return this.logsService.findByDate(user.sub, queryDate);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
  ) {
    const queryDate = date || new Date().toISOString().split('T')[0];
    return this.logsService.getSummary(user.sub, queryDate);
  }

  @Delete('logs/:id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.logsService.remove(user.sub, id);
  }
}
