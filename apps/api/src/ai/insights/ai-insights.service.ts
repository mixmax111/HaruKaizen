import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DataAggregatorService } from '../aggregator/data-aggregator.service.js';
import { PromptBuilderService } from '../prompts/prompt-builder.service.js';
import { AiOrchestratorService } from '../orchestrator/ai-orchestrator.service.js';
import { ReportType } from '@harukaizen/shared';

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: DataAggregatorService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly orchestrator: AiOrchestratorService,
  ) {}

  async generateReport(userId: string, reportType: ReportType = ReportType.ON_DEMAND) {
    this.logger.log(`Generazione report (${reportType}) per utente ${userId}`);

    // 1. Costruzione snapshot
    const snapshot = await this.aggregator.buildWeeklySnapshot(userId);

    // 2. Costruzione prompt (incluso tono coach dinamico)
    const systemPrompt = this.promptBuilder.buildSystemPrompt(snapshot.user.coachTone);
    const userPrompt = this.promptBuilder.buildUserPrompt(snapshot);

    // 3. Esecuzione chiamata AI tramite Vercel AI SDK
    const insightResult = await this.orchestrator.generateInsight(userId, systemPrompt, userPrompt);

    // 4. Salvataggio su database nel modello AiInsightReport
    const timeframeCode = `${snapshot.timeframe.dateStart}_${snapshot.timeframe.dateEnd}`;

    // Payload ibrido salvato in formato strutturato (Markdown + actionItems JSON)
    const aiResponsePayload = JSON.stringify(insightResult);

    const report = await this.prisma.aiInsightReport.create({
      data: {
        userId,
        timeframeCode,
        dateStart: new Date(snapshot.timeframe.dateStart),
        dateEnd: new Date(snapshot.timeframe.dateEnd),
        contextSnapshot: JSON.stringify(snapshot),
        aiResponseMarkdown: aiResponsePayload,
        reportType,
      },
    });

    return {
      reportId: report.id,
      timeframe: snapshot.timeframe,
      coachMessage: insightResult.coachMessage,
      actionItems: insightResult.actionItems,
      createdAt: report.createdAt,
    };
  }

  async findAll(userId: string) {
    const reports = await this.prisma.aiInsightReport.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(r => {
      let parsed: { coachMessage: string; actionItems: string[] } = {
        coachMessage: r.aiResponseMarkdown,
        actionItems: [],
      };
      try {
        parsed = JSON.parse(r.aiResponseMarkdown);
      } catch {
        // Fallback per report legacy in puro markdown
      }

      return {
        id: r.id,
        timeframeCode: r.timeframeCode,
        dateStart: r.dateStart,
        dateEnd: r.dateEnd,
        reportType: r.reportType,
        coachMessage: parsed.coachMessage,
        actionItems: parsed.actionItems,
        createdAt: r.createdAt,
      };
    });
  }

  async findOne(userId: string, id: string) {
    const report = await this.prisma.aiInsightReport.findUnique({
      where: { id },
    });

    if (!report || report.deletedAt || report.userId !== userId) {
      throw new NotFoundException('Report non trovato.');
    }

    let parsed = { coachMessage: report.aiResponseMarkdown, actionItems: [] };
    try {
      parsed = JSON.parse(report.aiResponseMarkdown);
    } catch {
      // Fallback
    }

    return {
      id: report.id,
      timeframeCode: report.timeframeCode,
      dateStart: report.dateStart,
      dateEnd: report.dateEnd,
      reportType: report.reportType,
      contextSnapshot: JSON.parse(report.contextSnapshot),
      coachMessage: parsed.coachMessage,
      actionItems: parsed.actionItems,
      createdAt: report.createdAt,
    };
  }
}
