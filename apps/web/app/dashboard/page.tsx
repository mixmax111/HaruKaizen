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

  // TanStack React Query Hooks connecting to live NestJS REST API
  const { data: nutritionData, isLoading: isNutritionLoading } = useTelemetryNutrition();
  const { data: measurementsData, isLoading: isMeasurementsLoading } = useTelemetryMeasurements();
  const { data: workoutsData, isLoading: isWorkoutsLoading } = useTelemetryWorkouts();
  const { data: insightsData } = useTelemetryAiInsights();

  const handleCommitFastCapture = (value: string) => {
    setFastCaptureMessage(`Committed: ${value}`);
    setTimeout(() => setFastCaptureMessage(null), 3000);
  };

  // 1. Energetics & Caloric Equilibrium
  const caloriesConsumed = nutritionData?.totalCalories ?? 2450;
  const caloriesTarget = nutritionData?.calorieTarget ?? 2800;
  const caloriePercent = Math.min(100, Math.round((caloriesConsumed / caloriesTarget) * 100));

  // 2. Body Mass Metric
  const latestWeight =
    measurementsData && measurementsData.length > 0
      ? Number(measurementsData[0].weightKg)
      : 76.4;

  const startingWeight =
    measurementsData && measurementsData.length > 1
      ? Number(measurementsData[measurementsData.length - 1].weightKg)
      : 78.2;

  const netMassLoss = (latestWeight - startingWeight).toFixed(2);

  // 3. Workouts Sessions Formatting
  const formattedWorkouts: WorkoutSessionItem[] =
    workoutsData && workoutsData.length > 0
      ? workoutsData.slice(0, 3).map((w, idx) => ({
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
            `${w.durationMinutes || 60} min`,
            `${w.caloriesBurned || 450} kcal`,
            `${w.totalSets || 18} total sets`,
          ],
          topAchievement: {
            icon: 'check',
            text: w.topSetDescription || w.notes || 'Carico nominale completato',
          },
        }))
      : [
          {
            id: 'w1',
            name: 'Upper Body Hypertrophy',
            badge: {
              text: 'PR',
              isPR: true,
              className: 'bg-primary-container text-on-primary-container',
            },
            metrics: ['68 min', '482 kcal', '18 total sets'],
            topAchievement: {
              icon: 'check',
              text: 'Incline Dumbbell Press: 36kg × 8 reps',
            },
          },
          {
            id: 'w2',
            name: 'Zone 2 Aerobic Base',
            badge: {
              text: 'Cardio',
              isPR: false,
              className: 'bg-secondary-container text-on-secondary-container',
            },
            metrics: ['45 min', '390 kcal', 'Avg HR: 134 bpm'],
            topAchievement: {
              icon: 'heart',
              text: 'Concept2 Rower: 9,450m split 2:03',
            },
          },
          {
            id: 'w3',
            name: 'Legs & Core Overload',
            badge: {
              text: 'PR',
              isPR: true,
              className: 'bg-primary-container text-on-primary-container',
            },
            metrics: ['75 min', '560 kcal', '22 sets'],
            topAchievement: {
              icon: 'check',
              text: 'Barbell Back Squat: 140kg × 5 reps',
            },
          },
        ];

  // 4. Macro Partitioning
  const proteinCurrent = nutritionData?.totalProtein ?? 185;
  const proteinGoal = nutritionData?.proteinTarget ?? 200;
  const carbsCurrent = nutritionData?.totalCarbs ?? 230;
  const carbsGoal = nutritionData?.carbsTarget ?? 250;
  const fatCurrent = nutritionData?.totalFat ?? 58;
  const fatGoal = nutritionData?.fatTarget ?? 65;

  // 5. AI Insight
  const latestInsight = insightsData && insightsData.length > 0 ? insightsData[0] : null;

  return (
    <AppLayout breadcrumbs={['HaruKaizen', 'Telemetry', 'Dashboard']}>
      <div className="flex flex-col w-full gap-space-lg pb-space-2xl">
        {/* Fast Capture Notification Banner if committed */}
        {fastCaptureMessage && (
          <div className="bg-primary/10 border border-primary/30 text-primary text-xs px-4 py-2 rounded-lg font-mono flex items-center justify-between">
            <span>&gt; TELEMETRY_COMMITTED: {fastCaptureMessage}</span>
            <span className="text-[10px] text-outline">SYNCED_TO_WAL</span>
          </div>
        )}

        {/* 1. Top Level Command & Status Ribbon */}
        <TelemetryRibbon
          daemonStatus="DAEMON ONLINE"
          version="v2.4.1-local-wal"
          nodeAddress="127.0.0.1:8080"
          onExport={() => alert('Esportazione database SQLite / CSV completata.')}
          onSync={() => alert('Sincronizzazione HealthKit completata.')}
          onLogActivity={() => alert('Apertura sessione di log rapido.')}
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
            trendText="+140 kcal vs projected burn"
            trendIcon={TrendingUp}
            trendColorClass="text-primary"
            circularGauge={{
              percentage: caloriePercent,
            }}
            progress={{
              percentage: caloriePercent,
              colorClass: 'bg-primary',
            }}
            footerLeft="Maintenance: 2,710"
            footerRight={<span className="text-primary">Deficit: -350 kcal</span>}
          />

          {/* Tile 2: Training Microcycle */}
          <StatCard
            title="Training Microcycle"
            icon={Dumbbell}
            iconColorClass="text-secondary"
            value={
              workoutsData && workoutsData.length > 0
                ? `${workoutsData.length} / 6`
                : '5 / 6'
            }
            subtitle="sessions this cycle"
            trendText="Chest & Delts Hypertrophy (Today)"
            trendColorClass="text-on-surface-variant"
            statusBadge={{
              text: 'Streak: 18 days',
              icon: Flame,
              bgClass: 'bg-surface-container',
              colorClass: 'text-tertiary',
            }}
            footerRight="83% load target"
          />

          {/* Tile 3: Body Mass Metric */}
          <StatCard
            title="Body Mass Metric"
            icon={Scale}
            iconColorClass="text-primary"
            value={latestWeight.toFixed(1)}
            valueUnit="kg"
            trendText={`${Number(netMassLoss) <= 0 ? '' : '+'}${netMassLoss} kg 30d`}
            trendIcon={ArrowDown}
            trendColorClass="text-primary"
            subtitle={`7-Day Rolling Avg: ${(latestWeight + 0.2).toFixed(1)} kg`}
            statusBadge={{
              text: 'Optimal Cut Velocity',
              bgClass: 'bg-surface-container',
              colorClass: 'text-primary',
            }}
            footerRight="-0.32 kg/wk"
          />

          {/* Tile 4: CNS Readiness Index */}
          <StatCard
            title="CNS Readiness Index"
            icon={Moon}
            iconColorClass="text-secondary"
            value="92%"
            valueUnit="HRV 68ms"
            subtitle="Sleep: 8h 12m • RHR: 51 bpm"
            statusBadge={{
              text: 'Peak Hypertrophy State',
              bgClass: 'bg-secondary-container',
              colorClass: 'text-on-secondary-container',
            }}
            footerRight="SpO2: 98%"
          />
        </div>

        {/* 3. Main Telemetry Grid (8 Cols Analytics & 4 Cols Feeds) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Left Column: 8 Cols on Desktop */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* Trajectory Convergence Graph Panel */}
            <ChartWidget
              summaryMetrics={[
                {
                  label: 'Starting Mass',
                  value: `${startingWeight.toFixed(1)} kg`,
                  subtext: 'Sep 27, 2024',
                },
                {
                  label: 'Period Nadir',
                  value: `${(latestWeight - 0.2).toFixed(1)} kg`,
                  subtext: '48h post-refeed',
                },
                {
                  label: 'Net Mass Loss',
                  value: `${netMassLoss} kg`,
                  subtext: '-2.30% total body',
                },
                {
                  label: 'Projected Goal',
                  value: '74.5 kg',
                  subtext: 'Nov 18 (~24 Days)',
                },
              ]}
            />

            {/* Nutritional Macro Partitioning Strip */}
            <MacroPartition
              macros={[
                {
                  label: 'Protein (4 kcal/g)',
                  calPerG: '4 kcal/g',
                  currentG: proteinCurrent,
                  targetG: proteinGoal,
                  percentage: (proteinCurrent / proteinGoal) * 100,
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
                  percentage: (carbsCurrent / carbsGoal) * 100,
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
                  percentage: (fatCurrent / fatGoal) * 100,
                  totalKcal: fatCurrent * 9,
                  remainingG: Math.max(0, fatGoal - fatCurrent),
                  colorClass: 'text-tertiary',
                  barBgClass: 'bg-tertiary',
                },
              ]}
              onLogMeal={() => alert('Apertura dialog registrazione pasto.')}
            />
          </div>

          {/* Right Column: 4 Cols Machine Intelligence & Insights */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg">
            {/* AI Automated Insight with Live Data or Fallback */}
            <KaizenInsightCard
              title={latestInsight?.title || 'Metabolic Adaptation Identified'}
              summary={
                latestInsight?.summary ||
                'Your CNS recovery and sleep architecture are currently in the 94th percentile. Fatigue markers remain suppressed despite high density training.'
              }
              prescription={
                latestInsight?.prescription ||
                "Increase carbohydrate intake by +35g (140 kcal) prior to tomorrow morning's posterior chain overload to maximize power output without breaking weekly deficit."
              }
              onApply={() => alert('+35g Refeed applicato al fabbisogno di domani!')}
              onDismiss={() => alert('Insight archiviato.')}
            />

            {/* Workout History connected to TanStack Query */}
            <WorkoutHistoryList workouts={formattedWorkouts} />

            {/* Fast Capture Card */}
            <FastCaptureCard onCommit={handleCommitFastCapture} />
          </div>
        </div>

        {/* 4. Bottom Hardware & Telemetry Diagnostics Ribbon */}
        <HardwareDiagnosticsRibbon />
      </div>
    </AppLayout>
  );
}

