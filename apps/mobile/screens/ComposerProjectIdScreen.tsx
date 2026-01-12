import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

export default function ComposerProjectIdScreen() {
  const { mode, colors } = useTheme();
  const projectTitle = 'My Project';
  const projectStatus = 'draft';

  const themed = useMemo(
    () => ({
      bg: colors.bg,
      surface: colors.surface,
      text: colors.text,
      mutedText: colors.mutedText,
      border: colors.border,
      cardBg: mode === 'dark' ? '#1a1a1a' : colors.surface,
      cardBorder: mode === 'dark' ? '#333' : colors.border,
      badgeBg: mode === 'dark' ? '#333' : colors.border,
    }),
    [mode, colors]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themed.text }]}>{projectTitle}</Text>
          <View style={[styles.statusBadge, { backgroundColor: themed.badgeBg }]}>
            <Text style={[styles.statusText, { color: themed.text }]}>{projectStatus}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themed.text }]}>Tracks</Text>
          <View style={[styles.placeholderBox, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.placeholderText, { color: themed.mutedText }]}>No tracks added yet</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themed.text }]}>Sounds</Text>
          <View style={[styles.placeholderBox, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.placeholderText, { color: themed.mutedText }]}>No sounds added yet</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themed.text }]}>Clips</Text>
          <View style={[styles.placeholderBox, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.placeholderText, { color: themed.mutedText }]}>No clips added yet</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.buttonPrimary}>
            <Text style={styles.buttonPrimaryText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.buttonSecondary, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
            <Text style={[styles.buttonSecondaryText, { color: themed.text }]}>Publish</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.buttonDanger, { backgroundColor: themed.cardBg }]}>
            <Text style={styles.buttonDangerText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  placeholderBox: {
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  placeholderText: {
    fontSize: 14,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonSecondary: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDanger: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  buttonDangerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff3b30',
  },
});
