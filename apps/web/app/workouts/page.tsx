'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/app-layout';
import { apiClient } from '../../lib/api';
import { Dumbbell, Plus, CheckCircle, Play } from 'lucide-react';
import { SmartImportModal } from '../../components/modals/smart-import-modal';

export default function WorkoutsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = async () => {
    try {
      const [plansRes, logsRes] = await Promise.all([
        apiClient.get('/workout/plans'),
        apiClient.get('/workout/logs'),
      ]);
      setPlans(plansRes.data.data || []);
      setLogs(logsRes.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const handleActivatePlan = async (planId: string) => {
    await apiClient.post(`/workout/plans/${planId}/activate`);
    fetchWorkouts();
  };

  const handleSaveImportedPlan = async (parsedData: any[]) => {
    // Raggruppa per giorno
    const daysMap: Record<string, any[]> = {};
    parsedData.forEach((row) => {
      if (!daysMap[row.day]) daysMap[row.day] = [];
      daysMap[row.day].push({
        exerciseId: 'seed-panca-piana-con-bilanciere', // Fallback ID esercizio verificato
        orderIndex: 1,
        sets: row.sets,
        repsTarget: row.reps,
        weightTarget: row.weight,
        restSeconds: 90,
      });
    });

    const workoutDays = Object.keys(daysMap).map((dayName, idx) => ({
      name: dayName,
      orderIndex: idx + 1,
      exercises: daysMap[dayName],
    }));

    await apiClient.post('/workout/plans', {
      name: 'Nuova Scheda Importata',
      isActive: true,
      workoutDays,
    });

    fetchWorkouts();
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Schede di Allenamento <Dumbbell size={22} className="text-pink-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Organizza la tua routine settimanale e monitora il progressive overload
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-pink-500/20 transition"
          >
            <Plus size={16} /> Nuova Scheda / CSV
          </button>
        </div>

        {/* Schede Utente */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-[#131b26] border rounded-2xl p-5 flex flex-col justify-between transition ${
                plan.isActive ? 'border-pink-500/40 shadow-lg shadow-pink-500/5' : 'border-[#1f2b3d]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-100 text-base">{plan.name}</h3>
                  {plan.isActive && (
                    <span className="text-[10px] uppercase font-bold text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20">
                      Attiva
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  {plan.workoutDays?.length || 0} Giorni di Allenamento
                </p>

                <div className="flex flex-col gap-2">
                  {plan.workoutDays?.map((d: any) => (
                    <div key={d.id} className="text-xs bg-[#0b0f17] p-2.5 rounded-xl border border-slate-800 text-slate-300">
                      <span className="font-semibold text-slate-200">{d.name}</span>
                      <span className="text-slate-500 ml-2">({d.exercises?.length || 0} esercizi)</span>
                    </div>
                  ))}
                </div>
              </div>

              {!plan.isActive && (
                <button
                  onClick={() => handleActivatePlan(plan.id)}
                  className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
                >
                  Imposta come Attiva
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Storico Recente Sessioni */}
        <div className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl mt-4">
          <h3 className="text-sm font-bold text-slate-200 mb-1">Storico Sessioni Concluse</h3>
          <p className="text-xs text-slate-400 mb-4">Registro delle ultime esecuzioni con carichi e volume</p>

          <div className="divide-y divide-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-200">{log.dayNameSnapshot}</p>
                  <p className="text-slate-500 mt-0.5">{new Date(log.createdAt).toLocaleDateString('it-IT')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-pink-400">{log.durationMinutes} min</p>
                  <p className="text-slate-500">{log.caloriesBurned} kcal bruciate</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SmartImportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Crea Nuova Scheda di Allenamento"
          onSave={handleSaveImportedPlan}
        />
      </div>
    </AppLayout>
  );
}
