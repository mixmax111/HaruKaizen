import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateFoodItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  @Min(0)
  calories100g!: number;

  @IsNumber()
  @Min(0)
  protein100g!: number;

  @IsNumber()
  @Min(0)
  carbs100g!: number;

  @IsNumber()
  @Min(0)
  fat100g!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  servingSizeG?: number;

  @IsOptional()
  @IsString()
  clientSideId?: string;

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateFoodItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calories100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  protein100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fat100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium100g?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  servingSizeG?: number;

  @IsOptional()
  @IsString()
  clientSideId?: string;

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;
}

export class SyncProviderReferenceDto {
  @IsString()
  @IsNotEmpty()
  source!: string; // es. "OPEN_FOOD_FACTS"

  @IsString()
  @IsNotEmpty()
  externalId!: string; // es. barcode
}
