'use client';

import React, { useState } from 'react';
import { Cpu, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { solveAltcha, AltchaChallenge as IAltchaChallenge } from '../../lib/altcha-solver';

interface AltchaChallengeProps {
  onVerified: (base64Payload: string) => void;
  isVerified?: boolean;
}

export function AltchaChallenge({
  onVerified,
  isVerified = false,
}: AltchaChallengeProps) {
  const [status, setStatus] = useState<'idle' | 'computing' | 'verified' | 'error'>(
    isVerified ? 'verified' : 'idle'
  );
  const [progress, setProgress] = useState(0);
  const [nonce, setNonce] = useState('0x00000000');
  const [cpuLoad, setCpuLoad] = useState(14);
  const [errorMessage, setErrorMessage] = useState('');

  const startComputation = async () => {
    if (status === 'computing' || status === 'verified') return;
    setStatus('computing');
    setProgress(5);
    setErrorMessage('');

    try {
      // 1. Fetch live challenge from API
      const res = await apiClient.get('/auth/altcha-challenge');
      const challengeData: IAltchaChallenge = res.data?.data || res.data;

      if (!challengeData || !challengeData.challenge) {
        throw new Error('Sfida crittografica non ricevuta dal gateway.');
      }

      // 2. Solve PoW in browser
      const { solution, base64Payload } = await solveAltcha(
        challengeData,
        (pct, curNum) => {
          setProgress(Math.max(5, pct));
          setNonce('0x' + curNum.toString(16).padStart(8, '0'));
          setCpuLoad(Math.floor(18 + Math.random() * 14));
        }
      );

      // 3. Mark verified & transmit payload
      setNonce('0x' + solution.number.toString(16).padStart(8, '0'));
      setStatus('verified');
      onVerified(base64Payload);
    } catch (err: any) {
      console.error('Errore durante risoluzione ALTCHA PoW:', err);
      setStatus('error');
      setErrorMessage(
        err.response?.data?.message || err.message || 'Errore risoluzione Proof-of-Work.'
      );
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3.5 flex flex-col gap-2.5 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu
            className={`w-4 h-4 ${
              status === 'verified'
                ? 'text-emerald-400'
                : status === 'error'
                ? 'text-red-400'
                : 'text-zinc-500'
            }`}
          />
          <span className="font-semibold text-zinc-300 tracking-wide text-[11px]">
            ALTCHA PROOF-OF-WORK
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
          {status === 'verified'
            ? 'SHA-256 RESOLVED'
            : status === 'error'
            ? 'CHALLENGE ERROR'
            : 'CRYPTO CHALLENGE'}
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
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700 text-[11px] font-semibold transition active:scale-95 cursor-pointer"
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
              Solving PoW ({progress}%)...
            </span>
            <span>
              CPU Load {cpuLoad}% • Nonce {nonce}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-100"
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
            {nonce}...OK
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between pt-1 bg-red-500/10 border border-red-500/20 rounded p-2 text-red-300">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-[11px] truncate">{errorMessage || 'Errore'}</span>
          </div>
          <button
            type="button"
            onClick={startComputation}
            className="px-2 py-0.5 rounded bg-red-900/40 text-red-200 border border-red-700/50 text-[10px] hover:bg-red-900/60 transition"
          >
            Riprova
          </button>
        </div>
      )}
    </div>
  );
}
