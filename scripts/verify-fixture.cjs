const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
let dbUrl = 'postgresql://harukaizen:harukaizen_local_secret@localhost:5432/harukaizen_db?schema=public';
let jwtSecret = 'harukaizen_super_secure_local_jwt_secret_minimum_32_chars_2026';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      dbUrl = trimmed.replace('DATABASE_URL=', '').replace(/^["']|["']$/g, '');
    } else if (trimmed.startsWith('JWT_SECRET=')) {
      jwtSecret = trimmed.replace('JWT_SECRET=', '').replace(/^["']|["']$/g, '');
    }
  }
}

function signJwt(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const data = header + '.' + body;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return data + '.' + sig;
}

const adapter = new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

async function setup() {
  const nonce = Date.now();

  const userA = await prisma.user.create({
    data: {
      email: `author_${nonce}@step1-test.local`,
      authProvider: 'local',
      userSettings: { create: {} },
    },
  });

  const userB = await prisma.user.create({
    data: {
      email: `viewer_${nonce}@step1-test.local`,
      birthDate: null,
      authProvider: 'local',
      userSettings: { create: {} },
    },
  });

  const exercise = await prisma.exercise.create({
    data: {
      name: `Step1 Test Exercise ${nonce}`,
      category: 'CHEST',
      equipment: 'BARBELL',
      defaultMetValue: 5.0,
      createdByUserId: userA.id,
    },
  });

  const plan = await prisma.workoutPlan.create({
    data: {
      userId: userA.id,
      name: `Public Plan ${nonce}`,
      isPublic: true,
      aiReasoning: 'SECRET_AI_REASONING_CONFIDENTIAL_12345',
      clinicalWarning: 'SECRET_CLINICAL_WARNING_HERNIA_67890',
      isActive: true,
      workoutDays: {
        create: [
          {
            name: 'Day 1',
            orderIndex: 1,
            exercises: {
              create: [
                {
                  exerciseId: exercise.id,
                  orderIndex: 1,
                  sets: 3,
                  repsTarget: '10',
                  weightTarget: 'SECRET_TARGET_80KG',
                  restSeconds: 90,
                  notes: 'SECRET_AUTHOR_NOTE_DO_NOT_LEAK',
                },
              ],
            },
          },
        ],
      },
    },
  });

  const tokenA = signJwt({ sub: userA.id, email: userA.email, role: userA.role }, jwtSecret);
  const tokenB = signJwt({ sub: userB.id, email: userB.email, role: userB.role }, jwtSecret);

  console.log(JSON.stringify({
    userAId: userA.id,
    userBId: userB.id,
    tokenA,
    tokenB,
    planId: plan.id,
    exerciseId: exercise.id,
  }));

  await prisma.$disconnect();
}

setup().catch(err => {
  console.error(err);
  process.exit(1);
});
