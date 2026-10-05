import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../../src/config';
import { GhostingCamera } from '../../src/components/GhostingCamera';
import { useSyncStore } from '../../src/stores/syncStore';
import { hapticFeedback } from '../../src/utils/haptics';

interface ProgressPhotoItem {
  id: string;
  uri: string;
  date: string;
  category: 'FRONT' | 'SIDE' | 'BACK';
  weightKg?: number;
  isLocalOnly: boolean;
}

export default function ProgressScreen() {
  const { addPendingMediaUpload } = useSyncStore();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'FRONT' | 'SIDE' | 'BACK'>('FRONT');

  // Foto storica di riferimento per il Ghosting overlay (URL demo o ultima foto approvata dall'API)
  const [latestGhostPhotoUri, setLatestGhostPhotoUri] = useState<string | null>(
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
  );

  const [photosList, setPhotosList] = useState<ProgressPhotoItem[]>([
    {
      id: 'photo-ref-1',
      uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
      date: '1 Settembre 2026',
      category: 'FRONT',
      weightKg: 80.5,
      isLocalOnly: false,
    },
  ]);

  const handleOpenGhostCamera = (cat: 'FRONT' | 'SIDE' | 'BACK') => {
    setSelectedCategory(cat);
    // Trova l'ultima foto della stessa categoria per l'overlay fantasma
    const lastMatching = photosList.find((p) => p.category === cat);
    if (lastMatching) {
      setLatestGhostPhotoUri(lastMatching.uri);
    } else {
      setLatestGhostPhotoUri(null);
    }
    setIsCameraOpen(true);
  };

  const handlePhotoCaptured = async (persistentLocalUri: string, weightKg?: number) => {
    setIsCameraOpen(false);

    const clientSyncId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const clientCapturedAt = new Date().toISOString();

    // REGOLA FERREA: invia alla coda SOLO l'URI locale del file e il peso (Zero Base64!)
    await addPendingMediaUpload({
      clientSyncId,
      clientCapturedAt,
      localFileUri: persistentLocalUri,
      category: selectedCategory,
      weightKg,
      notes: `Foto progresso ${selectedCategory} da Ghosting Camera`,
    });

    const newPhotoItem: ProgressPhotoItem = {
      id: clientSyncId,
      uri: persistentLocalUri,
      date: 'Oggi (In coda sync)',
      category: selectedCategory,
      weightKg,
      isLocalOnly: true,
    };

    setPhotosList([newPhotoItem, ...photosList]);
    setLatestGhostPhotoUri(persistentLocalUri);

    Alert.alert(
      'Foto Salvata!',
      `La foto ${selectedCategory} ${weightKg ? `(${weightKg}kg)` : ''} è stata salvata sul disco locale ed inserita nella coda di sincronizzazione multipart.`,
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progressi & Ghosting</Text>
          <Text style={styles.subtitle}>
            Mantieni la stessa identica posa e illuminazione sovrapponendo l&apos;ultimo scatto o la sagoma di baseline
          </Text>
        </View>

        {/* Pulsanti Rapidi Scatto per Categoria */}
        <View style={styles.actionsRow}>
          {(['FRONT', 'SIDE', 'BACK'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={styles.btnSnap}
              onPress={() => {
                hapticFeedback.light();
                handleOpenGhostCamera(cat);
              }}
            >
              <Text style={styles.btnSnapIcon}>📸</Text>
              <Text style={styles.btnSnapLabel}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Galleria Scatti */}
        <Text style={styles.sectionHeader}>CRONOLOGIA FOTOGRAFICA</Text>
        <View style={styles.galleryGrid}>
          {photosList.map((item) => (
            <View key={item.id} style={styles.photoCard}>
              <Image
                source={{ uri: item.uri }}
                style={styles.photoThumb}
                contentFit="cover"
                cachePolicy="disk"
                transition={200}
              />
              <View style={styles.photoInfo}>
                <View style={styles.badgeRow}>
                  <Text style={styles.photoCategoryBadge}>{item.category}</Text>
                  {item.isLocalOnly && <Text style={styles.offlineBadge}>LOCALE</Text>}
                </View>
                <Text style={styles.photoDate}>{item.date}</Text>
                {item.weightKg ? (
                  <Text style={styles.weightBadgeText}>⚖️ {item.weightKg} kg</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal Fotocamera Ghosting */}
      <Modal visible={isCameraOpen} animationType="slide">
        <GhostingCamera
          previousPhotoUri={latestGhostPhotoUri}
          category={selectedCategory}
          onPhotoCaptured={handlePhotoCaptured}
          onClose={() => setIsCameraOpen(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  btnSnap: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  btnSnapIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  btnSnapLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  photoThumb: {
    width: '100%',
    height: 180,
    backgroundColor: '#27272a',
  },
  photoInfo: {
    padding: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  photoCategoryBadge: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  offlineBadge: {
    backgroundColor: '#3f3f46',
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoDate: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  weightBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
