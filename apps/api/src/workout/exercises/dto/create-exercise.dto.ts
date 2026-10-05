import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, Min } from 'class-validator';
import { ExerciseCategory } from '@harukaizen/shared';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn([
    ExerciseCategory.CHEST,
    ExerciseCategory.BACK,
    ExerciseCategory.LEGS,
    ExerciseCategory.SHOULDERS,
    ExerciseCategory.ARMS,
    ExerciseCategory.CORE,
    ExerciseCategory.CARDIO,
  ])
  category: string;

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsNumber()
  @Min(1.0)
  defaultMetValue: number;
}
