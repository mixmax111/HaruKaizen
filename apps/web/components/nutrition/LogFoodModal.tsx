'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Loader2,
  Edit2,
  Check,
  RotateCcw,
  BookOpen,
  Apple,
  SlidersHorizontal,
} from 'lucide-react';
import { apiClient } from '../../lib/api';

interface LogFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealSlots: Array<{ id: string; name: string }>;
  defaultMealSlotId?: string;
  onSuccess: () => void;
}

export function LogFoodModal({
  isOpen,
  onClose,
  mealSlots,
  defaultMealSlotId,
  onSuccess,
}: LogFoodModalProps) {
  const [activeTab, setActiveTab] = useState<'FOOD' | 'RECIPES'>('FOOD');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [userRecipes, setUserRecipes] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    defaultMealSlotId || (mealSlots[0]?.id ?? '')
  );

  // Form stati per alimento singolo
  const [quantityG, setQuantityG] = useState<number>(100);

  // Form stati per ricetta
  const [recipeMode, setRecipeMode] = useState<'SINGLE_ITEM' | 'EXPLODED'>('SINGLE_ITEM');
  const [portionType, setPortionType] = useState<'SERVING' | 'FRACTION' | 'GRAMS'>('SERVING');
  const [portionValue, setPortionValue] = useState<number>(1);

  // CoW edit mode
  const [isEditingCow, setIsEditingCow] = useState(false);
  const [editCalories, setEditCalories] = useState<number>(0);
  const [editProtein, setEditProtein] = useState<number>(0);
  const [editCarbs, setEditCarbs] = useState<number>(0);
  const [editFat, setEditFat] = useState<number>(0);
  const [editFiber, setEditFiber] = useState<number | ''>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica le ricette dell'utente quando si apre la tab Ricette
  useEffect(() => {
    if (activeTab === 'RECIPES' && isOpen) {
      apiClient.get('/nutrition/recipes')
        .then((res) => setUserRecipes(res.data || []))
        .catch(() => {});
    }
  }, [activeTab, isOpen]);

  // Debounced search per alimenti (350ms)
  useEffect(() => {
    if (activeTab !== 'FOOD') return;
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get(`/food/search?q=${encodeURIComponent(query)}`);
        setSearchResults(res.data.data || res.data || []);
      } catch (err) {
        // Ignore search errors
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  if (!isOpen) return null;

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setIsEditingCow(false);
    if (activeTab === 'FOOD') {
      setEditCalories(item.calories100g ?? item.kcalPer100g ?? 0);
      setEditProtein(item.protein100g ?? item.proteinPer100g ?? 0);
      setEditCarbs(item.carbs100g ?? item.carbsPer100g ?? 0);
      setEditFat(item.fat100g ?? item.fatPer100g ?? 0);
      setEditFiber(item.fiber100g ?? item.fiberPer100g ?? '');
    }
  };

  const handleApplyCow = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.put(`/food/${selectedItem.id}/cow`, {
        calories100g: Number(editCalories),
        protein100g: Number(editProtein),
        carbs100g: Number(editCarbs),
        fat100g: Number(editFat),
        fiber100g: editFiber !== '' ? Number(editFiber) : null,
      });
      const updated = res.data;
      setSelectedItem(updated);
      setIsEditingCow(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore salvataggio modifica alimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLog = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (activeTab === 'FOOD') {
        await apiClient.post('/nutrition/logs', {
          entryType: 'FOOD_ITEM',
          foodItemId: selectedItem.id,
          mealSlotId: selectedSlotId || undefined,
          quantityG: Number(quantityG),
          loggedAt: new Date().toISOString(),
        });
      } else {
        await apiClient.post('/nutrition/recipes/log', {
          recipeId: selectedItem.id,
          mealSlotId: selectedSlotId || undefined,
          portionType,
          portionValue: Number(portionValue),
          mode: recipeMode,
          loggedAt: new Date().toISOString(),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la registrazione nel diario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl max-h-[90vh] bg-[#131b26] border border-[#1f2b3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('FOOD');
                setSelectedItem(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'FOOD'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Apple size={15} /> Alimenti ({searchResults.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('RECIPES');
                setSelectedItem(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'RECIPES'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen size={15} /> Ricette ({userRecipes.length})
            </button>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Ricerca per alimenti */}
        {activeTab === 'FOOD' && (
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Cerca alimento (OFF v3, USDA, o database locale)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
            />
            {isSearching && (
              <Loader2 size={16} className="absolute right-3.5 top-3 animate-spin text-pink-400" />
            )}
          </div>
        )}

        {/* Lista Risultati Alimenti */}
        {activeTab === 'FOOD' && !selectedItem && (
          <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 max-h-56 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleSelectItem(food)}
                  className="p-3 text-xs flex justify-between items-center cursor-pointer hover:bg-slate-800/40 transition"
                >
                  <div>
                    <span className="font-medium text-slate-200">{food.name}</span>
                    {food.isUserEdited && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">
                        Modificato
                      </span>
                    )}
                    <p className="text-[10px] text-slate-500 mt-0.5">{food.brand || food.source || 'Database'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-pink-400">{food.calories100g ?? food.kcalPer100g} kcal</span>
                    <p className="text-[10px] text-slate-500">per 100g</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                {query.length > 1 ? 'Nessun alimento trovato.' : 'Digita almeno 2 caratteri per cercare.'}
              </div>
            )}
          </div>
        )}

        {/* Lista Ricette */}
        {activeTab === 'RECIPES' && !selectedItem && (
          <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 max-h-56 overflow-y-auto">
            {userRecipes.length > 0 ? (
              userRecipes.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => handleSelectItem(rec)}
                  className="p-3 text-xs flex justify-between items-center cursor-pointer hover:bg-slate-800/40 transition"
                >
                  <div>
                    <span className="font-medium text-slate-200">{rec.name}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {rec.defaultServings} {rec.defaultServings === 1 ? 'porzione' : 'porzioni'} •{' '}
                      {rec.ingredients?.length || 0} ingredienti
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-pink-400">
                      {Math.round(rec.perServing?.calories ?? rec.per100g?.calories ?? 0)} kcal
                    </span>
                    <p className="text-[10px] text-slate-500">/ porzione</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                Nessuna ricetta creata. Crea una ricetta con il pulsante "Nuova Ricetta".
              </div>
            )}
          </div>
        )}

        {/* Dettagli Alimento Selezionato e Configurazione Log */}
        {selectedItem && activeTab === 'FOOD' && (
          <div className="bg-[#0b0f17] border border-pink-500/30 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-pink-400">{selectedItem.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pro: {selectedItem.protein100g ?? selectedItem.proteinPer100g}g • Carb:{' '}
                  {selectedItem.carbs100g ?? selectedItem.carbsPer100g}g • Fat:{' '}
                  {selectedItem.fat100g ?? selectedItem.fatPer100g}g (per 100g)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCow(!isEditingCow)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <Edit2 size={12} /> Personalizza Valori
              </button>
            </div>

            {/* Inline Editor Copy-on-Write */}
            {isEditingCow && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-amber-300">
                  Modifica Nutrienti (Crea una copia personale dell'alimento)
                </span>
                <div className="grid grid-cols-5 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400">Kcal</label>
                    <input
                      type="number"
                      value={editCalories}
                      onChange={(e) => setEditCalories(Number(e.target.value))}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded p-1 text-center text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Pro</label>
                    <input
                      type="number"
                      value={editProtein}
                      onChange={(e) => setEditProtein(Number(e.target.value))}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded p-1 text-center text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Carb</label>
                    <input
                      type="number"
                      value={editCarbs}
                      onChange={(e) => setEditCarbs(Number(e.target.value))}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded p-1 text-center text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Fat</label>
                    <input
                      type="number"
                      value={editFat}
                      onChange={(e) => setEditFat(Number(e.target.value))}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded p-1 text-center text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Fibre</label>
                    <input
                      type="number"
                      value={editFiber}
                      onChange={(e) => setEditFiber(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded p-1 text-center text-slate-100"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyCow}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs transition"
                >
                  Salva Copia Personale
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Grammi consumati</label>
                <input
                  type="number"
                  min="1"
                  value={quantityG}
                  onChange={(e) => setQuantityG(Number(e.target.value))}
                  className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Slot Pasto</label>
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {mealSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Dettagli Ricetta Selezionata e Configurazione Log */}
        {selectedItem && activeTab === 'RECIPES' && (
          <div className="bg-[#0b0f17] border border-pink-500/30 p-4 rounded-xl flex flex-col gap-3 text-xs">
            <div>
              <h4 className="text-sm font-bold text-pink-400">{selectedItem.name}</h4>
              <p className="text-slate-400 mt-0.5">
                Valori per porzione:{' '}
                <b className="text-pink-300">{Math.round(selectedItem.perServing?.calories ?? 0)} kcal</b> (P:{' '}
                {selectedItem.perServing?.protein}g • C: {selectedItem.perServing?.carbs}g • F:{' '}
                {selectedItem.perServing?.fat}g)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Modalità di Tracciamento</label>
                <select
                  value={recipeMode}
                  onChange={(e) => setRecipeMode(e.target.value as any)}
                  className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="SINGLE_ITEM">Voce Singola (Snapshot immutabile)</option>
                  <option value="EXPLODED">Esplosa (Registra singoli ingredienti)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tipo Quantità</label>
                <select
                  value={portionType}
                  onChange={(e) => setPortionType(e.target.value as any)}
                  className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="SERVING">Numero Porzioni</option>
                  <option value="FRACTION">Frazione Ricetta (es. 0.5)</option>
                  {selectedItem.finishedWeightG && <option value="GRAMS">Grammi peso cotto</option>}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Valore Quantità</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={portionValue}
                  onChange={(e) => setPortionValue(Number(e.target.value))}
                  className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Slot Pasto</label>
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200"
                >
                  {mealSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
          {selectedItem ? (
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ← Torna alla lista
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
            >
              Annulla
            </button>
            {selectedItem && (
              <button
                type="button"
                onClick={handleLog}
                disabled={isSubmitting}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Registra nel Diario
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

