import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateFoodItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  @Min(0)
  calories100g: number;

  @IsNumber()
  @Min(0)
  protein100g: number;

  @IsNumber()
  @Min(0)
  carbs100g: number;

  @IsNumber()
  @Min(0)
  fat100g: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium100g?: number;
}
