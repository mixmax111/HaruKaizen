import {
  IsOptional,
  IsNumber,
  IsPositive,
  IsString,
  IsIn,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Sex } from '@harukaizen/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(300)
  heightCm?: number;

  @IsOptional()
  @IsDateString()
  birthDate?: string; // ISO 8601: "1995-04-15"

  @IsOptional()
  @IsString()
  @IsIn([Sex.MALE, Sex.FEMALE])
  sex?: 'M' | 'F';

  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(2.5)
  lifestyleMultiplier?: number;
}

