import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service.js';
import { ProviderFactory } from './provider.factory.js';
import { generateObject } from 'ai';
import { z } from 'zod';
import { LlmProvider } from '@harukaizen/shared';

export const InsightResponseSchema = z.object({
  coachMessage: z.string(),
  actionItems: z.array(z.string()),
});

export type InsightResponse = {
  coachMessage: string;
  actionItems: string[];
};

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(private readonly settingsService: SettingsService) {}

  async generateInsight(
    userId: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<InsightResponse> {
    // 1. Recupero chiave API decifrata in RAM in modo sicuro
    const apiKey = await this.settingsService.getDecryptedApiKey(userId);
    if (!apiKey) {
      throw new BadRequestException(
        'Nessuna API Key configurata. Inserisci la tua OpenAI o Anthropic API Key nelle impostazioni per generare gli AI Insights.',
      );
    }

    // 2. Recupero provider preferito dalle impostazioni
    const settings = await this.settingsService.findByUserId(userId);
    const provider = settings.preferredLlmProvider || LlmProvider.OPENAI;

    const model: any = ProviderFactory.getModel(provider, apiKey);

    this.logger.log(`Invocazione AI per utente ${userId} con provider: ${provider}`);

    // 3. Generazione Ibrida (Markdown + JSON array per task)
    const result: any = await (generateObject as any)({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      schema: InsightResponseSchema,
    });

    return result.object as InsightResponse;
  }
}
