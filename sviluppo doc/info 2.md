Questo è un Master Plan / Technical TODO progettato per essere gestito in un tool di project management (come Linear, Jira o Notion). Espande ogni macro-area definendo le librerie esatte, i design pattern da adottare e i requisiti architetturali di basso livello per il monorepo HaruKaizen.

🛠️ HaruKaizen - Technical TODO & Architecture Plan
📁 0. Monorepo & Workspace Architecture
[x] Inizializzazione npm workspaces (apps/api, apps/web, apps/mobile).

[ ] Creazione packages/shared: Spostare le interfacce, Enum, costanti (es. formule calcolo BMR, categorie esercizi) e i tipi Zod in una cartella condivisa per garantire type-safety end-to-end tra NestJS, Next.js ed Expo.

[ ] Setup Linter/Formatter: Configurare ESLint 9 (Flat Config) e Prettier alla root del monorepo per standardizzare il codice su tutte le app.

[ ] Gestione Variabili d'Ambiente: Creare uno script di validazione per i file .env (usando Zod) all'avvio dell'API e del Web per evitare crash a runtime dovuti a chiavi mancanti.

🗄️ 1. Database & Prisma (v7.x)
[x] Setup schema.prisma con modelli core, relazioni e map naming (snake_case su DB, camelCase nel codice).

[x] Configurazione prisma.config.ts per l'iniezione sicura di DATABASE_URL.

[x] Implementazione PrismaService globale su NestJS.

[ ] Seed Script: Scrivere uno script prisma/seed.ts per popolare il DB con:

Account di test (Admin, User).

Catalogo di base Exercise (~50 esercizi fondamentali pre-approvati).

[ ] Soft Delete Middleware / Extension: Estendere Prisma Client per filtrare automaticamente i record dove deletedAt != null (implementazione del soft-delete globale).

⚙️ 2. Core Backend (NestJS)
[ ] Filtri & Interceptor Globali:

AllExceptionsFilter: Catturare gli errori Prisma (es. P2002 Unique Constraint) e restituire HTTP 400/409 puliti, loggando lo stack trace.

TransformInterceptor: Standardizzare tutte le risposte API in { data: any, meta: any }.

[ ] Validazione Payload: Setup di ValidationPipe globale con class-validator e class-transformer (whitelist: true, forbidNonWhitelisted: true).

[ ] Sicurezza (Helmet/CORS): Configurare le policy CORS per accettare richieste solo dal dominio del frontend Web e configurare helmet per la sicurezza degli header.

🔐 3. Authentication & Security Module
[ ] Strategia Auth: Implementare JWT (JSON Web Tokens) con Passport.js.

Generazione di AccessToken (scadenza breve, 15m) e RefreshToken (scadenza lunga, 7d).

[ ] Guards: Creare JwtAuthGuard e un RolesGuard personalizzato per limitare endpoint admin (es. verifica manuale dei FoodItem).

[ ] Gestione Chiavi API AI:

Scrivere un CryptoService che utilizza l'algoritmo AES-256-GCM nativo di Node.js (crypto module).

Criptare la llmApiKey fornita dall'utente prima di salvarla in UserSettings, e decriptarla solo in RAM durante le chiamate all'LLM.

🍎 4. Nutrition Module & OpenFoodFacts
[ ] Servizio OpenFoodFacts: Implementare un modulo HTTP (tramite axios o fetch nativo) per interrogare le API pubbliche tramite barcode.

[ ] Caching Layer (Redis/In-Memory): Utilizzare CacheModule di NestJS. Prima di chiamare OpenFoodFacts, controllare se il barcode esiste nella cache o nella tabella locale FoodItem per abbattere la latenza e limitare il rate-limiting.

[ ] Nutrition Calculation Engine: Servizio interno per il ricalcolo istantaneo del TDEE (Total Daily Energy Expenditure) dell'utente ogni volta che aggiorna un record Measurement, basato sulla formula di Mifflin-St Jeor integrata al lifestyleMultiplier.

[ ] Controller Logs: Endpoint per aggregare NutritionLog (es. GET /nutrition/summary?date=YYYY-MM-DD). Calcolo sum() a livello di DB (Prisma aggregate) per caloriesConsumed, protein, ecc.

🏋️ 5. Workout Engine Module
[ ] Workout Plan Builder: Endpoint POST /workouts/plans che riceve un JSON nidificato. Utilizzare Prisma Transactions ($transaction) per inserire in sequenza sicura: WorkoutPlan -> WorkoutDay -> WorkoutDayExercise.

[ ] Session Logger API:

POST /workouts/logs/start: Avvia una sessione (salva startedAt).

PUT /workouts/logs/log-set: Registra real-time il set (salva su WorkoutLogExercise).

POST /workouts/logs/finish: Chiude la sessione, calcola durationMinutes e approssima caloriesBurned in base a durata e volume.

🧠 6. AI & LLM Engine (Kaizen Core)
[ ] AI Orchestrator Service: Integrazione della libreria uffficiale openai o Vercel AI SDK (per supportare provider multipli).

[ ] Data Aggregator: Funzione che assembla il "Context Snapshot". Prende utente ID + Range di date e genera un JSON stringificato contenente:

Ultime 3 pesate (Measurements).

Media macros ultimi 7 giorni (NutritionLogs).

Workout completati vs saltati (WorkoutLogs).

[ ] Prompt Engineering System: Creare un builder di prompt dinamico. Il prompt di sistema definirà il tono (es. coach motivazionale ma severo) e forzerà la formattazione della risposta in un Markdown standard o JSON tipizzato.

[ ] CRON Jobs: Configurare @nestjs/schedule. Job generate-weekly-insights: gira ogni domenica notte a mezzanotte (timezone utente), processa i dati aggregati, chiama l'LLM asincronamente per ogni utente Premium/Attivo, salva il risultato in AiInsightReport.

💻 7. Web App (Next.js 15)
[ ] Infrastruttura Frontend: Setup di TailwindCSS v4, Zustand (Store management locale), e TanStack React Query (fetching, caching, invalidation).

[ ] Libreria UI: Setup di shadcn/ui (Radix Primitives) per componenti altamente accessibili.

[ ] Visualizzatore Dati (Analytics): Implementare Recharts per renderizzare:

Grafico lineare: Andamento peso e BF%.

Grafico a barre impilate: Intake di Macro settimanali (Proteine, Carboidrati, Grassi).

[ ] Diet & Workout Builder: UI complessa con funzionalità drag-and-drop (es. @hello-pangea/dnd) per spostare esercizi tra i giorni dell'allenamento o riorganizzare i pasti. Form complessi validati con react-hook-form e zod.

📱 8. Mobile App (React Native / Expo)
[ ] Navigazione: Setup di expo-router per file-based routing.

[ ] Scanner Barcode (Nutrizione): Integrazione di expo-camera o react-native-vision-camera per la scansione ad alte prestazioni dei codici a barre. Collegamento diretto all'endpoint OpenFoodFacts del nostro backend.

[ ] Active Workout State:

Implementare un "Keep-Awake" (expo-keep-awake) per non far spegnere lo schermo in palestra.

Sviluppare un timer background per i tempi di recupero (restSeconds), che emette un suono/vibrazione al termine.

[ ] Progress Camera Ghosting: Creare un componente fotocamera custom. Utilizzare la libreria per sovrapporre (con opacità al 30%) l'ultimo scatto caricato su ProgressMedia, così l'utente può riallineare corpo e proporzioni perfettamente ogni mese.

[ ] Local Offline Caching: Configurare React Query con un persist store (es. MMKV) per mantenere salvata la scheda dell'allenamento sul dispositivo, permettendo di loggare i dati anche se la connessione in palestra cade (mutations offline-first gestite in background sync).

🚀 9. Deployment & CI/CD Pipeline
[ ] Dockerization: Creare Dockerfile multistadio (multi-stage build) separati per l'API (NestJS) e l'app Web (Next.js). Minimizzare il peso dell'immagine ignorando le devDependencies.

[ ] GitHub Actions (CI): Pipeline che per ogni Push su main e per ogni PR esegue:

Linter (npm run lint).

Typecheck (tsc --noEmit).

Unit Tests.

[ ] Automated Deploy: Creare script bash per fare pull automatico sul server, eseguire prisma migrate deploy (per migrazioni future che non siano un semplice db:push) e riavviare i container tramite Docker Compose o PM2/Kubernetes.