'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const token = res.data.data?.accessToken || res.data.accessToken;
      await login(token);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] p-4">
      <div className="bg-[#131b26] border border-[#1f2b3d] p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <span className="text-4xl">🌸</span>
          <h2 className="text-2xl font-bold text-slate-100 mt-2">Accedi ad HaruKaizen</h2>
          <p className="text-xs text-slate-400 mt-1">Bentornato al tuo percorso Kaizen quotidiano</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@harukaizen.dev"
              className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg shadow-pink-500/20 disabled:opacity-50"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-500 mt-6">
          Non hai ancora un account?{' '}
          <Link href="/register" className="text-pink-400 hover:underline">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
}
