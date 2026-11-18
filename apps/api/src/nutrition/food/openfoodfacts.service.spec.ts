import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenFoodFactsService } from './openfoodfacts.service.js';
import axios from 'axios';

vi.mock('axios');

describe('OpenFoodFactsService (API v3)', () => {
  let service: OpenFoodFactsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpenFoodFactsService();
  });

  it('should fetch and map product correctly from OFF v3 envelope with product_name_it priority', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: {
        status: 'success',
        result: { id: 'product_found', name: 'Product found' },
        product: {
          code: '8001234567890',
          product_name: 'Generic Whole Pasta',
          product_name_it: 'Pasta Integrale De Cecco',
          brands: 'De Cecco',
          nutriments: {
            'energy-kcal_100g': 350,
            proteins_100g: 13.5,
            carbohydrates_100g: 65,
            fat_100g: 2.5,
            fiber_100g: 7,
          },
          image_front_small_url: 'https://images.openfoodfacts.org/pasta.jpg',
        },
      },
    });

    const result = await service.fetchByBarcode('8001234567890');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Pasta Integrale De Cecco');
    expect(result?.barcode).toBe('8001234567890');
    expect(result?.brand).toBe('De Cecco');
    expect(result?.kcalPer100g).toBe(350);
    expect(result?.proteinPer100g).toBe(13.5);
    expect(result?.carbsPer100g).toBe(65);
    expect(result?.fatPer100g).toBe(2.5);
    expect(result?.fiberPer100g).toBe(7);
    expect(result?.imageUrl).toBe('https://images.openfoodfacts.org/pasta.jpg');
    expect(result?.source).toBe('OPENFOODFACTS_V3');

    // Verify correct URL and mandatory headers
    const callArgs = (axios.get as any).mock.calls[0];
    expect(callArgs[0]).toContain('https://world.openfoodfacts.org/api/v3/product/8001234567890');
    expect(callArgs[1].headers['User-Agent']).toBe('HaruKaizen/3.0 (support@harukaizen.local)');
  });

  it('should fallback to energy-kj_100g conversion when energy-kcal_100g is missing', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: {
        status: 'success_with_warnings',
        result: { id: 'product_found' },
        product: {
          code: '123456',
          product_name: 'Gallette di Riso',
          brands: 'BioBrand',
          nutriments: {
            'energy-kj_100g': 1600, // 1600 / 4.184 = ~382 kcal
            proteins_100g: 8,
            carbohydrates_100g: 82,
            fat_100g: 1.2,
          },
        },
      },
    });

    const result = await service.fetchByBarcode('123456');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Gallette di Riso - BioBrand');
    expect(result?.kcalPer100g).toBe(Math.round(1600 / 4.184));
    expect(result?.proteinPer100g).toBe(8);
  });

  it('should return null when envelope status is failure or product not found', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: {
        status: 'failure',
        result: { id: 'product_not_found', name: 'Product not found' },
      },
    });

    const result = await service.fetchByBarcode('0000000000000');
    expect(result).toBeNull();
  });

  it('should return null on timeout or network error', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('timeout of 6000ms exceeded'));

    const result = await service.fetchByBarcode('9999999999999');
    expect(result).toBeNull();
  });

  it('should search by name and filter incomplete products missing nutriments', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: {
        products: [
          {
            code: '111',
            product_name_it: 'Yogurt Greco 0%',
            brands: 'Fage',
            nutriments: {
              'energy-kcal_100g': 57,
              proteins_100g: 10.3,
              carbohydrates_100g: 4,
              fat_100g: 0,
            },
          },
          {
            code: '222',
            product_name: 'Incomplete Item',
            nutriments: {
              'energy-kcal_100g': 0,
              proteins_100g: 0,
              carbohydrates_100g: 0,
              fat_100g: 0,
            },
          },
        ],
      },
    });

    const results = await service.searchByName('yogurt');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Yogurt Greco 0% - Fage');
    expect(results[0].kcalPer100g).toBe(57);
    expect(results[0].proteinPer100g).toBe(10.3);
  });
});
