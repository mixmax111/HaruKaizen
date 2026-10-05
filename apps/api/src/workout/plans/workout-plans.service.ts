import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto.js';

@Injectable()
export class WorkoutPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkoutPlanDto) {
    return this.prisma.$transaction(async (tx) => {
      // Se impostato come attivo, disattiva le altre schede dell'utente (A2)
      if (dto.isActive) {
        await tx.workoutPlan.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.workoutPlan.create({
        data: {
          userId,
          name: dto.name,
          isActive: dto.isActive ?? true,
          isPublic: dto.isPublic ?? false,
          workoutDays: {
            create: dto.workoutDays.map((day) => ({
              name: day.name,
              orderIndex: day.orderIndex,
              exercises: {
                create: day.exercises.map((ex) => ({
                  exerciseId: ex.exerciseId,
                  orderIndex: ex.orderIndex,
                  sets: ex.sets,
                  repsTarget: ex.repsTarget,
                  weightTarget: ex.weightTarget,
                  restSeconds: ex.restSeconds,
                  notes: ex.notes,
                })),
              },
            })),
          },
        },
        include: {
          workoutDays: {
            include: {
              exercises: {
                include: { exercise: true },
              },
            },
          },
        },
      });
    });
  }

  async findAll(userId: string) {
    return this.prisma.workoutPlan.findMany({
      where: {
        deletedAt: null,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        workoutDays: {
          include: {
            exercises: {
              include: { exercise: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
      include: {
        workoutDays: {
          include: {
            exercises: {
              include: { exercise: true },
            },
          },
        },
      },
    });

    if (!plan || plan.deletedAt) {
      throw new NotFoundException('Scheda di allenamento non trovata.');
    }

    if (plan.userId !== userId && !plan.isPublic) {
      throw new ForbiddenException('Non hai accesso a questa scheda.');
    }

    return plan;
  }

  async activate(userId: string, id: string) {
    const plan = await this.prisma.workoutPlan.findUnique({ where: { id } });
    if (!plan || plan.deletedAt) throw new NotFoundException('Scheda non trovata.');
    if (plan.userId !== userId) throw new ForbiddenException('Non puoi modificare questa scheda.');

    return this.prisma.$transaction(async (tx) => {
      await tx.workoutPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      return tx.workoutPlan.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  async remove(userId: string, id: string) {
    const plan = await this.prisma.workoutPlan.findUnique({ where: { id } });
    if (!plan || plan.deletedAt) throw new NotFoundException('Scheda non trovata.');
    if (plan.userId !== userId) throw new ForbiddenException('Non puoi eliminare questa scheda.');

    return this.prisma.workoutPlan.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
