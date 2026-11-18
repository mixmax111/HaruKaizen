'use client';

import React from 'react';
import { History, Star, Check, HeartPulse, ArrowRight, Dumbbell } from 'lucide-react';
import Link from 'next/link';

export interface WorkoutSessionItem {
  id: string;
  name: string;
  badge?: {
    text: string;
    isPR?: boolean;
    className?: string;
  };
  metrics: string[];
  topAchievement: {
    icon?: 'check' | 'heart';
    text: string;
  };
}

interface WorkoutHistoryListProps {
  title?: string;
  subtitle?: string;
  workouts?: WorkoutSessionItem[];
  viewAllLink?: string;
  viewAllText?: string;
}

export function WorkoutHistoryList({
  title = 'Recent Workouts',
  subtitle = 'Volume Tracking',
  workouts = [],
  viewAllLink = '/workouts',
  viewAllText = 'Visualizza tutte le sessioni',
}: WorkoutHistoryListProps) {
  return (
    <div className="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-md shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="text-body-lg text-outline w-5 h-5" />
          <span className="font-headline-md text-headline-md font-semibold text-on-surface">
            {title}
          </span>
        </div>
        <span className="font-label-caps text-label-caps uppercase text-outline">
          {subtitle}
        </span>
      </div>

      {/* Workout Entries or Empty State */}
      {workouts.length === 0 ? (
        <div className="py-6 px-4 rounded-lg bg-surface-container/40 border border-surface-container-high/40 text-center flex flex-col items-center justify-center gap-2">
          <Dumbbell className="w-6 h-6 text-outline opacity-40" />
          <p className="text-xs text-on-surface font-medium">Nessuna sessione registrata</p>
          <p className="text-[11px] text-outline max-w-xs">
            Inizia il Live Gym Logger per monitorare carichi, serie e progressive overload in tempo reale.
          </p>
          <Link
            href="/workouts/live"
            className="mt-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-colors"
          >
            Avvia Workout Live
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-space-xs">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className="p-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-body-md text-body-md font-semibold text-on-surface">
                  {workout.name}
                </span>
                {workout.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded font-label-data-sm text-label-data-sm font-bold flex items-center gap-1 ${workout.badge.className}`}
                  >
                    {workout.badge.isPR && <Star className="text-body-sm w-3 h-3 fill-current" />}
                    {workout.badge.text}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 font-label-data-sm text-label-data-sm text-outline">
                {workout.metrics.map((metric, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span>•</span>}
                    <span>{metric}</span>
                  </React.Fragment>
                ))}
              </div>

              <div className="pt-0.5 font-label-data-sm text-label-data-sm text-primary flex items-center gap-1">
                {workout.topAchievement.icon === 'heart' ? (
                  <HeartPulse className="text-body-sm text-secondary w-3.5 h-3.5" />
                ) : (
                  <Check className="text-body-sm text-primary w-3.5 h-3.5" />
                )}
                <span
                  className={
                    workout.topAchievement.icon === 'heart'
                      ? 'text-outline'
                      : 'text-primary'
                  }
                >
                  {workout.topAchievement.text}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {workouts.length > 0 && (
        <Link
          href={viewAllLink}
          className="flex items-center justify-between pt-space-xs text-outline hover:text-on-surface font-label-data-sm text-label-data-sm transition-colors"
        >
          <span>{viewAllText}</span>
          <ArrowRight className="text-body-sm w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
