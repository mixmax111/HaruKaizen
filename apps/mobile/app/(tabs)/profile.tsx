import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COLORS,
  API_BASE_URL,
  initApiBaseUrl,
  setDynamicApiBaseUrl,
  resetDynamicApiBaseUrl,
} from '../../src/config';
import { clearAuthTokens } from '../../src/services/api';
import { offlineSyncService } from '../../src/services/offlineSyncQueue';
import { hapticFeedback } from '../../src/utils/haptics';

export default function MobileProfileScreen() {
  const router = useRouter();

  // User state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('');
  const [lifestyleMultiplier, setLifestyleMultiplier] = useState('1.55');

  // AI & BYOK State
  const [preferredProvider, setPreferredProvider] = useState('gemini');
  const [modelPreset, setModelPreset] = useState<'fast' | 'reasoning' | 'vision' | 'custom'>('fast');
  const [customModel, setCustomModel] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Node Endpoint Configuration State
  const [serverUrlInput, setServerUrlInput] = useState(API_BASE_URL);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [isTestingPing, setIsTestingPing] = useState(false);

  useEffect(() => {
    initApiBaseUrl().then((url) => setServerUrlInput(url));
    loadProfileData();
  }, []);

  const handleTestPing = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    try {
      let testEndpoint = serverUrlInput.trim().replace(/\/+$/, '');
      if (!testEndpoint.endsWith('/api/v1') && !testEndpoint.includes('/api/')) {
        testEndpoint = `${testEndpoint}/api/v1/health`;
      } else {
        testEndpoint = `${testEndpoint}/health`;
      }

      const res = await fetch(testEndpoint);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data || json;
        setPingResult(`ONLINE: ${data?.dbEngine || 'Node OK'} (Ping: ${data?.dbLatencyMs ?? '<1'}ms)`);
        await hapticFeedback.success();
      } else {
        setPingResult(`HTTP ${res.status}`);
        await hapticFeedback.warning();
      }
    } catch (e: any) {
      setPingResult(`OFFLINE: ${e.message || 'Host irraggiungibile'}`);
      await hapticFeedback.warning();
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleSaveEndpoint = async () => {
    const saved = await setDynamicApiBaseUrl(serverUrlInput);
    setServerUrlInput(saved);
    await hapticFeedback.success();
    Alert.alert('Endpoint Aggiornato', `Il nodo ora punta a: ${saved}`);
  };

  const handleResetEndpoint = async () => {
    const def = await resetDynamicApiBaseUrl();
    setServerUrlInput(def);
    await hapticFeedback.light();
    Alert.alert('Endpoint Ripristinato', `Ripristinato valore standard: ${def}`);
  };

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('@harukaizen:auth_token');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // 1. Fetch Dati Utente
      const userRes = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (userRes.status === 401) {
        await clearAuthTokens();
        router.replace('/(auth)/login');
        return;
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        const user = userData?.data || userData;

        setEmail(user.email || '');
        setRole(user.role || 'USER');
        if (user.heightCm) setHeightCm(String(user.heightCm));
        if (user.sex) setSex(user.sex);
        if (user.birthDate) {
          const d = new Date(user.birthDate);
          setBirthDate(d.toISOString().split('T')[0]);
        }
        if (user.lifestyleMultiplier) setLifestyleMultiplier(String(user.lifestyleMultiplier));
        if (user.userSettings?.targetWeightKg) setTargetWeightKg(String(user.userSettings.targetWeightKg));
      }

      // 2. Fetch Impostazioni AI & BYOK
      const settingsRes = await fetch(`${API_BASE_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        const settings = sData?.data || sData;
        if (settings) {
          const prov = settings.preferredLlmProvider || 'gemini';
          setPreferredProvider(prov);
          setCustomBaseUrl(settings.customLlmBaseUrl || '');
          setHasExistingKey(Boolean(settings.hasApiKey));
          const model = settings.preferredLlmModel || '';
          if (model) {
            setCustomModel(model);
            setModelPreset('custom');
          }
        }
      }

      // 3. Fetch Ultima Misurazione Peso
      const measRes = await fetch(`${API_BASE_URL}/measurements`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (measRes.ok) {
        const measData = await measRes.json();
        const list = measData?.data || measData;
        if (Array.isArray(list) && list.length > 0) {
          const latest = list[0];
          if (latest.weightKg) {
            setWeightKg(String(latest.weightKg));
          }
        }
      }
    } catch (err: any) {
      console.warn('Errore caricamento profilo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setStatusMessage('');
    await hapticFeedback.medium();

    try {
      const token = await AsyncStorage.getItem('@harukaizen:auth_token');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // 1. Salva dati biometrici di base su /users/me
      const patchUser: Record<string, any> = {};
      if (heightCm.trim()) patchUser.heightCm = Number(heightCm.trim());
      if (sex) patchUser.sex = sex;
      if (birthDate.trim()) patchUser.birthDate = birthDate.trim();
      if (lifestyleMultiplier) patchUser.lifestyleMultiplier = Number(lifestyleMultiplier);

      const userRes = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patchUser),
      });

      if (!userRes.ok) {
        const errData = await userRes.json();
        throw new Error(errData?.error?.message || errData?.message || 'Errore salvataggio biometria.');
      }

      // 2. Salva peso corrente se modificato con outbox offline idempotente
      if (weightKg.trim()) {
        const parsedWeight = Number(weightKg.trim());
        try {
          const mRes = await fetch(`${API_BASE_URL}/measurements`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              weightKg: parsedWeight,
              date: new Date().toISOString(),
            }),
          });
          if (!mRes.ok) {
            throw new Error(`HTTP ${mRes.status}`);
          }
        } catch (e) {
          console.warn('Rete non disponibile: inserimento misurazione in Outbox offline');
          await offlineSyncService.enqueue('CREATE_MEASUREMENT', {
            weightKg: parsedWeight,
            recordedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Salva impostazioni generali e AI su /settings
      const settingsPayload: Record<string, any> = {
        preferredLlmProvider: preferredProvider,
        customLlmBaseUrl: customBaseUrl.trim() || null,
      };

      if (targetWeightKg.trim()) {
        settingsPayload.targetWeightKg = Number(targetWeightKg.trim());
      }

      if (modelPreset === 'custom' && customModel.trim()) {
        settingsPayload.preferredLlmModel = customModel.trim();
      } else {
        const presets: Record<string, any> = {
          gemini: { fast: 'gemini-2.5-flash', reasoning: 'gemini-2.5-pro', vision: 'gemini-2.5-flash' },
          openai: { fast: 'gpt-4o-mini', reasoning: 'o3-mini', vision: 'gpt-4o' },
          anthropic: { fast: 'claude-3-5-haiku-20241022', reasoning: 'claude-3-7-sonnet-20250219', vision: 'claude-3-5-sonnet-20241022' },
          openrouter: { fast: 'google/gemini-2.5-flash', reasoning: 'deepseek/deepseek-r1', vision: 'anthropic/claude-3.5-sonnet' },
          local_custom: { fast: 'llama3.2:3b', reasoning: 'qwen2.5-coder:32b', vision: 'llava:13b' },
        };
        const pMap = presets[preferredProvider] || presets.gemini;
        settingsPayload.preferredLlmModel = pMap[modelPreset] || 'gemini-2.5-flash';
      }

      if (llmApiKey.trim()) {
        settingsPayload.llmApiKey = llmApiKey.trim();
      }

      await fetch(`${API_BASE_URL}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingsPayload),
      });

      if (llmApiKey.trim()) {
        setHasExistingKey(true);
        setLlmApiKey('');
      }

      await hapticFeedback.success();
      setStatusMessage('✓ Telemetria e Sovereign AI sincronizzate con successo.');
      Alert.alert('Salvataggio Completato', 'I parametri biometrici e la configurazione AI del nodo sono stati aggiornati.');
    } catch (err: any) {
      Alert.alert('Errore Salvataggio', err.message || 'Impossibile aggiornare i parametri.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Disconnessione',
      'Vuoi disconnettere questo nodo mobile da HaruKaizen?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Disconnetti',
          style: 'destructive',
          onPress: async () => {
            await hapticFeedback.medium();
            try {
              const token = await AsyncStorage.getItem('@harukaizen:auth_token');
              if (token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
              }
            } catch {
              // Ignore network error on logout
            } finally {
              await clearAuthTokens();
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Recupero telemetria operatore...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Terminal Header Info */}
        <View style={styles.nodeHeader}>
          <View style={styles.headerDotGroup}>
            <View style={styles.statusPulse} />
            <Text style={styles.nodeIdentityText}>OPERATOR: {email || 'ANONYMOUS'}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>ROLE: {role}</Text>
          </View>
        </View>

        {/* Biometric Configuration Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>&gt; BIOMETRIC_PARAMETERS</Text>

          {/* Altezza e Peso Corrente */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>&gt; ALTEZZA (CM)</Text>
              <TextInput
                style={styles.textInput}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="178"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>&gt; PESO ATTUALE (KG)</Text>
              <TextInput
                style={styles.textInput}
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="75.0"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Peso Target e Data di Nascita */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>&gt; PESO OBIETTIVO (KG)</Text>
              <TextInput
                style={styles.textInput}
                value={targetWeightKg}
                onChangeText={setTargetWeightKg}
                placeholder="72.0"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>&gt; NASCITA (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="1995-04-15"
                placeholderTextColor={COLORS.textDim}
              />
            </View>
          </View>

          {/* Sesso biologico */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; SESSO BIOLOGICO</Text>
            <View style={styles.sexButtonsRow}>
              <TouchableOpacity
                style={[styles.sexBtn, sex === 'M' && styles.sexBtnActive]}
                onPress={() => setSex('M')}
              >
                <Text style={[styles.sexBtnText, sex === 'M' && styles.sexBtnTextActive]}>
                  [MASCHIO]
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexBtn, sex === 'F' && styles.sexBtnActive]}
                onPress={() => setSex('F')}
              >
                <Text style={[styles.sexBtnText, sex === 'F' && styles.sexBtnTextActive]}>
                  [FEMMINA]
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Moltiplicatore TDEE / Attività fisica */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; LIVELLO ATTIVITÀ / TDEE</Text>
            <View style={styles.activityGrid}>
              {[
                { label: 'Sedentario (1.20) • Ufficio / Riposo', val: '1.2' },
                { label: 'Moderato (1.375) • Attività 1-3x/sett.', val: '1.375' },
                { label: 'Attivo (1.55) • Allenamento 3-5x/sett.', val: '1.55' },
                { label: 'Intenso (1.725) • Densità alta 6-7x/sett.', val: '1.725' },
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
        </View>

        {/* SOVEREIGN AI & BYOK CONFIGURATION CARD */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardHeader}>&gt; SOVEREIGN_AI_ENGINE (BYOK)</Text>
          <Text style={styles.subCardText}>
            Configura il motore LLM per il Coach Kaizen e la generazione di schede.
          </Text>

          {/* Selettore Provider */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; FORNITORE LLM</Text>
            <View style={styles.providerGrid}>
              {[
                { id: 'gemini', label: 'Gemini' },
                { id: 'openai', label: 'OpenAI' },
                { id: 'anthropic', label: 'Anthropic' },
                { id: 'openrouter', label: 'OpenRouter' },
                { id: 'local_custom', label: '100% Locale (LAN)' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.providerChip,
                    preferredProvider === p.id && styles.providerChipActive,
                  ]}
                  onPress={() => setPreferredProvider(p.id)}
                >
                  <Text
                    style={[
                      styles.providerChipText,
                      preferredProvider === p.id && styles.providerChipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preset Modello */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; PROFILO MODELLO</Text>
            <View style={styles.modelPresetRow}>
              {(['fast', 'reasoning', 'vision', 'custom'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.modelPresetBtn,
                    modelPreset === type && styles.modelPresetBtnActive,
                  ]}
                  onPress={() => setModelPreset(type)}
                >
                  <Text
                    style={[
                      styles.modelPresetBtnText,
                      modelPreset === type && styles.modelPresetBtnTextActive,
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Model ID */}
          {modelPreset === 'custom' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>&gt; CUSTOM MODEL IDENTIFIER</Text>
              <TextInput
                style={styles.textInput}
                value={customModel}
                onChangeText={setCustomModel}
                placeholder="es. deepseek/deepseek-r1, llama3.3:70b"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
              />
            </View>
          )}

          {/* API Key */}
          <View style={styles.fieldGroup}>
            <View style={styles.rowBetween}>
              <Text style={styles.fieldLabel}>&gt; API KEY (AES-256-GCM)</Text>
              {hasExistingKey && (
                <Text style={styles.keySavedTag}>✓ SALVATA IN DB</Text>
              )}
            </View>
            <View style={styles.apiKeyInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={llmApiKey}
                onChangeText={setLlmApiKey}
                placeholder={
                  preferredProvider === 'local_custom'
                    ? 'Opzionale per server locali'
                    : hasExistingKey
                    ? '••••••••••••••••••••••••'
                    : 'Incolla la tua chiave API'
                }
                placeholderTextColor={COLORS.textDim}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.btnToggleEye}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <Text style={styles.eyeText}>{showApiKey ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Custom Base URL (Ollama / LAN) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; LOCAL LLM BASE URL</Text>
            <TextInput
              style={styles.textInput}
              value={customBaseUrl}
              onChangeText={setCustomBaseUrl}
              placeholder="http://192.168.1.X:11434/v1"
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="none"
            />
          </View>

          {statusMessage ? (
            <Text style={styles.statusSuccessText}>{statusMessage}</Text>
          ) : null}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.btnSave, isSaving && styles.btnSaveDisabled]}
            disabled={isSaving}
            onPress={handleSaveProfile}
          >
            {isSaving ? (
              <ActivityIndicator color="#0d0e15" />
            ) : (
              <Text style={styles.btnSaveText}>[SALVA TELEMETRIA & CONFIGURAZIONE AI]</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Node Endpoint Configuration Card (Standalone APK LAN switcher) */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardHeader}>&gt; NODE_ENDPOINT_CONFIGURATION</Text>
          <Text style={styles.sessionInfoText}>
            Indirizzo backend attivo: {API_BASE_URL}. Modifica per connettere l&apos;app a un IP locale LAN differente o a un dominio Cloudflare.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; SERVER API BASE URL</Text>
            <TextInput
              style={styles.textInput}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              placeholder="http://192.168.1.100:8080/api/v1"
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {pingResult && (
            <View
              style={[
                styles.pingBox,
                pingResult.startsWith('ONLINE') ? styles.pingSuccess : styles.pingError,
              ]}
            >
              <Text
                style={[
                  styles.pingText,
                  pingResult.startsWith('ONLINE') ? styles.pingTextSuccess : styles.pingTextError,
                ]}
              >
                {pingResult}
              </Text>
            </View>
          )}

          <View style={styles.endpointBtnRow}>
            <TouchableOpacity
              style={[styles.endpointBtn, styles.endpointBtnPing]}
              disabled={isTestingPing}
              onPress={handleTestPing}
            >
              {isTestingPing ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.endpointBtnTextPing}>TEST PING</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.endpointBtn, styles.endpointBtnSave]}
              onPress={handleSaveEndpoint}
            >
              <Text style={styles.endpointBtnTextSave}>SALVA ENDPOINT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.endpointBtn, styles.endpointBtnReset]}
              onPress={handleResetEndpoint}
            >
              <Text style={styles.endpointBtnTextReset}>RESET</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security / Node Management Card */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardHeader}>&gt; NODE_SESSION_SECURITY</Text>
          <Text style={styles.sessionInfoText}>
            Token crittografico locale attivo su questo dispositivo. Nessun dato inviato a cloud terzi.
          </Text>

          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
            <Text style={styles.btnLogoutText}>[DISCONNETTI NODO OPERATORE]</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.primary,
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: '#1d2638',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  headerDotGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  nodeIdentityText: {
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roleBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    color: '#f472b6',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#111622',
    borderWidth: 1,
    borderColor: '#1d2638',
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    color: COLORS.primary,
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subCardText: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 14,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#0a0d14',
    borderWidth: 1,
    borderColor: '#1d2638',
    borderRadius: 10,
    color: '#f8fafc',
    fontFamily: 'monospace',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sexButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sexBtn: {
    flex: 1,
    backgroundColor: '#0a0d14',
    borderWidth: 1,
    borderColor: '#1d2638',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sexBtnActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: '#ec4899',
  },
  sexBtnText: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sexBtnTextActive: {
    color: '#f472b6',
  },
  activityGrid: {
    gap: 8,
  },
  activityChip: {
    backgroundColor: '#0a0d14',
    borderWidth: 1,
    borderColor: '#1d2638',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  activityChipActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: '#ec4899',
  },
  activityChipText: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  activityChipTextActive: {
    color: '#f472b6',
    fontWeight: 'bold',
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  providerChip: {
    backgroundColor: '#0a0d14',
    borderWidth: 1,
    borderColor: '#1d2638',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  providerChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  providerChipText: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  providerChipTextActive: {
    color: '#fbbf24',
    fontWeight: 'bold',
  },
  modelPresetRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#0a0d14',
    borderWidth: 1,
    borderColor: '#1d2638',
    borderRadius: 8,
    padding: 3,
  },
  modelPresetBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  modelPresetBtnActive: {
    backgroundColor: '#ec4899',
  },
  modelPresetBtnText: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
  },
  modelPresetBtnTextActive: {
    color: '#ffffff',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keySavedTag: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
  },
  apiKeyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnToggleEye: {
    backgroundColor: '#0a0d14',
    borderWidth: 1,
    borderColor: '#1d2638',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    color: '#94a3b8',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusSuccessText: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 12,
    textAlign: 'center',
  },
  btnSave: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  btnSaveDisabled: {
    opacity: 0.6,
  },
  btnSaveText: {
    color: '#0d0e15',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sessionInfoText: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 14,
  },
  btnLogout: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnLogoutText: {
    color: '#f87171',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  pingBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  pingSuccess: {
    backgroundColor: 'rgba(78,222,163,0.1)',
    borderColor: COLORS.primary,
  },
  pingError: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#ef4444',
  },
  pingText: {
    fontFamily: 'monospace',
    fontSize: 10,
  },
  pingTextSuccess: {
    color: COLORS.primary,
  },
  pingTextError: {
    color: '#f87171',
  },
  endpointBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  endpointBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endpointBtnPing: {
    backgroundColor: '#181920',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  endpointBtnTextPing: {
    fontFamily: 'monospace',
    color: '#e4e4e7',
    fontSize: 10,
    fontWeight: 'bold',
  },
  endpointBtnSave: {
    backgroundColor: COLORS.primary,
  },
  endpointBtnTextSave: {
    fontFamily: 'monospace',
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  endpointBtnReset: {
    backgroundColor: '#27272a',
    maxWidth: 60,
  },
  endpointBtnTextReset: {
    fontFamily: 'monospace',
    color: '#a1a1aa',
    fontSize: 10,
  },
});
