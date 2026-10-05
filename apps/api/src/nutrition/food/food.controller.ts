import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FoodService } from './food.service.js';
import { CreateFoodItemDto } from './dto/create-food-item.dto.js';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get('barcode/:barcode')
  getByBarcode(@Param('barcode') barcode: string) {
    return this.foodService.findByBarcode(barcode);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.foodService.search(query || '');
  }

  @Post()
  create(@Body() dto: CreateFoodItemDto) {
    return this.foodService.create(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.foodService.findById(id);
  }
}
