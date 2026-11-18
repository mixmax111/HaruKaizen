import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CryptoModule } from '../crypto/crypto.module.js';

import { FoodController } from './food/food.controller.js';
import { FoodService } from './food/food.service.js';
import { OpenFoodFactsService } from './food/openfoodfacts.service.js';
import { UsdaFallbackService } from './food/usda-fallback.service.js';
import { FoodAggregatorService } from './food/food-aggregator.service.js';

import { DietPlansController } from './diet-plans/diet-plans.controller.js';
import { DietPlansService } from './diet-plans/diet-plans.service.js';

import { NutritionLogsController } from './logs/nutrition-logs.controller.js';
import { NutritionLogsService } from './logs/nutrition-logs.service.js';

import { MealSlotsController } from './meal-slots/meal-slots.controller.js';
import { MealSlotsService } from './meal-slots/meal-slots.service.js';

import { RecipesController } from './recipes/recipes.controller.js';
import { RecipesService } from './recipes/recipes.service.js';

import { AiNutritionController } from './ai/ai-nutrition.controller.js';
import { AiNutritionService } from './ai/ai-nutrition.service.js';

@Module({
  imports: [
    CryptoModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const keyvRedis = new KeyvRedis(redisUrl);
        const keyv = new Keyv({ store: keyvRedis });
        return {
          stores: [keyv],
        };
      },
    }),
  ],
  controllers: [
    FoodController,
    DietPlansController,
    NutritionLogsController,
    MealSlotsController,
    RecipesController,
    AiNutritionController,
  ],
  providers: [
    FoodService,
    OpenFoodFactsService,
    UsdaFallbackService,
    FoodAggregatorService,
    DietPlansService,
    NutritionLogsService,
    MealSlotsService,
    RecipesService,
    AiNutritionService,
  ],
  exports: [
    FoodService,
    OpenFoodFactsService,
    UsdaFallbackService,
    FoodAggregatorService,
    DietPlansService,
    NutritionLogsService,
    MealSlotsService,
    RecipesService,
    AiNutritionService,
  ],
})
export class NutritionModule {}
