import { PrismaClient } from '@prisma/client';

export interface DedupMigrationOptions {
  dryRun?: boolean;
}

export interface DedupMigrationResult {
  backfilledSourceCount: number;
  duplicateGroupsFound: number;
  mergedDuplicatesCount: number;
  repointedReferences: {
    recipeIngredients: number;
    nutritionLogs: number;
    dietDayItems: number;
    basedOnCopies: number;
  };
  preCheckPassed: boolean;
  indexCreated: boolean;
}

/**
 * Migrazione con rilevamento e unione atomica dei duplicati (source, external_id)
 * tra le righe globali esistenti (userId IS NULL), aggiornamento dei riferimenti
 * e backfill di source prima della creazione sicura dell'indice univoco parziale.
 */
export async function runDedupGlobalFoodsMigration(
  prisma: PrismaClient,
  options: DedupMigrationOptions = {}
): Promise<DedupMigrationResult> {
  const dryRun = Boolean(options.dryRun);

  const result: DedupMigrationResult = {
    backfilledSourceCount: 0,
    duplicateGroupsFound: 0,
    mergedDuplicatesCount: 0,
    repointedReferences: {
      recipeIngredients: 0,
      nutritionLogs: 0,
      dietDayItems: 0,
      basedOnCopies: 0,
    },
    preCheckPassed: false,
    indexCreated: false,
  };

  // 1. Backfill source per righe globali che hanno source null o vuoto
  if (!dryRun) {
    const backfillOff = await prisma.$executeRawUnsafe(`
      UPDATE food_items
      SET source = 'OPEN_FOOD_FACTS'
      WHERE (source IS NULL OR source = '' OR source = 'LOCAL')
        AND external_id IS NOT NULL;
    `);

    const backfillLocal = await prisma.$executeRawUnsafe(`
      UPDATE food_items
      SET source = 'LOCAL'
      WHERE (source IS NULL OR source = '')
        AND external_id IS NULL;
    `);

    result.backfilledSourceCount = Number(backfillOff) + Number(backfillLocal);
  }

  // 2. Rilevamento duplicati (source, external_id) tra righe globali attive
  const duplicateGroups: Array<{ source: string; external_id: string; cnt: bigint | number }> =
    await prisma.$queryRawUnsafe(`
      SELECT source, external_id, COUNT(*) as cnt
      FROM food_items
      WHERE user_id IS NULL
        AND deleted_at IS NULL
        AND external_id IS NOT NULL
      GROUP BY source, external_id
      HAVING COUNT(*) > 1;
    `);

  result.duplicateGroupsFound = duplicateGroups.length;

  // 3. Unione e riassegnazione atomica dei riferimenti per ciascun gruppo
  for (const group of duplicateGroups) {
    const rows: Array<{ id: string; created_at: Date }> = await prisma.$queryRawUnsafe(
      `
      SELECT id, created_at
      FROM food_items
      WHERE user_id IS NULL
        AND deleted_at IS NULL
        AND source = $1
        AND external_id = $2
      ORDER BY created_at ASC, id ASC;
    `,
      group.source,
      group.external_id
    );

    if (rows.length <= 1) continue;

    const keeperId = rows[0].id;
    const duplicateIds = rows.slice(1).map((r) => r.id);

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        for (const dupId of duplicateIds) {
          // Riferimenti in recipe_ingredients
          const repointedRi = await tx.$executeRawUnsafe(
            `UPDATE recipe_ingredients SET food_item_id = $1 WHERE food_item_id = $2;`,
            keeperId,
            dupId
          );
          result.repointedReferences.recipeIngredients += Number(repointedRi);

          // Riferimenti in nutrition_logs
          const repointedLogs = await tx.$executeRawUnsafe(
            `UPDATE nutrition_logs SET food_item_id = $1 WHERE food_item_id = $2;`,
            keeperId,
            dupId
          );
          result.repointedReferences.nutritionLogs += Number(repointedLogs);

          // Riferimenti in diet_day_items
          const repointedDiet = await tx.$executeRawUnsafe(
            `UPDATE diet_day_items SET food_item_id = $1 WHERE food_item_id = $2;`,
            keeperId,
            dupId
          );
          result.repointedReferences.dietDayItems += Number(repointedDiet);

          // Riferimenti in copie CoW (based_on_id)
          const repointedCow = await tx.$executeRawUnsafe(
            `UPDATE food_items SET based_on_id = $1 WHERE based_on_id = $2;`,
            keeperId,
            dupId
          );
          result.repointedReferences.basedOnCopies += Number(repointedCow);

          // Soft delete della riga duplicata rendendola non conflittuale
          await tx.$executeRawUnsafe(
            `UPDATE food_items 
             SET deleted_at = NOW(),
                 external_id = external_id || '_merged_' || id
             WHERE id = $1;`,
            dupId
          );

          result.mergedDuplicatesCount += 1;
        }
      });
    } else {
      result.mergedDuplicatesCount += duplicateIds.length;
    }
  }

  // 4. Verifica pre-migrazione: controllo rigoroso che non esistano più duplicati
  const remainingDuplicates: Array<{ source: string; external_id: string; cnt: bigint | number }> =
    await prisma.$queryRawUnsafe(`
      SELECT source, external_id, COUNT(*) as cnt
      FROM food_items
      WHERE user_id IS NULL
        AND deleted_at IS NULL
        AND external_id IS NOT NULL
      GROUP BY source, external_id
      HAVING COUNT(*) > 1;
    `);

  if (remainingDuplicates.length > 0) {
    result.preCheckPassed = false;
    throw new Error(
      `Verifica pre-migrazione fallita: permangono ${remainingDuplicates.length} gruppi di duplicati globali.`
    );
  }

  result.preCheckPassed = true;

  // 5. Creazione sicura dell'indice univoco parziale Postgres
  if (!dryRun) {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_global_source_external_id
      ON food_items (source, external_id)
      WHERE user_id IS NULL AND deleted_at IS NULL;
    `);
    result.indexCreated = true;
  }

  return result;
}

