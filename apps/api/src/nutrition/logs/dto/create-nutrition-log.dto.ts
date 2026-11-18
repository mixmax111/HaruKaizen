import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsIn,
} from 'class-validator';

export class CreateNutritionLogDto {
  @IsOptional()
  @IsString()
  foodItemId?: string;

  @IsOptional()
  @IsString()
  mealSlotId?: string;

  @IsOptional()
  @IsString()
  recipeId?: string;

  @IsOptional()
  @IsString()
  recipeNameSnapshot?: string;

  @IsOptional()
  @IsString()
  @IsIn(['FOOD_ITEM', 'RECIPE', 'QUICK_ADD'])
  entryType?: string;

  @IsOptional()
  @IsString()
  customFoodName?: string;

  @IsDateString()
  loggedAt!: string; // ISO 8601

  @IsOptional()
  @IsString()
  mealType?: string; // Fallback legacy: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  caloriesConsumed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinConsumed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbsConsumed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fatConsumed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiberConsumed?: number | null;

  @IsOptional()
  @IsString()
  clientSideId?: string;

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;
}
