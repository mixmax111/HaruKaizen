'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api';
import { AuthCard } from './auth-card';
import { AltchaChallenge } from './altcha-challenge';
import { AuthSplashScreen } from './auth-splash-screen';
import { AlertCircle, Lock, Mail, ArrowRight, Loader2, Ruler, Calendar, Activity } from 'lucide-react';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Biometrics
  const [heightCm, setHeightCm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [lifestyleMultiplier, setLifestyleMultiplier] = useState('1.55');

  const [isAltchaVerified, setIsAltchaVerified] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAltchaVerified) {
      setError('Proof-of-Work crittografico richiesto prima della registrazione.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le passphrase inserite non coincidono.');
      return;
    }

    if (password.length < 8) {
      setError('La passphrase deve essere di almeno 8 caratteri.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // 1. Registrazione account base
      const res = await apiClient.post('/auth/register', { email, password });
      const token = res.data.data?.accessToken || res.data.accessToken;

      if (!token) {
        throw new Error('Nessun token restituito dal gateway.');
      }

      // 2. Login client
      await login(token);

      // 3. Salvataggio biometria se fornita
      const patchData: Record<string, any> = {};
      if (heightCm) patchData.heightCm = Number(heightCm);
      if (birthDate) patchData.birthDate = birthDate;
      if (sex) patchData.sex = sex;
      if (lifestyleMultiplier) patchData.lifestyleMultiplier = Number(lifestyleMultiplier);

      if (Object.keys(patchData).length > 0) {
        try {
          await apiClient.patch('/users/me', patchData);
        } catch (err) {
          console.warn('Errore salvataggio biometrico secondario:', err);
        }
      }

      setShowSplash(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Inizializzazione nodo fallita. Riprova.';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (showSplash) {
    return <AuthSplashScreen targetUrl="/dashboard" />;
  }

  return (
    <AuthCard
      title="Initialize Sovereign Node Profile"
      subtitle="Local Biometric & Identity Provisioning"
      terminalNodeId="TTY: /dev/pts/provision"
      footer={
        <div className="flex items-center justify-between">
          <span>Hai già un operatore configurato?</span>
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
          >
            Accedi al Gateway &gt;
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
        {/* Account Credentials Section */}
        <div className="space-y-3 pb-3 border-b border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
            [01_ACCOUNT_CREDENTIALS]
          </span>

          <div>
            <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
              &gt; TARGET_EMAIL *
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
                &gt; SECURE_PASSPHRASE *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min. 8 chars"
                  disabled={submitting}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
                &gt; CONFIRM_PASSPHRASE *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="re-enter passphrase"
                  disabled={submitting}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Biometrics Section */}
        <div className="space-y-3 pb-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
            [02_BIOMETRIC_TELEMETRY_PARAMETERS]
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
                &gt; HEIGHT_CM
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                  <Ruler className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="50"
                  max="260"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="178"
                  disabled={submitting}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
                &gt; BIRTH_DATE
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
                &gt; BIOLOGICAL_SEX
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSex('M')}
                  className={`py-1.5 px-2 rounded border font-mono text-xs transition ${
                    sex === 'M'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}
                >
                  [MALE]
                </button>
                <button
                  type="button"
                  onClick={() => setSex('F')}
                  className={`py-1.5 px-2 rounded border font-mono text-xs transition ${
                    sex === 'F'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                  }`}
                >
                  [FEMALE]
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold text-zinc-300 block mb-1">
                &gt; ACTIVITY_INDEX
              </label>
              <select
                value={lifestyleMultiplier}
                onChange={(e) => setLifestyleMultiplier(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="1.2">1.2 (Sedentary / Office)</option>
                <option value="1.375">1.375 (Moderate 1-3x)</option>
                <option value="1.55">1.55 (Active 3-5x)</option>
                <option value="1.725">1.725 (High Density 6-7x)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Altcha Challenge */}
        <AltchaChallenge
          isVerified={isAltchaVerified}
          onVerified={() => setIsAltchaVerified(true)}
        />

        {/* Submit Button */}
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
              <span>[PROVISIONING_NODE...]</span>
            </>
          ) : (
            <>
              <span>[INITIALIZE PROFILE]</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
}

