import { describe, it, expect } from 'vitest';
import {
  calculateAge,
  calculateNutritionalTargets,
  calculateDailyCalorieBalance,
  calculateDailyFiberSummary,
  calculateRecipeNutrition,
  calculatePortionSnapshot,
  PHYSIOLOGICAL_LIMITS,
} from '@harukaizen/shared';

describe('Conta Calorie PURO — Shared Engine Spec', () => {
  describe('1. Calcolo Età e Sicurezza Fisiologica', () => {
    it('calcola correttamente l\'età da una data di nascita', () => {
      const ref = new Date('2026-11-17');
      const birthAdult = new Date('1996-05-10'); // 30 anni
      const birthMinor = new Date('2010-01-01'); // 16 anni
      expect(calculateAge(birthAdult, ref)).toBe(30);
      expect(calculateAge(birthMinor, ref)).toBe(16);
    });

    it('blocca la modalità AUTO se la data di nascita è assente o non valida', () => {
      const res = calculateNutritionalTargets({
        weightKg: 75,
        heightCm: 178,
        sex: 'M',
        birthDate: null,
        targetMode: 'AUTO',
      });

      expect(res.isAgeKnown).toBe(false);
      expect(res.canAutoCalculate).toBe(false);
      expect(res.targetMode).toBe('MANUAL');
      expect(res.advisoryWarnings.length).toBeGreaterThan(0);
    });

    it('blocca la modalità AUTO e fornisce disclaimer medico per utenti minorenni (<18)', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 16); // 16 anni

      const res = calculateNutritionalTargets({
        weightKg: 65,
        heightCm: 172,
        sex: 'M',
        birthDate,
        targetMode: 'AUTO',
        goalType: 'CUT',
      });

      expect(res.isUnderage).toBe(true);
      expect(res.isSpecialGroup).toBe(true);
      expect(res.canAutoCalculate).toBe(false);
      expect(res.targetMode).toBe('MANUAL');
      expect(res.clinicalDisclaimer).toBeDefined();
    });

    it('blocca la modalità AUTO e fornisce disclaimer medico per gravidanza e allattamento', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 28);

      const resPreg = calculateNutritionalTargets({
        weightKg: 65,
        heightCm: 165,
        sex: 'F',
        birthDate,
        isPregnant: true,
        targetMode: 'AUTO',
      });

      expect(resPreg.isSpecialGroup).toBe(true);
      expect(resPreg.targetMode).toBe('MANUAL');
      expect(resPreg.clinicalDisclaimer).toBeDefined();

      const resLact = calculateNutritionalTargets({
        weightKg: 65,
        heightCm: 165,
        sex: 'F',
        birthDate,
        isLactating: true,
        targetMode: 'AUTO',
      });

      expect(resLact.isSpecialGroup).toBe(true);
      expect(resLact.targetMode).toBe('MANUAL');
    });

    it('applica il pavimento calorico di sicurezza (1200 F / 1500 M) con avviso motivazionale', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 40);

      // Donna con peso molto basso e deficit severo (teorico < 1200 kcal)
      const resFemale = calculateNutritionalTargets({
        weightKg: 42,
        heightCm: 150,
        sex: 'F',
        birthDate,
        lifestyleMultiplier: 1.1,
        deficitPct: 25,
        goalType: 'CUT',
      });

      expect(resFemale.targetCalories).toBe(PHYSIOLOGICAL_LIMITS.MIN_CALORIC_FLOOR_FEMALE);
      expect(resFemale.floorAdjustmentApplied).toBe(true);
      expect(resFemale.floorAdjustmentMessage).toContain('pavimento minimo');

      // Uomo con teorico < 1500 kcal
      const resMale = calculateNutritionalTargets({
        weightKg: 48,
        heightCm: 155,
        sex: 'M',
        birthDate,
        lifestyleMultiplier: 1.1,
        deficitPct: 25,
        goalType: 'CUT',
      });

      expect(resMale.targetCalories).toBe(PHYSIOLOGICAL_LIMITS.MIN_CALORIC_FLOOR_MALE);
      expect(resMale.floorAdjustmentApplied).toBe(true);
    });

    it('segnala avviso consultivo in MANUAL se i grassi sono sotto 0.6 g/kg', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25);

      const res = calculateNutritionalTargets({
        weightKg: 80,
        heightCm: 180,
        sex: 'M',
        birthDate,
        targetMode: 'MANUAL',
        manualTargets: {
          targetCalories: 2000,
          targetFatG: 30, // 30g / 80kg = 0.375 g/kg (< 0.6)
        },
      });

      expect(res.advisoryWarnings.some((w) => w.includes('inferiore al minimo raccomandato'))).toBe(true);
    });

    it('in modalità AUTO riduce prima le proteine verso 1.6 g/kg per garantire 30g di carboidrati (soglia pratica)', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 30);

      // Donna 70kg, deficit restrittivo (es. floor 1200 kcal)
      // Con proteinPerKg = 2.0 (140g = 560 kcal) e grassi minimi (70 * 0.6 = 42g = 378 kcal), totale = 938 kcal.
      // Per avere 30g carb (120 kcal) servono 1058 kcal.
      // Se aumentiamo il peso a 75kg: grassi min 45g (405 kcal), proteine a 2.0 = 150g (600 kcal) -> 1005 kcal.
      // Carbs residui a 1200 kcal = (1200 - 1005) / 4 = 48g.
      // Ma per 85kg donna:
      // minFat = 85 * 0.6 = 51g (459 kcal).
      // Initial protein a 2.0 = 170g (680 kcal).
      // Totale usato = 1139 kcal.
      // Carbs residui = (1200 - 1139) / 4 = 15g (< 30g).
      // Il motore deve scalare le proteine verso 1.6 g/kg (85 * 1.6 = 136g) prima di forzare il clamp!
      const res = calculateNutritionalTargets({
        weightKg: 85,
        heightCm: 160,
        sex: 'F',
        birthDate,
        lifestyleMultiplier: 1.0,
        deficitPct: 25,
        goalType: 'CUT',
        proteinPerKg: 2.0,
      });

      // Il target deve essere il floor (1200 kcal)
      expect(res.targetCalories).toBe(PHYSIOLOGICAL_LIMITS.MIN_CALORIC_FLOOR_FEMALE);
      // Le proteine devono essere state scalate verso il basso rispetto a 170g
      expect(res.targetProteinG).toBeLessThan(170);
      expect(res.targetProteinG).toBeGreaterThanOrEqual(Math.round(85 * PHYSIOLOGICAL_LIMITS.PROTEIN_MIN_G_KG));
      // I carboidrati devono essere pari a 30g (soglia pratica minima)
      expect(res.targetCarbsG).toBe(30);
      // Avviso motivazionale presente che menziona la soglia pratica
      expect(res.advisoryWarnings.some((w) => w.includes('soglia pratica'))).toBe(true);
    });
  });

  describe('2. Bilancio Energetico e Prevenzione Doppio Conteggio', () => {
    it('in modalità SIMPLE esclude rigorosamente le calorie bruciate dal bilancio netto e dal target', () => {
      // Base TDEE = 2200, Target = 2000, Mangiate = 1900, Bruciate = 600
      const res = calculateDailyCalorieBalance({
        targetCalories: 2000,
        baseTdee: 2200,
        eatenCalories: 1900,
        burnedCalories: 600,
        calorieBalanceMode: 'SIMPLE',
      });

      expect(res.mode).toBe('SIMPLE');
      expect(res.effectiveTargetCalories).toBe(2000);
      expect(res.remainingCalories).toBe(100);
      // Bilancio netto = Mangiate (1900) - TDEE base (2200) = -300 kcal (NON sottrae le 600 bruciate)
      expect(res.netEstimatedBalance).toBe(-300);
    });

    it('in modalità ACTIVE include le calorie recuperate nel target e sottrae bruciate nel netto', () => {
      // Base TDEE = 2000, Target = 2000, Mangiate = 2200, Bruciate = 600, recoveryPct = 50%
      const res = calculateDailyCalorieBalance({
        targetCalories: 2000,
        baseTdee: 2000,
        eatenCalories: 2200,
        burnedCalories: 600,
        calorieBalanceMode: 'ACTIVE',
        burnedCalorieRecoveryPct: 50,
      });

      expect(res.mode).toBe('ACTIVE');
      // Recuperate = 600 * 50% = 300 kcal
      expect(res.recoveredBurnedCalories).toBe(300);
      expect(res.effectiveTargetCalories).toBe(2300);
      expect(res.remainingCalories).toBe(100); // 2300 - 2200
      // Bilancio netto = Mangiate (2200) - (TDEE base 2000 + Bruciate 600) = 2200 - 2600 = -400 kcal
      expect(res.netEstimatedBalance).toBe(-400);
    });

    it('nasconde rigorosamente il bilancio netto per gruppi speciali (minori, gravidanza, allattamento)', () => {
      const res = calculateDailyCalorieBalance({
        targetCalories: 2200,
        baseTdee: 2200,
        eatenCalories: 2000,
        burnedCalories: 400,
        isSpecialGroup: true,
      });

      expect(res.isBalanceHidden).toBe(true);
      expect(res.netEstimatedBalance).toBeNull();
    });
  });

  describe('3. Gestione Fibre e Completezza Dati (n.d.)', () => {
    it('mostra n.d. e segnala incompletezza se almeno un alimento ha fibre nulle', () => {
      const summary = calculateDailyFiberSummary({
        logs: [
          { fiberConsumed: 8.5 },
          { fiberConsumed: null }, // Manca dato
          { fiberConsumed: 12.0 },
        ],
      });

      expect(summary.isFiberIncomplete).toBe(true);
      expect(summary.totalFiberG).toBeNull();
      expect(summary.displayValue).toBe('n.d.');
      expect(summary.note).toContain('Totale fibre parziale');
    });

    it('mostra il totale numerico esatto se tutti i log contengono fibre', () => {
      const summary = calculateDailyFiberSummary({
        logs: [
          { fiberConsumed: 8.5 },
          { fiberConsumed: 4.2 },
          { fiberConsumed: 12.3 },
        ],
      });

      expect(summary.isFiberIncomplete).toBe(false);
      expect(summary.totalFiberG).toBe(25.0);
      expect(summary.displayValue).toBe('25g');
      expect(summary.note).toBeUndefined();
    });
  });

  describe('4. Ricette Custom, Conversioni e Snapshot', () => {
    const ingredients = [
      {
        foodItemId: 'item-1',
        foodItemName: 'Pasta',
        quantity: 100,
        unit: 'g',
        calories100g: 350,
        protein100g: 12,
        carbs100g: 72,
        fat100g: 1.5,
        fiber100g: 3.0,
      },
      {
        foodItemId: 'item-2',
        foodItemName: 'Olio EVO',
        quantity: 10,
        unit: 'ml',
        densityGPerMl: 0.92, // 10ml = 9.2g
        calories100g: 884,
        protein100g: 0,
        carbs100g: 0,
        fat100g: 100,
        fiber100g: 0,
      },
      {
        foodItemId: 'item-3',
        foodItemName: 'Uova',
        quantity: 2,
        unit: 'serving',
        servingSizeG: 55, // 2 serving = 110g
        calories100g: 143,
        protein100g: 13,
        carbs100g: 1,
        fat100g: 10,
        fiber100g: 0,
      },
    ];

    it('converte correttamente unità (g, ml con densità, serving) e calcola totali', () => {
      const recipe = calculateRecipeNutrition({
        ingredients,
        defaultServings: 2,
        finishedWeightG: 300, // Cotto
      });

      // Peso crudo = 100g (pasta) + 9.2g (olio) + 110g (uova) = 219.2g
      expect(recipe.totalWeightG).toBe(219.2);
      expect(recipe.finishedWeightG).toBe(300);
      expect(recipe.isRawWeightNotice).toBe(false);

      // Kcal pasta: 350, Olio: 884 * 0.092 = 81.3, Uova: 143 * 1.1 = 157.3. Totale: ~589
      expect(recipe.totals.calories).toBeGreaterThan(580);
      expect(recipe.totals.calories).toBeLessThan(600);

      // Valori per porzione (defaultServings: 2)
      expect(recipe.perServing.calories).toBe(Math.round(recipe.totals.calories / 2));

      // Valori su 100g cotti (finishedWeightG: 300)
      expect(recipe.per100g.calories).toBe(Math.round((recipe.totals.calories / 300) * 100));
    });

    it('mostra il badge avviso peso a crudo se finishedWeightG è assente', () => {
      const recipe = calculateRecipeNutrition({
        ingredients,
        defaultServings: 1,
        finishedWeightG: null,
      });

      expect(recipe.isRawWeightNotice).toBe(true);
      expect(recipe.noticeMessage).toContain('peso a crudo');
    });

    it('calcola snapshot porzione in SERVING, FRACTION e GRAMS', () => {
      const recipe = calculateRecipeNutrition({
        ingredients,
        defaultServings: 2,
        finishedWeightG: 300,
      });

      // 1 porzione (50% ricetta)
      const portServing = calculatePortionSnapshot({
        recipeCalculation: recipe,
        portionType: 'SERVING',
        portionValue: 1,
      });
      expect(portServing.portionRatio).toBe(0.5);
      expect(portServing.snapshot.caloriesConsumed).toBe(Math.round(recipe.totals.calories * 0.5));

      // 25% ricetta
      const portFraction = calculatePortionSnapshot({
        recipeCalculation: recipe,
        portionType: 'FRACTION',
        portionValue: 0.25,
      });
      expect(portFraction.portionRatio).toBe(0.25);

      // 150g (metà peso cotto)
      const portGrams = calculatePortionSnapshot({
        recipeCalculation: recipe,
        portionType: 'GRAMS',
        portionValue: 150,
      });
      expect(portGrams.portionRatio).toBe(0.5);
    });

    it('solleva errore se si logga in grammi senza finishedWeightG', () => {
      const recipe = calculateRecipeNutrition({
        ingredients,
        defaultServings: 2,
        finishedWeightG: null,
      });

      expect(() =>
        calculatePortionSnapshot({
          recipeCalculation: recipe,
          portionType: 'GRAMS',
          portionValue: 150,
        })
      ).toThrow('Il log in grammi è consentito solo per ricette con peso finito cotto specificato');
    });
  });
});

