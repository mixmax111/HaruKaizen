import { describe, it, expect, vi } from 'vitest';
import { OpenFoodFactsService } from './openfoodfacts.service.js';
import axios from 'axios';

vi.mock('axios');

describe('OpenFoodFactsService', () => {
  const service = new OpenFoodFactsService();

  it('should fetch and map product correctly', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: {
        status: 1,
        product: {
          product_name_it: 'Pasta Integrale',
          nutriments: {
            'energy-kcal_100g': 350,
            'proteins_100g': 12.5,
            'carbohydrates_100g': 68,
            'fat_100g': 2.2,
            'fiber_100g': 6,
          },
        },
      },
    });

    const result = await service.fetchByBarcode('8001234567890');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Pasta Integrale');
    expect(result?.calories100g).toBe(350);
    expect(result?.protein100g).toBe(12.5);
    expect(result?.fiber100g).toBe(6);
  });

  it('should return null when product is not found or status !== 1', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: {
        status: 0,
      },
    });

    const result = await service.fetchByBarcode('9999999999999');
    expect(result).toBeNull();
  });

  it('should return null on timeout or network error', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('timeout of 3500ms exceeded'));

    const result = await service.fetchByBarcode('123456789');
    expect(result).toBeNull();
  });
});
