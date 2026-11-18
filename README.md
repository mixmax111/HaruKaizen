# 🌸💪 HaruKaizen (春改善)

[![Node.js](https://img.shields.io/badge/Node.js-v22%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16_Turbopack-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React Native](https://img.shields.io/badge/Expo-SDK_52-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17_Alpine-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7_Alpine-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

> **"La trasformazione fisica non è un evento isolato, ma la somma di costanti miglioramenti quotidiani."**  
> *Haru* (春, primavera e rinascita) incontra *Kaizen* (改善, miglioramento continuo).

**HaruKaizen** è una piattaforma self-hosted per il monitoraggio del fitness, della nutrizione e della ricomposizione corporea, concepita per funzionare su server o computer personale:
- 🚫 **Nessun abbonamento né paywall**: tutte le funzionalità applicative (motore macro, ricette custom, live logger, telemetria biometrica) sono libere da restrizioni commerciali.
- 🔒 **Controllo dei dati**: il database PostgreSQL risiede sulla tua infrastruttura.
- 🥗 **Conta Calorie PURO**: calcolo deterministico basato su fisiologia energetica con protezione per gruppi speciali.

> [!CAUTION]
> ### ⚠️ Disclaimer Medico e Sanitario
> **HaruKaizen è un'applicazione software di supporto al tracciamento personale e non fornisce diagnosi, indicazioni terapeutiche né prescrizioni dietetiche o mediche.**  
> Le stime del fabbisogno calorico (TDEE) e i suggerimenti nutrizionali costituiscono modelli matematici teorici e **non sostituiscono in alcun modo il parere di un medico, pediatra, dietista o nutrizionista abilitato**.  
> In caso di età minore di 18 anni, gravidanza, allattamento, patologie metaboliche o disturbi dell'alimentazione, l'uso dell'applicazione deve essere autorizzato e supervisionato da un professionista sanitario.

---

## 📊 Stato del Progetto

Il progetto è attualmente in fase **Beta per il backend/web** e **Alpha per il client mobile**:

| Modulo / Applicazione | Canale | Stato Attuale | Note di Maturità |
|---|---|:---:|---|
| **Backend API (`apps/api`)** | REST NestJS | **Beta** | Motore TDEE, calcolo biomeccanico, gestione ricette e slot pasto, rate limiting Open Food Facts, export dati e cancellazione account. |
| **Frontend Web (`apps/web`)** | Next.js 16 | **Beta** | Dashboard telemetry, gestione pasti dinamici, modal ricette e quick add, live gym logger. |
| **App Mobile (`apps/mobile`)** | React Native / Expo | **Alpha** | Scanner barcode (via proxy backend), visualizzazione log, accodamento outbox su `AsyncStorage`. Sincronizzazione solo PUSH verso server (manca PULL). *SQLite locale e query diretta a OFF sono pianificate (vedi ROADMAP.md).* |
| **Libreria Condivisa (`packages/shared`)** | TypeScript | **Stabile** | Motore deterministico TDEE, ripartizione macronutrienti, formule di bilancio calorico e calcolo ricette. |

---

## 📑 Indice dei Contenuti
1. [Prerequisiti di Sistema](#-1-prerequisiti-di-sistema)
2. [Installazione e Setup Iniziale](#-2-installazione-e-setup-iniziale)
3. [Configurazione dell'Ambiente (.env)](#-3-configurazione-dellambiente-env)
4. [Inizializzazione del Database (Prisma)](#-4-inizializzazione-del-database-prisma)
5. [Guida all'Avvio: Sviluppo Locale](#-5-guida-allavvio-sviluppo-locale)
6. [Guida al Deployment: Produzione & VPS](#-6-guida-al-deployment-produzione--vps)
7. [App Mobile (Expo Go & APK)](#-7-app-mobile-expo-go--apk)
8. [Verifica e Controllo Qualità](#-8-verifica-e-controllo-qualità)
9. [Privacy Onesta e Flussi di Rete](#-9-privacy-onesta-e-flussi-di-rete)
10. [Attribuzioni Dati & Licenze](#-10-attribuzioni-dati--licenze)

---

## 🛠️ 1. Prerequisiti di Sistema

- **Node.js**: versione `v22.x LTS` o superiore (con `npm` v10+).
- **Docker & Docker Compose**: Compose v2 per gestire i container di PostgreSQL e Redis.
- **Git**: per la clonazione e l'aggiornamento del repository.

---

## 📥 2. Installazione e Setup Iniziale

```bash
# 1. Clona il repository
git clone https://github.com/mix_max111/harukaizen.git
cd harukaizen

# 2. Installa le dipendenze di tutti i workspace monorepo
npm install
```

Il comando `npm install` alla radice collega automaticamente `apps/api`, `apps/web`, `apps/mobile` e `packages/shared`.

---

## ⚙️ 3. Configurazione dell'Ambiente (.env)

Copia i file di esempio per ciascun workspace:

```bash
# File root (per Docker Compose e CLI Prisma)
cp .env.local.example .env

# File specifici per applicazione
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

### Tabella Completa delle Variabili d'Ambiente

| Variabile | Workspace | Scopo e Descrizione | Valore Consigliato / Esempio |
|---|---|---|---|
| `PORT` | API | Porta interna su cui ascolta il server HTTP NestJS. | `8002` (dev) / `8080` (container) |
| `DATABASE_URL` | Root, API | Stringa di connessione PostgreSQL per Prisma e NestJS. | `postgresql://user:pass@localhost:5432/harukaizen_db?schema=public` |
| `REDIS_URL` | API | Indirizzo dell'istanza Redis usata per la cache degli alimenti. | `redis://localhost:6379` |
| `WEB_ORIGIN` | API | URL autorizzato per le chiamate CORS dal frontend web. | `http://localhost:3000` (dev) / `https://tuodominio.it` |
| `JWT_SECRET` | API | Chiave simmetrica per la firma degli access token (min 32 caratteri). | Generare con `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | API | Chiave per i refresh token (deve essere diversa da `JWT_SECRET`). | Generare con `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | API | Chiave AES-256-GCM (esattamente 64 caratteri hex = 32 byte) per cifrare a riposo le chiavi API BYOK. | Generare con `openssl rand -hex 32` |
| `ALTCHA_HMAC_KEY` | API | Segreto HMAC per la verifica dei captcha proof-of-work (min 16 caratteri). | Generare stringa casuale robusta |
| `OFF_CONTACT_EMAIL` | API | Email inserita nell'header `User-Agent` inviato a Open Food Facts. | `tuaemail@dominio.it` |
| `OFF_PRODUCT_RATE_LIMIT`| API | Massimo numero di richieste/minuto verso Open Food Facts per lettura prodotti. | `15` (default prudente) |
| `OFF_SEARCH_RATE_LIMIT` | API | Massimo numero di ricerche/minuto verso Open Food Facts. | `10` (default) |
| `USDA_API_KEY` | API | *(Opzionale)* Chiave API USDA FoodData Central per fallback cibi USA. | Default `DEMO_KEY` |
| `COOKIE_SECURE` | API | Imposta il flag `Secure` sui cookie di refresh (abilitare in HTTPS). | `false` (dev locale) / `true` (produzione) |
| `NEXT_PUBLIC_API_URL` | Web | Endpoint REST esposto al browser per le chiamate API. | `http://localhost:8002/api/v1` |
| `EXPO_PUBLIC_API_URL` | Mobile | Endpoint REST raggiungibile dallo smartphone (usare IP locale Wi-Fi). | `http://192.168.1.X:8002/api/v1` |

> [!WARNING]
> ### 🔑 Gestione Critica di `ENCRYPTION_KEY`
> Genera la chiave di cifratura tramite terminale:
> ```bash
> openssl rand -hex 32
> ```
> **Non modificare né smarrire questo valore dopo il primo avvio**: la perdita di `ENCRYPTION_KEY` rende permanentemente illeggibili tutte le chiavi AI degli utenti salvate a database.

---

## 🗄️ 4. Inizializzazione del Database (Prisma)

Con PostgreSQL attivo:

```bash
# 1. Genera i tipi TypeScript del client Prisma
npm run db:generate

# 2. Applica lo schema strutturale
npm run db:push

# 3. Esegui la deduplicazione degli alimenti e crea l'indice parziale anti-race-condition
npm run db:dedup-foods
```

### Seeding Iniziale (`npm run db:seed`)
Il comando `npm run db:seed` inserisce nel database:
- L'utente amministratore predefinito: `admin@harukaizen.local` con password `AdminSecurePass2026!`.
- Un catalogo di 56 esercizi con categoria e valore MET standard.
- 10 alimenti base con composizione nutrizionale di esempio.

> [!CAUTION]
> **Sicurezza in Produzione**: Se esegui `npm run db:seed` su un server accessibile da terzi, **cambia immediatamente la password dell'amministratore** dal profilo dopo il primo accesso. Non lasciare mai la password di default.

---

## 💻 5. Guida all'Avvio: Sviluppo Locale

### 1. Avvia PostgreSQL e Redis su Docker
```bash
docker compose -f docker-compose.local.yml up -d postgres redis
```

### 2. Avvia le applicazioni in modalità sviluppo (Hot-Reload)
Puoi avviare Backend e Web contemporaneamente:
```bash
npm run dev
```

Oppure in finestre di terminale separate:
```bash
# Terminale 1 — Backend NestJS
npm run dev:api          # Ascolta su http://localhost:8002

# Terminale 2 — Frontend Web Next.js (Turbopack)
npm run dev:web          # Ascolta su http://localhost:3000 (o 3001)

# Terminale 3 — Metro Bundler Mobile (Expo)
npm run dev:mobile:clean # Ascolta su http://localhost:8081
```

---

## 🌐 6. Guida al Deployment: Produzione & VPS

Per ospitare HaruKaizen su un server cloud o VPS Linux:

### 1. Rete e Sicurezza delle Porte
- **Non pubblicare le porte di PostgreSQL (`5432`) o Redis (`6379`) sull'indirizzo pubblico (`0.0.0.0`)**: devono rimanere accessibili solo all'interno della rete Docker interna.
- Nel file compose di produzione, mappa solo le porte dell'applicazione o usa una rete interna `backend-network`.

### 2. Reverse Proxy & HTTPS Obbligatorio
Tutto il traffico verso `apps/web` e `apps/api` deve essere instradato tramite un reverse proxy (es. Caddy o NGINX) che gestisca i certificati TLS:
```
Internet ──HTTPS (443)──> [ Caddy / NGINX ] ────HTTP────> web (:3000)
                                            └────HTTP────> api (:8080)
```
Esempio configurazione Caddy (`Caddyfile`):
```caddy
app.tuodominio.it {
    reverse_proxy localhost:3000
}

api.tuodominio.it {
    reverse_proxy localhost:8080
}
```

### 3. Configurazione CORS e Cookie
Nel file `.env` di produzione:
```env
NODE_ENV=production
COOKIE_SECURE=true
WEB_ORIGIN="https://app.tuodominio.it"
```

### 4. Strategia di Backup e Ripristino
Esegui backup giornalieri del database PostgreSQL tramite `pg_dump`:
```bash
# Backup
docker compose exec postgres pg_dump -U harukaizen harukaizen_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Ripristino
gunzip < backup_20261117.sql.gz | docker compose exec -T postgres psql -U harukaizen -d harukaizen_db
```

### 5. Procedura di Aggiornamento
```bash
git pull origin local-edition
npm install
npm run db:generate
npm run db:push
npm run db:dedup-foods
docker compose build
docker compose up -d
```

---

## 📱 7. App Mobile (Expo Go & APK)

### Test su Smartphone con Expo Go
1. Connetti lo smartphone alla **stessa rete Wi-Fi** del computer.
2. In `apps/mobile/.env` imposta l'IP del computer nella LAN (es. `EXPO_PUBLIC_API_URL="http://192.168.1.150:8002/api/v1"`).
3. Avvia Metro con `npm run dev:mobile:clean` e inquadra il QR code con l'app Expo Go.

### Compilazione Pacchetto APK Standalone (Android)
Il profilo `preview` in `apps/mobile/eas.json` è predisposto per la creazione del file `.apk`:
```bash
cd apps/mobile

# Compilazione su cloud Expo EAS (richiede account gratuito)
npx eas-cli build -p android --profile preview

# Oppure compilazione locale (richiede Android Studio / Android SDK installati)
npx eas-cli build -p android --profile preview --local
```

---

## 🧪 8. Verifica e Controllo Qualità

Comandi di verifica del monorepo:

```bash
# Esecuzione test unitari e di integrazione del Backend (Vitest)
npm run test --workspace=api

# Test della coda offline mobile (Vitest)
npx vitest run apps/mobile/src/services/offlineSyncQueue.spec.ts

# Verifica tipi TypeScript del client mobile
npx tsc -p apps/mobile/tsconfig.json --noEmit

# Compilazione del frontend web Next.js
npm run build --workspace=web
```

---

## 🛡️ 9. Privacy Onesta e Flussi di Rete

HaruKaizen non raccoglie telemetria proprietaria né condivide dati biometrici con terze parti non autorizzate. Tuttavia, **non è un'applicazione air-gapped**: per funzionare integra servizi esterni che comportano flussi di rete specifici.

### Mappa dei Dati in Uscita verso Provider Esterni

| Destinazione | Quando avviene la chiamata | Dati Trasmessi | Nota di Riservatezza |
|---|---|---|---|
| **Open Food Facts** (`world.openfoodfacts.org`) | Scansione barcode o ricerca testuale alimento | Barcode numerico o termine cercato (es. `"avena"`), IP pubblico del server/dispositivo, User-Agent. | Nessun dato personale o identificativo utente viene inviato. |
| **USDA FoodData Central** (`api.nal.usda.gov`) | Ricerca alimenti USA se non trovati su OFF | Termine cercato, API Key USDA, IP chiamante. | Nessun dato utente inviato. |
| **Provider AI (OpenAI / Anthropic / Gemini)** | Solo se l'utente attiva funzioni AI inserendo la propria chiave (BYOK) | Testo descrittivo del pasto o immagine (con **metadati EXIF preventivamente rimossi**), prompt di calcolo macro. | I dati clinici (peso, anamnesi, gravidanza) non vengono inclusi nei prompt. Le immagini dei pasti vengono trasmesse ai server del provider scelto. |

### Responsabilità di chi Ospita l'Istanza (Self-Hosting per Terzi)
Chi ospita un'istanza accessibile a utenti terzi è legalmente responsabile di:
1. Fornire un'adeguata informativa sulla privacy e gestire il consenso al trattamento dei dati sanitari (Art. 9 GDPR).
2. Verificare il consenso genitoriale per utenti minorenni (il software non include un sistema di verifica d'identità dei genitori).
3. Gestire la retention dei file di backup del database (cancellazione periodica o anonimizzazione).
4. Informare gli utenti che la cancellazione dell'account (`DELETE /api/v1/users/account`) elimina immediatamente i dati attivi nel database, ma i backup storici già archiviati sul server restano soggetti al ciclo di rotazione impostato dall'amministratore.

---

## 📚 10. Attribuzioni Dati & Licenze

- **Open Food Facts**: I dati nutrizionali dei prodotti con codice a barre provengono dal database collaborativo [Open Food Facts](https://world.openfoodfacts.org/), concesso sotto licenza [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
- **USDA FoodData Central**: Dati sulle tabelle nutrizionali statunitensi forniti dall'[U.S. Department of Agriculture](https://fdc.nal.usda.gov/), di pubblico dominio.
- **Compendium of Physical Activities**: I valori MET associati agli esercizi derivano dalle tabelle standardizzate pubblicate da Ainsworth BE et al. (*Medicine & Science in Sports & Exercise*).
- **Licenza del Software HaruKaizen**: *In fase di formalizzazione da parte del proprietario del progetto. Per consultare le opzioni in valutazione, fare riferimento a [docs/license-options.md](file:///c:/Users/Antonino/Documents/HaruKaizen/docs/license-options.md).*
