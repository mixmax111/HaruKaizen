🌸 HaruKaizen (春改善) - Monorepo
Benvenuto in HaruKaizen, la piattaforma ecosistemica (Web, Mobile e API) per il fitness, la nutrizione e l'analisi dei progressi potenziata dall'Intelligenza Artificiale. Il nome unisce "Haru" (Primavera/Rinascita) e "Kaizen" (Miglioramento continuo).

🏗️ Architettura & Tech Stack
Il progetto è strutturato come un Monorepo (tramite npm workspaces) per condividere configurazioni, tipi e logica tra le varie piattaforme.

Database: PostgreSQL (Dockerizzato, mappato su porta 5433 per evitare conflitti Windows).

ORM: Prisma 7 (Configurazione moderna con prisma.config.ts e Driver Adapters stabili).

Backend (apps/api): NestJS (TypeScript, API REST/GraphQL).

Frontend Web (apps/web): Next.js 15+ (React, TailwindCSS, Dashboard utente).

Mobile App (apps/mobile): React Native / Expo (Tracking in palestra, notifiche, fotocamera).

🗺️ Roadmap di Sviluppo
Il piano di sviluppo è diviso in fasi sequenziali. L'obiettivo è costruire fondamenta solide partendo dai dati (Backend + DB), per poi espandersi verso le interfacce client (Web/Mobile).

Fase 1: Setup Infrastruttura e Database (✅ COMPLETATA)
[x] Inizializzazione struttura Monorepo (apps/api, apps/web, apps/mobile).

[x] Configurazione root package.json e script concurrently.

[x] Setup docker-compose.yml per PostgreSQL.

[x] Scrittura dello schema.prisma completo (User, Workout, Diet, Measurements, AI Insights).

[x] Upgrade a Prisma 7 e setup di prisma.config.ts.

[x] Risoluzione conflitti di porta (Port 5433 bypass) e sincronizzazione DB (db:push).

[x] Creazione del PrismaService globale in NestJS.

Fase 2: Core Backend - Utenti e Autenticazione (🔄 IN CORSO)
[ ] Modulo Auth: Registrazione e Login (Integrazione Firebase Auth o JWT custom).

[ ] Modulo User: Controller per gestione profilo base (User).

[ ] Modulo Settings: Endpoint per gestire UserSettings (inserimento API Key LLM personalizzata, target di peso, timezone).

[ ] Modulo Measurements: CRUD per tracciare peso, bf% e misure corporee. Gestione caricamento ProgressMedia (foto progressi).

Fase 3: Modulo Nutrizione (Diet & Food)
[ ] Integrazione API Esterne: Servizio NestJS per collegarsi a OpenFoodFacts (ricerca alimenti tramite barcode o nome).

[ ] Modulo FoodItem: Creazione, validazione e salvataggio alimenti nel DB locale.

[ ] Modulo DietPlan: Endpoint per la creazione di piani alimentari strutturati (DietPlan, DietDay, DietDayItem).

[ ] Modulo NutritionLog: Logica per il tracciamento giornaliero dei macro (NutritionLog), con calcolo automatico di calorie e macro consumati vs target.

Fase 4: Modulo Allenamento (Workout)
[ ] Modulo Exercise: Libreria esercizi globale e personalizzata.

[ ] Modulo WorkoutPlan: Costruttore di schede di allenamento (WorkoutPlan, WorkoutDay, WorkoutDayExercise).

[ ] Modulo WorkoutLog: Endpoint per l'avvio, il tracciamento e il completamento di una sessione (WorkoutLog, WorkoutLogExercise), con calcolo del volume di allenamento.

Fase 5: Intelligenza Artificiale (Il cuore "Kaizen")
[ ] Integrazione LLM: Servizio NestJS per connettersi a OpenAI/Claude utilizzando la llmApiKey fornita dall'utente.

[ ] Generazione Prompt Dinamici: Logica per aggregare i dati settimanali (WorkoutLogs, NutritionLogs, Measurements).

[ ] AiInsightReports: Endpoint che prende i dati aggregati, li passa all'AI e genera un report di feedback ("Stai stallando col peso, aumenta le calorie", "Volume pettorali troppo basso"), salvandolo nel database.

Fase 6: Frontend Web (Next.js - Dashboard Admin/Utente)
[ ] Setup Iniziale: Configurazione Next.js con TailwindCSS e libreria componenti (es. shadcn/ui).

[ ] Integrazione API: Setup di Axios o React Query per consumare le API NestJS.

[ ] Dashboard Builders: Sviluppo delle UI complesse drag-and-drop per creare Schede di Allenamento e Diete.

[ ] Analytics: Grafici per visualizzare progressi di peso, macro e volume di allenamento nel tempo.

Fase 7: Mobile App (Expo - Il compagno di allenamento)
[ ] Setup Iniziale: Configurazione Expo Router e librerie UI mobile-first.

[ ] Workout Execution Mode: Schermata per loggare set/reps/peso in tempo reale mentre si è in palestra, con timer di recupero (restSeconds).

[ ] Scanner Nutrizione: Utilizzo della fotocamera nativa per scansionare codici a barre e loggare i pasti rapidamente.

[ ] Progress Camera: Interfaccia fotocamera con overlay/ghosting della foto precedente per scattare foto dei progressi (ProgressMedia) coerenti.

[ ] Notifiche Push: Configurazione fcmPushToken per promemoria pasti e allenamenti.

Fase 8: Refactoring, Testing e Deploy
[ ] Testing: Unit test sui servizi critici di NestJS (calcolo macro, aggregazione dati AI).

[ ] Dockerizzazione Finale: Creazione dei Dockerfile di produzione per l'API e il Web Frontend.

[ ] CI/CD: Setup GitHub Actions per il deploy automatico su VPS/Cloud.

🚀 Comandi Rapidi (Cheatsheet Sviluppatore)
Avvio Ambiente (Sviluppo Locale)

Bash
# 1. Accendi il database PostgreSQL
docker-compose up -d

# 2. Avvia tutto (NestJS Backend + Next.js Frontend)
npm run dev
Gestione Database (Prisma)

Bash
# Applica le modifiche dello schema al database locale
npm run db:push

# Apri l'interfaccia grafica per esplorare i dati del DB
npm run db:studio

# Rigenera il client TypeScript (da usare se Prisma si disallinea)
npm run db:generate


