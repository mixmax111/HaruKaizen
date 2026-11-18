import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NutritionLogsService } from './nutrition-logs.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('NutritionLogsService', () => {
  let service: NutritionLogsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      foodItem: {
        findUnique: vi.fn(),
      },
      nutritionLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    service = new NutritionLogsService(mockPrisma as unknown as PrismaService);
  });

  it('should accurately calculate proportional macros for a 150g portion', async () => {
    mockPrisma.foodItem.findUnique.mockResolvedValueOnce({
      id: 'food-1',
      name: 'Pollo Petto',
      calories100g: 120,
      protein100g: 24,
      carbs100g: 0,
      fat100g: 2.5,
    });

    mockPrisma.nutritionLog.create.mockImplementationOnce((args: any) => Promise.resolve(args.data));

    const result = await service.create('user-1', {
      foodItemId: 'food-1',
      loggedAt: '2026-10-04T12:00:00Z',
      mealType: 'LUNCH',
      quantityG: 150,
    });

    // 150g -> ratio 1.5
    expect(result.data.caloriesConsumed).toBe(180); // 120 * 1.5
    expect(result.data.proteinConsumed).toBe(36);    // 24 * 1.5
    expect(result.data.carbsConsumed).toBe(0);
    expect(result.data.fatConsumed).toBe(3.8);      // 2.5 * 1.5 = 3.75 -> round to 3.8
  });
});
