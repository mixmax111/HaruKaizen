import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsdaFallbackService } from './usda-fallback.service.js';
import axios from 'axios';

vi.mock('axios');

describe('UsdaFallbackService', () => {
  let service: UsdaFallbackService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsdaFallbackService();
  });

  describe('Sovereign Italian Staples Dictionary', () => {
    it('should find raw staples instantly offline without network call', () => {
      const results = service.searchSovereignStaples('pollo');
      expect(results.length).toBeGreaterThan(0);
      const chicken = results[0];
      expect(chicken.name).toContain('Petto di Pollo');
      expect(chicken.kcalPer100g).toBe(110);
      expect(chicken.proteinPer100g).toBe(23.1);
      expect(chicken.source).toBe('USDA_FALLBACK');
    });

    it('should match other staples by keyword', () => {
      const salmonResults = service.searchSovereignStaples('salmone');
      expect(salmonResults.length).toBeGreaterThan(0);
      expect(salmonResults[0].proteinPer100g).toBeGreaterThan(15);

      const oatsResults = service.searchSovereignStaples('avena');
      expect(oatsResults.length).toBeGreaterThan(0);
      expect(oatsResults[0].carbsPer100g).toBeGreaterThan(50);
    });
  });

  describe('USDA FoodData Central API Mapping', () => {
    it('should map USDA nutrients accurately', async () => {
      (axios.get as any).mockResolvedValueOnce({
        data: {
          foods: [
            {
              description: 'CHICKEN BREAST RAW',
              brandOwner: 'Tyson',
              gtinUpc: '023700014238',
              foodNutrients: [
                { nutrientId: 1008, nutrientName: 'Energy', unitName: 'KCAL', value: 120 },
                { nutrientId: 1003, nutrientName: 'Protein', unitName: 'G', value: 22.5 },
                { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 0 },
                { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'G', value: 2.5 },
                { nutrientId: 1079, nutrientName: 'Fiber, total dietary', unitName: 'G', value: 0 },
              ],
            },
          ],
        },
      });

      const results = await service.searchByName('chicken breast');
      expect(results.length).toBeGreaterThan(0);
      const usdaMatch = results.find((r) => r.name === 'CHICKEN BREAST RAW');
      expect(usdaMatch).toBeDefined();
      expect(usdaMatch?.kcalPer100g).toBe(120);
      expect(usdaMatch?.proteinPer100g).toBe(22.5);
      expect(usdaMatch?.brand).toBe('Tyson');
    });

    it('should fallback seamlessly to Sovereign Staples if USDA API errors or times out', async () => {
      (axios.get as any).mockRejectedValueOnce(new Error('Network error or rate limited'));

      const results = await service.searchByName('riso basmati');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Riso Basmati');
    });

    it('should fetch barcode via USDA API when found', async () => {
      (axios.get as any).mockResolvedValueOnce({
        data: {
          foods: [
            {
              description: 'GREEK YOGURT PLAIN',
              gtinUpc: '012345678901',
              foodNutrients: [
                { nutrientId: 1008, value: 59 },
                { nutrientId: 1003, value: 10.0 },
                { nutrientId: 1005, value: 3.6 },
                { nutrientId: 1004, value: 0.4 },
              ],
            },
          ],
        },
      });

      const result = await service.fetchByBarcode('012345678901');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('GREEK YOGURT PLAIN');
      expect(result?.kcalPer100g).toBe(59);
    });
  });
});

