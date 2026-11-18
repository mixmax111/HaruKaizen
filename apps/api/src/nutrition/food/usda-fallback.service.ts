import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { FoodProvider, StandardizedFoodItem } from './food-provider.interface.js';

export interface SovereignStapleFood {
  name: string;
  keywords: string[];
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
}

export const SOVEREIGN_ITALIAN_STAPLES: SovereignStapleFood[] = [
  {
    name: 'Petto di Pollo crudo',
    keywords: ['pollo', 'petto di pollo', 'chicken', 'breast', 'carne bianca'],
    kcalPer100g: 110,
    proteinPer100g: 23.1,
    carbsPer100g: 0,
    fatPer100g: 1.2,
    fiberPer100g: 0,
  },
  {
    name: 'Riso Basmati crudo',
    keywords: ['riso', 'basmati', 'rice', 'carboidrati'],
    kcalPer100g: 350,
    proteinPer100g: 8.5,
    carbsPer100g: 77.0,
    fatPer100g: 0.8,
    fiberPer100g: 1.5,
  },
  {
    name: 'Uova intere',
    keywords: ['uova', 'uovo', 'egg', 'eggs'],
    kcalPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
    fiberPer100g: 0,
  },
  {
    name: 'Albume d\'uovo',
    keywords: ['albume', 'albumi', 'egg white', 'egg whites'],
    kcalPer100g: 52,
    proteinPer100g: 11.0,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    fiberPer100g: 0,
  },
  {
    name: 'Fiocchi d\'Avena integrali',
    keywords: ['avena', 'oats', 'oatmeal', 'fiocchi'],
    kcalPer100g: 370,
    proteinPer100g: 13.5,
    carbsPer100g: 60.0,
    fatPer100g: 7.0,
    fiberPer100g: 10.0,
  },
  {
    name: 'Olio Extravergine d\'Oliva (EVO)',
    keywords: ['olio', 'olio evo', 'extravergine', 'olive oil'],
    kcalPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100.0,
    fiberPer100g: 0,
  },
  {
    name: 'Salmone fresco crudo',
    keywords: ['salmone', 'salmon', 'pesce'],
    kcalPer100g: 208,
    proteinPer100g: 20.4,
    carbsPer100g: 0,
    fatPer100g: 13.4,
    fiberPer100g: 0,
  },
  {
    name: 'Tonno al naturale sgocciolato',
    keywords: ['tonno', 'tuna', 'pesce', 'tonno al naturale'],
    kcalPer100g: 103,
    proteinPer100g: 24.0,
    carbsPer100g: 0,
    fatPer100g: 0.8,
    fiberPer100g: 0,
  },
  {
    name: 'Pasta di semola di grano duro',
    keywords: ['pasta', 'spaghetti', 'penne', 'semola', 'rigatoni'],
    kcalPer100g: 355,
    proteinPer100g: 12.5,
    carbsPer100g: 73.0,
    fatPer100g: 1.5,
    fiberPer100g: 3.0,
  },
  {
    name: 'Pasta integrale',
    keywords: ['pasta integrale', 'integrale', 'whole wheat pasta'],
    kcalPer100g: 348,
    proteinPer100g: 13.0,
    carbsPer100g: 65.0,
    fatPer100g: 2.5,
    fiberPer100g: 8.0,
  },
  {
    name: 'Patate crude',
    keywords: ['patate', 'patata', 'potato', 'potatoes', 'tuberi'],
    kcalPer100g: 77,
    proteinPer100g: 2.0,
    carbsPer100g: 17.0,
    fatPer100g: 0.1,
    fiberPer100g: 2.2,
  },
  {
    name: 'Yogurt Greco 0% grassi',
    keywords: ['yogurt', 'yogurt greco', 'greek yogurt', 'fage', '0%'],
    kcalPer100g: 57,
    proteinPer100g: 10.3,
    carbsPer100g: 4.0,
    fatPer100g: 0,
    fiberPer100g: 0,
  },
  {
    name: 'Fiocchi di latte magri',
    keywords: ['fiocchi di latte', 'cottage cheese', 'jocca'],
    kcalPer100g: 98,
    proteinPer100g: 11.5,
    carbsPer100g: 3.4,
    fatPer100g: 4.3,
    fiberPer100g: 0,
  },
  {
    name: 'Bresaola della Valtellina IGP',
    keywords: ['bresaola', 'salume', 'affettato magro'],
    kcalPer100g: 151,
    proteinPer100g: 32.0,
    carbsPer100g: 0.4,
    fatPer100g: 2.6,
    fiberPer100g: 0,
  },
  {
    name: 'Parmigiano Reggiano DOP',
    keywords: ['parmigiano', 'grana', 'formaggio', 'parmesan'],
    kcalPer100g: 402,
    proteinPer100g: 32.4,
    carbsPer100g: 0,
    fatPer100g: 29.7,
    fiberPer100g: 0,
  },
  {
    name: 'Pane di segale integrale',
    keywords: ['pane', 'segale', 'pane di segale', 'rye bread'],
    kcalPer100g: 250,
    proteinPer100g: 9.0,
    carbsPer100g: 48.0,
    fatPer100g: 1.5,
    fiberPer100g: 6.5,
  },
  {
    name: 'Riso integrale crudo',
    keywords: ['riso integrale', 'brown rice'],
    kcalPer100g: 350,
    proteinPer100g: 7.5,
    carbsPer100g: 74.0,
    fatPer100g: 2.8,
    fiberPer100g: 3.5,
  },
  {
    name: 'Mandorle sgusciate',
    keywords: ['mandorle', 'almonds', 'frutta secca'],
    kcalPer100g: 579,
    proteinPer100g: 21.2,
    carbsPer100g: 21.6,
    fatPer100g: 49.9,
    fiberPer100g: 12.5,
  },
  {
    name: 'Noci sgusciate',
    keywords: ['noci', 'walnuts', 'frutta secca'],
    kcalPer100g: 654,
    proteinPer100g: 15.2,
    carbsPer100g: 13.7,
    fatPer100g: 65.2,
    fiberPer100g: 6.7,
  },
  {
    name: 'Burro d\'arachidi 100%',
    keywords: ['burro d\'arachidi', 'arachidi', 'peanut butter'],
    kcalPer100g: 588,
    proteinPer100g: 25.0,
    carbsPer100g: 20.0,
    fatPer100g: 50.0,
    fiberPer100g: 8.0,
  },
  {
    name: 'Mela fresca',
    keywords: ['mela', 'apple', 'frutta'],
    kcalPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
  },
  {
    name: 'Banana',
    keywords: ['banana', 'banane', 'frutta'],
    kcalPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
  },
  {
    name: 'Broccoli freschi',
    keywords: ['broccoli', 'broccolo', 'verdura'],
    kcalPer100g: 34,
    proteinPer100g: 2.8,
    carbsPer100g: 7.0,
    fatPer100g: 0.4,
    fiberPer100g: 2.6,
  },
  {
    name: 'Spinaci freschi',
    keywords: ['spinaci', 'spinacio', 'verdura'],
    kcalPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 2.2,
  },
  {
    name: 'Fesa di Tacchino cruda',
    keywords: ['tacchino', 'fesa di tacchino', 'turkey', 'carne bianca'],
    kcalPer100g: 107,
    proteinPer100g: 24.0,
    carbsPer100g: 0,
    fatPer100g: 1.2,
    fiberPer100g: 0,
  },
  {
    name: 'Carne bovina magra (Manzo 5% grassi)',
    keywords: ['manzo', 'carne bovina', 'beef', 'macinato magro'],
    kcalPer100g: 130,
    proteinPer100g: 21.5,
    carbsPer100g: 0,
    fatPer100g: 5.0,
    fiberPer100g: 0,
  },
  {
    name: 'Filetto di Merluzzo fresco',
    keywords: ['merluzzo', 'nasello', 'cod', 'pesce bianco'],
    kcalPer100g: 82,
    proteinPer100g: 18.0,
    carbsPer100g: 0,
    fatPer100g: 0.7,
    fiberPer100g: 0,
  },
  {
    name: 'Ricotta vaccina fresca',
    keywords: ['ricotta', 'ricotta vaccina', 'latticini'],
    kcalPer100g: 140,
    proteinPer100g: 9.0,
    carbsPer100g: 3.5,
    fatPer100g: 10.0,
    fiberPer100g: 0,
  },
  {
    name: 'Lenticchie secche',
    keywords: ['lenticchie', 'lentils', 'legumi'],
    kcalPer100g: 353,
    proteinPer100g: 25.0,
    carbsPer100g: 60.0,
    fatPer100g: 1.0,
    fiberPer100g: 11.0,
  },
  {
    name: 'Ceci secchi',
    keywords: ['ceci', 'chickpeas', 'legumi'],
    kcalPer100g: 364,
    proteinPer100g: 19.3,
    carbsPer100g: 61.0,
    fatPer100g: 6.0,
    fiberPer100g: 17.0,
  },
  {
    name: 'Farro perlato crudo',
    keywords: ['farro', 'cereali', 'spelt'],
    kcalPer100g: 335,
    proteinPer100g: 15.0,
    carbsPer100g: 67.0,
    fatPer100g: 2.5,
    fiberPer100g: 6.8,
  },
  {
    name: 'Cioccolato fondente 85%',
    keywords: ['cioccolato', 'cioccolato fondente', 'dark chocolate', 'cacao'],
    kcalPer100g: 585,
    proteinPer100g: 8.0,
    carbsPer100g: 22.0,
    fatPer100g: 52.0,
    fiberPer100g: 12.0,
  },
  {
    name: 'Latte scremato',
    keywords: ['latte scremato', 'skim milk'],
    kcalPer100g: 34,
    proteinPer100g: 3.4,
    carbsPer100g: 5.0,
    fatPer100g: 0.1,
    fiberPer100g: 0,
  },
  {
    name: 'Latte parzialmente scremato',
    keywords: ['latte', 'latte parzialmente scremato', 'milk'],
    kcalPer100g: 46,
    proteinPer100g: 3.3,
    carbsPer100g: 4.8,
    fatPer100g: 1.5,
    fiberPer100g: 0,
  },
  {
    name: 'Quinoa cruda',
    keywords: ['quinoa', 'cereali'],
    kcalPer100g: 368,
    proteinPer100g: 14.1,
    carbsPer100g: 64.2,
    fatPer100g: 6.1,
    fiberPer100g: 7.0,
  },
];

@Injectable()
export class UsdaFallbackService implements FoodProvider {
  private readonly logger = new Logger(UsdaFallbackService.name);
  private readonly baseUrl = 'https://api.nal.usda.gov/fdc/v1/foods/search';
  private readonly timeoutMs = 6000;
  private readonly staples = SOVEREIGN_ITALIAN_STAPLES;

  private getApiKey(): string {
    return process.env.USDA_API_KEY || 'DEMO_KEY';
  }

  /**
   * Search within the built-in sovereign staple dictionary
   */
  searchSovereignStaples(query: string): StandardizedFoodItem[] {
    if (!query || !query.trim()) {
      return [];
    }

    const cleanQuery = query.toLowerCase().trim();
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);

    const matches: { item: SovereignStapleFood; score: number }[] = [];

    for (const staple of this.staples) {
      let score = 0;
      const lowerName = staple.name.toLowerCase();

      // Exact name match
      if (lowerName === cleanQuery) {
        score += 100;
      } else if (lowerName.startsWith(cleanQuery)) {
        score += 60;
      } else if (lowerName.includes(cleanQuery)) {
        score += 40;
      }

      // Keyword matches
      for (const kw of staple.keywords) {
        const lowerKw = kw.toLowerCase();
        if (lowerKw === cleanQuery) {
          score += 50;
        } else if (lowerKw.includes(cleanQuery) || cleanQuery.includes(lowerKw)) {
          score += 30;
        }
      }

      // Token matches
      for (const token of tokens) {
        if (lowerName.includes(token)) {
          score += 15;
        }
        for (const kw of staple.keywords) {
          if (kw.toLowerCase().includes(token)) {
            score += 10;
          }
        }
      }

      if (score > 0) {
        matches.push({ item: staple, score });
      }
    }

    // Sort by descending score
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, 10).map((m) => ({
      name: m.item.name,
      kcalPer100g: m.item.kcalPer100g,
      proteinPer100g: m.item.proteinPer100g,
      carbsPer100g: m.item.carbsPer100g,
      fatPer100g: m.item.fatPer100g,
      fiberPer100g: m.item.fiberPer100g,
      source: 'USDA_FALLBACK',
    }));
  }

  async fetchByBarcode(barcode: string): Promise<StandardizedFoodItem | null> {
    if (!barcode || !barcode.trim()) {
      return null;
    }

    try {
      const apiKey = this.getApiKey();
      const url = `${this.baseUrl}?query=${encodeURIComponent(barcode.trim())}&pageSize=3&api_key=${apiKey}`;

      const response = await axios.get(url, {
        timeout: this.timeoutMs,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const foods = response.data?.foods;
      if (!Array.isArray(foods) || foods.length === 0) {
        return null;
      }

      // Check if any returned item matches the UPC/GTIN barcode
      const matchedFood =
        foods.find((f: any) => f.gtinUpc === barcode.trim()) || foods[0];

      return this.mapUsdaFoodToStandardized(matchedFood, barcode.trim());
    } catch (error: any) {
      this.logger.warn(`USDA fallback barcode lookup failed for ${barcode}: ${error?.message || error}`);
      return null;
    }
  }

  async searchByName(query: string): Promise<StandardizedFoodItem[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const sovereignMatches = this.searchSovereignStaples(query);

    try {
      const apiKey = this.getApiKey();
      const url = `${this.baseUrl}?query=${encodeURIComponent(query.trim())}&pageSize=10&api_key=${apiKey}`;

      const response = await axios.get(url, {
        timeout: this.timeoutMs,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const foods = response.data?.foods;
      const usdaResults: StandardizedFoodItem[] = [];

      if (Array.isArray(foods)) {
        for (const food of foods) {
          const item = this.mapUsdaFoodToStandardized(food);
          if (item) {
            usdaResults.push(item);
          }
        }
      }

      // Merge results: Sovereign matches take top priority for Italian staple foods,
      // followed by USDA FoodData Central items.
      const combined = [...sovereignMatches];
      for (const usda of usdaResults) {
        const alreadyExists = combined.some(
          (c) => c.name.toLowerCase() === usda.name.toLowerCase(),
        );
        if (!alreadyExists) {
          combined.push(usda);
        }
      }

      return combined.slice(0, 15);
    } catch (error: any) {
      this.logger.warn(`USDA FoodData Central API call failed or timed out for query "${query}": ${error?.message || error}. Falling back exclusively to Sovereign Italian Staples.`);
      return sovereignMatches;
    }
  }

  private mapUsdaFoodToStandardized(
    food: any,
    fallbackBarcode?: string,
  ): StandardizedFoodItem | null {
    if (!food) return null;

    const name = food.description || 'USDA Food Item';
    const brand = food.brandOwner || food.brandName || undefined;
    const barcode = food.gtinUpc || fallbackBarcode || undefined;

    let kcalPer100g = 0;
    let proteinPer100g = 0;
    let carbsPer100g = 0;
    let fatPer100g = 0;
    let fiberPer100g: number | undefined;

    const nutrients = food.foodNutrients;
    if (Array.isArray(nutrients)) {
      for (const n of nutrients) {
        const id = n.nutrientId ?? n.nutrientNumber;
        const nName = (n.nutrientName || '').toLowerCase();
        const value = Number(n.value ?? 0);

        // Energy: ID 1008 or nutrientNumber 208, or unit KCAL
        if (id === 1008 || id === '208' || (nName.includes('energy') && (n.unitName === 'KCAL' || !nName.includes('kj')))) {
          kcalPer100g = Math.round(value);
        } else if (id === 1003 || id === '203' || nName.includes('protein')) {
          proteinPer100g = Number(value.toFixed(1));
        } else if (id === 1005 || id === '205' || (nName.includes('carbohydrate') && !nName.includes('other'))) {
          carbsPer100g = Number(value.toFixed(1));
        } else if (id === 1004 || id === '204' || (nName.includes('lipid') || nName.includes('fat'))) {
          fatPer100g = Number(value.toFixed(1));
        } else if (id === 1079 || id === '291' || nName.includes('fiber')) {
          fiberPer100g = Number(value.toFixed(1));
        }
      }
    }

    return {
      barcode,
      name,
      brand,
      kcalPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      fiberPer100g,
      source: 'USDA_FALLBACK',
    };
  }
}

