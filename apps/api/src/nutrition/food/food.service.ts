import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OpenFoodFactsService } from './openfoodfacts.service.js';
import { CreateFoodItemDto } from './dto/create-food-item.dto.js';

@Injectable()
export class FoodService {
  private readonly CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni in ms

  constructor(
    private readonly prisma: PrismaService,
    private readonly offService: OpenFoodFactsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async findByBarcode(barcode: string) {
    const cacheKey = `food:barcode:${barcode}`;

    // 1. Controlla Cache L1 (Redis)
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Controlla DB locale PostgreSQL
    let foodItem = await this.prisma.foodItem.findUnique({
      where: { barcode },
    });

    if (foodItem) {
      await this.cacheManager.set(cacheKey, foodItem, this.CACHE_TTL_MS);
      return foodItem;
    }

    // 3. Fallback su OpenFoodFacts API
    const offProduct = await this.offService.fetchByBarcode(barcode);
    if (offProduct) {
      foodItem = await this.prisma.foodItem.create({
        data: {
          name: offProduct.name,
          barcode: offProduct.barcode,
          calories100g: offProduct.calories100g,
          protein100g: offProduct.protein100g,
          carbs100g: offProduct.carbs100g,
          fat100g: offProduct.fat100g,
          fiber100g: offProduct.fiber100g,
          sodium100g: offProduct.sodium100g,
          isVerified: false,
        },
      });

      await this.cacheManager.set(cacheKey, foodItem, this.CACHE_TTL_MS);
      return foodItem;
    }

    throw new NotFoundException(`Alimento con barcode ${barcode} non trovato.`);
  }

  async search(query: string) {
    return this.prisma.foodItem.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 20,
    });
  }

  async create(dto: CreateFoodItemDto) {
    const foodItem = await this.prisma.foodItem.create({
      data: {
        name: dto.name,
        barcode: dto.barcode,
        calories100g: dto.calories100g,
        protein100g: dto.protein100g,
        carbs100g: dto.carbs100g,
        fat100g: dto.fat100g,
        fiber100g: dto.fiber100g,
        sodium100g: dto.sodium100g,
        isVerified: false, // Creato da utente: visibile globalmente con isVerified: false (A1)
      },
    });

    if (dto.barcode) {
      await this.cacheManager.set(`food:barcode:${dto.barcode}`, foodItem, this.CACHE_TTL_MS);
    }

    return foodItem;
  }

  async findById(id: string) {
    const item = await this.prisma.foodItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Alimento non trovato.');
    return item;
  }
}
