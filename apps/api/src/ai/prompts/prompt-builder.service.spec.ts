import { describe, it, expect } from 'vitest';
import { PromptBuilderService } from './prompt-builder.service.js';
import { CoachTone } from '@harukaizen/shared';

describe('PromptBuilderService', () => {
  const service = new PromptBuilderService();

  it('should generate rigorous system prompt when RIGOROUS tone is selected', () => {
    const prompt = service.buildSystemPrompt(CoachTone.RIGOROUS);
    expect(prompt).toContain('RIGOROSO & SCIENTIFICO');
    expect(prompt).toContain('progressive overload');
  });

  it('should generate empathetic system prompt when EMPATHETIC tone is selected', () => {
    const prompt = service.buildSystemPrompt(CoachTone.EMPATHETIC);
    expect(prompt).toContain('EMPATICO & MOTIVAZIONALE');
    expect(prompt).toContain('supportivo');
  });

  it('should generate kaizen system prompt by default', () => {
    const prompt = service.buildSystemPrompt('KAIZEN');
    expect(prompt).toContain('KAIZEN');
    expect(prompt).toContain('Migliorare dell\'1% ogni giorno');
  });
});
