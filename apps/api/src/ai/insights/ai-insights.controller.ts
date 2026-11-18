import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { AiInsightsService } from './ai-insights.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy.js';
import { ReportType } from '@harukaizen/shared';
import { GenerateInsightDto } from './dto/generate-insight.dto.js';

@Controller('ai/insights')
export class AiInsightsController {
  constructor(private readonly insightsService: AiInsightsService) {}

  @Post()
  generateInsight(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateInsightDto,
  ) {
    return this.insightsService.generateReport(
      user.sub,
      ReportType.ON_DEMAND,
      { includeProgressPhotos: dto?.includeProgressPhotos },
    );
  }

  @Post('generate')
  generateOnDemand(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateInsightDto,
  ) {
    return this.insightsService.generateReport(
      user.sub,
      ReportType.ON_DEMAND,
      { includeProgressPhotos: dto?.includeProgressPhotos },
    );
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.insightsService.findAll(user.sub);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.insightsService.findOne(user.sub, id);
  }
}
