# 🔍 Audit delle Affermazioni del README (Rev. 1)

Documento di audit in **sola lettura** che analizza ogni singola affermazione fattuale contenuta in `README.md` confrontandola con il codice sorgente, le configurazioni Docker, gli schemi Prisma e le chiamate di rete reali.

---

## 1. Tabella delle Affermazioni & Evidenze di Codice

| ID | Sezione README | Affermazione Estratta | Stato | File & Riga Evidenza | Nota Tecnica |
|---|---|---|:---:|---|---|
| **CLM-01** | Header / Badge | Node.js v22+ | **VERO** | `apps/api/Dockerfile:4`, `apps/web/Dockerfile:4` | Immagini Docker basate su `node:22-alpine`; compatibile con v22 LTS. |
| **CLM-02** | Header / Badge | Next.js 16 Turbopack | **VERO** | `apps/web/package.json:18`, `apps/web/package.json:6` | Next.js versione `16.3.8` configurato con compilatore Turbopack. |
| **CLM-03** | Header / Badge | NestJS 12 | **VERO** | `apps/api/package.json:29` | Pacchetto `@nestjs/core` versione `^12.0.1`. |
| **CLM-04** | Header / Badge | React Native Expo SDK 52 | **VERO** | `apps/mobile/package.json:21` | Pacchetto `expo` versione `~52.0.0` con Expo Router v4. |
| **CLM-05** | Header / Badge | Prisma 7 | **VERO** | `package.json:35`, `package.json:47` | Pacchetti `prisma` e `@prisma/client` versione `^7.0.0`. |
| **CLM-06** | Header / Badge | PostgreSQL 17 Alpine | **VERO** | `docker-compose.local.yml:6` | Immagine `postgres:17-alpine` nel Compose locale. |
| **CLM-07** | Header / Badge | Redis 7 Alpine | **VERO** | `docker-compose.local.yml:30` | Immagine `redis:7-alpine` nel Compose locale. |
| **CLM-08** | Header / Badge | Deployment: "Air-Gapped Local" | **FALSO** | `apps/api/src/nutrition/food/openfoodfacts.service.ts:59`, `apps/api/src/ai/orchestrator/provider.factory.ts:24` | L'app effettua chiamate a internet (OFF, USDA, LLM cloud); non è air-gapped fisicamente. |
| **CLM-09** | Intro | Architettura 100% self-hosted e locale | **PARZIALE** | `docker-compose.local.yml:1-130`, `apps/api/src/ai/orchestrator/provider.factory.ts:1-70` | Database e API sono self-hosted; analisi AI e provider alimentari richiedono cloud terzi se non disabilitati. |
| **CLM-10** | Sez. 1 (Architettura) | Smartphone chiama http://<IP>:8080 (o 8002) | **PARZIALE** | `apps/mobile/src/config.ts:46-60`, `docker-compose.local.yml:74-75` | Esposte sia 8002 che 8080 su compose; mobile usa 8002 come default locale per evitare conflitti. |
| **CLM-11** | Sez. 1 (Architettura) | Redis 7 usato per "rate limiting e session caching" | **FALSO** | `apps/api/src/nutrition/nutrition.module.ts:36-40`, `apps/api/src/nutrition/food/openfoodfacts.service.ts:15-43` | Redis è usato SOLO per cache cibi in FoodService; rate limit OFF è in RAM e sessioni sono JWT stateless. |
| **CLM-12** | Sez. 1 (Architettura) | Traffico di rete LAN interamente HTTP in chiaro | **VERO** | `docker-compose.local.yml:10-75`, `apps/api/src/main.ts:60` | Nessun certificato TLS, reverse proxy o HTTPS configurato in Docker Compose. |
| **CLM-13** | Sez. 1 (Architettura) | Porte PostgreSQL 5432 e 5433 pubblicate sull'host | **VERO** | `docker-compose.local.yml:10-11` | Esposte su `0.0.0.0:5432` e `0.0.0.0:5433` senza restrizioni bind su localhost. |
| **CLM-14** | Sez. 1 (Architettura) | Porta Redis 6379 pubblicata sull'host | **VERO** | `docker-compose.local.yml:34` | Esposta su `0.0.0.0:6379` senza password di default protetta. |
| **CLM-15** | Sez. 3 (Installazione) | NPM Workspaces installa e collega tutto via `npm install` | **VERO** | `package.json:5-8` | Workspaces definiti per `apps/*` e `packages/*`. |
| **CLM-16** | Sez. 4 (.env) | Template dedicati `.env.example` per tutti i workspace | **PARZIALE** | `.env.local.example`, `apps/api/.env.example` | Mancano variabili critiche lette dal codice (`OFF_CONTACT_EMAIL`, `USDA_API_KEY`, `LLM_ENCRYPTION_KEY`). |
| **CLM-17** | Sez. 6 (Database) | `npm run db:seed` crea Coach (`coach@harukaizen.local`) | **FALSO** | `prisma/seed.ts:18-48` | `prisma/seed.ts` crea UNICAMENTE l'utente `admin@harukaizen.local`. Coach non esiste nel seed. |
| **CLM-18** | Sez. 6 (Database) | `npm run db:seed` crea Utente (`user@harukaizen.local`) | **FALSO** | `prisma/seed.ts:18-48` | `prisma/seed.ts` crea UNICAMENTE l'utente `admin@harukaizen.local`. Utente standard non esiste nel seed. |
| **CLM-19** | Sez. 6 (Database) | Password admin hardcoded creata anche in produzione | **VERO** | `prisma/seed.ts:18-48` | Nessun controllo su `NODE_ENV === 'production'`; sovrascrive/crea sempre con password nota. |
| **CLM-20** | Sez. 6 (Database) | Catalogo di 56 esercizi con valore MET | **VERO** | `prisma/seed.ts:53-125` | Array `exercises` contiene esattamente 56 esercizi con `defaultMetValue` assegnato. |
| **CLM-21** | Sez. 6 (Database) | "Cibi certificati" nel seed | **PARZIALE** | `prisma/seed.ts:155-256` | 10 cibi inseriti con barcode fittizi (`8001234000010`..), non estratti da laboratori CREA o USDA ufficiali. |
| **CLM-22** | Sez. 6 (Database) | `npm run db:push` sicuro per il database | **PARZIALE** | `schema.prisma:322-357` | `db:push` è per prototipi; in produzione può causare perdita dati e non crea l'indice parziale Postgres. |
| **CLM-23** | Sez. 6 (Database) | Indice parziale creato solo via `db:dedup-foods` | **VERO** | `apps/api/src/nutrition/migrations/dedup-global-foods.migration.ts:155-160` | Prisma schema non supporta indici parziali SQL nativamente; creato dallo script di migrazione raw. |
| **CLM-24** | Sez. 7 (Bare-Metal) | Script `npm run dev` avvia API e Web in parallelo | **VERO** | `package.json:15` | Esegue `concurrently "npm run dev:api" "npm run dev:web"`. |
| **CLM-25** | Sez. 7 (Bare-Metal) | Web dev ascolta su porta 3001 | **VERO** | `apps/web/package.json:6` | Comando configurato con `next dev -p 3001`. |
| **CLM-26** | Sez. 8 (Mobile) | Mobile interroga direttamente Open Food Facts | **FALSO** | `apps/mobile/app/(tabs)/nutrition.tsx:149`, `apps/mobile/src/components/BarcodeScannerModal.tsx:79` | Il mobile chiama SEMPRE il backend (`/api/v1/nutrition/food/...`); query diretta non implementata. |
| **CLM-27** | Sez. 8 (Mobile) | Offline-First nativo su SQLite | **FALSO** | `apps/mobile/src/services/offlineSyncQueue.ts:2`, `apps/mobile/package.json` | Lo storage locale mobile risiede interamente in `AsyncStorage`; nessun driver SQLite installato. |
| **CLM-28** | Sez. 8 (Mobile) | Sincronizzazione delta bidirezionale | **PARZIALE** | `apps/api/src/sync/sync.controller.ts:11-18`, `apps/mobile/src/services/offlineSyncQueue.ts:130` | Esiste solo PUSH (invio mutazioni da outbox); nessun endpoint o flusso di PULL delle modifiche remote. |
| **CLM-29** | Sez. 8 (Mobile) | LWW con risoluzione record winner su conflitto stale | **VERO** | `apps/mobile/src/services/offlineSyncQueue.ts:223-228` | Ricezione `REJECTED_STALE` rimuove mutazione e persiste winner in local storage. |
| **CLM-30** | Sez. 9 (EAS Build) | Profilo `preview` configurato per generare APK Android | **VERO** | `apps/mobile/eas.json:10-18` | Profilo preview con `buildType: "apk"` presente e valido. |
| **CLM-31** | Sez. 10 (Test) | Suite test backend Vitest completa | **VERO** | `apps/api/src/**/*.spec.ts` | 25 file di test, 126 test automatizzati passati al 100% via `vitest run`. |
| **CLM-32** | Sez. 10 (Test) | Test unitari outbox mobile | **VERO** | `apps/mobile/src/services/offlineSyncQueue.spec.ts` | 4 test eseguiti con successo tramite Vitest su mock storage. |
| **CLM-33** | Sez. 11 (Troubleshoot) | Endpoint health check `/api/v1/health` | **VERO** | `apps/api/src/common/health/health.controller.ts:1-25` | Risponde con stato database e timestamp. |
| **CLM-34** | Sez. 12 (GDPR) | Dati biometrici salvati in cache SQLite mobile | **FALSO** | `apps/mobile/src/stores/syncStore.ts:8`, `apps/mobile/package.json` | Nessun database SQLite su mobile; salvati in JSON stringificato su `AsyncStorage`. |
| **CLM-35** | Sez. 12 (GDPR) | Nessun dato sanitario o alimentare inviato a provider AI | **PARZIALE** | `apps/api/src/ai/insights/ai-insights.service.ts`, `apps/api/src/nutrition/ai/ai-nutrition.service.ts` | Immagini dei pasti e descrizioni alimentari vengono inviate all'LLM; dati clinici minimizzati. |
| **CLM-36** | Sez. 12 (GDPR) | Sanitizzazione EXIF con `sharp` prima di invio AI | **VERO** | `apps/api/src/nutrition/ai/ai-nutrition.service.ts:40-50` | Buffer immagine processato con `sharp(buffer).rotate().toFormat('jpeg')` rimuovendo metadati EXIF. |
| **CLM-37** | Sez. 12 (GDPR) | Consenso genitoriale per minori verificato dall'app | **FALSO** | `apps/api/src/auth/dto/register.dto.ts:1-35` | La registrazione non richiede, non archivia e non verifica alcun consenso dei genitori. |
| **CLM-38** | Sez. 12 (GDPR) | Blocco automatico target e MET per minori (<18 anni) | **VERO** | `packages/shared/src/nutrition/tdee-engine.ts:100-117`, `apps/api/src/workout/logs/workout-logs.service.ts:204` | AUTO forzato a MANUAL e spesa MET azzerata/nulla per minori senza calorie manuali. |
| **CLM-39** | Sez. 12 (GDPR) | Portabilità dati `POST /api/v1/users/export-data` | **VERO** | `apps/api/src/users/users.controller.ts:40-55`, `apps/api/src/users/users.service.ts:60-110` | Restituisce JSON strutturato completo di tutti i record dell'utente con conferma password. |
| **CLM-40** | Sez. 12 (GDPR) | Cancellazione account atomica e a cascata `DELETE /api/v1/users/account` | **VERO** | `apps/api/src/users/users.service.ts:120-185` | Transazione ordinata che cancella log, ricette, slots, cibi CoW e user a zero orfani. |
| **CLM-41** | Sez. 13 (Open Food Facts)| Rate limiting proxy configurabile (default 15 req/min lettura, 10 ricerca) | **VERO** | `apps/api/src/nutrition/food/openfoodfacts.service.ts:22-30` | Letti da `OFF_PRODUCT_RATE_LIMIT` e `OFF_SEARCH_RATE_LIMIT` con fallback 15 e 10. |
| **CLM-42** | Sez. 13 (Open Food Facts)| User-Agent standard `HaruKaizen/3.0 (${OFF_CONTACT_EMAIL})` | **VERO** | `apps/api/src/nutrition/food/openfoodfacts.service.ts:17-20` | Header HTTP generato con template conforme alle linee guida Open Food Facts. |
| **CLM-43** | Sez. 1 (Nutrizione) | Calcolo calorie allenamenti basato su modello biomeccanico | **VERO** | `apps/api/src/workout/logs/workout-logs.service.ts:196`, `apps/api/src/workout/expenditure/biomechanical-expenditure.ts` | Il completamento sessione usa il motore biomeccanico TUT/volume; i MET in `seed.ts` non sono usati nel log finale. |
| **CLM-44** | Sez. 1 (Nutrizione) | Attribuzione Compendium of Physical Activities presente in app | **FALSO** | `apps/web/`, `apps/mobile/` | Nessuna citazione di Ainsworth et al. presente nelle interfacce web o mobile. |
| **CLM-45** | Repository Root | Licenza open source definita | **FALSO** | `package.json:7`, assenza file `LICENSE` | `package.json` dichiara `"UNLICENSED"`; nessun file LICENSE presente nella repository. |

---

## 2. Riepilogo Statistico dell'Audit

| Stato Affermazione | Conteggio | Percentuale | Significato Tecnico |
|---|:---:|:---:|---|
| **VERO** | **29** | 64.4% | Implementato e convalidato nel codice sorgente / test. |
| **FALSO** | **8** | 17.8% | Affermazione smentita dal codice o funzione non implementata. |
| **PARZIALE** | **8** | 17.8% | Funzione solo parziale, incompleta o limitata ad alcuni scenari. |
| **NON VERIFICABILE** | **0** | 0.0% | Tutte le affermazioni estratte sono state verificate direttamente sui file. |
| **TOTALE** | **45** | 100.0% | — |

---

## 3. Le 10 Discrepanze più Gravi (Criticità Emerse)

1. **Persistenza Mobile dichiarata su SQLite (FALSO — CLM-27, CLM-34)**:
   - *Impatto*: L'app usa `AsyncStorage` (chiave-valore JSON in RAM/disco). Non supporta query relazionali, FTS5 né transazioni ACID.
2. **Query Mobile diretta a Open Food Facts (FALSO — CLM-26)**:
   - *Impatto*: L'app mobile passa sempre dal server proxy backend (`/nutrition/food/...`). In istanze multiutente, il rate limit IP del server viene saturato immediatamente.
3. **Sincronizzazione "Delta Bidirezionale" (PARZIALE — CLM-28)**:
   - *Impatto*: Esiste solo l'invio push dall'outbox. Non esiste alcun endpoint o routine di pull per sincronizzare sul dispositivo modifiche effettuate altrove o da altri client.
4. **Asserzione di Deployment "Air-Gapped" (FALSO — CLM-08)**:
   - *Impatto*: L'applicazione dipende da connessioni esterne verso Open Food Facts, USDA e provider AI proprietari. Se isolata fisicamente dalla rete senza internet, ricerca alimenti e funzioni AI falliscono.
5. **Account di Seed inesistenti e Seeding in Produzione (FALSO/RISCHIO — CLM-17, CLM-18, CLM-19)**:
   - *Impatto*: `coach@harukaizen.local` e `user@harukaizen.local` non esistono in `seed.ts`. Peggio: `admin@harukaizen.local` viene ricreato con password nota (`AdminSecurePass2026!`) senza verificare `NODE_ENV`.
6. **Esposizione Pubblica Porte DB e Redis su 0.0.0.0 (RISCHIO — CLM-13, CLM-14)**:
   - *Impatto*: `docker-compose.local.yml` pubblica PostgreSQL (5432/5433) e Redis (6379) su tutte le interfacce senza autenticazione protetta da firewall o TLS, esponendo i dati a chiunque nella stessa LAN/subnet.
7. **Redis dichiarato per Rate Limiting e Sessioni (FALSO — CLM-11)**:
   - *Impatto*: Il rate limit di Open Food Facts risiede in memoria RAM del singolo processo NestJS; `ThrottlerModule` non è registrato globalmente; le sessioni sono JWT stateless. Redis è impiegato unicamente per la cache alimenti.
8. **Dichiarazione di "Conformità GDPR" e Consenso Genitori (FALSO/PARZIALE — CLM-37, CLM-39)**:
   - *Impatto*: Nessun flusso di consenso genitoriale esiste nella registrazione. Il software fornisce strumenti tecnici (export, delete), ma la conformità legale GDPR compete all'operatore che ospita l'istanza.
9. **Attribuzione Dati Compendium e "Cibi Certificati" (FALSO/PARZIALE — CLM-21, CLM-44)**:
   - *Impatto*: I MET degli esercizi non sono attribuiti ad Ainsworth et al. nelle interfacce. I 10 cibi del seed usano barcode sintetici e non provengono da fonti accreditate CREA/INRAN.
10. **Assenza di Licenza nel Repository (FALSO — CLM-45)**:
    - *Impatto*: Nessun file `LICENSE` è presente e `package.json` indica `"UNLICENSED"`. L'uso dei badge e delle diciture open source è giuridicamente ambiguo e richiede una scelta formale da parte del proprietario.

