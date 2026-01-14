import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showComingSoon } from '../lib/showComingSoon';
import { Feather } from '@expo/vector-icons';

export default function SettingsEmailScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header (match web: Change Email) */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderTitleRow}>
              <Feather name="mail" size={18} color={stylesVars.primary} />
              <Text style={styles.pageTitle}>Change Email</Text>
            </View>
            <Text style={styles.pageSubtitle}>Update the email you use to sign in.</Text>
          </View>

          {/* Form card (UI only) */}
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>New Email</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor={stylesVars.mutedText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="emailAddress"
                style={styles.input}
              />
              <Text style={styles.helper}>
                We’ll send a confirmation link to the new address. The change completes after you confirm.
              </Text>
            </View>
          </View>

          {/* Action (UI only) */}
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => showComingSoon('Change email')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>Save</Text>
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
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: stylesVars.text,
    marginBottom: 8,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    paddingHorizontal: 12,
    color: stylesVars.text,
    fontSize: 14,
    fontWeight: '600',
  },
  helper: {
    marginTop: 8,
    fontSize: 12,
    color: stylesVars.mutedText,
    lineHeight: 16,
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
});
