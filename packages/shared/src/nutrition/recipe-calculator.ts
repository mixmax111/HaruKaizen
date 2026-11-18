export type RecipeIngredientUnit = 'g' | 'ml' | 'serving' | 'piece';

export interface RecipeIngredientInput {
  foodItemId: string;
  foodItemName?: string;
  quantity: number;
  unit: RecipeIngredientUnit | string;
  densityGPerMl?: number; // Default 1.0
  servingSizeG?: number | null; // Se unit === 'serving' o 'piece'
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g?: number | null;
  sodium100g?: number | null;
}

export interface CalculatedIngredient {
  foodItemId: string;
  foodItemName?: string;
  rawQuantity: number;
  unit: string;
  computedWeightG: number;
  isServingEstimated: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
}

export interface RecipeCalculationResult {
  totalWeightG: number; // Peso a crudo
  finishedWeightG: number | null; // Peso a cotto/finito se impostato
  defaultServings: number;
  isRawWeightNotice: boolean;
  noticeMessage?: string;
  ingredients: CalculatedIngredient[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    sodium: number | null;
  };
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    sodium: number | null;
  };
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    sodium: number | null;
  };
}

/**
 * Converte la quantità e unità dell'ingrediente in grammi effettivi.
 */
export function convertIngredientToGrams(
  quantity: number,
  unit: RecipeIngredientUnit | string,
  servingSizeG?: number | null,
  densityGPerMl: number = 1.0
): { grams: number; isServingEstimated: boolean } {
  const q = Math.max(0, quantity);
  const normalizedUnit = (unit || 'g').toLowerCase().trim();

  if (normalizedUnit === 'g') {
    return { grams: q, isServingEstimated: false };
  }

  if (normalizedUnit === 'ml') {
    return { grams: q * (densityGPerMl > 0 ? densityGPerMl : 1.0), isServingEstimated: false };
  }

  if (normalizedUnit === 'serving' || normalizedUnit === 'piece') {
    if (servingSizeG && servingSizeG > 0) {
      return { grams: q * servingSizeG, isServingEstimated: false };
    }
    // Fallback prudente a 100g con flag di avviso
    return { grams: q * 100, isServingEstimated: true };
  }

  // Fallback per unità sconosciuta: assume grammi
  return { grams: q, isServingEstimated: false };
}

/**
 * Calcola i valori nutrizionali totali, per porzione e su 100g di una ricetta.
 */
export function calculateRecipeNutrition(params: {
  ingredients: RecipeIngredientInput[];
  defaultServings?: number;
  finishedWeightG?: number | null;
}): RecipeCalculationResult {
  const defaultServings = Math.max(0.1, params.defaultServings ?? 1);
  const finishedWeightG = params.finishedWeightG && params.finishedWeightG > 0 ? params.finishedWeightG : null;

  let totalRawWeightG = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSodium = 0;
  let hasMissingFiber = false;
  let hasMissingSodium = false;

  const calculatedIngredients: CalculatedIngredient[] = [];

  for (const ing of params.ingredients) {
    const { grams, isServingEstimated } = convertIngredientToGrams(
      ing.quantity,
      ing.unit,
      ing.servingSizeG,
      ing.densityGPerMl
    );

    totalRawWeightG += grams;
    const factor = grams / 100;

    const ingCalories = (ing.calories100g || 0) * factor;
    const ingProtein = (ing.protein100g || 0) * factor;
    const ingCarbs = (ing.carbs100g || 0) * factor;
    const ingFat = (ing.fat100g || 0) * factor;

    totalCalories += ingCalories;
    totalProtein += ingProtein;
    totalCarbs += ingCarbs;
    totalFat += ingFat;

    let ingFiber: number | null = null;
    if (ing.fiber100g !== null && ing.fiber100g !== undefined) {
      ingFiber = Number(ing.fiber100g) * factor;
      totalFiber += ingFiber;
    } else {
      hasMissingFiber = true;
    }

    let ingSodium: number | null = null;
    if (ing.sodium100g !== null && ing.sodium100g !== undefined) {
      ingSodium = Number(ing.sodium100g) * factor;
      totalSodium += ingSodium;
    } else {
      hasMissingSodium = true;
    }

    calculatedIngredients.push({
      foodItemId: ing.foodItemId,
      foodItemName: ing.foodItemName,
      rawQuantity: ing.quantity,
      unit: ing.unit,
      computedWeightG: Math.round(grams * 10) / 10,
      isServingEstimated,
      calories: Math.round(ingCalories * 10) / 10,
      protein: Math.round(ingProtein * 10) / 10,
      carbs: Math.round(ingCarbs * 10) / 10,
      fat: Math.round(ingFat * 10) / 10,
      fiber: ingFiber !== null ? Math.round(ingFiber * 10) / 10 : null,
      sodium: ingSodium !== null ? Math.round(ingSodium * 10) / 10 : null,
    });
  }

  const totals = {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    fiber: hasMissingFiber ? null : Math.round(totalFiber * 10) / 10,
    sodium: hasMissingSodium ? null : Math.round(totalSodium * 10) / 10,
  };

  const perServing = {
    calories: Math.round(totals.calories / defaultServings),
    protein: Math.round((totals.protein / defaultServings) * 10) / 10,
    carbs: Math.round((totals.carbs / defaultServings) * 10) / 10,
    fat: Math.round((totals.fat / defaultServings) * 10) / 10,
    fiber: totals.fiber !== null ? Math.round((totals.fiber / defaultServings) * 10) / 10 : null,
    sodium: totals.sodium !== null ? Math.round((totals.sodium / defaultServings) * 10) / 10 : null,
  };

  // Se finishedWeightG è valorizzato (peso cotto), i valori su 100g usano quello; altrimenti peso crudo
  const referenceWeightFor100g = finishedWeightG ?? (totalRawWeightG > 0 ? totalRawWeightG : 100);
  const factor100g = 100 / referenceWeightFor100g;

  const per100g = {
    calories: Math.round(totals.calories * factor100g),
    protein: Math.round(totals.protein * factor100g * 10) / 10,
    carbs: Math.round(totals.carbs * factor100g * 10) / 10,
    fat: Math.round(totals.fat * factor100g * 10) / 10,
    fiber: totals.fiber !== null ? Math.round(totals.fiber * factor100g * 10) / 10 : null,
    sodium: totals.sodium !== null ? Math.round(totals.sodium * factor100g * 10) / 10 : null,
  };

  const isRawWeightNotice = finishedWeightG === null;
  const noticeMessage = isRawWeightNotice
    ? 'Valori nutrizionali su 100g calcolati sul peso a crudo. Specifica il peso cotto finito per valori su 100g del piatto pronto.'
    : undefined;

  return {
    totalWeightG: Math.round(totalRawWeightG * 10) / 10,
    finishedWeightG,
    defaultServings,
    isRawWeightNotice,
    noticeMessage,
    ingredients: calculatedIngredients,
    totals,
    perServing,
    per100g,
  };
}

export type RecipePortionType = 'SERVING' | 'FRACTION' | 'GRAMS';

/**
 * Calcola i macronutrienti per la porzione di ricetta consumata dall'utente.
 */
export function calculatePortionSnapshot(params: {
  recipeCalculation: RecipeCalculationResult;
  portionType: RecipePortionType;
  portionValue: number; // es. 1 per porzione, 0.25 per 25%, oppure 150 per grammi
}): {
  portionRatio: number;
  consumedGrams: number;
  snapshot: {
    caloriesConsumed: number;
    proteinConsumed: number;
    carbsConsumed: number;
    fatConsumed: number;
    fiberConsumed: number | null;
  };
} {
  const { recipeCalculation, portionType, portionValue } = params;
  const value = Math.max(0, portionValue);
  let ratio = 0;
  let consumedGrams = 0;

  if (portionType === 'SERVING') {
    // value = numero di porzioni
    ratio = value / recipeCalculation.defaultServings;
    consumedGrams = (recipeCalculation.finishedWeightG ?? recipeCalculation.totalWeightG) * ratio;
  } else if (portionType === 'FRACTION') {
    // value = frazione (es. 0.5 per metà ricetta)
    ratio = value;
    consumedGrams = (recipeCalculation.finishedWeightG ?? recipeCalculation.totalWeightG) * ratio;
  } else if (portionType === 'GRAMS') {
    // value = peso in grammi
    if (!recipeCalculation.finishedWeightG) {
      throw new Error(
        'Il log in grammi è consentito solo per ricette con peso finito cotto specificato (finishedWeightG).'
      );
    }
    ratio = value / recipeCalculation.finishedWeightG;
    consumedGrams = value;
  }

  const totals = recipeCalculation.totals;
  return {
    portionRatio: Math.round(ratio * 1000) / 1000,
    consumedGrams: Math.round(consumedGrams * 10) / 10,
    snapshot: {
      caloriesConsumed: Math.round(totals.calories * ratio),
      proteinConsumed: Math.round(totals.protein * ratio * 10) / 10,
      carbsConsumed: Math.round(totals.carbs * ratio * 10) / 10,
      fatConsumed: Math.round(totals.fat * ratio * 10) / 10,
      fiberConsumed: totals.fiber !== null ? Math.round(totals.fiber * ratio * 10) / 10 : null,
    },
  };
}

