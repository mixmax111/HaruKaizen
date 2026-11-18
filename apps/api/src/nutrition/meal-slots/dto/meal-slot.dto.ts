import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateMealSlotDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsInt()
  slotOrder?: number;

  @IsOptional()
  @IsString()
  clientSideId?: string;

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;
}

export class UpdateMealSlotDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  slotOrder?: number;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;
}

export class ReorderMealSlotsDto {
  @IsString({ each: true })
  slotIds!: string[];
}

export class DeleteMealSlotDto {
  @IsOptional()
  @IsString()
  fallbackMealSlotId?: string;
}

