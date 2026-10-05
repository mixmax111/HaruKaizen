import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSettings: {
          select: {
            preferredLlmProvider: true,
            timezone:             true,
            locale:               true,
            targetWeightKg:       true,
            isDarkMode:           true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utente non trovato.');

    const { passwordHash: _pw, ...safeUser } = user;
    return safeUser;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.heightCm           !== undefined && { heightCm: dto.heightCm }),
        ...(dto.birthDate          !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.sex                !== undefined && { sex: dto.sex }),
        ...(dto.lifestyleMultiplier !== undefined && { lifestyleMultiplier: dto.lifestyleMultiplier }),
      },
      select: {
        id:                  true,
        email:               true,
        role:                true,
        heightCm:            true,
        birthDate:           true,
        sex:                 true,
        lifestyleMultiplier: true,
        updatedAt:           true,
      },
    });
  }

  async findAllActive() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true },
    });
  }
}

