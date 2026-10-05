import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MealType } from '@harukaizen/shared';

export class CreateDietDayItemDto {
  @IsString()
  @IsNotEmpty()
  foodItemId: string;

  @IsOptional()
  @IsString()
  scheduledTime?: string; // es. "08:00"

  @IsString()
  @IsIn([MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK])
  mealType: string;

  @IsNumber()
  @Min(0.1)
  quantityG: number;
}

export class CreateDietDayDto {
  @IsString()
  @IsNotEmpty()
  name: string; // es. "Giorno On (Allenamento)" o "Lunedì"

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDietDayItemDto)
  dietDayItems: CreateDietDayItemDto[];
}

export class CreateDietPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDietDayDto)
  dietDays: CreateDietDayDto[];
}
