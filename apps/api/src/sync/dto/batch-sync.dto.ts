import { IsArray, IsEnum, IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum MutationType {
  CREATE_MEASUREMENT = 'CREATE_MEASUREMENT',
  CREATE_MEAL_SLOT = 'CREATE_MEAL_SLOT',
  CREATE_FOOD_ITEM = 'CREATE_FOOD_ITEM',
  CREATE_RECIPE = 'CREATE_RECIPE',
  CREATE_NUTRITION_LOG = 'CREATE_NUTRITION_LOG',
  CREATE_WORKOUT_LOG = 'CREATE_WORKOUT_LOG',
  CREATE_DOCUMENT_TEXT = 'CREATE_DOCUMENT_TEXT',
}

export class OfflineMutationDto {
  @IsString()
  @IsNotEmpty()
  id!: string; // clientSideId

  @IsEnum(MutationType)
  type!: MutationType;

  @IsString()
  @IsNotEmpty()
  timestamp!: string; // ISO date / clientUpdatedAt

  @IsObject()
  payload!: Record<string, any>;
}

export class BatchSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineMutationDto)
  mutations!: OfflineMutationDto[];
}
