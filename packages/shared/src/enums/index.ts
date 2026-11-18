// ─────────────────────────────────────────────────────────────────────────────
// USER & AUTH
// ─────────────────────────────────────────────────────────────────────────────

export enum UserRole {
  ADMIN = 'ADMIN',
  USER  = 'USER',
}

export enum Sex {
  MALE   = 'M',
  FEMALE = 'F',
}

// ─────────────────────────────────────────────────────────────────────────────
// NUTRIZIONE
// ─────────────────────────────────────────────────────────────────────────────

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH     = 'LUNCH',
  DINNER    = 'DINNER',
  SNACK     = 'SNACK',
}

// ─────────────────────────────────────────────────────────────────────────────
// ALLENAMENTO
// ─────────────────────────────────────────────────────────────────────────────

export enum ExerciseCategory {
  CHEST     = 'CHEST',
  BACK      = 'BACK',
  LEGS      = 'LEGS',
  SHOULDERS = 'SHOULDERS',
  ARMS      = 'ARMS',
  CORE      = 'CORE',
  CARDIO    = 'CARDIO',
}

/**
 * Tipo di serie nel log granulare (WorkoutLogSet).
 * - WARMUP:  Serie di riscaldamento (non conta per il volume)
 * - WORKING: Serie di lavoro principale
 * - DROPSET: Drop set (peso ridotto senza recupero)
 * - FAILURE: Serie a cedimento muscolare
 */
export enum SetType {
  WARMUP  = 'WARMUP',
  WORKING = 'WORKING',
  DROPSET = 'DROPSET',
  FAILURE = 'FAILURE',
}

// ─────────────────────────────────────────────────────────────────────────────
// ORIGINE RECORD & ISOLAMENTO
// ─────────────────────────────────────────────────────────────────────────────

export enum RecordOrigin {
  USER       = 'USER',
  AI_DRAFT   = 'AI_DRAFT',
  AI_APPLIED = 'AI_APPLIED',
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTI UTENTE (SEMI-RAG)
// ─────────────────────────────────────────────────────────────────────────────

export enum DocumentCategory {
  BLOODWORK      = 'BLOODWORK',
  MEDICAL_REPORT = 'MEDICAL_REPORT',
  COACH_PLAN     = 'COACH_PLAN',
  BIOMETRICS     = 'BIOMETRICS',
  OTHER          = 'OTHER',
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

export enum LlmProvider {
  GEMINI       = 'gemini',
  OPENAI       = 'openai',
  ANTHROPIC    = 'anthropic',
  OPENROUTER   = 'openrouter',
  LOCAL_CUSTOM = 'local_custom',
}

export enum ReportType {
  WEEKLY    = 'WEEKLY',
  MONTHLY   = 'MONTHLY',
  ON_DEMAND = 'ON_DEMAND',
}

/**
 * Personalità del Coach AI configurabile dall'utente:
 * - RIGOROUS: Analitico, zero scuse, focus su numeri e progressive overload.
 * - EMPATHETIC: Supportivo, celebra le vittorie, focus su costanza e benessere psicologico.
 * - KAIZEN: Bilanciato, filosofia del miglioramento dell'1% ogni giorno.
 */
export enum CoachTone {
  RIGOROUS   = 'RIGOROUS',
  EMPATHETIC = 'EMPATHETIC',
  KAIZEN     = 'KAIZEN',
}
