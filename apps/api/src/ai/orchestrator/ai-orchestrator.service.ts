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

  async getModelForUser(userId: string) {
    const settings = await this.settingsService.findByUserId(userId);
    const provider = settings.preferredLlmProvider || LlmProvider.GEMINI;
    const modelName = settings.preferredLlmModel || 'gemini-2.5-flash';
    const customBaseUrl = settings.customLlmBaseUrl;

    const apiKey = await this.settingsService.getDecryptedApiKey(userId);
    if (!apiKey && provider !== LlmProvider.LOCAL_CUSTOM) {
      throw new BadRequestException(
        'Nessuna API Key configurata. Inserisci la tua API Key nelle impostazioni del profilo o imposta un provider locale (Ollama / LM Studio).',
      );
    }

    return ProviderFactory.getModel({
      provider,
      apiKey,
      modelName,
      customBaseUrl,
    });
  }

  async generateInsight(
    userId: string,
    systemPrompt: string,
    userPrompt: string | Array<any>,
  ): Promise<InsightResponse> {
    const model: any = await this.getModelForUser(userId);

    this.logger.log(`Invocazione AI per utente ${userId}`);

    const result: any = await (generateObject as any)({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      schema: InsightResponseSchema,
    });

    return result.object as InsightResponse;
  }

  async generateStructuredObject<T>(
    userId: string,
    systemPrompt: string,
    userPrompt: string | Array<any>,
    schema: z.ZodType<T> | z.ZodTypeAny,
  ): Promise<T> {
    const model: any = await this.getModelForUser(userId);

    this.logger.log(`Generazione strutturata sandboxed per utente ${userId}`);

    const result: any = await (generateObject as any)({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      schema,
    });

    return result.object as T;
  }
}
