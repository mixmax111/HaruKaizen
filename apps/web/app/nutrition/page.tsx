'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/app-layout';
import { apiClient } from '../../lib/api';
import {
  Apple,
  Plus,
  Utensils,
  Flame,
  UploadCloud,
  Sliders,
  LayoutGrid,
  ChefHat,
  Zap,
  Trash2,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CalorieBalanceBanner } from '../../components/nutrition/CalorieBalanceBanner';
import { QuickAddModal } from '../../components/nutrition/QuickAddModal';
import { CreateRecipeModal } from '../../components/nutrition/CreateRecipeModal';
import { LogFoodModal } from '../../components/nutrition/LogFoodModal';
import { MealSlotsManagerModal } from '../../components/nutrition/MealSlotsManagerModal';
import { NutritionSettingsModal } from '../../components/nutrition/NutritionSettingsModal';
import { CsvPortabilityModal } from '../../components/portability/CsvPortabilityModal';

export default function NutritionPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [activeSlotForLog, setActiveSlotForLog] = useState<string | undefined>(undefined);
  const [isLogFoodOpen, setIsLogFoodOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCreateRecipeOpen, setIsCreateRecipeOpen] = useState(false);
  const [isSlotsManagerOpen, setIsSlotsManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPortabilityModalOpen, setIsPortabilityModalOpen] = useState(false);

  const fetchNutrition = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/nutrition/summary?date=${selectedDate}`);
      setSummary(res.data.data || res.data || null);
    } catch (err) {
      console.error('Failed to fetch nutrition summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNutrition();
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Rimuovere questa voce dal diario?')) return;
    try {
      await apiClient.delete(`/nutrition/logs/${logId}`);
      fetchNutrition();
    } catch (err) {
      alert('Errore durante l\'eliminazione della voce.');
    }
  };

  const handleRestoreOriginal = async (foodItemId: string) => {
    if (!confirm('Ripristinare i valori nutrizionali originali del provider?')) return;
    try {
      await apiClient.post(`/food/${foodItemId}/restore`);
      fetchNutrition();
    } catch (err) {
      alert('Errore durante il ripristino dell\'alimento originale.');
    }
  };

  const openLogForSlot = (slotId?: string) => {
    setActiveSlotForLog(slotId);
    setIsLogFoodOpen(true);
  };

  const openQuickAddForSlot = (slotId?: string) => {
    setActiveSlotForLog(slotId);
    setIsQuickAddOpen(true);
  };

  const mealSlotsList = (summary?.mealSlots || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slotOrder: s.slotOrder,
  }));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
        {/* Header con Navigazione Data e Azioni */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Conta Calorie & Nutrizione <Apple size={22} className="text-pink-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Tracciamento puro, bilancio energetico deterministico e sovranità dei dati
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Selettore Data */}
            <div className="flex items-center bg-[#131b26] border border-[#1f2b3d] rounded-xl px-2 py-1 text-xs text-slate-200">
              <button
                onClick={() => changeDate(-1)}
                className="p-1 hover:text-pink-400 transition"
                title="Giorno precedente"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold px-2 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                {selectedDate}
              </span>
              <button
                onClick={() => changeDate(1)}
                className="p-1 hover:text-pink-400 transition"
                title="Giorno successivo"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Pulsanti Azioni Principali */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#131b26] hover:bg-slate-800 text-slate-300 border border-[#1f2b3d] rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Target e Formula Calorie"
            >
              <Sliders size={14} className="text-pink-400" /> Target
            </button>

            <button
              onClick={() => setIsSlotsManagerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#131b26] hover:bg-slate-800 text-slate-300 border border-[#1f2b3d] rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Personalizza Pasti e Slot"
            >
              <LayoutGrid size={14} className="text-pink-400" /> Pasti
            </button>

            <button
              onClick={() => setIsCreateRecipeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#131b26] hover:bg-slate-800 text-slate-300 border border-[#1f2b3d] rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Crea Nuova Ricetta"
            >
              <ChefHat size={14} className="text-pink-400" /> Ricetta
            </button>

            <button
              onClick={() => setIsPortabilityModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#131b26] hover:bg-slate-800 text-slate-300 border border-[#1f2b3d] rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Import/Export CSV"
            >
              <UploadCloud size={14} className="text-emerald-400" /> Portabilità
            </button>
          </div>
        </div>

        {/* Banner Bilancio Energetico & Target Deterministi */}
        <CalorieBalanceBanner summary={summary} />

        {/* Sezione Pasti e Registrazioni Raggruppati per MealSlot */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Utensils size={16} className="text-pink-400" />
              Diario dei Pasti
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => openQuickAddForSlot()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
              >
                <Zap size={14} /> Quick Add
              </button>
              <button
                onClick={() => openLogForSlot()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition shadow-lg shadow-pink-500/20 cursor-pointer"
              >
                <Plus size={15} /> Aggiungi Alimento
              </button>
            </div>
          </div>

          {/* Render degli Slot */}
          {summary?.mealSlots && summary.mealSlots.length > 0 ? (
            summary.mealSlots.map((slot: any) => (
              <div
                key={slot.id}
                className="bg-[#131b26] border border-[#1f2b3d] rounded-2xl p-5 flex flex-col gap-3 shadow-md"
              >
                {/* Header dello Slot */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                    <h3 className="text-sm font-bold text-slate-100">{slot.name}</h3>
                    <span className="text-xs text-slate-500">
                      ({slot.logs?.length || 0} {slot.logs?.length === 1 ? 'alimento' : 'alimenti'})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Subtotali macro slot */}
                    <div className="text-right text-xs">
                      <span className="font-bold text-pink-400 mr-2">
                        {Math.round(slot.totals.calories)} kcal
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        P: {Math.round(slot.totals.protein * 10) / 10}g • C:{' '}
                        {Math.round(slot.totals.carbs * 10) / 10}g • F:{' '}
                        {Math.round(slot.totals.fat * 10) / 10}g
                      </span>
                    </div>

                    {/* Azioni rapide per questo slot */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openQuickAddForSlot(slot.id)}
                        className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition cursor-pointer"
                        title={`Quick Add in ${slot.name}`}
                      >
                        <Zap size={14} />
                      </button>
                      <button
                        onClick={() => openLogForSlot(slot.id)}
                        className="p-1.5 rounded-lg text-pink-400 hover:bg-pink-400/10 transition cursor-pointer"
                        title={`Aggiungi alimento in ${slot.name}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Voci registrate in questo slot */}
                {slot.logs && slot.logs.length > 0 ? (
                  <div className="divide-y divide-slate-800/60">
                    {slot.logs.map((log: any) => {
                      const isEdited = log.foodItem?.isUserEdited;
                      const hasOriginal = Boolean(log.foodItem?.basedOnId);
                      const displayName =
                        log.entryType === 'RECIPE'
                          ? log.recipeNameSnapshot || log.recipe?.name || 'Ricetta'
                          : log.entryType === 'QUICK_ADD'
                          ? log.customFoodName || 'Registrazione Rapida'
                          : log.foodItem?.name || log.customFoodName || 'Alimento';

                      return (
                        <div
                          key={log.id}
                          className="py-2.5 flex items-center justify-between text-xs group"
                        >
                          <div className="flex-1 pr-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-200">{displayName}</span>
                              {log.entryType === 'RECIPE' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-pink-500/20 text-pink-300 font-bold">
                                  Ricetta
                                </span>
                              )}
                              {log.entryType === 'QUICK_ADD' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 font-bold">
                                  Quick
                                </span>
                              )}
                              {isEdited && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/20 text-sky-300 font-medium">
                                  Modificato
                                </span>
                              )}
                              {hasOriginal && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreOriginal(log.foodItemId)}
                                  className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5 underline cursor-pointer"
                                  title="Ripristina valori originali Open Food Facts / USDA"
                                >
                                  <RotateCcw size={10} /> Ripristina originale
                                </button>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {log.entryType === 'QUICK_ADD' ? '1 porzione' : `${log.quantityG}g`}
                              {log.foodItem?.brand ? ` • ${log.foodItem.brand}` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-bold text-pink-400">
                                {log.caloriesConsumed} kcal
                              </span>
                              <p className="text-[10px] text-slate-500">
                                P: {log.proteinConsumed}g • C: {log.carbsConsumed}g • F: {log.fatConsumed}g
                                {log.fiberConsumed !== null && log.fiberConsumed !== undefined
                                  ? ` • Fib: ${log.fiberConsumed}g`
                                  : ' • Fib: n.d.'}
                              </p>
                            </div>

                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition opacity-80 group-hover:opacity-100 cursor-pointer"
                              title="Elimina voce"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center italic">
                    Nessun alimento registrato in questo pasto.
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-[#131b26] border border-[#1f2b3d] rounded-2xl text-slate-400 text-xs">
              Nessun pasto configurato. Clicca su "Pasti" in alto a destra per creare gli slot della tua giornata.
            </div>
          )}

          {/* Voci non assegnate a uno slot specifico (se presenti) */}
          {summary?.unassignedLogs && summary.unassignedLogs.length > 0 && (
            <div className="bg-[#131b26] border border-amber-500/30 rounded-2xl p-5 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Voci non assegnate a uno slot
              </h3>
              <div className="divide-y divide-slate-800">
                {summary.unassignedLogs.map((log: any) => (
                  <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                    <span className="text-slate-200">
                      {log.foodItem?.name || log.customFoodName} ({log.quantityG}g)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-pink-400 font-bold">{log.caloriesConsumed} kcal</span>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-slate-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modali Gestione */}
        <LogFoodModal
          isOpen={isLogFoodOpen}
          onClose={() => setIsLogFoodOpen(false)}
          mealSlots={mealSlotsList}
          defaultMealSlotId={activeSlotForLog}
          onSuccess={fetchNutrition}
        />

        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          mealSlots={mealSlotsList}
          defaultMealSlotId={activeSlotForLog}
          onSuccess={fetchNutrition}
        />

        <CreateRecipeModal
          isOpen={isCreateRecipeOpen}
          onClose={() => setIsCreateRecipeOpen(false)}
          onSuccess={fetchNutrition}
        />

        <MealSlotsManagerModal
          isOpen={isSlotsManagerOpen}
          onClose={() => setIsSlotsManagerOpen(false)}
          mealSlots={mealSlotsList}
          onSuccess={fetchNutrition}
        />

        <NutritionSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSuccess={fetchNutrition}
        />

        <CsvPortabilityModal
          isOpen={isPortabilityModalOpen}
          onClose={() => setIsPortabilityModalOpen(false)}
          initialTarget="NUTRITION_LOGS"
          onSuccess={fetchNutrition}
        />
      </div>
    </AppLayout>
  );
}
