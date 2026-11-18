'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Utensils,
  BookOpen,
  Plus,
  CheckCircle2,
  Flame,
  Loader2,
  Scale,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface AdvancedFastCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

interface PreloadedRecipe {
  id: string;
  name: string;
  servingName: string;
  defaultGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

const PRELOADED_RECIPES: PreloadedRecipe[] = [
  {
    id: 'rec-1',
    name: 'Crepes Proteiche (Albumi & Farina d\'Avena)',
    servingName: 'porzione (3 crepes)',
    defaultGrams: 200,
    calories: 280,
    protein: 32,
    carbs: 30,
    fat: 4,
    category: 'Colazione / Snack',
  },
  {
    id: 'rec-2',
    name: 'Porridge Proteico Avena & Whey',
    servingName: 'ciotola (80g avena + 30g whey)',
    defaultGrams: 250,
    calories: 360,
    protein: 30,
    carbs: 45,
    fat: 6,
    category: 'Colazione',
  },
  {
    id: 'rec-3',
    name: 'Riso Basmati, Petto di Pollo & Olio EVO',
    servingName: 'piatto bilanciato (100g riso + 150g pollo)',
    defaultGrams: 350,
    calories: 490,
    protein: 45,
    carbs: 60,
    fat: 8,
    category: 'Pranzo / Cena',
  },
  {
    id: 'rec-4',
    name: 'Pancake di Albumi, Banana & Avena',
    servingName: 'stack (4 pancake medi)',
    defaultGrams: 220,
    calories: 320,
    protein: 26,
    carbs: 48,
    fat: 3,
    category: 'Colazione / Snack',
  },
  {
    id: 'rec-5',
    name: 'Shaker Post-Workout (Whey Isolate & Carbo)',
    servingName: 'shaker (30g whey + 30g maltodestrine)',
    defaultGrams: 300,
    calories: 240,
    protein: 30,
    carbs: 28,
    fat: 1,
    category: 'Post-Workout',
  },
  {
    id: 'rec-6',
    name: 'Omelette 3 Uova & Spinaci Freschi',
    servingName: 'omelette (3 uova intere + 100g spinaci)',
    defaultGrams: 250,
    calories: 260,
    protein: 22,
    carbs: 3,
    fat: 18,
    category: 'Pranzo / Cena',
  },
];

export function AdvancedFastCaptureModal({
  isOpen,
  onClose,
  onSuccess,
}: AdvancedFastCaptureModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'search' | 'recipes'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any | null>(null);

  // Servings and calculations
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('LUNCH');
  const [quantityG, setQuantityG] = useState<number>(100);
  const [servingsCount, setServingsCount] = useState<number>(1);
  const [selectedRecipe, setSelectedRecipe] = useState<PreloadedRecipe | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounced live search
  useEffect(() => {
    if (!searchQuery.trim() || activeTab !== 'search') {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get(`/nutrition/food/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data?.data || res.data || []);
      } catch (err) {
        console.warn('Errore ricerca alimenti:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  if (!isOpen) return null;

  // Calcolo dinamico macro
  let currentCalories = 0;
  let currentProtein = 0;
  let currentCarbs = 0;
  let currentFat = 0;

  if (activeTab === 'search' && selectedFood) {
    const ratio = quantityG / 100;
    currentCalories = Math.round((selectedFood.calories100g || 0) * ratio);
    currentProtein = Number(((selectedFood.protein100g || 0) * ratio).toFixed(1));
    currentCarbs = Number(((selectedFood.carbs100g || 0) * ratio).toFixed(1));
    currentFat = Number(((selectedFood.fat100g || 0) * ratio).toFixed(1));
  } else if (activeTab === 'recipes' && selectedRecipe) {
    currentCalories = Math.round(selectedRecipe.calories * servingsCount);
    currentProtein = Number((selectedRecipe.protein * servingsCount).toFixed(1));
    currentCarbs = Number((selectedRecipe.carbs * servingsCount).toFixed(1));
    currentFat = Number((selectedRecipe.fat * servingsCount).toFixed(1));
  }

  const handleCommit = async () => {
    if (activeTab === 'search' && !selectedFood) {
      setErrorMsg('Seleziona un alimento dal database prima di salvare.');
      return;
    }
    if (activeTab === 'recipes' && !selectedRecipe) {
      setErrorMsg('Seleziona una ricetta o pasto prima di salvare.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: Record<string, any> = {
        loggedAt: new Date().toISOString(),
        mealType,
      };

      if (activeTab === 'search' && selectedFood) {
        payload.foodItemId = selectedFood.id;
        payload.customFoodName = selectedFood.name;
        payload.quantityG = Number(quantityG);
        payload.caloriesConsumed = currentCalories;
        payload.proteinConsumed = currentProtein;
        payload.carbsConsumed = currentCarbs;
        payload.fatConsumed = currentFat;
      } else if (activeTab === 'recipes' && selectedRecipe) {
        payload.customFoodName = `${selectedRecipe.name} (${servingsCount} ${selectedRecipe.servingName})`;
        payload.quantityG = Math.round(selectedRecipe.defaultGrams * servingsCount);
        payload.caloriesConsumed = currentCalories;
        payload.proteinConsumed = currentProtein;
        payload.carbsConsumed = currentCarbs;
        payload.fatConsumed = currentFat;
      }

      await apiClient.post('/nutrition/logs', payload);

      // Invalida query TanStack per aggiornare istantaneamente la dashboard
      queryClient.invalidateQueries({ queryKey: ['telemetry', 'nutrition'] });

      const name = payload.customFoodName || 'Pasto';
      if (onSuccess) {
        onSuccess(`${name} registrato (+${currentCalories} kcal)`);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Errore durante la registrazione del pasto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-body-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface-container-low border border-outline-variant/30 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">Advanced Fast Capture</h2>
              <p className="text-xs text-outline font-mono">
                Registrazione Rapida &amp; Calcolatore Dinamico Macro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-surface-container-high/40 bg-surface-container-lowest/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('search');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <Search className="w-4 h-4" />
            Ricerca Database Alimenti
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('recipes');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'recipes'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Ricette &amp; Pasti Personalizzati ({PRELOADED_RECIPES.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {/* Pasto di destinazione */}
          <div>
            <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2 font-mono">
              &gt; DESTINATION_MEAL
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'BREAKFAST', label: 'Colazione' },
                { id: 'LUNCH', label: 'Pranzo' },
                { id: 'DINNER', label: 'Cena' },
                { id: 'SNACK', label: 'Spuntino' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMealType(m.id as any)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                    mealType === m.id
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-surface-container-high bg-surface-container text-outline hover:text-on-surface'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'search' ? (
            /* TAB 1: SEARCH */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2 font-mono">
                  &gt; SEARCH_FOOD_DATABASE
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Es. Fiocchi di avena, petto di pollo, riso..."
                    className="w-full bg-surface-container rounded-lg pl-9 pr-4 py-2.5 text-xs text-on-surface border border-surface-container-high focus:outline-none focus:border-primary font-mono"
                  />
                  <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 text-primary absolute right-3 top-3 animate-spin" />
                  )}
                </div>
              </div>

              {/* Risultati di ricerca */}
              {searchResults.length > 0 && (
                <div className="border border-surface-container-high rounded-xl max-h-48 overflow-y-auto divide-y divide-surface-container-high/40 bg-surface-container-lowest/80">
                  {searchResults.map((food) => (
                    <div
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedFood?.id === food.id
                          ? 'bg-primary/10 border-l-4 border-primary'
                          : 'hover:bg-surface-container'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-on-surface">{food.name}</div>
                        <div className="text-[11px] text-outline font-mono">
                          {food.calories100g} kcal/100g • P: {food.protein100g}g • C: {food.carbs100g}g • F: {food.fat100g}g
                        </div>
                      </div>
                      {selectedFood?.id === food.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quantità in Grammi */}
              {selectedFood && (
                <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">
                      Quantità Selezionata ({selectedFood.name}):
                    </span>
                    <div className="flex items-center gap-2">
                      {[50, 100, 150, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantityG(preset)}
                          className="px-2 py-0.5 rounded bg-surface-container-high text-[10px] font-mono text-outline hover:text-on-surface"
                        >
                          {preset}g
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      value={quantityG}
                      onChange={(e) => setQuantityG(Math.max(1, Number(e.target.value)))}
                      className="w-32 bg-surface-container-lowest rounded-lg px-3 py-2 text-sm font-bold text-on-surface border border-surface-container-high focus:outline-none focus:border-primary font-mono text-center"
                    />
                    <span className="text-xs font-mono text-outline">grammi</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: RECIPES */
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2 font-mono">
                &gt; SELECT_CUSTOM_RECIPE
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {PRELOADED_RECIPES.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      selectedRecipe?.id === recipe.id
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                        : 'border-surface-container-high bg-surface-container hover:bg-surface-container-high'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] uppercase font-mono text-primary font-semibold mb-1">
                        {recipe.category}
                      </div>
                      <div className="text-xs font-bold text-on-surface mb-1">
                        {recipe.name}
                      </div>
                      <div className="text-[11px] text-outline">
                        1 {recipe.servingName}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-surface-container-high/40 text-[11px] font-mono text-outline">
                      {recipe.calories} kcal • P: {recipe.protein}g • C: {recipe.carbs}g • F: {recipe.fat}g
                    </div>
                  </div>
                ))}
              </div>

              {/* Numero Porzioni */}
              {selectedRecipe && (
                <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">
                      Numero Porzioni ({selectedRecipe.name}):
                    </span>
                    <div className="flex items-center gap-2">
                      {[0.5, 1, 1.5, 2].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setServingsCount(p)}
                          className="px-2 py-0.5 rounded bg-surface-container-high text-[10px] font-mono text-outline hover:text-on-surface"
                        >
                          {p}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      max={10}
                      value={servingsCount}
                      onChange={(e) => setServingsCount(Math.max(0.1, Number(e.target.value)))}
                      className="w-32 bg-surface-container-lowest rounded-lg px-3 py-2 text-sm font-bold text-on-surface border border-surface-container-high focus:outline-none focus:border-primary font-mono text-center"
                    />
                    <span className="text-xs font-mono text-outline">
                      porzioni ({Math.round(selectedRecipe.defaultGrams * servingsCount)}g circa)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Calcolatore Dinamico Macro Live Preview */}
          {(selectedFood || selectedRecipe) && (
            <div className="rounded-xl bg-surface-container-lowest p-4 border border-primary/30 shadow-inner space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-outline">
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <Flame className="w-4 h-4 animate-pulse" />
                  TOTALI NUTRIZIONALI CALCOLATI:
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {currentCalories} kcal
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high/40 text-center font-mono">
                <div className="bg-surface-container p-2 rounded-lg">
                  <div className="text-[10px] uppercase text-outline">Proteine</div>
                  <div className="text-xs font-bold text-primary">{currentProtein} g</div>
                </div>
                <div className="bg-surface-container p-2 rounded-lg">
                  <div className="text-[10px] uppercase text-outline">Carboidrati</div>
                  <div className="text-xs font-bold text-secondary">{currentCarbs} g</div>
                </div>
                <div className="bg-surface-container p-2 rounded-lg">
                  <div className="text-[10px] uppercase text-outline">Grassi</div>
                  <div className="text-xs font-bold text-tertiary">{currentFat} g</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-container-high/40 bg-surface-container-lowest/80 flex items-center justify-between">
          <span className="text-[11px] text-outline font-mono">
            Salvataggio atomico su PostgreSQL 17
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-outline hover:text-on-surface transition"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={submitting || (!selectedFood && !selectedRecipe)}
              className={`px-5 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition shadow-md ${
                (selectedFood || selectedRecipe) && !submitting
                  ? 'bg-primary hover:bg-primary/90 text-black shadow-primary/20 cursor-pointer active:scale-95'
                  : 'bg-surface-container-high text-outline cursor-not-allowed opacity-50'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>[LOGGING...]</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>REGISTRA NEL DIARIO</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

