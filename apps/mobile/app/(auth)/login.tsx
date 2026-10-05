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
import { hapticFeedback } from '../../src/utils/haptics';

export default function MobileLoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);

  // Altcha PoW State
  const [altchaStatus, setAltchaStatus] = useState<'idle' | 'computing' | 'verified'>('idle');
  const [altchaProgress, setAltchaProgress] = useState(0);
  const [cpuLoad, setCpuLoad] = useState(14);
  const [nonce, setNonce] = useState('0x00000000');

  const startAltchaPoW = () => {
    if (altchaStatus !== 'idle') return;
    setAltchaStatus('computing');
    setAltchaProgress(0);

    const interval = setInterval(() => {
      setAltchaProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAltchaStatus('verified');
          hapticFeedback.success();
          return 100;
        }
        setCpuLoad(Math.floor(12 + Math.random() * 8));
        setNonce('0x' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'));
        return prev + 20;
      });
    }, 120);
  };

  const handleLogin = async () => {
    if (altchaStatus !== 'verified') {
      Alert.alert('Sicurezza', 'Completa il Proof-of-Work crittografico prima del login.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('Errore', 'Inserisci sia email che password.');
      return;
    }

    setIsLoading(true);
    await hapticFeedback.medium();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || 'Credenziali non valide');
      }

      const token = data?.data?.accessToken || data?.accessToken;
      if (!token) {
        throw new Error('Nessun token di accesso ricevuto dal server.');
      }

      // Salva token in locale
      await AsyncStorage.setItem('@harukaizen:auth_token', token);
      await hapticFeedback.success();

      // Transizione alla dashboard principale
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Autenticazione Fallita', err.message || 'Errore di connessione al nodo backend.');
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
          <Text style={styles.cardHeader}>&gt; OPERATOR_AUTHENTICATION</Text>

          {/* Email Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>&gt; TARGET_EMAIL</Text>
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
            <Text style={styles.fieldLabel}>&gt; SECURE_PASSPHRASE</Text>
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

          {/* Mobile Altcha Challenge Simulator */}
          <View style={styles.altchaContainer}>
            <View style={styles.altchaHeaderRow}>
              <Text style={styles.altchaTitle}>ALTCHA PROOF-OF-WORK</Text>
              <Text style={styles.altchaStatusText}>
                {altchaStatus === 'verified' ? 'SHA-256 OK' : 'CRYPTO CHALLENGE'}
              </Text>
            </View>

            {altchaStatus === 'idle' && (
              <View style={styles.altchaRow}>
                <Text style={styles.altchaAwaitText}>&gt; Awaiting calculation...</Text>
                <TouchableOpacity
                  style={styles.altchaBtn}
                  onPress={startAltchaPoW}
                >
                  <Text style={styles.altchaBtnText}>Compute PoW</Text>
                </TouchableOpacity>
              </View>
            )}

            {altchaStatus === 'computing' && (
              <View style={styles.altchaComputingBox}>
                <View style={styles.altchaComputeStats}>
                  <Text style={styles.altchaComputeText}>
                    Computing proof... CPU {cpuLoad}%
                  </Text>
                  <Text style={styles.altchaNonceText}>{nonce}</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${altchaProgress}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            {altchaStatus === 'verified' && (
              <View style={styles.altchaVerifiedBox}>
                <Text style={styles.altchaVerifiedText}>
                  ✓ Cryptographic Proof Verified
                </Text>
                <Text style={styles.altchaHashText}>{nonce.slice(0, 8)}...OK</Text>
              </View>
            )}
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[
              styles.btnSignIn,
              altchaStatus !== 'verified' || isLoading ? styles.btnSignInDisabled : styles.btnSignInActive,
            ]}
            disabled={altchaStatus !== 'verified' || isLoading}
            onPress={handleLogin}
          >
            {isLoading ? (
              <ActivityIndicator color="#0d0e15" />
            ) : (
              <Text
                style={[
                  styles.btnSignInText,
                  altchaStatus === 'verified' && styles.btnSignInTextActive,
                ]}
              >
                [SIGN IN MOBILE NODE]
              </Text>
            )}
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
});

