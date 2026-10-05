'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api';
import { AuthCard } from './auth-card';
import { AltchaChallenge } from './altcha-challenge';
import { AuthSplashScreen } from './auth-splash-screen';
import { AlertCircle, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAltchaVerified, setIsAltchaVerified] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAltchaVerified) {
      setError('Proof-of-Work crittografico richiesto prima del login.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const token = res.data.data?.accessToken || res.data.accessToken;
      if (!token) {
        throw new Error('Nessun token restituito dal gateway di autenticazione.');
      }
      await login(token);
      // Sblocca lo splash screen per la transizione terminale
      setShowSplash(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Autenticazione fallita: credenziali non riconosciute.';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (showSplash) {
    return <AuthSplashScreen targetUrl="/dashboard" />;
  }

  return (
    <AuthCard
      title="Secure Gateway Login"
      subtitle="Terminal Access & Node Telemetry"
      terminalNodeId="TTY: /dev/pts/auth"
      footer={
        <div className="flex items-center justify-between">
          <span>Non registrato su questo nodo?</span>
          <Link
            href="/register"
            className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
          >
            Inizializza Profilo &gt;
          </Link>
        </div>
      }
    >
      {error && (
        <div className="mb-4 flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
            &gt; TARGET_EMAIL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@harukaizen.local"
              disabled={submitting}
              className="w-full bg-zinc-950 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
            &gt; SECURE_PASSPHRASE
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={submitting}
              className="w-full bg-zinc-950 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50"
            />
          </div>
        </div>

        {/* 2. Altcha Widget Placeholder */}
        <div className="pt-1">
          <AltchaChallenge
            isVerified={isAltchaVerified}
            onVerified={() => setIsAltchaVerified(true)}
          />
        </div>

        {/* Sign In Button: Visually disabled until Altcha reaches success state */}
        <button
          type="submit"
          disabled={!isAltchaVerified || submitting}
          className={`w-full mt-2 py-2.5 px-4 rounded font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            isAltchaVerified && !submitting
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_16px_-2px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95'
              : 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed opacity-60'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>[AUTHENTICATING...]</span>
            </>
          ) : (
            <>
              <span>[SIGN IN NODE]</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}

