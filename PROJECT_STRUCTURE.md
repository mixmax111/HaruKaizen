# 🗺️ HaruKaizen — Mappa Architetturale Completa e Struttura File

> Questo documento descrive in dettaglio la struttura completa del monorepo **HaruKaizen**, catalogando ogni singola directory e file del progetto con il rispettivo percorso assoluto/relativo, le tecnologie utilizzate e la responsabilità architetturale.

---

## 🌳 Albero Globale del Monorepo

```
HaruKaizen/
├── 📁 .github/                      # Pipeline CI/CD GitHub Actions
│   └── 📁 workflows/
│       └── ci.yml                   # Workflow di test e build con container Postgres/Redis
│
├── 📁 apps/                         # Applicazioni del Monorepo
│   ├── 📁 api/                      # Backend REST API (NestJS 12 + Prisma 7)
│   ├── 📁 web/                      # Frontend Dashboard (Next.js 16 Turbopack)
│   └── 📁 mobile/                   # App Mobile (React Native / Expo 52)
│
├── 📁 packages/                     # Pacchetti e librerie condivise
│   └── 📁 shared/                   # Tipi, Enum e Formule condivise (Zero-Dependency)
│
├── 📁 prisma/                       # Database ORM, Schema e Seeding
│   └── seed.ts                      # Popolamento dati iniziale idempotente
│
├── 📁 sviluppo doc/                 # Documentazione tecnica e storico sprint
│   ├── info.md                      # Roadmap e decisioni fondative
│   ├── info 2.md                    # Dettaglio tecnico architetturale
│   └── sprint1.md ... sprint13.md   # Report dei singoli sprint di sviluppo
│
├── .env.example                     # Template variabili d'ambiente root
├── .gitignore                       # Regole di esclusione Git unificate
├── docker-compose.yml               # Orchestrazione container locale (Dev)
├── docker-compose.prod.yml          # Orchestrazione container locale (Prod + DB Backup Daemon)
├── package.json                     # Root package.json con NPM Workspaces
├── package-lock.json                # Lockfile delle dipendenze
├── prisma.config.ts                 # Configurazione Prisma 7 con Driver Adapters
├── schema.prisma                    # Schema completo del database PostgreSQL
└── README.md                        # Guida all'avvio e installazione dummy-proof
```

---

## 🏛️ 1. File di Configurazione alla Radice (Root)

| File | Percorso | Descrizione e Ruolo Architetturale |
|---|---|---|
| `package.json` | `/package.json` | Configurazione principale del monorepo (NPM Workspaces per `apps/*` e `packages/*`). Definisce gli script globali (`npm run dev`, `npm run db:seed`, `npm run db:push`, `postinstall`). |
| `package-lock.json` | `/package-lock.json` | Albero delle versioni bloccate di tutti i pacchetti del monorepo per garantire riproducibilità deterministica. |
| `schema.prisma` | `/schema.prisma` | Modello dati relazionale unificato: definisce tabelle `User`, `UserSettings`, `Measurement`, `ProgressMedia`, `Exercise`, `WorkoutPlan`, `WorkoutDay`, `WorkoutLog`, `WorkoutLogSet`, `FoodItem`, `DietPlan`, `NutritionLog`, `AiInsightReport`. |
| `prisma.config.ts` | `/prisma.config.ts` | Configurazione nativa di Prisma 7 per iniettare `DATABASE_URL` caricando preventivamente il file `.env`. |
| `docker-compose.yml` | `/docker-compose.yml` | Configura i servizi per lo sviluppo locale: PostgreSQL 17 Alpine su porta host `5433` e Redis 7 Alpine su porta `6379`. |
| `docker-compose.prod.yml` | `/docker-compose.prod.yml` | Configurazione Docker per test di produzione locale: avvia Postgres, Redis, il demone di backup automatico (`db-backup`), l'API NestJS (porta 3000) e il Web Next.js (porta 3001). |
| `.env.example` | `/.env.example` | File modello contenente le variabili d'ambiente necessarie a Docker e Prisma (`DATABASE_URL`, `REDIS_URL`, credenziali postgres). |
| `.gitignore` | `/.gitignore` | Blocca il commit di `.env`, `.env.*`, `node_modules/`, output di build (`.next/`, `dist/`), cache di Expo (`.expo/`), report di Playwright e file di backup SQL. |
| `README.md` | `/README.md` | Documento di onboarding completo con requisiti software, procedura di installazione passo-passo, spiegazione delle variabili d'ambiente e guida al self-hosting con Cloudflare. |
| `diagramma mermaid.md` | `/diagramma mermaid.md` | Diagrammi architetturali e di flusso delle entità dati del sistema. |

---

## 🧠 2. Backend Core — `apps/api` (NestJS 12)

La cartella dell'API backend contiene la logica di business, l'autenticazione, il motore nutrizionale, il logger degli allenamenti e l'integrazione AI.

### File di Configurazione & Build (`apps/api/`)
*   `apps/api/package.json`: Dipendenze e script del backend (`build`, `test`, `lint`, `start:dev`).
*   `apps/api/tsconfig.json`: Configurazione del compilatore TypeScript per NestJS con target ES2023.
*   `apps/api/tsconfig.build.json`: Configurazione TS specifica per la build di produzione (`dist/`).
*   `apps/api/vite.config.ts`: Configurazione per il test runner Vitest ultra-veloce con risoluzione dei percorsi.
*   `apps/api/Dockerfile`: Multi-stage Dockerfile per container Alpine con Prisma engine compilato.
*   `apps/api/.env.example`: Template con `JWT_SECRET`, `ENCRYPTION_KEY`, `WEB_ORIGIN`, `REDIS_URL`.
*   `apps/api/.gitignore`: Esclusioni specifiche per il modulo backend.

### Entrypoint e Moduli Core (`apps/api/src/`)
*   `apps/api/src/main.ts`: File di bootstrap di NestJS. Configura `helmet()`, CORS con whitelist (`WEB_ORIGIN`), Global URI Versioning (`/api/v1/`), validazione globale Zod/Class-Validator, logger strutturato e porta `3000`.
*   `apps/api/src/app.module.ts`: Modulo radice. Registra la configurazione globale, il database Prisma, il Throttler rate limiter (Redis + fallback in-memory) e tutti i sottomoduli.
*   `apps/api/src/app.controller.ts`: Controller base con endpoint di verifica.
*   `apps/api/src/app.controller.spec.ts`: Unit test per il controller base.
*   `apps/api/src/app.service.ts`: Service base associato ad `AppController`.

### Configurazione Ambiente (`apps/api/src/config/`)
*   `apps/api/src/config/env.validation.ts`: Schema Zod di validazione stringente per le variabili d'ambiente (`DATABASE_URL`, `JWT_SECRET` min 32 char, `ENCRYPTION_KEY` 64 char hex, ecc.).

### Database & Crittografia (`apps/api/src/prisma/` & `apps/api/src/crypto/`)
*   `apps/api/src/prisma/prisma.module.ts`: Modulo globale Prisma.
*   `apps/api/src/prisma/prisma.service.ts`: Service singleton estendente `PrismaClient` con `@prisma/adapter-pg` per pooling PostgreSQL avanzato.
*   `apps/api/src/prisma/prisma.service.spec.ts`: Test di istanziazione del Prisma Service.
*   `apps/api/src/crypto/crypto.module.ts`: Modulo per le funzionalità di crittografia.
*   `apps/api/src/crypto/crypto.service.ts`: Implementa crittografia e decrittografia simmetrica `AES-256-GCM` con autenticazione MAC (usata per salvare in modo sicuro le chiavi OpenAI/Claude degli utenti).
*   `apps/api/src/crypto/crypto.service.spec.ts`: Test di cifratura e decifratura round-trip con chiave errata.

### Middleware, Filtri, Guardie & Sicurezza (`apps/api/src/common/`)
*   `apps/api/src/common/filters/all-exceptions.filter.ts`: Filtro eccezioni globale che intercetta errori Prisma (es. violazione vincolo unicità P2002) e li mappa in risposte HTTP 400/409 chiare.
*   `apps/api/src/common/interceptors/transform.interceptor.ts`: Standardizza tutte le risposte JSON nel formato uniforme `{ success: true, data: ..., timestamp: ... }`.
*   `apps/api/src/common/logger/structured-logger.service.ts`: Logger strutturato ad alte prestazioni basato su Pino, ottimizzato per i container Docker.
*   `apps/api/src/common/decorators/current-user.decorator.ts`: Decoratore personalizzato `@CurrentUser()` per estrarre il payload JWT dal request object.
*   `apps/api/src/common/decorators/public.decorator.ts`: Decoratore `@Public()` per marcare endpoint pubblici esenti da autenticazione JWT.
*   `apps/api/src/common/decorators/roles.decorator.ts`: Decoratore `@Roles()` per proteggere endpoint amministrativi.
*   `apps/api/src/common/throttler/throttler-storage-redis.service.ts`: Storage per `@nestjs/throttler` con conteggio distribuito su Redis e fallback trasparente in-memory.
*   `apps/api/src/common/health/health.controller.ts`: Endpoint sintetico `/api/v1/health` per i container healthcheck.
*   `apps/api/src/common/health/health.module.ts`: Modulo registrante il controller di salute.

### Modulo Autenticazione (`apps/api/src/auth/`)
*   `apps/api/src/auth/auth.module.ts`: Registrazione moduli Passport, JwtModule e strategie.
*   `apps/api/src/auth/auth.controller.ts`: Endpoint `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
*   `apps/api/src/auth/auth.service.ts`: Logica di hashing bcrypt, verifica credenziali, emissione e rotazione di accessToken (15m) e refreshToken (7d).
*   `apps/api/src/auth/auth.service.spec.ts`: Unit test della logica di registrazione e login.
*   `apps/api/src/auth/guards/jwt-auth.guard.ts`: Guardia globale che protegge tutti gli endpoint tranne quelli annotati con `@Public()`.
*   `apps/api/src/auth/strategies/jwt.strategy.ts`: Strategia Passport per estrarre e verificare il Bearer token o il cookie HttpOnly.
*   `apps/api/src/auth/dto/register.dto.ts`: DTO validato per la registrazione (`email`, `password` forte, `heightCm`, ecc.).
*   `apps/api/src/auth/dto/login.dto.ts`: DTO per il login (`email`, `password`).

### Modulo Utenti & Impostazioni (`apps/api/src/users/` & `apps/api/src/settings/`)
*   `apps/api/src/users/users.module.ts`, `users.controller.ts`, `users.service.ts`: Gestione profilo (`GET /users/me`, `PATCH /users/me`).
*   `apps/api/src/users/dto/update-user.dto.ts`: Validazione aggiornamenti biologici (`heightCm`, `birthDate`, `lifestyleMultiplier`).
*   `apps/api/src/settings/settings.module.ts`, `settings.controller.ts`, `settings.service.ts`: Gestione impostazioni utente (`GET /settings`, `PATCH /settings`). Cifra la chiave LLM con `CryptoService` e gestisce `fcmPushToken`.
*   `apps/api/src/settings/dto/update-settings.dto.ts`: Validazione impostazioni (target di peso, timezone, tono coach, preferenza provider AI).

### Modulo Misurazioni & Media (`apps/api/src/measurements/` & `apps/api/src/media/`)
*   `apps/api/src/measurements/measurements.module.ts`, `measurements.controller.ts`, `measurements.service.ts`: CRUD per pesate e circonferenze corporee con supporto soft-delete.
*   `apps/api/src/measurements/dto/create-measurement.dto.ts`: DTO per loggare peso (`weightKg`), % massa grassa (`bodyFatPercentage`) e circonferenze.
*   `apps/api/src/media/media.module.ts`, `media.controller.ts`, `media.service.ts`, `media.service.spec.ts`: Gestione caricamento multipart/form-data per le foto dei progressi fisici, salvate localmente su disco per azzerare costi cloud.
*   `apps/api/src/media/dto/upload-progress.dto.ts`: Metadati della foto (`category`: FRONT/SIDE/BACK, `weightKg`, note).

### Modulo Nutrizione (`apps/api/src/nutrition/`)
*   `apps/api/src/nutrition/nutrition.module.ts`: Modulo aggregatore nutrizionale.
*   `apps/api/src/nutrition/food/food.controller.ts`, `food.service.ts`: Ricerca e gestione alimenti locali.
*   `apps/api/src/nutrition/food/openfoodfacts.service.ts`, `openfoodfacts.service.spec.ts`: Proxy e cache per interrogare le API OpenFoodFacts tramite codice a barre (EAN-13).
*   `apps/api/src/nutrition/food/dto/create-food.dto.ts`: Validazione macro per 100g (calorie, proteine, carboidrati, grassi, fibre, sodio).
*   `apps/api/src/nutrition/plans/diet-plans.controller.ts`, `diet-plans.service.ts`: Creazione e gestione schede alimentari.
*   `apps/api/src/nutrition/plans/dto/create-diet-plan.dto.ts`: DTO per salvare piani nutrizionali strutturati con pasti (`MEAL`).
*   `apps/api/src/nutrition/logs/nutrition-logs.controller.ts`, `nutrition-logs.service.ts`, `nutrition-logs.service.spec.ts`: Log giornaliero dei pasti consumati con calcolo aggregato tramite Prisma.
*   `apps/api/src/nutrition/logs/dto/create-nutrition-log.dto.ts`: DTO per registrare alimenti assunti con grammatura.
*   `apps/api/src/nutrition/tdee/tdee.service.ts`, `tdee.service.spec.ts`: Motore metabolico basato sulla formula di **Mifflin-St Jeor** per il calcolo dinamico del fabbisogno calorico (BMR e TDEE).

### Modulo Allenamento (`apps/api/src/workout/`)
*   `apps/api/src/workout/workout.module.ts`: Modulo aggregatore dell'allenamento.
*   `apps/api/src/workout/exercises/exercises.controller.ts`, `exercises.service.ts`: Catalogo esercizi con biomeccanica e categorie.
*   `apps/api/src/workout/exercises/dto/create-exercise.dto.ts`: Creazione esercizi personalizzati o verificati.
*   `apps/api/src/workout/plans/workout-plans.controller.ts`, `workout-plans.service.ts`: Costruttore schede con transazioni Prisma nidificate (`WorkoutPlan -> WorkoutDay -> WorkoutDayExercise`).
*   `apps/api/src/workout/plans/dto/create-workout-plan.dto.ts`: DTO nidificato per l'intera scheda di allenamento.
*   `apps/api/src/workout/logs/workout-logs.controller.ts`, `workout-logs.service.ts`, `workout-logs.service.spec.ts`: Avvio, log serie e chiusura sessione live con calcolo scientifico delle calorie bruciate basato su **METs**.
*   `apps/api/src/workout/logs/dto/workout-log.dto.ts`: DTO per il salvataggio dei set completati (peso, ripetizioni, RPE, tempo di riposo).

### Modulo AI Kaizen Core (`apps/api/src/ai/`)
*   `apps/api/src/ai/ai.module.ts`: Modulo AI orchestratore.
*   `apps/api/src/ai/ai.controller.ts`: Endpoint per generare report di feedback immediati.
*   `apps/api/src/ai/ai.service.ts`: Connessione a OpenAI/Anthropic tramite Vercel AI SDK utilizzando la chiave dell'utente decifrata in RAM.
*   `apps/api/src/ai/aggregator/data-aggregator.service.ts`, `data-aggregator.service.spec.ts`: Costruzione del "Context Snapshot" aggregando le ultime 3 pesate, i macro medi settimanali e i volumi dei working sets (escludendo i warmup).
*   `apps/api/src/ai/prompts/prompt-builder.service.ts`, `prompt-builder.service.spec.ts`: Costruttore di prompt dinamici basati sul tono selezionato (`RIGOROUS`, `EMPATHETIC`, `KAIZEN`).
*   `apps/api/src/ai/cron/ai-weekly-cron.service.ts`: Job schedulato settimanale (`@nestjs/schedule`) che genera autonomamente i report per gli utenti attivi.

### Test Utilities (`apps/api/src/test/`)
*   `apps/api/src/test/test-db-teardown.ts`: Utility per la pulizia a cascata delle tabelle durante i test per garantire isolamento deterministico.
*   `apps/api/test/app.e2e-spec.ts`: Test E2E di base.

---

## 💻 3. Frontend Web — `apps/web` (Next.js 16)

La Web App fornisce la dashboard analitica completa per desktop con rendering reattivo e supporto dark mode.

### File di Configurazione (`apps/web/`)
*   `apps/web/package.json`: Dipendenze (Next.js 16, React 19, Recharts, Lucide, TailwindCSS, Playwright).
*   `apps/web/tsconfig.json`: Configurazione TypeScript con path alias `@/*`.
*   `apps/web/next.config.ts`: Configurazione Next.js con modalità `output: 'standalone'` per container leggeri.
*   `apps/web/tailwind.config.js`: Setup dei colori HaruKaizen (zinc dark, emerald, amber, indigo, rose).
*   `apps/web/postcss.config.mjs`: Plugin PostCSS per TailwindCSS v4.
*   `apps/web/playwright.config.ts`: Configurazione dei test E2E Chromium con base URL `http://localhost:3001`.
*   `apps/web/Dockerfile`: Multi-stage Dockerfile per Next.js Standalone runner con cartelle `.next/static` e `public`.
*   `apps/web/.env.example`: Template contenente `NEXT_PUBLIC_API_URL` e `PORT`.
*   `apps/web/.gitignore`: Esclusione di `.next/`, `out/` e report Playwright.

### Pagine & Routing (`apps/web/app/`)
*   `apps/web/app/layout.tsx`: Root Layout che avvolge l'app con i provider `AuthContext` e `ThemeContext`.
*   `apps/web/app/page.tsx`: Redirect intelligente alla Dashboard (se loggato) o alla pagina di Login.
*   `apps/web/app/globals.css`: Stili globali TailwindCSS.
*   `apps/web/app/global-error.tsx`: Gestore degli errori con fallback UI pulita.
*   `apps/web/app/favicon.ico`: Icona dell'applicazione.
*   `apps/web/app/(auth)/login/page.tsx`: Schermata di accesso con gestione errori e salvataggio token.
*   `apps/web/app/(auth)/register/page.tsx`: Schermata di registrazione con raccolta parametri biometrici.
*   `apps/web/app/dashboard/page.tsx`: Dashboard principale con KPI, grafico peso (Recharts) e riassunto calorie.
*   `apps/web/app/workouts/page.tsx`: Gestione schede e storico degli allenamenti con volume calcolato.
*   `apps/web/app/nutrition/page.tsx`: Diario nutrizionale con breakdown macro e ricerca alimenti.
*   `apps/web/app/progress/page.tsx`: Galleria fotografica progressi e andamento delle misure corporee.
*   `apps/web/app/insights/page.tsx`: Visualizzazione dei report generati dal coach AI con suggerimenti pratici.

### Componenti & Librerie (`apps/web/components/` & `apps/web/lib/`)
*   `apps/web/components/layout/app-layout.tsx`: Shell applicativa con sidebar responsive e header.
*   `apps/web/components/layout/sidebar.tsx`: Barra di navigazione laterale con icone Lucide e link attivi.
*   `apps/web/components/modals/smart-import-modal.tsx`: Modale per importare schede e cibi via CSV o testo libero.
*   `apps/web/lib/api.ts`: Istanza Axios configurata con interceptor per iniettare l'access token e gestire il refresh automatico.
*   `apps/web/lib/auth-context.tsx`: Context React per lo stato di autenticazione globale (login, logout, sessione).
*   `apps/web/lib/theme-context.tsx`: Gestione del tema chiaro/scuro persistito.

### E2E Testing (`apps/web/e2e/`)
*   `apps/web/e2e/smoke.spec.ts`: Test critico Playwright per verificare login, controlli form, gestione credenziali errate e caricamento dashboard.

---

## 📱 4. Mobile Companion — `apps/mobile` (React Native / Expo 52)

L'applicazione mobile è progettata per il tracciamento offline in palestra e la cattura fotografica.

### File di Configurazione (`apps/mobile/`)
*   `apps/mobile/package.json`: Dipendenze native (Expo Router, expo-camera, expo-file-system, expo-haptics, expo-notifications, expo-keep-awake, zustand).
*   `apps/mobile/tsconfig.json`: Configurazione TypeScript con supporto strict mode.
*   `apps/mobile/app.json`: Manifest dell'app Expo (bundle identifier, permessi fotocamera e notifiche).
*   `apps/mobile/eas.json`: Configurazione EAS Build per la generazione di profili Preview (`.apk` locale o cloud).
*   `apps/mobile/.env.example`: Template con `EXPO_PUBLIC_API_URL` per la risoluzione dell'IP LAN.

### Schermate & Routing Expo (`apps/mobile/app/`)
*   `apps/mobile/app/_layout.tsx`: Root Layout mobile. Inizializza le notifiche push (`registerForPushNotificationsAsync`), registra il token verso l'API e gestisce il deep linking su tap (`Notifications.addNotificationResponseReceivedListener`).
*   `apps/mobile/app/(tabs)/_layout.tsx`: Bottom Tab Navigator nativo con icone e badge per ciascuna sezione.
*   `apps/mobile/app/(tabs)/index.tsx`: Home tab con riepilogo rapido del giorno e stato di sincronizzazione.
*   `apps/mobile/app/(tabs)/workout.tsx`: Schermata Live Workout. Mantiene lo schermo attivo (`useKeepAwake`), FlatList con auto-collapse serie, feedback aptico e `FloatingRestPill`.
*   `apps/mobile/app/(tabs)/nutrition.tsx`: Diario nutrizionale con barre dinamiche TDEE, cronologia recenti (+1 tap), scanner barcode e programmazione promemoria pasto locale.
*   `apps/mobile/app/(tabs)/progress.tsx`: Galleria foto progressi con peso associato e pulsante di apertura Ghosting Camera.

### Componenti UI Specializzati (`apps/mobile/src/components/`)
*   `apps/mobile/src/components/BarcodeScannerModal.tsx`: Scanner per codici a barre alimentari con lock anti-duplicati e chiamata immediata al proxy OpenFoodFacts.
*   `apps/mobile/src/components/GhostingCamera.tsx`: Fotocamera full-screen con overlay semi-trasparente della foto precedente, switch fronte/retro, slider opacità ad auto-fade dopo 2s e modale inserimento peso corporeo.
*   `apps/mobile/src/components/BaselineSilhouetteGuide.tsx`: Sagoma proporzionata unisex vettoriale SVG con linee guida tratteggiate ad alto contrasto per guidare la postura in assenza di scatti storici.
*   `apps/mobile/src/components/FloatingRestPill.tsx`: Pillola fluttuante con barra di avanzamento e menu contestuale rapido (`+30s`, `-10s`, `Salta`).
*   `apps/mobile/src/components/CollapsibleExerciseCard.tsx`: Scheda esercizio con stepper per pesi/ripetizioni e chiusura automatica intelligente quando tutti i set sono spuntati.
*   `apps/mobile/src/components/RestTimer.tsx`: Componente base per la visualizzazione grafica del cronometro.

### Hooks, Servizi, Store & Utilità (`apps/mobile/src/`)
*   `apps/mobile/src/config.ts`: Risoluzione automatica e dinamica dell'URL backend (rileva automaticamente l'IP del PC in sviluppo da `Constants.expoConfig.hostUri`).
*   `apps/mobile/src/hooks/useRestTimer.ts`: Custom hook per il timer di recupero con calcolo su timestamp assoluto (anti-freeze) e schedulazione sveglia locale per il blocco schermo.
*   `apps/mobile/src/services/notificationService.ts`: Gestore canali Android ad alta priorità, schedulazione sveglia locale a `targetEndTime`, promemoria pasti e sync push token con NestJS.
*   `apps/mobile/src/stores/syncStore.ts`: Store Zustand persistito offline su AsyncStorage. Gestisce le code di upload per workout, foto (salvate fisicamente su file system permanente) e pasti, eseguendo l'invio asincrono con garbage collection locale post-200 OK.
*   `apps/mobile/src/types/sync.ts`: Tipi TypeScript per le entità offline (`QueuedWorkoutLog`, `QueuedPhotoUpload`, `QueuedNutritionLog`, `LocalWorkoutExercise`).
*   `apps/mobile/src/utils/haptics.ts`: Wrapper per vibrazioni aptiche differenziate (`Light` per carichi, `Medium` per set completati, `Success` per fine recupero).
*   `apps/mobile/src/utils/syncTracer.ts`: Tracciatore diagnostico degli eventi di sincronizzazione con log storici ispezionabili per il debug.

---

## 📦 5. Pacchetto Condiviso — `packages/shared`

Libreria TypeScript pura, priva di dipendenze runtime, importata sia da NestJS che da Next.js ed Expo.

*   `packages/shared/package.json`: Definizione del modulo `@harukaizen/shared`.
*   `packages/shared/src/index.ts`: Punto di esportazione centrale di tutti i tipi e costanti.
*   `packages/shared/src/enums/index.ts`: Enum di dominio condivisi (`UserRole`: ADMIN/USER, `ExerciseCategory`: CHEST/BACK/LEGS/..., `MealType`, `SetType`: WARMUP/WORKING/DROP/FAILURE, `LlmProvider`).
*   `packages/shared/src/constants/nutrition.ts`: Moltiplicatori metabolici di Harris-Benedict e Mifflin-St Jeor, coefficienti di attività fisica (SEDENTARY, MODERATE, VERY_ACTIVE).
*   `packages/shared/src/constants/date.utils.ts`: Formattatori di data standardizzati per aggregazioni e calcoli settimanali.

---

## 🗄️ 6. Seeding del Database — `prisma/`

*   `prisma/seed.ts`: Script di popolamento iniziale con driver adapter `@prisma/adapter-pg`. Esegue unicamente operazioni **idempotenti** (`upsert`):
    - 3 account base con password crittografate (`admin@harukaizen.local`, `coach@harukaizen.local`, `user@harukaizen.local`).
    - 56 esercizi fondamentali completi di biomeccanica e categorie.
    - 10 alimenti base certificati con codici a barre e macro esatti per 100g.

---

## 📚 7. Documentazione Tecnica — `sviluppo doc/`

*   `sviluppo doc/info.md`: Definizione del monorepo, architettura iniziale e roadmap di sviluppo suddivisa per fasi.
*   `sviluppo doc/info 2.md`: Dettaglio tecnico architetturale, design pattern, cifratura API key e requisiti delle librerie.
*   `sviluppo doc/sprint1.md` a `sprint13.md`: I report tecnici di ogni sprint di sviluppo, con le decisioni architetturali consolidate, i file implementati e gli esiti dei test.

---

## 🔄 8. Pipeline CI/CD — `.github/workflows/`

*   `.github/workflows/ci.yml`: Workflow di Continuous Integration per GitHub Actions. Ad ogni push o pull request su `main`:
    1. Avvia due service container dedicati: **PostgreSQL 17 Alpine** e **Redis 7 Alpine**.
    2. Esegue il typecheck su `apps/mobile`.
    3. Esegue l'intera suite di 24 test Vitest su `apps/api`.
    4. Compila la build di produzione di `apps/web` e `apps/api`.
    5. Testa la creazione delle immagini Docker multi-stage per verificare la parity di produzione.
