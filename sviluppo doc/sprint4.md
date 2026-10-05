# 🧠 HaruKaizen — Report Sprint 4 (AI & LLM Engine - Kaizen Core)

> **Documento di tracciamento tecnico**: Riepilogo dettagliato dell'implementazione del modulo di Intelligenza Artificiale (`AiModule`), Vercel AI SDK multi-provider, Context Snapshot aggregation, personalizzazione del tono del Coach AI, formato ibrido Markdown + JSON Action Items e CRON Job settimanale.

---

## 🏛️ 1. Decisioni Architetturali Consolidate per Sprint 4

| Decisione | Soluzione Implementata |
|---|---|
| **Gestione Chiave API** | Chiave personale dell'utente strettamente obbligatoria. Se assente, errore `400 Bad Request: Nessuna API Key configurata`. La chiave è decifrata in RAM in modo sicuro via `CryptoService` (`AES-256-GCM`). |
| **Personalità Coach Dinamica** | Enum `CoachTone` (`RIGOROUS`, `EMPATHETIC`, `KAIZEN`) aggiunto a `@harukaizen/shared` e colonna `coachTone` in `UserSettings` su Prisma. `PromptBuilderService` carica dinamicamente il System Prompt corrispondente. |
| **Output Ibrido (Chat + Action Items)** | Utilizzo di `generateObject` di Vercel AI SDK con schema Zod (`coachMessage: string` in Markdown per fluidità conversazionale, `actionItems: string[]` per checklist interattiva UI). |
| **Schedulazione Automatica** | `WeeklyInsightsJob` con `@Cron(CronExpression.EVERY_WEEK, { timeZone: 'Europe/Rome' })` via `@nestjs/schedule`. Processa tutti gli utenti attivi con chiave API configurata. |

---

## 📁 2. Mappa File Implementati

### `apps/api/src/ai/`
* [`ai.module.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/ai.module.ts): Registrazione `ScheduleModule.forRoot()`, `SettingsModule`, controller e services.
* **Orchestrator & Multi-Provider**:
  * [`orchestrator/provider.factory.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/orchestrator/provider.factory.ts): Factory con supporto a OpenAI (`gpt-4o`) e Anthropic (`claude-3-5-sonnet-20241022`).
  * [`orchestrator/ai-orchestrator.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/orchestrator/ai-orchestrator.service.ts): Recupero chiave decifrata in RAM e invocazione Vercel AI SDK (`generateObject`).
* **Data Aggregator**:
  * [`aggregator/context-snapshot.interface.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/aggregator/context-snapshot.interface.ts): Schema tipizzato del Context Snapshot.
  * [`aggregator/data-aggregator.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/aggregator/data-aggregator.service.ts): Raccolta dati biologici, ultime pesate, calorie e macro medi 7gg vs TDEE e sessioni di allenamento con volume working sets.
* **Prompt Engineering**:
  * [`prompts/prompt-builder.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/prompts/prompt-builder.service.ts): Costruzione dinamica di System Prompt basato su `CoachTone` e formattazione User Prompt con lo snapshot JSON.
  * [`prompts/prompt-builder.service.spec.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/prompts/prompt-builder.service.spec.ts): Test unitari per tutti i toni (`RIGOROUS`, `EMPATHETIC`, `KAIZEN`).
* **Insights & CRON Job**:
  * [`insights/ai-insights.service.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/insights/ai-insights.service.ts): Salvataggio report in `AiInsightReport` e query storico.
  * [`insights/ai-insights.controller.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/insights/ai-insights.controller.ts): Endpoint `POST /ai/insights/generate`, `GET /ai/insights`, `GET /ai/insights/:id`.
  * [`jobs/weekly-insights.job.ts`](file:///c:/Users/Antonino/Documents/HaruKaizen/apps/api/src/ai/jobs/weekly-insights.job.ts): CRON job notturno domenicale per la generazione automatica dei report settimanali.

---

## 🧪 3. Esiti Test & Compilazione

* **Compilazione NestJS**: `npm run build --workspace=api` completata con codice di uscita **0**.
* **Test Suite Vitest**: `npm test --workspace=api` completata con **12 test su 12 superati** (PromptBuilderService, WorkoutLogsService, NutritionLogsService, OpenFoodFactsService, CryptoService, PrismaService, AppController).
