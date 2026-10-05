# 📸 HaruKaizen — Report Sprint 5 (Media & Progress Engine)

> **Documento di tracciamento tecnico**: Riepilogo dettagliato dell'implementazione del modulo di Gestione Media e Monitoraggio Progressi (`MediaModule`), architettura storage locale con Docker volume, sincronizzazione offline-first e supporto alla Ghosting Camera.

---

## 🏛️ 1. Decisioni Architetturali Consolidate per Sprint 5

| Decisione | Soluzione Implementata |
|---|---|
| **Storage Provider** | Filesystem locale salvato su volume persistente (`uploads/progress/`) con sanitizzazione dei file via UUIDv4 per prevenire path traversal. |
| **Architettura Offline-First** | `UploadProgressMediaDto` supporta `clientCapturedAt` (data di acquisizione reale della fotocamera generata dall'app anche in assenza di rete) e `clientSyncId` (ID di sincronizzazione confermato nella risposta HTTP). |
| **Privacy e Accesso Protetto** | Endpoint di streaming `GET /media/file/:id` protetto da `JwtAuthGuard` con controllo rigoroso dell'ownership. Gli utenti possono vedere e scaricare solo i propri progressi personali. |
| **Sincronizzazione Peso e Foto** | Inserimento contestuale in transazione atomica Prisma (`$transaction`): caricando la foto con `weightKg` e `bodyFatPercentage` opzionali viene contestualmente creato il record `Measurement` corrispondente alla stessa data/ora. |
| **Ghosting Camera Support** | Endpoint `GET /media/progress/latest` per recuperare immediatamente l'ultima foto frontale/progressiva scattata e renderizzarla in sovrapposizione semitrasparente (opacity 0.3) nella fotocamera Expo. |

---

## 📁 2. Mappa File Implementati

### `apps/api/src/media/`
* [`media.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/media/media.module.ts): Registrazione modulo in `AppModule`, provider e controller.
* [`storage/disk-storage.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/media/storage/disk-storage.service.ts): Salvataggio su disco con generazione UUID e cancellazione file fisici.
* [`dto/upload-progress-media.dto.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/media/dto/upload-progress-media.dto.ts): DTO con validazione range peso, body fat, e timestamp offline.
* [`dto/uploaded-file.interface.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/media/dto/uploaded-file.interface.ts): Interfaccia tipizzata per i buffer Multer in ESM.
* [`media.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/media/media.service.ts): Logica applicativa, transazione Prisma, stream sicuro e soft-delete.
* [`media.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/media/media.controller.ts):
  * `POST /api/v1/media/progress/upload`: upload con validatore MIME type (`jpg`, `jpeg`, `png`, `webp`, `mp4`) e limite 15MB.
  * `GET /api/v1/media/progress/latest`: endpoint per Ghosting Camera mobile.
  * `GET /api/v1/media/progress`: storico foto.
  * `GET /api/v1/media/file/:id`: streaming protetto da JWT con content-type appropriato.
  * `DELETE /api/v1/media/:id`: cancellazione logica e fisica.
* [`media.service.spec.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/media/media.service.spec.ts): Test unitari per upload sincronizzato e recupero ultima foto.

---

## 🧪 3. Esiti Test & Compilazione

* **Compilazione NestJS**: `npm run build --workspace=api` completata con codice di uscita **0**.
* **Test Suite Vitest**: `npm test --workspace=api` completata con successo (**14 test su 14 superati**).
