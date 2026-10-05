import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateMeasurementDto {
  @IsNumber()
  @IsPositive()
  @Max(500)
  weightKg: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(70)
  bodyFatPercentage?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  chestCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  armsCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  waistCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  legsCm?: number;

  @IsDateString()
  recordedAt: string;
}

