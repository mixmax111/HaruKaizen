import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { MealSlotsService } from './meal-slots.service.js';
import {
  CreateMealSlotDto,
  UpdateMealSlotDto,
  ReorderMealSlotsDto,
  DeleteMealSlotDto,
} from './dto/meal-slot.dto.js';

@Controller('nutrition/meal-slots')
@UseGuards(JwtAuthGuard)
export class MealSlotsController {
  constructor(private readonly mealSlotsService: MealSlotsService) {}

  @Get()
  async list(@Request() req: any) {
    return this.mealSlotsService.list(req.user.id);
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreateMealSlotDto) {
    return this.mealSlotsService.create(req.user.id, dto);
  }

  @Put('reorder')
  async reorder(@Request() req: any, @Body() dto: ReorderMealSlotsDto) {
    return this.mealSlotsService.reorder(req.user.id, dto);
  }

  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    return this.mealSlotsService.findById(req.user.id, id);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMealSlotDto
  ) {
    return this.mealSlotsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  async delete(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto?: DeleteMealSlotDto
  ) {
    return this.mealSlotsService.delete(req.user.id, id, dto);
  }
}

