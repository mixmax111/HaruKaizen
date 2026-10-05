# 🍎 HaruKaizen — Report Sprint 2 (Nutrition Engine)

> **Documento di tracciamento tecnico**: Riepilogo dettagliato dell'implementazione del modulo di Nutrizione (`NutritionModule`), integrazione OpenFoodFacts, Caching Redis, gestione piani alimentari e tracciamento pasti.

---

## 🏛️ 1. Decisioni Architetturali Consolidate per Sprint 2

| Decisione | Soluzione Implementata |
|---|---|
| **Alimenti Custom** | Creati come record `FoodItem` con `isVerified: false`, immediatamente accessibili globalmente alla community. |
| **OpenFoodFacts & Caching a 3 Livelli** | L1: Redis Cache (`@keyv/redis`, TTL 7 giorni).<br>L2: Database locale PostgreSQL (`food_items`).<br>L3: OpenFoodFacts API v2 pubblica con User-Agent descrittivo e timeout 3.5s con fallback a `NotFoundException` per non bloccare i client. |
| **Piani Alimentari Annidati** | `DietPlansService` gestisce la creazione atomica nidificata `DietPlan` -> `DietDay` -> `DietDayItem` tramite transazione Prisma (`$transaction`). |
| **Log Nutrizionale & Target TDEE** | Calcolo proporzionale automatico dei macro consumati (`caloriesConsumed`, `proteinConsumed`, `carbsConsumed`, `fatConsumed`) a partire da `quantityG` dell'alimento selezionato.<br>L'endpoint `GET /nutrition/summary` aggrega la giornata e calcola il confronto in tempo reale rispetto al TDEE biologico dell'utente. |

---

## 📁 2. Mappa File Implementati

### `apps/api/src/nutrition/`
* [`nutrition.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/nutrition.module.ts): Registrazione modulo `CacheModule` Redis asincrono, controller e provider.
* **Food & OpenFoodFacts**:
  * [`food/openfoodfacts.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/food/openfoodfacts.service.ts): Client Axios con timeout a 3.5s e normalizzazione a 100g.
  * [`food/food.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/food/food.service.ts): Gestione cache Redis, ricerca parziale nel catalogo e creazione alimenti.
  * [`food/food.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/food/food.controller.ts): Endpoint `GET /food/barcode/:barcode`, `GET /food/search?q=`, `POST /food`, `GET /food/:id`.
  * [`food/dto/create-food-item.dto.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/food/dto/create-food-item.dto.ts): Validazione DTO inserimento cibo.
* **Diet Plans**:
  * [`diet-plans/diet-plans.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/diet-plans/diet-plans.service.ts): CRUD, transazione per disattivare precedenti piani attivi e attivare il nuovo (`POST /diet-plans/:id/activate`).
  * [`diet-plans/diet-plans.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/diet-plans/diet-plans.controller.ts): Esposizione endpoint piani alimentari.
  * [`diet-plans/dto/create-diet-plan.dto.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/diet-plans/dto/create-diet-plan.dto.ts): DTO nidificati con `@ValidateNested` e `class-transformer`.
* **Nutrition Logs & Summary**:
  * [`logs/nutrition-logs.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/logs/nutrition-logs.service.ts): Calcolo macro su porzione in grammi, aggregazione `_sum` Prisma e calcolo TDEE da `User` e ultima `Measurement`.
  * [`logs/nutrition-logs.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/logs/nutrition-logs.controller.ts): Endpoint `POST /nutrition/logs`, `GET /nutrition/logs?date=`, `GET /nutrition/summary?date=`, `DELETE /nutrition/logs/:id`.
  * [`logs/dto/create-nutrition-log.dto.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/logs/dto/create-nutrition-log.dto.ts): DTO per log pasto.

---

## 🧪 3. Esiti Test & Compilazione

* **Compilazione NestJS**: `npm run build --workspace=api` completata con codice di uscita **0**.
* **Test Suite Vitest**: `npm test --workspace=api` completata con successo (**8 test su 8 passati**):
  * `OpenFoodFactsService` (mocking status positivo, timeout 3.5s, prodotto assente).
  * `NutritionLogsService` (calcolo proporzionale macro su 150g).
  * `CryptoService` (cifratura e tamper test).
  * `PrismaService` & `AppController`.
