# 🌸 HaruKaizen — Report Sprint 1 & Fondamenta (Sprint 0)

> **Documento di tracciamento tecnico**: Riepilogo dettagliato di tutti i componenti, file, standard architetturali e decisioni implementate durante il completamento dello Sprint 1 e delle relative fondamenta trasversali.

---

## 🏛️ 1. Decisioni Architetturali Consolidate

| Area | Scelta Adottata | Dettaglio Tecnico |
|---|---|---|
| **Autenticazione** | JWT Custom (NestJS + Passport) | Token a due livelli: `AccessToken` (scadenza 15m) in header `Authorization: Bearer`, `RefreshToken` (scadenza 7d) in cookie HTTP-only `refresh_token` (`SameSite=Strict`, `Secure` in prod). |
| **Crittografia Dati Sensibili** | AES-256-GCM | Utilizzo del modulo nativo `node:crypto`. IV casuale a 16 byte per ogni cifratura + Auth Tag a 16 byte (GCM) per verifica di integrità. Chiave a 256-bit da variabile d'ambiente `ENCRYPTION_KEY`. |
| **Caching Layer** | Redis 7 via Docker Compose | Stack identico tra ambiente locale e produzione (*Production Parity*), persistenza AOF abilitata (`--appendonly yes`) e porta mappata `6379:6379`. |
| **Granularità Allenamento** | Modello relazionale `WorkoutLogSet` | Passaggio da un semplice contatore `setsCompleted` a serie tracciate singolarmente riga per riga (`orderIndex`, `setType`, `repsCompleted`, `weightKg`, `rpe`, `notes`) per consentire all'AI il calcolo accurato del *progressive overload*. |
| **Dati Biologici / TDEE** | Modello `User` | Inserimento dei campi `heightCm`, `birthDate`, `sex` direttamente sul modello biologico `User` (distinto da `UserSettings` che conserva solo preferenze applicative). |
| **Architettura Monorepo** | NPM Workspaces + Shared Package | Creazione del package interno `@harukaizen/shared` per garantire *type-safety end-to-end* tra backend (NestJS), web (Next.js) e mobile (Expo). |

---

## 📁 2. Mappa Completa dei File Implementati

### 2.1 Infrastruttura & Configurazione di Root
* [`docker-compose.yml`](file:///c:/Users/Antonino/Documents/HaruKaizen/docker-compose.yml):
  * Servizio PostgreSQL 16 Alpine (porta `5433:5432`)
  * Servizio Redis 7 Alpine (porta `6379:6379`) con volume `harukaizen-redis-data`
  * Traefik v3.0 come reverse proxy
* [`.env`](file:///c:/Users/Antonino/Documents/HaruKaizen/.env):
  * Variabili configurate: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `PORT`, `WEB_ORIGIN`.
* [`schema.prisma`](file:///c:/Users/Antonino/Documents/HaruKaizen/schema.prisma):
  * Aggiunti campi `height_cm`, `birth_date`, `sex` su `User`.
  * Creata la tabella `workout_log_sets` collegata a `workout_log_exercises`.
  * Configurato `@unique` su `FoodItem.barcode`.
* [`prisma/seed.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/prisma/seed.ts):
  * Script di seeding con 2 account di test (`admin@harukaizen.dev`, `user@harukaizen.dev`).
  * Inserimento catalogo di 50 esercizi fondamentali divisi per categorie muscolari con valori MET pre-configurati.

---

### 2.2 Package Condiviso (`packages/shared`)
* [`packages/shared/package.json`](file:///c:/Users/Antonino/Documents/HaruKaizen/packages/shared/package.json): Configurato come `@harukaizen/shared`.
* [`packages/shared/src/enums/index.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/packages/shared/src/enums/index.ts):
  * `UserRole`: `ADMIN`, `USER`
  * `Sex`: `M`, `F`
  * `MealType`: `BREAKFAST`, `LUNCH`, `DINNER`, `SNACK`
  * `ExerciseCategory`: `CHEST`, `BACK`, `LEGS`, `SHOULDERS`, `ARMS`, `CORE`, `CARDIO`
  * `SetType`: `WARMUP`, `WORKING`, `DROP`, `FAILURE`
  * `LlmProvider`: `openai`, `anthropic`
  * `ReportType`: `WEEKLY`, `MONTHLY`, `ON_DEMAND`
* [`packages/shared/src/constants/nutrition.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/packages/shared/src/constants/nutrition.ts):
  * `calculateBMR()`: Formula Mifflin-St Jeor.
  * `calculateTDEE()`: Calcolo dispendio energetico con moltiplicatore attività (`ACTIVITY_MULTIPLIERS`).
  * `calculateSetVolume()`: Calcolo volume della serie (`weightKg * reps`).
  * `estimateCaloriesBurned()`: Stima consumo calorico basato su valore MET.
* [`packages/shared/src/constants/date.utils.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/packages/shared/src/constants/date.utils.ts): Calcolo età anagrafica pura.

---

### 2.3 Backend API (`apps/api`)

#### Core & Pipeline Globale
* [`apps/api/src/main.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/main.ts):
  * Sicurezza con `helmet()` e parsing cookie con `cookie-parser`.
  * CORS abilitato con credenziali per il frontend web.
  * Global prefix: `api/v1`.
  * `ValidationPipe` globale con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
  * Registrazione filtri e interceptor globali.
* [`apps/api/src/app.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/app.module.ts):
  * Registrazione `ConfigModule` con validazione `validateEnv`.
  * Rimozione di `@nestjs/observe` per eliminare qualsiasi credenziale hardcoded.
  * `APP_GUARD` con `JwtAuthGuard` globale su tutte le route.
* [`apps/api/src/config/env.validation.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/config/env.validation.ts):
  * Schema Zod per garantire la presenza di tutte le chiavi minime richieste. Fail-fast allo startup in caso di errore.
* [`apps/api/src/common/filters/all-exceptions.filter.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/common/filters/all-exceptions.filter.ts):
  * Cattura errori Prisma (`P2002` → 409 Conflict, `P2025` → 404 Not Found, `P2003` → 400 Bad Request) e `HttpException`.
* [`apps/api/src/common/interceptors/transform.interceptor.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/common/interceptors/transform.interceptor.ts):
  * Wrapper uniforme per tutte le risposte: `{ data: T, meta: { timestamp, path } }`.
* [`apps/api/src/common/decorators/current-user.decorator.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/common/decorators/current-user.decorator.ts): Estrazione sicura del payload JWT dalla richiesta.
* [`apps/api/src/common/decorators/public.decorator.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/common/decorators/public.decorator.ts): Bypassa il `JwtAuthGuard` per le route aperte.
* [`apps/api/src/common/decorators/roles.decorator.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/common/decorators/roles.decorator.ts): RBAC per endpoint amministrativi.

#### Database Module
* [`apps/api/src/prisma/prisma.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/prisma/prisma.service.ts):
  * Configurato con driver adapter `@prisma/adapter-pg` compatibile con Prisma 7.
* [`apps/api/src/prisma/prisma.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/prisma/prisma.module.ts): Modulo `@Global()`.

#### Crypto Module
* [`apps/api/src/crypto/crypto.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/crypto/crypto.service.ts): Servizio cifratura/decifratura AES-256-GCM.
* [`apps/api/src/crypto/crypto.service.spec.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/crypto/crypto.service.spec.ts): Test di verifica crittografica e resistenza alla manomissione dell'Auth Tag.

#### Auth Module
* [`apps/api/src/auth/auth.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/auth/auth.service.ts): Registrazione, login con confronto hash bcrypt, generazione e rotazione token.
* [`apps/api/src/auth/auth.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/auth/auth.controller.ts):
  * `POST /api/v1/auth/register` (pubblico)
  * `POST /api/v1/auth/login` (pubblico)
  * `POST /api/v1/auth/refresh` (protetto da refresh token cookie)
  * `POST /api/v1/auth/logout` (cancella il cookie)
* [`apps/api/src/auth/strategies/jwt.strategy.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/auth/strategies/jwt.strategy.ts): Validazione Bearer token.
* [`apps/api/src/auth/strategies/jwt-refresh.strategy.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/auth/strategies/jwt-refresh.strategy.ts): Estrazione e validazione dal cookie HTTP-only.
* [`apps/api/src/auth/guards/jwt-auth.guard.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/auth/guards/jwt-auth.guard.ts): Guard di default.
* [`apps/api/src/auth/guards/roles.guard.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/auth/guards/roles.guard.ts): Guard RBAC.

#### Users Module
* [`apps/api/src/users/users.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/users/users.controller.ts):
  * `GET /api/v1/users/me` (dati profilo senza passwordHash)
  * `PATCH /api/v1/users/me` (aggiornamento altezza, sesso, data di nascita, lifestyle)
* [`apps/api/src/users/users.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/users/users.service.ts) & [`update-user.dto.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/users/dto/update-user.dto.ts).

#### Settings Module
* [`apps/api/src/settings/settings.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/settings/settings.controller.ts):
  * `GET /api/v1/settings` (ritorna impostazioni e flag booleano `hasApiKey: boolean`)
  * `PATCH /api/v1/settings` (cifra `llmApiKey` prima del salvataggio nel database)
* [`apps/api/src/settings/settings.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/settings/settings.service.ts):
  * Include metodo `getDecryptedApiKey()` in-memory per il modulo AI.

#### Measurements Module
* [`apps/api/src/measurements/measurements.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/measurements/measurements.controller.ts):
  * `POST /api/v1/measurements` (inserimento peso, bf%, circonferenze)
  * `GET /api/v1/measurements` (storico utente)
  * `PATCH /api/v1/measurements/:id` (modifica misurazione con verifica ownership)
  * `DELETE /api/v1/measurements/:id` (soft-delete impostando `deletedAt`)
* [`apps/api/src/measurements/measurements.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/measurements/measurements.service.ts): Include `findLatest()` per il Data Aggregator dell'AI.

---

### 2.4 Scheletro Mobile (`apps/mobile`)
* [`apps/mobile/package.json`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/package.json): Configurato con `expo`, `expo-router`, `expo-keep-awake`, `zustand`.
* File di routing pronti per lo sviluppo futuro:
  * [`apps/mobile/app/_layout.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/app/_layout.tsx)
  * [`apps/mobile/app/(tabs)/_layout.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/app/(tabs)/_layout.tsx)
  * Tab Screens: `index.tsx` (Dashboard), `workout.tsx` (Active Workout), `nutrition.tsx` (Scanner & Log), `progress.tsx` (Ghosting Camera).

---

### 2.5 Moduli Predisposti per Sprint Futuri
* [`apps/api/src/nutrition/nutrition.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/nutrition/nutrition.module.ts): Scheletro per Sprint 2 (OpenFoodFacts, Cache Redis, TDEE, DietPlans).
* [`apps/api/src/workout/workout.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/workout.module.ts): Scheletro per Sprint 3 (WorkoutPlans, Session Logger con `WorkoutLogSet`).
* [`apps/api/src/ai/ai.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/ai.module.ts): Scheletro per Sprint 4 (Vercel AI SDK multi-provider, CRON job settimanale).

---

## ✅ 3. Stato di Verifica e Collaudo

1. **Compilazione TypeScript**:
   * Eseguito `npm run build --workspace=api` terminato con exit code **0** pulito.
   * Riconciliati tutti i requisiti di modulo ESM (`nodenext`), estensioni `.js` e type imports dedicati per `isolatedModules`.
2. **Suite di Test Unitari**:
   * Eseguito `npm test --workspace=api` con Vitest: **4 test su 4 passati** (`AppController`, `PrismaService`, `CryptoService`).
3. **Database & ORM**:
   * Generato Prisma Client v7 con `@prisma/adapter-pg`.

---

## 🚀 4. Prossimi Passi (Sprint 2 — Nutrition Engine)

1. Integrazione `@nestjs/cache-manager` e `@keyv/redis` in `NutritionModule`.
2. Implementazione client HTTP per API pubblica OpenFoodFacts con fallback locale su `FoodItem`.
3. Endpoint `POST /diet-plans` con inserimento annidato e transazione Prisma (`$transaction`).
4. Endpoint `GET /nutrition/summary?date=YYYY-MM-DD` con calcolo aggregato tramite DB Prisma.

