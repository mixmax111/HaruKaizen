import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { FoodController } from './food/food.controller.js';
import { FoodService } from './food/food.service.js';
import { OpenFoodFactsService } from './food/openfoodfacts.service.js';
import { DietPlansController } from './diet-plans/diet-plans.controller.js';
import { DietPlansService } from './diet-plans/diet-plans.service.js';
import { NutritionLogsController } from './logs/nutrition-logs.controller.js';
import { NutritionLogsService } from './logs/nutrition-logs.service.js';

@Module({
  imports: [
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
  ],
  providers: [
    FoodService,
    OpenFoodFactsService,
    DietPlansService,
    NutritionLogsService,
  ],
  exports: [
    FoodService,
    DietPlansService,
    NutritionLogsService,
  ],
})
export class NutritionModule {}
