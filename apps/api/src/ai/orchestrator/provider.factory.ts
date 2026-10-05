import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { LlmProvider } from '@harukaizen/shared';
import { BadRequestException } from '@nestjs/common';

export class ProviderFactory {
  static getModel(provider: string, apiKey: string) {
    switch (provider) {
      case LlmProvider.ANTHROPIC: {
        const anthropic = createAnthropic({ apiKey });
        return anthropic('claude-3-5-sonnet-20241022');
      }
      case LlmProvider.OPENAI:
      default: {
        const openai = createOpenAI({ apiKey });
        return openai('gpt-4o');
      }
    }
  }
}
