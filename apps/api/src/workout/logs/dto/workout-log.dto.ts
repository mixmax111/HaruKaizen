import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsIn,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { SetType } from '@prisma/client';

export class StartWorkoutLogDto {
  @IsString()
  @IsNotEmpty()
  dayNameSnapshot: string; // es. "Giorno A - Petto e Tricipiti"

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class AddLogExerciseDto {
  @IsString()
  @IsNotEmpty()
  exerciseNameSnapshot: string;

  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isExtraExercise?: boolean;
}

export class UpdateLogExerciseNotesDto {
  @IsString()
  notes: string;
}

export class AddLogSetDto {
  @IsInt()
  @Min(1)
  @Max(100)
  orderIndex: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  setOrder?: number;

  @IsString()
  @IsIn(['WARMUP', 'WORKING', 'DROPSET', 'FAILURE'])
  setType: SetType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  repsCompleted?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rpe?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  clientSideId?: string;
}

export class FinishWorkoutLogDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  manualCaloriesBurned?: number;
}
