import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DataAggregatorService } from '../aggregator/data-aggregator.service.js';
import { PromptBuilderService } from '../prompts/prompt-builder.service.js';
import { AiOrchestratorService } from '../orchestrator/ai-orchestrator.service.js';
import { DiskStorageService } from '../../media/storage/disk-storage.service.js';
import { DocumentsService } from '../../documents/documents.service.js';
import { ReportType } from '@harukaizen/shared';
import * as fs from 'node:fs/promises';

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: DataAggregatorService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly storage: DiskStorageService,
    private readonly documentsService: DocumentsService,
  ) {}

  async generateReport(
    userId: string,
    reportType: ReportType = ReportType.ON_DEMAND,
    options?: { includeProgressPhotos?: boolean },
  ) {
    this.logger.log(`Generazione report (${reportType}) per utente ${userId} (multimodal photos: ${!!options?.includeProgressPhotos})`);

    // 1. Costruzione snapshot e documenti utente
    const [snapshot, activeDocs] = await Promise.all([
      this.aggregator.buildWeeklySnapshot(userId),
      this.documentsService.getActiveRagDocuments(userId),
    ]);

    // 2. Pre-check clinico
    const clinicalCheck = this.promptBuilder.evaluateClinicalGuardrails({
      sex: snapshot.user.sex,
      heightCm: snapshot.user.heightCm,
      weightKg: snapshot.measurements.currentWeightKg,
      targetKcal: snapshot.nutrition.estimatedTdeeCalories ?? snapshot.nutrition.avgDailyCalories,
    });

    // 3. Costruzione system prompt arricchito (con Semi-RAG + guardrails clinici)
    const systemPrompt = this.promptBuilder.buildSystemPrompt(snapshot.user.coachTone, {
      userDocuments: activeDocs,
      clinicalCheck,
    });
    const baseTextPrompt = this.promptBuilder.buildUserPrompt(snapshot);

    // 4. Gestione Multimodale Vision (se richiesta)
    let userPrompt: string | Array<any> = baseTextPrompt;

    if (options?.includeProgressPhotos) {
      const latestPhotos = await this.prisma.progressMedia.findMany({
        where: {
          userId,
          mediaType: 'image',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });

      if (latestPhotos.length > 0) {
        this.logger.log(`Caricamento di ${latestPhotos.length} foto progresso per analisi multimodale vision...`);
        const contentParts: Array<any> = [
          {
            type: 'text',
            text: `${baseTextPrompt}\n\n[ANALISI MULTIMODALE VISION]: Di seguito sono allegate le ultime ${latestPhotos.length} foto del fisico dell'utente caricate nei check-in. Valuta visivamente la postura, la proporzione muscolare e l'aderenza visiva rispetto ai dati della bilancia e alle circonferenze.`,
          },
        ];

        for (const photo of latestPhotos) {
          try {
            const filePath = this.storage.getFilePath(photo.mediaUrl);
            const fileBuffer = await fs.readFile(filePath);
            contentParts.push({
              type: 'image',
              image: fileBuffer,
            });
          } catch (err: any) {
            this.logger.warn(`Impossibile leggere il file immagine ${photo.mediaUrl}: ${err.message}`);
          }
        }

        userPrompt = contentParts;
      }
    }

    // 5. Esecuzione chiamata AI tramite Vercel AI SDK
    const insightResult = await this.orchestrator.generateInsight(userId, systemPrompt, userPrompt);

    // 6. Salvataggio su database nel modello AiInsightReport
    const timeframeCode = `${snapshot.timeframe.dateStart}_${snapshot.timeframe.dateEnd}`;
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
      // Fallback per report legacy
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
