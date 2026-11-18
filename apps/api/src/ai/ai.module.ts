import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from '../settings/settings.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MediaModule } from '../media/media.module.js';
import { DocumentsModule } from '../documents/documents.module.js';

import { KnowledgeService } from './knowledge/knowledge.service.js';
import { DataAggregatorService } from './aggregator/data-aggregator.service.js';
import { PromptBuilderService } from './prompts/prompt-builder.service.js';
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service.js';
import { AiInsightsService } from './insights/ai-insights.service.js';
import { AiInsightsController } from './insights/ai-insights.controller.js';
import { AiSandboxService } from './sandbox/ai-sandbox.service.js';
import { AiSandboxController } from './sandbox/ai-sandbox.controller.js';
import { WeeklyInsightsJob } from './jobs/weekly-insights.job.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SettingsModule,
    PrismaModule,
    MediaModule,
    DocumentsModule,
  ],
  controllers: [
    AiInsightsController,
    AiSandboxController,
  ],
  providers: [
    KnowledgeService,
    DataAggregatorService,
    PromptBuilderService,
    AiOrchestratorService,
    AiInsightsService,
    AiSandboxService,
    WeeklyInsightsJob,
  ],
  exports: [
    KnowledgeService,
    AiInsightsService,
    AiSandboxService,
    DataAggregatorService,
  ],
})
export class AiModule {}
