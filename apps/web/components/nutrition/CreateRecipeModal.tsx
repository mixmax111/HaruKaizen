'use client';

import React, { useState } from 'react';
import { X, ChefHat, Plus, Trash2, Loader2, AlertCircle, Search } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface IngredientRow {
  foodItemId?: string;
  name: string;
  quantity: number;
  unit: 'g' | 'ml' | 'serving' | 'piece';
}

export function CreateRecipeModal({ isOpen, onClose, onSuccess }: CreateRecipeModalProps) {
  const [name, setName] = useState('');
  const [defaultServings, setDefaultServings] = useState<number>(1);
  const [finishedWeightG, setFinishedWeightG] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiClient.get(`/food/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data.data || res.data || []);
    } catch (e) {
      // Ignore search errors
    } finally {
      setIsSearching(false);
    }
  };

  const addIngredientFromFood = (food: any) => {
    setIngredients((prev) => [
      ...prev,
      {
        foodItemId: food.id,
        name: food.name,
        quantity: 100,
        unit: 'g',
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientRow, value: any) => {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Inserisci il nome della ricetta.');
      return;
    }
    if (ingredients.length === 0) {
      setError('Aggiungi almeno un ingrediente alla ricetta.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/nutrition/recipes', {
        name: name.trim(),
        defaultServings: Number(defaultServings) || 1,
        finishedWeightG: finishedWeightG ? Number(finishedWeightG) : null,
        notes: notes.trim() || undefined,
        ingredients: ingredients.map((ing) => ({
          foodItemId: ing.foodItemId,
          customFoodName: ing.foodItemId ? undefined : ing.name,
          quantity: Number(ing.quantity),
          unit: ing.unit,
        })),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la creazione della ricetta.');
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
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
              <ChefHat size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Nuova Ricetta Personalizzata</h3>
              <p className="text-[11px] text-slate-500">Crea una ricetta e calcola i macro per porzione o per 100g</p>
            </div>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Nome della Ricetta *</label>
            <input
              type="text"
              required
              placeholder="es. Torta Proteica Avena e Cioccolato"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Porzioni Totali (default: 1)</label>
              <input
                type="number"
                min="1"
                value={defaultServings}
                onChange={(e) => setDefaultServings(Number(e.target.value))}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Peso Cotto / Finale (g opzionale)</label>
              <input
                type="number"
                min="1"
                placeholder="es. 450"
                value={finishedWeightG}
                onChange={(e) => setFinishedWeightG(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Avviso peso cotto vs crudo */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertCircle size={14} className="text-slate-500 shrink-0 mt-0.5" />
            <span>
              {finishedWeightG
                ? `I macro per 100g saranno calcolati sulla base del peso cotto/finito specificato (${finishedWeightG}g).`
                : 'Senza peso cotto, i macro per 100g saranno stimati sulla somma degli ingredienti a crudo.'}
            </span>
          </div>

          {/* Sezione Ingredienti */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-semibold text-xs">Ingredienti ({ingredients.length})</label>

            {/* Ricerca per aggiungere ingredienti */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cerca ingrediente da aggiungere..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
              />

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#131b26] border border-[#1f2b3d] rounded-xl max-h-40 overflow-y-auto z-10 shadow-xl divide-y divide-slate-800">
                  {searchResults.map((food) => (
                    <div
                      key={food.id}
                      onClick={() => addIngredientFromFood(food)}
                      className="p-2.5 hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                    >
                      <span className="font-medium text-slate-200">{food.name}</span>
                      <span className="text-[11px] text-slate-500">{food.calories100g ?? food.kcalPer100g} kcal/100g</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabella ingredienti selezionati */}
            <div className="space-y-2 mt-2">
              {ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0b0f17] border border-[#1f2b3d]"
                >
                  <span className="flex-1 font-medium text-slate-200 truncate">{ing.name}</span>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(idx, 'quantity', Number(e.target.value))}
                    className="w-20 bg-[#131b26] border border-[#1f2b3d] rounded-lg px-2 py-1 text-center text-slate-200 focus:outline-none"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    className="w-24 bg-[#131b26] border border-[#1f2b3d] rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
                  >
                    <option value="g">grammi (g)</option>
                    <option value="ml">millilitri (ml)</option>
                    <option value="piece">pezzi (piece)</option>
                    <option value="serving">porzione (serving)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Note / Procedimento (opzionale)</label>
            <textarea
              rows={2}
              placeholder="es. Cuocere in forno a 180° per 25 minuti..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <ChefHat size={15} />}
              Salva Ricetta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

