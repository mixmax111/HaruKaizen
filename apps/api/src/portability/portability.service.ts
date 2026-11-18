import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { parseCsv, serializeCsv } from './csv-parser.js';
import { parseXlsxBuffer } from './xlsx-parser.js';
import {
  PortabilityTarget,
  ExportTarget,
  DuplicateStrategy,
} from './dto/import-export.dto.js';
import {
  CsvMeasurementRowSchema,
  CsvMeasurementRow,
  CsvNutritionRowSchema,
  CsvNutritionRow,
  CsvWorkoutRowSchema,
  CsvWorkoutRow,
} from './dto/csv-row.schema.js';
import { calculateWorkoutExpenditure, BiomechanicalSetInput } from '../workout/expenditure/biomechanical-expenditure.js';
import { parseReps } from './smart-sanitizer.js';

export interface ImportResultSummary {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
  createdPlanId?: string;
  createdPlanName?: string;
}

@Injectable()
export class PortabilityService {
  private readonly logger = new Logger(PortabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Importatore universale CSV / XLSX con auto-detection Strong, Hevy, MyFitnessPal e HaruKaizen standard.
   */
  async importCsv(
    userId: string,
    target: PortabilityTarget,
    csvContent: string,
    customMapping?: Record<string, string>,
    strategy: DuplicateStrategy = DuplicateStrategy.SKIP,
    xlsxBuffer?: Buffer,
    originalFilename?: string,
  ): Promise<ImportResultSummary> {
    let headers: string[] = [];
    let dataRows: string[][] = [];

    if (xlsxBuffer && xlsxBuffer.length > 0) {
      const parsedXlsx = parseXlsxBuffer(xlsxBuffer);
      headers = parsedXlsx.headers;
      dataRows = parsedXlsx.rows;
    } else {
      if (!csvContent || typeof csvContent !== 'string') {
        throw new BadRequestException('Contenuto file vuoto o non valido.');
      }
      const rawRows = parseCsv(csvContent);
      if (rawRows.length < 2) {
        return { totalRows: 0, importedCount: 0, skippedCount: 0, errors: [] };
      }
      headers = rawRows[0].map((h) => h.trim());
      dataRows = rawRows.slice(1);
    }

    if (headers.length === 0 || dataRows.length === 0) {
      return { totalRows: 0, importedCount: 0, skippedCount: 0, errors: [] };
    }
    const totalRows = dataRows.length;

    // Risoluzione mapping colonne (custom o auto-detect)
    const mapping = customMapping && Object.keys(customMapping).length > 0
      ? customMapping
      : this.autoDetectMapping(target, headers);

    const errors: Array<{ row: number; message: string }> = [];
    let importedCount = 0;
    let skippedCount = 0;
    let createdPlanId: string | undefined = undefined;
    let createdPlanName: string | undefined = undefined;

    switch (target) {
      case PortabilityTarget.MEASUREMENTS: {
        const validatedRows: Array<{ rowNumber: number; data: CsvMeasurementRow }> = [];

        dataRows.forEach((r, idx) => {
          const rowObj = this.mapRowToObject(headers, r, mapping);
          const parsed = CsvMeasurementRowSchema.safeParse(rowObj);
          if (!parsed.success) {
            errors.push({
              row: idx + 2,
              message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
            });
          } else {
            validatedRows.push({ rowNumber: idx + 2, data: parsed.data });
          }
        });

        await this.prisma.$transaction(async (tx) => {
          for (const item of validatedRows) {
            const dateObj = new Date(item.data.recordedAt);
            if (isNaN(dateObj.getTime())) {
              errors.push({ row: item.rowNumber, message: 'Data di registrazione non valida' });
              continue;
            }

            const existing = await tx.measurement.findFirst({
              where: {
                userId,
                recordedAt: dateObj,
                deletedAt: null,
              },
            });

            if (existing) {
              if (strategy === DuplicateStrategy.OVERWRITE) {
                await tx.measurement.update({
                  where: { id: existing.id },
                  data: {
                    weightKg: item.data.weightKg,
                    bodyFatPercentage: item.data.bodyFatPercentage ?? existing.bodyFatPercentage,
                    waistCm: item.data.waistCm ?? existing.waistCm,
                    chestCm: item.data.chestCm ?? existing.chestCm,
                    armsCm: item.data.armsCm ?? existing.armsCm,
                    legsCm: item.data.legsCm ?? existing.legsCm,
                  },
                });
                importedCount++;
              } else {
                skippedCount++;
              }
            } else {
              await tx.measurement.create({
                data: {
                  userId,
                  recordedAt: dateObj,
                  weightKg: item.data.weightKg,
                  bodyFatPercentage: item.data.bodyFatPercentage ?? null,
                  waistCm: item.data.waistCm ?? null,
                  chestCm: item.data.chestCm ?? null,
                  armsCm: item.data.armsCm ?? null,
                  legsCm: item.data.legsCm ?? null,
                },
              });
              importedCount++;
            }
          }
        });
        break;
      }

      case PortabilityTarget.NUTRITION_LOGS: {
        const validatedRows: Array<{ rowNumber: number; data: CsvNutritionRow }> = [];

        dataRows.forEach((r, idx) => {
          const rowObj = this.mapRowToObject(headers, r, mapping);
          const parsed = CsvNutritionRowSchema.safeParse(rowObj);
          if (!parsed.success) {
            errors.push({
              row: idx + 2,
              message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
            });
          } else {
            validatedRows.push({ rowNumber: idx + 2, data: parsed.data });
          }
        });

        await this.prisma.$transaction(async (tx) => {
          for (const item of validatedRows) {
            const logDate = new Date(item.data.loggedAt);
            if (isNaN(logDate.getTime())) {
              errors.push({ row: item.rowNumber, message: 'Data del pasto non valida' });
              continue;
            }

            await tx.nutritionLog.create({
              data: {
                userId,
                loggedAt: logDate,
                mealType: item.data.mealType,
                customFoodName: item.data.foodName,
                quantityG: item.data.quantityG,
                caloriesConsumed: item.data.caloriesConsumed,
                proteinConsumed: item.data.proteinConsumed ?? null,
                carbsConsumed: item.data.carbsConsumed ?? null,
                fatConsumed: item.data.fatConsumed ?? null,
              },
            });
            importedCount++;
          }
        });
        break;
      }

      case PortabilityTarget.WORKOUT_LOGS: {
        const validatedRows: Array<{ rowNumber: number; data: CsvWorkoutRow }> = [];

        // Check if the spreadsheet represents a prescriptive workout plan template
        const hasDayOrSection = headers.some((h) => {
          const l = h.toLowerCase().trim();
          return (
            l === 'giorno' ||
            l.includes('giorno') ||
            l === 'sezione' ||
            l.includes('sezione') ||
            l === 'scheda' ||
            l === 'day'
          );
        });

        const hasExplicitDateColumn = headers.some((h) => {
          const l = h.toLowerCase().trim();
          return (
            l === 'date' ||
            l === 'data' ||
            l === 'workout date' ||
            l === 'started' ||
            l === 'logged_at'
          );
        });

        const isPrescriptiveTemplate = hasDayOrSection || !hasExplicitDateColumn;

        dataRows.forEach((r, idx) => {
          const rowObj = this.mapRowToObject(headers, r, mapping);

          // Pass raw weight string to loadNote for rich human string preservation
          if (rowObj['weightKg']) {
            rowObj['loadNote'] = rowObj['weightKg'];
          }

          // Skip completely empty spacer rows (common in spreadsheet exports)
          if (!rowObj['exerciseName'] || String(rowObj['exerciseName']).trim() === '') {
            return;
          }

          // Riconoscimento e decomposizione automatica "Serie x Ripetizioni" (es. "3x10", "4 x 8-10", "2 x 15")
          const rawMerged = rowObj['mergedSetsReps'] || '';
          const match = String(rawMerged).match(/^(\d+)\s*[xX*]\s*(.+)$/);

          if (match) {
            const numSets = parseInt(match[1], 10);
            const rawReps = match[2].trim();
            const { repsTarget, repsCompleted } = parseReps(rawReps);

            if (isPrescriptiveTemplate) {
              rowObj['setOrder'] = String(numSets);
              rowObj['repsTarget'] = repsTarget;
              rowObj['repsCompleted'] = String(repsCompleted);
            } else {
              for (let s = 1; s <= numSets; s++) {
                const expandedObj = {
                  ...rowObj,
                  date: rowObj.date || new Date().toISOString(),
                  workoutName: rowObj.workoutName || 'Allenamento Importato',
                  setOrder: String(s),
                  repsCompleted: String(repsCompleted),
                  repsTarget: repsTarget,
                };
                const parsed = CsvWorkoutRowSchema.safeParse(expandedObj);
                if (parsed.success) {
                  validatedRows.push({ rowNumber: idx + 2, data: parsed.data });
                }
              }
              return;
            }
          }

          const parsed = CsvWorkoutRowSchema.safeParse(rowObj);
          if (!parsed.success) {
            errors.push({
              row: idx + 2,
              message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
            });
          } else {
            validatedRows.push({ rowNumber: idx + 2, data: parsed.data });
          }
        });

        // Determinazione nome della scheda prescrittiva
        let planTitle = 'Scheda Allenamento Importata';
        if (originalFilename) {
          const clean = originalFilename
            .replace(/\.[^/.]+$/, '')
            .replace(/\s*[-_]\s*untitled/gi, '')
            .replace(/\s*[-_]\s*template/gi, '')
            .trim();
          if (clean.length > 0) {
            planTitle = clean;
          }
        } else if (validatedRows[0]?.data.workoutName && !validatedRows[0]?.data.workoutName.toLowerCase().startsWith('giorno')) {
          planTitle = `Scheda - ${validatedRows[0].data.workoutName}`;
        }

        await this.prisma.$transaction(async (tx) => {
          if (isPrescriptiveTemplate && validatedRows.length > 0) {
            // 1. PURE PRESCRIPTIVE TEMPLATE: WorkoutPlan + WorkoutDay + WorkoutDayExercise ONLY
            // Never create fake historical WorkoutLog entries in the user feed
            await tx.workoutPlan.updateMany({
              where: { userId, isActive: true },
              data: { isActive: false },
            });

            const createdPlan = await tx.workoutPlan.create({
              data: {
                userId,
                name: planTitle,
                origin: 'USER',
                isActive: true,
                isAiIsolated: false,
              },
            });

            createdPlanId = createdPlan.id;
            createdPlanName = createdPlan.name;

            // Raggruppa per Giorno / Sezione mantenendo l'ordine di apparizione
            const daysOrderMap = new Map<string, typeof validatedRows>();
            for (const item of validatedRows) {
              const dayName = item.data.workoutName || 'Giorno 1';
              if (!daysOrderMap.has(dayName)) {
                daysOrderMap.set(dayName, []);
              }
              daysOrderMap.get(dayName)!.push(item);
            }

            let dayOrder = 1;
            for (const [dayName, dayItems] of daysOrderMap.entries()) {
              const workoutDay = await tx.workoutDay.create({
                data: {
                  workoutPlanId: createdPlan.id,
                  name: dayName,
                  orderIndex: dayOrder,
                  dayOrder: dayOrder,
                },
              });
              dayOrder++;

              let exOrder = 1;
              for (const dayItem of dayItems) {
                const exName = dayItem.data.exerciseName.trim();

                let exercise = await tx.exercise.findFirst({
                  where: { name: { equals: exName, mode: 'insensitive' } },
                });

                if (!exercise) {
                  exercise = await tx.exercise.create({
                    data: {
                      name: exName,
                      category: dayItem.data.category || 'CHEST',
                      defaultMetValue: 5.0,
                      createdByUserId: userId,
                      isVerified: false,
                    },
                  });
                }

                const repsStr = dayItem.data.repsTarget || String(dayItem.data.repsCompleted || 10);
                const weightKg = dayItem.data.weightKg ?? 0;
                const loadNote = dayItem.data.loadNote;
                const explicitNotes = dayItem.data.notes;
                const noteParts = [
                  loadNote ? `Carico: ${loadNote}` : null,
                  explicitNotes || null,
                ].filter(Boolean);
                const combinedNotes = noteParts.length > 0 ? noteParts.join(' | ') : null;

                await tx.workoutDayExercise.create({
                  data: {
                    workoutDayId: workoutDay.id,
                    exerciseId: exercise.id,
                    orderIndex: exOrder++,
                    sets: dayItem.data.setOrder || 3,
                    repsTarget: repsStr,
                    weightTarget: loadNote || (weightKg > 0 ? `${weightKg} kg` : null),
                    weightTargetKg: weightKg > 0 ? weightKg : null,
                    rpeTarget: dayItem.data.rpe ?? null,
                    restSeconds: dayItem.data.restSeconds || 90,
                    notes: combinedNotes,
                  },
                });

                importedCount++;
              }
            }
          } else if (validatedRows.length > 0) {
            // 2. DYNAMIC EXECUTION LOGGING (Real historical logs with timestamps)
            const grouped = new Map<string, CsvWorkoutRow[]>();
            for (const item of validatedRows) {
              const dateStr = item.data.date.split('T')[0].split(' ')[0];
              const groupKey = `${dateStr}__${item.data.workoutName}`;
              if (!grouped.has(groupKey)) {
                grouped.set(groupKey, []);
              }
              grouped.get(groupKey)!.push(item.data);
            }

            for (const [key, sets] of grouped.entries()) {
              const [dateStr, workoutName] = key.split('__');
              const sessionDate = new Date(dateStr);

              let workoutLog = await tx.workoutLog.findFirst({
                where: {
                  userId,
                  dayNameSnapshot: workoutName,
                  startedAt: sessionDate,
                  deletedAt: null,
                },
              });

              if (!workoutLog) {
                workoutLog = await tx.workoutLog.create({
                  data: {
                    userId,
                    dayNameSnapshot: workoutName,
                    startedAt: sessionDate,
                    finishedAt: new Date(sessionDate.getTime() + 60 * 60 * 1000),
                    durationMinutes: 60,
                    caloriesBurned: 350,
                  },
                });
              }

              const exerciseGroups = new Map<string, CsvWorkoutRow[]>();
              for (const s of sets) {
                const exName = s.exerciseName.trim();
                if (!exerciseGroups.has(exName)) {
                  exerciseGroups.set(exName, []);
                }
                exerciseGroups.get(exName)!.push(s);
              }

              const flatBiomechanicalSets: BiomechanicalSetInput[] = [];

              for (const [exName, exSets] of exerciseGroups.entries()) {
                let exercise = await tx.exercise.findFirst({
                  where: { name: { equals: exName, mode: 'insensitive' } },
                });

                if (!exercise) {
                  exercise = await tx.exercise.create({
                    data: {
                      name: exName,
                      category: exSets[0]?.category || 'CHEST',
                      defaultMetValue: 5.0,
                      createdByUserId: userId,
                      isVerified: false,
                    },
                  });
                }

                const logExercise = await tx.workoutLogExercise.create({
                  data: {
                    workoutLogId: workoutLog.id,
                    exerciseNameSnapshot: exName,
                    isSkipped: false,
                    notes: exSets[0]?.notes || exSets[0]?.loadNote || null,
                  },
                });

                for (const setItem of exSets) {
                  await tx.workoutLogSet.create({
                    data: {
                      workoutLogExerciseId: logExercise.id,
                      orderIndex: setItem.setOrder,
                      setType: 'WORKING',
                      weightKg: setItem.weightKg ?? null,
                      repsCompleted: setItem.repsCompleted ?? null,
                      rpe: setItem.rpe ?? null,
                    },
                  });

                  flatBiomechanicalSets.push({
                    setType: 'WORKING',
                    weightKg: setItem.weightKg,
                    repsCompleted: setItem.repsCompleted,
                    rpe: setItem.rpe,
                    restSeconds: setItem.restSeconds,
                    exerciseName: exName,
                  });

                  importedCount++;
                }
              }

              const expenditure = calculateWorkoutExpenditure({
                sets: flatBiomechanicalSets,
                userWeightKg: 75,
              });

              await tx.workoutLog.update({
                where: { id: workoutLog.id },
                data: {
                  durationMinutes: expenditure.finalDurationMinutes,
                  caloriesBurned: expenditure.caloriesBurned,
                },
              });
            }
          }
        });
        break;
      }
    }

    this.logger.log(
      `Importazione CSV completata per ${target}: ${importedCount} importati, ${skippedCount} saltati, ${errors.length} errori su ${totalRows} totali.`,
    );

    return {
      totalRows,
      importedCount,
      skippedCount,
      errors,
      createdPlanId,
      createdPlanName,
    };
  }

  /**
   * Esportazione Sovrana in formato CSV conforme RFC-4180 o Snapshot JSON completo (GDPR-grade).
   */
  async exportData(userId: string, target: ExportTarget): Promise<{ content: string; contentType: string; filename: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    switch (target) {
      case ExportTarget.MEASUREMENTS: {
        const records = await this.prisma.measurement.findMany({
          where: { userId, deletedAt: null },
          orderBy: { recordedAt: 'asc' },
        });

        const headers = ['recordedAt', 'weightKg', 'bodyFatPercentage', 'waistCm', 'chestCm', 'armsCm', 'legsCm'];
        const rows = records.map((r) => [
          r.recordedAt.toISOString().split('T')[0],
          r.weightKg,
          r.bodyFatPercentage,
          r.waistCm,
          r.chestCm,
          r.armsCm,
          r.legsCm,
        ]);

        return {
          content: serializeCsv(headers, rows),
          contentType: 'text/csv; charset=utf-8',
          filename: `harukaizen_measurements_${timestamp}.csv`,
        };
      }

      case ExportTarget.NUTRITION_LOGS: {
        const records = await this.prisma.nutritionLog.findMany({
          where: { userId, deletedAt: null },
          include: { foodItem: true },
          orderBy: { loggedAt: 'asc' },
        });

        const headers = [
          'loggedAt',
          'mealType',
          'foodName',
          'quantityG',
          'caloriesConsumed',
          'proteinConsumed',
          'carbsConsumed',
          'fatConsumed',
        ];
        const rows = records.map((r) => [
          r.loggedAt.toISOString(),
          r.mealType,
          r.foodItem?.name || r.customFoodName || 'Alimento',
          r.quantityG,
          r.caloriesConsumed,
          r.proteinConsumed,
          r.carbsConsumed,
          r.fatConsumed,
        ]);

        return {
          content: serializeCsv(headers, rows),
          contentType: 'text/csv; charset=utf-8',
          filename: `harukaizen_nutrition_${timestamp}.csv`,
        };
      }

      case ExportTarget.WORKOUT_LOGS: {
        const logs = await this.prisma.workoutLog.findMany({
          where: { userId, deletedAt: null },
          include: {
            logExercises: {
              include: { logSets: true },
            },
          },
          orderBy: { startedAt: 'asc' },
        });

        const headers = ['date', 'workoutName', 'exerciseName', 'setOrder', 'setType', 'weightKg', 'repsCompleted', 'rpe'];
        const rows: any[][] = [];

        logs.forEach((log) => {
          const dateStr = log.startedAt ? log.startedAt.toISOString().split('T')[0] : '';
          const workoutName = log.dayNameSnapshot;

          log.logExercises.forEach((ex) => {
            ex.logSets.forEach((s) => {
              rows.push([
                dateStr,
                workoutName,
                ex.exerciseNameSnapshot,
                s.orderIndex,
                s.setType,
                s.weightKg,
                s.repsCompleted,
                s.rpe,
              ]);
            });
          });
        });

        return {
          content: serializeCsv(headers, rows),
          contentType: 'text/csv; charset=utf-8',
          filename: `harukaizen_workouts_${timestamp}.csv`,
        };
      }

      case ExportTarget.ALL_JSON: {
        const [user, settings, measurements, nutritionLogs, workoutLogs, documents, insights] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              role: true,
              heightCm: true,
              sex: true,
              birthDate: true,
              lifestyleMultiplier: true,
              dietTrackingMode: true,
              createdAt: true,
            },
          }),
          this.prisma.userSettings.findUnique({
            where: { userId },
            select: {
              timezone: true,
              locale: true,
              preferredLlmProvider: true,
              preferredLlmModel: true,
              customLlmBaseUrl: true,
              targetWeightKg: true,
              coachTone: true,
              isDarkMode: true,
            },
          }),
          this.prisma.measurement.findMany({
            where: { userId, deletedAt: null },
            orderBy: { recordedAt: 'asc' },
          }),
          this.prisma.nutritionLog.findMany({
            where: { userId, deletedAt: null },
            orderBy: { loggedAt: 'asc' },
          }),
          this.prisma.workoutLog.findMany({
            where: { userId, deletedAt: null },
            include: {
              logExercises: {
                include: { logSets: true },
              },
            },
            orderBy: { startedAt: 'asc' },
          }),
          this.prisma.userDocument.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.aiInsightReport.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        const fullSnapshot = {
          exportMetadata: {
            app: 'HaruKaizen Sovereign Fitness',
            version: '2.4.0',
            exportedAt: new Date().toISOString(),
            license: 'Sovereign Local Data Guarantee',
          },
          user,
          settings,
          measurements,
          nutritionLogs,
          workoutLogs,
          documents,
          insights,
        };

        return {
          content: JSON.stringify(fullSnapshot, null, 2),
          contentType: 'application/json; charset=utf-8',
          filename: `harukaizen_sovereign_backup_${timestamp}.json`,
        };
      }
    }
  }

  /**
   * Riconoscimento intelligente delle colonne per preset di app terze.
   */
  private autoDetectMapping(target: PortabilityTarget, headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

    const findHeader = (candidates: string[]): string | undefined => {
      for (const cand of candidates) {
        const idx = lowerHeaders.findIndex((h) => h === cand || h.includes(cand));
        if (idx !== -1) return headers[idx];
      }
      return undefined;
    };

    switch (target) {
      case PortabilityTarget.MEASUREMENTS: {
        const dateH = findHeader(['date', 'recordedat', 'data', 'timestamp']);
        const weightH = findHeader(['weight', 'peso', 'weightkg', 'body weight', 'kg']);
        const fatH = findHeader(['bodyfat', 'fat', 'grasso', 'bf', 'body fat %']);
        const waistH = findHeader(['waist', 'vita']);
        const chestH = findHeader(['chest', 'petto']);
        const armsH = findHeader(['arms', 'braccia', 'biceps']);
        const legsH = findHeader(['legs', 'gambe', 'quads']);

        if (dateH) mapping['recordedAt'] = dateH;
        if (weightH) mapping['weightKg'] = weightH;
        if (fatH) mapping['bodyFatPercentage'] = fatH;
        if (waistH) mapping['waistCm'] = waistH;
        if (chestH) mapping['chestCm'] = chestH;
        if (armsH) mapping['armsCm'] = armsH;
        if (legsH) mapping['legsCm'] = legsH;
        break;
      }

      case PortabilityTarget.NUTRITION_LOGS: {
        const dateH = findHeader(['date', 'loggedat', 'data', 'timestamp']);
        const mealH = findHeader(['meal', 'pasto', 'mealtype']);
        const foodH = findHeader(['food', 'alimento', 'name', 'item', 'food name']);
        const qtyH = findHeader(['quantity', 'quantità', 'grams', 'g', 'amount']);
        const calH = findHeader(['calories', 'calorie', 'kcal', 'energy']);
        const protH = findHeader(['protein', 'proteine', 'prot']);
        const carbH = findHeader(['carbohydrates', 'carbs', 'carboidrati']);
        const fatH = findHeader(['fat', 'grassi', 'lipid']);

        if (dateH) mapping['loggedAt'] = dateH;
        if (mealH) mapping['mealType'] = mealH;
        if (foodH) mapping['foodName'] = foodH;
        if (qtyH) mapping['quantityG'] = qtyH;
        if (calH) mapping['caloriesConsumed'] = calH;
        if (protH) mapping['proteinConsumed'] = protH;
        if (carbH) mapping['carbsConsumed'] = carbH;
        if (fatH) mapping['fatConsumed'] = fatH;
        break;
      }

      case PortabilityTarget.WORKOUT_LOGS: {
        // Supporto specifico per Strong App, Hevy App e HaruKaizen standard
        const dateH = findHeader(['date', 'data', 'workout date', 'started']);
        const wNameH = findHeader(['giorno', 'sezione', 'scheda', 'day', 'workout name', 'nome allenamento', 'title', 'session']);
        const exNameH = findHeader(['exercise name', 'exercise', 'nome esercizio', 'exercise_title', 'esercizio']);
        const catH = findHeader(['category', 'categoria', 'body part', 'gruppo']);
        const setH = findHeader(['set order', 'set', 'set number', 'serie']);
        const weightH = findHeader([
          'target peso (ripresa)',
          'target peso',
          'settimana 1 (kg)',
          'settimana 1',
          'weight',
          'peso',
          'weight (kg)',
          'weight_kg',
          'kg',
          'carico (kg)',
          'carico',
        ]);
        const repsH = findHeader(['ripetizioni', 'repetitions', 'reps', 'rip']);
        const rpeH = findHeader(['rpe', 'intensity', 'sforzo']);
        const restH = findHeader(['recupero (s)', 'recupero', 'rest', 'rest seconds', 'rest_seconds', 'riposo', 'pausa']);
        const mergedH = findHeader(['serie x rip.', 'serie x ripetizioni', 'sets x reps', 'serie x rip', 'schema', 'serie/rip', 'set/rep']);
        const notesH = findHeader(['note esecuzione', 'note', 'notes', 'commenti', 'note esercizio']);

        if (dateH) mapping['date'] = dateH;
        if (wNameH) mapping['workoutName'] = wNameH;
        if (exNameH) mapping['exerciseName'] = exNameH;
        if (catH) mapping['category'] = catH;
        if (setH) mapping['setOrder'] = setH;
        if (weightH) mapping['weightKg'] = weightH;
        if (repsH) {
          mapping['repsCompleted'] = repsH;
          mapping['repsTarget'] = repsH;
        }
        if (rpeH) mapping['rpe'] = rpeH;
        if (restH) mapping['restSeconds'] = restH;
        if (mergedH) mapping['mergedSetsReps'] = mergedH;
        if (notesH) mapping['notes'] = notesH;
        break;
      }
    }

    return mapping;
  }

  private mapRowToObject(
    headers: string[],
    row: string[],
    mapping: Record<string, string>,
  ): Record<string, string> {
    const obj: Record<string, string> = {};

    for (const [targetField, csvHeaderName] of Object.entries(mapping)) {
      const colIdx = headers.findIndex((h) => h.toLowerCase() === csvHeaderName.toLowerCase());
      if (colIdx !== -1 && colIdx < row.length) {
        obj[targetField] = row[colIdx];
      }
    }

    return obj;
  }
}

