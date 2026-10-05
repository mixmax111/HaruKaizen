'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface HardwareDiagnosticsProps {
  sqliteLatency?: string;
  containerUptime?: string;
  bridgeStatus?: string;
  walSize?: string;
  backupSchedule?: string;
}

export function HardwareDiagnosticsRibbon({
  sqliteLatency = '0.8ms query latency',
  containerUptime = 'Up 42 days (0 restarts)',
  bridgeStatus = 'Sync completed 3m ago',
  walSize = '2.1 MB',
  backupSchedule = '02:00 UTC Daily',
}: HardwareDiagnosticsProps) {
  return (
    <div className="rounded-xl bg-surface-container-low p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-space-lg">
        {/* SQLite Latency */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span className="font-label-caps text-label-caps uppercase text-outline">
            SQLite Engine:
          </span>
          <span className="font-label-data-sm text-label-data-sm text-on-surface font-semibold">
            {sqliteLatency}
          </span>
        </div>

        {/* Docker Uptime */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span className="font-label-caps text-label-caps uppercase text-outline">
            Container State:
          </span>
          <span className="font-label-data-sm text-label-data-sm text-on-surface">
            {containerUptime}
          </span>
        </div>

        {/* HealthKit Bridge */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="font-label-caps text-label-caps uppercase text-outline">
            HealthKit Bridge:
          </span>
          <span className="font-label-data-sm text-label-data-sm text-on-surface">
            {bridgeStatus}
          </span>
        </div>
      </div>

      {/* Storage Footprint */}
      <div className="flex items-center gap-3 font-label-data-sm text-label-data-sm text-outline">
        <span>WAL Size: {walSize}</span>
        <span>•</span>
        <span>Backups: {backupSchedule}</span>
        <span>•</span>
        <span className="text-primary flex items-center gap-1">
          <ShieldCheck className="text-body-sm w-3.5 h-3.5" />
          Self-Contained
        </span>
      </div>
    </div>
  );
}

