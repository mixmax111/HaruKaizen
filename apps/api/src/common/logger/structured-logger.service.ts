import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class StructuredLogger implements LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: !isProduction
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
    });
  }

  log(message: any, context?: string) {
    this.logger.info({ context }, typeof message === 'object' ? JSON.stringify(message) : message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, typeof message === 'object' ? JSON.stringify(message) : message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, typeof message === 'object' ? JSON.stringify(message) : message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, typeof message === 'object' ? JSON.stringify(message) : message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, typeof message === 'object' ? JSON.stringify(message) : message);
  }
}
