import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiInsightsService } from '../insights/ai-insights.service.js';
import { ReportType } from '@harukaizen/shared';

@Injectable()
export class WeeklyInsightsJob {
  private readonly logger = new Logger(WeeklyInsightsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insightsService: AiInsightsService,
  ) {}

  // Esecuzione ogni domenica a mezzanotte
  @Cron(CronExpression.EVERY_WEEK, {
    timeZone: 'Europe/Rome',
  })
  async handleWeeklyReports() {
    this.logger.log('🚀 Avvio del CRON Job settimanale per gli AI Insight Reports');

    // Trova tutti gli utenti che hanno configurato una API key
    const activeUsersWithApiKey = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        userSettings: {
          llmApiKey: { not: null },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    this.logger.log(`Trovati ${activeUsersWithApiKey.length} utenti con API key configurata.`);

    for (const user of activeUsersWithApiKey) {
      try {
        await this.insightsService.generateReport(user.id, ReportType.WEEKLY);
        this.logger.log(`✅ Report settimanale generato con successo per ${user.email}`);
      } catch (error: any) {
        this.logger.error(`❌ Errore durante generazione report per ${user.email}: ${error?.message || error}`);
      }
    }

    this.logger.log('🏁 CRON Job settimanale completato.');
  }
}
