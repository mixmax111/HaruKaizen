# 💻 HaruKaizen — Report Sprint 6 (Web Dashboard - Next.js 16)

> **Documento di tracciamento tecnico**: Riepilogo dettagliato dell'implementazione della Web Dashboard (`apps/web` con Next.js 16 App Router e Tailwind CSS), architettura di autenticazione client reattiva con silent refresh, layout responsive a Sidebar/Bottom Bar, tema scuro Dark Slate/Sakura e chiaro Salvia/Matcha, e Smart Modal CSV.

---

## 🏛️ 1. Decisioni Architetturali Consolidate per Sprint 6

| Decisione | Soluzione Implementata |
|---|---|
| **Design System & Palette** | Dark Mode di default (Slate profondo `#0b0f17` e `#131b26` con accenti Sakura `#f472b6`). Light Mode personalizzata a toni avorio/crema con accenti verde salvia / matcha (`#52796f`). Selettore tema istantaneo in `ThemeProvider`. |
| **Navigazione Responsive Mobile-First** | `Sidebar` laterale desktop fissa da `md:flex` in su; su schermi mobile e tablet si trasforma automaticamente in `Bottom Navigation Bar` nativa (`md:hidden fixed bottom-0`) con icone di navigazione rapida. |
| **Flusso Importazione Schede Smart** | Componente `SmartImportModal`: wizard guidato in 3 step (1. Istruzioni colonne CSV richieste -> 2. Drag & Drop file -> 3. Parsing istantaneo, anteprima tabellare e conferma/salvataggio nel backend). |
| **Auth Client & Session Resilience** | `apiClient` Axios con interceptor su errori `401 Unauthorized`: esegue automaticamente la chiamata di refresh verso `/auth/refresh` con cookie `httpOnly`, aggiorna il Bearer token in memoria e re-invia la richiesta originale in modo trasparente per l'utente. |

---

## 📁 2. Mappa Pagine & Componenti Implementati

### `apps/web/`
* **Core & Providers**:
  * [`lib/api.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/lib/api.ts): Client Axios con interceptor per silent token refresh.
  * [`lib/auth-context.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/lib/auth-context.tsx): `AuthProvider` e hook `useAuth()` per stato sessione utente.
  * [`lib/theme-context.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/lib/theme-context.tsx): `ThemeProvider` per Dark Slate/Sakura e Light Salvia/Matcha.
  * [`app/globals.css`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/globals.css): Variabili CSS e direttive Tailwind.
  * [`app/layout.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/layout.tsx): Root layout con `ThemeProvider` e `AuthProvider`.
  * [`app/page.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/page.tsx): Redirect automatico a `/dashboard`.
* **Componenti Layout & Modali**:
  * [`components/layout/sidebar.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/components/layout/sidebar.tsx): Navigazione reattiva desktop + bottom bar mobile.
  * [`components/layout/app-layout.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/components/layout/app-layout.tsx): Wrapper responsive per tutte le viste applicative.
  * [`components/modals/smart-import-modal.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/components/modals/smart-import-modal.tsx): Modale di importazione guidata CSV per schede di allenamento.
* **Pagine Applicative**:
  * [`app/(auth)/login/page.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/(auth)/login/page.tsx): Pagina di autenticazione.
  * [`app/(auth)/register/page.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/(auth)/register/page.tsx): Registrazione nuovo account.
  * [`app/dashboard/page.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/dashboard/page.tsx): Dashboard con 4 card KPI (Calorie vs TDEE, Peso attuale, Ultimo allenamento, Obiettivi), grafico ad area Recharts per trend peso e barre macro (Pro, Carb, Fat).
  * [`app/workouts/page.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/workouts/page.tsx): Schede attive, attivazione esclusiva, storico sessioni concluse con volume e durata, trigger per il modale CSV.
  * [`app/nutrition/page.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/nutrition/page.tsx): Diario giornaliero, ricerca cibi nel catalogo con calorie/macro per 100g, calcolo porzione e log dei pasti.
  * [`app/progress/page.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/progress/page.tsx): Form di caricamento foto con peso sincronizzato opzionale e griglia galleria delle trasformazioni.
  * [`app/insights/page.tsx`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/web/app/insights/page.tsx): Visualizzazione report Kaizen AI con testo in Markdown e checklist interattiva per gli Action Items settimanali.

---

## 🧪 3. Esiti di Compilazione & Produzione

* **Compilazione Next.js 16 (Turbopack)**: `npm run build --workspace=web` completato con codice **0**:
  * Tutte le 11 rotte generate e pre-renderizzate correttamente (`/`, `/dashboard`, `/workouts`, `/nutrition`, `/progress`, `/insights`, `/login`, `/register`).
