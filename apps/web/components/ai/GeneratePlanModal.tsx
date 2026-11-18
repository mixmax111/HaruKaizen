'use client';

import React, { useState } from 'react';
import { apiClient } from '../../lib/api';
import {
  X,
  Dumbbell,
  Apple,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GeneratePlanModal({ isOpen, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<'workout' | 'diet'>('workout');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workout state
  const [workoutGoal, setWorkoutGoal] = useState('Ipertrofia muscolare mirata con focus parte superiore');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [equipment, setEquipment] = useState('Palestra commerciale completa (bilancieri, manubri, cavi, macchine)');

  // Diet state
  const [dietGoal, setDietGoal] = useState('Deficit calorico moderato per ricomposizione corporea');
  const [targetKcal, setTargetKcal] = useState(2100);
  const [restrictions, setRestrictions] = useState('Nessuna intolleranza specifica');

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tab === 'workout') {
        await apiClient.post('/ai/generate-workout-plan', {
          userGoal: workoutGoal,
          daysPerWeek: Number(daysPerWeek),
          equipmentAvailable: equipment,
        });
      } else {
        await apiClient.post('/ai/generate-diet-plan', {
          userGoal: dietGoal,
          targetKcal: Number(targetKcal),
          dietaryRestrictions: restrictions,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante la generazione AI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#131b26] border border-[#1f2b3d] rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#1f2b3d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-lg">
              <Sparkles size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              Generatore di Piani AI (Sandbox)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#1f2b3d] bg-[#0b0f17]">
          <button
            type="button"
            onClick={() => { setTab('workout'); setError(null); }}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              tab === 'workout'
                ? 'border-pink-500 text-pink-400 bg-pink-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell size={15} /> Scheda Allenamento
          </button>
          <button
            type="button"
            onClick={() => { setTab('diet'); setError(null); }}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              tab === 'diet'
                ? 'border-pink-500 text-pink-400 bg-pink-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple size={15} /> Piano Nutrizionale
          </button>
        </div>

        <form onSubmit={handleGenerate} className="p-5 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'workout' ? (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                  Obiettivo Mesociclo
                </label>
                <input
                  type="text"
                  value={workoutGoal}
                  onChange={(e) => setWorkoutGoal(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                    Frequenza (Giorni/Settimana)
                  </label>
                  <select
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                    className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500"
                  >
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} giorni alla settimana
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                    Attrezzatura
                  </label>
                  <input
                    type="text"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                  Obiettivo Nutrizionale
                </label>
                <input
                  type="text"
                  value={dietGoal}
                  onChange={(e) => setDietGoal(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                    Target Calorico Giornaliero (kcal)
                  </label>
                  <input
                    type="number"
                    value={targetKcal}
                    onChange={(e) => setTargetKcal(Number(e.target.value))}
                    className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500"
                    min={900}
                    max={6000}
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                    Preferenze / Intolleranze
                  </label>
                  <input
                    type="text"
                    value={restrictions}
                    onChange={(e) => setRestrictions(e.target.value)}
                    className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </>
          )}

          <p className="text-[10px] text-slate-500 leading-relaxed">
            * Il piano verrà generato con lo schema Zod rigoroso e inserito in sandbox isolata con tag <code className="text-pink-400 font-mono">AI_DRAFT</code>.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1f2b3d]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-pink-500/20 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Invocazione AI & Sandbox...
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Genera Bozza Protetta
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

