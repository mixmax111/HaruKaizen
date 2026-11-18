import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, API_BASE_URL } from '../../src/config';
import { apiClient, setAuthTokens } from '../../src/services/api';
import { hapticFeedback } from '../../src/utils/haptics';
import { AltchaChallenge } from '../../src/components/auth/AltchaChallenge';
import { solveAltcha, AltchaChallenge as IAltchaChallenge } from '../../src/utils/altchaSolver';

export default function MobileRegisterScreen() {
  const router = useRouter();

  // Credenziali
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Biometria opzionale
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [lifestyleMultiplier, setLifestyleMultiplier] = useState('1.55');

  // Stati UI
  const [isLoading, setIsLoading] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const [isFocusedConfirm, setIsFocusedConfirm] = useState(false);
  const [isFocusedHeight, setIsFocusedHeight] = useState(false);
  const [isFocusedWeight, setIsFocusedWeight] = useState(false);

  // Altcha PoW Verified Payload
  const [altchaPayload, setAltchaPayload] = useState<string>('');

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Errore', 'Inserisci email e password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Errore', 'Le password inserite non coincidono.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Errore', 'La password deve contenere almeno 8 caratteri.');
      return;
    }

    setIsLoading(true);
    await hapticFeedback.medium();

    try {
      let payloadToSubmit = altchaPayload;

      // Se il PoW non è ancora completato, calcolalo automaticamente on-the-fly in ~40ms
      if (!payloadToSubmit) {
        try {
          const challengeRes = await apiClient.get('/auth/altcha-challenge', { timeout: 10000 });
          const challengeData: IAltchaChallenge = challengeRes.data?.data || challengeRes.data;
          if (!challengeData?.challenge) {
            throw new Error('Sfida crittografica non ricevuta dal gateway.');
          }
          const { base64Payload } = await solveAltcha(challengeData);
          payloadToSubmit = base64Payload;
          setAltchaPayload(base64Payload);
        } catch (powErr: any) {
          throw new Error('Impossibile completare la verifica crittografica anti-bot. Verifica la connessione al server.');
        }
      }

      // 1. Registrazione account base via central apiClient
      const response = await apiClient.post('/auth/register', {
        email: email.trim(),
        password,
        altchaPayload: payloadToSubmit,
      });

      const resData = response.data?.data || response.data;
      const token = resData?.accessToken;
      const refreshToken = resData?.refreshToken;
      if (!token) {
        throw new Error('Nessun token di accesso ricevuto dal server.');
      }

      // Salva token in locale
      await setAuthTokens(token, refreshToken || null);

      // 2. Salvataggio biometria se inserita (Altezza, Sesso, Indice di attività)
      const patchData: Record<string, any> = {};
      if (heightCm.trim()) patchData.heightCm = Number(heightCm.trim());
      if (sex) patchData.sex = sex;
      if (lifestyleMultiplier) patchData.lifestyleMultiplier = Number(lifestyleMultiplier);

      if (Object.keys(patchData).length > 0) {
        try {
          await apiClient.patch('/users/me', patchData);
        } catch (e) {
          console.warn('Errore salvataggio biometria secondaria:', e);
        }
      }

      // 3. Salvataggio peso iniziale se inserito
      if (weightKg.trim()) {
        try {
          await apiClient.post('/measurements', {
            weightKg: Number(weightKg.trim()),
            date: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Errore salvataggio peso iniziale:', e);
        }
      }

      await hapticFeedback.success();
      Alert.alert(
        'Inizializzazione Riuscita',
        'Profilo sovrano creato con successo su HaruKaizen.',
        [{ text: 'Accedi alla Dashboard', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Errore di connessione al nodo backend o registrazione non riuscita.';
      Alert.alert('Registrazione Fallita', msg);
      await hapticFeedback.warning();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Terminal Header Ribbon */}
        <View style={styles.terminalHeader}>
          <View style={styles.headerDots}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <View style={[styles.dot, { backgroundColor: '#eab308' }]} />
            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.terminalNodeText}>NODE: HK-MOBILE-PROVISION</Text>
          </View>
          <View style={styles.tlsBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.tlsText}>TLS_v1.3</Text>
          </View>
        </View>

        {/* Brand & Subtitle */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandIcon}>🌸</Text>
          <Text style={styles.brandTitle}>HaruKaizen</Text>
          <Text style={styles.brandSubtitle}>
            Sovereign Profile & Telemetry Provisioning
          </Text>
        </View>

        {/* Terminal Card */}
        <View style={styles.terminalCard}>
          <Text style={styles.cardHeader}>&gt; INITIALIZE_OPERATOR_IDENTITY</Text>

          {/* Email Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; TARGET_EMAIL *</Text>
            <TextInput
              style={[
                styles.textInput,
                isFocusedEmail && styles.textInputFocused,
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="operator@harukaizen.local"
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setIsFocusedEmail(true)}
              onBlur={() => setIsFocusedEmail(false)}
            />
          </View>

          {/* Password Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; SECURE_PASSPHRASE *</Text>
            <TextInput
              style={[
                styles.textInput,
                isFocusedPassword && styles.textInputFocused,
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="min. 8 caratteri"
              placeholderTextColor={COLORS.textDim}
              secureTextEntry
              onFocus={() => setIsFocusedPassword(true)}
              onBlur={() => setIsFocusedPassword(false)}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; CONFIRM_PASSPHRASE *</Text>
            <TextInput
              style={[
                styles.textInput,
                isFocusedConfirm && styles.textInputFocused,
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="ripeti passphrase"
              placeholderTextColor={COLORS.textDim}
              secureTextEntry
              onFocus={() => setIsFocusedConfirm(true)}
              onBlur={() => setIsFocusedConfirm(false)}
            />
          </View>

          {/* Sezione Biometria */}
          <Text style={styles.sectionDivider}>[PARAMETRI BIOMETRICI OPZIONALI]</Text>

          <View style={styles.rowFields}>
            {/* Altezza */}
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>&gt; ALTEZZA (CM)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  isFocusedHeight && styles.textInputFocused,
                ]}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="178"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
                onFocus={() => setIsFocusedHeight(true)}
                onBlur={() => setIsFocusedHeight(false)}
              />
            </View>

            {/* Peso */}
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>&gt; PESO (KG)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  isFocusedWeight && styles.textInputFocused,
                ]}
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="75.5"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
                onFocus={() => setIsFocusedWeight(true)}
                onBlur={() => setIsFocusedWeight(false)}
              />
            </View>
          </View>

          {/* Sesso biologico */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; SESSO BIOLOGICO</Text>
            <View style={styles.sexButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.sexBtn,
                  sex === 'M' && styles.sexBtnActive,
                ]}
                onPress={() => setSex('M')}
              >
                <Text style={[styles.sexBtnText, sex === 'M' && styles.sexBtnTextActive]}>
                  [MASCHIO]
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sexBtn,
                  sex === 'F' && styles.sexBtnActive,
                ]}
                onPress={() => setSex('F')}
              >
                <Text style={[styles.sexBtnText, sex === 'F' && styles.sexBtnTextActive]}>
                  [FEMMINA]
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Indice di attività */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; LIVELLO ATTIVITÀ FISICA</Text>
            <View style={styles.activityGrid}>
              {[
                { label: 'Sedentario (1.2)', val: '1.2' },
                { label: 'Moderato 1-3x (1.375)', val: '1.375' },
                { label: 'Attivo 3-5x (1.55)', val: '1.55' },
                { label: 'Intenso 6-7x (1.725)', val: '1.725' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.val}
                  style={[
                    styles.activityChip,
                    lifestyleMultiplier === opt.val && styles.activityChipActive,
                  ]}
                  onPress={() => setLifestyleMultiplier(opt.val)}
                >
                  <Text
                    style={[
                      styles.activityChipText,
                      lifestyleMultiplier === opt.val && styles.activityChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Proof-of-Work Challenge */}
          <AltchaChallenge
            isVerified={Boolean(altchaPayload)}
            onVerified={(payload) => setAltchaPayload(payload)}
            onReset={() => setAltchaPayload('')}
          />

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.btnRegister,
              isLoading ? styles.btnRegisterDisabled : styles.btnRegisterActive,
            ]}
            disabled={isLoading}
            onPress={handleRegister}
          >
            {isLoading ? (
              <ActivityIndicator color="#0d0e15" />
            ) : (
              <Text
                style={[
                  styles.btnRegisterText,
                  styles.btnRegisterTextActive,
                ]}
              >
                [INIZIALIZZA PROFILO NODO]
              </Text>
            )}
          </TouchableOpacity>

          {/* Switch to Login */}
          <TouchableOpacity
            style={styles.switchAuthBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.switchAuthText}>
              Hai già un profilo attivo? <Text style={styles.switchAuthLink}>Accedi al Gateway &gt;</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Egress: 0.00 B • Zero External Telemetry
          </Text>
          <Text style={styles.footerSubtext}>
            Node Target: {API_BASE_URL}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  terminalNodeText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
    marginLeft: 6,
  },
  tlsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.2)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  tlsText: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  brandTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  brandSubtitle: {
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  terminalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionDivider: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
    marginVertical: 12,
    letterSpacing: 0.5,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  textInputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  sexButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sexBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  sexBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
  },
  sexBtnText: {
    color: COLORS.textDim,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
  },
  sexBtnTextActive: {
    color: COLORS.primary,
  },
  activityGrid: {
    gap: 6,
  },
  activityChip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  activityChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(78, 222, 163, 0.12)',
  },
  activityChipText: {
    color: COLORS.textDim,
    fontFamily: 'monospace',
    fontSize: 10,
  },
  activityChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  altchaContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginVertical: 14,
  },
  altchaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  altchaTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  altchaStatusText: {
    color: COLORS.textDim,
    fontSize: 9,
    fontFamily: 'monospace',
  },
  altchaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  altchaAwaitText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  altchaBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  altchaBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  altchaComputingBox: {
    gap: 6,
  },
  altchaComputeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  altchaComputeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  altchaNonceText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#27272a',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  altchaVerifiedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
  altchaVerifiedText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  altchaHashText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  btnRegister: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRegisterDisabled: {
    backgroundColor: '#27272a',
    opacity: 0.6,
  },
  btnRegisterActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  btnRegisterText: {
    color: COLORS.textDim,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnRegisterTextActive: {
    color: '#0d0e15',
  },
  switchAuthBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchAuthText: {
    color: COLORS.textDim,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  switchAuthLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  footerSubtext: {
    color: '#52525b',
    fontSize: 9,
    fontFamily: 'monospace',
  },
});

