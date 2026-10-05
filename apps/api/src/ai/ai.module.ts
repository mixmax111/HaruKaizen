import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from '../settings/settings.module.js';
import { DataAggregatorService } from './aggregator/data-aggregator.service.js';
import { PromptBuilderService } from './prompts/prompt-builder.service.js';
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service.js';
import { AiInsightsService } from './insights/ai-insights.service.js';
import { AiInsightsController } from './insights/ai-insights.controller.js';
import { WeeklyInsightsJob } from './jobs/weekly-insights.job.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SettingsModule,
  ],
  controllers: [
    AiInsightsController,
  ],
  providers: [
    DataAggregatorService,
    PromptBuilderService,
    AiOrchestratorService,
    AiInsightsService,
    WeeklyInsightsJob,
  ],
  exports: [
    AiInsightsService,
    DataAggregatorService,
  ],
})
export class AiModule {}
