import { describe, it, expect, beforeEach } from 'vitest';
import { PromptBuilderService } from './prompt-builder.service.js';
import { KnowledgeService } from '../knowledge/knowledge.service.js';
import { CoachTone } from '@harukaizen/shared';

describe('PromptBuilderService', () => {
  let knowledgeService: KnowledgeService;
  let service: PromptBuilderService;

  beforeEach(() => {
    knowledgeService = new KnowledgeService();
    // Iniezione mock o reale
    service = new PromptBuilderService(knowledgeService);
  });

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
    expect(prompt).toContain("Migliorare dell'1% ogni giorno");
  });

  it('should trigger clinical warning when male target calories < 1500 kcal', () => {
    const result = service.evaluateClinicalGuardrails({
      sex: 'M',
      targetKcal: 1400,
      heightCm: 180,
      weightKg: 80,
    });

    expect(result.requiresClinicalWarning).toBe(true);
    expect(result.warningReasons.some(r => r.includes('1500 kcal'))).toBe(true);
  });

  it('should trigger clinical warning when female target calories < 1200 kcal', () => {
    const result = service.evaluateClinicalGuardrails({
      sex: 'F',
      targetKcal: 1150,
      heightCm: 165,
      weightKg: 60,
    });

    expect(result.requiresClinicalWarning).toBe(true);
    expect(result.warningReasons.some(r => r.includes('1200 kcal'))).toBe(true);
  });

  it('should trigger clinical warning when BMI < 18.5', () => {
    const result = service.evaluateClinicalGuardrails({
      sex: 'F',
      targetKcal: 1800,
      heightCm: 175,
      weightKg: 50, // BMI = 50 / (1.75^2) = 16.3
    });

    expect(result.requiresClinicalWarning).toBe(true);
    expect(result.bmi).toBeLessThan(18.5);
    expect(result.warningReasons.some(r => r.includes('sottopeso'))).toBe(true);
  });

  it('should NOT trigger clinical warning when parameters are safe', () => {
    const result = service.evaluateClinicalGuardrails({
      sex: 'M',
      targetKcal: 2200,
      heightCm: 178,
      weightKg: 75, // BMI = 23.7
    });

    expect(result.requiresClinicalWarning).toBe(false);
    expect(result.warningReasons.length).toBe(0);
  });
});
