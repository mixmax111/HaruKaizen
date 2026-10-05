import { useState, useEffect, useCallback, useRef } from 'react';
import { hapticFeedback } from '../utils/haptics';
import { scheduleRestTimerNotification, cancelRestTimerNotification } from '../services/notificationService';

export interface UseRestTimerReturn {
  secondsRemaining: number;
  isRunning: boolean;
  progress: number;
  targetEndTime: number | null;
  totalDurationSeconds: number;
  formattedTime: string;
  startTimer: (durationSeconds?: number, exerciseName?: string) => void;
  addSeconds: (seconds: number) => void;
  subtractSeconds: (seconds: number) => void;
  cancelTimer: () => void;
}

export function useRestTimer(defaultDurationSeconds: number = 90): UseRestTimerReturn {
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(defaultDurationSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const hasTriggeredFinish = useRef<boolean>(false);
  const scheduledNotificationIdRef = useRef<string | null>(null);

  const startTimer = useCallback((durationSeconds?: number, exerciseName?: string) => {
    const duration = durationSeconds ?? defaultDurationSeconds;
    const now = Date.now();
    const end = now + duration * 1000;
    hasTriggeredFinish.current = false;
    setTotalDurationSeconds(duration);
    setTargetEndTime(end);
    setSecondsRemaining(duration);

    // Cancella eventuale notifica precedente e schedula la sveglia per il background
    if (scheduledNotificationIdRef.current) {
      cancelRestTimerNotification(scheduledNotificationIdRef.current);
    }
    scheduleRestTimerNotification(duration, exerciseName).then((id: string | null) => {
      scheduledNotificationIdRef.current = id;
    });
  }, [defaultDurationSeconds]);

  const addSeconds = useCallback((extraSeconds: number) => {
    setTargetEndTime((prev) => {
      if (!prev) return null;
      const next = prev + extraSeconds * 1000;
      setTotalDurationSeconds((d) => d + extraSeconds);
      const diff = Math.max(0, Math.ceil((next - Date.now()) / 1000));
      setSecondsRemaining(diff);

      // Rischedula notifica per il nuovo orario di fine
      if (scheduledNotificationIdRef.current) {
        cancelRestTimerNotification(scheduledNotificationIdRef.current);
      }
      if (diff > 0) {
        scheduleRestTimerNotification(diff).then((id: string | null) => {
          scheduledNotificationIdRef.current = id;
        });
      }
      return next;
    });
  }, []);

  const subtractSeconds = useCallback((minusSeconds: number) => {
    setTargetEndTime((prev) => {
      if (!prev) return null;
      const next = prev - minusSeconds * 1000;
      setTotalDurationSeconds((d) => d + minusSeconds);
      const diff = Math.max(0, Math.ceil((next - Date.now()) / 1000));
      setSecondsRemaining(diff);

      // Rischedula notifica per il nuovo orario di fine
      if (scheduledNotificationIdRef.current) {
        cancelRestTimerNotification(scheduledNotificationIdRef.current);
      }
      if (diff > 0) {
        scheduleRestTimerNotification(diff).then((id: string | null) => {
          scheduledNotificationIdRef.current = id;
        });
      }
      return next;
    });
  }, []);

  const cancelTimer = useCallback(() => {
    if (scheduledNotificationIdRef.current) {
      cancelRestTimerNotification(scheduledNotificationIdRef.current);
      scheduledNotificationIdRef.current = null;
    }
    setTargetEndTime(null);
    setSecondsRemaining(0);
    hasTriggeredFinish.current = false;
  }, []);

  useEffect(() => {
    if (!targetEndTime) {
      setSecondsRemaining(0);
      return;
    }

    const checkTime = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && !hasTriggeredFinish.current) {
        hasTriggeredFinish.current = true;
        if (scheduledNotificationIdRef.current) {
          cancelRestTimerNotification(scheduledNotificationIdRef.current);
          scheduledNotificationIdRef.current = null;
        }
        hapticFeedback.success();
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 500);

    return () => clearInterval(interval);
  }, [targetEndTime]);

  const isRunning = Boolean(targetEndTime && secondsRemaining > 0);
  const progress = totalDurationSeconds > 0
    ? Math.min(1, Math.max(0, (totalDurationSeconds - secondsRemaining) / totalDurationSeconds))
    : 1;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return {
    secondsRemaining,
    isRunning,
    progress,
    targetEndTime,
    totalDurationSeconds,
    formattedTime,
    startTimer,
    addSeconds,
    subtractSeconds,
    cancelTimer,
  };
}
