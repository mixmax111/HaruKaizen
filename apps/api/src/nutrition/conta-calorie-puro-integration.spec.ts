import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { MealSlotsService } from './meal-slots/meal-slots.service.js';
import { RecipesService } from './recipes/recipes.service.js';
import { FoodService } from './food/food.service.js';
import { FoodAggregatorService } from './food/food-aggregator.service.js';
import { UsersService } from '../users/users.service.js';
import { SyncService } from '../sync/sync.service.js';
import { MutationType } from '../sync/dto/batch-sync.dto.js';
import bcrypt from 'bcrypt';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://harukaizen:harukaizen_local_secret@localhost:5432/harukaizen_db?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

describe('Conta Calorie PURO — Integration Test Suite', () => {
  let mealSlotsService: MealSlotsService;
  let recipesService: RecipesService;
  let foodService: FoodService;
  let aggregatorService: FoodAggregatorService;
  let usersService: UsersService;
  let syncService: SyncService;

  let testUserId: string;
  let otherUserId: string;
  const testPassword = 'PasswordSegreta123!';

  beforeEach(async () => {
    // Mock cache manager
    const mockCache = {
      get: async () => null,
      set: async () => {},
      del: async () => {},
    } as any;

    const mockOff = {
      fetchByBarcode: async (barcode: string) => ({
        barcode,
        name: `Prodotto Concorrente OFF ${barcode}`,
        kcalPer100g: 220,
        proteinPer100g: 12,
        carbsPer100g: 28,
        fatPer100g: 6,
        source: 'OPEN_FOOD_FACTS',
      }),
      searchByName: async () => [],
    } as any;

    const mockUsda = {
      fetchByBarcode: async () => null,
      searchByName: async () => [],
    } as any;

    aggregatorService = new FoodAggregatorService(prisma as any, mockOff, mockUsda);
    foodService = new FoodService(prisma as any, aggregatorService, mockCache);
    mealSlotsService = new MealSlotsService(prisma as any);
    recipesService = new RecipesService(prisma as any);
    usersService = new UsersService(prisma as any);
    syncService = new SyncService(prisma as any);

    const hash = await bcrypt.hash(testPassword, 10);
    const uniqueEmail = `test_puro_${Date.now()}_${Math.random().toString(36).substring(7)}@test.local`;
    const otherEmail = `test_other_${Date.now()}_${Math.random().toString(36).substring(7)}@test.local`;

    const user = await prisma.user.create({
      data: {
        email: uniqueEmail,
        passwordHash: hash,
        authProvider: 'LOCAL',
        sex: 'M',
        heightCm: 180,
        birthDate: new Date('1995-05-15'),
        lifestyleMultiplier: 1.55,
      },
    });
    testUserId = user.id;

    const otherUser = await prisma.user.create({
      data: {
        email: otherEmail,
        passwordHash: hash,
        authProvider: 'LOCAL',
        sex: 'F',
        heightCm: 165,
        birthDate: new Date('1998-08-20'),
      },
    });
    otherUserId = otherUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. MealSlot CRUD, Gestione Conflitti e Riassegnazione Sicura', () => {
    it('crea automaticamente i 4 slot predefiniti al primo accesso', async () => {
      const slots = await mealSlotsService.list(testUserId);
      expect(slots).toHaveLength(4);
      expect(slots.map((s) => s.name)).toEqual(['Colazione', 'Pranzo', 'Cena', 'Spuntini']);
    });

    it('gestisce collisioni di nome offline rinominando in modo sicuro senza violare unicità', async () => {
      await mealSlotsService.list(testUserId); // crea default

      // Crea uno slot "Spuntini" che collide con quello esistente
      const res = await mealSlotsService.create(testUserId, {
        name: 'Spuntini',
        clientSideId: `client_slot_${Date.now()}`,
      });

      expect(res.status).toBe('APPLIED');
      expect(res.data.name).toBe('Spuntini (1)');
    });

    it('impedisce l\'eliminazione di uno slot con log collegati se non è fornito uno slot di fallback', async () => {
      const slots = await mealSlotsService.list(testUserId);
      const slotPranzo = slots.find((s) => s.name === 'Pranzo')!;

      // Crea un log associato a Pranzo
      await prisma.nutritionLog.create({
        data: {
          userId: testUserId,
          mealSlotId: slotPranzo.id,
          loggedAt: new Date(),
          mealType: 'LUNCH',
          customFoodName: 'Riso e pollo',
          quantityG: 200,
          caloriesConsumed: 450,
        },
      });

      // Tentativo di eliminazione senza fallback -> deve fallire
      await expect(mealSlotsService.delete(testUserId, slotPranzo.id)).rejects.toThrow(
        'Questo slot contiene 1 voci registrate nel diario'
      );
    });

    it('riassegna atomicamente tutti i log allo slot fallback durante l\'eliminazione', async () => {
      const slots = await mealSlotsService.list(testUserId);
      const slotPranzo = slots.find((s) => s.name === 'Pranzo')!;
      const slotCena = slots.find((s) => s.name === 'Cena')!;

      const log = await prisma.nutritionLog.create({
        data: {
          userId: testUserId,
          mealSlotId: slotPranzo.id,
          loggedAt: new Date(),
          mealType: 'LUNCH',
          customFoodName: 'Riso e pollo',
          quantityG: 200,
          caloriesConsumed: 450,
        },
      });

      const deleteRes = await mealSlotsService.delete(testUserId, slotPranzo.id, {
        fallbackMealSlotId: slotCena.id,
      });

      expect(deleteRes.success).toBe(true);
      expect(deleteRes.reassignedLogs).toBe(1);

      // Verifica che il log sia stato spostato a Cena
      const updatedLog = await prisma.nutritionLog.findUniqueOrThrow({ where: { id: log.id } });
      expect(updatedLog.mealSlotId).toBe(slotCena.id);

      // Verifica che lo slot Pranzo sia marcato deletedAt
      const deletedSlot = await prisma.mealSlot.findUniqueOrThrow({ where: { id: slotPranzo.id } });
      expect(deletedSlot.deletedAt).not.toBeNull();
      expect(deletedSlot.isActive).toBe(false);
    });
  });

  describe('2. FoodItem Copy-on-Write (CoW) e Protezione Cache', () => {
    it('la modifica di un alimento globale crea una copia privata dell\'utente lasciando intatta la riga globale', async () => {
      // 1. Crea un alimento globale (userId = null)
      const globalFood = await prisma.foodItem.create({
        data: {
          name: 'Pasta Integrale Barilla',
          barcode: `80768095${Date.now()}`,
          calories100g: 350,
          protein100g: 12,
          carbs100g: 65,
          fat100g: 2.5,
          userId: null,
          isUserEdited: false,
          source: 'OPEN_FOOD_FACTS',
        },
      });

      // 2. L'utente testUserId modifica l'alimento (es. corregge le proteine a 14g)
      const cowRes = await foodService.copyOnWrite(testUserId, globalFood.id, {
        protein100g: 14,
        calories100g: 358,
      });

      expect(cowRes.status).toBe('APPLIED');
      const userCopy = cowRes.data;

      // La copia privata appartiene all'utente e referenzia l'originale
      expect(userCopy.id).not.toBe(globalFood.id);
      expect(userCopy.userId).toBe(testUserId);
      expect(userCopy.basedOnId).toBe(globalFood.id);
      expect(userCopy.protein100g).toBe(14);
      expect(userCopy.isUserEdited).toBe(true);
      expect(userCopy.source).toBe('LOCAL');

      // La riga globale originale NON è stata toccata
      const checkGlobal = await prisma.foodItem.findUniqueOrThrow({ where: { id: globalFood.id } });
      expect(checkGlobal.userId).toBeNull();
      expect(checkGlobal.protein100g).toBe(12);
      expect(checkGlobal.isUserEdited).toBe(false);
    });

    it('il ripristino di una copia CoW elimina la copia utente e restituisce l\'originale', async () => {
      const globalFood = await prisma.foodItem.create({
        data: {
          name: 'Tonno al Naturale Rio Mare',
          calories100g: 100,
          protein100g: 24,
          carbs100g: 0,
          fat100g: 0.5,
          userId: null,
          source: 'OPEN_FOOD_FACTS',
        },
      });

      const cowRes = await foodService.copyOnWrite(testUserId, globalFood.id, {
        calories100g: 110,
      });

      const restoreRes = await foodService.restoreOriginal(testUserId, cowRes.data.id);
      expect(restoreRes.success).toBe(true);
      expect(restoreRes.restoredOriginal.id).toBe(globalFood.id);

      // Copia utente cancellata logicamente
      const deletedCopy = await prisma.foodItem.findUniqueOrThrow({ where: { id: cowRes.data.id } });
      expect(deletedCopy.deletedAt).not.toBeNull();
    });

    it('il refresh periodico della cache a 30 giorni tocca solo le righe globali (userId=null) e preserva le copie CoW utente', async () => {
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

      // Riga globale obsoleta (>30gg)
      const staleGlobal = await prisma.foodItem.create({
        data: {
          name: 'Latte Intero Globale',
          barcode: `800111${Date.now()}`,
          calories100g: 64,
          protein100g: 3.2,
          carbs100g: 4.8,
          fat100g: 3.6,
          userId: null,
          isUserEdited: false,
          fetchedAt: thirtyFiveDaysAgo,
          source: 'OPEN_FOOD_FACTS',
        },
      });

      // Copia CoW utente dell'alimento
      const userCoW = await prisma.foodItem.create({
        data: {
          name: 'Latte Intero (Mia Versione)',
          calories100g: 68,
          protein100g: 3.4,
          carbs100g: 5.0,
          fat100g: 3.8,
          userId: testUserId,
          basedOnId: staleGlobal.id,
          isUserEdited: true,
          fetchedAt: thirtyFiveDaysAgo,
          source: 'LOCAL',
        },
      });

      // Esegui il refresh globale
      const refreshResult = await foodService.refreshStaleGlobalFoods();

      expect(refreshResult.skippedUserCopies).toBeGreaterThanOrEqual(1);

      // Verifica che la copia utente non sia stata modificata né sovrascritta
      const checkUserCoW = await prisma.foodItem.findUniqueOrThrow({ where: { id: userCoW.id } });
      expect(checkUserCoW.name).toBe('Latte Intero (Mia Versione)');
      expect(checkUserCoW.calories100g).toBe(68);
      expect(checkUserCoW.isUserEdited).toBe(true);
      expect(checkUserCoW.userId).toBe(testUserId);
    });

    it('un client non può creare o modificare direttamente righe globali (userId=null)', async () => {
      // 1. Creazione da client assegna sempre userId dell'utente chiamante
      const createRes = await foodService.create(testUserId, {
        name: 'Snack Creato da Client',
        calories100g: 200,
        protein100g: 10,
        carbs100g: 20,
        fat100g: 5,
      });

      expect(createRes.data.userId).toBe(testUserId);
      expect(createRes.data.userId).not.toBeNull();

      // 2. Modifica di un alimento globale da parte di un client crea una copia CoW e non modifica la riga globale
      const globalRow = await prisma.foodItem.create({
        data: {
          name: 'Riga Globale Protetta',
          calories100g: 100,
          protein100g: 5,
          carbs100g: 15,
          fat100g: 2,
          userId: null,
        },
      });

      const modifyRes = await foodService.copyOnWrite(testUserId, globalRow.id, {
        calories100g: 150,
      });

      expect(modifyRes.data.id).not.toBe(globalRow.id);
      expect(modifyRes.data.userId).toBe(testUserId);

      const unchangedGlobal = await prisma.foodItem.findUniqueOrThrow({ where: { id: globalRow.id } });
      expect(unchangedGlobal.userId).toBeNull();
      expect(unchangedGlobal.calories100g).toBe(100);
    });
  });

  describe('3. Ricette Atomiche e Registrazione nel Diario', () => {
    it('crea ricetta e ingredienti come unità atomica e supporta SINGLE_ITEM ed EXPLODED log', async () => {
      // Alimenti per la ricetta
      const pasta = await prisma.foodItem.create({
        data: {
          name: 'Pasta',
          calories100g: 350,
          protein100g: 12,
          carbs100g: 70,
          fat100g: 1.5,
          userId: testUserId,
        },
      });

      const tonno = await prisma.foodItem.create({
        data: {
          name: 'Tonno',
          calories100g: 100,
          protein100g: 24,
          carbs100g: 0,
          fat100g: 1.0,
          userId: testUserId,
        },
      });

      const recipeRes = await recipesService.create(testUserId, {
        name: 'Pasta al Tonno Fit',
        defaultServings: 2,
        finishedWeightG: 400, // Cotto
        ingredients: [
          { foodItemId: pasta.id, quantity: 150, unit: 'g' },
          { foodItemId: tonno.id, quantity: 100, unit: 'g' },
        ],
      });

      expect(recipeRes.status).toBe('APPLIED');
      const recipe = recipeRes.data;
      expect(recipe.ingredients).toHaveLength(2);

      // Totale pasta (150g): 525 kcal, Tonno (100g): 100 kcal -> Totale: 625 kcal
      expect(recipe.calculation.totals.calories).toBe(625);
      expect(recipe.calculation.perServing.calories).toBe(313);

      // Log 1: SINGLE_ITEM (1 porzione = 50% ricetta)
      const singleLogRes = await recipesService.logRecipe(testUserId, {
        recipeId: recipe.id,
        portionType: 'SERVING',
        portionValue: 1,
        mode: 'SINGLE_ITEM',
      });

      expect(singleLogRes.logs).toHaveLength(1);
      const sLog = singleLogRes.logs[0];
      expect(sLog.entryType).toBe('RECIPE');
      expect(sLog.recipeId).toBe(recipe.id);
      expect(sLog.recipeNameSnapshot).toBe('Pasta al Tonno Fit');
      expect(sLog.caloriesConsumed).toBe(313);

      // Log 2: EXPLODED (1 porzione = 50% ricetta -> crea 2 log separati per pasta e tonno)
      const explodedRes = await recipesService.logRecipe(testUserId, {
        recipeId: recipe.id,
        portionType: 'SERVING',
        portionValue: 1,
        mode: 'EXPLODED',
      });

      expect(explodedRes.logs).toHaveLength(2);
      expect(explodedRes.logs.every((l) => l.recipeId === recipe.id)).toBe(true);
      expect(explodedRes.logs.some((l) => l.customFoodName === 'Pasta')).toBe(true);
      expect(explodedRes.logs.some((l) => l.customFoodName === 'Tonno')).toBe(true);
    });
  });

  describe('4. Sync Outbox Offline & Risoluzione Riferimenti Ordinata', () => {
    it('elabora FoodItem prima di NutritionLog anche se inviati in ordine inverso nella coda', async () => {
      const foodClientSideId = `cs_food_${Date.now()}`;
      const logClientSideId = `cs_log_${Date.now()}`;

      // Inviamo il log prima dell'alimento nella coda mutations
      const mutations = [
        {
          id: logClientSideId,
          type: MutationType.CREATE_NUTRITION_LOG,
          timestamp: new Date().toISOString(),
          payload: {
            foodItemClientSideId: foodClientSideId, // punta al clientSideId
            caloriesConsumed: 250,
            quantityG: 100,
          },
        },
        {
          id: foodClientSideId,
          type: MutationType.CREATE_FOOD_ITEM,
          timestamp: new Date().toISOString(),
          payload: {
            name: 'Barretta Proteica Offline',
            calories100g: 250,
            protein100g: 20,
            carbs100g: 20,
            fat100g: 8,
          },
        },
      ];

      const syncRes = await syncService.processBatchSync(testUserId, mutations);
      expect(syncRes.results.every((r) => r.status === 'SYNCED')).toBe(true);

      // Verifica che il log abbia risolto correttamente il foodItemId
      const savedLog = await prisma.nutritionLog.findUniqueOrThrow({
        where: {
          userId_clientSideId: {
            userId: testUserId,
            clientSideId: logClientSideId,
          },
        },
      });

      const savedFood = await prisma.foodItem.findUniqueOrThrow({
        where: {
          userId_clientSideId: {
            userId: testUserId,
            clientSideId: foodClientSideId,
          },
        },
      });

      expect(savedLog.foodItemId).toBe(savedFood.id);
    });

    it('risolve LWW respingendo una mutazione con timestamp clientUpdatedAt obsoleto', async () => {
      const clientSideId = `cs_slot_${Date.now()}`;
      const now = new Date();
      const pastTime = new Date(now.getTime() - 10000); // 10s nel passato

      // 1. Prima mutazione
      await syncService.processBatchSync(testUserId, [
        {
          id: clientSideId,
          type: MutationType.CREATE_MEAL_SLOT,
          timestamp: now.toISOString(),
          payload: { name: 'Pre-Workout' },
        },
      ]);

      // 2. Seconda mutazione con timestamp nel passato -> REJECTED_STALE
      const res = await syncService.processBatchSync(testUserId, [
        {
          id: clientSideId,
          type: MutationType.CREATE_MEAL_SLOT,
          timestamp: pastTime.toISOString(),
          payload: { name: 'Nome Vecchio' },
        },
      ]);

      const staleResult = res.results.find((r) => r.id === clientSideId);
      expect(staleResult?.status).toBe('REJECTED_STALE');
      expect(staleResult?.winner?.name).toBe('Pre-Workout');
    });

    it('LWW clamps future clientUpdatedAt to serverNow + 5 minutes', async () => {
      const clientSideId = `cs_clamp_${Date.now()}`;
      const distantFutureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 ore nel futuro

      await syncService.processBatchSync(testUserId, [
        {
          id: clientSideId,
          type: MutationType.CREATE_MEAL_SLOT,
          timestamp: distantFutureTime.toISOString(),
          payload: { name: 'Slot Futuro Protetto' },
        },
      ]);

      const slot = await prisma.mealSlot.findFirstOrThrow({
        where: { userId: testUserId, clientSideId },
      });

      const serverNow = Date.now();
      const maxAllowed = serverNow + 5 * 60 * 1000 + 1000;
      expect(slot.clientUpdatedAt!.getTime()).toBeLessThanOrEqual(maxAllowed);
    });

    it('concurrent sync of same external product barcode handles race conditions via partial unique index', async () => {
      const uniqueBarcode = `ean_race_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Chiamata simultanea da due richieste concorrenti per lo stesso barcode non presente in database
      const [res1, res2] = await Promise.all([
        aggregatorService.findByBarcode(uniqueBarcode),
        aggregatorService.findByBarcode(uniqueBarcode),
      ]);

      expect(res1).not.toBeNull();
      expect(res2).not.toBeNull();
      expect(res1?.id).toBe(res2?.id);

      // Nel database esiste rigorosamente UNA sola riga globale per questa coppia (source, external_id)
      const count = await prisma.foodItem.count({
        where: {
          source: 'OPEN_FOOD_FACTS',
          externalId: uniqueBarcode,
          userId: null,
          deletedAt: null,
        },
      });
      expect(count).toBe(1);
    });
  });

  describe('5. Cancellazione Totale Account & Zero Orfani (GDPR)', () => {
    it('elimina tutti i log, ricette, meal slots e FoodItem di proprietà senza lasciare righe orfane', async () => {
      // Popola dati per testUserId
      const userFood = await prisma.foodItem.create({
        data: {
          name: 'Alimento Privato da Eliminare',
          calories100g: 100,
          protein100g: 10,
          carbs100g: 10,
          fat100g: 2,
          userId: testUserId,
        },
      });

      const globalFood = await prisma.foodItem.create({
        data: {
          name: 'Alimento Globale che Deve Rimanere',
          calories100g: 200,
          protein100g: 5,
          carbs100g: 40,
          fat100g: 1,
          userId: null, // Globale
        },
      });

      await prisma.nutritionLog.create({
        data: {
          userId: testUserId,
          loggedAt: new Date(),
          mealType: 'DINNER',
          customFoodName: 'Cena test',
          quantityG: 100,
          caloriesConsumed: 300,
        },
      });

      // Esegui cancellazione totale account con conferma password corretta
      const delRes = await usersService.deleteAccount(testUserId, testPassword);
      expect(delRes.success).toBe(true);

      // Verifica che l'utente non esista più
      const checkUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(checkUser).toBeNull();

      // Verifica che tutti i FoodItem privati dell'utente siano spariti
      const checkUserFood = await prisma.foodItem.findUnique({ where: { id: userFood.id } });
      expect(checkUserFood).toBeNull();

      // Verifica che l'alimento globale NON sia stato cancellato
      const checkGlobal = await prisma.foodItem.findUnique({ where: { id: globalFood.id } });
      expect(checkGlobal).not.toBeNull();

      // Verifica 0 orfani su logs
      const orphanLogs = await prisma.nutritionLog.count({ where: { userId: testUserId } });
      expect(orphanLogs).toBe(0);
    });

    it('rifiuta la cancellazione dell\'account se la password di conferma è errata', async () => {
      await expect(
        usersService.deleteAccount(otherUserId, 'PasswordSbagliata!')
      ).rejects.toThrow('Password di conferma non valida');
    });
  });
});
