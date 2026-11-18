import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../src/config';
import { BarcodeScannerModal, ScannedFoodResult } from '../../src/components/BarcodeScannerModal';
import { QuickAddModal } from '../../src/components/nutrition/QuickAddModal';
import { useSyncStore } from '../../src/stores/syncStore';
import { useOfflineSyncStore } from '../../src/services/offlineSyncQueue';
import { apiClient } from '../../src/services/api';
import { hapticFeedback } from '../../src/utils/haptics';
import { scheduleMealReminder } from '../../src/services/notificationService';

const RECENT_FOODS_KEY = '@harukaizen:recent_scanned_foods';
const MAX_RECENT_FOODS = 15;

// Target Nutrizionali di default (derivabili da TDEE)
const NUTRITION_TARGETS = {
  calories: 2250,
  proteins: 160,
  carbs: 240,
  fats: 65,
};

interface LoggedFoodItem {
  id: string;
  name: string;
  brand?: string;
  grams: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
}

export default function NutritionScreen() {
  const { enqueueNutrition } = useSyncStore();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isServingModalOpen, setIsServingModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [pendingFood, setPendingFood] = useState<ScannedFoodResult | null>(null);
  const [servingGrams, setServingGrams] = useState<string>('100');
  const [selectedMealType, setSelectedMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('LUNCH');

  const [recentFoods, setRecentFoods] = useState<ScannedFoodResult[]>([]);
  const [loggedItems, setLoggedItems] = useState<LoggedFoodItem[]>([]);

  // Carica i log reali di oggi da backend
  useEffect(() => {
    async function loadTodayLogs() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await apiClient.get(`/nutrition/logs?date=${today}`);
        const logs = res.data?.data || res.data;
        if (Array.isArray(logs) && logs.length > 0) {
          const mapped: LoggedFoodItem[] = logs.map((log: any) => ({
            id: log.id,
            name: log.customFoodName || log.foodItem?.name || 'Alimento',
            brand: log.foodItem?.brand || '',
            grams: Number(log.quantityG || 100),
            calories: Number(log.caloriesConsumed || 0),
            proteins: Number(log.proteinConsumed || 0),
            carbs: Number(log.carbsConsumed || 0),
            fats: Number(log.fatConsumed || 0),
            mealType: log.mealType || 'LUNCH',
          }));
          setLoggedItems(mapped);
        }
      } catch {
        // Fallback silenzioso se offline
      }
    }
    loadTodayLogs();
  }, []);

  // Carica la cronologia degli alimenti recenti all'avvio
  useEffect(() => {
    async function loadRecentFoods() {
      try {
        const raw = await AsyncStorage.getItem(RECENT_FOODS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setRecentFoods(parsed);
          }
        }
      } catch (err) {
        console.warn('Errore lettura alimenti recenti:', err);
      }
    }
    loadRecentFoods();
  }, []);

  const saveToRecentFoods = async (food: ScannedFoodResult) => {
    try {
      const filtered = recentFoods.filter(
        (f) => (f.code && f.code === food.code) ? false : f.name.toLowerCase() !== food.name.toLowerCase()
      );
      const updated = [food, ...filtered].slice(0, MAX_RECENT_FOODS);
      setRecentFoods(updated);
      await AsyncStorage.setItem(RECENT_FOODS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Errore salvataggio alimenti recenti:', err);
    }
  };

  const handleFoodScanned = (food: ScannedFoodResult) => {
    setIsScannerOpen(false);
    setPendingFood(food);
    setServingGrams('100');
    setIsServingModalOpen(true);
  };

  const handleSelectRecentFood = (food: ScannedFoodResult) => {
    hapticFeedback.light();
    setPendingFood(food);
    setServingGrams('100');
    setIsServingModalOpen(true);
  };

  const handleSearchFoods = async (q: string) => {
    setSearchQuery(q);
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await apiClient.get('/nutrition/food/search', { params: { q: trimmed } });
      const items = res.data?.data || res.data;
      if (Array.isArray(items)) {
        setSearchResults(items);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      setSearchError(err.response?.data?.message || 'Errore durante la ricerca alimenti');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    hapticFeedback.light();
    setIsSearchModalOpen(false);
    const food: ScannedFoodResult = {
      code: item.barcode || '',
      name: item.name,
      brand: item.brand || '',
      calories: Number(item.kcalPer100g ?? item.calories ?? 0),
      proteins: Number(item.proteinPer100g ?? item.proteins ?? 0),
      carbs: Number(item.carbsPer100g ?? item.carbs ?? 0),
      fats: Number(item.fatPer100g ?? item.fats ?? 0),
    };
    handleFoodScanned(food);
  };

  const handleConfirmAddFood = async () => {
    if (!pendingFood) return;

    const grams = parseFloat(servingGrams) || 100;
    const factor = grams / 100;

    const calculatedCalories = Math.round(pendingFood.calories * factor);
    const calculatedProteins = +(pendingFood.proteins * factor).toFixed(1);
    const calculatedCarbs = +(pendingFood.carbs * factor).toFixed(1);
    const calculatedFats = +(pendingFood.fats * factor).toFixed(1);

    const clientSyncId = `nutri_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();

    const serverPayload = {
      loggedAt: nowIso,
      mealType: selectedMealType,
      quantityG: grams,
      customFoodName: pendingFood.name,
      caloriesConsumed: calculatedCalories,
      proteinConsumed: calculatedProteins,
      carbsConsumed: calculatedCarbs,
      fatConsumed: calculatedFats,
    };

    const offlinePayload = {
      clientSyncId,
      clientCapturedAt: nowIso,
      barcode: pendingFood.code,
      foodName: pendingFood.name,
      calories: calculatedCalories,
      proteins: calculatedProteins,
      carbs: calculatedCarbs,
      fats: calculatedFats,
      grams,
      mealType: selectedMealType,
    };

    try {
      await apiClient.post('/nutrition/logs', serverPayload);
    } catch {
      await useOfflineSyncStore.getState().enqueueMutation('CREATE_NUTRITION_LOG', {
        ...offlinePayload,
        quantityG: grams,
      });
      await enqueueNutrition(offlinePayload);
    }

    // Salva tra i recenti
    await saveToRecentFoods(pendingFood);

    // Aggiunge localmente alla vista UI
    const newItem: LoggedFoodItem = {
      id: clientSyncId,
      name: pendingFood.name,
      brand: pendingFood.brand,
      grams,
      calories: calculatedCalories,
      proteins: calculatedProteins,
      carbs: calculatedCarbs,
      fats: calculatedFats,
      mealType: selectedMealType,
    };

    setLoggedItems((prev) => [newItem, ...prev]);
    setIsServingModalOpen(false);
    setPendingFood(null);

    await hapticFeedback.success();
    Alert.alert('Alimento Registrato', `${newItem.name} (${grams}g) salvato nel diario.`);
  };

  const handleSetReminder = async (hours: number, label: string) => {
    hapticFeedback.medium();
    setIsReminderModalOpen(false);
    const notifId = await scheduleMealReminder(label, hours * 60);
    if (notifId) {
      Alert.alert('Promemoria Impostato! â°', `Riceverai una notifica per "${label}" tra ${hours} ore.`);
    } else {
      Alert.alert('Promemoria', 'Abilita le notifiche nelle impostazioni del telefono per ricevere promemoria.');
    }
  };

  // Calcoli Somme e Percentuali vs Target TDEE
  const totalCalories = loggedItems.reduce((acc, curr) => acc + curr.calories, 0);
  const totalProteins = loggedItems.reduce((acc, curr) => acc + curr.proteins, 0);
  const totalCarbs = loggedItems.reduce((acc, curr) => acc + curr.carbs, 0);
  const totalFats = loggedItems.reduce((acc, curr) => acc + curr.fats, 0);

  const caloriesRemaining = Math.max(0, NUTRITION_TARGETS.calories - totalCalories);
  const calPercent = Math.min(100, Math.round((totalCalories / NUTRITION_TARGETS.calories) * 100));
  const protPercent = Math.min(100, Math.round((totalProteins / NUTRITION_TARGETS.proteins) * 100));
  const carbPercent = Math.min(100, Math.round((totalCarbs / NUTRITION_TARGETS.carbs) * 100));
  const fatPercent = Math.min(100, Math.round((totalFats / NUTRITION_TARGETS.fats) * 100));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header con pulsante scanner e promemoria */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.title}>Diario Nutrizionale</Text>
            <Text style={styles.subtitle}>Tracker rapido & Barcode EAN-13</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.btnQuickAdd}
              onPress={() => {
                hapticFeedback.light();
                setIsQuickAddOpen(true);
              }}
            >
              <Text style={styles.btnQuickAddIcon}>⚡</Text>
              <Text style={styles.btnQuickAddText}>Quick</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnReminder}
              onPress={() => {
                hapticFeedback.light();
                setIsSearchModalOpen(true);
              }}
            >
              <Text style={styles.btnReminderIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnReminder}
              onPress={() => {
                hapticFeedback.light();
                setIsReminderModalOpen(true);
              }}
            >
              <Text style={styles.btnReminderIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnScan}
              onPress={() => {
                hapticFeedback.light();
                setIsScannerOpen(true);
              }}
            >
              <Text style={styles.btnScanIcon}>📷</Text>
              <Text style={styles.btnScanText}>Barcode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Totali Giornalieri Card & Target TDEE */}
        <View style={styles.summaryCard}>
          <View style={styles.calRow}>
            <View>
              <Text style={styles.calLabel}>CALORIE TOTALI</Text>
              <Text style={styles.calValue}>
                {totalCalories} <Text style={styles.calUnit}>/ {NUTRITION_TARGETS.calories} kcal</Text>
              </Text>
            </View>
            <View style={styles.remainingPill}>
              <Text style={styles.remainingText}>
                {caloriesRemaining > 0 ? `-${caloriesRemaining} rimaste` : 'Target raggiunto!'}
              </Text>
            </View>
          </View>

          {/* Barra progresso Calorie */}
          <View style={styles.calProgressBarBg}>
            <View style={[styles.calProgressBarFill, { width: `${calPercent}%` }]} />
          </View>

          {/* Macro Grid con barre dinamiche */}
          <View style={styles.macroGrid}>
            <View style={styles.macroBox}>
              <Text style={styles.macroName}>PROTEINE</Text>
              <Text style={[styles.macroVal, { color: COLORS.primary }]}>
                {totalProteins.toFixed(0)} <Text style={styles.macroTargetSmall}>/ {NUTRITION_TARGETS.proteins}g</Text>
              </Text>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { width: `${protPercent}%`, backgroundColor: COLORS.primary }]} />
              </View>
            </View>

            <View style={styles.macroBox}>
              <Text style={styles.macroName}>CARBOIDRATI</Text>
              <Text style={[styles.macroVal, { color: COLORS.secondary }]}>
                {totalCarbs.toFixed(0)} <Text style={styles.macroTargetSmall}>/ {NUTRITION_TARGETS.carbs}g</Text>
              </Text>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { width: `${carbPercent}%`, backgroundColor: COLORS.secondary }]} />
              </View>
            </View>

            <View style={styles.macroBox}>
              <Text style={styles.macroName}>GRASSI</Text>
              <Text style={[styles.macroVal, { color: COLORS.accent }]}>
                {totalFats.toFixed(0)} <Text style={styles.macroTargetSmall}>/ {NUTRITION_TARGETS.fats}g</Text>
              </Text>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { width: `${fatPercent}%`, backgroundColor: COLORS.accent }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Sezione Alimenti Recenti / Preferiti Rapidi */}
        {recentFoods.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionHeader}>RECENTI & PREFERITI (+1 TAP)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
              {recentFoods.map((f, idx) => (
                <TouchableOpacity
                  key={`${f.name}-${idx}`}
                  style={styles.recentCard}
                  onPress={() => handleSelectRecentFood(f)}
                >
                  <View style={styles.recentHeaderRow}>
                    <Text style={styles.recentFoodName} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <View style={styles.quickAddBadge}>
                      <Text style={styles.quickAddPlus}>+</Text>
                    </View>
                  </View>
                  <Text style={styles.recentFoodBrand} numberOfLines={1}>
                    {f.brand || '100g standard'}
                  </Text>
                  <Text style={styles.recentFoodCals}>
                    {f.calories} kcal <Text style={styles.recentMacrosText}>â€¢ P:{f.proteins}g</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Lista Alimenti Odierni */}
        <Text style={styles.sectionHeader}>ALIMENTI DI OGGI</Text>
        {loggedItems.map((item) => (
          <View key={item.id} style={styles.foodCard}>
            <View style={styles.foodMainInfo}>
              <Text style={styles.foodName}>{item.name}</Text>
              {item.brand ? <Text style={styles.foodBrand}>{item.brand}</Text> : null}
              <Text style={styles.foodPortion}>
                {item.grams}g â€¢ {item.mealType}
              </Text>
            </View>
            <View style={styles.foodMacros}>
              <Text style={styles.foodCal}>{item.calories} kcal</Text>
              <Text style={styles.foodMacroBreakdown}>
                P: {item.proteins}g | C: {item.carbs}g | G: {item.fats}g
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal Fotocamera Barcode Scanner */}
      <Modal visible={isScannerOpen} animationType="slide">
        <BarcodeScannerModal
          onFoodFound={handleFoodScanned}
          onClose={() => setIsScannerOpen(false)}
        />
      </Modal>

      {/* Modal QuantitÃ  e Porzione post-scansione o da recenti */}
      <Modal visible={isServingModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Aggiungi Alimento</Text>
            <Text style={styles.scannedFoodTitle}>{pendingFood?.name}</Text>
            {pendingFood?.brand ? (
              <Text style={styles.scannedFoodBrand}>{pendingFood.brand}</Text>
            ) : null}

            <Text style={styles.inputLabel}>Grammi consumati:</Text>
            <TextInput
              style={styles.gramsInput}
              keyboardType="numeric"
              value={servingGrams}
              onChangeText={setServingGrams}
              placeholder="100"
              placeholderTextColor={COLORS.textDim}
            />

            <Text style={styles.inputLabel}>Pasto:</Text>
            <View style={styles.mealTypeButtons}>
              {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeBtn,
                    selectedMealType === type && styles.mealTypeBtnActive,
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedMealType(type);
                  }}
                >
                  <Text
                    style={[
                      styles.mealTypeBtnText,
                      selectedMealType === type && styles.mealTypeBtnTextActive,
                    ]}
                  >
                    {type === 'BREAKFAST'
                      ? 'Colazione'
                      : type === 'LUNCH'
                      ? 'Pranzo'
                      : type === 'DINNER'
                      ? 'Cena'
                      : 'Snack'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setIsServingModalOpen(false);
                  setPendingFood(null);
                }}
              >
                <Text style={styles.modalBtnCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmAddFood}
              >
                <Text style={styles.modalBtnConfirmText}>Salva Pasto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Promemoria Pasto Schedulabile */}
      <Modal visible={isReminderModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>â° Imposta Promemoria Pasto</Text>
            <Text style={styles.reminderDesc}>
              Ricevi una notifica push locale per ricordarti di registrare i macronutrienti:
            </Text>

            <TouchableOpacity
              style={styles.reminderOptionBtn}
              onPress={() => handleSetReminder(1, 'Spuntino Pom')}
            >
              <Text style={styles.reminderOptionTitle}>Tra 1 ora</Text>
              <Text style={styles.reminderOptionSub}>Spuntino / Pre-Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reminderOptionBtn}
              onPress={() => handleSetReminder(3, 'Pranzo / Cena')}
            >
              <Text style={styles.reminderOptionTitle}>Tra 3 ore</Text>
              <Text style={styles.reminderOptionSub}>Pasto Principale</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reminderOptionBtn}
              onPress={() => handleSetReminder(5, 'Cena serale')}
            >
              <Text style={styles.reminderOptionTitle}>Tra 5 ore</Text>
              <Text style={styles.reminderOptionSub}>Controllo serale macro</Text>
            </TouchableOpacity>

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalBtnCancel]}
                onPress={() => setIsReminderModalOpen(false)}
              >
                <Text style={styles.modalBtnCancelText}>Chiudi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Ricerca Alimenti Open Food Facts v3 & USDA */}
      <Modal visible={isSearchModalOpen} animationType="slide">
        <View style={styles.searchModalContainer}>
          <View style={styles.searchModalHeader}>
            <Text style={styles.searchModalTitle}>RICERCA ALIMENTI (OFF v3 / USDA)</Text>
            <TouchableOpacity
              style={styles.searchCloseBtn}
              onPress={() => {
                hapticFeedback.light();
                setIsSearchModalOpen(false);
              }}
            >
              <Text style={styles.searchCloseBtnText}>✕ CHIUDI</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchInputRow}>
            <TextInput
              style={styles.searchTextInput}
              value={searchQuery}
              onChangeText={handleSearchFoods}
              placeholder="Cerca es. riso basmati, petto pollo, avena..."
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="none"
              autoFocus
            />
            {isSearching && (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={{ marginLeft: 8 }}
              />
            )}
          </View>

          {searchError && (
            <Text style={styles.searchErrorText}>{searchError}</Text>
          )}

          <ScrollView style={styles.searchResultsList}>
            {searchResults.map((item, idx) => (
              <TouchableOpacity
                key={`${item.name}-${idx}`}
                style={styles.searchResultItem}
                onPress={() => handleSelectSearchResult(item)}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.searchResultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.brand ? (
                    <Text style={styles.searchResultBrand} numberOfLines={1}>
                      {item.brand}
                    </Text>
                  ) : null}
                  <View style={styles.sourceBadgeRow}>
                    <Text style={styles.sourceBadgeText}>
                      [{item.source || 'OFF_V3'}]
                    </Text>
                    {item.barcode ? (
                      <Text style={styles.barcodeSubText}>EAN: {item.barcode}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.searchResultMacros}>
                  <Text style={styles.searchResultCal}>
                    {Math.round(item.kcalPer100g ?? item.calories ?? 0)} kcal
                  </Text>
                  <Text style={styles.searchResultMacroText}>
                    P:{Math.round(item.proteinPer100g ?? item.proteins ?? 0)}g • C:{Math.round(item.carbsPer100g ?? item.carbs ?? 0)}g
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {!isSearching && searchResults.length === 0 && searchQuery.trim().length > 1 && (
              <Text style={styles.searchEmptyText}>Nessun alimento trovato per &quot;{searchQuery}&quot;</Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Quick Add Offline-First */}
      <QuickAddModal
        visible={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        defaultMealType={selectedMealType}
        onSuccess={(newItem) => {
          setLoggedItems((prev) => [newItem, ...prev]);
        }}
      />
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnQuickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  btnQuickAddIcon: {
    fontSize: 14,
  },
  btnQuickAddText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  btnReminder: {
    backgroundColor: '#27272a',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  btnReminderIcon: {
    fontSize: 16,
  },
  btnScan: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnScanIcon: {
    fontSize: 16,
  },
  btnScanText: {
    color: '#09090b',
    fontWeight: '700',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calLabel: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
  },
  calUnit: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  remainingPill: {
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  remainingText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  calProgressBarBg: {
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 18,
  },
  calProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  macroBox: {
    flex: 1,
    backgroundColor: '#121215',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  macroName: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  macroVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  macroTargetSmall: {
    fontSize: 10,
    color: COLORS.textDim,
    fontWeight: '500',
  },
  macroBarBg: {
    height: 4,
    backgroundColor: '#27272a',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  recentSection: {
    marginBottom: 20,
  },
  recentScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  recentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    width: 150,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  recentFoodName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 4,
  },
  quickAddBadge: {
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddPlus: {
    color: '#09090b',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 14,
  },
  recentFoodBrand: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  recentFoodCals: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  recentMacrosText: {
    color: COLORS.textDim,
    fontWeight: '500',
    fontSize: 11,
  },
  sectionHeader: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  foodCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodMainInfo: {
    flex: 1,
    paddingRight: 10,
  },
  foodName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  foodBrand: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  foodPortion: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
  },
  foodMacros: {
    alignItems: 'flex-end',
  },
  foodCal: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  foodMacroBreakdown: {
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  reminderDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  reminderOptionBtn: {
    backgroundColor: '#27272a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  reminderOptionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  reminderOptionSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  scannedFoodTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  scannedFoodBrand: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  gramsInput: {
    backgroundColor: '#27272a',
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  mealTypeBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mealTypeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  mealTypeBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  mealTypeBtnTextActive: {
    color: '#09090b',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalBtnCancel: {
    backgroundColor: '#27272a',
  },
  modalBtnCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalBtnConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalBtnConfirmText: {
    color: '#09090b',
    fontWeight: '700',
  },
  searchModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchModalTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchCloseBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchCloseBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1b22',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchTextInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  searchErrorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginBottom: 8,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchResultName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  searchResultBrand: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sourceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sourceBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  barcodeSubText: {
    color: COLORS.textDim,
    fontSize: 10,
  },
  searchResultMacros: {
    alignItems: 'flex-end',
  },
  searchResultCal: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  searchResultMacroText: {
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  searchEmptyText: {
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
});

