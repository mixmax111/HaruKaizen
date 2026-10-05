import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { COLORS, API_BASE_URL } from '../config';
import { hapticFeedback } from '../utils/haptics';

export interface ScannedFoodResult {
  code: string;
  name: string;
  brand?: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

interface BarcodeScannerProps {
  onFoodFound: (food: ScannedFoodResult) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerProps> = ({
  onFoodFound,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  // LOCK anti "machine-gun": impedisce chiamate multiple simultanee finché il codice non è processato
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isLoadingFood, setIsLoadingFood] = useState<boolean>(false);

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
          Per scansionare i codici a barre alimentari (EAN-13) è necessario accedere alla fotocamera.
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

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    // Se lo scanner è bloccato (lock attivo) o sta già effettuando una richiesta di rete, ignora l'evento
    if (!isScanning || isLoadingFood) return;

    // 1. Lock immediato dello scanner
    setIsScanning(false);
    setIsLoadingFood(true);

    // 2. Feedback aptico di successo scansione
    await hapticFeedback.success();

    const rawBarcode = result.data;

    try {
      // 3. Chiamata all'endpoint HaruKaizen backend (OpenFoodFacts proxy con fallback e cache)
      const res = await fetch(`${API_BASE_URL}/nutrition/barcode/${encodeURIComponent(rawBarcode)}`);

      if (!res.ok) {
        throw new Error(`Codice a barre ${rawBarcode} non trovato nel database.`);
      }

      const data = await res.json();
      
      const parsedFood: ScannedFoodResult = {
        code: rawBarcode,
        name: data.name || data.product_name || 'Alimento Scansionato',
        brand: data.brand || data.brands || '',
        calories: Number(data.calories || data.nutriments?.energy_kcal || 0),
        proteins: Number(data.proteins || data.nutriments?.proteins || 0),
        carbs: Number(data.carbs || data.nutriments?.carbohydrates || 0),
        fats: Number(data.fats || data.nutriments?.fat || 0),
      };

      onFoodFound(parsedFood);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Impossibile recuperare il cibo';
      Alert.alert(
        'Prodotto Non Trovato',
        errorMsg,
        [
          {
            text: 'Riprova',
            onPress: () => {
              // Riapre il lock per una nuova scansione
              setIsScanning(true);
              setIsLoadingFood(false);
            },
          },
          {
            text: 'Annulla',
            style: 'cancel',
            onPress: onClose,
          },
        ]
      );
    } finally {
      setIsLoadingFood(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
      >
        {/* Top Bar */}
        <View style={styles.topHud}>
          <TouchableOpacity style={styles.hudButton} onPress={onClose}>
            <Text style={styles.hudButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scansiona Codice a Barre</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Reticolo Mirino Scanner */}
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerReticle}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {isLoadingFood && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Ricerca in corso...</Text>
              </View>
            )}
          </View>
          <Text style={styles.hintText}>Inquadra l&apos;EAN-13 sulla confezione</Text>
        </View>
      </CameraView>
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
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerReticle: {
    width: 280,
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  loadingBox: {
    backgroundColor: 'rgba(24, 24, 27, 0.9)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 20,
    fontWeight: '500',
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
});
