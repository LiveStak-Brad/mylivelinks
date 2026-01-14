import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const { mode, colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resetError } = await resetPassword(email.trim());
      if (resetError) {
        setError(resetError);
        return;
      }

      setMessage('Password reset email sent! Check your inbox (and spam folder) for the reset link.');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={[styles.title, { color: themed.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: themed.mutedText }]}>
              Enter your email and we'll send you a reset link
            </Text>

            {error && (
              <View style={[styles.errorContainer, { backgroundColor: themed.dangerBg, borderColor: themed.dangerBorder }]}>
                <Text style={[styles.errorText, { color: themed.dangerText }]}>{error}</Text>
              </View>
            )}

            {message && (
              <View style={[styles.successContainer, { backgroundColor: themed.successBg, borderColor: themed.successBorder }]}>
                <Text style={[styles.successText, { color: themed.successText }]}>{message}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: themed.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themed.surface, borderColor: themed.border, color: themed.text }]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={themed.subtleText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#fcc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#efe',
    borderWidth: 1,
    borderColor: '#cfc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#060',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
