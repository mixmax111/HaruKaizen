import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { COLORS, API_BASE_URL } from '../../config';
import { hapticFeedback } from '../../utils/haptics';
import { useOfflineSyncStore } from '../../services/offlineSyncQueue';
import { useSyncStore } from '../../stores/syncStore';

interface GhostingCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  previousPhotoUrl?: string | null;
  category?: 'FRONT' | 'SIDE' | 'BACK';
  onPhotoUploaded?: (photo: {
    id: string;
    uri: string;
    category: 'FRONT' | 'SIDE' | 'BACK';
    weightKg?: number;
    date: string;
  }) => void;
}

const OPACITY_STEPS = [0, 0.25, 0.5, 0.75];

export function GhostingCameraModal({
  isOpen,
  onClose,
  previousPhotoUrl,
  category = 'FRONT',
  onPhotoUploaded,
}: GhostingCameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [opacityIndex, setOpacityIndex] = useState(2); // default 50%
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!isOpen) return null;

  if (!permission) {
    return (
      <View style={styles.fullscreenCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <Text style={styles.permissionTitle}>&gt; CAMERA_PERMISSION_REQUIRED</Text>
        <Text style={styles.permissionDesc}>
          Accesso alla fotocamera richiesto per sovrapporre il fantasma posturale della foto precedente.
        </Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnPrimaryText}>[ CONCEDI AUTORIZZAZIONE ]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
          <Text style={styles.btnSecondaryText}>[ ANNULLA ]</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentOpacity = OPACITY_STEPS[opacityIndex];

  const handleToggleFacing = async () => {
    await hapticFeedback.light();
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleStepOpacity = async () => {
    await hapticFeedback.light();
    setOpacityIndex((prev) => (prev + 1) % OPACITY_STEPS.length);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    await hapticFeedback.medium();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Nessun file generato dalla fotocamera.');
      }

      // Copia in memoria permanente locale dell'app
      const filename = `ghost_${category.toLowerCase()}_${Date.now()}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({ from: photo.uri, to: permanentUri });

      const clientSideId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const nowIso = new Date().toISOString();

      let uploadedSuccessfully = false;
      const token = await AsyncStorage.getItem('@harukaizen:auth_token');

      if (token) {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: permanentUri,
            name: filename,
            type: 'image/jpeg',
          } as any);
          formData.append('category', category);

          const res = await fetch(`${API_BASE_URL}/media/progress`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (res.ok) {
            uploadedSuccessfully = true;
          }
        } catch {
          // Offline
        }
      }

      if (!uploadedSuccessfully) {
        // Accoda sia nella offline queue idempotente sia nel media uploader locale
        await useSyncStore.getState().addPendingMediaUpload({
          clientSyncId: clientSideId,
          clientCapturedAt: nowIso,
          localFileUri: permanentUri,
          category,
        });
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      if (onPhotoUploaded) {
        onPhotoUploaded({
          id: clientSideId,
          uri: permanentUri,
          category,
          date: 'Oggi (Live Check-in)',
        });
      }

      onClose();
    } catch (err: any) {
      Alert.alert('Errore Scatto', err.message || 'Impossibile catturare la fotografia.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Live Camera Feed */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={facing} />

      {/* 2. Previous Photo Overlay (Ghost Layer) with pointerEvents="none" */}
      {previousPhotoUrl && currentOpacity > 0 ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Image
            source={{ uri: previousPhotoUrl }}
            style={[StyleSheet.absoluteFillObject, { opacity: currentOpacity }]}
            contentFit="cover"
          />
        </View>
      ) : null}

      {/* 3. Top HUD Status & Facing Toggle */}
      <View style={styles.topBar}>
        <View style={styles.categoryBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.categoryText}>GHOST_OVERLAY: {category}</Text>
        </View>

        <View style={styles.topControls}>
          <TouchableOpacity style={styles.btnIcon} onPress={handleToggleFacing}>
            <Text style={styles.btnIconText}>🔄 CAM</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnIconClose} onPress={onClose}>
            <Text style={styles.btnIconCloseText}>[ CHIUDI ]</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Bottom Controls & Stepper */}
      <View style={styles.bottomBar}>
        {/* Opacity Stepper */}
        <View style={styles.opacityRow}>
          <Text style={styles.opacityLabel}>OPACITÀ FANTASMA:</Text>
          <TouchableOpacity style={styles.opacityPill} onPress={handleStepOpacity}>
            <Text style={styles.opacityPillText}>
              {Math.round(currentOpacity * 100)}% [TOCCA PER MODIFICARE]
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shutter Button */}
        <View style={styles.shutterRow}>
          <TouchableOpacity
            style={[styles.shutterBtn, isCapturing && styles.shutterBtnDisabled]}
            disabled={isCapturing}
            onPress={handleCapture}
          >
            {isCapturing ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.alignmentHint}>
          Allinea spalle, torace e specchio con la posa fantasma prima di scattare
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
  fullscreenCenter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  permissionBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
  },
  permissionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  permissionDesc: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#71717a',
    fontSize: 13,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,14,21,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  categoryText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnIcon: {
    backgroundColor: 'rgba(13,14,21,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  btnIconText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#e4e4e7',
    fontSize: 11,
  },
  btnIconClose: {
    backgroundColor: 'rgba(13,14,21,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  btnIconCloseText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#e4e4e7',
    fontSize: 11,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 20,
  },
  opacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,14,21,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
    gap: 8,
  },
  opacityLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#9ca3af',
    fontSize: 10,
  },
  opacityPill: {
    backgroundColor: '#1f2029',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  opacityPillText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  shutterRow: {
    marginBottom: 10,
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(78,222,163,0.15)',
  },
  shutterBtnDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
  },
  alignmentHint: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    fontSize: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
