'use client';

import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, Loader2, AlertCircle, Info } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface NutritionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NutritionSettingsModal({
  isOpen,
  onClose,
  onSuccess,
}: NutritionSettingsModalProps) {
  const [targetMode, setTargetMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [goalType, setGoalType] = useState<'CUT' | 'MAINTENANCE' | 'BULK'>('MAINTENANCE');
  const [deficitPct, setDeficitPct] = useState<number>(15);
  const [surplusPct, setSurplusPct] = useState<number>(10);
  const [proteinPerKg, setProteinPerKg] = useState<number>(1.8);
  const [fatPct, setFatPct] = useState<number>(25);
  const [calorieBalanceMode, setCalorieBalanceMode] = useState<'SIMPLE' | 'ACTIVE'>('SIMPLE');
  const [burnedCalorieRecoveryPct, setBurnedCalorieRecoveryPct] = useState<number>(50);
  const [isPregnant, setIsPregnant] = useState<boolean>(false);
  const [isLactating, setIsLactating] = useState<boolean>(false);

  // Manual targets
  const [targetCalories, setTargetCalories] = useState<string>('');
  const [targetProteinG, setTargetProteinG] = useState<string>('');
  const [targetCarbsG, setTargetCarbsG] = useState<string>('');
  const [targetFatG, setTargetFatG] = useState<string>('');
  const [targetFiberG, setTargetFiberG] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    apiClient.get('/settings')
      .then((res) => {
        const s = res.data;
        if (s) {
          if (s.targetMode) setTargetMode(s.targetMode);
          if (s.goalType) setGoalType(s.goalType);
          if (s.deficitPct) setDeficitPct(s.deficitPct);
          if (s.surplusPct) setSurplusPct(s.surplusPct);
          if (s.proteinPerKg) setProteinPerKg(s.proteinPerKg);
          if (s.fatPct) setFatPct(s.fatPct);
          if (s.calorieBalanceMode) setCalorieBalanceMode(s.calorieBalanceMode);
          if (s.burnedCalorieRecoveryPct !== undefined) setBurnedCalorieRecoveryPct(s.burnedCalorieRecoveryPct);
          if (s.isPregnant !== undefined) setIsPregnant(Boolean(s.isPregnant));
          if (s.isLactating !== undefined) setIsLactating(Boolean(s.isLactating));
          if (s.targetCalories) setTargetCalories(String(s.targetCalories));
          if (s.targetProteinG) setTargetProteinG(String(s.targetProteinG));
          if (s.targetCarbsG) setTargetCarbsG(String(s.targetCarbsG));
          if (s.targetFatG) setTargetFatG(String(s.targetFatG));
          if (s.targetFiberG) setTargetFiberG(String(s.targetFiberG));
        }
      })
      .catch((err) => setError(err?.response?.data?.message || 'Errore caricamento impostazioni.'))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        targetMode,
        goalType,
        deficitPct: Number(deficitPct),
        surplusPct: Number(surplusPct),
        proteinPerKg: Number(proteinPerKg),
        fatPct: Number(fatPct),
        calorieBalanceMode,
        burnedCalorieRecoveryPct: Number(burnedCalorieRecoveryPct),
        isPregnant,
        isLactating,
      };

      if (targetMode === 'MANUAL') {
        if (targetCalories) payload.targetCalories = Number(targetCalories);
        if (targetProteinG) payload.targetProteinG = Number(targetProteinG);
        if (targetCarbsG) payload.targetCarbsG = Number(targetCarbsG);
        if (targetFatG) payload.targetFatG = Number(targetFatG);
        if (targetFiberG) payload.targetFiberG = Number(targetFiberG);
      }

      await apiClient.patch('/settings', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore salvataggio impostazioni.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg max-h-[90vh] bg-[#131b26] border border-[#1f2b3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Impostazioni Calorie & Target Nutrizionali</h3>
              <p className="text-[11px] text-slate-500">Configura la modalità di calcolo deterministico e bilancio energetico</p>
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

        {isLoading ? (
          <div className="p-10 flex justify-center items-center">
            <Loader2 size={24} className="animate-spin text-pink-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Modalità Target: AUTO vs MANUAL */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Modalità Target Nutrizionali</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode('AUTO')}
                  className={`p-2.5 rounded-xl border text-center transition font-semibold ${
                    targetMode === 'AUTO'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                      : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AUTOMATICO (Algoritmo TDEE)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('MANUAL')}
                  className={`p-2.5 rounded-xl border text-center transition font-semibold ${
                    targetMode === 'MANUAL'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                      : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  MANUALE (Target Fissi)
                </button>
              </div>
            </div>

            {/* Impostazioni Modalità AUTOMATICA */}
            {targetMode === 'AUTO' ? (
              <div className="space-y-3 bg-[#0b0f17] border border-[#1f2b3d] p-3.5 rounded-xl">
                <div>
                  <label className="block text-slate-400 mb-1">Obiettivo Fisiologico</label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as any)}
                    className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="MAINTENANCE">Mantenimento (TDEE Neutro)</option>
                    <option value="CUT">Deficit Calorico (Dimagrimento)</option>
                    <option value="BULK">Surplus Calorico (Massa Muscolare)</option>
                  </select>
                </div>

                {goalType === 'CUT' && (
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Percentuale di Deficit</span>
                      <span className="font-bold text-pink-400">{deficitPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="25"
                      value={deficitPct}
                      onChange={(e) => setDeficitPct(Number(e.target.value))}
                      className="w-full accent-pink-500"
                    />
                    <span className="text-[10px] text-slate-500">Range consigliato: 10% - 25% (default 15%)</span>
                  </div>
                )}

                {goalType === 'BULK' && (
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Percentuale di Surplus</span>
                      <span className="font-bold text-pink-400">+{surplusPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="10"
                      value={surplusPct}
                      onChange={(e) => setSurplusPct(Number(e.target.value))}
                      className="w-full accent-pink-500"
                    />
                    <span className="text-[10px] text-slate-500">Range consigliato: 5% - 10% (default 10%)</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 mb-1">Proteine (g / kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.6"
                      max="2.2"
                      value={proteinPerKg}
                      onChange={(e) => setProteinPerKg(Number(e.target.value))}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-1.5 text-slate-200"
                    />
                    <span className="text-[10px] text-slate-500">1.6 - 2.2 g/kg peso</span>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Grassi (% kcal)</label>
                    <input
                      type="number"
                      min="20"
                      max="35"
                      value={fatPct}
                      onChange={(e) => setFatPct(Number(e.target.value))}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-1.5 text-slate-200"
                    />
                    <span className="text-[10px] text-slate-500">20% - 35% calorie totali</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Impostazioni Modalità MANUALE */
              <div className="space-y-3 bg-[#0b0f17] border border-[#1f2b3d] p-3.5 rounded-xl">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Target Calorie (kcal) *</label>
                  <input
                    type="number"
                    required
                    min="800"
                    max="6000"
                    placeholder="es. 2200"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                    className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-2 text-slate-100 font-bold"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Pro (g)</label>
                    <input
                      type="number"
                      value={targetProteinG}
                      onChange={(e) => setTargetProteinG(e.target.value)}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-2 py-1.5 text-center text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Carb (g)</label>
                    <input
                      type="number"
                      value={targetCarbsG}
                      onChange={(e) => setTargetCarbsG(e.target.value)}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-2 py-1.5 text-center text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Fat (g)</label>
                    <input
                      type="number"
                      value={targetFatG}
                      onChange={(e) => setTargetFatG(e.target.value)}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-2 py-1.5 text-center text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Fibre (g)</label>
                    <input
                      type="number"
                      value={targetFiberG}
                      onChange={(e) => setTargetFiberG(e.target.value)}
                      className="w-full bg-[#131b26] border border-[#1f2b3d] rounded-xl px-2 py-1.5 text-center text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modalità Bilancio Energetico: SIMPLE vs ACTIVE */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium">Modalità Bilancio Energetico</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCalorieBalanceMode('SIMPLE')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    calorieBalanceMode === 'SIMPLE'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-300 font-semibold'
                      : 'bg-[#0b0f17] border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-bold text-xs">SIMPLE (Consigliata)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Mangiate - TDEE Base. Gli allenamenti non aumentano il target per evitare doppio conteggio.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setCalorieBalanceMode('ACTIVE')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    calorieBalanceMode === 'ACTIVE'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-300 font-semibold'
                      : 'bg-[#0b0f17] border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-bold text-xs">ACTIVE (Atleti)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Recupera una quota delle calorie bruciate durante gli allenamenti nel target giornaliero.
                  </p>
                </button>
              </div>

              {calorieBalanceMode === 'ACTIVE' && (
                <div className="bg-[#0b0f17] border border-[#1f2b3d] p-3 rounded-xl mt-2">
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Percentuale recupero calorie bruciate:</span>
                    <span className="font-bold text-orange-400">{burnedCalorieRecoveryPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={burnedCalorieRecoveryPct}
                    onChange={(e) => setBurnedCalorieRecoveryPct(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Target = TargetBase + (Bruciate * {burnedCalorieRecoveryPct}%)
                  </span>
                </div>
              )}
            </div>

            {/* Condizioni Fisiologiche Speciali */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-slate-300 font-medium">Condizioni Speciali</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPregnant}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-pink-500 focus:ring-0"
                  />
                  <span>Gravidanza</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={isLactating}
                    onChange={(e) => setIsLactating(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-pink-500 focus:ring-0"
                  />
                  <span>Allattamento</span>
                </label>
              </div>
              {(isPregnant || isLactating) && (
                <p className="text-[11px] text-amber-300/90 leading-tight">
                  Per tutelare la salute materno-fetale o neonatale, i deficit/surplus automatici sono disabilitati ed è consentito solo l'inserimento manuale.
                </p>
              )}
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
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Salva Impostazioni
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

