import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StartWorkoutLogDto, AddLogExerciseDto, AddLogSetDto, FinishWorkoutLogDto } from './dto/workout-log.dto.js';
import { SetType, calculateAge } from '@harukaizen/shared';
import { calculateWorkoutExpenditure, BiomechanicalSetInput } from '../expenditure/biomechanical-expenditure.js';

@Injectable()
export class WorkoutLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(userId: string, dto: StartWorkoutLogDto) {
    return this.prisma.workoutLog.create({
      data: {
        userId,
        dayNameSnapshot: dto.dayNameSnapshot,
        planId: dto.planId,
        date: dto.date ? new Date(dto.date) : new Date(),
        startedAt: new Date(),
      },
      include: {
        workoutPlan: true,
        logExercises: {
          include: {
            logSets: true,
            exercise: true,
          },
        },
      },
    });
  }

  async addExercise(userId: string, logId: string, dto: AddLogExerciseDto) {
    const log = await this.prisma.workoutLog.findUnique({ where: { id: logId } });
    if (!log || log.deletedAt) throw new NotFoundException('Sessione non trovata.');
    if (log.userId !== userId) throw new ForbiddenException('Non autorizzato.');
    if (log.finishedAt) throw new BadRequestException('Sessione già terminata.');

    return this.prisma.workoutLogExercise.create({
      data: {
        workoutLogId: logId,
        exerciseId: dto.exerciseId,
        exerciseNameSnapshot: dto.exerciseNameSnapshot,
        notes: dto.notes,
        isExtraExercise: dto.isExtraExercise ?? false,
      },
      include: {
        exercise: true,
        logSets: true,
      },
    });
  }

  async updateExerciseNotes(userId: string, logExerciseId: string, notes: string) {
    const logExercise = await this.prisma.workoutLogExercise.findUnique({
      where: { id: logExerciseId },
      include: { workoutLog: true },
    });

    if (!logExercise || logExercise.workoutLog.deletedAt) {
      throw new NotFoundException('Esercizio non trovato.');
    }
    if (logExercise.workoutLog.userId !== userId) {
      throw new ForbiddenException('Non autorizzato.');
    }

    return this.prisma.workoutLogExercise.update({
      where: { id: logExerciseId },
      data: { notes },
    });
  }

  async addSet(userId: string, logExerciseId: string, dto: AddLogSetDto) {
    const logExercise = await this.prisma.workoutLogExercise.findUnique({
      where: { id: logExerciseId },
      include: { workoutLog: true },
    });

    if (!logExercise || logExercise.workoutLog.deletedAt) {
      throw new NotFoundException('Esercizio di sessione non trovato.');
    }
    if (logExercise.workoutLog.userId !== userId) {
      throw new ForbiddenException('Non autorizzato.');
    }
    if (logExercise.workoutLog.finishedAt) {
      throw new BadRequestException('Sessione già terminata.');
    }

    if (dto.clientSideId) {
      const existing = await this.prisma.workoutLogSet.findUnique({
        where: { clientSideId: dto.clientSideId },
      });
      if (existing) {
        return this.prisma.workoutLogSet.update({
          where: { id: existing.id },
          data: {
            orderIndex: dto.orderIndex,
            setOrder: dto.setOrder ?? dto.orderIndex,
            setType: dto.setType,
            repsCompleted: dto.repsCompleted,
            weightKg: dto.weightKg,
            rpe: dto.rpe,
            notes: dto.notes,
          },
        });
      }
    }

    return this.prisma.workoutLogSet.create({
      data: {
        workoutLogExerciseId: logExerciseId,
        orderIndex: dto.orderIndex,
        setOrder: dto.setOrder ?? dto.orderIndex,
        setType: dto.setType,
        repsCompleted: dto.repsCompleted,
        weightKg: dto.weightKg,
        rpe: dto.rpe,
        notes: dto.notes,
        clientSideId: dto.clientSideId,
      },
    });
  }

  async skipExercise(userId: string, logExerciseId: string) {
    const logExercise = await this.prisma.workoutLogExercise.findUnique({
      where: { id: logExerciseId },
      include: { workoutLog: true },
    });

    if (!logExercise || logExercise.workoutLog.deletedAt) {
      throw new NotFoundException('Esercizio non trovato.');
    }
    if (logExercise.workoutLog.userId !== userId) {
      throw new ForbiddenException('Non autorizzato.');
    }

    return this.prisma.workoutLogExercise.update({
      where: { id: logExerciseId },
      data: { isSkipped: true },
    });
  }

  async finishSession(userId: string, logId: string, dto?: FinishWorkoutLogDto) {
    const log = await this.prisma.workoutLog.findUnique({
      where: { id: logId },
      include: {
        logExercises: {
          include: {
            logSets: true,
            exercise: true,
          },
        },
      },
    });

    if (!log || log.deletedAt) throw new NotFoundException('Sessione non trovata.');
    if (log.userId !== userId) throw new ForbiddenException('Non autorizzato.');
    if (log.finishedAt) throw new BadRequestException('Sessione già conclusa.');

    const finishedAt = new Date();
    const startedAt = log.startedAt ? new Date(log.startedAt) : finishedAt;
    const durationMinutes = Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000));

    // Risoluzione a cascata del peso corporeo:
    // 1. Ultima misurazione storica con recordedAt <= log.date
    let measurement = await this.prisma.measurement.findFirst({
      where: {
        userId,
        deletedAt: null,
        recordedAt: { lte: log.date },
      },
      orderBy: { recordedAt: 'desc' },
    });

    // 2. Se assente, peso attuale dal profilo utente (ultima misurazione in assoluto)
    if (!measurement) {
      measurement = await this.prisma.measurement.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: { recordedAt: 'desc' },
      });
    }

    // 3. Altrimenti peso sconosciuto (null, MAI targetWeightKg né fallback fisso 75)
    const weightKg = measurement?.weightKg ?? null;

    // Controllo età dell'utente per tutela fisiologica:
    // Età sconosciuta (birthDate == null) o minorenne (< 18) => blocco stima automatica
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { birthDate: true },
    });

    let isAgeKnown = false;
    let isUnderage = false;
    if (user?.birthDate) {
      try {
        const age = calculateAge(user.birthDate, log.date);
        isAgeKnown = true;
        isUnderage = age < 18;
      } catch {
        isAgeKnown = false;
      }
    }

    const isWeightKnown = weightKg !== null && weightKg > 0;
    const isEligibleForAutoCalories = isAgeKnown && !isUnderage && isWeightKnown;

    // Raccoglie i set completati per il calcolo biomeccanico del dispendio calorico
    const setsInput: BiomechanicalSetInput[] = [];
    for (const ex of log.logExercises) {
      if (ex.isSkipped) continue;
      for (const set of ex.logSets) {
        setsInput.push({
          setType: set.setType,
          repsCompleted: set.repsCompleted,
          weightKg: set.weightKg,
          rpe: set.rpe,
          exerciseName: ex.exerciseNameSnapshot || ex.exercise?.name,
        });
      }
    }

    const expenditure = calculateWorkoutExpenditure({
      sets: setsInput,
      userWeightKg: weightKg ?? undefined,
      wallClockDurationMinutes: durationMinutes,
    });

    const manualCalories = dto?.manualCaloriesBurned ?? log.manualCaloriesBurned;

    // Blocco stima automatica: se età sconosciuta, minorenne (<18) o peso sconosciuto => null.
    // manualCaloriesBurned ha sempre precedenza assoluta se fornito.
    let finalCaloriesBurned: number | null = null;
    if (manualCalories !== undefined && manualCalories !== null) {
      finalCaloriesBurned = manualCalories;
    } else if (isEligibleForAutoCalories) {
      finalCaloriesBurned = expenditure.caloriesBurned;
    } else {
      finalCaloriesBurned = null;
    }

    const updatedLog = await this.prisma.workoutLog.update({
      where: { id: logId },
      data: {
        finishedAt,
        durationMinutes: expenditure.finalDurationMinutes,
        caloriesBurned: finalCaloriesBurned,
        manualCaloriesBurned: manualCalories ?? undefined,
      },
      include: {
        logExercises: {
          include: { logSets: true },
        },
      },
    });

    return {
      session: updatedLog,
      summary: {
        durationMinutes: expenditure.finalDurationMinutes,
        effectiveDurationMinutes: expenditure.effectiveDurationMinutes,
        caloriesBurned: finalCaloriesBurned,
        manualCaloriesBurned: manualCalories ?? null,
        totalWorkingVolumeKg: expenditure.totalWorkingVolumeKg,
      },
    };
  }

  async findAll(userId: string) {
    return this.prisma.workoutLog.findMany({
      where: { userId, deletedAt: null },
      include: {
        logExercises: {
          include: { logSets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const log = await this.prisma.workoutLog.findUnique({
      where: { id },
      include: {
        logExercises: {
          include: { logSets: true },
        },
      },
    });

    if (!log || log.deletedAt) throw new NotFoundException('Sessione non trovata.');
    if (log.userId !== userId) throw new ForbiddenException('Non autorizzato.');
    return log;
  }
}
