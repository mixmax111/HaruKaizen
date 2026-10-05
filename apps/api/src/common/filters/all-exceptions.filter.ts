import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Errore interno del server';
    let code    = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status  = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string'
        ? res
        : (res as Record<string, unknown>).message as string ?? exception.message;
      code = `HTTP_${status}`;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status  = HttpStatus.CONFLICT;
          message = `Il campo '${(exception.meta?.target as string[])?.join(', ')}' è già in uso.`;
          code    = 'UNIQUE_CONSTRAINT';
          break;
        case 'P2025':
          status  = HttpStatus.NOT_FOUND;
          message = 'Risorsa non trovata.';
          code    = 'NOT_FOUND';
          break;
        case 'P2003':
          status  = HttpStatus.BAD_REQUEST;
          message = 'Riferimento a una risorsa non esistente.';
          code    = 'FOREIGN_KEY_VIOLATION';
          break;
        default:
          status  = HttpStatus.BAD_REQUEST;
          message = `Errore database: ${exception.code}`;
          code    = `PRISMA_${exception.code}`;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `[${request.method}] ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      error: {
        code,
        message,
        path:      request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
