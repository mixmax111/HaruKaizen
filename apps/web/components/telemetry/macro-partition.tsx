'use client';

import React from 'react';
import { Apple, CheckCircle2, ArrowRight } from 'lucide-react';

export interface MacroItem {
  label: string;
  calPerG: string;
  currentG: number;
  targetG: number;
  percentage: number;
  totalKcal: number;
  remainingG: number;
  colorClass: string;
  barBgClass: string;
}

interface MacroPartitionProps {
  title?: string;
  subtitle?: string;
  macros?: MacroItem[];
  footerNote?: string;
  onLogMeal?: () => void;
}

export function MacroPartition({
  title = 'Nutritional Macro Partitioning',
  subtitle = 'Daily Targets • High-Protein Cut',
  macros = [
    {
      label: 'Protein (4 kcal/g)',
      calPerG: '4 kcal/g',
      currentG: 185,
      targetG: 200,
      percentage: 92.5,
      totalKcal: 740,
      remainingG: 15,
      colorClass: 'text-primary',
      barBgClass: 'bg-primary',
    },
    {
      label: 'Carbohydrates',
      calPerG: '4 kcal/g',
      currentG: 230,
      targetG: 250,
      percentage: 92.0,
      totalKcal: 920,
      remainingG: 20,
      colorClass: 'text-secondary',
      barBgClass: 'bg-secondary',
    },
    {
      label: 'Lipids / Fats',
      calPerG: '9 kcal/g',
      currentG: 58,
      targetG: 65,
      percentage: 89.2,
      totalKcal: 522,
      remainingG: 7,
      colorClass: 'text-tertiary',
      barBgClass: 'bg-tertiary',
    },
  ],
  footerNote = 'Fiber: 38g • Water: 3.4L • Micronutrient Density: Optimal',
  onLogMeal,
}: MacroPartitionProps) {
  return (
    <div className="rounded-xl bg-surface-container-low p-space-lg flex flex-col gap-space-md shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <Apple className="text-body-lg text-primary w-5 h-5" />
          <span className="font-headline-md text-headline-md font-semibold text-on-surface">
            {title}
          </span>
        </div>
        <span className="font-label-data-sm text-label-data-sm text-outline">
          {subtitle}
        </span>
      </div>

      {/* Grid of 3 Macros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {macros.map((macro, idx) => (
          <div
            key={idx}
            className="p-space-sm rounded bg-surface-container flex flex-col gap-space-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps uppercase text-outline">
                {macro.label}
              </span>
              <span
                className={`font-label-data-sm text-label-data-sm font-semibold ${macro.colorClass}`}
              >
                {macro.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-label-data-md text-label-data-md text-on-surface font-bold">
                {macro.currentG} g
              </span>
              <span className="font-label-data-sm text-label-data-sm text-outline">
                Goal: {macro.targetG} g
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div
                className={`${macro.barBgClass} h-full rounded-full`}
                style={{ width: `${Math.min(100, macro.percentage)}%` }}
              ></div>
            </div>
            <div className="flex justify-between font-label-data-sm text-label-data-sm text-outline">
              <span>{macro.totalKcal} kcal</span>
              <span className="text-on-surface-variant">
                {macro.remainingG}g remaining
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Log Micro-bar */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs font-label-data-sm text-label-data-sm text-outline">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-body-md text-primary w-4 h-4" />
          <span className="text-on-surface">{footerNote}</span>
        </div>
        <button
          type="button"
          onClick={onLogMeal}
          className="text-primary hover:underline flex items-center gap-1 font-label-data-sm"
        >
          <span>Log Meal or Snack</span>
          <ArrowRight className="text-body-sm w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

