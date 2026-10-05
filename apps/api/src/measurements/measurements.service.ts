import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMeasurementDto } from './dto/create-measurement.dto.js';
import { UpdateMeasurementDto } from './dto/update-measurement.dto.js';

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMeasurementDto) {
    return this.prisma.measurement.create({
      data: {
        userId,
        weightKg:          dto.weightKg,
        bodyFatPercentage: dto.bodyFatPercentage,
        chestCm:           dto.chestCm,
        armsCm:            dto.armsCm,
        waistCm:           dto.waistCm,
        legsCm:            dto.legsCm,
        recordedAt:        new Date(dto.recordedAt),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.measurement.findMany({
      where: { userId, deletedAt: null },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async findLatest(userId: string, limit = 3) {
    return this.prisma.measurement.findMany({
      where: { userId, deletedAt: null },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  async update(userId: string, id: string, dto: UpdateMeasurementDto) {
    await this.ensureOwnership(userId, id);

    return this.prisma.measurement.update({
      where: { id },
      data: {
        ...(dto.weightKg          !== undefined && { weightKg: dto.weightKg }),
        ...(dto.bodyFatPercentage !== undefined && { bodyFatPercentage: dto.bodyFatPercentage }),
        ...(dto.chestCm           !== undefined && { chestCm: dto.chestCm }),
        ...(dto.armsCm            !== undefined && { armsCm: dto.armsCm }),
        ...(dto.waistCm           !== undefined && { waistCm: dto.waistCm }),
        ...(dto.legsCm            !== undefined && { legsCm: dto.legsCm }),
        ...(dto.recordedAt        !== undefined && { recordedAt: new Date(dto.recordedAt) }),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);

    return this.prisma.measurement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureOwnership(userId: string, id: string): Promise<void> {
    const measurement = await this.prisma.measurement.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!measurement) throw new NotFoundException('Misurazione non trovata.');
    if (measurement.userId !== userId) {
      throw new ForbiddenException('Non puoi modificare questa misurazione.');
    }
  }
}

