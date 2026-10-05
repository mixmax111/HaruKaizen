import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { StructuredLogger } from './common/logger/structured-logger.service.js';

async function bootstrap() {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.use(helmet());
  app.use(cookieParser());

  // CORS limitato alla variabile d'ambiente WEB_ORIGIN e client mobile nativi (senza origin)
  const allowedWebOrigin = process.env.WEB_ORIGIN || 'http://localhost:3001';
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Consenti richieste senza origin (app mobile Expo, curl, Docker probes) o provenienti dal frontend autorizzato
      if (
        !origin ||
        origin === allowedWebOrigin ||
        origin === 'http://localhost:3000' ||
        origin === 'http://localhost:3001' ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origine bloccata dalle policy CORS: ${origin}`));
      }
    },
    credentials: true,
  });

  // Global Versioning: /api/v1/
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(
    `🚀 HaruKaizen API pronta su: http://localhost:${port}/api/v1 (Healthcheck: http://localhost:${port}/api/v1/health)`,
    'Bootstrap',
  );
}

await bootstrap();

