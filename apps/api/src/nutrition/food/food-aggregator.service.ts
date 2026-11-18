import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OpenFoodFactsService } from './openfoodfacts.service.js';
import { UsdaFallbackService } from './usda-fallback.service.js';
import { StandardizedFoodItem } from './food-provider.interface.js';

export interface AggregatedFoodResult extends StandardizedFoodItem {
  id?: string;
  calories100g: number;
  isVerified?: boolean;
}

@Injectable()
export class FoodAggregatorService {
  private readonly logger = new Logger(FoodAggregatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly offService: OpenFoodFactsService,
    private readonly usdaFallbackService: UsdaFallbackService,
  ) {}

  /**
   * 3-Tier Barcode Lookup Pipeline:
   * 1. Tier 1: Local PostgreSQL FoodItem (utente o globale in cache < 30gg)
   * 2. Tier 2: Open Food Facts API v3 (persisted to DB on hit come riga globale userId=null)
   * 3. Tier 3: USDA FoodData Central / Sovereign Fallback
   */
  async findByBarcode(barcode: string, userId?: string): Promise<AggregatedFoodResult | null> {
    if (!barcode || !barcode.trim()) {
      return null;
    }
    const cleanBarcode = barcode.trim();

    // ----------------------------------------------------
    // Tier 1: Local PostgreSQL DB
    // Ordine di precedenza: copia utente (userId valorizzato) > globale (userId null)
    // ----------------------------------------------------
    const localItem = await this.prisma.foodItem.findFirst({
      where: {
        barcode: cleanBarcode,
        deletedAt: null,
        ...(userId ? { OR: [{ userId }, { userId: null }] } : { userId: null }),
      },
      orderBy: { userId: 'desc' }, // Copia utente prima della globale
    });

    if (localItem) {
      // Se è un alimento modificato dall'utente o con cache fresca (<30gg), ritorna subito
      const isFresh =
        localItem.isUserEdited ||
        !localItem.fetchedAt ||
        Date.now() - new Date(localItem.fetchedAt).getTime() < 30 * 24 * 60 * 60 * 1000;

      if (isFresh) {
        this.logger.log(`[Tier 1 Hit] Barcode ${cleanBarcode} trovato in cache locale PostgreSQL.`);
        return this.mapLocalToAggregated(localItem, 'LOCAL_DB');
      }
    }

    // ----------------------------------------------------
    // Tier 2: Open Food Facts API v3
    // ----------------------------------------------------
    this.logger.log(`[Tier 1 Miss/Stale] Querying Tier 2 (Open Food Facts v3) for barcode ${cleanBarcode}...`);
    try {
      const offItem = await this.offService.fetchByBarcode(cleanBarcode);
      if (offItem) {
        this.logger.log(`[Tier 2 Hit] Product found in Open Food Facts v3: "${offItem.name}". Upserting to PostgreSQL...`);
        const persisted = await this.upsertFoodItem(offItem);
        return this.mapLocalToAggregated(persisted, 'OPENFOODFACTS_V3', offItem.imageUrl);
      }
    } catch (error: any) {
      this.logger.warn(`Tier 2 (Open Food Facts v3) failed for barcode ${cleanBarcode}: ${error?.message || error}`);
    }

    // ----------------------------------------------------
    // Tier 3: USDA FoodData Central / Sovereign Fallback
    // ----------------------------------------------------
    this.logger.log(`[Tier 2 Miss] Querying Tier 3 (USDA Fallback) for barcode ${cleanBarcode}...`);
    try {
      const usdaItem = await this.usdaFallbackService.fetchByBarcode(cleanBarcode);
      if (usdaItem) {
        this.logger.log(`[Tier 3 Hit] Product found in USDA Fallback: "${usdaItem.name}". Upserting to PostgreSQL...`);
        const persisted = await this.upsertFoodItem(usdaItem);
        return this.mapLocalToAggregated(persisted, 'USDA_FALLBACK');
      }
    } catch (error: any) {
      this.logger.warn(`Tier 3 (USDA Fallback) failed for barcode ${cleanBarcode}: ${error?.message || error}`);
    }

    this.logger.warn(`[Tier 3 Miss] Barcode ${cleanBarcode} non trovato nei provider.`);
    return null;
  }

  /**
   * 3-Tier Text Search Pipeline:
   * 1. Query Local PostgreSQL FoodItems
   * 2. If results < 5, query Tier 2 (OFF v3) and Tier 3 (USDA / Sovereign Staples)
   * 3. Merge, deduplicate, and persist new items
   */
  async search(query: string): Promise<AggregatedFoodResult[]> {
    if (!query || !query.trim()) {
      return [];
    }
    const cleanQuery = query.trim();

    // 1. Tier 1: Local PostgreSQL search
    const localItems = await this.prisma.foodItem.findMany({
      where: {
        name: {
          contains: cleanQuery,
          mode: 'insensitive',
        },
      },
      take: 20,
    });

    const results: AggregatedFoodResult[] = localItems.map((item) =>
      this.mapLocalToAggregated(item, 'LOCAL_DB'),
    );

    // If local results are sufficient (>= 5), return immediately
    if (results.length >= 5) {
      return results;
    }

    // 2. Query Tier 2 & Tier 3 in parallel or sequential fallback
    const [offResults, usdaResults] = await Promise.all([
      this.offService.searchByName(cleanQuery).catch((err) => {
        this.logger.warn(`Tier 2 search failed for "${cleanQuery}": ${err?.message || err}`);
        return [] as StandardizedFoodItem[];
      }),
      this.usdaFallbackService.searchByName(cleanQuery).catch((err) => {
        this.logger.warn(`Tier 3 search failed for "${cleanQuery}": ${err?.message || err}`);
        return [] as StandardizedFoodItem[];
      }),
    ]);

    const externalItems = [...offResults, ...usdaResults];

    for (const extItem of externalItems) {
      // Check if item name already exists in current results
      const exists = results.some(
        (r) =>
          r.name.toLowerCase() === extItem.name.toLowerCase() ||
          (extItem.barcode && r.barcode === extItem.barcode),
      );

      if (!exists) {
        // Persist discovered item so it becomes available locally
        try {
          const persisted = await this.upsertFoodItem(extItem);
          results.push(
            this.mapLocalToAggregated(persisted, extItem.source, extItem.imageUrl),
          );
        } catch (error: any) {
          // If upsert fails (e.g. concurrent conflict), still include in response
          results.push({
            ...extItem,
            calories100g: extItem.kcalPer100g,
          });
        }
      }
    }

    return results.slice(0, 20);
  }

  /**
   * Persist or update food item in local PostgreSQL database as a global provider record.
   * Protetto da override utente: non sovrascrive MAI record con isUserEdited = true.
   */
  async upsertFoodItem(item: StandardizedFoodItem) {
    const now = new Date();
    const source = item.source || 'OPEN_FOOD_FACTS';

    if (item.barcode) {
      // Cerca riga globale per barcode (userId null)
      const existing = await this.prisma.foodItem.findFirst({
        where: {
          barcode: item.barcode,
          userId: null,
          deletedAt: null,
        },
      });

      if (existing) {
        // Se la riga globale è stata in qualche modo marcata modificata, non sovrascrivere
        if (existing.isUserEdited) {
          return existing;
        }

        return this.prisma.foodItem.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            calories100g: item.kcalPer100g,
            protein100g: item.proteinPer100g,
            carbs100g: item.carbsPer100g,
            fat100g: item.fatPer100g,
            fiber100g: item.fiberPer100g ?? null,
            sodium100g: item.sodium100g ?? null,
            source,
            externalId: item.barcode,
            fetchedAt: now,
          },
        });
      }

      try {
        return await this.prisma.foodItem.create({
          data: {
            userId: null, // Globale
            name: item.name,
            barcode: item.barcode,
            calories100g: item.kcalPer100g,
            protein100g: item.proteinPer100g,
            carbs100g: item.carbsPer100g,
            fat100g: item.fatPer100g,
            fiber100g: item.fiberPer100g ?? null,
            sodium100g: item.sodium100g ?? null,
            isVerified: false,
            isUserEdited: false,
            source,
            externalId: item.barcode,
            fetchedAt: now,
          },
        });
      } catch (err: any) {
        // Gestione race condition concorrente via indice univoco parziale Postgres
        if (err.code === 'P2002' || err.message?.includes('unique_global_source_external_id')) {
          this.logger.warn(`Concorrenza rilevata per barcode ${item.barcode}: recupero record vincente.`);
          const winner = await this.prisma.foodItem.findFirst({
            where: {
              source,
              externalId: item.barcode,
              userId: null,
              deletedAt: null,
            },
          });
          if (winner) return winner;
        }
        throw err;
      }
    }

    // Se l'alimento non ha barcode, cerca riga globale per nome
    const existingByName = await this.prisma.foodItem.findFirst({
      where: {
        userId: null,
        name: { equals: item.name, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existingByName) {
      return existingByName;
    }

    return this.prisma.foodItem.create({
      data: {
        userId: null, // Globale
        name: item.name,
        calories100g: item.kcalPer100g,
        protein100g: item.proteinPer100g,
        carbs100g: item.carbsPer100g,
        fat100g: item.fatPer100g,
        fiber100g: item.fiberPer100g ?? null,
        sodium100g: item.sodium100g ?? null,
        isVerified: false,
        isUserEdited: false,
        source,
        fetchedAt: now,
      },
    });
  }

  private mapLocalToAggregated(
    item: any,
    source: 'LOCAL_DB' | 'OPENFOODFACTS_V3' | 'USDA_FALLBACK',
    imageUrl?: string,
  ): AggregatedFoodResult {
    return {
      id: item.id,
      barcode: item.barcode ?? undefined,
      name: item.name,
      kcalPer100g: item.calories100g,
      calories100g: item.calories100g,
      proteinPer100g: item.protein100g,
      carbsPer100g: item.carbsPer100g,
      fatPer100g: item.fat100g,
      fiberPer100g: item.fiber100g ?? undefined,
      sodium100g: item.sodium100g ?? undefined,
      isVerified: item.isVerified,
      imageUrl,
      source,
    };
  }
}

