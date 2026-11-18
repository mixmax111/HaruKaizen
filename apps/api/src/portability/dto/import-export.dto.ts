import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';

export enum PortabilityTarget {
  MEASUREMENTS = 'MEASUREMENTS',
  NUTRITION_LOGS = 'NUTRITION_LOGS',
  WORKOUT_LOGS = 'WORKOUT_LOGS',
}

export enum ExportTarget {
  MEASUREMENTS = 'MEASUREMENTS',
  NUTRITION_LOGS = 'NUTRITION_LOGS',
  WORKOUT_LOGS = 'WORKOUT_LOGS',
  ALL_JSON = 'ALL_JSON',
}

export enum DuplicateStrategy {
  SKIP = 'SKIP',
  OVERWRITE = 'OVERWRITE',
}

export class ImportCsvDto {
  @IsEnum(PortabilityTarget)
  target: PortabilityTarget;

  @IsOptional()
  @IsString()
  csvContent?: string;

  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, string>;

  @IsOptional()
  @IsEnum(DuplicateStrategy)
  duplicateStrategy?: DuplicateStrategy;
}

export class ExportQueryDto {
  @IsEnum(ExportTarget)
  target: ExportTarget;
}

