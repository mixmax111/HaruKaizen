# 🏋️ HaruKaizen — Report Sprint 3 (Workout Engine)

> **Documento di tracciamento tecnico**: Riepilogo dettagliato dell'implementazione del modulo di Allenamento (`WorkoutModule`), catalogo esercizi, costruttore schede di allenamento e Session Logger API real-time con calcolo volume e progressive overload.

---

## 🏛️ 1. Decisioni Architetturali Consolidate per Sprint 3

| Decisione | Soluzione Implementata |
|---|---|
| **Esercizi Custom** | Creazione tramite `POST /exercises` con `createdByUserId` e `isVerified: false`. Accessibili per tutti e categorizzati con `ExerciseCategory`. |
| **Attivazione Schede Esclusiva** | Inserimento annidato atomico (`WorkoutPlan` -> `WorkoutDay` -> `WorkoutDayExercise`) e attivazione (`POST /workout-plans/:id/activate`) che disattiva automaticamente qualsiasi altra scheda attiva dell'utente. |
| **Session Logger Real-Time** | 1. Avvio sessione: `POST /workouts/logs/start`<br>2. Aggiunta esercizio live: `POST /workouts/logs/:id/exercises`<br>3. Log serie riga per riga: `POST /workouts/logs/exercises/:id/sets`<br>4. Skip esercizio: `PATCH /workouts/logs/exercises/:id/skip` (escluso dal volume).<br>5. Chiusura sessione: `POST /workouts/logs/:id/finish`. |
| **Volume & Progressive Overload** | Calcolo del **Volume Totale Effettivo (kg)** considerando rigorosamente solo le serie `WORKING`, `DROP` e `FAILURE`, escludendo le serie `WARMUP`. Calcolo automatico della durata e stima calorie consumate basate su MET medio e peso dell'utente. |

---

## 📁 2. Mappa File Implementati

### `apps/api/src/workout/`
* [`workout.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/workout.module.ts): Registrazione controllers, providers ed exports di tutto il modulo.
* **Exercises**:
  * [`exercises/exercises.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/exercises/exercises.service.ts): Ricerca globale con filtro opzionale per categoria muscolare e inserimento custom.
  * [`exercises/exercises.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/exercises/exercises.controller.ts): Endpoint `GET /exercises?category=`, `POST /exercises`, `GET /exercises/:id`.
  * [`exercises/dto/create-exercise.dto.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/exercises/dto/create-exercise.dto.ts): DTO con validazione enum e `defaultMetValue`.
* **Workout Plans**:
  * [`plans/workout-plans.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/plans/workout-plans.service.ts): Creazione annidata con Prisma `$transaction`, query schede con esercizi e giorni, attivazione esclusiva e soft-delete.
  * [`plans/workout-plans.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/plans/workout-plans.controller.ts): Endpoint `POST /workout-plans`, `GET /workout-plans`, `GET /workout-plans/:id`, `POST /workout-plans/:id/activate`, `DELETE /workout-plans/:id`.
  * [`plans/dto/create-workout-plan.dto.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/plans/dto/create-workout-plan.dto.ts): DTO nidificati con target reps e carichi.
* **Session Logger & Overload**:
  * [`logs/workout-logs.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/logs/workout-logs.service.ts): Gestione sessione dal vivo, skip di singoli esercizi, calcolo durata reale, stima calorie MET (su ultima `Measurement` registrata) e volume effettivo per-set.
  * [`logs/workout-logs.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/logs/workout-logs.controller.ts): Esposizione flussi `/start`, `/exercises`, `/sets`, `/skip`, `/finish`, `/history`.
  * [`logs/dto/workout-log.dto.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/workout/logs/dto/workout-log.dto.ts): DTO tipizzati per avvio, aggiunta esercizio e aggiunta serie granulare con RPE e SetType.

---

## 🧪 3. Esiti Test & Compilazione

* **Compilazione NestJS**: `npm run build --workspace=api` completata con exit code **0**.
* **Test Suite Vitest**: `npm test --workspace=api` completata con **9 test su 9 superati**:
  * `WorkoutLogsService`: test su esclusione serie `WARMUP` ed esercizi `isSkipped`, verifica calcolo volume effettivo (1800 kg) e stima calorica MET.
  * Tutti i test precedenti (Nutrition, Crypto, Prisma, App) mantenuti e superati.
