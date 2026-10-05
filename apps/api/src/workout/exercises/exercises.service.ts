import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateExerciseDto } from './dto/create-exercise.dto.js';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateExerciseDto) {
    return this.prisma.exercise.create({
      data: {
        name: dto.name,
        category: dto.category,
        equipment: dto.equipment,
        defaultMetValue: dto.defaultMetValue,
        createdByUserId: userId,
        isVerified: false,
      },
    });
  }

  async findAll(category?: string) {
    return this.prisma.exercise.findMany({
      where: {
        deletedAt: null,
        ...(category && { category }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
    });
    if (!exercise || exercise.deletedAt) {
      throw new NotFoundException('Esercizio non trovato.');
    }
    return exercise;
  }
}
