export interface DailyCalorieBalanceInput {
  targetCalories: number;
  baseTdee?: number | null;
  eatenCalories: number;
  burnedCalories: number;
  calorieBalanceMode?: 'SIMPLE' | 'ACTIVE';
  burnedCalorieRecoveryPct?: number; // 0 - 100% (default 50)
  isSpecialGroup?: boolean; // Minorenni, gravidanza, allattamento
  isAgeKnown?: boolean;
}

export interface DailyCalorieBalanceResult {
  targetCalories: number;
  effectiveTargetCalories: number;
  eatenCalories: number;
  burnedCalories: number;
  recoveredBurnedCalories: number;
  remainingCalories: number;
  netEstimatedBalance: number | null; // null per minorenni, gravidanza, allattamento o età ignota
  mode: 'SIMPLE' | 'ACTIVE';
  isBalanceHidden: boolean;
  balanceExplanation: string;
}

export interface DailyFiberSummaryInput {
  logs: Array<{
    fiberConsumed: number | null | undefined;
  }>;
}

export interface DailyFiberSummaryResult {
  totalFiberG: number | null;
  isFiberIncomplete: boolean;
  displayValue: string; // es. "28g" oppure "n.d."
  note?: string;
}

/**
 * Calcola il bilancio energetico giornaliero prevenendo rigorosamente il doppio conteggio
 * e proteggendo i gruppi a tutela speciale (minorenni, gravidanza, allattamento).
 */
export function calculateDailyCalorieBalance(input: DailyCalorieBalanceInput): DailyCalorieBalanceResult {
  const mode = input.calorieBalanceMode ?? 'SIMPLE';
  const targetCalories = Math.max(0, input.targetCalories);
  const eatenCalories = Math.max(0, input.eatenCalories);
  const burnedCalories = Math.max(0, input.burnedCalories);
  const recoveryPct = Math.min(100, Math.max(0, input.burnedCalorieRecoveryPct ?? 50));
  const baseTdee = input.baseTdee ?? targetCalories;

  const isSpecialGroup = Boolean(input.isSpecialGroup);
  const isAgeKnown = input.isAgeKnown ?? true;
  const isBalanceHidden = isSpecialGroup || !isAgeKnown;

  let effectiveTargetCalories = targetCalories;
  let recoveredBurnedCalories = 0;
  let netEstimatedBalance: number | null = null;
  let balanceExplanation = '';

  if (mode === 'SIMPLE') {
    // In modalità SIMPLE: il moltiplicatore TDEE include già gli allenamenti settimanali tipici.
    // Le calorie bruciate non vengono sommate al target e non vengono sottratte dal bilancio netto.
    effectiveTargetCalories = targetCalories;
    recoveredBurnedCalories = 0;
    
    if (!isBalanceHidden) {
      netEstimatedBalance = eatenCalories - baseTdee;
      balanceExplanation = `Modalità Semplice: il target include già l'attività. Bilancio netto stimato = ${eatenCalories} (mangiate) - ${baseTdee} (TDEE base) = ${netEstimatedBalance > 0 ? '+' : ''}${netEstimatedBalance} kcal.`;
    } else {
      netEstimatedBalance = null;
      balanceExplanation = 'Bilancio netto stimato non applicabile a profili con fabbisogni fisiologici specifici (età evolutiva, gravidanza, allattamento o età non definita).';
    }
  } else {
    // In modalità ACTIVE: il TDEE base riflette solo la sedentarietà quotidiana.
    // I workout aggiungono budget al target in base a recoveryPct e il bilancio netto sottrae sia TDEE che calorie bruciate.
    recoveredBurnedCalories = Math.round(burnedCalories * (recoveryPct / 100));
    effectiveTargetCalories = targetCalories + recoveredBurnedCalories;

    if (!isBalanceHidden) {
      netEstimatedBalance = eatenCalories - (baseTdee + burnedCalories);
      balanceExplanation = `Modalità Attiva: recupero workout al ${recoveryPct}%. Bilancio netto stimato = ${eatenCalories} (mangiate) - (${baseTdee} base + ${burnedCalories} bruciate) = ${netEstimatedBalance > 0 ? '+' : ''}${netEstimatedBalance} kcal.`;
    } else {
      netEstimatedBalance = null;
      balanceExplanation = 'Bilancio netto stimato non applicabile a profili con fabbisogni fisiologici specifici.';
    }
  }

  const remainingCalories = effectiveTargetCalories - eatenCalories;

  return {
    targetCalories,
    effectiveTargetCalories,
    eatenCalories,
    burnedCalories,
    recoveredBurnedCalories,
    remainingCalories,
    netEstimatedBalance,
    mode,
    isBalanceHidden,
    balanceExplanation,
  };
}

/**
 * Calcola il totale giornaliero delle fibre gestendo la completezza dei dati ("n.d.").
 */
export function calculateDailyFiberSummary(input: DailyFiberSummaryInput): DailyFiberSummaryResult {
  let total = 0;
  let hasMissing = false;
  let logCount = input.logs.length;

  if (logCount === 0) {
    return {
      totalFiberG: 0,
      isFiberIncomplete: false,
      displayValue: '0g',
    };
  }

  for (const log of input.logs) {
    if (log.fiberConsumed === null || log.fiberConsumed === undefined) {
      hasMissing = true;
    } else {
      total += Number(log.fiberConsumed) || 0;
    }
  }

  const totalFiberG = hasMissing ? null : Math.round(total * 10) / 10;
  const isFiberIncomplete = hasMissing;

  return {
    totalFiberG,
    isFiberIncomplete,
    displayValue: isFiberIncomplete ? 'n.d.' : `${totalFiberG}g`,
    note: isFiberIncomplete
      ? 'Totale fibre parziale: alcuni alimenti registrati non riportano le fibre nei valori nutrizionali.'
      : undefined,
  };
}

