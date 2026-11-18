import { calculateAge } from './age.js';

export interface TdeeEngineInput {
  weightKg: number;
  heightCm: number;
  sex: 'M' | 'F';
  birthDate?: Date | string | null;
  lifestyleMultiplier?: number;
  targetMode?: 'AUTO' | 'MANUAL';
  goalType?: 'CUT' | 'MAINTENANCE' | 'BULK';
  deficitPct?: number; // 10 - 25% (default 15)
  surplusPct?: number; // 5 - 10% (default 10)
  proteinPerKg?: number; // 1.6 - 2.2 g/kg (default 2.0)
  fatPct?: number; // 20 - 35% (default 25)
  isPregnant?: boolean;
  isLactating?: boolean;
  manualTargets?: {
    targetCalories?: number | null;
    targetProteinG?: number | null;
    targetCarbsG?: number | null;
    targetFatG?: number | null;
    targetFiberG?: number | null;
  };
}

export interface TdeeEngineResult {
  bmr: number | null;
  baseTdee: number | null;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  targetFiberG: number;
  targetMode: 'AUTO' | 'MANUAL';
  goalType: 'CUT' | 'MAINTENANCE' | 'BULK';
  isAgeKnown: boolean;
  age: number | null;
  isUnderage: boolean;
  isSpecialGroup: boolean;
  canAutoCalculate: boolean;
  floorAdjustmentApplied: boolean;
  floorAdjustmentMessage?: string;
  advisoryWarnings: string[];
  clinicalDisclaimer?: string;
}

export const PHYSIOLOGICAL_LIMITS = {
  MIN_CALORIC_FLOOR_FEMALE: 1200,
  MIN_CALORIC_FLOOR_MALE: 1500,
  MIN_FAT_PER_KG: 0.6,
  OPTIMAL_MIN_FAT_PER_KG: 0.8,
  DEFICIT_MIN: 10,
  DEFICIT_MAX: 25,
  DEFICIT_DEFAULT: 15,
  SURPLUS_MIN: 5,
  SURPLUS_MAX: 10,
  SURPLUS_DEFAULT: 10,
  PROTEIN_MIN_G_KG: 1.6,
  PROTEIN_MAX_G_KG: 2.2,
  PROTEIN_DEFAULT_G_KG: 2.0,
  FAT_PCT_MIN: 20,
  FAT_PCT_MAX: 35,
  FAT_PCT_DEFAULT: 25,
  FIBER_PER_1000_KCAL: 14,
} as const;

export const CLINICAL_DISCLAIMER_SPECIAL_GROUP =
  "L'applicazione non sostituisce un medico, pediatra o dietista. Per minori di 18 anni, gravidanza e allattamento i fabbisogni nutrizionali devono essere determinati esclusivamente da personale sanitario qualificato.";

export const GENERAL_MEDICAL_DISCLAIMER =
  "HaruKaizen è uno strumento di supporto al tracciamento personale e non fornisce diagnosi o prescrizioni mediche. Consulta sempre un professionista sanitario abilitato prima di modificare la tua alimentazione.";

/**
 * Motore deterministico per il calcolo dei fabbisogni calorici e macronutrienti baseline.
 */
export function calculateNutritionalTargets(input: TdeeEngineInput): TdeeEngineResult {
  const advisoryWarnings: string[] = [];
  const sex = input.sex;
  const weightKg = Math.max(25, input.weightKg);
  const heightCm = Math.max(80, input.heightCm);
  const lifestyleMultiplier = input.lifestyleMultiplier && input.lifestyleMultiplier >= 1.0 ? input.lifestyleMultiplier : 1.2;
  const isPregnant = Boolean(input.isPregnant);
  const isLactating = Boolean(input.isLactating);

  // 1. Verifica età
  let age: number | null = null;
  let isAgeKnown = false;
  let isUnderage = false;

  if (input.birthDate) {
    try {
      age = calculateAge(input.birthDate);
      isAgeKnown = true;
      isUnderage = age < 18;
    } catch {
      isAgeKnown = false;
    }
  }

  const isSpecialGroup = isUnderage || isPregnant || isLactating;

  // Se l'età è sconosciuta o appartiene a un gruppo speciale, il calcolo automatico è bloccato
  const canAutoCalculate = isAgeKnown && !isSpecialGroup;

  // Se l'utente richiede AUTO ma non è idoneo, forziamo MANUAL
  const requestedMode = input.targetMode ?? 'AUTO';
  const effectiveMode: 'AUTO' | 'MANUAL' = canAutoCalculate ? requestedMode : 'MANUAL';

  if (!isAgeKnown && requestedMode === 'AUTO') {
    advisoryWarnings.push('Data di nascita non specificata: inserisci la data di nascita nel profilo per abilitare il calcolo automatico dei target.');
  }

  if (isSpecialGroup) {
    if (requestedMode === 'AUTO') {
      advisoryWarnings.push('Target automatico disabilitato: in età evolutiva (<18 anni), gravidanza o allattamento i target devono essere inseriti manualmente secondo indicazione medica.');
    }
  }

  // 2. Calcolo BMR e TDEE se età nota
  let bmr: number | null = null;
  let baseTdee: number | null = null;

  if (isAgeKnown && age !== null) {
    const rawBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    bmr = sex === 'M' ? rawBmr + 5 : rawBmr - 161;
    baseTdee = Math.round(bmr * lifestyleMultiplier);
  }

  // 3. Gestione modalità MANUAL
  if (effectiveMode === 'MANUAL') {
    const manualKcal = input.manualTargets?.targetCalories ?? baseTdee ?? 2000;
    const manualProtein = input.manualTargets?.targetProteinG ?? Math.round(weightKg * PHYSIOLOGICAL_LIMITS.PROTEIN_DEFAULT_G_KG);
    const manualFat = input.manualTargets?.targetFatG ?? Math.round((manualKcal * 0.25) / 9);
    const manualCarbs = input.manualTargets?.targetCarbsG ?? Math.max(0, Math.round((manualKcal - (manualProtein * 4 + manualFat * 9)) / 4));
    const manualFiber = input.manualTargets?.targetFiberG ?? Math.round((manualKcal / 1000) * PHYSIOLOGICAL_LIMITS.FIBER_PER_1000_KCAL);

    // Controllo consultivo sui grassi in MANUAL
    const fatPerKg = manualFat / weightKg;
    if (fatPerKg < PHYSIOLOGICAL_LIMITS.MIN_FAT_PER_KG) {
      advisoryWarnings.push(
        `Attenzione: l'apporto di grassi inserito (${manualFat}g = ${fatPerKg.toFixed(2)} g/kg) è inferiore al minimo raccomandato di ${PHYSIOLOGICAL_LIMITS.MIN_FAT_PER_KG} g/kg per l'equilibrio ormonale.`
      );
    }

    return {
      bmr,
      baseTdee,
      targetCalories: Math.round(manualKcal),
      targetProteinG: Math.round(manualProtein),
      targetCarbsG: Math.round(manualCarbs),
      targetFatG: Math.round(manualFat),
      targetFiberG: Math.round(manualFiber),
      targetMode: 'MANUAL',
      goalType: input.goalType ?? 'MAINTENANCE',
      isAgeKnown,
      age,
      isUnderage,
      isSpecialGroup,
      canAutoCalculate,
      floorAdjustmentApplied: false,
      advisoryWarnings,
      clinicalDisclaimer: isSpecialGroup ? CLINICAL_DISCLAIMER_SPECIAL_GROUP : undefined,
    };
  }

  // 4. Modalità AUTO (solo per adulti idonei con età nota)
  const goalType = input.goalType ?? 'MAINTENANCE';
  const deficitPct = Math.min(
    PHYSIOLOGICAL_LIMITS.DEFICIT_MAX,
    Math.max(PHYSIOLOGICAL_LIMITS.DEFICIT_MIN, input.deficitPct ?? PHYSIOLOGICAL_LIMITS.DEFICIT_DEFAULT)
  );
  const surplusPct = Math.min(
    PHYSIOLOGICAL_LIMITS.SURPLUS_MAX,
    Math.max(PHYSIOLOGICAL_LIMITS.SURPLUS_MIN, input.surplusPct ?? PHYSIOLOGICAL_DEFAULT_SURPLUS_PCT)
  );
  const proteinPerKg = Math.min(
    PHYSIOLOGICAL_LIMITS.PROTEIN_MAX_G_KG,
    Math.max(PHYSIOLOGICAL_LIMITS.PROTEIN_MIN_G_KG, input.proteinPerKg ?? PHYSIOLOGICAL_LIMITS.PROTEIN_DEFAULT_G_KG)
  );
  const fatPct = Math.min(
    PHYSIOLOGICAL_LIMITS.FAT_PCT_MAX,
    Math.max(PHYSIOLOGICAL_LIMITS.FAT_PCT_MIN, input.fatPct ?? PHYSIOLOGICAL_LIMITS.FAT_PCT_DEFAULT)
  );

  let theoreticalTargetKcal = baseTdee!;
  if (goalType === 'CUT') {
    theoreticalTargetKcal = Math.round(baseTdee! * (1 - deficitPct / 100));
  } else if (goalType === 'BULK') {
    theoreticalTargetKcal = Math.round(baseTdee! * (1 + surplusPct / 100));
  }

  // Pavimento calorico fisiologico
  const minFloor = sex === 'M' ? PHYSIOLOGICAL_LIMITS.MIN_CALORIC_FLOOR_MALE : PHYSIOLOGICAL_LIMITS.MIN_CALORIC_FLOOR_FEMALE;
  let floorAdjustmentApplied = false;
  let floorAdjustmentMessage: string | undefined;

  let finalTargetKcal = theoreticalTargetKcal;
  if (theoreticalTargetKcal < minFloor) {
    finalTargetKcal = minFloor;
    floorAdjustmentApplied = true;
    floorAdjustmentMessage = `Il target calorico teorico (${theoreticalTargetKcal} kcal) è stato innalzato al pavimento minimo di sicurezza fisiologica (${minFloor} kcal) per preservare l'apporto di micronutrienti essenziali.`;
    advisoryWarnings.push(floorAdjustmentMessage);
  }

  // Ripartizione macro
  let targetProteinG = Math.round(weightKg * proteinPerKg);
  const minProteinG = Math.round(weightKg * PHYSIOLOGICAL_LIMITS.PROTEIN_MIN_G_KG);

  // Grassi: % target, garantendo mai meno di MIN_FAT_PER_KG (0.6 g/kg)
  let targetFatG = Math.round((finalTargetKcal * (fatPct / 100)) / 9);
  const minFatG = Math.round(weightKg * PHYSIOLOGICAL_LIMITS.MIN_FAT_PER_KG);
  if (targetFatG < minFatG) {
    targetFatG = minFatG;
  }

  // Carboidrati: soglia pratica minima (30g = 120 kcal, non minimo fisiologico assoluto)
  const PRACTICAL_MIN_CARBS_G = 30;
  const PRACTICAL_MIN_CARBS_KCAL = PRACTICAL_MIN_CARBS_G * 4;

  // Ordine di riduzione in AUTO:
  // Se la combinazione di proteine e grassi non lascia spazio per almeno 30g di carboidrati,
  // prima riduciamo progressivamente le proteine verso il minimo del range (1.6 g/kg).
  const caloriesNeededForFatAndCarbs = targetFatG * 9 + PRACTICAL_MIN_CARBS_KCAL;
  if (targetProteinG * 4 + caloriesNeededForFatAndCarbs > finalTargetKcal) {
    const maxProteinKcalAllowed = finalTargetKcal - caloriesNeededForFatAndCarbs;
    const maxProteinGAllowed = Math.floor(maxProteinKcalAllowed / 4);
    const adjustedProtein = Math.max(minProteinG, maxProteinGAllowed);

    if (adjustedProtein < targetProteinG) {
      targetProteinG = adjustedProtein;
      advisoryWarnings.push(
        `Attenzione: per garantire la soglia pratica minima di carboidrati (${PRACTICAL_MIN_CARBS_G}g) e i grassi essenziali nel budget calorico ristretto, l'apporto proteico è stato scalato verso il limite inferiore raccomandato (${PHYSIOLOGICAL_LIMITS.PROTEIN_MIN_G_KG} g/kg).`
      );
    }
  }

  // Calcolo carboidrati su calorie residue
  const caloriesUsed = targetProteinG * 4 + targetFatG * 9;
  let targetCarbsG = Math.round((finalTargetKcal - caloriesUsed) / 4);

  // Clamp a 30g (soglia pratica) se ancora insufficienti anche dopo riduzione proteine a 1.6 g/kg
  if (targetCarbsG < PRACTICAL_MIN_CARBS_G) {
    targetCarbsG = PRACTICAL_MIN_CARBS_G;
    const totalDisplayedKcal = targetProteinG * 4 + targetCarbsG * 4 + targetFatG * 9;

    if (totalDisplayedKcal > finalTargetKcal) {
      advisoryWarnings.push(
        `Attenzione: la quota di carboidrati è stata fissata alla soglia pratica minima (${PRACTICAL_MIN_CARBS_G}g). Il totale calorico dei macro mostrati (${totalDisplayedKcal} kcal) supera il target calorico (${finalTargetKcal} kcal) per preservare i minimi proteici (${minProteinG}g) e lipidici (${targetFatG}g).`
      );
    } else {
      advisoryWarnings.push(
        `Attenzione: la quota di carboidrati è stata impostata alla soglia pratica minima (${PRACTICAL_MIN_CARBS_G}g).`
      );
    }
  }

  // Fibre: 14g ogni 1000 kcal
  const targetFiberG = Math.round((finalTargetKcal / 1000) * PHYSIOLOGICAL_LIMITS.FIBER_PER_1000_KCAL);

  return {
    bmr,
    baseTdee,
    targetCalories: finalTargetKcal,
    targetProteinG,
    targetCarbsG,
    targetFatG,
    targetFiberG,
    targetMode: 'AUTO',
    goalType,
    isAgeKnown,
    age,
    isUnderage,
    isSpecialGroup,
    canAutoCalculate: true,
    floorAdjustmentApplied,
    floorAdjustmentMessage,
    advisoryWarnings,
  };
}

const PHYSIOLOGICAL_DEFAULT_SURPLUS_PCT = 10;

