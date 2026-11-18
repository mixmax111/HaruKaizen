import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FoodAggregatorService } from './food-aggregator.service.js';
import {
  CreateFoodItemDto,
  UpdateFoodItemDto,
  SyncProviderReferenceDto,
} from './dto/create-food-item.dto.js';

@Injectable()
export class FoodService {
  private readonly CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: FoodAggregatorService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private clampClientUpdatedAt(clientUpdatedAt?: string | Date | null): Date {
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 5 * 60 * 1000);
    if (!clientUpdatedAt) return now;

    const parsed = new Date(clientUpdatedAt);
    if (isNaN(parsed.getTime())) return now;
    return parsed.getTime() > maxFuture.getTime() ? maxFuture : parsed;
  }

  async findByBarcode(barcode: string, userId?: string) {
    const cacheKey = `food:barcode:${barcode}:${userId || 'anon'}`;

    // 1. Controlla Cache L1 (Redis)
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Pipeline a 3 livelli con priorità copia CoW utente
    const foodItem = await this.aggregator.findByBarcode(barcode, userId);

    if (foodItem) {
      await this.cacheManager.set(cacheKey, foodItem, this.CACHE_TTL_MS);
      return foodItem;
    }

    throw new NotFoundException(`Alimento con barcode ${barcode} non trovato.`);
  }

  async search(query: string) {
    return this.aggregator.search(query);
  }

  async findById(id: string, userId?: string) {
    const item = await this.prisma.foodItem.findUnique({ where: { id } });
    if (!item || item.deletedAt) throw new NotFoundException('Alimento non trovato.');
    if (item.userId && userId && item.userId !== userId) {
      throw new ForbiddenException('Non autorizzato alla visualizzazione di questo alimento.');
    }
    return item;
  }

  /**
   * Crea un alimento personalizzato (es. Manual Quick Add o scansione offline).
   */
  async create(userId: string, dto: CreateFoodItemDto) {
    const safeTime = this.clampClientUpdatedAt(dto.clientUpdatedAt);

    // Idempotenza offline via clientSideId
    if (dto.clientSideId) {
      const existing = await this.prisma.foodItem.findUnique({
        where: {
          userId_clientSideId: {
            userId,
            clientSideId: dto.clientSideId,
          },
        },
      });

      if (existing) {
        if (existing.clientUpdatedAt && safeTime < existing.clientUpdatedAt) {
          return { status: 'REJECTED_STALE', winner: existing };
        }

        const updated = await this.prisma.foodItem.update({
          where: { id: existing.id },
          data: {
            name: dto.name,
            barcode: dto.barcode,
            calories100g: dto.calories100g,
            protein100g: dto.protein100g,
            carbs100g: dto.carbs100g,
            fat100g: dto.fat100g,
            fiber100g: dto.fiber100g,
            sodium100g: dto.sodium100g,
            servingSizeG: dto.servingSizeG,
            deletedAt: null,
            clientUpdatedAt: safeTime,
          },
        });
        return { status: 'APPLIED', data: updated };
      }
    }

    const foodItem = await this.prisma.foodItem.create({
      data: {
        userId,
        name: dto.name,
        barcode: dto.barcode,
        calories100g: dto.calories100g,
        protein100g: dto.protein100g,
        carbs100g: dto.carbs100g,
        fat100g: dto.fat100g,
        fiber100g: dto.fiber100g,
        sodium100g: dto.sodium100g,
        servingSizeG: dto.servingSizeG,
        isVerified: false,
        isUserEdited: true,
        source: dto.source || 'MANUAL_QUICK',
        clientSideId: dto.clientSideId,
        clientUpdatedAt: safeTime,
      },
    });

    if (dto.barcode) {
      await this.cacheManager.set(`food:barcode:${dto.barcode}:${userId}`, foodItem, this.CACHE_TTL_MS);
    }

    return { status: 'APPLIED', data: foodItem };
  }

  /**
   * Copy-on-Write: Se l'utente modifica un alimento globale (userId=null),
   * crea una copia privata (userId=user.id) con basedOnId, lasciando l'originale intatto.
   */
  async copyOnWrite(userId: string, foodItemId: string, dto: UpdateFoodItemDto) {
    const original = await this.prisma.foodItem.findUnique({
      where: { id: foodItemId },
    });

    if (!original || original.deletedAt) {
      throw new NotFoundException('Alimento non trovato.');
    }

    const safeTime = this.clampClientUpdatedAt(dto.clientUpdatedAt);

    // Caso A: L'alimento è già una copia privata dell'utente
    if (original.userId === userId) {
      if (original.clientUpdatedAt && safeTime < original.clientUpdatedAt) {
        return { status: 'REJECTED_STALE', winner: original };
      }

      const updated = await this.prisma.foodItem.update({
        where: { id: original.id },
        data: {
          name: dto.name ?? original.name,
          calories100g: dto.calories100g ?? original.calories100g,
          protein100g: dto.protein100g ?? original.protein100g,
          carbs100g: dto.carbs100g ?? original.carbs100g,
          fat100g: dto.fat100g ?? original.fat100g,
          fiber100g: dto.fiber100g !== undefined ? dto.fiber100g : original.fiber100g,
          sodium100g: dto.sodium100g !== undefined ? dto.sodium100g : original.sodium100g,
          servingSizeG: dto.servingSizeG !== undefined ? dto.servingSizeG : original.servingSizeG,
          isUserEdited: true,
          clientUpdatedAt: safeTime,
        },
      });

      return { status: 'APPLIED', data: updated };
    }

    // Caso B: L'alimento appartiene a un altro utente privato
    if (original.userId !== null && original.userId !== userId) {
      throw new ForbiddenException('Non puoi modificare un alimento privato di un altro utente.');
    }

    // Caso C: L'alimento è globale (userId === null). Creiamo un clone CoW!
    const clone = await this.prisma.foodItem.create({
      data: {
        userId,
        name: dto.name ?? original.name,
        barcode: original.barcode,
        calories100g: dto.calories100g ?? original.calories100g,
        protein100g: dto.protein100g ?? original.protein100g,
        carbs100g: dto.carbs100g ?? original.carbs100g,
        fat100g: dto.fat100g ?? original.fat100g,
        fiber100g: dto.fiber100g !== undefined ? dto.fiber100g : original.fiber100g,
        sodium100g: dto.sodium100g !== undefined ? dto.sodium100g : original.sodium100g,
        servingSizeG: dto.servingSizeG !== undefined ? dto.servingSizeG : original.servingSizeG,
        isVerified: false,
        isUserEdited: true,
        basedOnId: original.id,
        source: 'LOCAL',
        externalId: original.externalId || original.barcode,
        clientSideId: dto.clientSideId,
        clientUpdatedAt: safeTime,
      },
    });

    return { status: 'APPLIED', data: clone };
  }

  /**
   * Ripristina un alimento CoW alla sua versione globale originale.
   */
  async restoreOriginal(userId: string, foodItemId: string) {
    const userCopy = await this.prisma.foodItem.findUnique({
      where: { id: foodItemId },
    });

    if (!userCopy || userCopy.deletedAt) {
      throw new NotFoundException('Alimento non trovato.');
    }
    if (userCopy.userId !== userId) {
      throw new ForbiddenException('Non autorizzato.');
    }
    if (!userCopy.basedOnId) {
      throw new BadRequestException('Questo alimento non è una copia modificata di un alimento originale.');
    }

    const original = await this.prisma.foodItem.findUnique({
      where: { id: userCopy.basedOnId },
    });

    if (!original || original.deletedAt) {
      throw new NotFoundException('L’alimento originale non esiste più.');
    }

    // Soft delete della copia utente
    await this.prisma.foodItem.update({
      where: { id: foodItemId },
      data: { deletedAt: new Date() },
    });

    return { success: true, restoredOriginal: original };
  }

  /**
   * Sincronizzazione Riferimento Provider (Client -> Server):
   * Se il client mobile individua un prodotto OFF, invia solo (source, externalId).
   * Il server crea o ritorna la riga globale userId=null.
   */
  async syncProviderReference(userId: string, dto: SyncProviderReferenceDto) {
    if (!dto.externalId) {
      throw new BadRequestException('externalId obbligatorio.');
    }

    // 1. Cerca riga globale esistente
    const existing = await this.prisma.foodItem.findFirst({
      where: {
        source: dto.source,
        externalId: dto.externalId,
        userId: null,
        deletedAt: null,
      },
    });

    if (existing) {
      return existing;
    }

    // 2. Se non esiste, chiama il provider lato server
    if (dto.source === 'OPEN_FOOD_FACTS' || dto.source === 'OPENFOODFACTS_V3') {
      const offItem = await this.aggregator.findByBarcode(dto.externalId);
      if (offItem?.id) {
        return this.prisma.foodItem.findUnique({ where: { id: offItem.id } });
      }
    }

    throw new NotFoundException(`Impossibile risolvere il riferimento esterno: ${dto.source}:${dto.externalId}`);
  }

  /**
   * Job di refresh periodico della cache (30 giorni):
   * Aggiorna solo gli alimenti globali dei provider (userId = null) la cui data fetchedAt
   * è più vecchia di 30 giorni, senza MAI sovrascrivere o alterare le copie personalizzate degli utenti (CoW).
   */
  async refreshStaleGlobalFoods(limit = 50): Promise<{ refreshed: number; skippedUserCopies: number }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const staleGlobalItems = await this.prisma.foodItem.findMany({
      where: {
        userId: null,
        isUserEdited: false,
        deletedAt: null,
        fetchedAt: { lte: thirtyDaysAgo },
      },
      take: limit,
    });

    let refreshed = 0;
    for (const item of staleGlobalItems) {
      if (item.barcode) {
        try {
          const offItem = await this.aggregator.findByBarcode(item.barcode);
          if (offItem) {
            refreshed++;
          }
        } catch {
          // Ignora fallimenti su singoli provider esterni
        }
      }
    }

    const skippedUserCopies = await this.prisma.foodItem.count({
      where: {
        userId: { not: null },
        deletedAt: null,
      },
    });

    return { refreshed, skippedUserCopies };
  }
}
