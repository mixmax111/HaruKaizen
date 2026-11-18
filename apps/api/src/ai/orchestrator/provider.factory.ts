import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LlmProvider } from '@harukaizen/shared';
import { BadRequestException } from '@nestjs/common';

export interface ProviderConfig {
  provider: string;
  apiKey?: string | null;
  modelName?: string | null;
  customBaseUrl?: string | null;
}

export class ProviderFactory {
  static getModel(config: ProviderConfig) {
    const { provider, apiKey, modelName, customBaseUrl } = config;

    switch (provider) {
      case LlmProvider.GEMINI:
      case 'gemini': {
        if (!apiKey) {
          throw new BadRequestException('API Key Google Gemini mancante o non valida.');
        }
        const google = createGoogleGenerativeAI({ apiKey });
        return google(modelName || 'gemini-2.5-flash');
      }

      case LlmProvider.ANTHROPIC:
      case 'anthropic': {
        if (!apiKey) {
          throw new BadRequestException('API Key Anthropic mancante o non valida.');
        }
        const anthropic = createAnthropic({ apiKey });
        return anthropic(modelName || 'claude-3-5-sonnet-20241022');
      }

      case LlmProvider.OPENROUTER:
      case 'openrouter': {
        if (!apiKey) {
          throw new BadRequestException('API Key OpenRouter mancante o non valida.');
        }
        const openrouter = createOpenAI({
          apiKey,
          baseURL: 'https://openrouter.ai/api/v1',
        });
        return openrouter(modelName || 'google/gemini-2.5-flash');
      }

      case LlmProvider.LOCAL_CUSTOM:
      case 'local_custom': {
        // I provider locali (Ollama, LM Studio, vLLM) non richiedono necessariamente una chiave API
        const local = createOpenAI({
          apiKey: apiKey || 'local-no-key-required',
          baseURL: customBaseUrl || 'http://localhost:11434/v1',
        });
        return local(modelName || 'llama3');
      }

      case LlmProvider.OPENAI:
      case 'openai':
      default: {
        if (!apiKey) {
          throw new BadRequestException('API Key OpenAI mancante o non valida.');
        }
        const openai = createOpenAI({ apiKey });
        return openai(modelName || 'gpt-4o');
      }
    }
  }
}
