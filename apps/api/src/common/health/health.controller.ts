import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators/public.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import net from 'net';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  async check() {
    const start = performance.now();
    let dbStatus = 'CONNECTED';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'DISCONNECTED';
    }

    const dbLatencyMs = +(performance.now() - start).toFixed(2);
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const redisStatus = await this.checkRedisConnection(redisUrl);

    return {
      status: 'ok',
      dbEngine: 'PostgreSQL 17 (Prisma 7)',
      dbStatus,
      dbLatencyMs,
      redisStatus,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkRedisConnection(url: string): Promise<'CONNECTED' | 'DEGRADED'> {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname || 'localhost';
        const port = Number(parsed.port) || 6379;

        const socket = new net.Socket();
        socket.setTimeout(150);

        socket.on('connect', () => {
          socket.destroy();
          resolve('CONNECTED');
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve('DEGRADED');
        });

        socket.on('error', () => {
          socket.destroy();
          resolve('DEGRADED');
        });

        socket.connect(port, host);
      } catch {
        resolve('DEGRADED');
      }
    });
  }
}
