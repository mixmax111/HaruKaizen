# 📡 HaruKaizen — Report Sprint 9 (Telemetry & Mobile Dev Build)

> **Documento di tracciamento tecnico**: Riepilogo dettagliato della transizione a "Fase 2: Operatività e Lancio". Implementazione del logging strutturato Pino su NestJS, Global Error Boundary su Next.js, Sync Tracer offline locale su Expo/Zustand con console di debug su dispositivo, configurazione ibrida EAS Build (profili `development` e `preview` APK standalone) e resolver intelligente dell'IP host locale per il testing su smartphone fisico con backend locale Docker.

---

## 🏛️ 1. Decisioni Architetturali Consolidate per Sprint 9

| Decisione | Soluzione Implementata |
|---|---|
| **Logging Strutturato & Observability Backend** | `StructuredLogger` basato su Pino nativo con formattazione JSON ISO-timestamp in produzione e output colorato via `pino-pretty` in sviluppo. Binding di rete esplicito su `0.0.0.0:3000` con CORS flessibile per accettare richieste provenienti dallo smartphone su rete Wi-Fi locale. |
| **Error Boundary Web (Next.js)** | Implementato `app/global-error.tsx` per intercettare e registrare ogni crash o errore imprevisto con payload strutturato JSON (`message`, `digest`, `stack`, `timestamp`), predisposto per il transport a Sentry. |
| **Sync Tracing & Mobile Observability** | Creato `syncTracer` (`apps/mobile/src/utils/syncTracer.ts`) con persistenza circolare degli ultimi 60 log su `AsyncStorage`. Monitora durata in ms, stato (`SUCCESS`, `FAILED`), codice HTTP e messaggi di errore per ogni sync di allenamenti, nutrizione e foto multipart. Modale "Debug Logs" integrato direttamente nella dashboard mobile. |
| **EAS Build & Strategia Ibrida** | Creato `eas.json` con profilo `development` (Expo Dev Client con hot reload) e profilo `preview` (APK universale standalone Android generabile con `eas build --local` o cloud per testare offline puro senza Metro). Configurato `app.json` con metadati, permessi fotocamera/rete e schema URI. |
| **Rete Locale Intelligente (LAN Host Resolver)** | Nel file `apps/mobile/src/config.ts`, implementata la risoluzione duale: per l'APK standalone la variabile d'ambiente `EXPO_PUBLIC_API_URL` (es. `http://192.168.1.6:3000/api/v1`) è la source of truth assoluta a tempo di build; in sviluppo, se assente, estrae automaticamente l'IP del PC da `Constants.expoConfig?.hostUri`. |

---

## 📁 2. Mappa File Implementati e Aggiornati

### Backend & Web Observability
* [`apps/api/src/common/logger/structured-logger.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/common/logger/structured-logger.service.ts): Logger Pino strutturato per NestJS.
* [`apps/api/src/main.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/main.ts): Configurazione NestFactory con `StructuredLogger`, CORS aperto su LAN e binding su `0.0.0.0`.
* [`apps/web/app/global-error.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/global-error.tsx): Global Error Boundary con cattura e log delle eccezioni client Next.js.

### Mobile Sync Tracing & EAS Build
* [`apps/mobile/app.json`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/app.json): Configurazione applicativa Expo, bundle ID `dev.harukaizen.app` e permessi Android.
* [`apps/mobile/eas.json`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/eas.json): Profili di build EAS `development`, `preview` (APK) e `production` con iniezione IP LAN.
* [`apps/mobile/src/config.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/src/config.ts): Client resolver intelligente per IP dinamico e standalone.
* [`apps/mobile/src/utils/syncTracer.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/src/utils/syncTracer.ts): Utility locale di tracciamento e persistenza eventi di sync.
* [`apps/mobile/src/stores/syncStore.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/src/stores/syncStore.ts): Integrazione tracciamento su workout, nutrizione e caricamento foto.
* [`apps/mobile/app/(tabs)/index.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/app/(tabs)/index.tsx): Visualizzazione IP backend attivo e modal "Debug Logs" su smartphone.

---

## 🧪 3. Esiti Verifiche Monorepo

| Pacchetto / Workspace | Verifica | Esito | Note |
|---|---|:---:|---|
| **`apps/mobile`** | `npx tsc --noEmit` | **PASS (0)** | TypeScript 6.0 superato senza errori |
| **`apps/api`** | `nest build` | **PASS (0)** | Compilazione NestJS con StructuredLogger |
| **`apps/api`** | `vitest run` | **PASS (24/24)** | 11/11 suite di test superate |
| **`apps/web`** | `next build` | **PASS (0)** | Turbopack 11 route con Global Error Boundary |
