# 📱 Architettura della Persistenza Mobile: Stato Attuale & Roadmap SQLite

## 1. Stato Attuale della Persistenza (`AsyncStorage`)

Attualmente, l'applicazione mobile (`apps/mobile`) archivia lo stato e le mutazioni offline tramite **`@react-native-async-storage/async-storage`** (chiave-valore serializzato JSON).

### 1.1 Mappa delle Chiavi di Memorizzazione
| Chiave AsyncStorage | Modulo Responsabile | Contenuto e Struttura Dati |
|---|---|---|
| `@harukaizen:offline_outbox_v1` | `offlineSyncQueue.ts` | Array JSON di mutazioni `OfflineMutation[]` (`CREATE_MEAL_SLOT`, `CREATE_FOOD_ITEM`, `CREATE_RECIPE`, `CREATE_NUTRITION_LOG`, `CREATE_WORKOUT_LOG`, `CREATE_MEASUREMENT`, `CREATE_DOCUMENT_TEXT`). |
| `harukaizen_offline_sync_store_v1` | `syncStore.ts` | Code storiche per `workoutQueue`, `photoQueue`, `nutritionQueue` e timestamp `lastSyncAt`. |
| `@harukaizen:recent_scanned_foods` | `nutrition.tsx` | Array JSON (max 15 elementi) di alimenti cercati o scansionati (`ScannedFoodResult[]`). |
| `@harukaizen:synced_winner_records_v1` | `offlineSyncQueue.ts` | Dizionario di record `winner` restituiti dal server a seguito di risoluzione conflitti LWW (`REJECTED_STALE`). |
| `@harukaizen:auth_token` | `authStore.ts` | JWT bearer token dell'utente autenticato. |
| `@harukaizen:custom_api_url` | `config.ts` | Endpoint API custom configurato a runtime (es. per APK standalone locale). |

### 1.2 Limitazioni Tecniche Riscontrate
1. **Assenza di Transazioni ACID**: `AsyncStorage` opera come semplice archivio chiave-stringa. Operazioni composte (es. creazione ricetta + 5 ingredienti) non possono essere atomiche a livello di storage locale: un crash durante la serializzazione può corrompere o frammentare lo stato.
2. **Nessun Indice né Ricerca Full-Text (FTS)**: Per filtrare o cercare alimenti offline è necessario deserializzare l'intero array in RAM ed eseguire filtri JavaScript `Array.filter()`. Questo approccio collassa superati i 100-200 record.
3. **Degradazione delle Prestazioni su Volumi Alti**: L'intera coda outbox viene riscritta come un unico blocco JSON (`JSON.stringify`) per ogni singola mutazione accodata o rimossa.
4. **Mancanza di Integrità Referenziale**: I riferimenti tra entità (es. `NutritionLog` che punta a `FoodItem` tramite `clientSideId`) non possono essere validati a livello di motore dati sottostante.

---

## 2. Gap Rispetto al Piano "Conta Calorie PURO" (Rev. 5)

Il piano Rev. 5 prescrive:
1. **SQLite come Singola Fonte di Verità (SSOT)**: L'app deve mostrare immediatamente i dati presenti nel database SQLite locale; la rete serve solo a sincronizzare le mutazioni delta in background.
2. **Cache Locale Persistente per Open Food Facts & USDA**: Memorizzazione locale di migliaia di prodotti alimentari scansionati, evitando query di rete ripetute e garantendo il tracciamento anche in aereo o palestra interrata.
3. **Motore di Ricerca Alimenti Offline (FTS5)**: Ricerca full-text istantanea con tokenizzazione locale (`fts5`) per cercare ingredienti comuni anche senza connessione internet.
4. **Outbox con Macchina a Stati Atomica**: Ogni mutazione deve avere uno stato relazionale tracciato (`QUEUED`, `IN_FLIGHT`, `SYNCED`, `REJECTED_STALE`) senza rischi di race condition o duplicati.

---

## 3. Piano di Migrazione a SQLite (Roadmap & Blueprint)

### 3.1 Scelta Tecnologica
- **Libreria Consigliata**: `expo-sqlite` (moderno driver integrato in Expo SDK 52+, con supporto alle API sincrone/asincrone `openDatabaseSync`, `execSync`, `prepareSync` e modulo FTS5 abilitato nativamente).
- **In alternativa**: `WatermelonDB` (se si desidera binding reattivo RxJS Observable con la UI React).

### 3.2 Schema Relazionale SQLite Target

```sql
-- Tabella Outbox Atomica
CREATE TABLE IF NOT EXISTS outbox_mutations (
  id TEXT PRIMARY KEY,               -- clientSideId (UUID v4)
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  client_updated_at TEXT NOT NULL,  -- ISO-8601 tempo locale modifica
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | SYNCING | SYNCED | REJECTED_STALE | FAILED
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabella Locale Alimenti e Cache Barcode
CREATE TABLE IF NOT EXISTS local_food_items (
  id TEXT PRIMARY KEY,
  client_side_id TEXT UNIQUE,
  user_id TEXT,                     -- NULL per righe globali in cache
  source TEXT NOT NULL,             -- LOCAL | OPEN_FOOD_FACTS | USDA | MANUAL_QUICK
  external_id TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  calories_100g REAL NOT NULL,
  protein_100g REAL NOT NULL,
  carbs_100g REAL NOT NULL,
  fat_100g REAL NOT NULL,
  fiber_100g REAL,
  serving_size_g REAL,
  is_user_edited INTEGER DEFAULT 0,
  based_on_id TEXT,
  client_updated_at TEXT,
  fetched_at TEXT,
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_food_barcode ON local_food_items(barcode);
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_source_external ON local_food_items(source, external_id) WHERE user_id IS NULL;

-- Indice Virtuale FTS5 per Ricerca Offline
CREATE VIRTUAL TABLE IF NOT EXISTS food_search_fts USING fts5(
  name,
  source,
  barcode,
  content='local_food_items',
  content_rowid='rowid'
);

-- Tabella Locale Slot Pasto
CREATE TABLE IF NOT EXISTS local_meal_slots (
  id TEXT PRIMARY KEY,
  client_side_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slot_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  client_updated_at TEXT
);

-- Tabella Locale Log Nutrizionali
CREATE TABLE IF NOT EXISTS local_nutrition_logs (
  id TEXT PRIMARY KEY,
  client_side_id TEXT UNIQUE,
  food_item_id TEXT,
  meal_slot_id TEXT,
  custom_food_name TEXT,
  calories_consumed REAL NOT NULL,
  protein_consumed REAL NOT NULL,
  carbs_consumed REAL NOT NULL,
  fat_consumed REAL NOT NULL,
  fiber_consumed REAL,
  quantity_g REAL NOT NULL,
  meal_type TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  client_updated_at TEXT
);
```

### 3.3 Fasi Operative del Piano di Rilascio

1. **Fase 1: Implementazione del Database Service (`DatabaseService.ts`)**
   - Configurazione di `expo-sqlite` con inizializzazione automatica delle tabelle e PRAGMA (`journal_mode = WAL`, `foreign_keys = ON`).
   - Gestione delle migrazioni versionate (`PRAGMA user_version`).
2. **Fase 2: Migrazione Dati Esistenti da AsyncStorage (One-Shot Boot)**
   - Al primo avvio con SQLite attivo, verificare se `@harukaizen:offline_outbox_v1` o `@harukaizen:recent_scanned_foods` contengono dati.
   - Inserire i record pendenti in `outbox_mutations` e `local_food_items` all'interno di una transazione SQLite `BEGIN IMMEDIATE ... COMMIT`.
   - Rimuovere le vecchie chiavi da AsyncStorage una volta confermata la migrazione.
3. **Fase 3: Switch della Coda Outbox su SQLite**
   - Riscrivere `offlineSyncQueue.ts` per interrogare `SELECT * FROM outbox_mutations WHERE status IN ('PENDING', 'FAILED') ORDER BY client_updated_at ASC`.
   - Flusso di sync atomico: marcare i record inviati come `SYNCING`, quindi `DELETE` su `SYNCED`/`ALREADY_SYNCED` e aggiornamento `status = 'REJECTED_STALE'` + inserimento del `winner` in `local_food_items`.
4. **Fase 4: Attivazione Ricerca FTS5 Offline & Cache Barcode**
   - Quando l'utente effettua una ricerca nella UI (`nutrition.tsx`), interrogare prima `food_search_fts` in SQLite locale (< 5ms).
   - In parallelo o su fallback di rete, interpellare Open Food Facts popolando `local_food_items` con i nuovi prodotti trovati.

