'use client';

import React, { useState } from 'react';
import { Cpu, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

interface AltchaChallengeProps {
  onVerified: (token: string) => void;
  isVerified?: boolean;
}

export function AltchaChallenge({
  onVerified,
  isVerified = false,
}: AltchaChallengeProps) {
  const [status, setStatus] = useState<'idle' | 'computing' | 'verified'>(
    isVerified ? 'verified' : 'idle'
  );
  const [progress, setProgress] = useState(0);
  const [nonce, setNonce] = useState('0x00000000');
  const [cpuLoad, setCpuLoad] = useState(14);

  const startComputation = () => {
    if (status !== 'idle') return;
    setStatus('computing');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('verified');
          onVerified('altcha_pow_sha256_verified_token_' + Math.random().toString(36).substring(2));
          return 100;
        }
        // Random CPU load variation
        setCpuLoad(Math.floor(12 + Math.random() * 10));
        // Random simulated hexadecimal nonce
        setNonce('0x' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'));
        return prev + 15;
      });
    }, 150);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3.5 flex flex-col gap-2.5 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className={`w-4 h-4 ${status === 'verified' ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span className="font-semibold text-zinc-300 tracking-wide text-[11px]">
            ALTCHA PROOF-OF-WORK
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
          {status === 'verified' ? 'SHA-256 RESOLVED' : 'CRYPTO CHALLENGE'}
        </span>
      </div>

      {status === 'idle' && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-zinc-400 text-[11px]">
            &gt; Awaiting calculation...
          </span>
          <button
            type="button"
            onClick={startComputation}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700 text-[11px] font-semibold transition active:scale-95"
          >
            Compute PoW
          </button>
        </div>
      )}

      {status === 'computing' && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Generating proof...
            </span>
            <span>CPU Load {cpuLoad}% • Nonce {nonce}</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'verified' && (
        <div className="flex items-center justify-between pt-1 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-emerald-300">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-semibold">
              Cryptographic Proof Verified
            </span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">
            {nonce.slice(0, 8)}...OK
          </span>
        </div>
      )}
    </div>
  );
}

