'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface KaizenInsightCardProps {
  engineVersion?: string;
  generatedAgo?: string;
  title?: string;
  summary?: string;
  prescription?: string;
  onApply?: () => void;
  onDismiss?: () => void;
}

export function KaizenInsightCard({
  engineVersion = 'Kaizen Engine v4',
  generatedAgo = 'Generated 42m ago',
  title = 'Metabolic Adaptation Identified',
  summary = 'Your CNS recovery and sleep architecture are currently in the 94th percentile. Fatigue markers remain suppressed despite high density training.',
  prescription = "Increase carbohydrate intake by +35g (140 kcal) prior to tomorrow morning's posterior chain overload to maximize power output without breaking weekly deficit.",
  onApply,
  onDismiss,
}: KaizenInsightCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-sm shadow-[0_0_24px_-4px_rgba(99,102,241,0.18)]">
      {/* Subtle Indigo Radiant Accent */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-secondary/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-data-sm text-label-data-sm font-semibold">
          <Sparkles className="text-body-sm w-3.5 h-3.5 animate-spin" />
          <span>{engineVersion}</span>
        </div>
        <span className="font-label-data-sm text-label-data-sm text-outline">
          {generatedAgo}
        </span>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <span className="font-headline-md text-headline-md font-semibold text-on-surface">
          {title}
        </span>
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
          {summary}
        </p>
        <div className="p-space-sm rounded bg-surface-container mt-1 font-body-sm text-body-sm text-on-surface leading-normal">
          <strong className="text-primary">Prescription: </strong>
          {prescription}
        </div>
      </div>

      <div className="flex items-center gap-space-xs pt-space-xs">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 py-1.5 px-space-sm rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-sm text-body-sm font-medium transition-colors text-center"
        >
          Apply +35g Refeed
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="py-1.5 px-space-sm rounded text-outline hover:text-on-surface font-body-sm text-body-sm transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

