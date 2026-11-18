'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../../components/layout/app-layout';
import { apiClient } from '../../../lib/api';
import { calculateLiveExpenditure, LiveSetItem } from '../../../lib/expenditure';
import {
  Dumbbell,
  Play,
  Check,
  CheckCircle2,
  Plus,
  Timer,
  Pause,
  RotateCcw,
  Sparkles,
  Trophy,
  Flame,
  Search,
  X,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

type SetType = 'WARMUP' | 'WORKING' | 'DROPSET' | 'FAILURE';

interface SetRowState {
  id?: string;
  clientSideId: string;
  setOrder: number;
  setType: SetType;
  weightKg: number;
  repsCompleted: number;
  rpe?: number;
  isSaved: boolean;
}

interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  primaryMuscleGroup: string;
  equipment?: string;
}

interface ActiveLogExercise {
  id: string; // WorkoutLogExercise ID
  exerciseId?: string;
  exerciseNameSnapshot: string;
  isExtraExercise: boolean;
  notes?: string;
  restSeconds?: number;
  sets: SetRowState[];
}

interface ActiveWorkoutSession {
  id: string;
  planId?: string;
  dayNameSnapshot: string;
  startedAt: string;
  exercises: ActiveLogExercise[];
}

export default function LiveGymLoggerPage() {
  const router = useRouter();

  // Loading & State
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [customDayName, setCustomDayName] = useState<string>('Sessione Libera Hypertrophy');

  // Active Live Workout Session
  const [session, setSession] = useState<ActiveWorkoutSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rest Timer HUD State
  const [restTimerSeconds, setRestTimerSeconds] = useState<number>(0);
  const [restTimerTotal, setRestTimerTotal] = useState<number>(90);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);

  // Exercise Catalog Modal for Extra Exercises
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogExercises, setCatalogExercises] = useState<ExerciseItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');

  // Session Finish Modal
  const [finishSummary, setFinishSummary] = useState<{
    durationMinutes: number;
    caloriesBurned: number;
    totalWorkingVolumeKg: number;
    totalSets: number;
  } | null>(null);

  // 1. Initial Data Fetch: Check for unfinished session or load plans
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setIsLoading(true);
        const [plansRes, logsRes] = await Promise.all([
          apiClient.get('/workout/plans').catch(() => ({ data: { data: [] } })),
          apiClient.get('/workout/logs').catch(() => ({ data: { data: [] } })),
        ]);

        if (!mounted) return;

        const availablePlans = plansRes.data.data || plansRes.data || [];
        setPlans(availablePlans);

        // Seleziona di default il piano attivo se presente
        const activePlan = availablePlans.find((p: any) => p.isActive) || availablePlans[0];
        if (activePlan) {
          setSelectedPlanId(activePlan.id);
          if (activePlan.workoutDays && activePlan.workoutDays.length > 0) {
            setSelectedDayId(activePlan.workoutDays[0].id);
          }
        }

        // Verifica se c'è una sessione ancora aperta (senza finishedAt)
        const allLogs = logsRes.data.data || logsRes.data || [];
        const unfinished = allLogs.find((l: any) => !l.finishedAt);

        if (unfinished) {
          // Ricostruisci lo stato della sessione attiva
          const fullSessionRes = await apiClient.get(`/workout/logs/${unfinished.id}`);
          const logData = fullSessionRes.data.data || fullSessionRes.data;

          const restoredExercises: ActiveLogExercise[] = (logData.logExercises || []).map((le: any) => {
            const sets: SetRowState[] = (le.logSets || []).map((s: any, idx: number) => ({
              id: s.id,
              clientSideId: s.clientSideId || crypto.randomUUID(),
              setOrder: s.setOrder || idx + 1,
              setType: (s.setType as SetType) || 'WORKING',
              weightKg: Number(s.weightKg) || 0,
              repsCompleted: Number(s.repsCompleted) || 0,
              rpe: s.rpe ? Number(s.rpe) : undefined,
              isSaved: true,
            }));

            // Se non ci sono set salvati, aggiungi una riga vuota
            if (sets.length === 0) {
              sets.push({
                clientSideId: crypto.randomUUID(),
                setOrder: 1,
                setType: 'WORKING',
                weightKg: 0,
                repsCompleted: 10,
                rpe: 8,
                isSaved: false,
              });
            }

            return {
              id: le.id,
              exerciseId: le.exerciseId,
              exerciseNameSnapshot: le.exerciseNameSnapshot,
              isExtraExercise: Boolean(le.isExtraExercise),
              notes: le.notes || '',
              restSeconds: 90,
              sets,
            };
          });

          setSession({
            id: logData.id,
            planId: logData.planId,
            dayNameSnapshot: logData.dayNameSnapshot || 'Allenamento Live',
            startedAt: logData.startedAt || new Date().toISOString(),
            exercises: restoredExercises,
          });

          // Calcola secondi trascorsi
          if (logData.startedAt) {
            const startMs = new Date(logData.startedAt).getTime();
            const nowMs = Date.now();
            setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
          }
        }
      } catch (err) {
        console.error('Errore inizializzazione live logger:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Timer allenamento continuo
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // 3. Rest Timer Countdown & Audio Feedback
  useEffect(() => {
    let interval: any = null;
    if (isRestTimerRunning && restTimerSeconds > 0) {
      interval = setInterval(() => {
        setRestTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsRestTimerRunning(false);
            playRestTimerChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRestTimerRunning, restTimerSeconds]);

  // Suono di avviso completamento timer di recupero (Web Audio API nativa)
  const playRestTimerChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio contest non disponibile
    }
  };

  const startRestTimer = (seconds: number = 90) => {
    setRestTimerTotal(seconds);
    setRestTimerSeconds(seconds);
    setIsRestTimerRunning(true);
  };

  // 4. Avvia Nuova Sessione Live
  const handleStartSession = async () => {
    try {
      setIsLoading(true);

      const chosenPlan = plans.find((p) => p.id === selectedPlanId);
      const chosenDay = chosenPlan?.workoutDays?.find((d: any) => d.id === selectedDayId);
      const dayName = chosenDay?.name || customDayName;

      // 1. Crea la sessione su backend
      const res = await apiClient.post('/workout/logs/start', {
        planId: selectedPlanId || undefined,
        dayNameSnapshot: dayName,
        date: new Date().toISOString(),
      });

      const newLog = res.data.data || res.data;
      const initialExercises: ActiveLogExercise[] = [];

      // 2. Se ci sono esercizi prescritti nel giorno scelto, popolali
      if (chosenDay && chosenDay.exercises && chosenDay.exercises.length > 0) {
        for (const prescribed of chosenDay.exercises) {
          const exRes = await apiClient.post(`/workout/logs/${newLog.id}/exercises`, {
            exerciseId: prescribed.exerciseId || prescribed.exercise?.id,
            exerciseNameSnapshot: prescribed.exercise?.name || 'Esercizio Prescritto',
            notes: prescribed.notes || '',
            isExtraExercise: false,
          });
          const createdEx = exRes.data.data || exRes.data;

          const setsCount = prescribed.sets || 3;
          const initialSets: SetRowState[] = [];
          for (let i = 1; i <= setsCount; i++) {
            initialSets.push({
              clientSideId: crypto.randomUUID(),
              setOrder: i,
              setType: 'WORKING',
              weightKg: prescribed.weightTargetKg || 0,
              repsCompleted: parseInt(prescribed.repsTarget) || 10,
              rpe: prescribed.rpeTarget || 8,
              isSaved: false,
            });
          }

          initialExercises.push({
            id: createdEx.id,
            exerciseId: prescribed.exerciseId || prescribed.exercise?.id,
            exerciseNameSnapshot: prescribed.exercise?.name || 'Esercizio Prescritto',
            isExtraExercise: false,
            notes: prescribed.notes || '',
            restSeconds: prescribed.restSeconds || 90,
            sets: initialSets,
          });
        }
      }

      setSession({
        id: newLog.id,
        planId: selectedPlanId || undefined,
        dayNameSnapshot: dayName,
        startedAt: newLog.startedAt || new Date().toISOString(),
        exercises: initialExercises,
      });

      setElapsedSeconds(0);
    } catch (err: any) {
      alert(`Errore avvio sessione: ${err.message || 'Impossibile avviare il workout'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Apri Modale Catalogo Esercizi (Fuori Scheda)
  const handleOpenCatalog = async () => {
    setIsCatalogOpen(true);
    if (catalogExercises.length === 0) {
      try {
        const res = await apiClient.get('/exercises');
        const list = res.data.data || res.data || [];
        setCatalogExercises(list);
      } catch (err) {
        console.error('Errore recupero catalogo esercizi:', err);
      }
    }
  };

  // 6. Aggiungi Esercizio Extra alla Sessione
  const handleAddExtraExercise = async (exercise: ExerciseItem) => {
    if (!session) return;
    try {
      const res = await apiClient.post(`/workout/logs/${session.id}/exercises`, {
        exerciseId: exercise.id,
        exerciseNameSnapshot: exercise.name,
        notes: '',
        isExtraExercise: true,
      });

      const createdEx = res.data.data || res.data;

      const newEx: ActiveLogExercise = {
        id: createdEx.id,
        exerciseId: exercise.id,
        exerciseNameSnapshot: exercise.name,
        isExtraExercise: true,
        notes: '',
        restSeconds: 90,
        sets: [
          {
            clientSideId: crypto.randomUUID(),
            setOrder: 1,
            setType: 'WORKING',
            weightKg: 0,
            repsCompleted: 10,
            rpe: 8,
            isSaved: false,
          },
        ],
      };

      setSession((prev) => (prev ? { ...prev, exercises: [...prev.exercises, newEx] } : null));
      setIsCatalogOpen(false);
    } catch (err: any) {
      alert(`Errore aggiunta esercizio: ${err.message || 'Riprova'}`);
    }
  };

  // 7. Modifica Campi di un Set
  const handleUpdateSetField = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetRowState,
    value: any
  ) => {
    if (!session) return;
    setSession((prev) => {
      if (!prev) return null;
      const newExercises = [...prev.exercises];
      const targetEx = { ...newExercises[exerciseIndex] };
      const newSets = [...targetEx.sets];
      newSets[setIndex] = {
        ...newSets[setIndex],
        [field]: value,
      };
      targetEx.sets = newSets;
      newExercises[exerciseIndex] = targetEx;
      return { ...prev, exercises: newExercises };
    });
  };

  // 8. Commit di una Serie (Salvataggio Idempotente & Avvio Rest Timer)
  const handleToggleCommitSet = async (exerciseIndex: number, setIndex: number) => {
    if (!session) return;
    const targetExercise = session.exercises[exerciseIndex];
    const targetSet = targetExercise.sets[setIndex];

    try {
      const payload = {
        orderIndex: targetSet.setOrder,
        setOrder: targetSet.setOrder,
        setType: targetSet.setType,
        weightKg: Number(targetSet.weightKg) || 0,
        repsCompleted: Number(targetSet.repsCompleted) || 0,
        rpe: targetSet.rpe ? Number(targetSet.rpe) : undefined,
        clientSideId: targetSet.clientSideId,
      };

      const res = await apiClient.post(`/workout/logs/exercises/${targetExercise.id}/sets`, payload);
      const savedSet = res.data.data || res.data;

      // Aggiorna stato locale come salvato
      setSession((prev) => {
        if (!prev) return null;
        const newExercises = [...prev.exercises];
        const ex = { ...newExercises[exerciseIndex] };
        const sets = [...ex.sets];
        sets[setIndex] = {
          ...sets[setIndex],
          id: savedSet.id,
          isSaved: true,
        };
        ex.sets = sets;
        newExercises[exerciseIndex] = ex;
        return { ...prev, exercises: newExercises };
      });

      // Avvia timer di recupero (default 90 secondi o specifico)
      startRestTimer(targetExercise.restSeconds || 90);
    } catch (err: any) {
      alert(`Errore salvataggio serie: ${err.message || 'Verifica connessione'}`);
    }
  };

  // 9. Aggiungi Nuova Riga di Serie
  const handleAddSetRow = (exerciseIndex: number) => {
    if (!session) return;
    setSession((prev) => {
      if (!prev) return null;
      const newExercises = [...prev.exercises];
      const targetEx = { ...newExercises[exerciseIndex] };
      const prevSet = targetEx.sets[targetEx.sets.length - 1];

      const newSet: SetRowState = {
        clientSideId: crypto.randomUUID(),
        setOrder: targetEx.sets.length + 1,
        setType: prevSet ? prevSet.setType : 'WORKING',
        weightKg: prevSet ? prevSet.weightKg : 0,
        repsCompleted: prevSet ? prevSet.repsCompleted : 10,
        rpe: prevSet ? prevSet.rpe : 8,
        isSaved: false,
      };

      targetEx.sets = [...targetEx.sets, newSet];
      newExercises[exerciseIndex] = targetEx;
      return { ...prev, exercises: newExercises };
    });
  };

  // 10. Aggiorna Note Esercizio con Debounce o onBlur
  const handleSaveNotes = async (exerciseId: string, notes: string) => {
    try {
      await apiClient.patch(`/workout/logs/exercises/${exerciseId}/notes`, { notes });
    } catch (err) {
      console.error('Errore aggiornamento note:', err);
    }
  };

  // 11. Conclusione Sessione (POST /workout/logs/:id/finish)
  const handleFinishWorkout = async () => {
    if (!session) return;
    const confirmFinish = window.confirm(
      'Vuoi terminare la sessione di allenamento e consolidare il volume nel database?'
    );
    if (!confirmFinish) return;

    try {
      setIsLoading(true);
      const res = await apiClient.post(`/workout/logs/${session.id}/finish`);
      const finishData = res.data.data || res.data;

      // Conta totale serie completate
      let totalCompletedSets = 0;
      session.exercises.forEach((ex) => {
        totalCompletedSets += ex.sets.filter((s) => s.isSaved).length;
      });

      setFinishSummary({
        durationMinutes: finishData.summary?.durationMinutes || Math.max(1, Math.round(elapsedSeconds / 60)),
        caloriesBurned: finishData.summary?.caloriesBurned || 350,
        totalWorkingVolumeKg: finishData.summary?.totalWorkingVolumeKg || calculateCurrentVolume(),
        totalSets: totalCompletedSets,
      });

      setSession(null);
      setIsRestTimerRunning(false);
    } catch (err: any) {
      alert(`Errore chiusura sessione: ${err.message || 'Riprova'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcolo volume totale corrente in tempo reale
  const calculateCurrentVolume = (): number => {
    if (!session) return 0;
    let vol = 0;
    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.isSaved && s.setType !== 'WARMUP') {
          vol += (s.weightKg || 0) * (s.repsCompleted || 0);
        }
      });
    });
    return vol;
  };

  // Stima fisiologica biomeccanica calorie bruciate in tempo reale
  const liveExpenditure = useMemo(() => {
    if (!session) return { caloriesBurned: 0, effectiveDurationMinutes: 0, totalVolumeKg: 0 };
    const savedSets: LiveSetItem[] = [];
    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.isSaved) {
          savedSets.push({
            setType: s.setType,
            repsCompleted: Number(s.repsCompleted) || 0,
            weightKg: Number(s.weightKg) || 0,
            rpe: s.rpe ? Number(s.rpe) : 8,
            restSeconds: ex.restSeconds || 90,
            exerciseName: ex.exerciseNameSnapshot,
          });
        }
      });
    });
    return calculateLiveExpenditure(savedSets, 75);
  }, [session]);

  // Formatta Secondi in MM:SS o HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filtra catalogo esercizi per modale
  const filteredCatalog = useMemo(() => {
    return catalogExercises.filter((ex) => {
      const matchSearch =
        ex.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        ex.primaryMuscleGroup?.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchCat =
        catalogCategory === 'ALL' ||
        ex.category?.toLowerCase() === catalogCategory.toLowerCase() ||
        ex.primaryMuscleGroup?.toLowerCase() === catalogCategory.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [catalogExercises, catalogSearch, catalogCategory]);

  return (
    <AppLayout breadcrumbs={['HaruKaizen', 'Workouts', 'Live Gym Logger']}>
      <div className="w-full flex flex-col gap-6 pb-20 max-w-5xl mx-auto">
        {/* SE NESSUNA SESSIONE ATTIVA: INTERFACCIA AVVIO */}
        {!session && !finishSummary && (
          <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl animate-in fade-in">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
                    Live Gym Logger
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-outline">
                  Registra le serie in tempo reale durante l'allenamento con timer di recupero e ricalcolo automatico del volume.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/workouts')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-container-high text-xs text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Torna a Schede</span>
              </button>
            </div>

            {/* Selezione Scheda & Giorno */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-outline block">
                  1. Seleziona Scheda Prescrittiva
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => {
                    setSelectedPlanId(e.target.value);
                    const chosen = plans.find((p) => p.id === e.target.value);
                    if (chosen?.workoutDays && chosen.workoutDays.length > 0) {
                      setSelectedDayId(chosen.workoutDays[0].id);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-sm focus:outline-none focus:border-primary font-medium"
                >
                  <option value="">-- Sessione Libera (Nessuna Scheda) --</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} {plan.isActive ? '★ [Attiva]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-outline block">
                  2. Seleziona Routine del Giorno
                </label>
                {selectedPlanId ? (
                  <select
                    value={selectedDayId}
                    onChange={(e) => setSelectedDayId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-sm focus:outline-none focus:border-primary font-medium"
                  >
                    {plans
                      .find((p) => p.id === selectedPlanId)
                      ?.workoutDays?.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.exercises?.length || 0} esercizi prescritti)
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customDayName}
                    onChange={(e) => setCustomDayName(e.target.value)}
                    placeholder="Nome Sessione (es. Full Body, Cardio, ecc.)"
                    className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            </div>

            {/* Pulsante Avvio Sessione */}
            <div className="pt-4 border-t border-surface-container-high/60 flex items-center justify-end">
              <button
                type="button"
                onClick={handleStartSession}
                disabled={isLoading}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/25 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Inizializzazione Telemetria...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Inizia Sessione Live</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* MODALE DI COMPLETAMENTO SESSIONE (CELEBRAZIONE) */}
        {finishSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
            <div className="relative w-full max-w-md bg-surface-container-low border border-surface-container-high rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center gap-5 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest text-primary font-bold">
                  Sessione Conclusa & Sincronizzata
                </span>
                <h2 className="text-2xl font-black text-on-surface mt-1">
                  Ottimo Lavoro, Guerriero!
                </h2>
                <p className="text-xs text-outline mt-1">
                  Tutti i parametri di sovraccarico progressivo sono stati registrati nella cronologia ACID.
                </p>
              </div>

              {/* Grid Riepilogo Metric */}
              <div className="grid grid-cols-2 gap-3 w-full py-2">
                <div className="p-3 rounded-2xl bg-surface-container border border-surface-container-high/60">
                  <span className="text-[10px] uppercase font-semibold text-outline block">
                    Durata Allenamento
                  </span>
                  <span className="text-lg font-bold text-on-surface font-label-data-sm">
                    {finishSummary.durationMinutes} min
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-surface-container border border-surface-container-high/60">
                  <span className="text-[10px] uppercase font-semibold text-outline block">
                    Volume Effettivo
                  </span>
                  <span className="text-lg font-bold text-primary font-label-data-sm">
                    {finishSummary.totalWorkingVolumeKg.toLocaleString()} kg
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-surface-container border border-surface-container-high/60">
                  <span className="text-[10px] uppercase font-semibold text-outline block">
                    Calorie Stimate
                  </span>
                  <span className="text-lg font-bold text-secondary font-label-data-sm">
                    ~{finishSummary.caloriesBurned} kcal
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-surface-container border border-surface-container-high/60">
                  <span className="text-[10px] uppercase font-semibold text-outline block">
                    Serie Completate
                  </span>
                  <span className="text-lg font-bold text-tertiary font-label-data-sm">
                    {finishSummary.totalSets} serie
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Torna alla Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/workouts')}
                  className="w-full py-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Vedi Schede & Storico
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INTERFACCIA LIVE RUNNING SESSION */}
        {session && (
          <>
            {/* Top Bar Telemetria Sessione (Sticky Header Live) */}
            <div className="sticky top-18 z-30 bg-surface-container-low/95 backdrop-blur-xl border border-surface-container-high rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                  <h2 className="text-base sm:text-lg font-bold text-on-surface">
                    {session.dayNameSnapshot}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-outline mt-0.5 font-label-data-sm flex-wrap">
                  <span>Tempo: <strong className="text-on-surface">{formatTime(elapsedSeconds)}</strong></span>
                  <span>•</span>
                  <span>Volume: <strong className="text-primary">{calculateCurrentVolume().toLocaleString()} kg</strong></span>
                  <span>•</span>
                  <span>Calorie Stimate: <strong className="text-secondary font-bold">~{liveExpenditure.caloriesBurned} kcal</strong></span>
                </div>
              </div>

              {/* Pulsanti Controllo Sessione */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenCatalog}
                  className="px-3.5 py-2 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Aggiungi Esercizio</span>
                  <span className="sm:hidden">+ Ex</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinishWorkout}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-lg shadow-primary/20 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Termina Allenamento</span>
                </button>
              </div>
            </div>

            {/* REST TIMER HUD (Visual Countdown Bar) */}
            {(isRestTimerRunning || restTimerSeconds > 0) && (
              <div className="bg-surface-container-high/90 border border-primary/40 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Timer className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                      Timer di Recupero Attivo
                    </span>
                    <div className="text-2xl font-black text-on-surface font-label-data-sm">
                      {formatTime(restTimerSeconds)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRestTimerSeconds((s) => s + 30)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-lowest transition-colors"
                  >
                    +30s
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRestTimerRunning(!isRestTimerRunning)}
                    className="p-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-lowest transition-colors"
                  >
                    {isRestTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRestTimerRunning(false);
                      setRestTimerSeconds(0);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-outline hover:text-error transition-colors"
                  >
                    Salta
                  </button>
                </div>
              </div>
            )}

            {/* LISTA ESERCIZI ATTIVI */}
            <div className="flex flex-col gap-5">
              {session.exercises.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-surface-container-low border border-surface-container-high">
                  <Dumbbell className="w-8 h-8 text-outline mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-on-surface">Nessun esercizio nella sessione</p>
                  <p className="text-xs text-outline mt-1 mb-4">
                    Aggiungi gli esercizi che intendi eseguire oggi dal catalogo completo.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCatalog}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    + Aggiungi Primo Esercizio
                  </button>
                </div>
              ) : (
                session.exercises.map((ex, exIdx) => (
                  <div
                    key={ex.id || `ex-${exIdx}`}
                    className="bg-surface-container-low border border-surface-container-high rounded-2xl p-5 flex flex-col gap-4 shadow-sm"
                  >
                    {/* Exercise Card Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-surface-container-high text-outline text-xs font-bold flex items-center justify-center font-label-data-sm">
                          {exIdx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-on-surface">
                            {ex.exerciseNameSnapshot}
                          </h3>
                          {ex.isExtraExercise && (
                            <span className="text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md border border-secondary/20">
                              Fuori Scheda
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startRestTimer(ex.restSeconds || 90)}
                          className="px-2.5 py-1 rounded-lg bg-surface-container text-[11px] font-medium text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1"
                        >
                          <Timer className="w-3 h-3 text-primary" />
                          <span>Timer {ex.restSeconds || 90}s</span>
                        </button>
                      </div>
                    </div>

                    {/* Set Execution Matrix (Table) */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-surface-container-high/60 text-[11px] text-outline uppercase font-semibold">
                            <th className="py-2 px-2 w-12 text-center">Set</th>
                            <th className="py-2 px-2 w-28">Tipo</th>
                            <th className="py-2 px-2 w-24">Kg</th>
                            <th className="py-2 px-2 w-20">Reps</th>
                            <th className="py-2 px-2 w-16">RPE</th>
                            <th className="py-2 px-2 w-20 text-center">Stato</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-high/30">
                          {ex.sets.map((set, setIdx) => (
                            <tr
                              key={set.clientSideId}
                              className={`transition-colors ${
                                set.isSaved
                                  ? 'bg-primary/5 hover:bg-primary/10'
                                  : 'hover:bg-surface-container/50'
                              }`}
                            >
                              {/* Set Order */}
                              <td className="py-2.5 px-2 text-center font-bold text-outline font-label-data-sm">
                                #{set.setOrder}
                              </td>

                              {/* Set Type Dropdown */}
                              <td className="py-2.5 px-2">
                                <select
                                  value={set.setType}
                                  onChange={(e) =>
                                    handleUpdateSetField(
                                      exIdx,
                                      setIdx,
                                      'setType',
                                      e.target.value as SetType
                                    )
                                  }
                                  className="w-full py-1 px-1.5 rounded-lg bg-surface-container border border-surface-container-high text-[11px] font-semibold text-on-surface focus:outline-none focus:border-primary"
                                >
                                  <option value="WORKING">Working</option>
                                  <option value="WARMUP">Warmup</option>
                                  <option value="DROPSET">Dropset</option>
                                  <option value="FAILURE">Failure</option>
                                </select>
                              </td>

                              {/* Weight Input */}
                              <td className="py-2.5 px-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={set.weightKg || ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleUpdateSetField(
                                      exIdx,
                                      setIdx,
                                      'weightKg',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full py-1 px-2 rounded-lg bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface focus:outline-none focus:border-primary font-label-data-sm"
                                />
                              </td>

                              {/* Reps Input */}
                              <td className="py-2.5 px-2">
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={set.repsCompleted || ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleUpdateSetField(
                                      exIdx,
                                      setIdx,
                                      'repsCompleted',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="w-full py-1 px-2 rounded-lg bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface focus:outline-none focus:border-primary font-label-data-sm"
                                />
                              </td>

                              {/* RPE Input */}
                              <td className="py-2.5 px-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="5"
                                  max="10"
                                  value={set.rpe || ''}
                                  placeholder="8"
                                  onChange={(e) =>
                                    handleUpdateSetField(
                                      exIdx,
                                      setIdx,
                                      'rpe',
                                      parseFloat(e.target.value) || undefined
                                    )
                                  }
                                  className="w-full py-1 px-2 rounded-lg bg-surface-container border border-surface-container-high text-xs font-medium text-on-surface focus:outline-none focus:border-primary font-label-data-sm"
                                />
                              </td>

                              {/* Done Button / Status Checkbox */}
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCommitSet(exIdx, setIdx)}
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all cursor-pointer ${
                                    set.isSaved
                                      ? 'bg-primary text-on-primary shadow-md shadow-primary/25'
                                      : 'bg-surface-container border border-surface-container-high text-outline hover:border-primary hover:text-primary'
                                  }`}
                                  title={set.isSaved ? 'Serie Completata (Clicca per risalvare)' : 'Marca come Eseguita'}
                                >
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions Card Footer: Aggiungi Serie & Note Personali */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleAddSetRow(exIdx)}
                        className="py-1.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        <span>Aggiungi Serie</span>
                      </button>

                      {/* Note Personali Input */}
                      <div className="flex-1 max-w-md">
                        <input
                          type="text"
                          placeholder="Note personali (es. presa più larga, gomiti a 45°)..."
                          value={ex.notes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSession((prev) => {
                              if (!prev) return null;
                              const newExercises = [...prev.exercises];
                              newExercises[exIdx] = { ...newExercises[exIdx], notes: val };
                              return { ...prev, exercises: newExercises };
                            });
                          }}
                          onBlur={(e) => handleSaveNotes(ex.id, e.target.value)}
                          className="w-full py-1.5 px-3 rounded-xl bg-surface-container/60 border border-surface-container-high text-xs text-on-surface placeholder:text-outline/60 focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Floating Bar per Aggiungi Esercizio Rapido */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleOpenCatalog}
                className="px-6 py-3 rounded-2xl bg-surface-container border border-surface-container-high hover:border-primary text-xs font-bold text-on-surface hover:text-primary transition-all flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi Esercizio (Fuori Scheda)</span>
              </button>
            </div>
          </>
        )}

        {/* MODALE CATALOGO ESERCIZI (FUORI SCHEDA) */}
        {isCatalogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl bg-surface-container-low border border-surface-container-high rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-high/60 bg-surface-container-lowest/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-on-surface">Catalogo Esercizi</h2>
                    <p className="text-xs text-outline">Seleziona un esercizio da aggiungere alla sessione live</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(false)}
                  className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Filter Strip */}
              <div className="p-4 border-b border-surface-container-high/40 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-outline" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Cerca per nome o muscolo bersaglio..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {['ALL', 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCatalogCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all shrink-0 ${
                        catalogCategory === cat
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercises List */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {filteredCatalog.length === 0 ? (
                  <div className="py-12 text-center text-outline text-xs">
                    Nessun esercizio trovato per "{catalogSearch}".
                  </div>
                ) : (
                  filteredCatalog.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddExtraExercise(item)}
                      className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high/40 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-outline mt-0.5 font-label-data-sm">
                          <span className="uppercase text-secondary font-semibold">
                            {item.primaryMuscleGroup}
                          </span>
                          {item.equipment && (
                            <>
                              <span>•</span>
                              <span>{item.equipment}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="p-2 rounded-lg bg-surface-container-high group-hover:bg-primary group-hover:text-on-primary text-outline transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

