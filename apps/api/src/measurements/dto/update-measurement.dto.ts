import { PartialType } from '@nestjs/mapped-types';
import { CreateMeasurementDto } from './create-measurement.dto.js';

export class UpdateMeasurementDto extends PartialType(CreateMeasurementDto) {}

