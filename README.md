# 🌸💪 HaruKaizen (春改善) — Monorepo

[![Node.js](https://img.shields.io/badge/Node.js-v22%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16_Turbopack-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React Native](https://img.shields.io/badge/Expo-52_%2F_React_Native-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17_Alpine-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7_Alpine-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **"La trasformazione fisica non è un evento isolato, ma la somma di costanti miglioramenti quotidiani."**  
> *Haru* (春, primavera e rinascita) incontra *Kaizen* (改善, miglioramento continuo).

---

## 📖 1. Introduzione & Filosofia

**HaruKaizen** è una piattaforma unificata (Web, Mobile e Backend API), autonoma e **100% self-hostable**, progettata per atleti, coach e appassionati di fitness che desiderano il controllo sovrano sui propri dati fisici, nutrizionali e biometrici, senza lock-in verso piattaforme cloud commerciali o abbonamenti chiusi.

### I Tre Pilastri dello Stack
1. **💻 Web App (`apps/web`):** Realizzata con **Next.js 16 (App Router & Turbopack)**, TailwindCSS, libreria componenti accessibili shadcn/ui e grafici reattivi Recharts. È la dashboard analitica per monitorare l'evoluzione del peso corporeo, comporre schede con drag-and-drop e visualizzare i report generati dall'AI.
2. **🧠 Backend Core (`apps/api`):** Sviluppato su **NestJS 12**, **Prisma 7 (Driver Adapters PostgreSQL 17)** e **Redis 7**. Include sicurezza avanzata (Helmet, rate limiting distribuito con `@nestjs/throttler`, crittografia `AES-256-GCM` per le API key LLM degli utenti) e logging strutturato ad alta leggibilità con Pino.
3. **📱 Mobile Companion (`apps/mobile`):** Sviluppato con **React Native ed Expo 52**. Pensato specificamente per le reali condizioni di utilizzo in palestra e in cucina:
   - **Offline-First Trasparente:** Tutte le modifiche vengono memorizzate su coda locale (Zustand + AsyncStorage/FileSystem) e inviate con retry automatico al ripristino della connettività (`SyncTracer`).
   - **Gym Tracker Anti-Distrazione:** Schermo sempre attivo (`expo-keep-awake`), allarme del recupero a timestamp assoluto non congelabile in background e notifiche locali a schermo bloccato (`expo-notifications`).
   - **Ghosting Camera:** Allineamento visivo per le foto progressi mensili tramite sovrapposizione semi-trasparente dello scatto precedente con slider ergonomico ad auto-fade e guida SVG.
   - **Barcode Scanner Nutrizionale:** Scansione rapida codici a barre alimentari con query automatica e cache a monte su OpenFoodFacts.

---

## 🛠️ 2. Prerequisiti (Da non dare per scontato)

Prima di eseguire qualsiasi comando, assicurati di aver installato sulla tua macchina di sviluppo i seguenti software fondamentali:

*   **Node.js (v22.x LTS o superiore):** Il runtime JavaScript/TypeScript.  
    👉 [Scarica Node.js LTS dal sito ufficiale](https://nodejs.org/) (include `npm`).  
    *Verifica nel terminale con:* `node -v` e `npm -v`
*   **Docker Desktop (o Docker Engine su Linux):** Necessario per avviare il database PostgreSQL 17, Redis 7 e il demone di backup automatico.  
    👉 [Scarica Docker Desktop](https://www.docker.com/products/docker-desktop/) (assicurati che sia aperto e in esecuzione).  
    *Verifica nel terminale con:* `docker --version` e `docker compose version`
*   **Git:** Per clonare e gestire i sorgenti.  
    👉 [Scarica Git](https://git-scm.com/)  
    *Verifica nel terminale con:* `git --version`
*   **Expo Go (sullo smartphone):** L'applicazione gratuita per testare l'app mobile sul tuo dispositivo fisico in tempo reale.  
    👉 [Scarica Expo Go su iOS App Store o Google Play Store](https://expo.dev/go)

---

## 📥 3. Clonazione & Dipendenze

Apri il terminale (PowerShell, Bash o Zsh) ed esegui i seguenti comandi per clonare la repository e installare l'intero albero di dipendenze del monorepo:

```bash
# 1. Clona la repository sul tuo computer
git clone https://github.com/mix_max111/harukaizen.git

# 2. Entra nella cartella principale del progetto
cd harukaizen

# 3. Installa le dipendenze di tutti i workspace (root, api, web, mobile, shared)
npm install
```

> [!NOTE]
> Il progetto sfrutta **NPM Workspaces**. Eseguire `npm install` alla root scarica e collega automaticamente tutti i moduli dei progetti `apps/api`, `apps/web`, `apps/mobile` e `packages/shared`, garantendo la massima coerenza e type-safety tra i moduli.

---

## ⚙️ 4. Setup dell'Ambiente (.env)

Il monorepo richiede configurazioni specifiche per il Backend, il Frontend Web e l'applicazione Mobile. Crea i file di configurazione copiando le basi predefinite:

```bash
# Copia la configurazione root (usata da Prisma e Docker)
cp .env.example .env

# Copia la configurazione dell'API NestJS
cp apps/api/.env.example apps/api/.env

# Copia la configurazione del Frontend Web Next.js
cp apps/web/.env.example apps/web/.env

# Copia la configurazione dell'App Mobile Expo
cp apps/mobile/.env.example apps/mobile/.env
```

*(Su Windows PowerShell puoi usare il comando `copy .env.example .env`)*.

### 🔍 Significato delle Variabili Critiche:
*   `DATABASE_URL`: La stringa di connessione a PostgreSQL.  
    `postgresql://harukaizen:harukaizen_secret@localhost:5433/harukaizen_db?schema=public`  
    *(Nota bene: viene mappata la porta host **5433** invece della standard 5432 per evitare conflitti con eventuali istanze PostgreSQL già installate sul tuo computer).*
*   `REDIS_URL`: `redis://localhost:6379`. Connette il backend al server Redis per il rate limiting distribuito tra repliche e la cache degli alimenti.
*   `JWT_SECRET` & `JWT_REFRESH_SECRET`: Stringhe crittografiche casuali (minimo 32 caratteri) utilizzate per firmare gli access token a breve scadenza (15m) e i refresh token a lunga scadenza (7d). **Modificale sempre prima di esporre l'istanza all'esterno!**
*   `ENCRYPTION_KEY`: Una chiave esadecimale a 64 caratteri (32 byte) per la crittografia nativa `AES-256-GCM` utilizzata da HaruKaizen per proteggere le chiavi API degli LLM (OpenAI, Anthropic) fornite dagli utenti nel database.
*   `WEB_ORIGIN`: `http://localhost:3001`. Definisce quale dominio web è autorizzato dal middleware CORS di NestJS.
*   `EXPO_PUBLIC_API_URL`: L'indirizzo a cui l'app mobile inoltra le richieste API (es. `http://localhost:3000/api/v1` in emulatore o l'IP LAN su dispositivo fisico).

---

## 🐳 5. Infrastruttura Locale (Docker)

Per avviare i database e i servizi di supporto senza dover installare PostgreSQL e Redis direttamente sul tuo sistema operativo, avvia i container Docker in background:

```bash
docker-compose up -d postgres redis
```

Se vuoi avviare anche il demone per i backup orari automatici del database compresso su volume:
```bash
docker-compose -f docker-compose.prod.yml up -d postgres redis db-backup
```

### Verifica dell'Avvio:
Controlla che i container siano attivi e in stato *healthy*:
```bash
docker ps
```
Dovresti vedere i container `harukaizen-postgres` (porta `5433->5432`) e `harukaizen-redis` (porta `6379->6379`) con stato `Up`.

---

## 🗄️ 6. Inizializzazione Database (Prisma)

Una volta avviato PostgreSQL su Docker, inizializza lo schema del database ed esegui il popolamento dati (Seeding) iniziale:

```bash
# 1. Genera il client TypeScript tipizzato di Prisma 7
npm run db:generate

# 2. Sincronizza lo schema Prisma con il database PostgreSQL
npm run db:push

# 3. Popola il database con gli account demo, 56 esercizi e cibi certificati
npm run db:seed
```

### 💎 Cosa inserisce il Seed Idempotente (`prisma/seed.ts`):
*   **3 Account Predefiniti:**
    *   👤 **Admin:** `admin@harukaizen.local` (Password: `AdminSecurePass2026!`)
    *   🏋️ **Coach:** `coach@harukaizen.local` (Password: `CoachKaizen2026!`, Tono Coach: Kaizen)
    *   🏃 **User:** `user@harukaizen.local` (Password: `UserKaizen2026!`, Peso Target: 75kg)
*   **56 Esercizi Fondamentali Verificati:** Panca piana, Squat, Stacco da terra, Military press, Trazioni, Dip, ecc., categorizzati per biomeccanica con valori MET scientifici.
*   **10 Cibi Base Certificati:** Avena, Petto di pollo, Riso basmati, Olio EVO, Uova, Whey Isolate, Yogurt greco, ecc., con barcode EAN-13 e macronutrienti esatti per 100g.

> [!TIP]
> Vuoi esplorare visivamente le tabelle del tuo database? Esegui `npm run db:studio` per aprire **Prisma Studio** nel tuo browser all'indirizzo `http://localhost:5555`.

---

## 🚀 7. Avvio dello Sviluppo

Con il database pronto, puoi avviare i moduli in modalità sviluppo con hot-reload automatico:

### Opzione A: Avvio Simultaneo Backend + Web (Consigliata)
Dalla cartella principale del monorepo, lancia:
```bash
npm run dev
```
Questo comando avvierà in parallelo:
*   🚀 **Backend NestJS API:** in ascolto su `http://localhost:3000/api/v1`
*   💻 **Frontend Next.js Web:** raggiungibile nel browser su `http://localhost:3001`

### Opzione B: Avvio Selettivo dei Workspace
Puoi avviare ciascun componente in una finestra di terminale dedicata:
```bash
# Solo Backend API
npm run dev:api

# Solo Frontend Web
npm run dev:web

# Solo Mobile App (Metro Bundler)
npm run dev:mobile
```

---

## 📱 8. Test su Dispositivo Mobile (Network Trap)

> [!WARNING]
> ### ⚠️ ATTENZIONE: La "Trappola di Rete" di `localhost` sullo Smartphone!
> Quando esegui l'app mobile su un **telefono fisico** tramite Expo Go:
> - `localhost` o `127.0.0.1` sul telefono si riferiscono allo **smartphone stesso**, non al tuo computer! Poiché il backend NestJS gira sul PC e non sul telefono, qualsiasi chiamata verso `http://localhost:3000` fallirà con errore `Network Error` o timeout.

### Come configurare correttamente la rete mobile:

1. **Stessa Rete Wi-Fi:** Assicurati che lo smartphone e il PC siano collegati alla **stessa rete Wi-Fi** locale (senza isolamento client / AP isolation attiva).
2. **Trova l'indirizzo IP locale del tuo PC:**
   *   Su **Windows** (PowerShell): digita `ipconfig` e cerca la voce `Indirizzo IPv4` (es. `192.168.1.50`).
   *   Su **macOS / Linux**: digita `ifconfig` o `ip a` (es. `192.168.1.50`).
3. **Imposta l'API URL per Expo:**  
   Apri il file `apps/mobile/.env` e imposta:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.50:3000/api/v1
   ```
   *(Sostituisci `192.168.1.50` con l'IP effettivo del tuo computer)*.
4. **Avvia Metro ed inquadra il QR Code:**
   ```bash
   npm run dev:mobile
   ```
   Apri l'app **Expo Go** sul tuo smartphone, inquadra il QR Code stampato nel terminale ed esegui HaruKaizen nativamente sul tuo telefono!

---

## 🔒 9. Self-Hosting Sicuro via Cloudflare (Bonus)

Vuoi accedere ad HaruKaizen ovunque nel mondo o sincronizzare il telefono quando ti alleni fuori casa su rete 4G/5G, ma **senza aprire porte sul router di casa (zero port-forwarding)** e senza esporre il tuo IP pubblico?

La soluzione consigliata e di livello enterprise è **Cloudflare Tunnels (`cloudflared`)**.

```
[ Smartphone 5G / Web ] ──(HTTPS)──> [ Cloudflare Edge ] ──(Tunnel Crittografato)──> [ Tuo PC/Server Locale ]
                                                                                           ├── Web (:3001)
                                                                                           └── API (:3000)
```

### Setup Rapido in 4 Passaggi:

1. **Installa `cloudflared`:**  
   Scarica il binario ufficiale da [developers.cloudflare.com](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. **Autenticati con il tuo account Cloudflare:**
   ```bash
   cloudflared tunnel login
   ```
3. **Crea il tuo Tunnel dedicato:**
   ```bash
   cloudflared tunnel create harukaizen-tunnel
   ```
4. **Configura il routing nel file `~/.cloudflared/config.yml`:**
   ```yaml
   tunnel: <ID-DEL-TUO-TUNNEL>
   credentials-file: /percorso/.cloudflared/<ID-DEL-TUO-TUNNEL>.json

   ingress:
     # Frontend Web Dashboard
     - hostname: app.tuodominio.it
       service: http://localhost:3001
     # Backend API REST
     - hostname: api.tuodominio.it
       service: http://localhost:3000
     - service: http_status:404
   ```
5. **Avvia il Tunnel:**
   ```bash
   cloudflared tunnel run harukaizen-tunnel
   ```
🎉 **Fatto!** La tua dashboard e le tue API sono ora online su protocollo HTTPS con certificato SSL gestito da Cloudflare, protezione anti-DDoS e senza aver esposto alcuna porta del tuo modem domestico.

---

## 🧪 10. Testing & Controllo Qualità

HaruKaizen include una suite completa di verifiche automatizzate eseguibili con un singolo comando:

```bash
# Esegui tutti gli unit & integration test del backend (24 test Vitest)
npm test --workspace=api

# Esegui il typecheck dell'applicazione mobile Expo
npx tsc --noEmit -p apps/mobile/tsconfig.json

# Esegui la compilazione ottimizzata di produzione del web
npm run build --workspace=web

# Esegui i test End-to-End critici di navigazione (Playwright)
npm run test:e2e --workspace=web
```

---

## ☕ 11. Supporto al Progetto

HaruKaizen è un progetto open-source, sviluppato con passione per promuovere il fitness scientifico, la privacy dei dati e l'architettura software di qualità.

Se questo progetto ti è stato utile, ti ha fatto risparmiare tempo o vuoi sostenere lo sviluppo continuo delle prossime funzionalità (es. esportazione referti medici PDF e sincronizzazione smartwatch):

*   ⭐ **Lascia una stella** su questa repository GitHub per aiutare la community a scoprirla!
*   ☕ **Offrimi un caffè su Ko-fi:** `https://ko-fi.com/mix_max111` *(Placeholder)*
*   💖 **Sponsorizza il progetto su GitHub Sponsors:** `coming soon i hope xd` *(Placeholder)*

---

*Made with dedication, resilience and continuous improvement (Kaizen).*
*   Il database salva solo l'URL relativo (es. `/media/progress/user-uuid-123/front.jpg`) per garantire il 100% di data ownership all'utente self-hosted.