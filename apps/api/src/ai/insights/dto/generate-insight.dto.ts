import { IsOptional, IsBoolean } from 'class-validator';

export class GenerateInsightDto {
  @IsOptional()
  @IsBoolean()
  includeProgressPhotos?: boolean;
}

