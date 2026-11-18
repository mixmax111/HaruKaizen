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
import { RecipesService } from './recipes.service.js';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  LogRecipeDto,
} from './dto/recipe.dto.js';

@Controller('nutrition/recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  async list(@Request() req: any) {
    return this.recipesService.list(req.user.id);
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreateRecipeDto) {
    return this.recipesService.create(req.user.id, dto);
  }

  @Post('log')
  async logRecipe(@Request() req: any, @Body() dto: LogRecipeDto) {
    return this.recipesService.logRecipe(req.user.id, dto);
  }

  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    return this.recipesService.findById(req.user.id, id);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto
  ) {
    return this.recipesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.recipesService.delete(req.user.id, id);
  }
}

