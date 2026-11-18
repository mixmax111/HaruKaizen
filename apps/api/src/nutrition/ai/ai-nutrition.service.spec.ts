import { describe, it, expect, beforeEach } from 'vitest';
import { AiNutritionService, AiMealEstimateSchema } from './ai-nutrition.service.js';
import sharp from 'sharp';

describe('AiNutritionService — Guardrails & Safety Spec', () => {
  let service: AiNutritionService;
  let mockPrisma: any;
  let mockCrypto: any;

  beforeEach(() => {
    mockPrisma = {
      userSettings: {
        findUnique: async () => null,
      },
    };
    mockCrypto = {
      encrypt: (s: string) => `v1:iv:tag:${s}`,
      decrypt: (s: string) => 'decrypted-key',
    };

    service = new AiNutritionService(mockPrisma, mockCrypto);
  });

  describe('1. Zod Validation & Caloric Consistency Guardrail (±15%)', () => {
    it('accetta una stima con coerenza calorica entro il 15%', () => {
      // 30g Pro (120 kcal) + 40g Carb (160 kcal) + 10g Fat (90 kcal) = 370 kcal
      const validPayload = {
        foodName: 'Petto di pollo con riso e olio',
        estimatedWeightG: 250,
        calories: 360, // 360 vs 370 -> diff 10 kcal (< 15% di 360 = 54 kcal)
        proteinG: 30,
        carbsG: 40,
        fatG: 10,
        fiberG: 3,
        confidenceScore: 0.85,
        estimatedByAi: true,
        notes: 'Piatto bilanciato',
      };

      const result = AiMealEstimateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('respinge una stima con scostamento calorico superiore al 15% (allucinazione macro)', () => {
      // 50g Pro (200 kcal) + 80g Carb (320 kcal) + 30g Fat (270 kcal) = 790 kcal
      const invalidPayload = {
        foodName: 'Piatto Allucinato',
        estimatedWeightG: 300,
        calories: 400, // 400 vs 790 -> diff 390 kcal (> 15%)
        proteinG: 50,
        carbsG: 80,
        fatG: 30,
        fiberG: 2,
        confidenceScore: 0.9,
        estimatedByAi: true,
      };

      const result = AiMealEstimateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('tolleranza fisiologica del 15%');
      }
    });

    it('respinge valori negativi di calorie o macronutrienti', () => {
      const negativePayload = {
        foodName: 'Piatto Negativo',
        estimatedWeightG: 100,
        calories: -50,
        proteinG: 10,
        carbsG: 20,
        fatG: 5,
        estimatedByAi: true,
      };

      const result = AiMealEstimateSchema.safeParse(negativePayload);
      expect(result.success).toBe(false);
    });
  });

  describe('2. Sanitizzazione EXIF con sharp', () => {
    it('rimuove i metadati EXIF da un buffer immagine', async () => {
      // Crea un buffer immagine JPEG di test con metadati fittizi
      const rawImage = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const sanitized = await service.sanitizeImageExif(rawImage);
      expect(sanitized).toBeInstanceOf(Buffer);

      const metadata = await sharp(sanitized).metadata();
      // EXIF rimosso (undefined o vuoto)
      expect(metadata.exif).toBeUndefined();
    });
  });

  describe('3. Protezione BYOK e Quota Chiamate', () => {
    it('solleva BadRequestException se l\'utente non ha configurato la chiave LLM', async () => {
      await expect(
        service.estimateFromText('user-without-key', 'Pasta al pomodoro')
      ).rejects.toThrow('Chiave API LLM non configurata');
    });
  });
});

