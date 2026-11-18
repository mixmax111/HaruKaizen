'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Scale, Ruler, Calendar, Activity, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number;
}

export function ProfileSettingsModal({
  isOpen,
  onClose,
  initialWeight,
}: ProfileSettingsModalProps) {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const [weightKg, setWeightKg] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [sex, setSex] = useState<string>('M');
  const [lifestyleMultiplier, setLifestyleMultiplier] = useState<number>(1.55);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (initialWeight) {
        setWeightKg(String(initialWeight));
      }
      if (user.heightCm) {
        setHeightCm(String(user.heightCm));
      }
      if (user.birthDate) {
        setBirthDate(user.birthDate.split('T')[0]);
      }
      if (user.sex) {
        setSex(user.sex);
      }
      if (user.lifestyleMultiplier) {
        setLifestyleMultiplier(user.lifestyleMultiplier);
      }
    }
  }, [user, initialWeight, isOpen]);

  // Calcolo dinamico dell'età
  const calculatedAge = useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 && age < 130 ? age : null;
  }, [birthDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, any> = {};

      if (weightKg && !isNaN(Number(weightKg))) {
        payload.weightKg = parseFloat(weightKg);
      }
      if (heightCm && !isNaN(Number(heightCm))) {
        payload.heightCm = parseFloat(heightCm);
      }
      if (birthDate) {
        payload.birthDate = birthDate;
      }
      if (sex) {
        payload.sex = sex;
      }
      if (lifestyleMultiplier) {
        payload.lifestyleMultiplier = lifestyleMultiplier;
      }

      await apiClient.patch('/users/me', payload);

      await Promise.all([
        refreshProfile(),
        queryClient.invalidateQueries({ queryKey: ['telemetry'] }),
      ]);

      setSuccessMessage('Profilo e biometria aggiornati con successo!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          'Errore durante l’aggiornamento del profilo utente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-surface-container-low border border-surface-container-high/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-high/60 bg-surface-container-lowest/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-on-surface">
                Profilo & Parametri Biometrici
              </h2>
              <p className="text-xs text-outline font-label-data-sm">
                {user?.email || 'Account HaruKaizen'} • {user?.role || 'USER'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-error-container/20 border border-error-container/40 text-error flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-primary-container/20 border border-primary-container/40 text-primary flex items-center gap-2 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Grid Peso e Altezza */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-primary" />
                <span>Peso Corporeo Attuale (kg)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                placeholder="es. 76.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-surface-container-high focus:outline-none focus:border-primary text-on-surface text-sm font-label-data-sm transition-colors"
              />
              <p className="text-[10px] text-outline mt-1">
                Genera automaticamente una nuova misurazione nella traiettoria.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-secondary" />
                <span>Altezza (cm)</span>
              </label>
              <input
                type="number"
                step="1"
                min="100"
                max="250"
                placeholder="es. 178"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-surface-container-high focus:outline-none focus:border-primary text-on-surface text-sm font-label-data-sm transition-colors"
              />
              <p className="text-[10px] text-outline mt-1">
                Usata per il calcolo del metabolismo basale (BMR).
              </p>
            </div>
          </div>

          {/* Grid Data di Nascita e Sesso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-tertiary" />
                  <span>Data di Nascita</span>
                </span>
                {calculatedAge !== null && (
                  <span className="text-[11px] font-semibold text-primary font-label-data-sm">
                    {calculatedAge} anni
                  </span>
                )}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-surface-container-high focus:outline-none focus:border-primary text-on-surface text-sm font-label-data-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Sesso Biologico
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSex('M')}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                    sex === 'M'
                      ? 'bg-primary/20 border-primary text-primary font-semibold'
                      : 'bg-surface-container border-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Maschio (M)
                </button>
                <button
                  type="button"
                  onClick={() => setSex('F')}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                    sex === 'F'
                      ? 'bg-primary/20 border-primary text-primary font-semibold'
                      : 'bg-surface-container border-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Femmina (F)
                </button>
              </div>
            </div>
          </div>

          {/* Moltiplicatore Stile di Vita */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>Livello di Attività (TDEE Factor)</span>
            </label>
            <select
              value={lifestyleMultiplier}
              onChange={(e) => setLifestyleMultiplier(parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-surface-container-high focus:outline-none focus:border-primary text-on-surface text-xs font-body-md transition-colors"
            >
              <option value={1.2}>
                1.20 - Sedentario (Lavoro d'ufficio, nessun esercizio sistematico)
              </option>
              <option value={1.375}>
                1.375 - Leggermente attivo (1-3 allenamenti/settimana o camminate)
              </option>
              <option value={1.55}>
                1.55 - Moderatamente attivo (3-5 allenamenti/settimana)
              </option>
              <option value={1.725}>
                1.725 - Molto attivo (6-7 allenamenti intensi/settimana)
              </option>
              <option value={1.9}>
                1.90 - Estremamente attivo (Atleta agonista / lavoro manuale pesante)
              </option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-surface-container-high/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salva Modifiche</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

