import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { validateEnv } from './config/env.validation.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { MeasurementsModule } from './measurements/measurements.module.js';
import { NutritionModule } from './nutrition/nutrition.module.js';
import { WorkoutModule } from './workout/workout.module.js';
import { AiModule } from './ai/ai.module.js';
import { MediaModule } from './media/media.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';

@Module({
  imports: [
    // ── Infrastruttura ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,    // Database (globale)
    CryptoModule,    // AES-256-GCM (usato da SettingsModule)

    // ── Sprint 1 — Auth & Core ──────────────────────────────────────────
    AuthModule,
    UsersModule,
    SettingsModule,
    MeasurementsModule,

    // ── Sprint 2 — Nutrizione ─────────────────────────────────────────
    NutritionModule,

    // ── Sprint 3 — Allenamento ────────────────────────────────────────
    WorkoutModule,

    // ── Sprint 4 — AI Engine ──────────────────────────────────────────
    AiModule,

    // ── Sprint 5 — Media & Progress Tracking ──────────────────────────
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
