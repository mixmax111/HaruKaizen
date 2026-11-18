import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../config';
import { hapticFeedback } from '../../utils/haptics';

interface RestTimerBannerProps {
  isRunning: boolean;
  formattedTime: string;
  progress: number;
  secondsRemaining: number;
  exerciseName?: string;
  onAddSeconds: (seconds: number) => void;
  onSubtractSeconds: (seconds: number) => void;
  onSkip: () => void;
}

export function RestTimerBanner({
  isRunning,
  formattedTime,
  progress,
  secondsRemaining,
  exerciseName,
  onAddSeconds,
  onSubtractSeconds,
  onSkip,
}: RestTimerBannerProps) {
  if (!isRunning && secondsRemaining <= 0) return null;

  const handleAdd = async () => {
    await hapticFeedback.light();
    onAddSeconds(15);
  };

  const handleSub = async () => {
    await hapticFeedback.light();
    onSubtractSeconds(15);
  };

  const handleSkip = async () => {
    await hapticFeedback.medium();
    onSkip();
  };

  const progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <View style={styles.bannerContainer}>
      {/* Top Thin Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.hudRow}>
        {/* Left Timer Info */}
        <View style={styles.timerInfo}>
          <View style={styles.statusIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.hudLabel}>REST_INTERVAL</Text>
          </View>
          <Text style={styles.timerText}>{formattedTime}</Text>
          {exerciseName ? (
            <Text style={styles.exerciseText} numberOfLines={1}>
              Next: {exerciseName}
            </Text>
          ) : null}
        </View>

        {/* Right Action Controls: -15s, +15s, [SKIP] */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.btnAdjust} onPress={handleSub}>
            <Text style={styles.btnAdjustText}>-15s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnAdjust} onPress={handleAdd}>
            <Text style={styles.btnAdjustText}>+15s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSkip} onPress={handleSkip}>
            <Text style={styles.btnSkipText}>[SKIP]</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: '#12131a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  timerInfo: {
    flex: 1,
    marginRight: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  hudLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  timerText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  exerciseText: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnAdjust: {
    backgroundColor: '#1e1f26',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnAdjustText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  btnSkip: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnSkipText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#f87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

