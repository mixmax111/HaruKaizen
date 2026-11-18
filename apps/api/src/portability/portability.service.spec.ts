import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortabilityService } from './portability.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PortabilityTarget, ExportTarget, DuplicateStrategy } from './dto/import-export.dto.js';
import { parseCsv, serializeCsv } from './csv-parser.js';

describe('PortabilityService & CSV Parser', () => {
  let service: PortabilityService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      measurement: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      nutritionLog: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      workoutLog: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      workoutLogExercise: {
        create: vi.fn(),
      },
      workoutLogSet: {
        create: vi.fn(),
      },
      workoutPlan: {
        create: vi.fn().mockResolvedValue({ id: 'plan-1', name: 'Scheda Allenamento Importata' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      workoutDay: {
        create: vi.fn().mockResolvedValue({ id: 'day-1', name: 'Push A' }),
      },
      workoutDayExercise: {
        create: vi.fn().mockResolvedValue({ id: 'wde-1' }),
      },
      exercise: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      userDocument: {
        findMany: vi.fn(),
      },
      userSettings: {
        findUnique: vi.fn(),
      },
    };

    service = new PortabilityService(mockPrisma as unknown as PrismaService);
  });

  describe('RFC-4180 CSV Parser', () => {
    it('should parse multiline fields, commas inside quotes, and escaped quotes', () => {
      const csv = `Name,Description,Value\r\n"Bench Press, Incline","Notes with ""quotes"" and\r\nnew line",100`;
      const parsed = parseCsv(csv);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual(['Name', 'Description', 'Value']);
      expect(parsed[1][0]).toBe('Bench Press, Incline');
      expect(parsed[1][1]).toBe('Notes with "quotes" and\r\nnew line');
      expect(parsed[1][2]).toBe('100');
    });

    it('should properly serialize rows and escape quotes/commas', () => {
      const headers = ['Exercise', 'Notes', 'Weight'];
      const rows = [['Squat, Back', 'Heavy "working" set', 120]];
      const serialized = serializeCsv(headers, rows);

      expect(serialized).toContain('"Squat, Back"');
      expect(serialized).toContain('"Heavy ""working"" set"');
      expect(serialized).toContain('120');
    });
  });

  describe('CSV Import Engine', () => {
    it('should auto-detect HaruKaizen measurements headers and import rows', async () => {
      const csv = `Date,Weight,BodyFat,Waist,Chest\r\n2026-10-15,75.5,14.2,80,102\r\n2026-10-16,75.3,,,`;

      mockPrisma.measurement.findFirst.mockResolvedValue(null);
      mockPrisma.measurement.create.mockResolvedValue({ id: 'm-1' });

      const res = await service.importCsv('user-1', PortabilityTarget.MEASUREMENTS, csv);

      expect(res.totalRows).toBe(2);
      expect(res.importedCount).toBe(2);
      expect(res.errors).toHaveLength(0);
      expect(mockPrisma.measurement.create).toHaveBeenCalledTimes(2);
    });

    it('should catch invalid rows and report validation errors without throwing', async () => {
      // Row 1 has invalid negative weight, row 2 is valid
      const csv = `Date,Weight,BodyFat\r\n2026-10-15,-50,14.2\r\n2026-10-16,75.0,15.0`;

      mockPrisma.measurement.findFirst.mockResolvedValue(null);
      mockPrisma.measurement.create.mockResolvedValue({ id: 'm-2' });

      const res = await service.importCsv('user-1', PortabilityTarget.MEASUREMENTS, csv);

      expect(res.totalRows).toBe(2);
      expect(res.importedCount).toBe(1);
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors[0].row).toBe(2); // First data row (row 2 in CSV)
    });

    it('should auto-detect Strong App CSV headers and group sets by workout and exercise', async () => {
      const strongCsv = `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE\r\n` +
        `2026-10-20 18:00:00,Upper Body,Bench Press,1,80,10,8\r\n` +
        `2026-10-20 18:00:00,Upper Body,Bench Press,2,85,8,9\r\n` +
        `2026-10-20 18:00:00,Upper Body,Barbell Row,1,70,10,8`;

      mockPrisma.workoutLog.findFirst.mockResolvedValue(null);
      mockPrisma.workoutLog.create.mockResolvedValue({ id: 'workout-1' });
      mockPrisma.exercise.findFirst.mockResolvedValue({ id: 'ex-bench', name: 'Bench Press' });
      mockPrisma.workoutLogExercise.create.mockResolvedValue({ id: 'w-ex-1' });
      mockPrisma.workoutLogSet.create.mockResolvedValue({ id: 'set-1' });

      const res = await service.importCsv('user-1', PortabilityTarget.WORKOUT_LOGS, strongCsv);

      expect(res.totalRows).toBe(3);
      expect(res.importedCount).toBe(3);
      expect(res.errors).toHaveLength(0);

      // Single workoutLog created for the session
      expect(mockPrisma.workoutLog.create).toHaveBeenCalledTimes(1);
      // Two exercises created/linked: Bench Press and Barbell Row
      expect(mockPrisma.workoutLogExercise.create).toHaveBeenCalledTimes(2);
      // Three sets created
      expect(mockPrisma.workoutLogSet.create).toHaveBeenCalledTimes(3);
    });

    it('should import workout template sheet without Date column and create prescriptive WorkoutPlan', async () => {
      const templateCsv = `Giorno,Esercizio,Serie,Ripetizioni,Carico (Kg),RPE,Recupero (s)\r\n` +
        `Push A,Panca Piana Bilanciere,4,8-10,80,8,120\r\n` +
        `Push A,Spinte Manubri Inclinata,3,10-12,26.5,8.5,90\r\n` +
        `Pull A,Lat Machine Presa Neutra,4,8-10,55,8,120`;

      mockPrisma.workoutPlan.create.mockResolvedValue({ id: 'plan-push-pull', name: 'Mese 0 - Scheda C' });
      mockPrisma.workoutDay.create.mockResolvedValue({ id: 'day-1', name: 'Push A' });
      mockPrisma.workoutDayExercise.create.mockResolvedValue({ id: 'wde-1' });
      mockPrisma.workoutLog.findFirst.mockResolvedValue(null);
      mockPrisma.workoutLog.create.mockResolvedValue({ id: 'wlog-1' });
      mockPrisma.exercise.findFirst.mockResolvedValue({ id: 'ex-1', name: 'Panca Piana' });
      mockPrisma.workoutLogExercise.create.mockResolvedValue({ id: 'wex-1' });
      mockPrisma.workoutLogSet.create.mockResolvedValue({ id: 'wset-1' });

      const res = await service.importCsv(
        'user-1',
        PortabilityTarget.WORKOUT_LOGS,
        templateCsv,
        undefined,
        DuplicateStrategy.SKIP,
        undefined,
        'Mese 0 - Scheda C - Untitled.csv',
      );

      expect(res.totalRows).toBe(3);
      expect(res.errors).toHaveLength(0);
      expect(res.createdPlanId).toBe('plan-push-pull');
      expect(res.createdPlanName).toBe('Mese 0 - Scheda C');

      // Prescriptive Plan created with 2 distinct days (Push A and Pull A)
      expect(mockPrisma.workoutPlan.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Mese 0 - Scheda C',
          origin: 'USER',
          isActive: true,
        }),
      }));
      expect(mockPrisma.workoutDay.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.workoutDayExercise.create).toHaveBeenCalledTimes(3);
    });

    it('should parse text/ranges in weight and reps without NaN or errors', async () => {
      const complexCsv = `Sezione,Esercizio,Serie,Ripetizioni,Carico (Kg),RPE\r\n` +
        `Gambe,Squat Bilanciere,4,8-10,45-50-55 kg,8\r\n` +
        `Gambe,Trazioni alla Sbarra,3,10,Sbarra + 10kg per lato,9\r\n` +
        `Gambe,Affondi corpo libero,3,12-15,,7.5`;

      mockPrisma.workoutPlan.create.mockResolvedValue({ id: 'plan-gambe', name: 'Scheda Allenamento Importata' });
      mockPrisma.workoutDay.create.mockResolvedValue({ id: 'day-gambe', name: 'Gambe' });
      mockPrisma.workoutDayExercise.create.mockResolvedValue({ id: 'wde-gambe' });
      mockPrisma.workoutLog.findFirst.mockResolvedValue(null);
      mockPrisma.workoutLog.create.mockResolvedValue({ id: 'wlog-gambe' });
      mockPrisma.exercise.findFirst.mockResolvedValue({ id: 'ex-squat', name: 'Squat' });
      mockPrisma.workoutLogExercise.create.mockResolvedValue({ id: 'wex-squat' });
      mockPrisma.workoutLogSet.create.mockResolvedValue({ id: 'wset-squat' });

      const res = await service.importCsv('user-1', PortabilityTarget.WORKOUT_LOGS, complexCsv);

      expect(res.totalRows).toBe(3);
      expect(res.errors).toHaveLength(0); // 0 validation errors!

      // Check that workoutDayExercise received parsed numbers:
      // Row 1: "45-50-55 kg" -> 45
      // Row 2: "Sbarra + 10kg per lato" -> 10
      // Row 3: empty -> weightTargetKg: null
      expect(mockPrisma.workoutDayExercise.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          weightTargetKg: 45,
          repsTarget: '8-10',
        }),
      }));
      expect(mockPrisma.workoutDayExercise.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          weightTargetKg: 10,
          repsTarget: '10',
        }),
      }));
      expect(mockPrisma.workoutDayExercise.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          weightTargetKg: null,
          repsTarget: '12-15',
        }),
      }));
    });
  });

  describe('Sovereign Export Engine', () => {
    it('should export measurements as CSV string', async () => {
      mockPrisma.measurement.findMany.mockResolvedValue([
        {
          recordedAt: new Date('2026-10-15T08:00:00Z'),
          weightKg: 75.5,
          bodyFatPercentage: 14.5,
          waistCm: 80,
          chestCm: 100,
          armsCm: 37,
          legsCm: 56,
        },
      ]);

      const result = await service.exportData('user-1', ExportTarget.MEASUREMENTS);

      expect(result.contentType).toContain('text/csv');
      expect(result.filename).toContain('harukaizen_measurements_');
      expect(result.content).toContain('recordedAt,weightKg,bodyFatPercentage,waistCm,chestCm,armsCm,legsCm');
      expect(result.content).toContain('75.5');
    });

    it('should export complete sovereign GDPR JSON snapshot', async () => {
      mockPrisma.user = { findUnique: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@hk.local' }) };
      mockPrisma.aiInsightReport = { findMany: vi.fn().mockResolvedValue([]) };
      mockPrisma.measurement.findMany.mockResolvedValue([]);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);
      mockPrisma.workoutLog.findMany.mockResolvedValue([]);
      mockPrisma.userDocument.findMany.mockResolvedValue([]);
      mockPrisma.userSettings.findUnique.mockResolvedValue({ preferredLlmProvider: 'gemini' });

      const result = await service.exportData('user-1', ExportTarget.ALL_JSON);

      expect(result.contentType).toContain('application/json');
      expect(result.filename).toContain('harukaizen_sovereign_backup_');
      const parsed = JSON.parse(result.content);
      expect(parsed.exportMetadata.app).toBe('HaruKaizen Sovereign Fitness');
      expect(parsed.user.email).toBe('test@hk.local');
    });
  });
});
