# Stato di Avanzamento e Tracciamento Modulo Gym / Live Workout

Documento di conformità e tracciamento puntuale delle implementazioni e verifiche tecniche per il modulo Gym / Live Workout (riferimento: Piano Tecnico Rev. 5).

---

## Criteri di Classificazione delle Evidenze

- **Compilato**: il codice è stato verificato con compilazione statica TypeScript (`tsc`, `nest build`) senza errori di tipo o sintassi.
- **Testato Automaticamente**: verificato mediante test unitari o di integrazione automatizzati (Vitest / Prisma su DB reale).
- **Letto nel Codice**: verificato mediante ispezione diretta del codice sorgente o grep nei repository.
- **Verificato Manualmente da una Persona**: collaudo interattivo eseguito da un operatore umano su browser o dispositivo reale (o via curl / client REST).

---

## Tabella di Stato — Step 1: Sicurezza & Hardening Preliminare

| Voce Step 1 | Descrizione Requisito | Stato | Evidenza Tecnica (File, Test, Comando) | Chi l'ha Verificata / Metodo | Note & Dettagli Operativi |
|---|---|---|---|---|---|
| **1.1 Protezione GET /exercises** | Proteggere l'endpoint con `JwtAuthGuard` esplicito e verificare assenza di chiamate pre-login in web e mobile | **FATTO** | `apps/api/src/workout/exercises/exercises.controller.ts:16`<br>`apps/api/src/workout/exercises/exercises.controller.spec.ts`<br>`apps/web/src/app/workouts/live/page.tsx:335`<br>Comando test: `npm run test --workspace=api -- src/workout/exercises/` | **Testato Automaticamente** (Vitest)<br>**Letto nel codice** (audit chiamate web/mobile)<br>*In attesa di verifica manuale utente (HTTP 401 via curl)* | `ExercisesController` decorato a livello di classe. Nel web la chiamata è confinata al modal di sessione avviata da utente autenticato. Nel mobile non esistono chiamate all'endpoint prima del login. |
| **1.2 Whitelist Tipizzata Piani Pubblici** | Whitelist mapper strongly-typed (`Prisma.WorkoutPlanGetPayload<...>`, zero `any`) su `findOne` e `findAll`. Rimozione tassativa dati sensibili autore (`userId`, `aiReasoning`, `clinicalWarning`, `isActive`, `notes`, `weightTarget`, `weightTargetKg`, `rpeTarget`, `createdByUserId`). Blocco piani privati altrui con 403 Forbidden. | **FATTO** | `apps/api/src/workout/plans/dto/public-workout-plan.dto.ts`<br>`apps/api/src/workout/plans/workout-plans.service.ts:73,98`<br>`apps/api/src/workout/plans/workout-plans.integration.spec.ts`<br>Comando test: `npm run test --workspace=api -- src/workout/plans/workout-plans.integration.spec.ts` | **Testato Automaticamente** (5 test su PostgreSQL reale)<br>**Compilato** (`nest build`) | Esercizi e struttura giorni rimangono visibili; dati clinici, note personali, target individuali e identificativi autore vengono rimossi. Campi DB futuri imprevisti vengono scartati automaticamente dal mapper. |
| **1.3 Risoluzione Peso a Cascata** | Ordine risoluzione: (1) ultima misurazione con `recordedAt <= data allenamento`; (2) peso attuale di profilo (ultima misurazione in assoluto); (3) `null` (sconosciuto). MAI `targetWeightKg` (peso obiettivo) né fallback hardcoded 75 kg. | **FATTO** | `apps/api/src/workout/logs/workout-logs.service.ts:165-188`<br>`apps/api/src/sync/sync.service.ts:420-443`<br>`apps/api/src/workout/logs/workout-logs.service.spec.ts:250-310`<br>Comando test: `npm run test --workspace=api -- src/workout/logs/workout-logs.service.spec.ts` | **Testato Automaticamente** (3 casi di test dedicati)<br>**Compilato** (`nest build`) | Testati tutti e 3 i rami della cascata: storico presente, fallback a profilo, nessun peso registrato (`null`). Applicato identico comportamento in `WorkoutLogsService` e `SyncService`. |
| **1.4 Blocco Motore Calorico per Dati Mancanti o Minorenni** | Mantenimento motore biomeccanico attuale (`expenditure.caloriesBurned`). Blocco calorie (`caloriesBurned: null`) se: (a) età sconosciuta (`birthDate == null`), (b) minorenne (`age < 18`), (c) peso sconosciuto (`weightKg == null`). `manualCaloriesBurned` ha sempre precedenza assoluta. | **FATTO** | `apps/api/src/workout/logs/workout-logs.service.ts:190-245`<br>`apps/api/src/sync/sync.service.ts:543-570`<br>`apps/api/src/workout/logs/workout-logs.service.spec.ts:175-245`<br>`apps/api/src/sync/sync.service.spec.ts:300-340`<br>Comando test: `npm run test --workspace=api -- src/workout/logs/` e `src/sync/` | **Testato Automaticamente** (Vitest)<br>**Compilato** (`nest build`) | Risolto il rischio di sicurezza per cui `birthDate == null` veniva trattato come adulto. Se l'utente specifica `manualCaloriesBurned`, questo viene registrato anche per minorenni o senza peso. Nessuna introduzione prematura di `netKcal`/`grossKcal` in Step 1. |
| **1.5 Valori Ammessi setType** | `setType` su DTO accetta `['WARMUP', 'WORKING', 'DROP', 'DROPSET', 'FAILURE']`. Su sync offline, setType non riconosciuti mappati a `WORKING` con warning. | **FATTO** | `apps/api/src/workout/logs/dto/workout-log.dto.ts:62`<br>`apps/api/src/sync/sync.service.ts:474-478`<br>`apps/api/src/workout/workout-dto-validation.spec.ts:24-46`<br>`apps/api/src/sync/sync.service.spec.ts:250-290` | **Testato Automaticamente** (Vitest)<br>**Compilato** (`nest build`) | Validazione decoratore `@IsIn` allineata sia a DROP che a DROPSET. |
| **1.6 Limiti Rigidi DTO (@Min / @Max)** | Applicazione vincoli: `orderIndex`/`setOrder` [1, 100], `repsCompleted` [0, 500], `weightKg` [0, 1000], `rpe` [1, 10], `manualCaloriesBurned` [0, 10000], `sets` [1, 50], `restSeconds` [0, 600]. | **FATTO** | `apps/api/src/workout/logs/dto/workout-log.dto.ts`<br>`apps/api/src/workout/plans/dto/create-workout-plan.dto.ts:19-38`<br>`apps/api/src/workout/workout-dto-validation.spec.ts`<br>Comando test: `npm run test --workspace=api -- src/workout/workout-dto-validation.spec.ts` | **Testato Automaticamente** (12 test specifici sui limiti)<br>**Compilato** (`nest build`) | Richieste API con valori fuori range restituiscono 400 Bad Request. |
| **1.7 Clamping Non-Bloccante Sync Offline** | Sulla sync offline (`sync.service.ts`), valori fuori range per campi non-critici (`orderIndex`, `repsCompleted`, `weightKg`, `rpe`, `manualCaloriesBurned`) vengono clampati ai limiti con log warning invece di rigettare la transazione. | **FATTO** | `apps/api/src/sync/sync.service.ts:448-520`<br>`apps/api/src/sync/sync.service.spec.ts:240-300`<br>Comando test: `npm run test --workspace=api -- src/sync/sync.service.spec.ts` | **Testato Automaticamente** (Vitest con verifica chiamate Prisma e warning logger)<br>**Compilato** (`nest build`) | L'atleta in palestra con connessione intermittente non perde il log del workout se un campo non critico è fuori range: il payload viene salvato clampato e tracciato a log. |
| **1.8 Omissione Campi Sessione Non Previsti** | Non aggiungere `clientSessionId`, `startedAt`, `finishedAt` al DTO sessione (`StartWorkoutLogDto`) nello Step 1 (rinviati allo Step 4). | **FATTO** | `apps/api/src/workout/logs/dto/workout-log.dto.ts:14-26` | **Letto nel codice**<br>**Compilato** (`nest build`) | `StartWorkoutLogDto` accetta unicamente `dayNameSnapshot`, `planId` e `date`. |

---

## Istruzioni per la Verifica Manuale (a cura dell'Utente / Project Owner)

Per completare la transizione di verifica da *Testato Automaticamente* a *Verificato Manualmente da una Persona*:

1. **Test GET /exercises senza token (401 Unauthorized)**:
   ```bash
   curl -i http://localhost:3000/api/exercises
   # Risultato atteso: HTTP/1.1 401 Unauthorized
   ```
2. **Test GET /exercises con token utente valido**:
   ```bash
   curl -i -H "Authorization: Bearer <TOKEN_VALIDO>" http://localhost:3000/api/exercises
   # Risultato atteso: HTTP/1.1 200 OK con lista esercizi
   ```
3. **Test Scheda Pubblica con secondo utente**:
   - Creare una scheda pubblica con utente A valorizzando note personali ed esercizi.
   - Accedere come utente B ed eseguire `GET /api/workout-plans/:id`.
   - Verificare che il payload JSON contenga gli esercizi e le serie, ma ometta completamente le proprietà `userId`, `notes`, `aiReasoning`, `clinicalWarning`.
