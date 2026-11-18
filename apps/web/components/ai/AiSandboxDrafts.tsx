'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import {
  Layers,
  Dumbbell,
  Apple,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Calendar,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface ExerciseItem {
  id: string;
  orderIndex: number;
  sets: number;
  repsTarget: string;
  weightTarget?: string | null;
  restSeconds: number;
  notes?: string | null;
  exercise: {
    name: string;
    category: string;
  };
}

interface WorkoutDay {
  id: string;
  name: string;
  orderIndex: number;
  exercises: ExerciseItem[];
}

interface WorkoutDraft {
  id: string;
  name: string;
  origin: string;
  isAiIsolated: boolean;
  aiReasoning?: string | null;
  clinicalWarning?: string | null;
  createdAt: string;
  workoutDays: WorkoutDay[];
}

interface DietDayItem {
  id: string;
  mealType: string;
  quantityG: number;
  scheduledTime?: string | null;
  foodItem: {
    name: string;
    calories100g: number;
    protein100g: number;
    carbs100g: number;
    fat100g: number;
  };
}

interface DietDay {
  id: string;
  name: string;
  dietDayItems: DietDayItem[];
}

interface DietDraft {
  id: string;
  name: string;
  origin: string;
  isAiIsolated: boolean;
  aiReasoning?: string | null;
  clinicalWarning?: string | null;
  createdAt: string;
  dietDays: DietDay[];
}

export function AiSandboxDrafts({ onRefreshNeeded }: { onRefreshNeeded?: () => void }) {
  const [workoutDrafts, setWorkoutDrafts] = useState<WorkoutDraft[]>([]);
  const [dietDrafts, setDietDrafts] = useState<DietDraft[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ai/sandbox-drafts');
      const data = res.data.data || res.data || {};
      setWorkoutDrafts(data.workoutDrafts || []);
      setDietDrafts(data.dietDrafts || []);
    } catch (err: any) {
      console.warn('Errore caricamento bozze sandbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteWorkout = async (id: string) => {
    if (!confirm('Vuoi promuovere questa bozza a Scheda di Allenamento attiva?')) return;
    setPromotingId(id);
    setStatusMessage(null);
    try {
      await apiClient.patch(`/ai/workout-plans/${id}/promote`);
      setStatusMessage('Scheda di allenamento promossa con successo a piano operativo (AI_APPLIED)!');
      await fetchDrafts();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Errore durante la promozione del piano.');
    } finally {
      setPromotingId(null);
    }
  };

  const handlePromoteDiet = async (id: string) => {
    if (!confirm('Vuoi promuovere questa bozza a Piano Nutrizionale attivo?')) return;
    setPromotingId(id);
    setStatusMessage(null);
    try {
      await apiClient.patch(`/ai/diet-plans/${id}/promote`);
      setStatusMessage('Piano alimentare promosso con successo a piano operativo (AI_APPLIED)!');
      await fetchDrafts();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Errore durante la promozione del piano.');
    } finally {
      setPromotingId(null);
    }
  };

  const currentCount = activeTab === 'workout' ? workoutDrafts.length : dietDrafts.length;

  return (
    <div className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl flex flex-col gap-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Sandbox Drafts Isolati (AI_DRAFT)
            </h3>
            <p className="text-[11px] text-slate-400">
              I piani generati dall'AI rimangono isolati in sandbox protetta finché non decidi esplicitamente di promuoverli.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b0f17] p-1 rounded-xl border border-[#1f2b3d]">
          <button
            type="button"
            onClick={() => setActiveTab('workout')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'workout'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell size={14} /> Allenamento ({workoutDrafts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diet')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'diet'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple size={14} /> Dieta ({dietDrafts.length})
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Caricamento bozze sandbox...
        </div>
      ) : currentCount === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 bg-[#0b0f17] border border-dashed border-[#1f2b3d] rounded-xl">
          Nessuna bozza isolata di {activeTab === 'workout' ? 'allenamento' : 'nutrizione'} presente.
          Usa i pulsanti in alto per generare la tua prima proposta con l'AI.
        </div>
      ) : activeTab === 'workout' ? (
        /* Workout Drafts */
        <div className="flex flex-col gap-6">
          {workoutDrafts.map((draft) => (
            <div
              key={draft.id}
              className="bg-[#0b0f17] border border-[#1f2b3d] rounded-2xl p-5 flex flex-col gap-4 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2b3d] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-100">{draft.name}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Sandbox Draft
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Generato il {new Date(draft.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePromoteWorkout(draft.id)}
                  disabled={promotingId === draft.id}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  {promotingId === draft.id ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Promozione in corso...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={14} /> Promuovi a Piano Attivo
                    </>
                  )}
                </button>
              </div>

              {/* High-Visibility Clinical Warning Banner (Coral #ffb2b7) */}
              {draft.clinicalWarning && (
                <div
                  className="p-4 rounded-xl border flex items-start gap-3"
                  style={{
                    backgroundColor: 'rgba(80, 15, 20, 0.45)',
                    borderColor: '#ffb2b7',
                    color: '#ffb2b7',
                  }}
                >
                  <ShieldAlert size={20} className="shrink-0 mt-0.5" style={{ color: '#ffb2b7' }} />
                  <div className="text-xs">
                    <p className="font-bold uppercase tracking-wider text-[11px] mb-1">
                      Avviso Clinico di Sicurezza (Clinical Guardrail)
                    </p>
                    <p className="leading-relaxed opacity-95">{draft.clinicalWarning}</p>
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              {draft.aiReasoning && (
                <div className="p-3.5 bg-[#131b26] border border-[#1f2b3d] rounded-xl text-xs text-slate-300">
                  <span className="font-bold text-pink-400 block mb-1">Motivazione Scientifica del Coach:</span>
                  <p className="leading-relaxed whitespace-pre-line text-[11px] text-slate-300">{draft.aiReasoning}</p>
                </div>
              )}

              {/* Giorni ed Esercizi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {draft.workoutDays.map((day) => (
                  <div
                    key={day.id}
                    className="bg-[#131b26]/70 border border-[#1f2b3d] p-3.5 rounded-xl flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-200">
                        Giorno {day.orderIndex}: {day.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {day.exercises.length} esercizi
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {day.exercises.map((ex) => (
                        <div
                          key={ex.id}
                          className="p-2.5 bg-[#0b0f17] border border-slate-800/80 rounded-lg text-xs flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{ex.exercise.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                              {ex.exercise.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                            <span>{ex.sets} serie × {ex.repsTarget}</span>
                            {ex.weightTarget && <span>• {ex.weightTarget}</span>}
                            <span>• Riposo: {ex.restSeconds}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Diet Drafts */
        <div className="flex flex-col gap-6">
          {dietDrafts.map((draft) => (
            <div
              key={draft.id}
              className="bg-[#0b0f17] border border-[#1f2b3d] rounded-2xl p-5 flex flex-col gap-4 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2b3d] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-100">{draft.name}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Sandbox Draft
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Generato il {new Date(draft.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePromoteDiet(draft.id)}
                  disabled={promotingId === draft.id}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  {promotingId === draft.id ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Promozione in corso...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={14} /> Promuovi a Piano Attivo
                    </>
                  )}
                </button>
              </div>

              {/* High-Visibility Clinical Warning Banner (Coral #ffb2b7) */}
              {draft.clinicalWarning && (
                <div
                  className="p-4 rounded-xl border flex items-start gap-3"
                  style={{
                    backgroundColor: 'rgba(80, 15, 20, 0.45)',
                    borderColor: '#ffb2b7',
                    color: '#ffb2b7',
                  }}
                >
                  <ShieldAlert size={20} className="shrink-0 mt-0.5" style={{ color: '#ffb2b7' }} />
                  <div className="text-xs">
                    <p className="font-bold uppercase tracking-wider text-[11px] mb-1">
                      Avviso Clinico di Sicurezza (Clinical Guardrail)
                    </p>
                    <p className="leading-relaxed opacity-95">{draft.clinicalWarning}</p>
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              {draft.aiReasoning && (
                <div className="p-3.5 bg-[#131b26] border border-[#1f2b3d] rounded-xl text-xs text-slate-300">
                  <span className="font-bold text-pink-400 block mb-1">Strategia Nutrizionale del Coach:</span>
                  <p className="leading-relaxed whitespace-pre-line text-[11px] text-slate-300">{draft.aiReasoning}</p>
                </div>
              )}

              {/* Pasti ed Alimenti */}
              <div className="flex flex-col gap-4">
                {draft.dietDays.map((day) => (
                  <div key={day.id} className="bg-[#131b26]/70 border border-[#1f2b3d] p-4 rounded-xl flex flex-col gap-3">
                    <h5 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
                      {day.name}
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {day.dietDayItems.map((item) => {
                        const kcal = Math.round((item.foodItem.calories100g * item.quantityG) / 100);
                        const prot = ((item.foodItem.protein100g * item.quantityG) / 100).toFixed(1);
                        const carb = ((item.foodItem.carbs100g * item.quantityG) / 100).toFixed(1);
                        const fat = ((item.foodItem.fat100g * item.quantityG) / 100).toFixed(1);

                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-[#0b0f17] border border-slate-800 rounded-xl text-xs flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300">
                                  {item.mealType}
                                </span>
                                {item.scheduledTime && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {item.scheduledTime}
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-slate-200 leading-snug">{item.foodItem.name}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{item.quantityG}g</p>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span className="text-amber-300 font-bold">{kcal} kcal</span>
                              <span>P: {prot}g</span>
                              <span>C: {carb}g</span>
                              <span>F: {fat}g</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

