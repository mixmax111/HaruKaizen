import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FoodAggregatorService } from './food-aggregator.service.js';

describe('FoodAggregatorService (3-Tier Pipeline)', () => {
  let service: FoodAggregatorService;
  let mockPrisma: any;
  let mockOffService: any;
  let mockUsdaFallbackService: any;

  beforeEach(() => {
    mockPrisma = {
      foodItem: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    mockOffService = {
      fetchByBarcode: vi.fn(),
      searchByName: vi.fn(),
    };

    mockUsdaFallbackService = {
      fetchByBarcode: vi.fn(),
      searchByName: vi.fn(),
    };

    service = new FoodAggregatorService(
      mockPrisma,
      mockOffService,
      mockUsdaFallbackService,
    );
  });

  describe('findByBarcode', () => {
    it('Tier 1: should return local DB record immediately without calling external APIs', async () => {
      mockPrisma.foodItem.findFirst.mockResolvedValueOnce({
        id: 'food-uuid-1',
        name: 'Albume d\'uovo pastorizzato',
        barcode: '8000000000001',
        calories100g: 52,
        protein100g: 11.0,
        carbs100g: 0.7,
        fat100g: 0.2,
        isVerified: true,
      });

      const result = await service.findByBarcode('8000000000001');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('LOCAL_DB');
      expect(result?.name).toBe('Albume d\'uovo pastorizzato');
      expect(result?.kcalPer100g).toBe(52);
      expect(mockOffService.fetchByBarcode).not.toHaveBeenCalled();
      expect(mockUsdaFallbackService.fetchByBarcode).not.toHaveBeenCalled();
    });

    it('Tier 2: on local miss, should query OFF v3, upsert to DB, and return with source OPENFOODFACTS_V3', async () => {
      mockPrisma.foodItem.findFirst.mockResolvedValueOnce(null); // lookup in findByBarcode
      mockPrisma.foodItem.findFirst.mockResolvedValueOnce(null); // lookup in upsertFoodItem

      mockOffService.fetchByBarcode.mockResolvedValueOnce({
        barcode: '8000000000002',
        name: 'Fiocchi di Avena - Quaker',
        brand: 'Quaker',
        kcalPer100g: 375,
        proteinPer100g: 13,
        carbsPer100g: 62,
        fatPer100g: 7,
        fiberPer100g: 10,
        source: 'OPENFOODFACTS_V3',
      });

      mockPrisma.foodItem.create.mockResolvedValueOnce({
        id: 'food-uuid-2',
        barcode: '8000000000002',
        name: 'Fiocchi di Avena - Quaker',
        calories100g: 375,
        protein100g: 13,
        carbs100g: 62,
        fat100g: 7,
        fiber100g: 10,
        isVerified: false,
      });

      const result = await service.findByBarcode('8000000000002');

      expect(mockPrisma.foodItem.findFirst).toHaveBeenCalledWith({
        where: {
          barcode: '8000000000002',
          deletedAt: null,
          userId: null,
        },
        orderBy: { userId: 'desc' },
      });
      expect(mockOffService.fetchByBarcode).toHaveBeenCalledWith('8000000000002');
      expect(mockPrisma.foodItem.create).toHaveBeenCalled();
      expect(mockUsdaFallbackService.fetchByBarcode).not.toHaveBeenCalled();

      expect(result).not.toBeNull();
      expect(result?.source).toBe('OPENFOODFACTS_V3');
      expect(result?.name).toBe('Fiocchi di Avena - Quaker');
    });

    it('Tier 3: when OFF v3 returns null or fails, should fallback to USDA and upsert to DB', async () => {
      mockPrisma.foodItem.findFirst.mockResolvedValueOnce(null); // findByBarcode
      mockOffService.fetchByBarcode.mockResolvedValueOnce(null); // OFF v3 404 / failure

      mockUsdaFallbackService.fetchByBarcode.mockResolvedValueOnce({
        barcode: '012345678999',
        name: 'Greek Yogurt Plain',
        kcalPer100g: 59,
        proteinPer100g: 10,
        carbsPer100g: 3.6,
        fatPer100g: 0.4,
        source: 'USDA_FALLBACK',
      });

      mockPrisma.foodItem.findFirst.mockResolvedValueOnce(null); // upsertFoodItem
      mockPrisma.foodItem.create.mockResolvedValueOnce({
        id: 'food-uuid-3',
        barcode: '012345678999',
        name: 'Greek Yogurt Plain',
        calories100g: 59,
        protein100g: 10,
        carbs100g: 3.6,
        fat100g: 0.4,
        isVerified: false,
      });

      const result = await service.findByBarcode('012345678999');

      expect(mockOffService.fetchByBarcode).toHaveBeenCalledWith('012345678999');
      expect(mockUsdaFallbackService.fetchByBarcode).toHaveBeenCalledWith('012345678999');
      expect(mockPrisma.foodItem.create).toHaveBeenCalled();

      expect(result).not.toBeNull();
      expect(result?.source).toBe('USDA_FALLBACK');
      expect(result?.name).toBe('Greek Yogurt Plain');
      expect(result?.kcalPer100g).toBe(59);
    });

    it('should return null when item is not found across all 3 tiers', async () => {
      mockPrisma.foodItem.findFirst.mockResolvedValueOnce(null);
      mockOffService.fetchByBarcode.mockResolvedValueOnce(null);
      mockUsdaFallbackService.fetchByBarcode.mockResolvedValueOnce(null);

      const result = await service.findByBarcode('9999999999999');

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should return local items immediately if >= 5 results exist', async () => {
      const fiveLocalItems = Array.from({ length: 5 }, (_, i) => ({
        id: `local-${i}`,
        name: `Riso Integrale Tipo ${i}`,
        calories100g: 350,
        protein100g: 8,
        carbs100g: 75,
        fat100g: 2,
      }));

      mockPrisma.foodItem.findMany.mockResolvedValueOnce(fiveLocalItems);

      const results = await service.search('riso');

      expect(results).toHaveLength(5);
      expect(results[0].source).toBe('LOCAL_DB');
      expect(mockOffService.searchByName).not.toHaveBeenCalled();
      expect(mockUsdaFallbackService.searchByName).not.toHaveBeenCalled();
    });

    it('should query Tier 2 and Tier 3 when local results < 5 and merge them', async () => {
      mockPrisma.foodItem.findMany.mockResolvedValueOnce([]); // 0 local items

      mockOffService.searchByName.mockResolvedValueOnce([
        {
          name: 'Petto di Pollo OFF',
          barcode: '111',
          kcalPer100g: 110,
          proteinPer100g: 23,
          carbsPer100g: 0,
          fatPer100g: 1.2,
          source: 'OPENFOODFACTS_V3',
        },
      ]);

      mockUsdaFallbackService.searchByName.mockResolvedValueOnce([
        {
          name: 'CHICKEN BREAST RAW USDA',
          kcalPer100g: 120,
          proteinPer100g: 22.5,
          carbsPer100g: 0,
          fatPer100g: 2.5,
          source: 'USDA_FALLBACK',
        },
      ]);

      mockPrisma.foodItem.upsert.mockImplementation(({ create }: any) => ({
        id: `mock-${create.name}`,
        ...create,
      }));

      mockPrisma.foodItem.findFirst.mockResolvedValue(null);
      mockPrisma.foodItem.create.mockImplementation(({ data }: any) => ({
        id: `mock-${data.name}`,
        ...data,
      }));

      const results = await service.search('pollo');

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(mockOffService.searchByName).toHaveBeenCalledWith('pollo');
      expect(mockUsdaFallbackService.searchByName).toHaveBeenCalledWith('pollo');
    });
  });
});

