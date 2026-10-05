'use client';

import React from 'react';
import { Calendar, ChevronDown, Plus, Bell } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface TopHeaderProps {
  breadcrumbs?: string[];
  onQuickLog?: () => void;
}

export function TopHeader({
  breadcrumbs = ['HaruKaizen', 'Telemetry', 'Dashboard'],
  onQuickLog,
}: TopHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-margin-desktop border-b border-surface-container-high/40">
      {/* Breadcrumb Path */}
      <div className="flex items-center gap-space-sm font-label-data-sm text-label-data-sm text-outline">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb}>
              {idx > 0 && <span>/</span>}
              <span
                className={
                  isLast
                    ? 'text-primary font-medium'
                    : idx === 0
                    ? 'text-on-surface font-semibold'
                    : ''
                }
              >
                {crumb}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Control Actions & Diagnostics */}
      <div className="flex items-center gap-space-md">
        {/* Docker Ping Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-space-sm py-space-xs rounded bg-surface-container font-label-data-sm text-label-data-sm text-outline">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-on-surface">12ms</span>
          <span>Docker Local</span>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded bg-surface-container font-label-data-sm text-label-data-sm text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors">
          <Calendar className="text-body-md text-outline w-4 h-4" />
          <span>Last 30 Days</span>
          <ChevronDown className="text-body-sm text-outline w-3.5 h-3.5" />
        </div>

        {/* Quick Log Primary Action */}
        <button
          type="button"
          onClick={onQuickLog}
          className="flex items-center gap-1.5 px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-medium shadow-[0_0_16px_-2px_rgba(16,185,129,0.25)] hover:bg-primary transition-colors"
        >
          <Plus className="text-body-md w-4 h-4" />
          <span>Quick Log</span>
        </button>

        {/* Alerts & Notification Ping */}
        <button
          type="button"
          aria-label="Notifiche"
          className="relative p-space-xs rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          <Bell className="text-body-lg w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tertiary-container"></span>
        </button>

        {/* User Mini Avatar */}
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/50 flex items-center justify-center font-label-data-sm font-bold text-primary">
          {user?.email ? user.email.slice(0, 2).toUpperCase() : 'HK'}
        </div>
      </div>
    </header>
  );
}

