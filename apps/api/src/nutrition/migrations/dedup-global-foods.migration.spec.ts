import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';
import { runDedupGlobalFoodsMigration } from './dedup-global-foods.migration.js';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://harukaizen:harukaizen_local_secret@localhost:5432/harukaizen_db?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

describe('Dedup Global Foods Migration & Pre-check Verification', () => {
  let testUserId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `dedup_test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.local`,
        passwordHash: 'dummyhash',
        authProvider: 'LOCAL',
        sex: 'M',
        heightCm: 175,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rileva e unisce duplicati globali, riassegna riferimenti e crea indice parziale', async () => {
    // 0. Drop temporaneo dell'indice per simulare lo stato pre-migrazione con dati duplicati storici
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS unique_global_source_external_id;`);

    const testExternalId = `ext_barcode_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 1. Inserisce 2 righe globali duplicate (stesso source e external_id)
    const keeper = await prisma.foodItem.create({
      data: {
        name: 'Avena Globale Originale (Keeper)',
        calories100g: 370,
        protein100g: 13,
        carbs100g: 60,
        fat100g: 7,
        userId: null,
        source: 'OPEN_FOOD_FACTS',
        externalId: testExternalId,
        createdAt: new Date(Date.now() - 5000), // Più vecchia = keeper
      },
    });

    const duplicate = await prisma.foodItem.create({
      data: {
        name: 'Avena Globale Duplicata',
        calories100g: 370,
        protein100g: 13,
        carbs100g: 60,
        fat100g: 7,
        userId: null,
        source: 'OPEN_FOOD_FACTS',
        externalId: testExternalId,
        createdAt: new Date(), // Più recente = duplicato
      },
    });

    // 2. Crea riferimenti puntati sul record duplicato
    // - Recipe + RecipeIngredient
    const recipe = await prisma.recipe.create({
      data: {
        userId: testUserId,
        name: 'Porridge Dedup Test',
      },
    });

    const ri = await prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        foodItemId: duplicate.id, // Punta al duplicato!
        quantity: 50,
        unit: 'g',
      },
    });

    // - NutritionLog
    const log = await prisma.nutritionLog.create({
      data: {
        userId: testUserId,
        foodItemId: duplicate.id, // Punta al duplicato!
        loggedAt: new Date(),
        mealType: 'BREAKFAST',
        quantityG: 50,
        caloriesConsumed: 185,
      },
    });

    // - CoW Copy
    const cowCopy = await prisma.foodItem.create({
      data: {
        userId: testUserId,
        basedOnId: duplicate.id, // Punta al duplicato!
        name: 'La mia avena personalizzata',
        calories100g: 380,
        protein100g: 14,
        carbs100g: 60,
        fat100g: 7,
        isUserEdited: true,
        source: 'LOCAL',
      },
    });

    // 3. Esegui la migrazione con dedup
    const res = await runDedupGlobalFoodsMigration(prisma);

    expect(res.preCheckPassed).toBe(true);
    expect(res.mergedDuplicatesCount).toBeGreaterThanOrEqual(1);
    expect(res.indexCreated).toBe(true);

    // 4. Verifica che i riferimenti siano stati riassegnati a keeper.id
    const updatedRi = await prisma.recipeIngredient.findUniqueOrThrow({ where: { id: ri.id } });
    expect(updatedRi.foodItemId).toBe(keeper.id);

    const updatedLog = await prisma.nutritionLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(updatedLog.foodItemId).toBe(keeper.id);

    const updatedCow = await prisma.foodItem.findUniqueOrThrow({ where: { id: cowCopy.id } });
    expect(updatedCow.basedOnId).toBe(keeper.id);

    // 5. Verifica che il duplicato sia stato soft-deleted
    const checkDup = await prisma.foodItem.findUniqueOrThrow({ where: { id: duplicate.id } });
    expect(checkDup.deletedAt).not.toBeNull();

    // 6. Verifica che l'indice univoco parziale blocchi l'inserimento di un nuovo duplicato globale attivo
    await expect(
      prisma.foodItem.create({
        data: {
          name: 'Altro Duplicato Concorrente',
          calories100g: 370,
          protein100g: 13,
          carbs100g: 60,
          fat100g: 7,
          userId: null,
          source: 'OPEN_FOOD_FACTS',
          externalId: testExternalId, // Stessa chiave del keeper!
        },
      })
    ).rejects.toThrow();
  });
});
