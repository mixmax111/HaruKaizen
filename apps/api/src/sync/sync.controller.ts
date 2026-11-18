import { Controller, Post, Body } from '@nestjs/common';
import { SyncService, BatchSyncResponse } from './sync.service.js';
import { BatchSyncDto } from './dto/batch-sync.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  async batchSync(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BatchSyncDto,
  ): Promise<BatchSyncResponse> {
    return this.syncService.processBatchSync(user.sub, dto.mutations);
  }
}

