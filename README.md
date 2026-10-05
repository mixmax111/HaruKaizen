# 🌸💪 HaruKaizen (春改善) — Local Edition

[![Node.js](https://img.shields.io/badge/Node.js-v22%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16_Turbopack-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React Native](https://img.shields.io/badge/Expo-SDK_52-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17_Alpine-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7_Alpine-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Air-Gapped Local](https://img.shields.io/badge/Deployment-Air--Gapped_Local-059669?style=for-the-badge)](https://github.com/mix_max111/harukaizen)

> **"La trasformazione fisica non è un evento isolato, ma la somma di costanti miglioramenti quotidiani."**  
> *Haru* (春, primavera e rinascita) incontra *Kaizen* (改善, miglioramento continuo).

Questa è la versione **Local Edition** di HaruKaizen: un'architettura **100% self-hosted, locale ed air-gapped**, concepita per funzionare integralmente all'interno della tua rete locale (LAN domestica o server personale), senza richiedere tunnel cloud esterni, senza abbonamenti e con sovranità assoluta sui tuoi dati biometrici.

---

## 📑 Indice dei Contenuti
1. [Architettura Local-Edition](#-1-architettura-local-edition)
2. [Prerequisiti di Sistema](#-2-prerequisiti-di-sistema)
3. [Clonazione e Setup Iniziale](#-3-clonazione-e-setup-iniziale)
4. [Configurazione dell'Ambiente (.env)](#-4-configurazione-dellambiente-env)
5. [Avvio Rapido con Docker Compose](#-5-avvio-rapido-con-docker-compose)
6. [Inizializzazione Database & Seeding (Prisma)](#-6-inizializzazione-database--seeding-prisma)
7. [In Alternativa: Avvio Bare-Metal (Sviluppo)](#-7-in-alternativa-avvio-bare-metal-sviluppo)
8. [Test dell'App Mobile con Expo Go](#-8-test-dellapp-mobile-con-expo-go)
9. [Generazione APK Standalone Android con EAS Build](#-9-generazione-apk-standalone-android-con-eas-build)
10. [Test Automatizzati & Controllo Qualità](#-10-test-automatizzati--controllo-qualità)
11. [Risoluzione Problemi Comuni (Troubleshooting LAN)](#-11-risoluzione-problemi-comuni-troubleshooting-lan)

---

## 🏛️ 1. Architettura Local-Edition

L'edizione locale elimina ogni dipendenza da ingress cloud o proxy terzi. Tutti i servizi comunicano tramite una rete bridge Docker isolata ed espongono porte trasparenti sulla tua rete locale:

```
[ Rete Domestica / LAN Wi-Fi ]
           │
           ├── 💻 Browser PC / Tablet ──> http://<IP_LOCALE>:3000 ──> [ Container Web (Next.js 16) ]
           │                                                                 │ (Chiamate REST)
           │                                                                 ▼
           ├── 📱 Smartphone / Expo   ──> http://<IP_LOCALE>:8080 ──> [ Container API (NestJS 12) ]
                                                                             ├── PostgreSQL 17 (:5432)
                                                                             ├── Redis 7 (:6379)
                                                                             └── Uploads Locali (/app/uploads)
```

| Componente | Container Docker | Porta Host | Descrizione |
|---|---|:---:|---|
| **Frontend Web** | `hk-web-local` | `3000` | Dashboard analitica Next.js 16 (App Router + Turbopack) |
| **Backend Core** | `hk-api-local` | `8080` | Server REST NestJS con versioning globale `/api/v1` |
| **Database** | `hk-postgres-local` | `5432` | PostgreSQL 17 Alpine per persistenza biometrie e log |
| **Cache & Throttler** | `hk-redis-local` | `6379` | Redis 7 per rate limiting e caching |
| **Mobile App** | *Client Nativo* | — | React Native / Expo SDK 52 con Offline WAL e Haptics |

---

## 🛠️ 2. Prerequisiti di Sistema

Prima di iniziare, assicurati di avere installato sulla tua macchina host i seguenti strumenti:

*   **Node.js (v22.x LTS o superiore):**  
    👉 [Scarica Node.js LTS](https://nodejs.org/) (include `npm`).  
    *Verifica:* `node -v` e `npm -v`
*   **Docker Desktop (o Docker Engine con Compose v2 su Linux):**  
    👉 [Scarica Docker Desktop](https://www.docker.com/products/docker-desktop/)  
    *Verifica:* `docker --version` e `docker compose version` (accertati che il servizio Docker sia avviato).
*   **Git:**  
    👉 [Scarica Git](https://git-scm.com/)  
    *Verifica:* `git --version`
*   **Smartphone con Expo Go (per test rapidi su dispositivo fisico):**  
    👉 Scarica l'app gratuita **Expo Go** da [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) o [Apple App Store](https://apps.apple.com/app/expo-go/id982107779).

---

## 📥 3. Clonazione e Setup Iniziale

Apri il terminale (PowerShell su Windows, Terminale su macOS/Linux) ed esegui:

```bash
# 1. Clona la repository
git clone https://github.com/mix_max111/harukaizen.git

# 2. Entra nella cartella di progetto
cd harukaizen

# 3. Assicurati di essere sul branch local-edition
git checkout local-edition

# 4. Installa tutte le dipendenze del monorepo alla root
npm install
```

> [!NOTE]
> Il monorepo utilizza **NPM Workspaces**. Il singolo comando `npm install` alla root installa e collega automaticamente le dipendenze di `apps/api`, `apps/web`, `apps/mobile` e `packages/shared`.

---

## ⚙️ 4. Configurazione dell'Ambiente (.env)

Il progetto fornisce il template dedicato alla rete locale [`.env.local.example`](file:///c:/Users/Antonino/Documents/HaruKaizen/.env.local.example).

### Passo 1: Individua l'indirizzo IP locale del tuo PC
Poiché lo smartphone dovrà raggiungere il PC via Wi-Fi, serve l'IP privato della tua scheda di rete (es. `192.168.1.150`):
*   **Windows (PowerShell):** Esegui `ipconfig` e cerca la voce **Indirizzo IPv4** (sotto Wi-Fi o Scheda Ethernet).
*   **macOS / Linux:** Esegui `ip a` oppure `ifconfig` e cerca `inet 192.168.x.x` (o `10.x.x.x`).

### Passo 2: Copia e personalizza i file `.env`
```bash
# 1. File ambiente root (usato da Docker Compose locale e Prisma)
cp .env.local.example .env

# 2. File ambiente Backend NestJS
cp apps/api/.env.example apps/api/.env

# 3. File ambiente Frontend Web Next.js
cp apps/web/.env.example apps/web/.env

# 4. File ambiente Mobile Expo
cp apps/mobile/.env.example apps/mobile/.env
```
*(Su Windows PowerShell usa `copy .env.local.example .env`, ecc.)*

### Passo 3: Configura l'IP nel file `.env` e in `apps/mobile/.env`
- Nel file `.env` alla radice:
  ```env
  NEXT_PUBLIC_API_URL="http://192.168.1.150:8080/api/v1"
  ```
- Nel file `apps/mobile/.env`:
  ```env
  EXPO_PUBLIC_API_URL="http://192.168.1.150:8080/api/v1"
  ```
*(Sostituisci `192.168.1.150` con l'IP effettivo del tuo PC)*.

---

## 🐳 5. Avvio Rapido con Docker Compose

Per avviare l'intero stack isolato (PostgreSQL, Redis, Backend NestJS su porta `8080` e Frontend Next.js su porta `3000`) in un solo comando:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

### Verifica dello stato dei container:
```bash
docker compose -f docker-compose.local.yml ps
```
Dovresti vedere tutti i container nello stato `healthy` o `Up`:
- `hk-postgres-local` (:5432)
- `hk-redis-local` (:6379)
- `hk-api-local` (:8080)
- `hk-web-local` (:3000)

### Monitoraggio dei log in tempo reale:
```bash
docker compose -f docker-compose.local.yml logs -f api web
```

### Arresto dello stack locale:
```bash
docker compose -f docker-compose.local.yml down
```

---

## 🗄️ 6. Inizializzazione Database & Seeding (Prisma)

Con PostgreSQL attivo su Docker (porta `5432`), esegui le migrazioni e inserisci i dati iniziali di prova:

```bash
# 1. Genera il client Prisma 7 tipizzato
npm run db:generate

# 2. Sincronizza lo schema Prisma con il database PostgreSQL locale
npm run db:push

# 3. Inserisci gli account base, 56 esercizi con MET e cibi certificati
npm run db:seed
```

### 👤 Credenziali Predefinite Create dal Seeding:
*   👤 **Amministratore:** `admin@harukaizen.local` — Password: `AdminSecurePass2026!`
*   🏋️ **Coach:** `coach@harukaizen.local` — Password: `CoachKaizen2026!`
*   🏃 **Utente:** `user@harukaizen.local` — Password: `UserKaizen2026!`

> [!TIP]
> Per visualizzare e modificare i dati graficamente da browser, lancia **Prisma Studio**:
> ```bash
> npm run db:studio
> ```
> Sarà accessibile su `http://localhost:5555`.

---

## 💻 7. In Alternativa: Avvio Bare-Metal (Sviluppo)

Se preferisci sviluppare modificando il codice TypeScript in tempo reale con Hot-Reload:

```bash
# 1. Avvia solo i database su Docker (Postgres + Redis)
docker compose -f docker-compose.local.yml up -d postgres redis

# 2. Dalla root, avvia contemporaneamente Backend e Frontend Web:
npm run dev
```

Oppure in terminali separati:
```bash
npm run dev:api     # Backend su http://localhost:3000 (o PORT impostata)
npm run dev:web     # Frontend Web su http://localhost:3001
npm run dev:mobile  # Expo Metro Bundler per React Native
```

---

## 📱 8. Test dell'App Mobile con Expo Go

> [!WARNING]
> ### ⚠️ La "Trappola di Rete" di `localhost` sullo Smartphone
> Quando provi l'app sul telefono fisico, `localhost` fa riferimento **al telefono stesso**, non al tuo PC. Per questo motivo devi specificare l'IP della tua scheda di rete (es. `192.168.1.150`).

### Procedura:
1. Collega il tuo smartphone alla **stessa rete Wi-Fi** a cui è connesso il computer.
2. Verifica che in `apps/mobile/.env` sia impostato:
   ```env
   EXPO_PUBLIC_API_URL=http://<IP_TUO_PC>:8080/api/v1
   ```
3. Avvia il bundler Metro:
   ```bash
   npm run dev:mobile
   ```
4. Apri l'app **Expo Go** sul telefono:
   - Su **Android**: tocca *"Scan QR code"* e inquadra il codice a barre visualizzato nel terminale.
   - Su **iOS**: apri la fotocamera predefinita di iOS, inquadra il QR code e tocca la notifica per aprire Expo Go.

---

## 📦 9. Generazione APK Standalone Android con EAS Build

Vuoi installare HaruKaizen in modo permanente sul tuo smartphone Android come applicazione autonoma (senza dipendere da Expo Go)?

Il file [`apps/mobile/eas.json`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/eas.json) è già configurato con il profilo `preview` impostato per generare un `.apk`.

### Opzione A: Compilazione Cloud tramite EAS (Consigliata)
Richiede un account gratuito su [expo.dev](https://expo.dev):

```bash
# 1. Installa EAS CLI globalmente (o usa npx)
npm install -g eas-cli

# 2. Accedi al tuo account Expo
eas login

# 3. Spostati nella cartella mobile
cd apps/mobile

# 4. Avvia la build del pacchetto APK Android
eas build -p android --profile preview
```
Al termine della compilazione, il terminale ti fornirà un link diretto e un QR code per scaricare il file `.apk` direttamente sul telefono.

### Opzione B: Compilazione 100% Locale (Air-Gapped)
Se hai Android Studio e l'Android SDK installati sul tuo computer e non vuoi inviare il codice ai server Expo:

```bash
cd apps/mobile
npx eas-cli build -p android --profile preview --local
```
Il file `.apk` compilato verrà salvato direttamente sul disco locale nella cartella di progetto.

### Installazione sul Telefono:
1. Copia o scarica il file `.apk` sullo smartphone.
2. Apri il file dal file manager di Android.
3. Se richiesto, abilita *"Installa app da origini sconosciute"*.
4. L'applicazione HaruKaizen è ora installata nativamente!

---

## 🧪 10. Test Automatizzati & Controllo Qualità

Tutte le verifiche del monorepo possono essere eseguite dai comandi dedicati:

```bash
# 1. Esegui la suite di test completa del Backend NestJS (24 test Vitest)
npm test --workspace=api

# 2. Verifica TypeScript del frontend Next.js 16 e compila per produzione
npm run build --workspace=web

# 3. Verifica del compilatore TypeScript per l'App Mobile Expo
npm run typecheck --workspace=mobile

# 4. Validazione della configurazione Docker Compose locale
docker compose -f docker-compose.local.yml config --quiet
```

---

## 🔧 11. Risoluzione Problemi Comuni (Troubleshooting LAN)

### 🔴 L'app mobile mostra "Network request failed" o non si connette:
1. **Firewall di Windows / Linux:** Il firewall potrebbe bloccare le connessioni in ingresso sulle porte `8080` e `3000`.  
   *Su Windows:* Apri *Windows Defender Firewall con sicurezza avanzata* e aggiungi una regola in ingresso per consentire il traffico TCP sulle porte `8080` e `3000`.
2. **Isolamento Client (AP Isolation) sul Router Wi-Fi:** Alcuni modem/router domestici impediscono ai dispositivi Wi-Fi di comunicare tra loro. Se possibile, disabilita "Isolamento AP" o collega PC e telefono alla stessa banda Wi-Fi.
3. **Controllo connettività con curl dal telefono:** Dal browser dello smartphone apri:  
   `http://<IP_TUO_PC>:8080/api/v1/health`  
   Se vedi `{"status":"ok",...}`, l'API è perfettamente raggiungibile!

### 🔴 Errore porta già occupata (`Port 5432 or 8080 is already allocated`):
Se hai già un'istanza PostgreSQL o un altro servizio in esecuzione sul PC:
1. Controlla i processi con `netstat -ano | findstr 5432` (Windows) o `lsof -i :5432` (Linux/Mac).
2. Se necessario, modifica le porte host mappate nel file `docker-compose.local.yml`.
*   Il database salva solo l'URL relativo (es. `/media/progress/user-uuid-123/front.jpg`) per garantire il 100% di data ownership all'utente self-hosted.