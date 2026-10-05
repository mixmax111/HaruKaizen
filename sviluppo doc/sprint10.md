# 🏋️ HaruKaizen — Report Sprint 10 (Mobile Core Execution - Gym Tracker)

> **Documento di tracciamento tecnico**: Riepilogo dettagliato dell'implementazione della UI/UX per il Gym Tracker (Workout Logger) su React Native / Expo, schermo sempre attivo (`expo-keep-awake`), hook custom `useRestTimer` con timestamp assoluto anti-background trap, Floating Rest Pill fluttuante in basso, navigazione FlatList con Card collassabili intelligenti, feedback aptico differenziato (`expo-haptics`) e integrazione offline trasparente nello store Zustand (`addPendingWorkoutLog` + `SyncTracer`).

---

## 🏛️ 1. Decisioni Architetturali Consolidate per Sprint 10

| Decisione | Soluzione Implementata |
|---|---|
| **Gestione Schermo & Timers (Anti-Background Trap)** | `useKeepAwake()` abilitato nella schermata del workout. Creazione del custom hook `useRestTimer`: memorizza il timestamp assoluto `targetEndTime = Date.now() + restSeconds * 1000`. Al rientro dal background di iOS/Android, il tempo residuo è calcolato matematicamente senza freeze o rallentamenti tipici di `setInterval`. |
| **Floating Rest Pill (Pillola Fluttuante)** | Posizionata in basso (Floating Action Pill) per salvaguardare lo spazio verticale per le serie. Include barra di progresso visiva integrata, conto alla rovescia dinamico e menu contestuale al tocco per aggiungere `+30s`, `-10s` o saltare il recupero. Notifica aptica di successo (`NotificationFeedbackType.Success`) al termine. |
| **FlatList con Auto-Collapse Intelligente** | Navigazione a lista verticale unica ad alte prestazioni (`FlatList`) per permettere superserie e salti di esercizio. Implementata logica di **auto-collapse**: quando tutte le serie di un esercizio sono spuntate, la card si compatta mostrando solo il nome e un badge verde di completamento, riducendo lo scroll ed enfatizzando l'esercizio successivo. Espansione manuale consentita con un semplice tap. |
| **Feedback Aptico (Premium UX)** | Integrazione mirata di `expo-haptics`: `ImpactFeedbackStyle.Light` per la regolazione di carichi e ripetizioni (+ / -); `ImpactFeedbackStyle.Medium` per la spunta di completamento serie; `NotificationFeedbackType.Success` alla fine del recupero e al salvataggio finale. |
| **Store Offline-First (`addPendingWorkoutLog`)** | Nessuna chiamata diretta ad Axios dal form dell'allenamento. Viene invocata l'action dedicata `useSyncStore.addPendingWorkoutLog()`, che serializza l'allenamento su `AsyncStorage` e traccia l'evento locale nel `syncTracer` come `status: 'RETRY'`, delegando al worker in background l'invio al backend NestJS appena la connessione è attiva. |

---

## 📁 2. Mappa File Implementati e Aggiornati

### Hooks & Componenti Mobile
* [`apps/mobile/src/hooks/useRestTimer.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/src/hooks/useRestTimer.ts): Custom hook per timer di recupero con calcolo del timestamp assoluto, aggiunta/sottrazione di secondi e notifica aptica al completamento.
* [`apps/mobile/src/components/FloatingRestPill.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/src/components/FloatingRestPill.tsx): Componente UI fluttuante compatto con progresso visivo e menu rapido per `+30s`, `-10s` e skip.
* [`apps/mobile/src/components/CollapsibleExerciseCard.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/src/components/CollapsibleExerciseCard.tsx): Card esercizio con stepper serie, feedback aptico e auto-collapse al completamento di tutti i set.
* [`apps/mobile/app/(tabs)/workout.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/app/(tabs)/workout.tsx): Schermata Workout Live integrata con `useKeepAwake`, FlatList, FloatingRestPill e action `addPendingWorkoutLog`.

### State Management & Sync
* [`apps/mobile/src/stores/syncStore.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/mobile/src/stores/syncStore.ts): Aggiunta formale dell'action `addPendingWorkoutLog` con tracciamento immediato su `syncTracer`.

---

## 🧪 3. Esiti Verifiche Monorepo

| Pacchetto / Workspace | Verifica | Esito | Note |
|---|---|:---:|---|
| **`apps/mobile`** | `npx tsc --noEmit` | **PASS (0)** | TypeScript 6.0 superato senza errori |
| **`apps/api`** | `vitest run` | **PASS (24/24)** | 11/11 suite di test superate |
| **`apps/api`** | `nest build` | **PASS (0)** | Compilazione backend NestJS completata |
| **`apps/web`** | `next build` | **PASS (0)** | Turbopack 11 route statiche e dinamiche |
