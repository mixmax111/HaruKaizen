import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkoutDayExerciseDto {
  @IsString()
  @IsNotEmpty()
  exerciseId: string;

  @IsInt()
  @Min(0)
  orderIndex: number;

  @IsInt()
  @Min(1)
  sets: number;

  @IsString()
  @IsNotEmpty()
  repsTarget: string; // es. "8-12"

  @IsOptional()
  @IsString()
  weightTarget?: string; // es. "80kg" o "RPE 8"

  @IsInt()
  @Min(0)
  restSeconds: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateWorkoutDayDto {
  @IsString()
  @IsNotEmpty()
  name: string; // es. "Giorno A - Spinta"

  @IsInt()
  @Min(0)
  orderIndex: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutDayExerciseDto)
  exercises: CreateWorkoutDayExerciseDto[];
}

export class CreateWorkoutPlanDto {
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
  @Type(() => CreateWorkoutDayDto)
  workoutDays: CreateWorkoutDayDto[];
}
