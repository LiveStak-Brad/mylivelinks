import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function SettingsUsernameScreen() {
  // UI-only placeholder state (no API, no validation).
  const [currentUsername] = useState('current_username');
  const [newUsername, setNewUsername] = useState('');

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header (match web: Change Username) */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderTitleRow}>
              <Feather name="user" size={18} color={stylesVars.primary} />
              <Text style={styles.pageTitle}>Change Username</Text>
            </View>
            <Text style={styles.pageSubtitle}>Choose a new username for your profile</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Current Username</Text>
              <TextInput
                value={currentUsername}
                editable={false}
                selectTextOnFocus={false}
                style={[styles.input, styles.inputDisabled]}
                placeholder="current_username"
                placeholderTextColor={stylesVars.mutedText}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>New Username</Text>
              <TextInput
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="username"
                placeholder="new_username"
                placeholderTextColor={stylesVars.mutedText}
                style={styles.input}
              />
              <Text style={styles.helper}>
                Only letters, numbers, underscores, and hyphens. 3-15 characters.
              </Text>
            </View>
          </View>

          {/* URL Preview */}
          <View style={[styles.card, styles.previewCard]}>
            <Text style={styles.previewLabel}>Your new profile URL will be:</Text>
            <Text style={styles.previewUrl}>mylivelinks.com/{newUsername || '...'}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {}}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>Change Username</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {}}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>

          {/* Warning (match web “Important”) */}
          <View style={styles.warningCard}>
            <View style={styles.warningRow}>
              <Feather name="alert-circle" size={18} color={stylesVars.warningText} />
              <View style={styles.warningTextCol}>
                <Text style={styles.warningTitle}>Important</Text>
                <Text style={styles.warningBody}>
                  Changing your username will update your profile URL. Old links may no longer work.
                  Share your new profile link after changing.
                </Text>
              </View>
            </View>
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
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
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
  inputDisabled: {
    opacity: 0.75,
  },
  helper: {
    marginTop: 8,
    fontSize: 12,
    color: stylesVars.mutedText,
    lineHeight: 16,
  },

  previewCard: {
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
  },
  previewLabel: {
    fontSize: 12,
    color: stylesVars.mutedText,
    marginBottom: 6,
    fontWeight: '600',
  },
  previewUrl: {
    fontSize: 14,
    color: stylesVars.primary,
    fontWeight: '800',
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
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  secondaryButtonText: {
    color: stylesVars.text,
    fontSize: 14,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.9,
  },

  warningCard: {
    backgroundColor: stylesVars.warningBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.warningBorder,
    padding: 14,
    marginBottom: 24,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  warningTextCol: {
    flex: 1,
    minWidth: 0,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: stylesVars.text,
    marginBottom: 4,
  },
  warningBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
    fontWeight: '600',
  },
});
