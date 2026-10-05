import { IsOptional, IsString, IsNumber, IsBoolean, IsPositive } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  llmApiKey?: string;

  @IsOptional()
  @IsString()
  preferredLlmProvider?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetWeightKg?: number;

  @IsOptional()
  @IsBoolean()
  isDarkMode?: boolean;

  @IsOptional()
  @IsString()
  fcmPushToken?: string;
}
