'use client';

import React, { useState } from 'react';
import { X, Zap, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealSlots: Array<{ id: string; name: string }>;
  defaultMealSlotId?: string;
  onSuccess: () => void;
}

export function QuickAddModal({
  isOpen,
  onClose,
  mealSlots,
  defaultMealSlotId,
  onSuccess,
}: QuickAddModalProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [fiber, setFiber] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    defaultMealSlotId || (mealSlots[0]?.id ?? '')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calories || isNaN(Number(calories)) || Number(calories) <= 0) {
      setError('Inserisci un valore valido per le calorie.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post('/nutrition/logs', {
        entryType: 'QUICK_ADD',
        customFoodName: name.trim() || 'Registrazione Rapida',
        mealSlotId: selectedSlotId || undefined,
        quantityG: 1,
        caloriesConsumed: Number(calories),
        proteinConsumed: protein ? Number(protein) : 0,
        carbsConsumed: carbs ? Number(carbs) : 0,
        fatConsumed: fat ? Number(fat) : 0,
        fiberConsumed: fiber ? Number(fiber) : null,
        loggedAt: new Date().toISOString(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la registrazione rapida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-[#131b26] border border-[#1f2b3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Registrazione Rapida (Quick Add)</h3>
              <p className="text-[11px] text-slate-500">Inserisci calorie e macro al volo senza cercare nel database</p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Descrizione / Nome</label>
            <input
              type="text"
              placeholder="es. Pranzo di lavoro, Snack proteico..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Calorie (kcal) *</label>
              <input
                type="number"
                required
                min="1"
                max="5000"
                placeholder="es. 450"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-100 font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Pasto / Slot</label>
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {mealSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">Proteine (g)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-2.5 py-1.5 text-center text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">Carb (g)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-2.5 py-1.5 text-center text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">Grassi (g)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-2.5 py-1.5 text-center text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">Fibre (g)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-2.5 py-1.5 text-center text-slate-200 focus:outline-none"
              />
            </div>
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
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              Registra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

