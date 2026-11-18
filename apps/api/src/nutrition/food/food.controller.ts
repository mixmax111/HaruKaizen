import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { FoodService } from './food.service.js';
import {
  CreateFoodItemDto,
  UpdateFoodItemDto,
  SyncProviderReferenceDto,
} from './dto/create-food-item.dto.js';

@Controller(['food', 'nutrition/food'])
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get('barcode/:barcode')
  getByBarcode(@Param('barcode') barcode: string, @Request() req?: any) {
    return this.foodService.findByBarcode(barcode, req?.user?.id);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.foodService.search(query || '');
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req: any, @Body() dto: CreateFoodItemDto) {
    return this.foodService.create(req.user.id, dto);
  }

  @Put(':id/cow')
  @UseGuards(JwtAuthGuard)
  copyOnWrite(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFoodItemDto
  ) {
    return this.foodService.copyOnWrite(req.user.id, id, dto);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  restoreOriginal(@Request() req: any, @Param('id') id: string) {
    return this.foodService.restoreOriginal(req.user.id, id);
  }

  @Post('sync-reference')
  @UseGuards(JwtAuthGuard)
  syncReference(@Request() req: any, @Body() dto: SyncProviderReferenceDto) {
    return this.foodService.syncProviderReference(req.user.id, dto);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Request() req?: any) {
    return this.foodService.findById(id, req?.user?.id);
  }
}
