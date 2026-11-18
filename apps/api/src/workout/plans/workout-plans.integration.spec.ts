import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { WorkoutPlansService } from './workout-plans.service.js';
import { mapPublicWorkoutPlan } from './dto/public-workout-plan.dto.js';
import { ForbiddenException } from '@nestjs/common';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://harukaizen:harukaizen_local_secret@localhost:5432/harukaizen_db?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

describe('WorkoutPlansService — Public Plans Whitelist & Privacy Integration Spec (Real DB)', () => {
  let service: WorkoutPlansService;
  let authorUserId: string;
  let viewerUserId: string;
  let publicPlanId: string;
  let privatePlanId: string;
  let testExerciseId: string;

  beforeEach(async () => {
    service = new WorkoutPlansService(prisma as any);

    // Crea utenti di test
    const author = await prisma.user.create({
      data: {
        email: `author_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@test.local`,
        authProvider: 'local',
      },
    });
    authorUserId = author.id;

    const viewer = await prisma.user.create({
      data: {
        email: `viewer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@test.local`,
        authProvider: 'local',
      },
    });
    viewerUserId = viewer.id;

    // Crea esercizio personalizzato dell'autore
    const exercise = await prisma.exercise.create({
      data: {
        name: `Test Squat ${Date.now()}`,
        category: 'LEGS',
        equipment: 'BARBELL',
        defaultMetValue: 6.0,
        createdByUserId: authorUserId,
      },
    });
    testExerciseId = exercise.id;

    // Crea piano pubblico con dati sensibili
    const publicPlan = await prisma.workoutPlan.create({
      data: {
        userId: authorUserId,
        name: 'Scheda Ipertrofia Pubblica',
        isPublic: true,
        aiReasoning: 'Dati anamnestici confidenziali e note AI riservate',
        clinicalWarning: 'Attenzione: ernia discale L5-S1 e tachicardia',
        isActive: true,
        workoutDays: {
          create: [
            {
              name: 'Giorno 1 - Gambe',
              orderIndex: 1,
              exercises: {
                create: [
                  {
                    exerciseId: testExerciseId,
                    orderIndex: 1,
                    sets: 4,
                    repsTarget: '6-8',
                    weightTarget: '140kg',
                    weightTargetKg: 140,
                    rpeTarget: 9,
                    restSeconds: 180,
                    notes: 'Note personali private dell autore',
                  },
                ],
              },
            },
          ],
        },
      },
    });
    publicPlanId = publicPlan.id;

    // Crea piano privato dell'autore
    const privatePlan = await prisma.workoutPlan.create({
      data: {
        userId: authorUserId,
        name: 'Scheda Segreta Personale',
        isPublic: false,
      },
    });
    privatePlanId = privatePlan.id;
  });

  afterAll(async () => {
    // Cleanup
    if (publicPlanId) {
      await prisma.workoutDayExercise.deleteMany({
        where: { workoutDay: { workoutPlanId: publicPlanId } },
      });
      await prisma.workoutDay.deleteMany({ where: { workoutPlanId: publicPlanId } });
      await prisma.workoutPlan.delete({ where: { id: publicPlanId } }).catch(() => {});
    }
    if (privatePlanId) {
      await prisma.workoutPlan.delete({ where: { id: privatePlanId } }).catch(() => {});
    }
    if (testExerciseId) {
      await prisma.exercise.delete({ where: { id: testExerciseId } }).catch(() => {});
    }
    if (authorUserId) {
      await prisma.user.delete({ where: { id: authorUserId } }).catch(() => {});
    }
    if (viewerUserId) {
      await prisma.user.delete({ where: { id: viewerUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('findOne per autore visualizza tutti i propri dati inclusi quelli sensibili', async () => {
    const plan = (await service.findOne(authorUserId, publicPlanId)) as any;
    expect(plan.userId).toBe(authorUserId);
    expect(plan.aiReasoning).toBe('Dati anamnestici confidenziali e note AI riservate');
    expect(plan.clinicalWarning).toBe('Attenzione: ernia discale L5-S1 e tachicardia');
    expect(plan.workoutDays[0].exercises[0].notes).toBe('Note personali private dell autore');
    expect(plan.workoutDays[0].exercises[0].weightTargetKg).toBe(140);
  });

  it('findOne per utente terzo applica whitelist mapper: esercizi presenti e campi personali rimossi', async () => {
    const plan = (await service.findOne(viewerUserId, publicPlanId)) as any;

    // Struttura ed esercizi devono essere presenti
    expect(plan.id).toBe(publicPlanId);
    expect(plan.name).toBe('Scheda Ipertrofia Pubblica');
    expect(plan.isPublic).toBe(true);
    expect(plan.workoutDays).toHaveLength(1);
    expect(plan.workoutDays[0].exercises).toHaveLength(1);
    expect(plan.workoutDays[0].exercises[0].sets).toBe(4);
    expect(plan.workoutDays[0].exercises[0].repsTarget).toBe('6-8');
    expect(plan.workoutDays[0].exercises[0].exercise.name).toContain('Test Squat');

    // Campi personali e clinici dell'autore tassativamente assenti / omessi
    expect(plan.userId).toBeUndefined();
    expect(plan.aiReasoning).toBeUndefined();
    expect(plan.clinicalWarning).toBeUndefined();
    expect(plan.isActive).toBeUndefined();
    expect(plan.workoutDays[0].exercises[0].notes).toBeUndefined();
    expect(plan.workoutDays[0].exercises[0].weightTarget).toBeUndefined();
    expect(plan.workoutDays[0].exercises[0].weightTargetKg).toBeUndefined();
    expect(plan.workoutDays[0].exercises[0].rpeTarget).toBeUndefined();
    expect(plan.workoutDays[0].exercises[0].exercise.createdByUserId).toBeUndefined();
  });

  it('findOne per utente terzo su piano privato lancia ForbiddenException', async () => {
    await expect(service.findOne(viewerUserId, privatePlanId)).rejects.toThrow(ForbiddenException);
  });

  it('findAll per utente terzo applica whitelist mapper a tutte le schede pubbliche altrui', async () => {
    const plans = (await service.findAll(viewerUserId)) as any[];
    const publicPlanFromList = plans.find((p) => p.id === publicPlanId);

    expect(publicPlanFromList).toBeDefined();
    expect(publicPlanFromList.workoutDays[0].exercises).toHaveLength(1);
    expect(publicPlanFromList.userId).toBeUndefined();
    expect(publicPlanFromList.aiReasoning).toBeUndefined();
    expect(publicPlanFromList.clinicalWarning).toBeUndefined();
    expect(publicPlanFromList.workoutDays[0].exercises[0].weightTargetKg).toBeUndefined();

    // Il piano privato dell'autore non deve comparire nella lista del terzo utente
    const privatePlanFromList = plans.find((p) => p.id === privatePlanId);
    expect(privatePlanFromList).toBeUndefined();
  });

  it('whitelist mapper esclude campi inattesi aggiunti in futuro al modello DB', () => {
    const fakePlanWithFutureField: any = {
      id: 'fake-id',
      name: 'Fake Plan',
      origin: 'USER',
      userId: 'secret-user',
      aiReasoning: 'secret-ai',
      clinicalWarning: 'secret-warning',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      futureInternalAuditSecret: 'TOP_SECRET_DO_NOT_LEAK',
      futureDiagnosticFlags: { cardiacRisk: true },
      workoutDays: [
        {
          id: 'day-1',
          name: 'Day 1',
          orderIndex: 1,
          dayOrder: 1,
          exercises: [
            {
              id: 'we-1',
              exerciseId: 'ex-1',
              orderIndex: 1,
              sets: 3,
              repsTarget: '10',
              restSeconds: 90,
              notes: 'my secret note',
              weightTarget: '100kg',
              weightTargetKg: 100,
              rpeTarget: 8,
              futureCoachComment: 'Private coach comment',
              exercise: {
                id: 'ex-1',
                name: 'Bench',
                category: 'CHEST',
                equipment: 'BARBELL',
                defaultMetValue: 6.0,
                isVerified: true,
                createdByUserId: 'author-id',
                futureLabCertificationId: 'CERT-1234',
              },
            },
          ],
        },
      ],
    };

    const sanitized: any = mapPublicWorkoutPlan(fakePlanWithFutureField);

    expect(sanitized.id).toBe('fake-id');
    expect(sanitized.workoutDays[0].exercises[0].sets).toBe(3);
    expect(sanitized.futureInternalAuditSecret).toBeUndefined();
    expect(sanitized.futureDiagnosticFlags).toBeUndefined();
    expect(sanitized.userId).toBeUndefined();
    expect(sanitized.workoutDays[0].exercises[0].futureCoachComment).toBeUndefined();
    expect(sanitized.workoutDays[0].exercises[0].exercise.futureLabCertificationId).toBeUndefined();
  });
});
