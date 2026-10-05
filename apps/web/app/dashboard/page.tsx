'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/app-layout';
import { apiClient } from '../../lib/api';
import {
  Flame,
  Scale,
  Dumbbell,
  Sparkles,
  TrendingUp,
  Target,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [latestWorkout, setLatestWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [sumRes, measRes, workRes] = await Promise.allSettled([
          apiClient.get(`/nutrition/summary?date=${today}`),
          apiClient.get('/measurements'),
          apiClient.get('/workouts/logs'),
        ]);

        if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data.data);
        if (measRes.status === 'fulfilled') setMeasurements(measRes.value.data.data || []);
        if (workRes.status === 'fulfilled' && workRes.value.data.data?.length > 0) {
          setLatestWorkout(workRes.value.data.data[0]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const chartData = measurements
    .slice(0, 7)
    .reverse()
    .map((m) => ({
      date: new Date(m.recordedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
      weight: m.weightKg,
    }));

  const latestWeight = measurements[0]?.weightKg ?? '--';
  const consumedCals = summary?.consumed?.calories ?? 0;
  const targetCals = summary?.target?.tdeeCalories ?? 2200;
  const remainingCals = summary?.remainingCalories ?? targetCals - consumedCals;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Panoramica Kaizen <Sparkles size={22} className="text-pink-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              "Migliorare dell'1% ogni giorno" — Il tuo stato odierno
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sincronizzato in Tempo Reale
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Calorie Card */}
          <div className="bg-[#131b26] border border-[#1f2b3d] p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Calorie Oggi</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <Flame size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-slate-100">
                {consumedCals} <span className="text-xs font-normal text-slate-400">/ {targetCals} kcal</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Rimanenti: <span className="font-semibold text-slate-200">{remainingCals} kcal</span>
              </p>
            </div>
          </div>

          {/* Peso Attuale */}
          <div className="bg-[#131b26] border border-[#1f2b3d] p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Peso Corporeo</span>
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                <Scale size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-slate-100">
                {latestWeight} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp size={14} /> Ultima registrazione
              </p>
            </div>
          </div>

          {/* Ultimo Allenamento */}
          <div className="bg-[#131b26] border border-[#1f2b3d] p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Ultimo Allenamento</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Dumbbell size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-lg font-bold text-slate-100 truncate">
                {latestWorkout?.dayNameSnapshot || 'Nessuna sessione'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {latestWorkout ? `${latestWorkout.durationMinutes || 0} min • ${latestWorkout.caloriesBurned || 0} kcal` : 'Inizia la prima sessione'}
              </p>
            </div>
          </div>

          {/* Kaizen Progress */}
          <div className="bg-[#131b26] border border-[#1f2b3d] p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Obiettivo Settimanale</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Target size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-slate-100">3/4</div>
              <p className="text-xs text-slate-400 mt-1">Sessioni completate</p>
            </div>
          </div>
        </div>

        {/* Charts & Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Peso (2 cols) */}
          <div className="lg:col-span-2 bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-200 mb-1">Andamento del Peso</h3>
            <p className="text-xs text-slate-400 mb-6">Ultime registrazioni storiche</p>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0b0f17', borderColor: '#1f2b3d', borderRadius: '12px' }}
                      itemStyle={{ color: '#f472b6', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="weight" stroke="#f472b6" strokeWidth={2} fillOpacity={1} fill="url(#weightGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Nessun dato sul peso disponibile
                </div>
              )}
            </div>
          </div>

          {/* Macro Breakdown (1 col) */}
          <div className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">Macronutrienti Odierni</h3>
              <p className="text-xs text-slate-400 mb-6">Ripartizione del cibo consumato</p>
              
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Proteine</span>
                    <span className="font-semibold">{summary?.consumed?.protein || 0}g</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-pink-400 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Carboidrati</span>
                    <span className="font-semibold">{summary?.consumed?.carbs || 0}g</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Grassi</span>
                    <span className="font-semibold">{summary?.consumed?.fat || 0}g</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 text-xs text-slate-400">
              Totale voci registrate: <span className="text-slate-200 font-semibold">{summary?.consumed?.totalEntries || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
