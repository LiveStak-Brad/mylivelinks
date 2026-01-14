import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const { mode, colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const themed = useMemo(
    () => ({
      bg: colors.bg,
      surface: colors.surface,
      text: colors.text,
      mutedText: colors.mutedText,
      border: colors.border,
      subtleText: (colors as any).subtleText ?? colors.mutedText,
      dangerBg: mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee',
      dangerBorder: mode === 'dark' ? 'rgba(239,68,68,0.35)' : '#fcc',
      dangerText: colors.danger,
      successBg: mode === 'dark' ? 'rgba(34,197,94,0.15)' : '#efe',
      successBorder: mode === 'dark' ? 'rgba(34,197,94,0.35)' : '#cfc',
      successText: colors.success,
    }),
    [mode, colors]
  );

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter an email and password.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await signUp(trimmedEmail, password);
    if (result.error) {
      setError(result.error);
    } else {
      setMessage('Account created. You may need to confirm your email before signing in.');
    }

    setSubmitting(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: themed.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: themed.mutedText }]}>Join MyLiveLinks</Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: themed.dangerBg, borderColor: themed.dangerBorder }]}>
              <Text style={[styles.errorText, { color: themed.dangerText }]}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={[styles.successBox, { backgroundColor: themed.successBg, borderColor: themed.successBorder }]}>
              <Text style={[styles.successText, { color: themed.successText }]}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themed.text }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themed.surface, borderColor: themed.border, color: themed.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={themed.subtleText}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themed.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themed.surface, borderColor: themed.border, color: themed.text }]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="Enter your email"
                placeholderTextColor={themed.subtleText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themed.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themed.surface, borderColor: themed.border, color: themed.text }]}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                placeholder="Enter your password"
                placeholderTextColor={themed.subtleText}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            <TouchableOpacity 
              style={styles.signupButton}
              onPress={handleSignup}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signupButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.termsRow}>
              <Text style={styles.termsText}>
                By signing up, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  errorBox: {
    backgroundColor: '#2a0d0d',
    borderWidth: 1,
    borderColor: '#5c1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffb4b4',
    fontSize: 14,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#0d2412',
    borderWidth: 1,
    borderColor: '#1f5c2d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#b8ffd0',
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  signupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  termsRow: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

