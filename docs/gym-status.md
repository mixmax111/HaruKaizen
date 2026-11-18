# Stato di Avanzamento e Tracciamento Modulo Gym / Live Workout

Documento di conformità e tracciamento puntuale delle implementazioni e verifiche tecniche per il modulo Gym / Live Workout (riferimento: Piano Tecnico Rev. 5).

---

## Criteri di Classificazione delle Evidenze

- **Eseguito e Verificato dall'Agente (Automatizzato)**:
  - **Compilato**: verificato con compilazione statica TypeScript (`tsc`, `nest build`) senza errori di tipo o sintassi.
  - **Testato Automaticamente**: verificato mediante suite di test automatizzati (Vitest / Prisma su PostgreSQL reale).
  - **Eseguito da Script**: collaudato end-to-end tramite script di verifica dedicato ([`scripts/verify-step-1.sh`](file:///c:/Users/Antonino/Documents/HaruKaizen/scripts/verify-step-1.sh)).
  - **Letto nel Codice**: audit diretto del sorgente per escludere chiamate anomale, leak di dati o dipendenze non tracciate.
- **Verificato Manualmente dal Proprietario (In Attesa)**:
  - Collaudo interattivo eseguito personalmente dal proprietario di progetto su browser reale, client REST manuale o dispositivo mobile. **Tutte le voci mantengono lo stato "In attesa di verifica del proprietario" fino a test umano esplicito.**

---

## Nota Architetturale: Gestione del Peso Utente

Nel database e nello schema Prisma (`schema.prisma`), **il campo `user.defaultWeight` NON ESISTE**.
Il peso dell'utente non risiede nel modello `User` né in `UserSettings` (dove è presente unicamente `targetWeightKg`, che rappresenta l'obiettivo di peso a lungo termine e non deve **MAI** essere usato per il dispendio calorico).

Il peso reale vive esclusivamente nei record temporali della tabella `Measurement` (`weightKg`, `recordedAt`).
La cascata di risoluzione implementata sia in `WorkoutLogsService` che in `SyncService` segue tassativamente l'ordine:
1. Ultima misurazione con `recordedAt <= data allenamento`;
2. Ultima misurazione registrata a profilo in assoluto;
3. `null` (peso sconosciuto: blocca il calcolo automatico calorico, tranne `manualCaloriesBurned`).

Se la misurazione individuata è più vecchia di 90 giorni rispetto alla data del workout, il motore emette un warning consultivo `weightWarning: "peso non aggiornato"` (e log warning su sync), preservando la stima calorica senza bloccarla.

---

## Nota Decisioni di Progetto: Timer di Preparazione

La proposta per il timer di preparazione (30 s per esercizi a tempo, 0 s per esercizi a ripetizioni, sovrascrivibile per esercizio) è **in attesa di conferma del proprietario**.
La decisione finale è richiesta tassativamente **prima dello Step 5** (motore di esecuzione live timer nella UI), e non nello Step 4.

---

## Tabella di Stato — Step 1: Sicurezza & Hardening Preliminare

| Voce Step 1 | Descrizione Requisito | Verifica Agente (Automatizzata) | Verifica Manuale Proprietario | Evidenza Tecnica (File, Test, Comando) | Note & Dettagli Operativi |
|---|---|:---:|:---:|---|---|
| **1.1 Protezione GET /exercises** | Endpoint protetto con `JwtAuthGuard` esplicito e verifica assenza chiamate pre-login in web e mobile | **SUPERATO** | ⏳ **In attesa** | `apps/api/src/workout/exercises/exercises.controller.ts:8`<br>`apps/api/src/workout/exercises/exercises.controller.spec.ts`<br>`scripts/verify-step-1.sh:22-31`<br>Rotta reale: `GET /api/v1/exercises` | `ExercisesController` decorato a livello di classe con `JwtAuthGuard`. Nel web chiamata confinata a sessione attiva. Nel mobile nessuna chiamata pre-login. |
| **1.2 Whitelist Tipizzata Piani Pubblici** | Whitelist mapper strongly-typed (`Prisma.WorkoutPlanGetPayload<...>`, zero `any`) su `findOne` e `findAll`. Rimozione tassativa dati sensibili autore (`userId`, `aiReasoning`, `clinicalWarning`, `isActive`, `notes`, `weightTarget`, `weightTargetKg`, `rpeTarget`, `createdByUserId`). Blocco piani privati altrui con 403 Forbidden. | **SUPERATO** | ⏳ **In attesa** | `apps/api/src/workout/plans/dto/public-workout-plan.dto.ts`<br>`apps/api/src/workout/plans/workout-plans.service.ts:73,98`<br>`apps/api/src/workout/plans/workout-plans.integration.spec.ts`<br>`scripts/verify-step-1.sh:47-64`<br>Rotte reali: `GET /api/v1/workout/plans/:id`, `GET /api/v1/workout/plans` | Esercizi e struttura giorni visibili; dati clinici, note personali, target e identificativi autore rimossi (verificato con grep 0 occorrenze). |
| **1.3 Risoluzione Peso a Cascata & Warning 90gg** | Ordine: (1) ultima misurazione con `recordedAt <= data allenamento`; (2) peso attuale di profilo (ultima in assoluto); (3) `null`. Se misurazione > 90 gg warning consultivo `"peso non aggiornato"`. | **SUPERATO** | ⏳ **In attesa** | `apps/api/src/workout/logs/workout-logs.service.ts:165-195`<br>`apps/api/src/sync/sync.service.ts:420-450`<br>`apps/api/src/workout/logs/workout-logs.service.spec.ts:250-340`<br>Comando test: `npm run test --prefix apps/api -- workout-logs.service.spec.ts` | Testati tutti i rami: storico presente, fallback a profilo, nessun peso (`null`), warning consultivo > 90 gg e assenza warning <= 90 gg. |
| **1.4 Blocco Motore Calorico per Dati Mancanti o Minorenni** | Mantenimento motore biomeccanico attuale (`expenditure.caloriesBurned`). Blocco calorie (`caloriesBurned: null`) se: (a) età sconosciuta (`birthDate == null`), (b) minorenne (`age < 18`), (c) peso sconosciuto (`weightKg == null`). `manualCaloriesBurned` ha sempre precedenza assoluta. | **SUPERATO** | ⏳ **In attesa** | `apps/api/src/workout/logs/workout-logs.service.ts:200-250`<br>`apps/api/src/sync/sync.service.ts:543-570`<br>`apps/api/src/workout/logs/workout-logs.service.spec.ts:175-245`<br>`scripts/verify-step-1.sh:66-107`<br>Rotta reale: `POST /api/v1/workout/logs/:id/finish` | Risolto il rischio per cui `birthDate == null` veniva trattato come adulto. Se specificato `manualCaloriesBurned`, viene preservato anche per minorenni o senza peso. |
| **1.5 Valori Ammessi setType** | `setType` canonico unificato a `['WARMUP', 'WORKING', 'DROPSET', 'FAILURE']`. Normalizzazione legacy `'DROP'` $\to$ `'DROPSET'` su DTO e sync offline con warning. | **SUPERATO** | ⏳ **In attesa** | `apps/api/src/workout/logs/dto/workout-log.dto.ts:64-67`<br>`apps/api/src/sync/sync.service.ts:474-478`<br>`apps/api/src/workout/workout-dto-validation.spec.ts:24-46`<br>`apps/api/src/sync/sync.service.spec.ts:250-290` | Validazione decoratore `@IsIn` allineata a DROPSET; trasformazione automatica su DTO e sync offline. |
| **1.6 Limiti Rigidi DTO (@Min / @Max)** | Applicazione vincoli: `orderIndex`/`setOrder` [1, 100], `repsCompleted` [0, 500], `weightKg` [0, 1000], `rpe` [1, 10], `manualCaloriesBurned` [0, 10000], `sets` [1, 50], `restSeconds` [0, 600]. | **SUPERATO** | ⏳ **In attesa** | `apps/api/src/workout/logs/dto/workout-log.dto.ts`<br>`apps/api/src/workout/plans/dto/create-workout-plan.dto.ts:19-38`<br>`apps/api/src/workout/workout-dto-validation.spec.ts`<br>`scripts/verify-step-1.sh:109-122`<br>Rotta reale: `POST /api/v1/workout/logs/exercises/:exerciseId/sets` | Richieste API con valori fuori range restituiscono 400 Bad Request. |
| **1.7 Clamping Non-Bloccante Sync Offline** | Sulla sync offline (`sync.service.ts`), valori fuori range per campi non-critici (`orderIndex`, `repsCompleted`, `weightKg`, `rpe`, `manualCaloriesBurned`) vengono clampati ai limiti con log warning invece di rigettare la transazione. | **SUPERATO** | ⏳ **In attesa** | `apps/api/src/sync/sync.service.ts:448-520`<br>`apps/api/src/sync/sync.service.spec.ts:240-300`<br>Comando test: `npm run test --prefix apps/api -- sync.service.spec.ts` | L'atleta in palestra con connessione intermittente non perde il log del workout: il payload viene salvato clampato e tracciato a log. |
| **1.8 Omissione Campi Sessione Non Previsti** | Non aggiungere `clientSessionId`, `startedAt`, `finishedAt` al DTO sessione (`StartWorkoutLogDto`) nello Step 1 (rinviati allo Step 4). | **SUPERATO** | ⏳ **In attesa** | `apps/api/src/workout/logs/dto/workout-log.dto.ts:14-26`<br>Rotta reale: `POST /api/v1/workout/logs/start` | `StartWorkoutLogDto` accetta unicamente `dayNameSnapshot`, `planId` e `date`. |

---

## Tabella di Stato — Step 2: SetType & Baseline Prisma

| Voce Step 2 | Descrizione Requisito | Verifica Agente (Automatizzata) | Verifica Manuale Proprietario | Evidenza Tecnica (File, Test, Comando) | Note & Dettagli Operativi |
|---|---|:---:|:---:|---|---|
| **2.1 Ispezione Read-Only Enum SetType** | Ispezione `enum_range` e valori distinti in tabella `workout_log_sets` su copia DB | **SUPERATO** | ⏳ **In attesa** | `scripts/inspect-step2.cjs`<br>PostgreSQL 17 | Rilevato `enum_range`: `{WARMUP, WORKING, DROPSET, DROP, FAILURE}`. Valore memorizzato a DB: 1 sola riga `WORKING`. Stabilito valore canonico: `DROPSET`. |
| **2.2 Migrazione SQL Enum & Test DB** | Rimozione di `DROP` dall'enum Postgres, mantenimento `DROPSET`, ripristino default column e test lettura/scrittura | **SUPERATO** | ⏳ **In attesa** | `scripts/migrate-settype.sql`<br>`apps/api/src/workout/set-type.integration.spec.ts` | Scrittura e lettura di tutti i 4 valori (`WARMUP`, `WORKING`, `DROPSET`, `FAILURE`) verificate su PostgreSQL reale con Prisma Client. |
| **2.3 Generazione Baseline 0_init** | Creazione baseline da zero con `prisma migrate diff`, aggiunta manuale indice parziale deduplicazione alimenti | **SUPERATO** | ⏳ **In attesa** | `prisma/migrations/0_init/migration.sql`<br>`migrations/0_init/migration.sql` | Inclusa definizione schema e indice `CREATE UNIQUE INDEX unique_global_source_external_id ON food_items(source, external_id) WHERE (user_id IS NULL AND deleted_at IS NULL);`. |
| **2.4 Verifica Allineamento Shadow DB** | Allineamento con shadow DB tramite `prisma migrate diff --from-config-datasource --to-migrations ./prisma/migrations --exit-code` | **SUPERATO** | ⏳ **In attesa** | `prisma.config.ts` (`shadowDatabaseUrl`)<br>Comando: `npx prisma migrate diff ... --exit-code` | Exit code 0 ("No difference detected."). Marcata applicata su DB con `prisma migrate resolve --applied 0_init`. |
| **2.5 Procedura Fresh Setup & Update** | Verifica fresh install da zero su DB vuoto e documentazione flusso di migrazione e spiegazione errore P3005 | **SUPERATO** | ⏳ **In attesa** | `README.md` (Sezione 4B)<br>`package.json` (`db:migrate:deploy`, `db:migrate:status`) | Testata installazione pulita: `db:migrate:deploy` + `db:seed` eseguiti con successo. Documentato percorso per istanze pre-baseline e chiarito errore P3005. |

---

## Script di Verifica Automatica Step 1 (`scripts/verify-step-1.sh`)

Script bash eseguibile che automatizza interamente l'esecuzione dei 4 controlli richiesti contro l'API reale su porta 3000 con prefisso `/api/v1`:

```bash
# Esecuzione da terminale o Git Bash:
bash scripts/verify-step-1.sh
```

Esito registrato:
```text
=================================================================
 HaruKaizen - Step 1 Verification Script
 Target API: http://localhost:3000/api/v1 (Porta default: 3000)
=================================================================
Check 1: GET /exercises senza token (atteso 401)... PASS (HTTP 401 Unauthorized)
Inizializzazione fixture utente A, utente B e scheda pubblica...
Check 2: Whitelist campi scheda pubblica per utente B... PASS (0 campi vietati riscontrati in dettaglio e lista)
Check 3: Calcolo calorie per utente senza data di nascita... PASS (caloriesBurned === null)
Check 4: Payload fuori scala repsCompleted=999 (atteso 400)... PASS (HTTP 400 Bad Request)
=================================================================
ESITO FINALE: TUTTI I 4 CONTROLLI SUPERATI CON SUCCESSO (PASS)
=================================================================
Pulizia automatica fixture di test...
```

---

## Istruzioni per la Verifica Manuale Puntuale (a cura del Proprietario)

Per la verifica manuale puntuale da parte del proprietario mediante curl o client REST (porta 3000, prefisso `/api/v1`):

1. **Test GET /exercises senza token (401 Unauthorized)**:
   ```bash
   curl -i http://localhost:3000/api/v1/exercises
   # Risultato atteso: HTTP/1.1 401 Unauthorized
   ```
2. **Test Scheda Pubblica con secondo utente (nessun dato sensibile visibile)**:
   - Con Utente A, creare una scheda con `isPublic: true`:
     ```bash
     curl -i -H "Authorization: Bearer <TOKEN_UTENTE_A>" \
          -H "Content-Type: application/json" \
          -d '{"name":"Scheda Test","isPublic":true,"workoutDays":[]}' \
          http://localhost:3000/api/v1/workout/plans
     ```
   - Con Utente B, visualizzare il dettaglio della scheda creata e la lista generale:
     ```bash
     curl -s -H "Authorization: Bearer <TOKEN_UTENTE_B>" http://localhost:3000/api/v1/workout/plans/<PLAN_ID>
     curl -s -H "Authorization: Bearer <TOKEN_UTENTE_B>" http://localhost:3000/api/v1/workout/plans
     ```
   - Eseguire il controllo sui campi vietati:
     ```bash
     curl -s -H "Authorization: Bearer <TOKEN_UTENTE_B>" http://localhost:3000/api/v1/workout/plans/<PLAN_ID> | grep -E '"(userId|aiReasoning|clinicalWarning|notes|weightTarget|createdByUserId)":'
     # Risultato atteso: nessuna riga restituita
     ```
3. **Test Sessione Utente Senza Data di Nascita (Calorie nulle)**:
   - Avviare sessione con Utente senza data di nascita nel profilo:
     ```bash
     curl -s -H "Authorization: Bearer <TOKEN_UTENTE_NO_AGE>" \
          -H "Content-Type: application/json" \
          -d '{"dayNameSnapshot":"Giorno A"}' \
          http://localhost:3000/api/v1/workout/logs/start
     ```
   - Aggiungere esercizio e serie:
     ```bash
     curl -s -H "Authorization: Bearer <TOKEN_UTENTE_NO_AGE>" \
          -H "Content-Type: application/json" \
          -d '{"exerciseNameSnapshot":"Panca Piana"}' \
          http://localhost:3000/api/v1/workout/logs/<LOG_ID>/exercises

     curl -s -H "Authorization: Bearer <TOKEN_UTENTE_NO_AGE>" \
          -H "Content-Type: application/json" \
          -d '{"orderIndex":1,"setOrder":1,"setType":"WORKING","repsCompleted":10,"weightKg":80}' \
          http://localhost:3000/api/v1/workout/logs/exercises/<EXERCISE_LOG_ID>/sets
     ```
   - Terminare la sessione:
     ```bash
     curl -s -H "Authorization: Bearer <TOKEN_UTENTE_NO_AGE>" \
          -H "Content-Type: application/json" \
          -d '{}' \
          http://localhost:3000/api/v1/workout/logs/<LOG_ID>/finish
     ```
   - Verificare che `"summary":{"caloriesBurned":null}` nel payload JSON.
4. **Test Payload Fuori Scala (HTTP 400)**:
   ```bash
   curl -i -H "Authorization: Bearer <TOKEN_UTENTE>" \
        -H "Content-Type: application/json" \
        -d '{"orderIndex":1,"setOrder":1,"setType":"WORKING","repsCompleted":999,"weightKg":80}' \
        http://localhost:3000/api/v1/workout/logs/exercises/<EXERCISE_LOG_ID>/sets
   # Risultato atteso: HTTP/1.1 400 Bad Request
   ```
