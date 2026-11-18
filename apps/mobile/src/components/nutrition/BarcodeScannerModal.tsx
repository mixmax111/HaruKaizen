import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { COLORS, API_BASE_URL } from '../../config';
import { apiClient } from '../../services/api';
import { hapticFeedback } from '../../utils/haptics';
import { useOfflineSyncStore } from '../../services/offlineSyncQueue';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = 260;

export interface ScannedProduct {
  code: string;
  name: string;
  brand?: string;
  calories: number; // per 100g
  proteins: number;
  carbs: number;
  fats: number;
}

export type ScannedFoodResult = ScannedProduct;

interface BarcodeScannerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onFoodFound?: (food: ScannedProduct) => void;
  onFoodCommitted?: (food: {
    id: string;
    name: string;
    brand?: string;
    grams: number;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  }) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onFoodFound,
  onFoodCommitted,
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isQuerying, setIsQuerying] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [quantityG, setQuantityG] = useState('100');
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('LUNCH');
  const [isCommitting, setIsCommitting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Animated laser scanline
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen && isScanning && !scannedProduct) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: SCAN_AREA_SIZE - 4,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [isOpen, isScanning, scannedProduct]);

  if (!isOpen) return null;

  if (!permission) {
    return (
      <View style={styles.overlayContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>&gt; CAMERA_PERMISSION_REQUIRED</Text>
        <Text style={styles.permissionDesc}>
          Accesso alla fotocamera necessario per la scansione ottica dei codici a barre (EAN-13, EAN-8, UPC).
        </Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnPrimaryText}>[ ABILITA FOTOCAMERA ]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
          <Text style={styles.btnSecondaryText}>[ ANNULLA ]</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (!isScanning || isQuerying || scannedProduct) return;

    setIsScanning(false);
    setIsQuerying(true);
    setErrorStatus(null);

    // Haptic lock feedback
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const barcode = result.data;

    try {
      const res = await apiClient.get(`/nutrition/food/barcode/${encodeURIComponent(barcode)}`);
      const item = res.data?.data || res.data;

      const product: ScannedProduct = {
        code: barcode,
        name: item.name || item.product_name || 'Alimento Scansionato',
        brand: item.brand || item.brands || '',
        calories: Number(item.kcalPer100g ?? item.calories ?? item.nutriments?.energy_kcal ?? 0),
        proteins: Number(item.proteinPer100g ?? item.proteins ?? item.nutriments?.proteins ?? 0),
        carbs: Number(item.carbsPer100g ?? item.carbs ?? item.nutriments?.carbohydrates ?? 0),
        fats: Number(item.fatPer100g ?? item.fats ?? item.nutriments?.fat ?? 0),
      };

      setScannedProduct(product);
      setQuantityG('100');
      if (onFoodFound) {
        onFoodFound(product);
      }
    } catch (err: any) {
      setErrorStatus(err.response?.data?.message || err.message || 'Errore risoluzione codice a barre');
      setIsScanning(true);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleCommitLog = async () => {
    if (!scannedProduct) return;

    setIsCommitting(true);
    await hapticFeedback.medium();

    const parsedGrams = Math.max(1, parseFloat(quantityG) || 100);
    const factor = parsedGrams / 100;
    const finalCalories = Math.round(scannedProduct.calories * factor);
    const finalProteins = +(scannedProduct.proteins * factor).toFixed(1);
    const finalCarbs = +(scannedProduct.carbs * factor).toFixed(1);
    const finalFats = +(scannedProduct.fats * factor).toFixed(1);

    const clientSideId = `nutri_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();

    const serverPayload = {
      clientSideId,
      clientUpdatedAt: nowIso,
      loggedAt: nowIso,
      mealType,
      quantityG: parsedGrams,
      customFoodName: scannedProduct.name,
      caloriesConsumed: finalCalories,
      proteinConsumed: finalProteins,
      carbsConsumed: finalCarbs,
      fatConsumed: finalFats,
    };

    const offlinePayload = {
      clientSyncId: clientSideId,
      foodName: scannedProduct.name,
      barcode: scannedProduct.code,
      quantityG: parsedGrams,
      calories: finalCalories,
      proteins: finalProteins,
      carbs: finalCarbs,
      fats: finalFats,
      mealType,
      date: nowIso,
    };

    try {
      let savedOnServer = false;
      try {
        await apiClient.post('/nutrition/logs', serverPayload);
        savedOnServer = true;
      } catch {
        // Rete assente o offline
      }

      if (!savedOnServer) {
        // Fallback automatico offline idempotente
        await useOfflineSyncStore.getState().enqueueMutation('CREATE_NUTRITION_LOG', offlinePayload);
      }

      await hapticFeedback.success();

      if (onFoodCommitted) {
        onFoodCommitted({
          id: clientSideId,
          name: scannedProduct.name,
          brand: scannedProduct.brand,
          grams: parsedGrams,
          calories: finalCalories,
          proteins: finalProteins,
          carbs: finalCarbs,
          fats: finalFats,
          mealType,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorStatus(`Salvataggio fallito: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const factor = (parseFloat(quantityG) || 100) / 100;

  return (
    <View style={styles.overlayContainer}>
      {/* Camera Feed */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={scannedProduct ? undefined : handleBarcodeScanned}
      />

      {/* Top Header Command Bar */}
      <View style={styles.topBar}>
        <View style={styles.topStatus}>
          <View style={styles.pulseDot} />
          <Text style={styles.topStatusText}>
            {scannedProduct ? 'BARCODE_LOCKED' : 'OPTICAL_RADAR_ACTIVE'}
          </Text>
        </View>
        <TouchableOpacity style={styles.btnClose} onPress={onClose}>
          <Text style={styles.btnCloseText}>[ CHIUDI ]</Text>
        </TouchableOpacity>
      </View>

      {/* Optical Frame / Viewfinder */}
      {!scannedProduct && (
        <View style={styles.viewfinderCenter}>
          <View style={styles.viewfinderFrame}>
            {/* Emerald Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Animated Laser Scanline */}
            <Animated.View
              style={[
                styles.laserLine,
                { transform: [{ translateY: scanLineAnim }] },
              ]}
            />
          </View>
          <Text style={styles.viewfinderHint}>
            Inquadra il codice a barre all&apos;interno del mirino
          </Text>

          {isQuerying && (
            <View style={styles.queryingBox}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.queryingText}>Interrogazione OpenFoodFacts / Local Node...</Text>
            </View>
          )}

          {errorStatus && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>! {errorStatus}</Text>
            </View>
          )}
        </View>
      )}

      {/* Scanned Product Card Inline Modal */}
      {scannedProduct && (
        <View style={styles.productCard}>
          <View style={styles.productHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productCode}>EAN: {scannedProduct.code}</Text>
              <Text style={styles.productName} numberOfLines={2}>
                {scannedProduct.name}
              </Text>
              {scannedProduct.brand ? (
                <Text style={styles.productBrand}>{scannedProduct.brand}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.btnRescan}
              onPress={() => {
                setScannedProduct(null);
                setIsScanning(true);
              }}
            >
              <Text style={styles.btnRescanText}>[ RISCANSIONA ]</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Macro Badges */}
          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>CALORIE</Text>
              <Text style={[styles.macroVal, { color: COLORS.accent }]}>
                {Math.round(scannedProduct.calories * factor)} kcal
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>PROTEINE</Text>
              <Text style={[styles.macroVal, { color: COLORS.primary }]}>
                {(scannedProduct.proteins * factor).toFixed(1)} g
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>CARBOIDRATI</Text>
              <Text style={[styles.macroVal, { color: '#60a5fa' }]}>
                {(scannedProduct.carbs * factor).toFixed(1)} g
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>GRASSI</Text>
              <Text style={[styles.macroVal, { color: '#f59e0b' }]}>
                {(scannedProduct.fats * factor).toFixed(1)} g
              </Text>
            </View>
          </View>

          {/* Gram Quantity Input */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>QUANTITÀ (GRAMMI):</Text>
            <TextInput
              style={styles.gramInput}
              keyboardType="numeric"
              value={quantityG}
              onChangeText={setQuantityG}
              selectTextOnFocus
            />
          </View>

          {/* Meal Type Selector */}
          <View style={styles.mealTypeRow}>
            {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.mealBtn, mealType === m && styles.mealBtnActive]}
                onPress={() => setMealType(m)}
              >
                <Text style={[styles.mealBtnText, mealType === m && styles.mealBtnTextActive]}>
                  {m === 'BREAKFAST'
                    ? 'COLAZ'
                    : m === 'LUNCH'
                    ? 'PRANZO'
                    : m === 'DINNER'
                    ? 'CENA'
                    : 'SNACK'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 1-Tap Commit Button */}
          <TouchableOpacity
            style={[styles.btnCommit, isCommitting && styles.btnCommitDisabled]}
            disabled={isCommitting}
            onPress={handleCommitLog}
          >
            {isCommitting ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.btnCommitText}>&gt; COMMIT TO NUTRITION LOG</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 9999,
  },
  permissionContainer: {
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  permissionDesc: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
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
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  btnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#6b7280',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topStatus: {
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
  topStatusText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  btnClose: {
    backgroundColor: 'rgba(13,14,21,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  btnCloseText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#e4e4e7',
    fontSize: 12,
  },
  viewfinderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderFrame: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  viewfinderHint: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#d4d4d8',
    fontSize: 11,
    marginTop: 20,
    backgroundColor: 'rgba(13,14,21,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  queryingBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,14,21,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  queryingText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.primary,
    fontSize: 11,
  },
  errorBox: {
    marginTop: 16,
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#f87171',
    fontSize: 11,
  },
  productCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#71717a',
    fontSize: 10,
    marginBottom: 2,
  },
  productName: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productBrand: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 2,
  },
  btnRescan: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1f2029',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  btnRescanText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    fontSize: 10,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#71717a',
    marginBottom: 2,
  },
  macroVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  inputLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#a1a1aa',
    fontSize: 11,
  },
  gramInput: {
    backgroundColor: COLORS.card,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 90,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mealTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  mealBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  mealBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(78,222,163,0.1)',
  },
  mealBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: '#71717a',
  },
  mealBtnTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  btnCommit: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCommitDisabled: {
    opacity: 0.6,
  },
  btnCommitText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.background,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
