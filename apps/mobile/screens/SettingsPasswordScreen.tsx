import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function SettingsPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = newPassword.length >= 6 && newPassword === confirmPassword;

  const handleUpdatePassword = useCallback(async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert('Success', 'Your password has been updated.', [{ text: 'OK' }]);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('[SettingsPasswordScreen] Error:', err);
      setError(err?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }, [confirmPassword, newPassword]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header (match web: Change Password) */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderTitleRow}>
              <Feather name="lock" size={18} color={stylesVars.primary} />
              <Text style={styles.pageTitle}>Change Password</Text>
            </View>
            <Text style={styles.pageSubtitle}>Update the password for your account.</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="newPassword"
                  placeholder="••••••••"
                  placeholderTextColor={stylesVars.mutedText}
                  style={styles.input}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                  onPress={() => setShowNewPassword((v) => !v)}
                  hitSlop={10}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
                >
                  <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={18} color={stylesVars.mutedText} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.field, styles.fieldLast]}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="newPassword"
                  placeholder="••••••••"
                  placeholderTextColor={stylesVars.mutedText}
                  style={styles.input}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  hitSlop={10}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
                >
                  <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={stylesVars.mutedText} />
                </Pressable>
              </View>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={handleUpdatePassword}
              disabled={saving || !isValid}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, (saving || !isValid) && styles.buttonDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Update Password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0F172A',
  mutedText: '#64748B',
  mutedBg: '#F1F5F9',
  primary: '#4F46E5',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },

  pageHeader: {
    marginBottom: 12,
  },
  pageHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: stylesVars.mutedText,
    marginLeft: 26,
  },

  card: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  field: {
    marginBottom: 14,
  },
  fieldLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: stylesVars.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: stylesVars.text,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 10,
    paddingRight: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.75,
  },

  actionsRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 2,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: stylesVars.primary,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 8,
  },
});
