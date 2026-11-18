import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { FoodProvider, StandardizedFoodItem } from './food-provider.interface.js';

export type OpenFoodFactsProduct = StandardizedFoodItem;

@Injectable()
export class OpenFoodFactsService implements FoodProvider {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly v3ProductBaseUrl = 'https://world.openfoodfacts.org/api/v3/product';
  private readonly timeoutMs = 6000;

  // Timestamps per sliding-window rate limit
  private readonly productRequestTimestamps: number[] = [];
  private readonly searchRequestTimestamps: number[] = [];

  private getUserAgent(): string {
    const contact = process.env.OFF_CONTACT_EMAIL || 'support@harukaizen.local';
    return `HaruKaizen/3.0 (${contact})`;
  }

  private getProductRateLimit(): number {
    const val = parseInt(process.env.OFF_PRODUCT_RATE_LIMIT || '15', 10);
    return isNaN(val) || val <= 0 ? 15 : val;
  }

  private getSearchRateLimit(): number {
    const val = parseInt(process.env.OFF_SEARCH_RATE_LIMIT || '10', 10);
    return isNaN(val) || val <= 0 ? 10 : val;
  }

  private checkRateLimit(timestamps: number[], maxPerMinute: number): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    while (timestamps.length > 0 && timestamps[0] < oneMinuteAgo) {
      timestamps.shift();
    }
    if (timestamps.length >= maxPerMinute) {
      return false;
    }
    timestamps.push(now);
    return true;
  }

  async fetchByBarcode(barcode: string): Promise<StandardizedFoodItem | null> {
    if (!barcode || !barcode.trim()) {
      return null;
    }

    if (!this.checkRateLimit(this.productRequestTimestamps, this.getProductRateLimit())) {
      this.logger.warn(`Open Food Facts product read rate limit reached (${this.getProductRateLimit()}/min). Skipping request.`);
      return null;
    }

    const cleanBarcode = barcode.trim();
    const url = `${this.v3ProductBaseUrl}/${encodeURIComponent(cleanBarcode)}?fields=code,product_name,product_name_it,brands,nutriments,serving_size,image_front_small_url`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeoutMs,
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          'User-Agent': this.getUserAgent(),
        },
      });

      const data = response.data;
      if (!data) {
        return null;
      }

      // Open Food Facts v3 envelope parsing:
      // status can be 'success', 'success_with_warnings', or 'failure'
      // result.id is typically 'product_found' when present
      const isStatusSuccess = data.status === 'success' || data.status === 'success_with_warnings';
      const isProductFound = data.result?.id === 'product_found' || (isStatusSuccess && Boolean(data.product));

      if (!isStatusSuccess || !isProductFound || !data.product) {
        return null;
      }

      const p = data.product;
      const nutriments = p.nutriments || {};

      // Prefer Italian name, fallback to generic product name
      const baseName =
        p.product_name_it?.trim() ||
        p.product_name?.trim() ||
        p.generic_name?.trim() ||
        'Alimento Sconosciuto';

      const brand = p.brands?.trim();
      const name =
        brand && !baseName.toLowerCase().includes(brand.toLowerCase())
          ? `${baseName} - ${brand}`
          : baseName;

      // Extract macros from nutriments
      let kcal = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'];
      if (kcal === undefined || kcal === null) {
        const kj = nutriments['energy-kj_100g'] ?? nutriments['energy-kj'];
        kcal = kj ? Math.round(Number(kj) / 4.184) : 0;
      }

      const kcalPer100g = Number(kcal) || 0;
      const proteinPer100g = Number(nutriments.proteins_100g ?? nutriments.proteins ?? 0);
      const carbsPer100g = Number(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0);
      const fatPer100g = Number(nutriments.fat_100g ?? nutriments.fat ?? 0);
      const fiberPer100g =
        nutriments.fiber_100g !== undefined
          ? Number(nutriments.fiber_100g)
          : nutriments.fiber !== undefined
            ? Number(nutriments.fiber)
            : undefined;
      const sodium100g =
        nutriments.sodium_100g !== undefined
          ? Number(nutriments.sodium_100g)
          : nutriments.sodium !== undefined
            ? Number(nutriments.sodium)
            : undefined;

      const imageUrl = p.image_front_small_url || p.image_url || undefined;

      return {
        barcode: p.code || cleanBarcode,
        name,
        brand: brand || undefined,
        kcalPer100g,
        proteinPer100g,
        carbsPer100g,
        fatPer100g,
        fiberPer100g,
        sodium100g,
        imageUrl,
        source: 'OPENFOODFACTS_V3',
      };
    } catch (error: any) {
      this.logger.warn(`Open Food Facts v3 lookup failed or timed out for barcode ${cleanBarcode}: ${error?.message || error}`);
      return null;
    }
  }

  async searchByName(query: string): Promise<StandardizedFoodItem[]> {
    if (!query || !query.trim()) {
      return [];
    }

    if (!this.checkRateLimit(this.searchRequestTimestamps, this.getSearchRateLimit())) {
      this.logger.warn(`Open Food Facts search rate limit reached (${this.getSearchRateLimit()}/min). Skipping external search.`);
      return [];
    }

    const trimmedQuery = query.trim();
    // Endpoint ufficiale di ricerca Open Food Facts v2
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(trimmedQuery)}&page_size=10&fields=code,product_name,product_name_it,brands,nutriments,image_front_small_url`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeoutMs,
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          'User-Agent': this.getUserAgent(),
        },
      });

      const products = response.data?.products;
      if (!Array.isArray(products)) {
        return [];
      }

      const results: StandardizedFoodItem[] = [];

      for (const p of products) {
        if (!p || !p.nutriments) {
          continue;
        }

        const nutriments = p.nutriments;
        let kcal = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'];
        if (kcal === undefined || kcal === null) {
          const kj = nutriments['energy-kj_100g'] ?? nutriments['energy-kj'];
          kcal = kj ? Math.round(Number(kj) / 4.184) : 0;
        }

        const kcalPer100g = Number(kcal) || 0;
        const proteinPer100g = Number(nutriments.proteins_100g ?? nutriments.proteins ?? 0);
        const carbsPer100g = Number(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0);
        const fatPer100g = Number(nutriments.fat_100g ?? nutriments.fat ?? 0);

        // Filter out incomplete entries completely missing nutriments
        if (kcalPer100g === 0 && proteinPer100g === 0 && carbsPer100g === 0 && fatPer100g === 0) {
          continue;
        }

        const baseName =
          p.product_name_it?.trim() ||
          p.product_name?.trim() ||
          p.generic_name?.trim();

        if (!baseName) {
          continue;
        }

        const brand = p.brands?.trim();
        const name =
          brand && !baseName.toLowerCase().includes(brand.toLowerCase())
            ? `${baseName} - ${brand}`
            : baseName;

        results.push({
          barcode: p.code || undefined,
          name,
          brand: brand || undefined,
          kcalPer100g,
          proteinPer100g,
          carbsPer100g,
          fatPer100g,
          fiberPer100g:
            nutriments.fiber_100g !== undefined
              ? Number(nutriments.fiber_100g)
              : undefined,
          sodium100g:
            nutriments.sodium_100g !== undefined
              ? Number(nutriments.sodium_100g)
              : undefined,
          imageUrl: p.image_front_small_url || undefined,
          source: 'OPENFOODFACTS_V3',
        });
      }

      return results;
    } catch (error: any) {
      this.logger.warn(`Open Food Facts searchByName failed for query "${trimmedQuery}": ${error?.message || error}`);
      return [];
    }
  }
}
