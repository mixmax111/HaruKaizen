import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class GenerateWorkoutPlanDto {
  @IsOptional()
  @IsString()
  userGoal?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  daysPerWeek?: number;

  @IsOptional()
  @IsString()
  equipmentAvailable?: string;
}

export class GenerateDietPlanDto {
  @IsOptional()
  @IsString()
  userGoal?: string;

  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(8000)
  targetKcal?: number;

  @IsOptional()
  @IsString()
  dietaryRestrictions?: string;
}

