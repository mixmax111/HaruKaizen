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
 * - DROP:    Drop set (peso ridotto senza recupero)
 * - FAILURE: Serie a cedimento muscolare
 */
export enum SetType {
  WARMUP  = 'WARMUP',
  WORKING = 'WORKING',
  DROP    = 'DROP',
  FAILURE = 'FAILURE',
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

export enum LlmProvider {
  OPENAI    = 'openai',
  ANTHROPIC = 'anthropic',
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
