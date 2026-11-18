# 🗺️ Roadmap di Sviluppo HaruKaizen

Questo documento definisce le priorità evolutive di HaruKaizen, derivate dall'audit tecnico del codice sorgente, dai gap architetturali identificati e dagli obiettivi di sovranità, sicurezza e usabilità.

---

## 🧭 Struttura delle Priorità

- **🔴 ORA (P0 — Alta Priorità / Prossimo Ciclo)**: Hardening di sicurezza, correzione debiti tecnici critici e allineamento mobile.
- **🟡 DOPO (P1 — Media Priorità)**: Funzionalità avanzate, persistenza relazionale offline e automazione di deployment.
- **🟢 FUTURO (P2 — Visione di Lungo Termine)**: Algoritmi adattivi, integrazione tabelle nutrizionali regionali e certificazioni.

---

## 🔴 1. ORA (Priorità P0 — Immediata)

### 1.1 Mobile: Query Diretta a Open Food Facts
- **Problema**: L'app mobile instrada tutte le ricerche e scansioni barcode al server backend proxy, esaurendo la quota IP globale dell'istanza in contesti con più utenti.
- **Obiettivo**: Eseguire le chiamate di lettura barcode e ricerca testuale direttamente dal dispositivo mobile verso `world.openfoodfacts.org`. Il backend riceve solo la sincronizzazione delta `(source, externalId)`.
- **Criterio di Fatto (DoD)**:
  - `apps/mobile/src/services/api.ts` o servizio dedicato invia chiamate HTTP dirette alle API OFF con User-Agent proprio del dispositivo.
  - Test di rete dimostrano zero chiamate proxy al backend per prodotti già cercati da mobile.

### 1.2 Produzione: Hardening Rete & Credenziali
- **Problema**: `docker-compose.local.yml` pubblica PostgreSQL e Redis su `0.0.0.0`; `seed.ts` crea `admin@harukaizen.local` con password fissa anche se invocato in ambienti di produzione.
- **Obiettivo**: Creare un file `docker-compose.prod.yml` sicuro e blindare il seeding.
- **Criterio di Fatto (DoD)**:
  - Porte 5432 e 6379 non esposte sull'host esterno nel compose di produzione (accessibili solo da `backend-network`).
  - `seed.ts` genera una password casuale stampata a console al primo avvio se `NODE_ENV === 'production'`, oppure rifiuta l'esecuzione senza flag esplicito.

### 1.3 Decisione Legale sulla Licenza
- **Problema**: Il repository non include un file `LICENSE` e `package.json` dichiara `"license": "UNLICENSED"`.
- **Obiettivo**: Scelta formale da parte del proprietario tra AGPL-3.0, Apache-2.0 o BSL 1.1 (vedi [docs/license-options.md](file:///c:/Users/Antonino/Documents/HaruKaizen/docs/license-options.md)).
- **Criterio di Fatto (DoD)**:
  - File `LICENSE` presente alla radice del repository.
  - Campo `"license"` valorizzato coerentemente nei `package.json`.

### 1.4 Rate Limiting Distribuito su Redis
- **Problema**: Redis è configurato ma non viene usato per il rate limiting (che risiede in un array volatile in RAM del processo API).
- **Obiettivo**: Integrare `@nestjs/throttler` con `@nest-lab/throttler-storage-redis` o KeyvRedis globale per proteggere gli endpoint auth, export e food search.
- **Criterio di Fatto (DoD)**:
  - `ThrottlerModule` registrato in `app.module.ts`.
  - Rate limit condiviso persistito su Redis e funzionante su cluster multi-processo.

---

## 🟡 2. DOPO (Priorità P1 — Medio Termine)

### 2.1 Mobile: SQLite (`expo-sqlite`) come Unica Fonte di Verità (SSOT)
- **Problema**: Lo stato locale mobile vive in `AsyncStorage` (stringa JSON), senza transazioni atomiche né ricerca veloce.
- **Obiettivo**: Migrare a `expo-sqlite` seguendo l'architettura documentata in [docs/mobile_persistence_architecture.md](file:///c:/Users/Antonino/Documents/HaruKaizen/docs/mobile_persistence_architecture.md).
- **Criterio di Fatto (DoD)**:
  - Tabelle relazionali `outbox_mutations`, `local_food_items`, `local_nutrition_logs` attive su SQLite locale.
  - Macchina a stati Outbox (`PENDING` -> `SYNCING` -> `SYNCED` -> `REJECTED_STALE`).
  - Modulo FTS5 attivo per ricerca alimenti istantanea offline.

### 2.2 Sincronizzazione PULL Bidirezionale Reale
- **Problema**: Il client invia le mutazioni locali (PUSH), ma non riceve aggiornamenti remoti creati da altri dispositivi (manca il PULL).
- **Obiettivo**: Implementare endpoint `GET /api/v1/sync/pull?since=<cursor>` per scaricare le modifiche server successive all'ultimo sync locale.
- **Criterio di Fatto (DoD)**:
  - Endpoint `sync/pull` documentato e testato.
  - Il client mobile allinea il diario locale con i pasti registrati da interfaccia Web.

### 2.3 UI Gestione Ricette su Mobile
- **Problema**: L'app mobile consente di registrare alimenti e quick add, ma la creazione/modifica di ricette complesse multi-ingrediente è attualmente disponibile solo su Web.
- **Obiettivo**: Creare schermi ed editor ricette nativo in `apps/mobile/app/recipes/`.
- **Criterio di Fatto (DoD)**:
  - Modal o schermata di composizione ricetta con selezione porzioni e peso cotto.
  - Salvataggio locale in outbox e invio sincrono al backend.

### 2.4 CI/CD Minima & Migrazioni Prisma Formali
- **Problema**: L'aggiornamento dello schema si basa su `prisma db push`, sconsigliato in ambienti di produzione con dati reali, e mancava una validazione continua integrata della libreria shared e delle build.
- **Obiettivo**: Workflow GitHub Actions (`.github/workflows/ci.yml`) con service container PostgreSQL 17 e Redis 7 su runner Linux, che esegue automaticamente checkout, installazione (`npm ci` con `.npmrc` legacy peer deps), generazione client Prisma, build `@harukaizen/shared`, test suite Vitest (API) su database di servizio reale, e build di produzione (`api` e `web`). Introduzione di migrazioni SQL formali (`prisma migrate deploy`).
- **Criterio di Fatto (DoD)**:
  - File `.github/workflows/ci.yml` attivo su branch `main`, `develop` e `gym/**`.
  - Service container PostgreSQL e Redis attivi durante i test.
  - Cartella `prisma/migrations` contenente la baseline DDL SQL (`0_init`) per il deploy senza `db push`.
  - Pipeline GitHub Actions che esegue `prisma migrate deploy` su database pulito di test.

### 2.5 Test E2E e Collaudo Hardware Mobile in Modalità Aereo
- **Problema**: I test attuali sono unitari su mock; manca la validazione E2E su dispositivi fisici offline.
- **Obiettivo**: Configurare suite E2E con Maestro o Detox e collaudare il flusso di scrittura in modalità aereo reale con riconnessione.
- **Criterio di Fatto (DoD)**:
  - Test E2E automatizzato che accoda mutazioni senza rete e verifica il flush al ripristino della connettività.

---

## 🟢 3. FUTURO (Priorità P2 — Visione a Lungo Termine)

### 3.1 Motore Nutrizionale Adattivo (TDEE Dinamico V2)
- **Concetto**: Calcolare il TDEE non solo da formule teoriche statiche (Mifflin-St Jeor), ma aggiustarlo dinamicamente confrontando l'introito calorico reale con il trend ponderale medio mobile delle ultime 3-4 settimane.
- **Criterio di Fatto (DoD)**:
  - Algoritmo di regressione esponenziale ponderale implementato in `@harukaizen/shared`.
  - Avviso e proposta di ricalcolo settimanale del target energetico nella dashboard.

### 3.2 Calcolo Differenziato per Giorni Workout / Rest (V3)
- **Concetto**: Supportare target calorici e di carboidrati differenziati nei giorni di allenamento pesante rispetto ai giorni di recupero attivo o riposo totale.
- **Criterio di Fatto (DoD)**:
  - Campo `targetModeSettings` esteso nello schema `UserSettings`.
  - UI calendario che assegna target specifici in base alla pianificazione degli allenamenti.

### 3.3 Pacchetto Tabelle Nutrizionali Italiane CREA / INRAN
- **Concetto**: Importare il database ufficiale degli alimenti italiani CREA (Consiglio per la ricerca in agricoltura e l'analisi dell'economia agraria) per consentire la ricerca offline di ingredienti base non confezionati (frutta, verdura, tagli di carne, cereali).
- **Criterio di Fatto (DoD)**:
  - Verifica della licenza d'uso dei dati aperti CREA.
  - Script di seeding/importing in SQLite locale e PostgreSQL.

### 3.4 Validazione Professionale dei Guardrail Sanitari
- **Concetto**: Sottoporre le regole fisiologiche (pavimento calorico 1200/1500 kcal, soglie minime grassi 0.6-0.8 g/kg, blocco minori) a revisione formale da parte di un medico nutrizionista o dietista abilitato.
- **Criterio di Fatto (DoD)**:
  - Documento di validazione clinica allegato alla documentazione di progetto con firma/parere professionale.

