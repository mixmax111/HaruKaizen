'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, RefreshCw, ShieldCheck } from 'lucide-react';

interface AuthSplashScreenProps {
  onComplete?: () => void;
  targetUrl?: string;
}

export function AuthSplashScreen({
  onComplete,
  targetUrl = '/dashboard',
}: AuthSplashScreenProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const logSequence = [
      '[INFO] Verifying Altcha payload (SHA-256)... VALID',
      '[INFO] Establishing HttpOnly secure tunnel (AES-256)... OK',
      '[INFO] Synchronizing local SQLite WAL journal... READY',
      '[INFO] Issuing 302 Redirect to /dashboard...',
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < logSequence.length) {
        setLogs((prev) => [...prev, logSequence[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            router.push(targetUrl);
          }
        }, 500);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [router, targetUrl, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-4 font-mono text-xs text-slate-200">
      {/* Ambient background flares */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Spinning Terminal Loader */}
        <div className="relative w-16 h-16 flex items-center justify-center mb-6">
          <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-ping" />
          <div className="w-12 h-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin flex items-center justify-center">
            <Terminal className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <h2 className="text-sm font-bold text-slate-100 tracking-wider uppercase mb-1">
          Establishing Secure Node Handshake
        </h2>
        <p className="text-[11px] text-zinc-500 mb-6">
          HaruKaizen Kernel v2.4.1 • Sovereign Local Tunnel
        </p>

        {/* Terminal Log Console */}
        <div className="w-full bg-zinc-950/90 border border-zinc-800/80 rounded p-3 text-left space-y-1.5 min-h-[110px] overflow-hidden">
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`text-[11px] font-mono ${
                idx === logs.length - 1
                  ? 'text-emerald-400 animate-pulse'
                  : 'text-zinc-400'
              }`}
            >
              {log}
            </div>
          ))}
          {logs.length < 4 && (
            <div className="text-[11px] text-zinc-600 flex items-center gap-1">
              <span className="w-1.5 h-3 bg-emerald-400 animate-pulse inline-block" />
            </div>
          )}
        </div>

        {/* Skeleton Dashboard Hint */}
        <div className="w-full mt-4 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Egress Filter: Active
          </span>
          <span>Target: /dashboard</span>
        </div>
      </div>
    </div>
  );
}

