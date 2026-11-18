import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeIngredientDto {
  @IsString()
  @IsNotEmpty()
  foodItemId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string; // "g" | "ml" | "serving" | "piece"
}

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  defaultServings?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  finishedWeightG?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  clientSideId?: string;

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  defaultServings?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  finishedWeightG?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients?: RecipeIngredientDto[];
}

export class LogRecipeDto {
  @IsString()
  @IsNotEmpty()
  recipeId!: string;

  @IsOptional()
  @IsString()
  mealSlotId?: string;

  @IsOptional()
  @IsDateString()
  loggedAt?: string;

  @IsEnum(['SERVING', 'FRACTION', 'GRAMS'])
  portionType!: 'SERVING' | 'FRACTION' | 'GRAMS';

  @IsNumber()
  @IsPositive()
  portionValue!: number;

  @IsEnum(['SINGLE_ITEM', 'EXPLODED'])
  mode!: 'SINGLE_ITEM' | 'EXPLODED';

  @IsOptional()
  @IsString()
  clientSideId?: string;
}

