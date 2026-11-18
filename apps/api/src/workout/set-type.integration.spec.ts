import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, SetType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://harukaizen:harukaizen_local_secret@localhost:5432/harukaizen_db?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

describe.skip('SetType Enum DB Read/Write Integration Spec', () => {
  let testUserId: string;
  let testWorkoutLogId: string;
  let testExerciseId: string;
  let testLogExerciseId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `settype_test_${Date.now()}@test.local`,
        authProvider: 'local',
      },
    });
    testUserId = user.id;

    const log = await prisma.workoutLog.create({
      data: {
        userId: testUserId,
        dayNameSnapshot: 'SetType Test Session',
      },
    });
    testWorkoutLogId = log.id;

    const exercise = await prisma.exercise.create({
      data: {
        name: `SetType Exercise ${Date.now()}`,
        category: 'CHEST',
        equipment: 'BARBELL',
        defaultMetValue: 5.0,
      },
    });
    testExerciseId = exercise.id;

    const logEx = await prisma.workoutLogExercise.create({
      data: {
        workoutLogId: testWorkoutLogId,
        exerciseId: testExerciseId,
        exerciseNameSnapshot: 'SetType Exercise',
      },
    });
    testLogExerciseId = logEx.id;
  });

  afterAll(async () => {
    await prisma.workoutLogSet.deleteMany({
      where: { workoutLogExerciseId: testLogExerciseId },
    });
    await prisma.workoutLogExercise.deleteMany({
      where: { id: testLogExerciseId },
    });
    await prisma.workoutLog.deleteMany({
      where: { id: testWorkoutLogId },
    });
    await prisma.exercise.deleteMany({
      where: { id: testExerciseId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  const canonicalValues: SetType[] = ['WARMUP', 'WORKING', 'DROPSET', 'FAILURE'];

  for (const setType of canonicalValues) {
    it(`correctly writes and reads SetType: ${setType}`, async () => {
      const created = await prisma.workoutLogSet.create({
        data: {
          workoutLogExerciseId: testLogExerciseId,
          orderIndex: canonicalValues.indexOf(setType) + 1,
          setOrder: canonicalValues.indexOf(setType) + 1,
          setType,
          repsCompleted: 10,
          weightKg: 80,
        },
      });

      expect(created.id).toBeDefined();
      expect(created.setType).toBe(setType);

      const fetched = await prisma.workoutLogSet.findUnique({
        where: { id: created.id },
      });
      expect(fetched?.setType).toBe(setType);
    });
  }
});

