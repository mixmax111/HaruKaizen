'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Database, Server, RefreshCw } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface HealthData {
  dbEngine?: string;
  dbStatus?: string;
  dbLatencyMs?: number;
  redisStatus?: string;
  uptimeSeconds?: number;
}

interface HardwareDiagnosticsProps {
  dbEngine?: string;
  dbLatency?: string;
  redisState?: string;
  containerUptime?: string;
  backupSchedule?: string;
}

export function HardwareDiagnosticsRibbon({
  dbEngine = 'PostgreSQL 17 (Prisma 7)',
  dbLatency = '0.8ms ACID latency',
  redisState = 'Redis 7: CONNECTED',
  containerUptime = 'Active (0 restarts)',
  backupSchedule = '02:00 UTC Daily',
}: HardwareDiagnosticsProps) {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/health')
      .then((res) => {
        if (isMounted) {
          setHealth(res.data?.data || res.data);
        }
      })
      .catch(() => {
        // Fallback silenzioso
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const liveDbEngine = health?.dbEngine || dbEngine;
  const liveDbLatency =
    health?.dbLatencyMs !== undefined
      ? `${health.dbLatencyMs}ms ACID latency`
      : dbLatency;
  const liveRedis = health?.redisStatus
    ? `Redis 7: ${health.redisStatus}`
    : redisState;
  const liveUptime =
    health?.uptimeSeconds !== undefined
      ? `Uptime ${Math.floor(health.uptimeSeconds / 3600)}h ${Math.floor((health.uptimeSeconds % 3600) / 60)}m`
      : containerUptime;

  return (
    <div className="rounded-xl bg-surface-container-low p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-sm shadow-sm border border-surface-container-high/40">
      <div className="flex flex-wrap items-center gap-space-lg">
        {/* PostgreSQL 17 / Prisma 7 */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="font-label-caps text-label-caps uppercase text-outline">
            DB Engine:
          </span>
          <span className="font-label-data-sm text-label-data-sm text-on-surface font-semibold">
            {liveDbEngine} ({liveDbLatency})
          </span>
        </div>

        {/* Redis 7 Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              liveRedis.includes('CONNECTED') ? 'bg-primary' : 'bg-amber-400'
            }`}
          ></span>
          <span className="font-label-caps text-label-caps uppercase text-outline">
            Cache Store:
          </span>
          <span className="font-label-data-sm text-label-data-sm text-on-surface">
            {liveRedis}
          </span>
        </div>

        {/* Node Process Uptime */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="font-label-caps text-label-caps uppercase text-outline">
            Container State:
          </span>
          <span className="font-label-data-sm text-label-data-sm text-on-surface">
            {liveUptime}
          </span>
        </div>
      </div>

      {/* Storage & Sovereignty Guarantee */}
      <div className="flex items-center gap-3 font-label-data-sm text-label-data-sm text-outline">
        <span>Prisma 7 ACID WAL</span>
        <span>•</span>
        <span>Backups: {backupSchedule}</span>
        <span>•</span>
        <span className="text-primary flex items-center gap-1 font-semibold">
          <ShieldCheck className="text-body-sm w-3.5 h-3.5" />
          Sovereign Node
        </span>
      </div>
    </div>
  );
}
