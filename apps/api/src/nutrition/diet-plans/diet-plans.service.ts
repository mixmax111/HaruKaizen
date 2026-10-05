import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto.js';

@Injectable()
export class DietPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDietPlanDto) {
    return this.prisma.$transaction(async (tx) => {
      // Se il nuovo piano è impostato come attivo, disattiva gli altri piani dell'utente
      if (dto.isActive) {
        await tx.dietPlan.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.dietPlan.create({
        data: {
          userId,
          name: dto.name,
          isActive: dto.isActive ?? true,
          isPublic: dto.isPublic ?? false,
          dietDays: {
            create: dto.dietDays.map((day) => ({
              name: day.name,
              dietDayItems: {
                create: day.dietDayItems.map((item) => ({
                  foodItemId: item.foodItemId,
                  scheduledTime: item.scheduledTime,
                  mealType: item.mealType,
                  quantityG: item.quantityG,
                })),
              },
            })),
          },
        },
        include: {
          dietDays: {
            include: {
              dietDayItems: {
                include: { foodItem: true },
              },
            },
          },
        },
      });
    });
  }

  async findAll(userId: string) {
    return this.prisma.dietPlan.findMany({
      where: {
        deletedAt: null,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        dietDays: {
          include: {
            dietDayItems: {
              include: { foodItem: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const plan = await this.prisma.dietPlan.findUnique({
      where: { id },
      include: {
        dietDays: {
          include: {
            dietDayItems: {
              include: { foodItem: true },
            },
          },
        },
      },
    });

    if (!plan || plan.deletedAt) {
      throw new NotFoundException('Piano alimentare non trovato.');
    }

    if (plan.userId !== userId && !plan.isPublic) {
      throw new ForbiddenException('Non hai accesso a questo piano.');
    }

    return plan;
  }

  async activate(userId: string, id: string) {
    const plan = await this.prisma.dietPlan.findUnique({ where: { id } });
    if (!plan || plan.deletedAt) throw new NotFoundException('Piano alimentare non trovato.');
    if (plan.userId !== userId) throw new ForbiddenException('Non puoi modificare questo piano.');

    return this.prisma.$transaction(async (tx) => {
      await tx.dietPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      return tx.dietPlan.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  async remove(userId: string, id: string) {
    const plan = await this.prisma.dietPlan.findUnique({ where: { id } });
    if (!plan || plan.deletedAt) throw new NotFoundException('Piano alimentare non trovato.');
    if (plan.userId !== userId) throw new ForbiddenException('Non puoi cancellare questo piano.');

    return this.prisma.dietPlan.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
