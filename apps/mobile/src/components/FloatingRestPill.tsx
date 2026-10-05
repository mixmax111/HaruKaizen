import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { COLORS } from '../config';
import { hapticFeedback } from '../utils/haptics';

interface FloatingRestPillProps {
  isRunning: boolean;
  formattedTime: string;
  progress: number;
  onAddSeconds: (seconds: number) => void;
  onSubtractSeconds: (seconds: number) => void;
  onCancel: () => void;
}

export const FloatingRestPill: React.FC<FloatingRestPillProps> = ({
  isRunning,
  formattedTime,
  progress,
  onAddSeconds,
  onSubtractSeconds,
  onCancel,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!isRunning) return null;

  return (
    <>
      {/* Pillola fluttuante ancorata in basso sopra la Tab Bar */}
      <View style={styles.pillContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.pillTouch}
          activeOpacity={0.85}
          onPress={() => {
            hapticFeedback.light();
            setIsMenuOpen(true);
          }}
        >
          {/* Anello / Barra di progresso interna */}
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />

          <View style={styles.pillContent}>
            <View style={styles.pulseDot} />
            <Text style={styles.pillLabel}>RECUPERO</Text>
            <Text style={styles.pillTime}>{formattedTime}</Text>
            <Text style={styles.tapHint}>• Tap per opzioni</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Menu rapido di controllo recupero */}
      <Modal visible={isMenuOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
        >
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>⏱️ Controllo Recupero ({formattedTime})</Text>

            <View style={styles.menuButtonsRow}>
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => {
                  hapticFeedback.light();
                  onAddSeconds(30);
                }}
              >
                <Text style={styles.menuBtnText}>+30s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => {
                  hapticFeedback.light();
                  onSubtractSeconds(10);
                }}
              >
                <Text style={styles.menuBtnText}>-10s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuBtn, styles.menuBtnSkip]}
                onPress={() => {
                  hapticFeedback.medium();
                  onCancel();
                  setIsMenuOpen(false);
                }}
              >
                <Text style={styles.menuBtnSkipText}>Salta (0s)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeMenuBtn}
              onPress={() => setIsMenuOpen(false)}
            >
              <Text style={styles.closeMenuText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  pillTouch: {
    backgroundColor: '#18181b',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    maxWidth: 340,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderRadius: 30,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  pillLabel: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  pillTime: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 20,
    marginHorizontal: 10,
  },
  tapHint: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  menuCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  menuTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  menuBtn: {
    flex: 1,
    backgroundColor: '#27272a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  menuBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  menuBtnSkip: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  menuBtnSkipText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 14,
  },
  closeMenuBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeMenuText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
