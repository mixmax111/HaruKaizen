'use client';

import React from 'react';
import { Database, RefreshCw, PlusCircle } from 'lucide-react';

interface TelemetryRibbonProps {
  daemonStatus?: string;
  version?: string;
  nodeAddress?: string;
  onExport?: () => void;
  onSync?: () => void;
  onLogActivity?: () => void;
}

export function TelemetryRibbon({
  daemonStatus = 'DAEMON ONLINE',
  version = 'v2.4.1-local-wal',
  nodeAddress = '127.0.0.1:8080',
  onExport,
  onSync,
  onLogActivity,
}: TelemetryRibbonProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pt-space-xs">
      <div>
        <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-surface">
          Overview & Telemetry
        </h1>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-space-xs">
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors"
        >
          <Database className="text-body-md text-outline w-4 h-4" />
          <span>Sovereign CSV / JSON</span>
        </button>
        <button
          type="button"
          onClick={onSync}
          className="flex items-center gap-1.5 px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors"
        >
          <RefreshCw className="text-body-md text-outline w-4 h-4" />
          <span>Sync HealthKit</span>
        </button>
        <button
          type="button"
          onClick={onLogActivity}
          className="flex items-center gap-1.5 px-space-md py-space-xs rounded bg-primary-container hover:bg-primary text-on-primary-container font-body-sm text-body-sm font-semibold shadow-[0_0_16px_-2px_rgba(16,185,129,0.35)] transition-all"
        >
          <PlusCircle className="text-body-md w-4 h-4" />
          <span>Log Activity</span>
        </button>
      </div>
    </div>
  );
}

