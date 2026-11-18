import { Module } from '@nestjs/common';
import { PortabilityController } from './portability.controller.js';
import { PortabilityService } from './portability.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PortabilityController],
  providers: [PortabilityService],
  exports: [PortabilityService],
})
export class PortabilityModule {}

