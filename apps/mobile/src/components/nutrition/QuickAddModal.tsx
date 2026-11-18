import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../../config';
import { useOfflineSyncStore, generateClientSideId } from '../../services/offlineSyncQueue';
import { apiClient } from '../../services/api';
import { hapticFeedback } from '../../utils/haptics';

export interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newItem: {
    id: string;
    name: string;
    grams: number;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  }) => void;
  defaultMealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
}

export function QuickAddModal({
  visible,
  onClose,
  onSuccess,
  defaultMealType = 'LUNCH',
}: QuickAddModalProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [proteins, setProteins] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [fiber, setFiber] = useState('');
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>(defaultMealType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = () => {
    setName('');
    setCalories('');
    setProteins('');
    setCarbs('');
    setFats('');
    setFiber('');
    setMealType(defaultMealType);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    const calNum = parseFloat(calories);
    if (isNaN(calNum) || calNum <= 0) {
      Alert.alert('Calorie Obbligatorie', 'Inserisci un valore calorico positivo valido per procedere.');
      return;
    }

    setIsSubmitting(true);
    hapticFeedback.medium();

    const clientSideId = generateClientSideId();
    const nowIso = new Date().toISOString();
    const foodName = name.trim() || 'Aggiunta Rapida';
    const protNum = proteins ? parseFloat(proteins) || 0 : 0;
    const carbsNum = carbs ? parseFloat(carbs) || 0 : 0;
    const fatsNum = fats ? parseFloat(fats) || 0 : 0;
    const fiberNum = fiber ? parseFloat(fiber) : null;

    const payload = {
      clientSideId,
      clientUpdatedAt: nowIso,
      loggedAt: nowIso,
      mealType,
      customFoodName: foodName,
      caloriesConsumed: Math.round(calNum),
      proteinConsumed: protNum,
      carbsConsumed: carbsNum,
      fatConsumed: fatsNum,
      fiberConsumed: fiberNum,
      quantityG: 100,
    };

    try {
      // 1. Tenta sincronizzazione immediata online
      await apiClient.post('/nutrition/logs', payload);
    } catch {
      // 2. Fallback offline-first: inserimento sicuro nella outbox queue
      await useOfflineSyncStore.getState().enqueueMutation('CREATE_NUTRITION_LOG', payload);
    } finally {
      setIsSubmitting(false);
    }

    await hapticFeedback.success();

    onSuccess({
      id: clientSideId,
      name: foodName,
      grams: 100,
      calories: Math.round(calNum),
      proteins: protNum,
      carbs: carbsNum,
      fats: fatsNum,
      mealType,
    });

    handleClose();
  };

  const mealOptions: Array<{ type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'; label: string }> = [
    { type: 'BREAKFAST', label: 'Colazione' },
    { type: 'LUNCH', label: 'Pranzo' },
    { type: 'DINNER', label: 'Cena' },
    { type: 'SNACK', label: 'Spuntini' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>⚡ Quick Add Calorie</Text>
              <Text style={styles.subtitle}>Fallback offline per barcode non reperibili</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.btnClose}>
              <Text style={styles.btnCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Scelta Slot Pasto */}
            <Text style={styles.fieldLabel}>SLOT PASTO</Text>
            <View style={styles.slotsRow}>
              {mealOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.slotChip, mealType === opt.type && styles.slotChipActive]}
                  onPress={() => {
                    hapticFeedback.light();
                    setMealType(opt.type);
                  }}
                >
                  <Text
                    style={[
                      styles.slotChipText,
                      mealType === opt.type && styles.slotChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nome Alimento (opzionale) */}
            <Text style={styles.fieldLabel}>NOME O NOTA (OPZIONALE)</Text>
            <TextInput
              style={styles.input}
              placeholder="es. Pranzo fuori, Barretta, Mela..."
              placeholderTextColor={COLORS.textDim}
              value={name}
              onChangeText={setName}
            />

            {/* Calorie (Obbligatorie) */}
            <Text style={styles.fieldLabel}>
              CALORIE TOTALI (KCAL) <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.inputHighlight]}
              placeholder="es. 450"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />

            {/* Macro Opzionali */}
            <Text style={styles.sectionDivider}>MACRONUTRIENTI OPZIONALI (GRAMMI)</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroCol}>
                <Text style={styles.macroLabel}>PROTEINE</Text>
                <TextInput
                  style={styles.macroInput}
                  placeholder="0g"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={proteins}
                  onChangeText={setProteins}
                />
              </View>
              <View style={styles.macroCol}>
                <Text style={styles.macroLabel}>CARBOIDRATI</Text>
                <TextInput
                  style={styles.macroInput}
                  placeholder="0g"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>
              <View style={styles.macroCol}>
                <Text style={styles.macroLabel}>GRASSI</Text>
                <TextInput
                  style={styles.macroInput}
                  placeholder="0g"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={fats}
                  onChangeText={setFats}
                />
              </View>
            </View>

            {/* Fibre Opzionali */}
            <View style={[styles.macroCol, { marginTop: 12 }]}>
              <Text style={styles.macroLabel}>FIBRE (OPZIONALE)</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="Lascia vuoto per n.d."
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
                value={fiber}
                onChangeText={setFiber}
              />
            </View>

            {/* Pulsanti Azione */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={handleClose} disabled={isSubmitting}>
                <Text style={styles.btnCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSubmit, isSubmitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0d0e15" size="small" />
                ) : (
                  <Text style={styles.btnSubmitText}>Salva nel Diario</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 2,
  },
  btnClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCloseText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  requiredStar: {
    color: COLORS.danger,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  inputHighlight: {
    borderColor: COLORS.primary,
    fontWeight: '600',
    fontSize: 17,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  slotChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  slotChipText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  slotChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  sectionDivider: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDim,
    marginVertical: 10,
    letterSpacing: 0.5,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroCol: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDim,
    marginBottom: 4,
  },
  macroInput: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  btnSubmit: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitText: {
    color: '#0d0e15',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

