import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortabilityService } from './portability.service.js';
import { PortabilityTarget, DuplicateStrategy } from './dto/import-export.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('Complex CSV Import (HaruKaizen_Mese_0_Completo Spec E)', () => {
  let service: PortabilityService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (callback) => callback(mockPrisma)),
      workoutPlan: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'plan-mese-0', name: 'HaruKaizen_Mese_0_Completo' }),
      },
      workoutDay: {
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: `day-${args.data.name}`, ...args.data })),
      },
      workoutDayExercise: {
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: `wde-${args.data.orderIndex}`, ...args.data })),
      },
      exercise: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: `ex-${args.data.name}`, ...args.data })),
      },
      workoutLog: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
      workoutLogExercise: {
        create: vi.fn(),
      },
      workoutLogSet: {
        create: vi.fn(),
      },
    };

    service = new PortabilityService(mockPrisma as unknown as PrismaService);
  });

  it('should import HaruKaizen_Mese_0_Completo creating 1 Plan, 3 Days, 22 Exercises, 0 fake logs', async () => {
    // 22-exercise complete month 0 sheet fixture
    const csvContent =
      `Giorno,Esercizio,Serie x Rip.,Target Peso,RPE,Recupero,Note\r\n` +
      // Scheda A (7 exercises)
      `Scheda A,Warm-up: Mobilità ed Elastici,2 x 15,Leggero,,60s,Riscaldamento cuffia dei rotatori\r\n` +
      `Scheda A,Panca Piana Bilanciere,4 x 8-10,80,8.5,120s,Fermo al petto 1s\r\n` +
      `Scheda A,Spinte Manubri Inclinata 30°,3 x 10-12,26,8,90s,Movimento controllato\r\n` +
      `Scheda A,Dip alle Parallele,3 x 8,Corpo libero / 6,9,90s,Zavorra da 6kg se possibile\r\n` +
      `Scheda A,Croci ai Cavi dal Basso,3 x 12-15,4 piastre,8.5,60s,Picco di contrazione 2s\r\n` +
      `Scheda A,French Press Bilanciere EZ,3 x 10-12,30,8,90s,Gomiti stretti\r\n` +
      `Scheda A,Pushdown Cavo Corda,3 x 15,14-16,9,60s,Cedimento all'ultima serie\r\n` +
      // Scheda B (7 exercises)
      `Scheda B,Warm-up: Trazioni Elastico,2 x 10,Corpo Libero,,60s,Attivazione dorsale\r\n` +
      `Scheda B,Trazioni alla Sbarra Presa Neutra,4 x 6-8,Sbarra + 5-10,9,120s,Petto alla sbarra\r\n` +
      `Scheda B,Lat Machine Presa Larga,3 x 8-10,65,8,90s,Trazione pulita\r\n` +
      `Scheda B,Pulley Basso Barra Presa Stretta,3 x 10-12,55,8.5,90s,Squeeze dorsale\r\n` +
      `Scheda B,Pullover con Manubrio,3 x 12,22,7.5,60s,Espansione toracica\r\n` +
      `Scheda B,Curl con Bilanciere Dritto,3 x 8-10,Barra + 5,8.5,90s,Nessun cheat\r\n` +
      `Scheda B,Bayesian Cable Curl,3 x 12-15,10,9,60s,Tensione continua\r\n` +
      // Scheda C (8 exercises)
      `Scheda C,Warm-up: Hip Mobility,2 x 15,Corpo Libero,,60s,Mobilità bacino\r\n` +
      `Scheda C,Squat con Bilanciere,4 x 6-8,100,8.5,180s,Profondità valida sotto il parallelo\r\n` +
      `Scheda C,Leg Press 45°,3 x 10-12,180,8,120s,Non bloccare le ginocchia\r\n` +
      `Scheda C,Leg Curl Sdraiato,3 x 10-12,45,8.5,90s,Movimento controllato in eccentrica\r\n` +
      `Scheda C,Military Press in Piedi,4 x 8,50,8.5,120s,Core compatto\r\n` +
      `Scheda C,Alzate Laterali con Manubri,4 x 12-15,12,9,60s,Pausa in alto\r\n` +
      `Scheda C,Calf Raise in Piedi,4 x 15,60,8,60s,Fermo in allungamento 2s\r\n` +
      `Scheda C,Plank Addominale,3 x 60s,Corpo Libero,,60s,Massima tensione addominale`;

    const res = await service.importCsv(
      'user-1',
      PortabilityTarget.WORKOUT_LOGS,
      csvContent,
      undefined,
      DuplicateStrategy.SKIP,
      undefined,
      'HaruKaizen_Mese_0_Completo.csv',
    );

    // 1. Validation checks
    expect(res.errors).toHaveLength(0);
    expect(res.totalRows).toBe(22);
    expect(res.importedCount).toBe(22);
    expect(res.createdPlanName).toBe('HaruKaizen_Mese_0_Completo');

    // 2. Exact Model Counts
    expect(mockPrisma.workoutPlan.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.workoutDay.create).toHaveBeenCalledTimes(3); // Scheda A, Scheda B, Scheda C
    expect(mockPrisma.workoutDayExercise.create).toHaveBeenCalledTimes(22);

    // 3. ZERO Fake Logs Created!
    expect(mockPrisma.workoutLog.create).not.toHaveBeenCalled();
    expect(mockPrisma.workoutLogExercise.create).not.toHaveBeenCalled();
    expect(mockPrisma.workoutLogSet.create).not.toHaveBeenCalled();

    // 4. Verify Complex String Load Parsing & Notes Injection
    // Dip: "Corpo libero / 6" -> weightTargetKg: 6, weightTarget contains "Corpo libero / 6", notes contains load note
    const dipCall = mockPrisma.workoutDayExercise.create.mock.calls.find((call: any) =>
      call[0].data.weightTargetKg === 6,
    );
    expect(dipCall).toBeDefined();
    expect(dipCall[0].data.weightTarget).toContain('Corpo libero / 6');
    expect(dipCall[0].data.notes).toContain('Corpo libero / 6');

    // 4 piastre: weightTargetKg: 4
    const piastreCall = mockPrisma.workoutDayExercise.create.mock.calls.find((call: any) =>
      call[0].data.weightTargetKg === 4,
    );
    expect(piastreCall).toBeDefined();
    expect(piastreCall[0].data.weightTarget).toContain('4 piastre');

    // Sbarra + 5-10: weightTargetKg: 5
    const trazioniCall = mockPrisma.workoutDayExercise.create.mock.calls.find((call: any) =>
      call[0].data.weightTargetKg === 5,
    );
    expect(trazioniCall).toBeDefined();

    // Plank 3 x 60s: repsTarget: "60s"
    const plankCall = mockPrisma.workoutDayExercise.create.mock.calls.find((call: any) =>
      call[0].data.repsTarget === '60s',
    );
    expect(plankCall).toBeDefined();
    expect(plankCall[0].data.sets).toBe(3);

    // Empty RPE: warm-up should have null rpeTarget
    const warmupCall = mockPrisma.workoutDayExercise.create.mock.calls[0];
    expect(warmupCall[0].data.rpeTarget).toBeNull();
  });
});

