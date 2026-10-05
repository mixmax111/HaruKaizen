# Sprint 7: Mobile App (React Native / Expo) — HaruKaizen

## 1. Panoramica dello Sprint
Nello **Sprint 7** è stata sviluppata l'intera architettura mobile per **HaruKaizen** basata su **React Native ed Expo** (`apps/mobile`). L'applicazione è orientata alle reali condizioni d'uso degli atleti e dei coach in palestra e sul campo, integrando persistenza offline completa, modalità allenamento continuo, allineamento fotografico "Ghosting" e scansione barcode alimentari.

---

## 2. Decisioni Architetturali & Regole di Business Rispettate

### A1. Gestione Coda Offline e File Locali (Zustand + FileSystem)
- **Zero Base64 in Storage**: AsyncStorage non viene mai sovraccaricato con stringhe Base64 pesanti.
- **Salvataggio Locale su Disco**: Le foto scattate con la fotocamera vengono salvate nella memoria locale del dispositivo (`FileSystem.documentDirectory`) tramite `expo-file-system`.
- **Coda Zustand Persistente**: Nello store offline Zustand (`useSyncStore`) viene salvato solo il percorso del file locale (`file://.../progress.jpg`).
- **Sync con Multipart Upload**: Al ripristino della connettività (`@react-native-community/netinfo`), le foto vengono caricate con `FileSystem.uploadAsync` (multipart/form-data) verso `POST /media/progress/upload`.
- **Eliminazione Post-200 OK**: Solo dopo aver ricevuto risposta positiva (o codice 2xx/409 idempotente), il file locale su disco viene eliminato con `FileSystem.deleteAsync` e rimosso dalla coda per liberare memoria.

### A2. Prevenzione del Background Timer Freeze (Gym Workout Mode)
- **Timestamp Assoluto**: Il timer di riposo non si basa su decrementi `setInterval` suscettibili a rallentamento o sospensione da parte di iOS/Android in background o a schermo spento.
- Viene memorizzato `endTime = Date.now() + restDurationMs`. All'apertura dell'app o al rientro dal background, il tempo rimanente è calcolato matematicamente istantaneo (`endTime - Date.now()`).
- Schermo sempre attivo durante la sessione di palestra tramite `useKeepAwake()` di `expo-keep-awake`.

### A3. Barcode Scanner: Anti "Machine-Gun" Lock
- Inquadrando un codice a barre con `expo-camera`, il callback `onBarcodeScanned` può scattare decine di volte al secondo.
- È stato introdotto un lock booleano immediato `isScanning`. Alla prima lettura valida dell'EAN-13:
  1. Si blocca istantaneamente lo scanner (`isScanning = false`).
  2. Viene emesso un feedback tattile di successo (`hapticFeedback.success()`).
  3. Si effettua la query a `GET /nutrition/barcode/:code` (proxy Open Food Facts con fallback e cache).
  4. Viene aperto il modale per specificare i grammi e il pasto. Lo scanner si sblocca solo su esplicita azione dell'utente.

### Caching Immagine Ghosting
- L'overlay fotografico precedente utilizza `expo-image` con `cachePolicy="disk"` per un caricamento istantaneo senza latenze di rete.
- Controllo dinamico della trasparenza dell'overlay fantasma tramite slider di opacità (0% - 100%).

### Feedback Aptico (Premium UX)
- Integrazione completa di `expo-haptics`:
  - `ImpactFeedbackStyle.Light`: incremento/decremento serie, carichi (kg) e ripetizioni.
  - `ImpactFeedbackStyle.Medium`: completamento/check serie e avvio timer.
  - `NotificationFeedbackType.Success`: scansione barcode riuscita, fine recupero e salvataggio allenamento.

---

## 3. Struttura dei File Implementati
```
apps/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Stile dark zinc & emerald con tab iconiche
│   │   ├── index.tsx        # Dashboard mobile, stato NetInfo, coda sync e statistiche
│   │   ├── workout.tsx      # Tracker Gym Mode con keep-awake, stepper serie e rest timer
│   │   ├── nutrition.tsx    # Diario nutrizionale con barcode scanning e calcolo macro
│   │   └── progress.tsx     # Galleria progressi fisici e trigger scatto Ghosting
│   └── _layout.tsx
├── src/
│   ├── config.ts            # Palette colori HaruKaizen e API_BASE_URL
│   ├── types/
│   │   └── sync.ts          # Tipi per code offline, workout, nutrizione e foto
│   ├── stores/
│   │   └── syncStore.ts     # Zustand Offline Store con persistenza AsyncStorage e FileSystem sync
│   ├── utils/
│   │   └── haptics.ts       # Wrapper feedback aptico con expo-haptics
│   └── components/
│       ├── RestTimer.tsx    # Timer di riposo resiliente al background
│       ├── GhostingCamera.tsx # Fotocamera con ghosting overlay, slider e salvataggio locale
│       └── BarcodeScannerModal.tsx # Mirino scanner EAN con lock anti-machine-gun
└── tsconfig.json            # Configurazione TypeScript 6.0 con ignoreDeprecations
```

---

## 4. Verifica di Compilazione e Parità di Produzione
1. **TypeScript Mobile (`apps/mobile`)**:
   - `npx tsc --noEmit -p tsconfig.json` completato con codice **0** (Zero errori).
2. **Backend API (`apps/api`)**:
   - `npm run build --workspace=api` completato con codice **0** (NestJS compilato).
   - `npm test --workspace=api`: **14/14 test passati su 8 suite**.
3. **Frontend Web (`apps/web`)**:
   - `npm run build --workspace=web` completato con codice **0** (Next.js Turbopack 11/11 pagine statiche e dinamiche generate).

