import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../config';
import { hapticFeedback } from '../utils/haptics';

interface RestTimerProps {
  endTime: number | null; // Timestamp assoluto di fine timer
  durationSeconds: number;
  onFinish?: () => void;
  onCancel?: () => void;
  onAddSeconds?: (seconds: number) => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  endTime,
  durationSeconds,
  onFinish,
  onCancel,
  onAddSeconds,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endTime) {
      setSecondsRemaining(0);
      return;
    }

    const checkTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((endTime - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0) {
        hapticFeedback.success();
        onFinish?.();
      }
    };

    // Controllo immediato all'avvio o re-render post-background
    checkTimer();
    const interval = setInterval(checkTimer, 500);

    return () => clearInterval(interval);
  }, [endTime, onFinish]);

  if (!endTime || secondsRemaining <= 0) {
    return null;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const progress = durationSeconds > 0 ? (durationSeconds - secondsRemaining) / durationSeconds : 1;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoCol}>
          <Text style={styles.label}>RECUPERO IN CORSO</Text>
          <Text style={styles.timerText}>{formattedTime}</Text>
        </View>

        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={styles.btnSmall}
            onPress={() => {
              hapticFeedback.light();
              onAddSeconds?.(30);
            }}
          >
            <Text style={styles.btnSmallText}>+30s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSmall, styles.btnCancel]}
            onPress={() => {
              hapticFeedback.light();
              onCancel?.();
            }}
          >
            <Text style={styles.btnCancelText}>Salta</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCol: {
    flex: 1,
  },
  label: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerText: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 2,
  },
  actionsCol: {
    flexDirection: 'row',
    gap: 8,
  },
  btnSmall: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnSmallText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },
  btnCancel: {
    backgroundColor: '#3f3f46',
  },
  btnCancelText: {
    color: '#e4e4e7',
    fontWeight: '600',
    fontSize: 13,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#27272a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});
