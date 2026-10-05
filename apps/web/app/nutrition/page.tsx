'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/app-layout';
import { apiClient } from '../../lib/api';
import { Apple, Search, Plus, Utensils, Flame } from 'lucide-react';

export default function NutritionPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [quantityG, setQuantityG] = useState(100);

  const today = new Date().toISOString().split('T')[0];

  const fetchNutrition = async () => {
    const [logsRes, sumRes] = await Promise.all([
      apiClient.get(`/nutrition/logs?date=${today}`),
      apiClient.get(`/nutrition/summary?date=${today}`),
    ]);
    setLogs(logsRes.data.data || []);
    setSummary(sumRes.data.data || null);
  };

  useEffect(() => {
    fetchNutrition();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const res = await apiClient.get(`/food/search?q=${searchQuery}`);
    setSearchResults(res.data.data || []);
  };

  const handleLogFood = async () => {
    if (!selectedFood) return;
    await apiClient.post('/nutrition/logs', {
      foodItemId: selectedFood.id,
      quantityG: Number(quantityG),
      mealType: 'LUNCH',
      loggedAt: new Date().toISOString(),
    });
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    fetchNutrition();
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Diario Alimentare & Nutrizione <Apple size={22} className="text-pink-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Traccia il cibo consumato e mantieni il controllo calorico sul tuo TDEE
          </p>
        </div>

        {/* Ricerca e Inserimento Alimenti */}
        <div className="bg-[#131b26] border border-[#1f2b3d] p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Registra Alimento</h3>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca alimento nel database o scannerizza..."
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500 transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Cerca
            </button>
          </form>

          {/* Risultati Ricerca */}
          {searchResults.length > 0 && (
            <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 mb-4 max-h-48 overflow-y-auto">
              {searchResults.map((food) => (
                <div
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className={`p-3 text-xs flex justify-between items-center cursor-pointer transition ${
                    selectedFood?.id === food.id ? 'bg-pink-500/10 text-pink-300' : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <span className="font-medium">{food.name}</span>
                  <span className="text-slate-500">{food.calories100g} kcal / 100g</span>
                </div>
              ))}
            </div>
          )}

          {/* Porzione e Conferma */}
          {selectedFood && (
            <div className="bg-[#0b0f17] border border-pink-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs">
                <span className="font-bold text-pink-400">{selectedFood.name}</span>
                <p className="text-slate-500 mt-0.5">
                  Pro: {selectedFood.protein100g}g • Carb: {selectedFood.carbs100g}g • Fat: {selectedFood.fat100g}g (per 100g)
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="number"
                  min="1"
                  value={quantityG}
                  onChange={(e) => setQuantityG(Number(e.target.value))}
                  className="w-24 bg-[#131b26] border border-[#1f2b3d] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  placeholder="Grammi"
                />
                <button
                  onClick={handleLogFood}
                  className="px-4 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold transition shrink-0"
                >
                  Registra Pasto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista Pasti Registrati Oggi */}
        <div className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Pasti Registrati Oggi ({today})</h3>
          <div className="divide-y divide-slate-800">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200">
                      {log.foodItem?.name || log.customFoodName}
                    </span>
                    <span className="text-slate-500 ml-2">({log.quantityG}g)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">{log.mealType}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-pink-400">{log.caloriesConsumed} kcal</span>
                    <p className="text-[10px] text-slate-500">
                      P: {log.proteinConsumed}g • C: {log.carbsConsumed}g • F: {log.fatConsumed}g
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4">Nessun pasto registrato per oggi.</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
