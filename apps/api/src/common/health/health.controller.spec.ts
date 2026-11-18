import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
  let controller: HealthController;
  let mockPrisma: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    mockConfig = {
      get: vi.fn().mockReturnValue('redis://127.0.0.1:6379'),
    };

    controller = new HealthController(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
    );
  });

  it('should return live PostgreSQL and Redis runtime telemetry', async () => {
    const res = await controller.check();

    expect(res.status).toBe('ok');
    expect(res.dbEngine).toBe('PostgreSQL 17 (Prisma 7)');
    expect(res.dbStatus).toBe('CONNECTED');
    expect(typeof res.dbLatencyMs).toBe('number');
    expect(typeof res.redisStatus).toBe('string');
    expect(typeof res.uptimeSeconds).toBe('number');
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });

  it('should handle database disconnection gracefully without throwing', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await controller.check();

    expect(res.status).toBe('ok');
    expect(res.dbStatus).toBe('DISCONNECTED');
  });
});

