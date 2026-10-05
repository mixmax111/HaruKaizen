'use client';

import React from 'react';
import Link from 'next/link';
import { Terminal, Shield } from 'lucide-react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  terminalNodeId?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({
  title,
  subtitle = 'Continuous Biometric & Nutritional Telemetry',
  terminalNodeId = 'NODE: HK-AUTH-SECURE',
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-zinc-950 text-slate-100 overflow-hidden font-body-md selection:bg-emerald-500 selection:text-black">
      {/* Background Terminal Scanline & Ambient Flare */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,19,26,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
      </div>

      {/* Centered Terminal Modal */}
      <div className="relative z-10 w-full max-w-lg bg-zinc-900/90 border border-zinc-800 rounded-lg p-6 sm:p-8 shadow-2xl shadow-black/90 backdrop-blur-md">
        {/* Terminal Header Ribbon */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 font-mono text-[11px] text-zinc-500">
              {terminalNodeId}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>TLS_v1.3_STRICT</span>
          </div>
        </div>

        {/* Title & Brand */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 group mb-2">
            <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-100 font-mono">
              HaruKaizen
            </span>
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-slate-100 font-mono">
            {title}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            {subtitle}
          </p>
        </div>

        {/* Form Body */}
        {children}

        {/* Footer */}
        {footer && (
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center text-xs text-zinc-400 font-mono">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

