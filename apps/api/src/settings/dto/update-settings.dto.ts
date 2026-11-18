import { IsOptional, IsString, IsNumber, IsBoolean, IsPositive, IsIn, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  llmApiKey?: string;

  @IsOptional()
  @IsString()
  preferredLlmProvider?: string;

  @IsOptional()
  @IsString()
  preferredLlmModel?: string;

  @IsOptional()
  @IsString()
  customLlmBaseUrl?: string;

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

  // Conta Calorie PURO - Nuovi parametri nutrizionali e target
  @IsOptional()
  @IsIn(['AUTO', 'MANUAL'])
  targetMode?: 'AUTO' | 'MANUAL';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetCalories?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetProteinG?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetCarbsG?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetFatG?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetFiberG?: number;

  @IsOptional()
  @IsIn(['CUT', 'MAINTENANCE', 'BULK'])
  goalType?: 'CUT' | 'MAINTENANCE' | 'BULK';

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(25)
  deficitPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(10)
  surplusPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(1.6)
  @Max(2.2)
  proteinPerKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(35)
  fatPct?: number;

  @IsOptional()
  @IsIn(['SIMPLE', 'ACTIVE'])
  calorieBalanceMode?: 'SIMPLE' | 'ACTIVE';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  burnedCalorieRecoveryPct?: number;

  @IsOptional()
  @IsBoolean()
  isPregnant?: boolean;

  @IsOptional()
  @IsBoolean()
  isLactating?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  aiDailyRequestLimit?: number;
}
