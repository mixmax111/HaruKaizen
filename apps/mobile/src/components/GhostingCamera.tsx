import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system';
import { COLORS } from '../config';
import { hapticFeedback } from '../utils/haptics';
import { BaselineSilhouetteGuide } from './BaselineSilhouetteGuide';

// Cast per compatibilità typings React 18 e ReactNode in React Native
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GhostSlider: any = Slider;

interface GhostingCameraProps {
  previousPhotoUri?: string | null;
  category: 'FRONT' | 'SIDE' | 'BACK';
  onPhotoCaptured: (persistentUri: string, weightKg?: number) => void;
  onClose: () => void;
}

export const GhostingCamera: React.FC<GhostingCameraProps> = ({
  previousPhotoUri,
  category,
  onPhotoCaptured,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.35);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);

  // Auto-Fade Slider: opacità dello slider che si riduce al 30% dopo 2s di inattività
  const sliderFadeAnim = useRef(new Animated.Value(1)).current;
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tooltip educativo temporaneo (scompare dopo 3.5 secondi)
  const [showGuideTooltip, setShowGuideTooltip] = useState<boolean>(!previousPhotoUri);

  // Modale inserimento peso corporeo opzionale post-scatto
  const [capturedTempUri, setCapturedTempUri] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState<string>('');
  const [isWeightModalVisible, setIsWeightModalVisible] = useState<boolean>(false);

  useEffect(() => {
    if (showGuideTooltip) {
      const t = setTimeout(() => setShowGuideTooltip(false), 3500);
      return () => clearTimeout(t);
    }
  }, [showGuideTooltip]);

  const resetSliderFadeTimer = () => {
    // Riporta a opacità 100%
    Animated.timing(sliderFadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    // Dopo 2 secondi di inattività riduci l'opacità al 30% per non coprire piedi e gambe
    fadeTimeoutRef.current = setTimeout(() => {
      Animated.timing(sliderFadeAnim, {
        toValue: 0.3,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };

  useEffect(() => {
    resetSliderFadeTimer();
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionTitle}>Permesso Fotocamera Richiesto</Text>
        <Text style={styles.permissionDesc}>
          Per scattare le foto comparative dei progressi fisici (Ghosting Camera) è necessario l&apos;accesso alla fotocamera.
        </Text>
        <TouchableOpacity style={styles.btnAction} onPress={requestPermission}>
          <Text style={styles.btnActionText}>Consenti Fotocamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnAction, styles.btnCancel]} onPress={onClose}>
          <Text style={styles.btnCancelText}>Chiudi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      await hapticFeedback.medium();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo || !photo.uri) {
        throw new Error('Nessun file immagine restituito dalla fotocamera');
      }

      // REGOLA: Salva fisicamente sul FileSystem nella cartella documentDirectory (progress_photos/)
      // Non usiamo MAI Base64 per evitare memory leak e crash
      const targetDir = `${FileSystem.documentDirectory}progress_photos/`;
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      }

      const fileName = `progress_${category.toLowerCase()}_${Date.now()}.jpg`;
      const persistentUri = `${targetDir}${fileName}`;

      await FileSystem.copyAsync({
        from: photo.uri,
        to: persistentUri,
      });

      await hapticFeedback.success();
      setCapturedTempUri(persistentUri);
      setIsWeightModalVisible(true);
    } catch (err) {
      console.error('Errore durante lo scatto:', err);
      Alert.alert('Errore Scatto', 'Impossibile completare lo scatto della foto.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirmPhotoWithWeight = () => {
    if (!capturedTempUri) return;
    const parsedWeight = parseFloat(weightInput.replace(',', '.'));
    const finalWeight = !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined;

    setIsWeightModalVisible(false);
    onPhotoCaptured(capturedTempUri, finalWeight);
  };

  const toggleFacing = () => {
    hapticFeedback.light();
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={facing}>
        {/* Layer 1: Ghosting Overlay con la foto precedente in cache su disco */}
        {previousPhotoUri ? (
          <View style={[StyleSheet.absoluteFillObject, { opacity: ghostOpacity }]} pointerEvents="none">
            <Image
              source={{ uri: previousPhotoUri }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="disk"
              transition={150}
            />
          </View>
        ) : (
          /* Layer 2: Se non ci sono foto storiche, proietta la sagoma geometrica SVG */
          <BaselineSilhouetteGuide />
        )}

        {/* Tooltip Educativo Baseline */}
        {showGuideTooltip && (
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>
              📐 Allinea spalle e bacino alla sagoma per creare la tua foto baseline
            </Text>
          </View>
        )}

        {/* Header HUD */}
        <View style={styles.topHud}>
          <TouchableOpacity style={styles.hudButton} onPress={onClose}>
            <Text style={styles.hudButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.badgeCategory}>
            <Text style={styles.badgeText}>POSA: {category}</Text>
          </View>

          <TouchableOpacity style={styles.hudButton} onPress={toggleFacing}>
            <Text style={styles.hudButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Slider Trasparenza Ghosting Orizzontale in Basso con Auto-Fade a 2s */}
        {previousPhotoUri && (
          <Animated.View style={[styles.sliderContainer, { opacity: sliderFadeAnim }]}>
            <Text style={styles.sliderLabel}>
              Trasparenza Fantasma: {Math.round(ghostOpacity * 100)}%
            </Text>
            <GhostSlider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={ghostOpacity}
              onValueChange={(val: number) => {
                resetSliderFadeTimer();
                setGhostOpacity(val);
              }}
              onSlidingStart={resetSliderFadeTimer}
              onSlidingComplete={resetSliderFadeTimer}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor="#52525b"
              thumbTintColor={COLORS.primary}
            />
          </Animated.View>
        )}

        {/* Footer con pulsante di scatto */}
        <View style={styles.bottomHud}>
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <View style={styles.captureInnerCircle} />
            )}
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Modal Inserimento Peso Corporeo Post-Scatto */}
      <Modal visible={isWeightModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.weightModalBox}>
            <Text style={styles.modalTitle}>⚖️ Peso Corporeo (Opzionale)</Text>
            <Text style={styles.modalDesc}>
              Collega la foto alla tua curva del peso per creare la misurazione atomica.
            </Text>

            <TextInput
              style={styles.weightInput}
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="es. 78.5 kg"
              placeholderTextColor={COLORS.textDim}
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSkip]}
                onPress={() => {
                  setWeightInput('');
                  handleConfirmPhotoWithWeight();
                }}
              >
                <Text style={styles.modalBtnSkipText}>Salta Peso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmPhotoWithWeight}
              >
                <Text style={styles.modalBtnConfirmText}>Salva Foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  tooltipBox: {
    position: 'absolute',
    top: 110,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    zIndex: 10,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  topHud: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  hudButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  badgeCategory: {
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sliderContainer: {
    position: 'absolute',
    bottom: 110,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sliderLabel: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  slider: {
    width: '100%',
    height: 30,
  },
  bottomHud: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  btnAction: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnCancel: {
    backgroundColor: '#27272a',
  },
  btnCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  weightModalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  weightInput: {
    backgroundColor: '#27272a',
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnSkip: {
    backgroundColor: '#27272a',
  },
  modalBtnSkipText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalBtnConfirmText: {
    color: '#09090b',
    fontWeight: '800',
    fontSize: 14,
  },
});
