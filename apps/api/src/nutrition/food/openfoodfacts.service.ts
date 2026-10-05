import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface OpenFoodFactsProduct {
  name: string;
  barcode: string;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g?: number;
  sodium100g?: number;
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v2/product';
  private readonly timeoutMs = 3500; // 3.5s timeout conformemente a A3

  async fetchByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/${barcode}.json`, {
        timeout: this.timeoutMs,
        headers: {
          'User-Agent': 'HaruKaizenApp/1.0 (fitness-nutrition-tracker; contact@harukaizen.dev)',
        },
      });

      if (response.data?.status !== 1 || !response.data?.product) {
        return null;
      }

      const p = response.data.product;
      const nutriments = p.nutriments || {};

      const name = p.product_name_it || p.product_name || p.generic_name || 'Alimento Sconosciuto';
      const calories = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0;
      const protein = nutriments['proteins_100g'] ?? nutriments['proteins'] ?? 0;
      const carbs = nutriments['carbohydrates_100g'] ?? nutriments['carbohydrates'] ?? 0;
      const fat = nutriments['fat_100g'] ?? nutriments['fat'] ?? 0;
      const fiber = nutriments['fiber_100g'] ?? nutriments['fiber'] ?? undefined;
      const sodium = nutriments['sodium_100g'] ?? nutriments['sodium'] ?? undefined;

      return {
        name,
        barcode,
        calories100g: Number(calories) || 0,
        protein100g: Number(protein) || 0,
        carbs100g: Number(carbs) || 0,
        fat100g: Number(fat) || 0,
        fiber100g: fiber !== undefined ? Number(fiber) : undefined,
        sodium100g: sodium !== undefined ? Number(sodium) : undefined,
      };
    } catch (error: any) {
      this.logger.warn(`OpenFoodFacts fetch failed or timed out for barcode ${barcode}: ${error?.message || error}`);
      return null;
    }
  }
}
