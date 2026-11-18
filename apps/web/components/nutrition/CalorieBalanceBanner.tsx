'use client';

import React from 'react';
import { AlertTriangle, Info, Flame, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface CalorieBalanceBannerProps {
  summary: {
    consumed: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      isFiberIncomplete: boolean;
      fiberDisplay: string;
      totalEntries: number;
    };
    burnedCalories: number;
    targets: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      fiberG: number;
      targetMode: string;
      goalType: string;
      floorAdjustmentApplied?: boolean;
      advisoryWarnings?: string[];
      clinicalDisclaimer?: string;
    };
    balance: {
      effectiveTargetCalories: number;
      netEstimatedBalance?: number | null;
      estimatedNetBalance?: number | null;
      calorieBalanceMode: 'SIMPLE' | 'ACTIVE';
      isBalanceHidden?: boolean;
      isNetBalanceHidden?: boolean;
      hiddenReason?: string | null;
      recoveredBurnedCalories?: number;
      burnedCaloriesRecovered?: number;
    };
    fiberSummary?: {
      totalFiberG: number;
      isFiberIncomplete: boolean;
      displayValue: string;
      itemsWithFiberCount: number;
      totalItemsCount: number;
    };
  } | null;
}

export function CalorieBalanceBanner({ summary }: CalorieBalanceBannerProps) {
  if (!summary) return null;

  const { consumed, burnedCalories, targets, balance } = summary;

  const netBalance = balance.netEstimatedBalance !== undefined ? balance.netEstimatedBalance : balance.estimatedNetBalance;
  const isHidden = balance.isBalanceHidden !== undefined ? balance.isBalanceHidden : Boolean(balance.isNetBalanceHidden);
  const recoveredBurned = balance.recoveredBurnedCalories !== undefined ? balance.recoveredBurnedCalories : (balance.burnedCaloriesRecovered ?? 0);

  // Calcolo percentuali macro rispetto ai target
  const pPct = targets.proteinG > 0 ? Math.min(100, Math.round((consumed.protein / targets.proteinG) * 100)) : 0;
  const cPct = targets.carbsG > 0 ? Math.min(100, Math.round((consumed.carbs / targets.carbsG) * 100)) : 0;
  const fPct = targets.fatG > 0 ? Math.min(100, Math.round((consumed.fat / targets.fatG) * 100)) : 0;
  const fibPct = targets.fiberG > 0 ? Math.min(100, Math.round((consumed.fiber / targets.fiberG) * 100)) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Disclaimer clinico obbligatorio */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Info size={13} className="text-slate-500 shrink-0" />
          {targets.clinicalDisclaimer ||
            "HaruKaizen non fornisce pareri medici e non sostituisce un medico, un dietista o un nutrizionista qualificato."}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          Modo: {targets.targetMode} ({targets.goalType})
        </span>
      </div>

      {/* Avviso Pavimento Calorico */}
      {targets.floorAdjustmentApplied && (
        <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Pavimento calorico fisiologico applicato</p>
            <p className="text-amber-300/80 text-[11px] mt-0.5">
              Il target calorico giornaliero è stato elevato per rispettare la soglia minima di sicurezza
              metabolica (1200 kcal F / 1500 kcal M) ed evitare alterazioni ormonali o carenze nutrizionali.
            </p>
          </div>
        </div>
      )}

      {/* Avvisi del motore target (es. gruppi speciali / età) */}
      {targets.advisoryWarnings && targets.advisoryWarnings.length > 0 && (
        <div className="bg-sky-950/30 border border-sky-600/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-sky-200">
          <ShieldAlert size={16} className="text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {targets.advisoryWarnings.map((warn, i) => (
              <p key={i} className="text-[11px] text-sky-200/90 leading-tight">
                {warn}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Griglia KPI Bilancio Energetico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Target Effettivo */}
        <div className="bg-[#131b26] border border-[#1f2b3d] p-4 rounded-xl flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-medium flex items-center justify-between">
            Target Effettivo
            <Sparkles size={14} className="text-pink-400" />
          </span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-100">{balance.effectiveTargetCalories}</span>
            <span className="text-slate-500 text-xs ml-1">kcal</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            {balance.calorieBalanceMode === 'ACTIVE'
              ? `Base ${targets.calories} + ${recoveredBurned} rec`
              : 'Modalità Simple (TDEE base)'}
          </span>
        </div>

        {/* Card 2: Calorie Mangiate */}
        <div className="bg-[#131b26] border border-[#1f2b3d] p-4 rounded-xl flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-medium flex items-center justify-between">
            Mangiate
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400">{consumed.calories}</span>
            <span className="text-slate-500 text-xs ml-1">kcal</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full ${
                consumed.calories > balance.effectiveTargetCalories ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{
                width: `${Math.min(100, Math.round((consumed.calories / balance.effectiveTargetCalories) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Card 3: Calorie Bruciate */}
        <div className="bg-[#131b26] border border-[#1f2b3d] p-4 rounded-xl flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-medium flex items-center justify-between">
            Bruciate (Attività)
            <Flame size={14} className="text-orange-400" />
          </span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-orange-400">{burnedCalories}</span>
            <span className="text-slate-500 text-xs ml-1">kcal</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            {balance.calorieBalanceMode === 'SIMPLE'
              ? 'Incluso in TDEE (no doppio conteggio)'
              : `Recupero: +${recoveredBurned} kcal`}
          </span>
        </div>

        {/* Card 4: Bilancio Netto Stimato */}
        <div className="bg-[#131b26] border border-[#1f2b3d] p-4 rounded-xl flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-medium flex items-center justify-between">
            Bilancio Netto Stimato
            <Activity size={14} className="text-sky-400" />
          </span>
          <div className="mt-2">
            {isHidden ? (
              <div>
                <span className="text-sm font-semibold text-slate-400 italic">Non applicabile</span>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{balance.hiddenReason || 'Nascosto per tutela fisiologica'}</p>
              </div>
            ) : (
              <>
                <span
                  className={`text-2xl font-bold ${
                    (netBalance ?? 0) <= 0 ? 'text-sky-400' : 'text-amber-400'
                  }`}
                >
                  {(netBalance ?? 0) > 0 ? `+${netBalance}` : netBalance}
                </span>
                <span className="text-slate-500 text-xs ml-1">kcal</span>
              </>
            )}
          </div>
          {!isHidden && (
            <span className="text-[10px] text-slate-500 mt-1">
              {(netBalance ?? 0) < 0 ? 'In deficit energetico' : 'In surplus / pareggio'}
            </span>
          )}
        </div>
      </div>

      {/* Ripartizione Macronutrienti & Fibre */}
      <div className="bg-[#131b26] border border-[#1f2b3d] p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Macronutrienti & Fibre</h4>
          {consumed.isFiberIncomplete && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Fibre n.d. (dato parziale: {consumed.fiberDisplay})
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {/* Proteine */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span className="font-medium text-slate-300">Proteine</span>
              <span>
                <b className="text-slate-100">{consumed.protein}g</b> / {targets.proteinG}g
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-pink-500 h-full rounded-full transition-all" style={{ width: `${pPct}%` }} />
            </div>
          </div>

          {/* Carboidrati */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span className="font-medium text-slate-300">Carboidrati</span>
              <span>
                <b className="text-slate-100">{consumed.carbs}g</b> / {targets.carbsG}g
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-sky-400 h-full rounded-full transition-all" style={{ width: `${cPct}%` }} />
            </div>
          </div>

          {/* Grassi */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span className="font-medium text-slate-300">Grassi</span>
              <span>
                <b className="text-slate-100">{consumed.fat}g</b> / {targets.fatG}g
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${fPct}%` }} />
            </div>
          </div>

          {/* Fibre */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span className="font-medium text-slate-300">Fibre</span>
              <span>
                <b className="text-slate-100">{consumed.fiberDisplay}</b> / {targets.fiberG}g
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${fibPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

