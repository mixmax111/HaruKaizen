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
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary-container/80 text-on-secondary-container font-mono text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>{engineVersion}</span>
        </div>
        <span className="font-mono text-xs text-outline">
          {generatedAgo}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        <h3 className="font-sans text-base font-semibold text-on-surface">
          {title}
        </h3>
        <p className="font-sans text-sm text-slate-300 leading-relaxed">
          {summary}
        </p>
        <div className="p-3 rounded-lg bg-surface-container mt-1 font-sans text-sm text-slate-200 leading-relaxed border border-surface-container-high/40">
          <strong className="text-primary font-semibold">Prescription: </strong>
          {prescription}
        </div>
      </div>

      <div className="flex items-center gap-space-xs pt-space-xs">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 py-1.5 px-space-sm rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans text-xs font-semibold transition-colors text-center cursor-pointer"
        >
          Applica Raccomandazione
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="py-1.5 px-space-sm rounded text-outline hover:text-on-surface font-sans text-xs transition-colors cursor-pointer"
        >
          Archivia
        </button>
      </div>
    </div>
  );
}
