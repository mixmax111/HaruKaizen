import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateMealSlotDto,
  UpdateMealSlotDto,
  ReorderMealSlotsDto,
  DeleteMealSlotDto,
} from './dto/meal-slot.dto.js';

export const DEFAULT_MEAL_SLOTS = [
  { name: 'Colazione', slotOrder: 0 },
  { name: 'Pranzo', slotOrder: 1 },
  { name: 'Cena', slotOrder: 2 },
  { name: 'Spuntini', slotOrder: 3 },
];

@Injectable()
export class MealSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Limita clientUpdatedAt a serverNow + 5 minuti (tolleranza clock skew).
   */
  private clampClientUpdatedAt(clientUpdatedAt?: string | Date | null): Date {
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 5 * 60 * 1000);
    if (!clientUpdatedAt) return now;

    const parsed = new Date(clientUpdatedAt);
    if (isNaN(parsed.getTime())) return now;
    return parsed.getTime() > maxFuture.getTime() ? maxFuture : parsed;
  }

  /**
   * Assicura che l'utente abbia gli slot pasto predefiniti.
   */
  async getOrCreateDefaultSlots(userId: string) {
    const existing = await this.prisma.mealSlot.findMany({
      where: { userId, deletedAt: null },
      orderBy: { slotOrder: 'asc' },
    });

    if (existing.length > 0) {
      return existing;
    }

    // Inizializza i default
    const now = new Date();
    await this.prisma.mealSlot.createMany({
      data: DEFAULT_MEAL_SLOTS.map((slot) => ({
        userId,
        name: slot.name,
        slotOrder: slot.slotOrder,
        clientUpdatedAt: now,
      })),
    });

    return this.prisma.mealSlot.findMany({
      where: { userId, deletedAt: null },
      orderBy: { slotOrder: 'asc' },
    });
  }

  async list(userId: string) {
    return this.getOrCreateDefaultSlots(userId);
  }

  async findById(userId: string, id: string) {
    const slot = await this.prisma.mealSlot.findUnique({
      where: { id },
    });
    if (!slot || slot.deletedAt) {
      throw new NotFoundException('Slot pasto non trovato.');
    }
    if (slot.userId !== userId) {
      throw new ForbiddenException('Accesso non autorizzato allo slot pasto.');
    }
    return slot;
  }

  async create(userId: string, dto: CreateMealSlotDto) {
    const safeTime = this.clampClientUpdatedAt(dto.clientUpdatedAt);
    const cleanName = dto.name.trim();

    // Idempotenza se clientSideId presente
    if (dto.clientSideId) {
      const existing = await this.prisma.mealSlot.findUnique({
        where: {
          userId_clientSideId: {
            userId,
            clientSideId: dto.clientSideId,
          },
        },
      });

      if (existing) {
        // LWW check
        if (existing.clientUpdatedAt && safeTime < existing.clientUpdatedAt) {
          return { status: 'REJECTED_STALE', winner: existing };
        }

        const updated = await this.prisma.mealSlot.update({
          where: { id: existing.id },
          data: {
            name: cleanName,
            slotOrder: dto.slotOrder ?? existing.slotOrder,
            deletedAt: null,
            isActive: true,
            clientUpdatedAt: safeTime,
          },
        });
        return { status: 'APPLIED', data: updated };
      }
    }

    // Gestione collisioni per nome (es. due device offline che creano "Spuntini")
    const sameNameSlot = await this.prisma.mealSlot.findFirst({
      where: {
        userId,
        deletedAt: null,
        name: { equals: cleanName, mode: 'insensitive' },
      },
    });

    let finalName = cleanName;
    if (sameNameSlot) {
      // Se hanno lo stesso nome, rinomina in modo sicuro per evitare collisioni UI
      finalName = `${cleanName} (1)`;
    }

    let slotOrder = dto.slotOrder;
    if (slotOrder === undefined) {
      const maxOrder = await this.prisma.mealSlot.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { slotOrder: 'desc' },
        select: { slotOrder: true },
      });
      slotOrder = (maxOrder?.slotOrder ?? -1) + 1;
    }

    const created = await this.prisma.mealSlot.create({
      data: {
        userId,
        name: finalName,
        slotOrder,
        clientSideId: dto.clientSideId,
        clientUpdatedAt: safeTime,
      },
    });

    return { status: 'APPLIED', data: created };
  }

  async update(userId: string, id: string, dto: UpdateMealSlotDto) {
    const existing = await this.findById(userId, id);
    const safeTime = this.clampClientUpdatedAt(dto.clientUpdatedAt);

    // LWW comparison
    if (existing.clientUpdatedAt && safeTime < existing.clientUpdatedAt) {
      return { status: 'REJECTED_STALE', winner: existing };
    }

    const updated = await this.prisma.mealSlot.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? existing.name,
        slotOrder: dto.slotOrder ?? existing.slotOrder,
        isActive: dto.isActive ?? existing.isActive,
        clientUpdatedAt: safeTime,
      },
    });

    return { status: 'APPLIED', data: updated };
  }

  async reorder(userId: string, dto: ReorderMealSlotsDto) {
    const slots = await this.prisma.mealSlot.findMany({
      where: {
        userId,
        deletedAt: null,
        id: { in: dto.slotIds },
      },
    });

    if (slots.length !== dto.slotIds.length) {
      throw new BadRequestException('Alcuni ID di slot non sono validi o non appartengono all’utente.');
    }

    const now = new Date();
    await this.prisma.$transaction(
      dto.slotIds.map((id, index) =>
        this.prisma.mealSlot.update({
          where: { id },
          data: { slotOrder: index, clientUpdatedAt: now },
        })
      )
    );

    return this.list(userId);
  }

  async delete(userId: string, id: string, dto?: DeleteMealSlotDto) {
    const existing = await this.findById(userId, id);

    // Verifica se ci sono log collegati
    const linkedLogsCount = await this.prisma.nutritionLog.count({
      where: { mealSlotId: id, deletedAt: null },
    });

    if (linkedLogsCount > 0) {
      if (!dto?.fallbackMealSlotId) {
        throw new BadRequestException(
          `Questo slot contiene ${linkedLogsCount} voci registrate nel diario. Specifica fallbackMealSlotId per spostarle prima dell'eliminazione.`
        );
      }

      if (dto.fallbackMealSlotId === id) {
        throw new BadRequestException('Lo slot di destinazione non può coincidere con lo slot in eliminazione.');
      }

      const fallbackSlot = await this.prisma.mealSlot.findUnique({
        where: { id: dto.fallbackMealSlotId },
      });

      if (!fallbackSlot || fallbackSlot.deletedAt || fallbackSlot.userId !== userId) {
        throw new BadRequestException('Lo slot di destinazione specificato non è valido o appartiene a un altro utente.');
      }

      // Riassegna atomicamente tutti i log allo slot fallback prima del soft delete
      await this.prisma.$transaction([
        this.prisma.nutritionLog.updateMany({
          where: { mealSlotId: id, deletedAt: null },
          data: { mealSlotId: dto.fallbackMealSlotId },
        }),
        this.prisma.mealSlot.update({
          where: { id },
          data: { deletedAt: new Date(), isActive: false },
        }),
      ]);
    } else {
      await this.prisma.mealSlot.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
    }

    return { success: true, deletedSlotId: id, reassignedLogs: linkedLogsCount };
  }
}

