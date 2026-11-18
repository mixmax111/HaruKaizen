import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../config';
import { apiClient } from '../../services/api';
import { solveAltcha, AltchaChallenge as IAltchaChallenge } from '../../utils/altchaSolver';
import { hapticFeedback } from '../../utils/haptics';

interface AltchaChallengeProps {
  onVerified: (base64Payload: string) => void;
  onReset?: () => void;
  isVerified?: boolean;
  autoCompute?: boolean;
}

export function AltchaChallenge({
  onVerified,
  onReset,
  isVerified = false,
  autoCompute = true,
}: AltchaChallengeProps) {
  const [status, setStatus] = useState<'idle' | 'computing' | 'verified' | 'error'>(
    isVerified ? 'verified' : 'idle'
  );
  const [progress, setProgress] = useState<number>(0);
  const [nonce, setNonce] = useState<string>('0x00000000');
  const [cpuLoad, setCpuLoad] = useState<number>(14);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const startComputation = async () => {
    if (status === 'computing' || status === 'verified') return;
    setStatus('computing');
    setProgress(5);
    setErrorMessage('');
    await hapticFeedback.light();

    try {
      // 1. Fetch live challenge via central apiClient
      const res = await apiClient.get('/auth/altcha-challenge', { timeout: 10000 });
      const challengeData: IAltchaChallenge = res.data?.data || res.data;

      if (!challengeData || !challengeData.challenge) {
        throw new Error('Sfida crittografica non ricevuta dal gateway.');
      }

      // 2. Solve PoW in non-blocking Hermes event loop batches
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
      await hapticFeedback.success();
      onVerified(base64Payload);
    } catch (err: any) {
      console.warn('[AltchaChallenge] Errore risoluzione ALTCHA PoW:', err);
      setStatus('error');
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Impossibile contattare il server. Verifica l\'endpoint di rete.';
      setErrorMessage(msg);
      await hapticFeedback.warning();
      if (onReset) onReset();
    }
  };

  // Auto-calcolo crittografico in background all'apertura della schermata
  useEffect(() => {
    if (autoCompute && status === 'idle' && !isVerified) {
      startComputation();
    }
  }, [autoCompute]);

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage('');
    setProgress(0);
    setNonce('0x00000000');
    if (onReset) onReset();
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.statusDot,
              status === 'verified' && styles.statusDotVerified,
              status === 'error' && styles.statusDotError,
              status === 'computing' && styles.statusDotComputing,
            ]}
          />
          <Text style={styles.title}>ALTCHA PROOF-OF-WORK</Text>
        </View>
        <Text
          style={[
            styles.statusBadge,
            status === 'verified' && styles.statusBadgeVerified,
            status === 'error' && styles.statusBadgeError,
          ]}
        >
          {status === 'verified'
            ? 'SHA-256 RESOLVED'
            : status === 'computing'
            ? 'COMPUTING...'
            : status === 'error'
            ? 'CHALLENGE ERROR'
            : 'CRYPTO CHALLENGE'}
        </Text>
      </View>

      {/* Body States */}
      {status === 'idle' && (
        <View style={styles.actionRow}>
          <Text style={styles.hintText}>&gt; Awaiting verification...</Text>
          <TouchableOpacity
            style={styles.computeButton}
            onPress={startComputation}
            activeOpacity={0.8}
          >
            <Text style={styles.computeButtonText}>CALCOLA PoW</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'computing' && (
        <View style={styles.computingContainer}>
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>NONCE</Text>
              <Text style={styles.telemetryValue}>{nonce}</Text>
            </View>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>CPU LOAD</Text>
              <Text style={styles.telemetryValue}>~{cpuLoad}%</Text>
            </View>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>PROGRESS</Text>
              <Text style={styles.telemetryValueHighlight}>{progress}%</Text>
            </View>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.computingFooter}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.computingText}>Risoluzione hash SHA-256 in corso...</Text>
          </View>
        </View>
      )}

      {status === 'verified' && (
        <View style={styles.verifiedContainer}>
          <View style={styles.verifiedRow}>
            <Text style={styles.verifiedCheck}>✓</Text>
            <Text style={styles.verifiedTitle}>CHALLENGE RISOLTA CON SUCCESSO</Text>
          </View>
          <Text style={styles.verifiedDetails}>
            Nonce verificato: {nonce} • Crittografia anti-bot completata
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>RIPROVA</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090a0f',
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textDim,
  },
  statusDotComputing: {
    backgroundColor: COLORS.secondary,
  },
  statusDotVerified: {
    backgroundColor: COLORS.primary,
  },
  statusDotError: {
    backgroundColor: COLORS.danger,
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.8,
  },
  statusBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textDim,
    letterSpacing: 0.5,
  },
  statusBadgeVerified: {
    color: COLORS.primary,
  },
  statusBadgeError: {
    color: COLORS.danger,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  hintText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.textMuted,
  },
  computeButton: {
    backgroundColor: '#121b16',
    borderColor: COLORS.primaryDark,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  computeButtonText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  computingContainer: {
    gap: 8,
    paddingTop: 4,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  telemetryItem: {
    alignItems: 'flex-start',
  },
  telemetryLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: COLORS.textDim,
    letterSpacing: 0.5,
  },
  telemetryValue: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  telemetryValueHighlight: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#1a1b22',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  computingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  computingText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.textDim,
  },
  verifiedContainer: {
    paddingTop: 4,
    gap: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedCheck: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  verifiedTitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  verifiedDetails: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.textMuted,
  },
  errorContainer: {
    paddingTop: 4,
    gap: 8,
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.danger,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#261215',
    borderColor: COLORS.danger,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.danger,
  },
});

