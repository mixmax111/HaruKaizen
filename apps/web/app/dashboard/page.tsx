'use client';

import React, { useState } from 'react';
import { AppLayout } from '../../components/layout/app-layout';
import {
  useTelemetryNutrition,
  useTelemetryMeasurements,
  useTelemetryWorkouts,
  useTelemetryAiInsights,
} from '../../lib/queries/telemetry';
import { TelemetryRibbon } from '../../components/telemetry/telemetry-ribbon';
import { StatCard } from '../../components/telemetry/stat-card';
import { ChartWidget } from '../../components/telemetry/chart-widget';
import { MacroPartition } from '../../components/telemetry/macro-partition';
import { KaizenInsightCard } from '../../components/telemetry/kaizen-insight-card';
import { WorkoutHistoryList, WorkoutSessionItem } from '../../components/telemetry/workout-history-list';
import { FastCaptureCard } from '../../components/telemetry/fast-capture-card';
import { HardwareDiagnosticsRibbon } from '../../components/telemetry/hardware-diagnostics-ribbon';
import { CsvPortabilityModal } from '../../components/portability/CsvPortabilityModal';
import { ProfileSettingsModal } from '../../components/profile/ProfileSettingsModal';
import { AdvancedFastCaptureModal } from '../../components/nutrition/AdvancedFastCaptureModal';
import {
  Flame,
  TrendingUp,
  Dumbbell,
  Scale,
  ArrowDown,
  Moon,
} from 'lucide-react';

export default function DashboardPage() {
  const [fastCaptureMessage, setFastCaptureMessage] = useState<string | null>(null);
  const [isPortabilityModalOpen, setIsPortabilityModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFastCaptureModalOpen, setIsFastCaptureModalOpen] = useState(false);

  // TanStack React Query Hooks connecting to live NestJS REST API
  const { data: nutritionData } = useTelemetryNutrition();
  const { data: measurementsData } = useTelemetryMeasurements();
  const { data: workoutsData } = useTelemetryWorkouts();
  const { data: insightsData } = useTelemetryAiInsights();

  const handleCommitFastCapture = (value: string) => {
    setFastCaptureMessage(`Registrato con successo: ${value}`);
    setTimeout(() => setFastCaptureMessage(null), 3500);
  };

  // 1. Energetics & Caloric Equilibrium (Live or Zero)
  const caloriesConsumed = nutritionData?.totalCalories ?? 0;
  const caloriesTarget = nutritionData?.calorieTarget ?? 2200;
  const caloriePercent =
    caloriesTarget > 0
      ? Math.min(100, Math.round((caloriesConsumed / caloriesTarget) * 100))
      : 0;

  // 2. Body Mass Metric (Pure dynamic from live telemetry)
  const hasMeasurements = Boolean(measurementsData && measurementsData.length > 0);
  const latestWeight = hasMeasurements
    ? Number(measurementsData![0].weightKg)
    : null;

  const startingWeight =
    measurementsData && measurementsData.length > 1
      ? Number(measurementsData[measurementsData.length - 1].weightKg)
      : latestWeight;

  const netMassLoss =
    latestWeight !== null && startingWeight !== null
      ? (latestWeight - startingWeight).toFixed(2)
      : '0.00';

  // 3. Workouts Sessions Formatting (Purged mock data)
  const formattedWorkouts: WorkoutSessionItem[] =
    workoutsData && workoutsData.length > 0
      ? workoutsData.slice(0, 5).map((w, idx) => ({
          id: w.id || `w-${idx}`,
          name: w.name || `Sessione #${idx + 1}`,
          badge: {
            text: w.isPR ? 'PR' : 'Log',
            isPR: Boolean(w.isPR),
            className: w.isPR
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-secondary-container text-on-secondary-container',
          },
          metrics: [
            `${w.durationMinutes || 0} min`,
            `${w.caloriesBurned || 0} kcal`,
            `${w.totalSets || 0} total sets`,
          ],
          topAchievement: {
            icon: 'check',
            text: w.topSetDescription || w.notes || 'Sessione completata',
          },
        }))
      : [];

  // 4. Macro Partitioning (Live or Zero)
  const proteinCurrent = nutritionData?.totalProtein ?? 0;
  const proteinGoal = nutritionData?.proteinTarget ?? 160;
  const carbsCurrent = nutritionData?.totalCarbs ?? 0;
  const carbsGoal = nutritionData?.carbsTarget ?? 220;
  const fatCurrent = nutritionData?.totalFat ?? 0;
  const fatGoal = nutritionData?.fatTarget ?? 60;

  // 5. AI Insight (Live or Contextual Default)
  const latestInsight = insightsData && insightsData.length > 0 ? insightsData[0] : null;

  return (
    <AppLayout breadcrumbs={['HaruKaizen', 'Telemetry', 'Dashboard']}>
      <div className="flex flex-col w-full gap-space-lg pb-space-2xl">
        {/* Fast Capture Notification Banner if committed */}
        {fastCaptureMessage && (
          <div className="bg-primary/10 border border-primary/30 text-primary text-xs px-4 py-2 rounded-lg font-sans flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-primary font-bold">✓</span>
              <span>{fastCaptureMessage}</span>
            </span>
            <span className="font-mono text-[11px] text-primary/80">Sincronizzato</span>
          </div>
        )}

        {/* 1. Top Level Command & Status Ribbon */}
        <TelemetryRibbon
          onExport={() => setIsPortabilityModalOpen(true)}
          onSync={() => setIsPortabilityModalOpen(true)}
          onLogActivity={() => setIsFastCaptureModalOpen(true)}
        />

        {/* 2. KPI Grid (4 High-Density Instrumentation Tiles) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Tile 1: Energy Equilibrium */}
          <StatCard
            title="Energy Equilibrium"
            icon={Flame}
            iconColorClass="text-primary"
            value={caloriesConsumed.toLocaleString()}
            valueUnit={`/ ${caloriesTarget.toLocaleString()} kcal`}
            trendText={
              caloriesConsumed > 0
                ? `${caloriesConsumed >= caloriesTarget ? '+' : ''}${
                    caloriesConsumed - caloriesTarget
                  } kcal vs target`
                : 'Nessun log per oggi'
            }
            trendIcon={TrendingUp}
            trendColorClass="text-primary"
            circularGauge={{
              percentage: caloriePercent,
            }}
            progress={{
              percentage: caloriePercent,
              colorClass: 'bg-primary',
            }}
            footerLeft={`Target: ${caloriesTarget} kcal`}
            footerRight={
              <span className="text-primary font-medium">
                {caloriePercent}% completato
              </span>
            }
          />

          {/* Tile 2: Training Microcycle */}
          <StatCard
            title="Training Microcycle"
            icon={Dumbbell}
            iconColorClass="text-secondary"
            value={
              workoutsData && workoutsData.length > 0
                ? String(workoutsData.length)
                : '0'
            }
            valueUnit="/ 5 sessioni"
            subtitle="Microciclo settimanale"
            trendText={
              workoutsData && workoutsData.length > 0
                ? 'Sessioni completate'
                : 'Nessuna sessione ancora'
            }
            trendColorClass="text-on-surface-variant"
            statusBadge={
              workoutsData && workoutsData.length > 0
                ? {
                    text: 'In Corso',
                    icon: Flame,
                    bgClass: 'bg-surface-container',
                    colorClass: 'text-tertiary',
                  }
                : undefined
            }
            footerRight="Target microciclo"
          />

          {/* Tile 3: Body Mass Metric */}
          <StatCard
            title="Body Mass Metric"
            icon={Scale}
            iconColorClass="text-primary"
            value={latestWeight !== null ? latestWeight.toFixed(1) : '--'}
            valueUnit={latestWeight !== null ? 'kg' : ''}
            trendText={
              latestWeight !== null
                ? `${Number(netMassLoss) <= 0 ? '' : '+'}${netMassLoss} kg traiettoria`
                : 'Registra la prima pesata'
            }
            trendIcon={ArrowDown}
            trendColorClass="text-primary"
            subtitle={
              latestWeight !== null
                ? `Ultimo rilevamento: ${latestWeight.toFixed(1)} kg`
                : 'Nessuna misurazione'
            }
            footerRight={
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="text-[11px] text-primary hover:underline font-sans cursor-pointer font-medium"
              >
                + Aggiorna peso
              </button>
            }
          />

          {/* Tile 4: CNS Readiness Index */}
          <StatCard
            title="CNS Readiness Index"
            icon={Moon}
            iconColorClass="text-secondary"
            value="94%"
            valueUnit="Readiness"
            subtitle="Recupero neurale ottimale • HRV 68ms"
            statusBadge={{
              text: 'Peak State',
              bgClass: 'bg-secondary/15',
              colorClass: 'text-secondary',
            }}
            footerRight="Sonno: 8h 12m"
          />
        </div>

        {/* 3. Main Telemetry Grid (8 Cols Analytics & 4 Cols Feeds) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Left Column: 8 Cols on Desktop */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* Trajectory Convergence Graph Panel with live measurements */}
            <ChartWidget
              measurements={measurementsData || []}
              onLogWeight={() => setIsProfileModalOpen(true)}
            />

            {/* Nutritional Macro Partitioning Strip */}
            <MacroPartition
              macros={[
                {
                  label: 'Protein (4 kcal/g)',
                  calPerG: '4 kcal/g',
                  currentG: proteinCurrent,
                  targetG: proteinGoal,
                  percentage: proteinGoal > 0 ? (proteinCurrent / proteinGoal) * 100 : 0,
                  totalKcal: proteinCurrent * 4,
                  remainingG: Math.max(0, proteinGoal - proteinCurrent),
                  colorClass: 'text-primary',
                  barBgClass: 'bg-primary',
                },
                {
                  label: 'Carbohydrates',
                  calPerG: '4 kcal/g',
                  currentG: carbsCurrent,
                  targetG: carbsGoal,
                  percentage: carbsGoal > 0 ? (carbsCurrent / carbsGoal) * 100 : 0,
                  totalKcal: carbsCurrent * 4,
                  remainingG: Math.max(0, carbsGoal - carbsCurrent),
                  colorClass: 'text-secondary',
                  barBgClass: 'bg-secondary',
                },
                {
                  label: 'Lipids / Fats',
                  calPerG: '9 kcal/g',
                  currentG: fatCurrent,
                  targetG: fatGoal,
                  percentage: fatGoal > 0 ? (fatCurrent / fatGoal) * 100 : 0,
                  totalKcal: fatCurrent * 9,
                  remainingG: Math.max(0, fatGoal - fatCurrent),
                  colorClass: 'text-tertiary',
                  barBgClass: 'bg-tertiary',
                },
              ]}
              onLogMeal={() => setIsFastCaptureModalOpen(true)}
            />
          </div>

          {/* Right Column: 4 Cols Machine Intelligence & Insights */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg">
            {/* AI Automated Insight with Live Data or Fallback */}
            <KaizenInsightCard
              title={latestInsight?.title || 'Adattamento Metabolico Rilevato'}
              summary={
                latestInsight?.summary ||
                'Il recupero del sistema nervoso centrale e i parametri di riposo sono nella media ottimale. I marcatori di affaticamento rimangono stabili.'
              }
              prescription={
                latestInsight?.prescription ||
                "Incrementa l'apporto di carboidrati (+35g) prima del prossimo allenamento per massimizzare la prestazione senza eccedere il target calorico."
              }
              onApply={() => alert('Raccomandazione applicata al piano!')}
              onDismiss={() => alert('Insight archiviato.')}
            />

            {/* Workout History connected to TanStack Query (no mock items) */}
            <WorkoutHistoryList workouts={formattedWorkouts} />

            {/* Fast Capture Card opening modal */}
            <FastCaptureCard onCommit={() => setIsFastCaptureModalOpen(true)} />
          </div>
        </div>

        {/* 4. Bottom Hardware & Telemetry Diagnostics Ribbon */}
        <HardwareDiagnosticsRibbon />

        {/* 5. Universal CSV & XLSX Portability Modal */}
        <CsvPortabilityModal
          isOpen={isPortabilityModalOpen}
          onClose={() => setIsPortabilityModalOpen(false)}
        />

        {/* 6. Profile Settings & Weight Modal */}
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          initialWeight={latestWeight || undefined}
        />

        {/* 7. Advanced Fast Capture & Recipes Modal */}
        <AdvancedFastCaptureModal
          isOpen={isFastCaptureModalOpen}
          onClose={() => setIsFastCaptureModalOpen(false)}
          onSuccess={handleCommitFastCapture}
        />
      </div>
    </AppLayout>
  );
}
