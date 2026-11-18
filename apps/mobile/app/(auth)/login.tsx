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
import {
  COLORS,
  API_BASE_URL,
  initApiBaseUrl,
  setDynamicApiBaseUrl,
  resetDynamicApiBaseUrl,
} from '../../src/config';
import { apiClient, setAuthTokens } from '../../src/services/api';
import { hapticFeedback } from '../../src/utils/haptics';
import { AltchaChallenge } from '../../src/components/auth/AltchaChallenge';
import { solveAltcha, AltchaChallenge as IAltchaChallenge } from '../../src/utils/altchaSolver';

export default function MobileLoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);

  // Dynamic Node Endpoint Drawer State
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(API_BASE_URL);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [isTestingPing, setIsTestingPing] = useState(false);

  // Inizializza URL custom all'avvio
  React.useEffect(() => {
    initApiBaseUrl().then((url) => setServerUrlInput(url));
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
    setIsConfigDrawerOpen(false);
  };

  const handleResetEndpoint = async () => {
    const def = await resetDynamicApiBaseUrl();
    setServerUrlInput(def);
    await hapticFeedback.light();
    Alert.alert('Endpoint Ripristinato', `Ripristinato valore standard: ${def}`);
  };

  // Altcha PoW Verified Payload
  const [altchaPayload, setAltchaPayload] = useState<string>('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Errore', 'Inserisci sia email che password.');
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

      const response = await apiClient.post('/auth/login', {
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

      // Salva token in locale e notifica reattivamente lo store
      await setAuthTokens(token, refreshToken || null);
      await hapticFeedback.success();

      // Transizione alla dashboard principale (supportata da AuthGuard in RootLayout)
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Errore di connessione al nodo backend o credenziali non valide.';
      Alert.alert('Autenticazione Fallita', msg);
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
            <Text style={styles.terminalNodeText}>NODE: HK-MOBILE-AUTH</Text>
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
            Sovereign Mobile Telemetry Gateway
          </Text>
        </View>

        {/* Terminal Card */}
        <View style={styles.terminalCard}>
          <Text style={styles.cardHeader}>&gt; AUTHENTICATION</Text>

          {/* Email Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; EMAIL</Text>
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
            <Text style={styles.fieldLabel}>&gt; PASSWORD</Text>
            <TextInput
              style={[
                styles.textInput,
                isFocusedPassword && styles.textInputFocused,
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor={COLORS.textDim}
              secureTextEntry
              onFocus={() => setIsFocusedPassword(true)}
              onBlur={() => setIsFocusedPassword(false)}
            />
          </View>

          {/* Proof-of-Work Challenge */}
          <AltchaChallenge
            isVerified={Boolean(altchaPayload)}
            onVerified={(payload) => setAltchaPayload(payload)}
            onReset={() => setAltchaPayload('')}
          />

          {/* Sign In Button */}
          <TouchableOpacity
            style={[
              styles.btnSignIn,
              isLoading ? styles.btnSignInDisabled : styles.btnSignInActive,
            ]}
            disabled={isLoading}
            onPress={handleLogin}
          >
            {isLoading ? (
              <ActivityIndicator color="#0d0e15" />
            ) : (
              <Text
                style={[
                  styles.btnSignInText,
                  styles.btnSignInTextActive,
                ]}
              >
                [SIGN IN MOBILE NODE]
              </Text>
            )}
          </TouchableOpacity>

          {/* Switch to Register */}
          <TouchableOpacity
            style={styles.switchAuthBtn}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.switchAuthText}>
              Non hai ancora un profilo?{' '}
              <Text style={styles.switchAuthLink}>Inizializza Profilo &gt;</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible Node Endpoint Switcher Drawer */}
        <View style={styles.endpointDrawerContainer}>
          <TouchableOpacity
            style={styles.endpointToggleBtn}
            onPress={() => setIsConfigDrawerOpen((prev) => !prev)}
          >
            <Text style={styles.endpointToggleText}>
              ⚙️ [NODE ENDPOINT CONFIG] {isConfigDrawerOpen ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {isConfigDrawerOpen && (
            <View style={styles.endpointCard}>
              <Text style={styles.endpointDesc}>
                Configura l&apos;indirizzo IP LAN del server o dominio Cloudflare per APK standalone.
              </Text>

              <TextInput
                style={styles.endpointInput}
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                placeholder="http://192.168.1.100:8002/api/v1"
                placeholderTextColor="#71717a"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {pingResult && (
                <View
                  style={[
                    styles.pingResultBox,
                    pingResult.startsWith('ONLINE')
                      ? styles.pingResultSuccess
                      : styles.pingResultError,
                  ]}
                >
                  <Text
                    style={[
                      styles.pingResultText,
                      pingResult.startsWith('ONLINE')
                        ? styles.pingResultTextSuccess
                        : styles.pingResultTextError,
                    ]}
                  >
                    {pingResult}
                  </Text>
                </View>
              )}

              <View style={styles.endpointActionsRow}>
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
          )}
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
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: 'center',
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
    marginBottom: 24,
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
  fieldGroup: {
    marginBottom: 16,
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
    paddingVertical: 10,
    color: COLORS.text,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  textInputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  altchaContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
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
  btnSignIn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSignInDisabled: {
    backgroundColor: '#27272a',
    opacity: 0.6,
  },
  btnSignInActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  btnSignInText: {
    color: COLORS.textDim,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnSignInTextActive: {
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
    marginTop: 24,
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
  endpointDrawerContainer: {
    marginTop: 18,
    marginBottom: 6,
  },
  endpointToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#181920',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  endpointToggleText: {
    fontFamily: 'monospace',
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  endpointCard: {
    marginTop: 8,
    backgroundColor: '#12131a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 10,
  },
  endpointDesc: {
    color: '#a1a1aa',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  endpointInput: {
    backgroundColor: '#181920',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  pingResultBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  pingResultSuccess: {
    backgroundColor: 'rgba(78,222,163,0.1)',
    borderColor: COLORS.primary,
  },
  pingResultError: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#ef4444',
  },
  pingResultText: {
    fontFamily: 'monospace',
    fontSize: 10,
  },
  pingResultTextSuccess: {
    color: COLORS.primary,
  },
  pingResultTextError: {
    color: '#f87171',
  },
  endpointActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  endpointBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endpointBtnPing: {
    backgroundColor: '#1e1f26',
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

