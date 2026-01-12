import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { signInWithPassword } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themed = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.surface,
      text: colors.text,
      mutedText: colors.mutedText,
      border: colors.border,
      subtleText: (colors as any).subtleText ?? colors.mutedText,
      dangerBg: colors.mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee',
      dangerBorder: colors.mode === 'dark' ? 'rgba(239,68,68,0.35)' : '#fcc',
      dangerText: colors.danger,
    }),
    [colors]
  );

  const onSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await signInWithPassword(trimmedEmail, password);
    if (result.error) {
      setError(result.error);
    }

    setSubmitting(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: themed.card, shadowColor: themed.text }]}>
          <Text style={styles.logo}>MyLiveLinks</Text>
          
          <Text style={[styles.title, { color: themed.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: themed.mutedText }]}>Sign in to your account</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: themed.dangerBg, borderColor: themed.dangerBorder }]}>
              <Text style={[styles.errorText, { color: themed.dangerText }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themed.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themed.card, borderColor: themed.border, color: themed.text }]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={themed.subtleText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: themed.text }]}>Password</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ResetPasswordScreen')}
                  disabled={submitting}
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: themed.card, borderColor: themed.border, color: themed.text }]}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={themed.subtleText}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={onSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: themed.border }]} />
            <Text style={[styles.dividerText, { color: themed.subtleText }]}>OR CONTINUE WITH</Text>
            <View style={[styles.dividerLine, { backgroundColor: themed.border }]} />
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity style={styles.socialButton} disabled>
              <Text style={[styles.socialButtonText, { color: themed.text }]}>🔵 Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} disabled>
              <Text style={[styles.socialButtonText, { color: themed.text }]}>🍎 Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} disabled>
              <Text style={[styles.socialButtonText, { color: themed.text }]}>📘 Continue with Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} disabled>
              <Text style={[styles.socialButtonText, { color: themed.text }]}>🎮 Continue with Twitch</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => navigation.navigate('SignupScreen')}
            disabled={submitting}
          >
            <Text style={styles.toggleText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    color: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  form: {
    marginBottom: 24,
  },
  errorBox: {
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
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 12,
    color: '#6366f1',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    fontSize: 11,
    color: '#999',
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  toggleButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
});

